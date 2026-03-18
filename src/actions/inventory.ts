'use server';

import * as admin from 'firebase-admin';
import { revalidatePath } from 'next/cache';
import { createActivityLog, mapActivityDocument } from '@/lib/activity-log';
import type {
  DashboardActivityRow,
  HeaderNotification,
  InventoryAdjustmentType,
  InventoryBatchItemInput,
  InventorySaveInput,
  InventorySearchFilters,
} from '@/lib/app-types';
import { getActiveAutomationSessionForUser } from '@/lib/automation-store';
import { adminDb } from '@/lib/firebase/admin';
import { findInventoryDocumentByCode, getInventoryDocumentById, listInventoryItems, mapInventoryDocument, normalizeInventoryInput } from '@/lib/inventory-store';
import { requireCurrentUser } from '@/lib/session';
import { cleanString, formatDateTime, normalizeIsbn, safeDate, toPositiveInt } from '@/lib/utils';

type InventoryRecordResult =
  | {
      ref: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
      item: ReturnType<typeof mapInventoryDocument>;
      data: Record<string, unknown>;
    }
  | {
      error: string;
    };

function sortInventoryItems(items: Awaited<ReturnType<typeof listInventoryItems>>, sort: InventorySearchFilters['sort']) {
  const sortedItems = [...items];

  if (sort === 'stock') {
    return sortedItems.sort((left, right) => right.stock - left.stock);
  }

  if (sort === 'value') {
    return sortedItems.sort((left, right) => right.inventoryValue - left.inventoryValue);
  }

  if (sort === 'recent') {
    return sortedItems.sort((left, right) => safeDate(right.updatedAt).getTime() - safeDate(left.updatedAt).getTime());
  }

  return sortedItems.sort((left, right) => left.title.localeCompare(right.title));
}

async function getRecentInventoryActivityRows(limit = 6) {
  const snapshot = await adminDb.collection('activity_logs').orderBy('timestamp', 'desc').limit(100).get();

  const rows = snapshot.docs
    .map((doc) => mapActivityDocument(doc.id, doc.data() ?? {}))
    .filter((activity) => activity.entityType === 'book' || activity.type === 'Inventory Update' || activity.type === 'Inventory Item Created')
    .map<DashboardActivityRow>((activity) => ({
      id: activity.id,
      isbn: typeof activity.metadata?.isbn === 'string' ? activity.metadata.isbn : '--',
      title: typeof activity.metadata?.title === 'string' ? activity.metadata.title : activity.action,
      action: activity.type,
      quantity: typeof activity.metadata?.quantity === 'number' ? activity.metadata.quantity : 0,
      timeLabel: activity.timeLabel,
    }))
    .slice(0, limit);

  return rows;
}

async function findDuplicateInventoryEntry(id: string | undefined, isbn: string, sku: string) {
  const items = await listInventoryItems();

  return items.find((item) => item.id !== id && (item.isbn === isbn || item.sku.toUpperCase() === sku.toUpperCase())) ?? null;
}

async function createInventoryRecord(input: InventorySaveInput, userId: string, userName: string): Promise<InventoryRecordResult> {
  const normalizedInput = normalizeInventoryInput(input);
  if ('error' in normalizedInput) {
    return { error: normalizedInput.error ?? 'Invalid inventory input.' };
  }

  const duplicate = await findDuplicateInventoryEntry(input.id, normalizedInput.value.isbn, normalizedInput.value.sku);
  if (duplicate) {
    return { error: `An inventory item already exists for ISBN/SKU ${duplicate.isbn || duplicate.sku}.` };
  }

  const now = new Date().toISOString();
  const payload = {
    ...normalizedInput.value,
    createdAt: now,
    updatedAt: now,
    lastUpdated: formatDateTime(now),
    updatedByUserId: userId,
    updatedByName: userName,
  };

  const documentRef = await adminDb.collection('books').add(payload);
  return {
    item: mapInventoryDocument(documentRef.id, payload),
    ref: documentRef,
    data: payload,
  };
}

