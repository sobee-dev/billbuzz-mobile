import api from '../lib/axios';

export type NotificationType =
  | 'low_stock' | 'out_of_stock' | 'payment_due' | 'invoice_overdue' | 'unpaid_invoices'
  | 'daily_sales_summary' | 'sales_milestone' | 'profit_performance' | 'sales_drop' | 'weekly_report'
  | 'best_selling_product' | 'fast_moving_stock' | 'restock_reminder' | 'stock_adjustment' | 'new_customer';

export type PushPlatform = 'ios' | 'android';

export interface AppNotification {
  id: string;
  notificationType: NotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export const notificationService = {
  // ── Device push token registration — hits /api/push/, unrelated to
  // the /api/notifications/ endpoints below. Kept in this file so
  // call sites only need one import, but the backend routes are
  // untouched (still PushTokenViewSet, not NotificationViewSet). ──

  /** Call after login, and again whenever Expo issues a fresh token. */
  async registerToken(expoPushToken: string, platform?: PushPlatform): Promise<void> {
    await api.post('/api/notifications/push/register/', { expoPushToken, platform });
  },

  /** Call on logout so a signed-out device stops receiving pushes for the account it just left. */
  async unregisterToken(expoPushToken: string): Promise<void> {
    await api.post('/api/notifications/push/unregister/', { expoPushToken });
  },

  // ── In-app notification center — hits /api/notifications/ ──

  async list(params?: { unread?: boolean; type?: NotificationType }): Promise<AppNotification[]> {
    const { data } = await api.get('/api/notifications/', {
      params: {
        unread: params?.unread ? 'true' : undefined,
        type: params?.type,
      },
    });
    return data;
  },

  async unreadCount(): Promise<number> {
    const { data } = await api.get('/api/notifications/unread_count/');
    return data.count;
  },

  async markRead(id: string): Promise<AppNotification> {
    const { data } = await api.post(`/api/notifications/${id}/mark_read/`);
    return data;
  },

  async markAllRead(): Promise<number> {
    const { data } = await api.post('/api/notifications/mark_all_read/');
    return data.updated;
  },
};