import api from '../lib/axios';

export interface BusinessProfile {
  id: string;
  owner: string;
  name: string;
  description: string;
  addressOne: string;
  addressTwo: string;
  phone: string;
  email: string;
  registrationNumber: string;
  logoUrl?: string;
  brandColorOne: string;
  brandColorTwo: string;
  currency: string;
  taxRate: string;
  taxEnabled: boolean;
  selectedTemplateId: 'modern' | 'classic' | 'minimal';
  onboardingComplete: boolean;
  motto: string;
  serverId: string | null;
  signatureType: 'text' | 'image' | 'none';
  signatureText: string;
  signatureUrl: string | null;
  syncStatus: 'pending' | 'synced' | 'error';
  createdAt: string;
}

export type BusinessCreatePayload = Partial<
  Omit<BusinessProfile, 'id' | 'owner' | 'serverId' | 'syncStatus' | 'createdAt' >
> & {
  name: string;
};

export interface RecentDocument {
  id: string;
  documentNumber: string;
  documentType: 'sales_invoice' | 'proforma_invoice' | 'purchase_invoice';
  clientName: string;
  totalAmount: number;
  currency: string;
  status: 'draft' | 'paid' | 'unpaid' | 'deleted';
  createdAt: string;
  createdBy?: {
    id: string;
    firstName: string;
    email: string;
    displayName: string;
  };
}

export interface SummaryData {
  totalYearRevenue: number;
  allTimeRevenue: number;
  monthlyRevenue: number;

  itemsSoldThisMonth: number;

  salesInvoicesIssuedToday: number;
  salesInvoicesIssuedThisWeek: number;
  salesInvoicesIssuedThisMonth: number;
  salesInvoicesIssuedAllTime: number;

  proformaInvoicesIssuedToday: number;
  proformaInvoicesIssuedThisWeek: number;
  proformaInvoicesIssuedThisMonth: number;
  proformaInvoicesIssuedAllTime: number;

  draftCount: number;

  newClientsThisWeek: number;
  newClientsThisMonth: number;
  totalClientCount: number;

  lowStockCount: number;

  recentDocuments?: RecentDocument[];
}

// Wire shape as it actually arrives — after the camelCase middleware,
// but before we reshape it into the frontend's SummaryData contract.
interface RawRecentDocument {
  id: string;
  documentNumber: string;
  documentType: 'sales_invoice' | 'proforma_invoice' | 'purchase_invoice';
  customerName: string;
  grandTotal: string; // was: number — DRF DecimalFields serialize to strings, not numbers
  currency: string;
  status: 'draft' | 'paid' | 'unpaid' | 'deleted';
  createdAt: string;
  createdBy?: {
    id: string;
    firstName: string;
    email: string;
    displayName: string;
  };
}

interface SummaryDataResponse {
  stats: {
    inventory: { lowStock: number; itemsSoldThisMonth: number };
    clients: { newThisWeek: number; newThisMonth: number; total: number };
    invoices: {
      revenue: { totalYear: number; allTime: number; monthly: number };
      salesInvoices: { today: number; thisWeek: number; thisMonth: number; allTime: number };
      proformaInvoices: { today: number; thisWeek: number; thisMonth: number; allTime: number };
      drafts: number;
      recentActivity: RawRecentDocument[];
    };
  };
}

export const businessService = {
  /** GET the authenticated owner's business */
  async getMyBusiness(): Promise<BusinessProfile> {
    const { data } = await api.get<BusinessProfile>('/api/business/me/');
    return data;
  },

  /** POST create a new business (owner onboarding step 1) */
  async createBusiness(payload: BusinessCreatePayload): Promise<BusinessProfile> {
    const { data } = await api.post<BusinessProfile>('/api/business/', payload);
    return data;
  },

  /** PATCH update business details */
  async updateBusiness(id: string, payload: Partial<BusinessCreatePayload>): Promise<BusinessProfile> {
    const { data } = await api.patch<BusinessProfile>('/api/business/me/', payload);
    return data;
  },

  /** POST complete the onboarding flow */
  async completeOnboarding(id: string): Promise<void> {
    await api.post(`/api/business/${id}/complete-onboarding/`);
  },

  /** GET the owner dashboard (recent docs, quick stats) */
  async getSummaryData(): Promise<SummaryData> {
    const { data } = await api.get<SummaryDataResponse>('/api/business/summary-data/');
    const { inventory, clients, invoices } = data.stats;

    return {
      totalYearRevenue: invoices.revenue.totalYear,
      allTimeRevenue: invoices.revenue.allTime,
      monthlyRevenue: invoices.revenue.monthly,

      itemsSoldThisMonth: inventory.itemsSoldThisMonth,

      salesInvoicesIssuedToday: invoices.salesInvoices.today,
      salesInvoicesIssuedThisWeek: invoices.salesInvoices.thisWeek,
      salesInvoicesIssuedThisMonth: invoices.salesInvoices.thisMonth,
      salesInvoicesIssuedAllTime: invoices.salesInvoices.allTime,

      proformaInvoicesIssuedToday: invoices.proformaInvoices.today,
      proformaInvoicesIssuedThisWeek: invoices.proformaInvoices.thisWeek,
      proformaInvoicesIssuedThisMonth: invoices.proformaInvoices.thisMonth,
      proformaInvoicesIssuedAllTime: invoices.proformaInvoices.allTime,

      draftCount: invoices.drafts,

      newClientsThisWeek: clients.newThisWeek,
      newClientsThisMonth: clients.newThisMonth,
      totalClientCount: clients.total,

      lowStockCount: inventory.lowStock,

      recentDocuments: invoices.recentActivity.map((doc) => ({
        id: doc.id,
        documentNumber: doc.documentNumber,
        documentType: doc.documentType,
        clientName: doc.customerName,
        totalAmount: Number(doc.grandTotal), // coerce string decimal -> real number, once, here
        currency: doc.currency,
        status: doc.status,
        createdAt: doc.createdAt,
        createdBy: doc.createdBy,
      })),
    };
  },
};