async function applyInventoryAdjustment(
  entry: InventoryBatchItemInput,
  actionType: InventoryAdjustmentType,
  user: Awaited<ReturnType<typeof requireCurrentUser>>,
  requireSession: boolean,
) {
  const quantity = toPositiveInt(entry.count);
  const code = normalizeIsbn(entry.isbn) || cleanString(entry.sku) || cleanString(entry.isbn);

  if (!code || quantity <= 0) {
    return { success: false, error: 'Each batch row requires a valid ISBN and a quantity greater than zero.' } as const;
  }

  const activeSession = requireSession ? await getActiveAutomationSessionForUser(user.id) : null;
  if (requireSession && !activeSession) {
    return { success: false, error: 'Start an automation session before processing scan or batch operations.' } as const;
  }

  let record = await findInventoryDocumentByCode(code);
  if (!record) {
    if (actionType === 'DEDUCT') {
      return { success: false, error: `Cannot deduct stock because ${code} does not exist in inventory.` } as const;
    }

    const createdRecord = await createInventoryRecord(
      {
        title: cleanString(entry.title),
        isbn: normalizeIsbn(entry.isbn),
        sku: cleanString(entry.sku),
        author: cleanString(entry.author),
        category: cleanString(entry.category),
        stock: 0,
        reorderLevel: toPositiveInt(entry.reorderLevel, 5),
        unitPrice: Number(entry.unitPrice ?? 0),
        coverUrl: cleanString(entry.coverUrl),
      },
      user.id,
      user.name,
    );

    if ('error' in createdRecord) {
      return {
        success: false,
        error: `Cannot create ${code}: ${createdRecord.error}`,
      } as const;
    }

    record = createdRecord;

    await createActivityLog({
      type: 'Inventory Item Created',
      action: `Created inventory record for ${record.item.title}.`,
      status: 'success',
      user,
      entityId: record.item.id,
      entityType: 'book',
      metadata: {
        isbn: record.item.isbn,
        title: record.item.title,
        quantity: 0,
      },
    });
  }

  const previousStock = record.item.stock;
  const newStock =
    actionType === 'ADD'
      ? previousStock + quantity
      : actionType === 'DEDUCT'
        ? Math.max(0, previousStock - quantity)
        : quantity;
  const now = new Date().toISOString();

  await record.ref.update({
    stock: newStock,
    updatedAt: now,
    lastUpdated: formatDateTime(now),
    updatedByUserId: user.id,
    updatedByName: user.name,
  });

  if (activeSession) {
    await activeSession.ref.update({
      processedItems: admin.firestore.FieldValue.increment(1),
      processedUnits: admin.firestore.FieldValue.increment(quantity),
      updatedAt: now,
    });
  }

  await createActivityLog({
    type: 'Inventory Update',
    action: `${actionType === 'ADD' ? 'Added' : actionType === 'DEDUCT' ? 'Deducted' : 'Set'} ${quantity} units for ${record.item.title}.`,
    status: 'success',
    user,
    entityId: record.item.id,
    entityType: 'book',
    metadata: {
      isbn: record.item.isbn,
      title: record.item.title,
      quantity,
      previousStock,
      newStock,
      actionType,
    },
  });

  return {
    success: true,
    itemId: record.item.id,
    isbn: record.item.isbn,
    title: record.item.title,
    quantity,
    newStock,
  } as const;
}

export async function getBooks(filters: InventorySearchFilters = {}) {
  await requireCurrentUser();

  const items = await listInventoryItems();
  const query = cleanString(filters.query).toLowerCase();
  const filteredItems = items.filter((item) => {
    if (!query) {
      return true;
    }

    const haystack = `${item.title} ${item.isbn} ${item.sku} ${item.author} ${item.category}`.toLowerCase();
    return haystack.includes(query);
  });

  return {
    success: true,
    data: sortInventoryItems(filteredItems, filters.sort),
  };
}

export async function getInventorySummary() {
  await requireCurrentUser();

  const items = await listInventoryItems();
  return {
    totalTitles: items.length,
    totalUnits: items.reduce((total, item) => total + item.stock, 0),
    lowStockCount: items.filter((item) => item.stockStatus === 'low-stock').length,
    inventoryValue: items.reduce((total, item) => total + item.inventoryValue, 0),
  };
}

