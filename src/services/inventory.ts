import api from '../lib/axios';

export type TransactionType = 'purchase_received' | 'adjustment' | 'sales_confirmed';

// Wire shape — quantityChange is a DecimalField, serialized as a string by DRF.
interface RawInventoryTransaction {
  id: string;
  business: string;
  product: string;
  quantityChange: string;
  transactionType: TransactionType;
  referenceDocumentId: string | null;
  initiatedBy: string | null;
  reason: string;
  createdAt: string;
}

export interface InventoryTransaction {
  id: string;
  business: string;
  product: string;
  quantityChange: number;
  transactionType: TransactionType;
  referenceDocumentId: string | null;
  initiatedBy: string | null;
  reason: string;
  createdAt: string;
}

function normalize(raw: RawInventoryTransaction): InventoryTransaction {
  return { ...raw, quantityChange: Number(raw.quantityChange) };
}

// CursorPagination responses have no `count` — only next/previous/results.
export interface CursorPaginatedResponse<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

export const inventoryService = {
  /** GET cursor-paginated inventory transaction history for a product. */
  async getHistory(productId: string, cursor?: string): Promise<CursorPaginatedResponse<InventoryTransaction>> {
    const { data } = await api.get<CursorPaginatedResponse<RawInventoryTransaction>>(
      `/api/inventory/products/${productId}/history/`,
      { params: cursor ? { cursor } : undefined },
    );
    return { ...data, results: data.results.map(normalize) };
  },

  /** GET a single transaction. */
  async getTransaction(productId: string, txId: string): Promise<InventoryTransaction> {
    const { data } = await api.get<RawInventoryTransaction>(
      `/api/inventory/products/${productId}/history/${txId}/`,
    );
    return normalize(data);
  },
};