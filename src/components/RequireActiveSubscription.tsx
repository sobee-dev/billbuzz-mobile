// components/RequireActiveSubscription.tsx
import { useAuth } from '@/context/AuthContext';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../styles/globals';

/** Wrap any non-dashboard screen's return value in this. Renders the
 * screen normally when subscription is active; swaps in a lock state
 * with a way back to the dashboard when it isn't. Catches deep links
 * that skip the tab bar entirely (push notifications, universal links). */
export function RequireActiveSubscription({ children }: { children: React.ReactNode }) {
  const { isLocked } = useSubscriptionContext();
  const { user } = useAuth();
  const router = useRouter();

  if (!isLocked) return <>{children}</>;

  const dashboardRoute = user?.role === 'owner' ? '/(owner-tabs)/dashboard' : '/(staff-tabs)/dashboard';

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.surface }}>
      <MaterialIcons name="lock-outline" size={40} color={colors.error} />
      <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '700', color: colors.onSurface, marginTop: 12, textAlign: 'center' }}>
        Subscription Inactive
      </Text>
      <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant, marginTop: 6, textAlign: 'center', maxWidth: 280 }}>
        {user?.role === 'owner'
          ? 'Renew your subscription to unlock this screen.'
          : "This business's subscription is inactive. Contact your business owner."}
      </Text>
      <TouchableOpacity
        onPress={() => router.replace(dashboardRoute as any)}
        style={{ marginTop: 20, backgroundColor: colors.primaryContainer, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20 }}
      >
        <Text style={{ fontFamily: 'Inter', fontWeight: '700', color: colors.white }}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}