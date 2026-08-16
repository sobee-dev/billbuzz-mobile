// components/receipt-templates/PurchaseOrderTemplate.tsx
import { resolveCurrency } from '@/utils/currencySymbol';
import { Text, View } from 'react-native';
import { colors } from '../../styles/globals';
import { ReceiptTemplateProps } from './index';

const STATUS_LABEL: Record<string, string> = {
  draft:     'DRAFT',
  unpaid:    'PENDING',
  paid:      'PAID',
  delivered: 'DELIVERED',
  deleted:   'CANCELLED',
};

/**
 * Purchase orders are an internal receiving document, not a customer-facing
 * branded receipt — so this deliberately doesn't reuse Modern/Classic/Minimal.
 * No signature block, no "thank you for choosing us" footer, supplier name
 * instead of customer name. Selected irrespective of the business's chosen
 * template ID whenever documentType === 'purchase_invoice'.
 */
export function PurchaseOrderTemplate({ doc, business }: ReceiptTemplateProps) {
  const currencySymbol = resolveCurrency(doc.currency || business.currency).symbol;
  const isDelivered = doc.status === 'delivered';

  const formatCurrency = (amount: number | string | undefined | null) => {
    const n = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    const safe = typeof n === 'number' && !isNaN(n) ? n : 0;
    return `${currencySymbol}${safe.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <View style={{ backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e9ecef' }}>

      {/* Header */}
      <View style={{
        backgroundColor: '#1b1b1f', paddingVertical: 18, paddingHorizontal: 20,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <View>
          <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: 'rgba(255,255,255,0.6)' }}>
            PURCHASE ORDER
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '800', color: colors.white, marginTop: 2 }}>
            {doc.documentNumber}
          </Text>
        </View>
        <View style={{
          backgroundColor: isDelivered ? '#2e7d32' : 'rgba(255,255,255,0.15)',
          borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12,
        }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: colors.white }}>
            {STATUS_LABEL[doc.status] ?? doc.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={{ padding: 20 }}>

        {/* Business + Date */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>
              Received By
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.onSurface }}>
              {business.name}
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>
              Date
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.onSurface }}>
              {doc.documentDate}
            </Text>
          </View>
        </View>

        {/* Supplier */}
        <View style={{ backgroundColor: '#f5f5f8', borderRadius: 10, padding: 14, marginBottom: 20 }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>
            Supplier
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '800', color: colors.onSurface }}>
            {doc.supplierName || '—'}
          </Text>
        </View>

        {/* Items */}
        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e9ecef' }}>
            <Text style={{ flex: 5, fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: colors.onSurfaceVariant }}>Item</Text>
            <Text style={{ flex: 2, fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: colors.onSurfaceVariant, textAlign: 'center' }}>Qty</Text>
            <Text style={{ flex: 3, fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: colors.onSurfaceVariant, textAlign: 'right' }}>Total</Text>
          </View>
          {(doc.items ?? []).map((item, idx) => (
            <View
              key={item.id}
              style={{
                flexDirection: 'row', paddingVertical: 10,
                borderBottomWidth: idx < (doc.items?.length ?? 0) - 1 ? 1 : 0,
                borderBottomColor: '#f0f0f3',
              }}
            >
              <Text style={{ flex: 5, fontFamily: 'Inter', fontSize: 13, color: colors.onSurface }}>{item.description}</Text>
              <Text style={{ flex: 2, fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center' }}>{Number(item.quantity)}</Text>
              <Text style={{ flex: 3, fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.onSurface, textAlign: 'right' }}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={{ alignItems: 'flex-end', gap: 4, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 20 }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant }}>Subtotal</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant, width: 90, textAlign: 'right' }}>{formatCurrency(doc.subtotal)}</Text>
          </View>
          {Number(doc.taxAmount) > 0 && (
            <View style={{ flexDirection: 'row', gap: 20 }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant }}>Tax</Text>
              <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant, width: 90, textAlign: 'right' }}>{formatCurrency(doc.taxAmount)}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 20, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#e9ecef' }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '800', color: colors.onSurface }}>Total</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '800', color: colors.onSurface, width: 90, textAlign: 'right' }}>{formatCurrency(doc.grandTotal)}</Text>
          </View>
        </View>

        {doc.notes ? (
          <View style={{ backgroundColor: '#f5f5f8', borderRadius: 10, padding: 12 }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: colors.onSurfaceVariant, marginBottom: 4 }}>
              Notes
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurface }}>{doc.notes}</Text>
          </View>
        ) : null}

        {isDelivered && doc.deliveredAt ? (
          <Text style={{ fontFamily: 'Inter', fontSize: 11, color: colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }}>
            Marked delivered on {new Date(doc.deliveredAt).toLocaleDateString()}
          </Text>
        ) : null}

      </View>
    </View>
  );
}