export async function getDashboardStats() {
  await requireCurrentUser();

  const items = await listInventoryItems();
  const activitySnapshot = await adminDb.collection('activity_logs').orderBy('timestamp', 'desc').limit(200).get();
  const today = new Date().toDateString();
  const todaysUpdates = activitySnapshot.docs
    .map((doc) => mapActivityDocument(doc.id, doc.data() ?? {}))
    .filter((activity) => activity.type === 'Inventory Update' && safeDate(activity.createdAt).toDateString() === today).length;

  return {
    success: true,
    data: {
      totalItems: items.length,
      inStock: items.reduce((total, item) => total + item.stock, 0),
      todaysUpdates,
      lowStockCount: items.filter((item) => item.stockStatus === 'low-stock').length,
      outOfStockCount: items.filter((item) => item.stockStatus === 'out-of-stock').length,
      inventoryValue: items.reduce((total, item) => total + item.inventoryValue, 0),
    },
  };
}

export async function getDashboardOverview() {
  const [statsResult, recentActivityRows, items] = await Promise.all([
    getDashboardStats(),
    getRecentInventoryActivityRows(6),
    listInventoryItems(),
  ]);

  return {
    success: true,
    data: {
      stats: statsResult.data,
      recentActivity: recentActivityRows,
      lowStockItems: items.filter((item) => item.stockStatus === 'low-stock').slice(0, 5),
    },
  };
}

export async function getNavigationSummary() {
  const [stats, activitySnapshot] = await Promise.all([
    getDashboardStats(),
    adminDb.collection('activity_logs').orderBy('timestamp', 'desc').limit(50).get(),
  ]);
  const lowStockCount = stats.data?.lowStockCount ?? 0;
  const yesterday = Date.now() - 1000 * 60 * 60 * 24;
  const recentActivities = activitySnapshot.docs.map((doc) => mapActivityDocument(doc.id, doc.data() ?? {}));
  const recentActivityCount = recentActivities.filter((activity) => safeDate(activity.createdAt).getTime() >= yesterday).length;

  const notifications: HeaderNotification[] = recentActivities.slice(0, 6).map((activity) => ({
    id: activity.id,
    title: activity.type,
    description: activity.action,
    timeLabel: activity.timeLabel,
    href: activity.entityType === 'book' ? '/inventory' : '/activity',
    level: activity.status,
  }));

  if (lowStockCount > 0) {
    notifications.unshift({
      id: 'low-stock-summary',
      title: 'Low Stock Alert',
      description: `${lowStockCount} inventory item${lowStockCount === 1 ? '' : 's'} need attention.`,
      timeLabel: 'Now',
      href: '/inventory?sort=stock',
      level: 'warning',
    });
  }

  return {
    lowStockCount,
    recentActivityCount,
    notifications,
  };
}

export async function findInventoryItem(query: string) {
  const user = await requireCurrentUser();
  const searchTerm = cleanString(query);

  if (!searchTerm) {
    return { success: false, error: 'Enter an ISBN or SKU to search.' };
  }

  const record = await findInventoryDocumentByCode(searchTerm);

  await createActivityLog({
    type: 'Product Search',
    action: record ? `Searched and found ${record.item.title}.` : `Searched for ${searchTerm} but no inventory item was found.`,
    status: record ? 'success' : 'warning',
    user,
    entityId: record?.item.id,
    entityType: record ? 'book' : 'search',
    metadata: {
      isbn: record?.item.isbn ?? normalizeIsbn(searchTerm),
      title: record?.item.title ?? '',
      quantity: record?.item.stock ?? 0,
    },
  });

  if (!record) {
    return { success: false, error: 'No inventory item matches that ISBN or SKU.' };
  }

  return {
    success: true,
    data: record.item,
  };
}

