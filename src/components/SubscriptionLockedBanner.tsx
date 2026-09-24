// components/SubscriptionLockedBanner.tsx
import { useAuth } from '@/context/AuthContext';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { colors } from '../styles/globals';

export function SubscriptionLockedBanner() {
  const { user } = useAuth();
  const { isLocked } = useSubscriptionContext();

  if (!isLocked) return null;

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: '#fdecea', borderBottomWidth: 1, borderBottomColor: '#f5c2c0',
      paddingHorizontal: 16, paddingVertical: 10,
    }}>
      <MaterialIcons name="lock-outline" size={18} color={colors.error} />
      <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 12, fontWeight: '600', color: colors.error }}>
        {user?.role === 'owner'
          ? 'Your subscription needs attention. Contact support to resolve this.'
          : "This business's subscription is inactive. Contact your business owner."}
      </Text>
    </View>
  );
}