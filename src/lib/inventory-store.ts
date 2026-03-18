import { adminDb } from '@/lib/firebase/admin';
import type { InventoryItem, InventorySaveInput } from '@/lib/app-types';
import { buildSku, cleanString, formatDateTime, getStockStatus, normalizeIsbn, toIsoString, toNumber, toPositiveInt } from '@/lib/utils';

const BOOKS_COLLECTION = 'books';

export function mapInventoryDocument(id: string, value: Record<string, unknown>): InventoryItem {
  const title = cleanString(value.title) || 'Unnamed Item';
  const isbn = normalizeIsbn(value.isbn);
  const sku = cleanString(value.sku) || buildSku(title, isbn, id);
  const stock = toPositiveInt(value.stock);
  const reorderLevel = toPositiveInt(value.reorderLevel, 5);
  const unitPrice = toNumber(value.unitPrice ?? value.price, 0);
  const updatedAt = toIsoString(value.updatedAt ?? value.lastUpdated ?? value.createdAt, new Date(0).toISOString());

  return {
    id,
    title,
    isbn,
    sku,
    author: cleanString(value.author),
    category: cleanString(value.category) || 'General',
    stock,
    reorderLevel,
    unitPrice,
    coverUrl: cleanString(value.coverUrl),
    createdAt: toIsoString(value.createdAt ?? updatedAt, updatedAt),
    updatedAt,
    updatedAtLabel: formatDateTime(updatedAt),
    stockStatus: getStockStatus(stock, reorderLevel),
    inventoryValue: unitPrice * stock,
  };
}

export async function listInventoryItems() {
  const snapshot = await adminDb.collection(BOOKS_COLLECTION).get();
  return snapshot.docs.map((doc) => mapInventoryDocument(doc.id, doc.data() ?? {}));
}

export async function getInventoryDocumentById(id: string) {
  const document = await adminDb.collection(BOOKS_COLLECTION).doc(id).get();
  if (!document.exists) {
    return null;
  }

  return {
    ref: document.ref,
    item: mapInventoryDocument(document.id, document.data() ?? {}),
    data: document.data() ?? {},
  };
}

export async function findInventoryDocumentByCode(code: string) {
  const normalizedIsbn = normalizeIsbn(code);
  const normalizedCode = cleanString(code).toUpperCase();

  if (normalizedIsbn) {
    const isbnSnapshot = await adminDb.collection(BOOKS_COLLECTION).where('isbn', '==', normalizedIsbn).limit(1).get();
    if (!isbnSnapshot.empty) {
      const document = isbnSnapshot.docs[0];
      return {
        ref: document.ref,
        item: mapInventoryDocument(document.id, document.data() ?? {}),
        data: document.data() ?? {},
      };
    }
  }

  const snapshot = await adminDb.collection(BOOKS_COLLECTION).get();
  const matchingDocument = snapshot.docs.find((doc) => {
    const item = mapInventoryDocument(doc.id, doc.data() ?? {});
    return item.isbn === normalizedIsbn || item.sku.toUpperCase() === normalizedCode;
  });

  if (!matchingDocument) {
    return null;
  }

  return {
    ref: matchingDocument.ref,
    item: mapInventoryDocument(matchingDocument.id, matchingDocument.data() ?? {}),
    data: matchingDocument.data() ?? {},
  };
}

export function normalizeInventoryInput(input: InventorySaveInput) {
  const title = cleanString(input.title);
  const isbn = normalizeIsbn(input.isbn);
  const author = cleanString(input.author);
  const category = cleanString(input.category) || 'General';
  const stock = toPositiveInt(input.stock);
  const reorderLevel = toPositiveInt(input.reorderLevel, 5);
  const unitPrice = toNumber(input.unitPrice, 0);
  const coverUrl = cleanString(input.coverUrl);
  const sku = cleanString(input.sku) || buildSku(title, isbn, input.id);

  if (!title) {
    return { error: 'Title is required.' } as const;
  }

  if (!isbn) {
    return { error: 'A valid ISBN is required.' } as const;
  }

  if (unitPrice < 0) {
    return { error: 'Unit price cannot be negative.' } as const;
  }

  return {
    value: {
      title,
      isbn,
      sku,
      author,
      category,
      stock,
      reorderLevel,
      unitPrice,
      coverUrl,
    },
  } as const;
}
