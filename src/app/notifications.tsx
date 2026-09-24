import { useAuth } from '@/context/AuthContext';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppNotification, notificationService } from '../services/notifications';
import { colors } from '../styles/globals';

// ─── Icon per notification type ────────────────────────────────────────────

const TYPE_META: Record<string, { icon: React.ComponentProps<typeof MaterialIcons>['name']; color: string }> = {
  low_stock:            { icon: 'inventory',              color: '#a05f00' },
  out_of_stock:         { icon: 'remove-shopping-cart',   color: colors.error },
  payment_due:          { icon: 'payments',               color: colors.primaryContainer },
  invoice_overdue:      { icon: 'error-outline',          color: colors.error },
  unpaid_invoices:      { icon: 'receipt-long',           color: '#a05f00' },
  daily_sales_summary:  { icon: 'trending-up',            color: colors.primaryContainer },
  sales_milestone:      { icon: 'emoji-events',           color: colors.primaryContainer },
  profit_performance:   { icon: 'insights',               color: colors.primaryContainer },
  sales_drop:           { icon: 'trending-down',          color: colors.error },
  weekly_report:        { icon: 'description',            color: colors.primaryContainer },
  best_selling_product: { icon: 'star',                    color: colors.primaryContainer },
  fast_moving_stock:    { icon: 'bolt',                    color: '#a05f00' },
  restock_reminder:     { icon: 'inventory',              color: '#a05f00' },
  stock_adjustment:     { icon: 'tune',                    color: colors.onSurfaceVariant },
  new_customer:         { icon: 'person-add',              color: colors.primaryContainer },
};

function resolveRoute(n: AppNotification): string | null {
  const productId = n.data?.product_id;
  const documentId = n.data?.document_id;
  if (productId) return `/(owner-tabs)/products/${productId}`;
  if (documentId) return `/doc-detail?id=${documentId}`;
  return null;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function NotificationRow({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const meta = TYPE_META[item.notificationType] ?? { icon: 'notifications' as const, color: colors.onSurfaceVariant };
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row', gap: 12,
        paddingVertical: 14, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: '#e9ecef',
        backgroundColor: item.isRead ? colors.surface : colors.white,
      }}
    >
      <View style={{
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: meta.color + '18',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <MaterialIcons name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{
            flex: 1, fontFamily: 'Inter', fontSize: 14,
            fontWeight: item.isRead ? '600' : '800',
            color: colors.onSurface,
          }}>
            {item.title}
          </Text>
          {!item.isRead ? (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primaryContainer }} />
          ) : null}
        </View>
        <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant, marginTop: 3 }}>
          {item.body}
        </Text>
        <Text style={{ fontFamily: 'Inter', fontSize: 11, color: colors.gray, marginTop: 6 }}>
          {timeAgo(item.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { refresh: refreshUnreadCount } = useUnreadCount();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setNotifications(await notificationService.list());
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handlePress = (item: AppNotification) => {
    if (!item.isRead) {
      setNotifications(prev => prev.map(n => (n.id === item.id ? { ...n, isRead: true } : n)));
      notificationService.markRead(item.id)
        .then(() => refreshUnreadCount())
        .catch(() => load());
    }
    const route = resolveRoute(item);
    if (route) router.push(route as never);
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    notificationService.markAllRead()
      .then(() => refreshUnreadCount())
      .catch(() => load());
  };

  // Owner-only screen — matches the backend's 403 for anyone else.
  // Redirecting here is a UX nicety; the real enforcement is server-side.
  if (user && user.role !== 'owner') {
    router.replace('/(staff-tabs)' as never);
    return null;
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primaryContainer} />
      </SafeAreaView>
    );
  }

  const hasUnread = notifications.some(n => !n.isRead);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }} edges={['top']}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: colors.white,
        borderBottomWidth: 1, borderBottomColor: '#e9ecef',
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginRight: 12 }}>
          <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 18, fontWeight: '800', color: colors.primaryContainer }}>
          Notifications
        </Text>
        {hasUnread ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: '700', color: colors.primaryContainer }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={notifications.length === 0 ? { flex: 1 } : undefined}
      >
        {notifications.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <MaterialIcons name="notifications-none" size={32} color={colors.onSurfaceVariant} style={{ marginBottom: 12 }} />
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center' }}>
              No notifications yet.
            </Text>
          </View>
        ) : (
          notifications.map(item => (
            <NotificationRow key={item.id} item={item} onPress={() => handlePress(item)} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}