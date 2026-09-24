import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

import { useUnreadCount } from '@/hooks/useUnreadCount';
import { colors } from '../styles/globals';

// Owner-only by design — mount this in the owner dashboard's nav bar,
// never in StaffDashboard's. The backend also enforces this (see
// NotificationViewSet._require_owner), so a staff account hitting
// unread_count() would get a 403 rather than a silent 0 — don't mount
// this where a staff session could render it.
//
// The count itself lives in hooks/useUnreadCount, which shares a single
// fetcher across every place the bell is rendered.
export function NotificationBell() {
  const router = useRouter();
  const { count: unreadCount } = useUnreadCount();

  return (
    <TouchableOpacity
      onPress={() => router.push('/notifications' as never)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ padding: 4 }}
    >
      <View>
        <MaterialIcons name="notifications-none" size={24} color={colors.onSurface} />
        {unreadCount > 0 ? (
          <View style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: 16, height: 16, borderRadius: 8,
            backgroundColor: colors.error,
            alignItems: 'center', justifyContent: 'center',
            paddingHorizontal: 3,
          }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '800', color: colors.white }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}