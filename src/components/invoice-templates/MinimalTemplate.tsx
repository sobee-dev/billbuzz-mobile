// components/receipt-templates/MinimalTemplate.tsx
import { resolveCurrency } from '@/utils/currencySymbol';
import { Text, View } from 'react-native';
import { colors } from '../../styles/globals';
import { ReceiptTemplateProps } from './index';

export function MinimalTemplate({ doc }: ReceiptTemplateProps) {
  const currencySymbol = resolveCurrency(doc.currency).symbol;

  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontFamily: 'Inter', fontSize: 14, color: colors.onSurfaceVariant }}>
        {doc.documentNumber}
      </Text>
      <Text style={{ fontFamily: 'Inter', fontSize: 32, fontWeight: '300', color: colors.onSurface, marginTop: 12 }}>
        {currencySymbol}{Number(doc.grandTotal).toFixed(2)}
      </Text>
      {/* Minimal template: no borders/cards, generous whitespace, light weight type */}
    </View>
  );
}