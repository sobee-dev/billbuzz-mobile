import api from '../lib/axios';

export interface MonthlyRevenuePoint {
  month:   string;
  value:   number | string;
  current: boolean;
}

export interface ReportsDashboard {
  monthlyRevenue:   MonthlyRevenuePoint[];
  revenueTotal:     number | string;
  revenueGrowth:    string;
  avgInvoiceValue:  number | string;
  collectionRate:   string;
  outstandingTotal: number | string;
}

export const reportService = {
  async getDashboard(): Promise<ReportsDashboard> {
    const { data } = await api.get<ReportsDashboard>('/api/reports/dashboard/');
    return data;
  },
};