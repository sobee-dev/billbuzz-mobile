import api from '../lib/axios';

export interface Product {
  id:               string;
  name:             string;
  description?:     string;
  sku:              string | null ;
  unitPrice:        string;
  imageUrl?:        string;
  quantityOnHand:   string;   // DecimalField string
  totalSold?:       string;   // DecimalField string
  availableToSell:  string;   // DecimalField string — backend-computed, use this instead of quantityOnHand - quantityReserved
  isLowStock:       boolean;  // backend-computed — trust this over any client-side reorder-level math
  reorderLevel?:    number;   // present on create/update payloads; unconfirmed whether the detail GET returns it
  isActive:         boolean;
}

export interface ProductCreatePayload {
  name:            string;
  sku?:            string | null; 
  unitPrice:       number;   
  description?:    string;
  imageUrl?:       string;
  quantityOnHand?: number;
  reorderLevel?:   number;
  isActive?:       boolean;
}

export type ProductUpdatePayload = Partial<ProductCreatePayload>;

export interface ProductListParams {
  search?:   string;
  isActive?: boolean;
  ordering?: string;
  page?:     number;
}

export interface PaginatedResponse<T> {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  T[];
}

export interface StockAdjustmentPayload {
  quantityChange: number; // positive = add stock, negative = remove
  reason: string;
}

export interface StockAdjustmentResponse {
  status: string;
  product: Product;
  transactionId: string;
}

export const productService = {
  async search(query: string): Promise<Product[]> {
    if (!query.trim()) return [];
    const { data } = await api.get('/api/products/', { params: { search: query } });
    return Array.isArray(data.results) ? data.results : data;
  },

  async list(params?: ProductListParams): Promise<PaginatedResponse<Product>> {
    const { data } = await api.get('/api/products/', { params });
    return data;
  },

  async get(id: string): Promise<Product> {
    const { data } = await api.get(`/api/products/${id}/`);
    return data;
  },

  async create(payload: ProductCreatePayload): Promise<Product> {
    const { data } = await api.post('/api/products/', payload);
    return data;
  },

  async update(id: string, payload: ProductUpdatePayload): Promise<Product> {
    const { data } = await api.patch(`/api/products/${id}/`, payload);
    return data;
  },

  async adjustStock(id: string, payload: StockAdjustmentPayload): Promise<StockAdjustmentResponse> {
    const { data } = await api.post<StockAdjustmentResponse>(
      `/api/products/${id}/adjust-stock/`,
      payload,
    );
    return data;
  },


  async deactivate(id: string): Promise<Product> {
    const { data } = await api.post(`/api/products/${id}/deactivate/`);
    return data;
  },
};