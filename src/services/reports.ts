import api from '../lib/axios';

export interface ReportsDashboard {
  monthlyRevenue:   { month: string; value: number; current?: boolean }[];
  topProducts?:     { name: string; revenue: number; qty: number }[];
  topClients?:      { name: string; revenue: number; invoices: number }[];
  revenueTotal:     number;
  revenueGrowth:    string; // e.g. "+14%"
  avgInvoiceValue:  number;
  collectionRate:   string;
  outstandingTotal: number;
}

export const reportService = {
  async getDashboard(): Promise<ReportsDashboard> {
    const { data } = await api.get<ReportsDashboard>('/api/reports/dashboard/');
    return data;
  },
};
