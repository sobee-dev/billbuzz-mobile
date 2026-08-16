import api from '../lib/axios';

export type DocumentType = 'purchase_invoice' | 'proforma_invoice' | 'sales_invoice';
export type DocumentStatus = 'draft' | 'paid' | 'unpaid' | 'delivered' | 'deleted';

export interface DocumentItem {
  id: string;
  document: string;
  product?: string; // product UUID, null if unset or deleted (SET_NULL)
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  order: number;
}

export type DocumentItemPayload = Omit<DocumentItem, 'id' | 'document' | 'total' | 'order'> & {
  productName?: string; // new/free-text name — backend resolves via get_or_create_product
};

export interface Document {
  id: string;
  business: string;
  customer?: string;
  documentType: DocumentType;
  status: DocumentStatus;
  documentNumber: string;
  documentDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  supplierName: string;
  currency: string;
  subtotal: number;
  taxRate: number; // e.g. 0.15 — default is 0.0000 on the model
  taxAmount: number;
  discount: number;
  grandTotal: number;
  notes: string;
  amountPaid: number;
  paidAt?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  createdAt: string;
  createdBy?: {
    id: string;
    firstName: string;
    email: string;
    displayName: string;
  };
  updatedAt: string;
  items?: DocumentItem[];
}

export type DocumentCreatePayload = Partial<Omit<Document, 'id' | 'business' | 'createdBy' | 'subtotal' | 'taxAmount' | 'documentNumber' | 'grandTotal' | 'createdAt' | 'updatedAt' | 'items'>> & {
  documentType: DocumentType;
  documentDate: string; // ISO date, required (no default on model)
  items?: DocumentItemPayload[];
};


export type DocumentUpdatePayload = Partial<Omit<Document, 'id' | 'business' | 'createdBy' | 'documentType' | 'documentNumber' | 'subtotal' | 'taxAmount' | 'grandTotal' | 'createdAt' | 'updatedAt' | 'items'>> & {
  items?: DocumentItemPayload[]; // full replace — update() deletes existing items and recreates them
};

export interface DeductionItem {
  itemId: string;
  qty: number;
}


export interface DocumentListParams {
  documentType?: DocumentType;
  status?:       DocumentStatus;
  search?:       string;
  customer?:     string;
  page?:         number;
  ordering?:     string;
}

export interface PaginatedResponse<T> {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  T[];
}

export const documentService = {
  async list(params?: DocumentListParams): Promise<PaginatedResponse<Document>> {
    const { data } = await api.get('/api/documents/', { params });
    return data;
  },

  async get(id: string): Promise<Document> {
    const { data } = await api.get(`/api/documents/${id}/`);
    return data;
  },

  async create(payload: DocumentCreatePayload): Promise<Document> {
    const { data } = await api.post('/api/documents/', payload);
    return data;
  },

  async update(id: string, payload: DocumentUpdatePayload): Promise<Document> {
    const { data } = await api.patch(`/api/documents/${id}/`, payload);
    return data;
  },

  /** Mark a document as paid (Document.mark_paid) */
  async markPaid(id: string): Promise<Document> {
    const { data } = await api.post(`/api/documents/${id}/mark-paid/`);
    return data;
  },

  /** Mark a document as delivered (Document.mark_delivered) */
  async markDelivered(id: string): Promise<Document> {
    const { data } = await api.post(`/api/documents/${id}/deliver/`);
    return data;
  },

  /** Soft-delete a document (Document.soft_delete) */
  async softDelete(id: string): Promise<Document> {
    const { data } = await api.post(`/api/documents/${id}/soft-delete/`);
    return data;
  },

   /** Deduct stock from inventory for a sales invoice */
  async deductInventory(id: string, deductions: DeductionItem[]): Promise<{ status: string }> {
    const { data } = await api.post(`/api/documents/${id}/deduct-inventory/`, {
      items: deductions.map(d => ({ itemId: d.itemId, quantity: d.qty })),
    });
    return data;
  },

  /** Deduct stock for every trackable line item in one call, matching invoice quantities exactly */
  async deductAllInventory(id: string): Promise<{ status: string }> {
    const { data } = await api.post(`/api/documents/${id}/deduct-inventory/`, {
      subtractAll: true,
    });
    return data;
  },

  /** Add supplier-order items back into inventory */
  async addToInventory(id: string): Promise<{ status: string }> {
    const { data } = await api.post(`/api/documents/${id}/add-to-inventory/`);
    return data;
  },
};