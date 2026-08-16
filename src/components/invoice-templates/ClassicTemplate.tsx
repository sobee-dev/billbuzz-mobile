// components/receipt-templates/ClassicTemplate.tsx
import { resolveCurrency } from '@/utils/currencySymbol';
import { Text, View } from 'react-native';
import { colors } from '../../styles/globals';
import { ReceiptTemplateProps } from './index';

export function ClassicTemplate({ doc }: ReceiptTemplateProps) {
  const currencySymbol = resolveCurrency(doc.currency).symbol;

  return (
    <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: '#e9ecef', padding: 24 }}>
      <Text style={{ fontFamily: 'Inter', fontSize: 18, fontWeight: '700', color: colors.onSurface, textAlign: 'center' }}>
        {doc.documentNumber}
      </Text>
      <View style={{ height: 1, backgroundColor: '#e9ecef', marginVertical: 16 }} />
      <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant, textAlign: 'center' }}>
        {doc.customerName || doc.supplierName}
      </Text>
      <Text style={{ fontFamily: 'Inter', fontSize: 22, fontWeight: '700', color: colors.onSurface, textAlign: 'center', marginTop: 16 }}>
        {currencySymbol}{Number(doc.grandTotal).toFixed(2)}
      </Text>
      {/* Classic template: centered, formal, ruled dividers */}
    </View>
  );
}