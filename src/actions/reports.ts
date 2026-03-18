'use server';

import { revalidatePath } from 'next/cache';
import { createActivityLog, mapActivityDocument } from '@/lib/activity-log';
import type { GeneratedReport, ReportRange, ReportType, TrendPoint } from '@/lib/app-types';
import { adminDb } from '@/lib/firebase/admin';
import { listInventoryItems } from '@/lib/inventory-store';
import { requireCurrentUser } from '@/lib/session';
import { formatDate, formatDateTime, getLastSevenDays, getRangeStart, safeDate } from '@/lib/utils';

function getReportTitle(type: ReportType, range: ReportRange) {
  const rangeLabel =
    range === 'today'
      ? 'Today'
      : range === 'this-week'
        ? 'This Week'
        : range === 'this-month'
          ? 'This Month'
          : range === 'this-year'
            ? 'This Year'
            : 'All Time';

  const typeLabel =
    type === 'activity' ? 'Activity Report' : type === 'low-stock' ? 'Low Stock Report' : 'Inventory Report';

  return `${typeLabel} - ${rangeLabel}`;
}

async function getRangedActivities(range: ReportRange) {
  const rangeStart = getRangeStart(range);
  const snapshot = await adminDb.collection('activity_logs').orderBy('timestamp', 'desc').limit(500).get();

  return snapshot.docs
    .map((doc) => mapActivityDocument(doc.id, doc.data() ?? {}))
    .filter((activity) => safeDate(activity.createdAt) >= rangeStart);
}

export async function getReportStats(range: ReportRange = 'this-month') {
  await requireCurrentUser();

  const [items, activities] = await Promise.all([listInventoryItems(), getRangedActivities(range)]);
  const inventoryActivities = activities.filter((activity) => activity.type === 'Inventory Update');
  const stockMovements = inventoryActivities.reduce((total, activity) => {
    const quantity = activity.metadata?.quantity;
    return total + (typeof quantity === 'number' ? quantity : 0);
  }, 0);

  const trendPoints: TrendPoint[] = getLastSevenDays().map((date) => {
    const count = inventoryActivities.filter((activity) => safeDate(activity.createdAt).toDateString() === date.toDateString()).length;
    return {
      label: formatDate(date).slice(0, 3),
      count,
    };
  });

  const recentReportsSnapshot = await adminDb.collection('reports').orderBy('createdAt', 'desc').limit(6).get();
  const recentReports: GeneratedReport[] = recentReportsSnapshot.docs.map((doc) => {
    const data = doc.data() ?? {};
    const createdAt = typeof data.createdAt === 'string' ? data.createdAt : new Date(0).toISOString();

    return {
      id: doc.id,
      type: (data.type as ReportType) ?? 'inventory',
      range: (data.range as ReportRange) ?? 'this-month',
      title: typeof data.title === 'string' ? data.title : 'Generated Report',
      createdAt,
      createdAtLabel: formatDateTime(createdAt),
      fileName: typeof data.fileName === 'string' ? data.fileName : `report-${doc.id}.csv`,
      rowCount: Number(data.rowCount) || 0,
      summary: {
        inventoryValue: Number(data.summary?.inventoryValue) || 0,
        stockMovements: Number(data.summary?.stockMovements) || 0,
        lowStockItems: Number(data.summary?.lowStockItems) || 0,
        outOfStock: Number(data.summary?.outOfStock) || 0,
      },
    };
  });

  return {
    success: true,
    data: {
      inventoryValue: items.reduce((total, item) => total + item.inventoryValue, 0),
      stockMovements,
      lowStockItems: items.filter((item) => item.stockStatus === 'low-stock').length,
      outOfStock: items.filter((item) => item.stockStatus === 'out-of-stock').length,
      topBooks: [...items].sort((left, right) => right.stock - left.stock).slice(0, 5),
      trendPoints,
      recentReports,
    },
  };
}

function buildCsv(type: ReportType, items: Awaited<ReturnType<typeof listInventoryItems>>, activities: Awaited<ReturnType<typeof getRangedActivities>>) {
  if (type === 'activity') {
    const rows = [
      ['Date', 'Type', 'Action', 'Status', 'User'],
      ...activities.map((activity) => [
        activity.createdAt,
        activity.type,
        activity.action.replace(/,/g, ';'),
        activity.status,
        activity.userName ?? '',
      ]),
    ];

    return {
      rows: activities.length,
      csv: rows.map((row) => row.join(',')).join('\n'),
    };
  }

  const filteredItems = type === 'low-stock' ? items.filter((item) => item.stockStatus !== 'in-stock') : items;
  const rows = [
    ['Title', 'ISBN', 'SKU', 'Category', 'Stock', 'Reorder Level', 'Unit Price', 'Inventory Value', 'Updated At'],
    ...filteredItems.map((item) => [
      item.title.replace(/,/g, ';'),
      item.isbn,
      item.sku,
      item.category.replace(/,/g, ';'),
      String(item.stock),
      String(item.reorderLevel),
      item.unitPrice.toFixed(2),
      item.inventoryValue.toFixed(2),
      item.updatedAt,
    ]),
  ];

  return {
    rows: filteredItems.length,
    csv: rows.map((row) => row.join(',')).join('\n'),
  };
}

export async function generateReport(input: { range: ReportRange; type: ReportType }) {
  const user = await requireCurrentUser();
  const range = input.range ?? 'this-month';
  const type = input.type ?? 'inventory';

  const [items, activities] = await Promise.all([listInventoryItems(), getRangedActivities(range)]);
  const summary = {
    inventoryValue: items.reduce((total, item) => total + item.inventoryValue, 0),
    stockMovements: activities
      .filter((activity) => activity.type === 'Inventory Update')
      .reduce((total, activity) => total + (typeof activity.metadata?.quantity === 'number' ? activity.metadata.quantity : 0), 0),
    lowStockItems: items.filter((item) => item.stockStatus === 'low-stock').length,
    outOfStock: items.filter((item) => item.stockStatus === 'out-of-stock').length,
  };

  const csv = buildCsv(type, items, activities);
  const title = getReportTitle(type, range);
  const createdAt = new Date().toISOString();
  const fileName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;

  const reportRef = await adminDb.collection('reports').add({
    type,
    range,
    title,
    createdAt,
    createdById: user.id,
    createdByName: user.name,
    fileName,
    rowCount: csv.rows,
    summary,
    csvContent: csv.csv,
  });

  await createActivityLog({
    type: 'Report Generated',
    action: `Generated ${title}.`,
    status: 'success',
    user,
    entityId: reportRef.id,
    entityType: 'report',
    metadata: {
      rowCount: csv.rows,
      range,
      type,
    },
  });

  revalidatePath('/reports');
  revalidatePath('/activity');

  return {
    success: true,
    reportId: reportRef.id,
    fileName,
    title,
  };
}
