import api from '../lib/axios';

export type PaymentMethodPreference = 'cash' | 'card' | 'bank_transfer' | string;
export type CustomerStatus = 'active' | 'inactive';

export interface Customer {
  id:                      string;
  business:                string;
  fullName:                string;
  email?:                  string;
  phone?:                  string;
  paymentMethodPreference: PaymentMethodPreference;
  tags:                    string[];
  notes?:                  string;
  outstandingBalance:      number | string; // DRF DecimalField — may arrive as a string
  lifetimeValue:           number | string; // from CustomerSerializer's lifetime_value — detail endpoint only
  status:                  CustomerStatus;
  createdAt:               string;
}

export interface CustomerCreatePayload {
  fullName:                 string;
  email?:                   string;
  phone?:                   string;
  paymentMethodPreference?: PaymentMethodPreference;
  tags?:                    string[];
  notes?:                   string;
}

export interface CustomerUpdatePayload extends Partial<CustomerCreatePayload> {
  status?: CustomerStatus;
}

export interface CustomerListParams {
  search?:   string;
  status?:   CustomerStatus;
  ordering?: string;
  page?:     number;
}

export interface PaginatedResponse<T> {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  T[];
}

export interface CustomerAnalytics {
  totalCustomers:      number;
  activeCount:         number;
  inactiveCount:       number;
  totalLtv:            number | string;
  avgLtv:               number | string;
  totalOutstanding:     number | string;
  balanceDueCount:      number;
  topClients:           Customer[];
  balanceDueClients:    Customer[];
  paymentBreakdown:     { preference: string; count: number }[];
}

export const customerService = {
  async search(query: string): Promise<Customer[]> {
    if (!query.trim()) return [];
    const { data } = await api.get('/api/customers/', { params: { search: query } });
    return Array.isArray(data.results) ? data.results : data;
  },

  async list(params?: CustomerListParams): Promise<PaginatedResponse<Customer>> {
    const { data } = await api.get('/api/customers/', { params });
    return data;
  },

  async get(id: string): Promise<Customer> {
    const { data } = await api.get(`/api/customers/${id}/`);
    return data;
  },

  async fetchCustomerAnalytics(): Promise<CustomerAnalytics> {
    const { data } = await api.get<CustomerAnalytics>('/api/customers/analytics/');
    return data;
  },

  async create(payload: CustomerCreatePayload): Promise<Customer> {
    const { data } = await api.post('/api/customers/', payload);
    return data;
  },

  async update(id: string, payload: CustomerUpdatePayload): Promise<Customer> {
    const { data } = await api.patch(`/api/customers/${id}/`, payload);
    return data;
  },

  async deactivate(id: string): Promise<Customer> {
    const { data } = await api.post(`/api/customers/${id}/deactivate/`);
    return data;
  },

  async reactivate(id: string): Promise<Customer> {
    const { data } = await api.post(`/api/customers/${id}/reactivate/`);
    return data;
  },
};