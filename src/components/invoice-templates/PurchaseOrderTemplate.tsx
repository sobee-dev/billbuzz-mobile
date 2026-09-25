// components/receipt-templates/PurchaseOrderTemplate.tsx
import { resolveCurrency } from '@/utils/currencySymbol';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../styles/globals';
import { ReceiptTemplateProps } from './index';

// ─── Header wave ────────────────────────────────────────────────────────────
// Same wave math as ModernTemplate's HeaderWave, but drawn with a
// percentage width + preserveAspectRatio="none" instead of a fixed
// A4_WIDTH: this component (unlike Modern) isn't wrapped in
// A4ScaledPage, so it has to stretch to whatever width it's actually
// given rather than assuming a 595pt canvas.
const WAVE_VIEWBOX_W = 595;
const WAVE_HEIGHT = 34;

function wavePath1(offsetY: number) {
  return (
    `M0,${13 + offsetY} C120,${21 + offsetY} 220,${18 + offsetY} 300,${14 + offsetY} ` +
    `C380,${10 + offsetY} 480,${12 + offsetY} ${WAVE_VIEWBOX_W},${13 + offsetY} ` +
    `L${WAVE_VIEWBOX_W},${WAVE_HEIGHT} L0,${WAVE_HEIGHT} Z`
  );
}
function wavePath2(offsetY: number) {
  return (
    `M0,${18 + offsetY} C120,${13 + offsetY} 220,${8 + offsetY} 300,${12 + offsetY} ` +
    `C380,${19 + offsetY} 480,${13 + offsetY} ${WAVE_VIEWBOX_W},${13 + offsetY} ` +
    `L${WAVE_VIEWBOX_W},${WAVE_HEIGHT} L0,${WAVE_HEIGHT} Z`
  );
}

const STATUS_LABEL: Record<string, string> = {
  draft:     'DRAFT',
  unpaid:    'PENDING',
  paid:      'PAID',
  delivered: 'DELIVERED',
  deleted:   'CANCELLED',
};

const THUMB_SIZE = 34;

function ItemThumb({ uri }: { uri?: string | null }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 6, backgroundColor: '#f0f0f3' }}
        contentFit="cover"
      />
    );
  }
  // No product image — a plain placeholder square, not blank space, so
  // the column stays visually aligned whether or not an item has a photo.
  return (
    <View style={{
      width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 6,
      backgroundColor: '#f0f0f3', borderWidth: 1, borderColor: '#e5e7eb',
    }} />
  );
}

/**
 * Purchase orders are an internal receiving document, not a customer-facing
 * branded receipt — so this still deliberately skips Modern's signature
 * block, address/notes-heavy header and "thank you for choosing us"
 * footer. What it does borrow from Modern is the brand-colour wave header
 * and tinted, alternating item rows, for visual consistency across
 * templates — plus a product-image column so a receiving clerk can match
 * items by sight, not just by description. Selected irrespective of the
 * business's chosen template ID whenever documentType === 'purchase_invoice'.
 */
export function PurchaseOrderTemplate({ doc, business }: ReceiptTemplateProps) {
  const brandColor = business.brandColorOne || '#d3aeae';
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

  const items = doc.items ?? [];

  return (
    <View style={{ backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e9ecef' }}>

      {/* Header — brand-colour wave, same convention as ModernTemplate */}
      <View style={{
        backgroundColor: brandColor, paddingTop: 18, paddingHorizontal: 20, paddingBottom: 26,
        overflow: 'hidden', position: 'relative',
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: 'rgba(255,255,255,0.75)' }}>
              PURCHASE ORDER
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 20, fontWeight: '800', color: colors.white, marginTop: 2 }}>
              {doc.documentNumber}
            </Text>
          </View>
          <View style={{
            backgroundColor: isDelivered ? '#2e7d32' : 'rgba(255,255,255,0.2)',
            borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12,
          }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: '700', color: colors.white }}>
              {STATUS_LABEL[doc.status] ?? doc.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <Svg
          width="100%"
          height={WAVE_HEIGHT}
          viewBox={`0 0 ${WAVE_VIEWBOX_W} ${WAVE_HEIGHT}`}
          preserveAspectRatio="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: -1 }}
        >
          <Path d={wavePath2(-2)} fill="rgba(255,255,255,0.35)" />
          <Path d={wavePath1(3)} fill={colors.white} />
        </Svg>
      </View>

      <View style={{ padding: 20, paddingTop: 4 }}>

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

        {/* Supplier — brand-tinted, matching Modern's tinted callouts */}
        <View style={{
          backgroundColor: `${brandColor}0d`, borderRadius: 10, padding: 14, marginBottom: 20,
          borderWidth: 1, borderColor: `${brandColor}25`,
        }}>
          <Text style={{ fontFamily: 'Inter', fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 }}>
            Supplier
          </Text>
          <Text style={{ fontFamily: 'Inter', fontSize: 16, fontWeight: '800', color: colors.onSurface }}>
            {doc.supplierName || '—'}
          </Text>
        </View>

        {/* Items — brand header row + alternating tinted rows (Modern's table style), plus an image column */}
        <View style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: brandColor, paddingVertical: 8, paddingHorizontal: 10 }}>
            <View style={{ width: THUMB_SIZE }} />
            <Text style={{ flex: 4, fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: colors.white, marginLeft: 10 }}>
              Item
            </Text>
            <Text style={{ flex: 1.2, fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: colors.white, textAlign: 'center' }}>
              Qty
            </Text>
            <Text style={{ flex: 2, fontFamily: 'Inter', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: colors.white, textAlign: 'right' }}>
              Total
            </Text>
          </View>
          {items.map((item, idx) => (
            <View
              key={item.id}
              style={{
                flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10,
                backgroundColor: idx % 2 === 0 ? `${brandColor}0d` : colors.white,
              }}
            >
              <ItemThumb uri={item.productImageUrl} />
              <Text style={{ flex: 4, fontFamily: 'Inter', fontSize: 13, color: colors.onSurface, marginLeft: 10 }}>
                {item.description}
              </Text>
              <Text style={{ flex: 1.2, fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant, textAlign: 'center' }}>
                {Number(item.quantity)}
              </Text>
              <Text style={{ flex: 2, fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.onSurface, textAlign: 'right' }}>
                {formatCurrency(item.total)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals — brand-tinted total row, matching Modern */}
        <View style={{ gap: 4, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 20 }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant }}>Subtotal</Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant, width: 90, textAlign: 'right' }}>
              {formatCurrency(doc.subtotal)}
            </Text>
          </View>
          {Number(doc.taxAmount) > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 20 }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant }}>Tax</Text>
              <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant, width: 90, textAlign: 'right' }}>
                {formatCurrency(doc.taxAmount)}
              </Text>
            </View>
          )}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between',
            backgroundColor: `${brandColor}14`, borderRadius: 6,
            paddingVertical: 8, paddingHorizontal: 10, marginTop: 2,
          }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '800', color: brandColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total
            </Text>
            <Text style={{ fontFamily: 'Inter', fontSize: 15, fontWeight: '800', color: brandColor }}>
              {formatCurrency(doc.grandTotal)}
            </Text>
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