export async function saveInventoryItem(input: InventorySaveInput) {
  const user = await requireCurrentUser();
  const normalizedInput = normalizeInventoryInput(input);

  if ('error' in normalizedInput) {
    return normalizedInput;
  }

  const duplicate = await findDuplicateInventoryEntry(input.id, normalizedInput.value.isbn, normalizedInput.value.sku);
  if (duplicate) {
    return { error: `An inventory item already exists for ISBN/SKU ${duplicate.isbn || duplicate.sku}.` };
  }

  const now = new Date().toISOString();

  if (input.id) {
    const existing = await getInventoryDocumentById(input.id);
    const docRef = existing?.ref ?? adminDb.collection('books').doc(input.id);

    await docRef.set(
      {
        ...normalizedInput.value,
        updatedAt: now,
        lastUpdated: formatDateTime(now),
        updatedByUserId: user.id,
        updatedByName: user.name,
        createdAt: existing?.item.createdAt ?? now,
      },
      { merge: true },
    );

    await createActivityLog({
      type: 'Inventory Item Updated',
      action: `Updated ${normalizedInput.value.title}.`,
      status: 'success',
      user,
      entityId: input.id,
      entityType: 'book',
      metadata: {
        isbn: normalizedInput.value.isbn,
        title: normalizedInput.value.title,
        quantity: normalizedInput.value.stock,
      },
    });
  } else {
    const ref = await adminDb.collection('books').add({
      ...normalizedInput.value,
      createdAt: now,
      updatedAt: now,
      lastUpdated: formatDateTime(now),
      updatedByUserId: user.id,
      updatedByName: user.name,
    });

    await createActivityLog({
      type: 'Inventory Item Created',
      action: `Added ${normalizedInput.value.title} to inventory.`,
      status: 'success',
      user,
      entityId: ref.id,
      entityType: 'book',
      metadata: {
        isbn: normalizedInput.value.isbn,
        title: normalizedInput.value.title,
        quantity: normalizedInput.value.stock,
      },
    });
  }

  revalidatePath('/dashboard');
  revalidatePath('/inventory');
  revalidatePath('/scan');
  revalidatePath('/reports');

  return { success: true };
}

export async function adjustInventoryStock(input: {
  code: string;
  quantity: number;
  action: InventoryAdjustmentType;
  requireSession?: boolean;
}) {
  const user = await requireCurrentUser();
  const result = await applyInventoryAdjustment(
    {
      isbn: input.code,
      count: input.quantity,
    },
    input.action,
    user,
    Boolean(input.requireSession),
  );

  if (!result.success) {
    return result;
  }

  revalidatePath('/dashboard');
  revalidatePath('/inventory');
  revalidatePath('/scan');
  revalidatePath('/reports');
  revalidatePath('/activity');
  revalidatePath('/automation/quick-scan');
  revalidatePath('/automation/batch-update');

  return { success: true, data: result };
}

export async function batchUpdateStock(
  items: InventoryBatchItemInput[],
  actionType: InventoryAdjustmentType,
  options?: { requireSession?: boolean },
) {
  const user = await requireCurrentUser();

  if (!items.length) {
    return { success: false, error: 'Add at least one item before processing the batch.' };
  }

  if (options?.requireSession) {
    const activeSession = await getActiveAutomationSessionForUser(user.id);
    if (!activeSession) {
      return { success: false, error: 'Start an automation session before processing scan or batch operations.' };
    }
  }

  const processed: Array<{ isbn: string; title: string; quantity: number; newStock: number }> = [];
  const failed: Array<{ isbn: string; error: string }> = [];

  for (const item of items) {
    const result = await applyInventoryAdjustment(item, item.action ?? actionType, user, Boolean(options?.requireSession));

    if (result.success) {
      processed.push({
        isbn: result.isbn,
        title: result.title,
        quantity: result.quantity,
        newStock: result.newStock,
      });
    } else {
      failed.push({
        isbn: normalizeIsbn(item.isbn) || cleanString(item.isbn),
        error: result.error,
      });
    }
  }

  revalidatePath('/dashboard');
  revalidatePath('/inventory');
  revalidatePath('/scan');
  revalidatePath('/reports');
  revalidatePath('/activity');
  revalidatePath('/automation/quick-scan');
  revalidatePath('/automation/batch-update');

  return {
    success: failed.length === 0,
    processedCount: processed.length,
    failedCount: failed.length,
    processed,
    failed,
    error: failed.length ? 'Some rows could not be processed.' : undefined,
  };
}

export async function getRecentScans(limit = 6) {
  await requireCurrentUser();

  const snapshot = await adminDb.collection('activity_logs').orderBy('timestamp', 'desc').limit(100).get();
  const scans = snapshot.docs
    .map((doc) => mapActivityDocument(doc.id, doc.data() ?? {}))
    .filter((activity) => activity.type === 'Product Search' || activity.type === 'Inventory Scan')
    .slice(0, limit)
    .map((activity) => ({
      id: activity.id,
      title: typeof activity.metadata?.title === 'string' && activity.metadata.title ? activity.metadata.title : 'Unknown item',
      isbn: typeof activity.metadata?.isbn === 'string' ? activity.metadata.isbn : '--',
      timeLabel: activity.timeLabel,
    }));

  return {
    success: true,
    data: scans,
  };
}
