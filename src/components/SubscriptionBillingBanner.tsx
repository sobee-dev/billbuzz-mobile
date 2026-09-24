// components/SubscriptionBillingBanner.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { colors } from '../styles/globals';

export function SubscriptionBillingBanner() {
  return (
    <View style={{
      backgroundColor: colors.error, borderRadius: 14, padding: 16, marginBottom: 20,
      flexDirection: 'row', alignItems: 'center', gap: 10,
    }}>
      <MaterialIcons name="lock-outline" size={20} color={colors.white} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.white }}>
          Subscription Inactive
        </Text>
        <Text style={{ fontFamily: 'Inter', fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
          Contact support to resolve this.
        </Text>
      </View>
    </View>
  );
}