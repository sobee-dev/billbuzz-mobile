// components/receipt-templates/MinimalTemplate.tsx
import { resolveCurrency } from '@/utils/currencySymbol';
import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DocumentType } from '../../services/documents';
import { colors } from '../../styles/globals';
import { ReceiptTemplateProps } from './index';

// ─── A4 reference canvas ───────────────────────────────────────────────────
// Same convention as ModernTemplate: lay out at a fixed A4-width reference
// (595pt — matching expo-print's A4 @72dpi) so proportions stay correct on
// any device, then scale the whole thing to fit whatever width it's given.
const A4_WIDTH = 595;

function A4ScaledPage({ children }: { children: React.ReactNode }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const scale = containerWidth > 0 ? containerWidth / A4_WIDTH : 1;
  const ready = containerWidth > 0 && contentHeight > 0;

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setContainerWidth(prev => (Math.abs(prev - w) > 0.5 ? w : prev));
  }, []);

  const handleContentLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setContentHeight(prev => (Math.abs(prev - h) > 0.5 ? h : prev));
  }, []);

  return (
    <View style={{ width: '100%' }} onLayout={handleContainerLayout}>
      <View
        style={{
          width: containerWidth || undefined,
          height: ready ? contentHeight * scale : undefined,
          overflow: 'hidden',
        }}
      >
        <View
          onLayout={handleContentLayout}
          style={{
            width: A4_WIDTH,
            opacity: ready ? 1 : 0,
            transform: [
              { translateX: -(A4_WIDTH * (1 - scale)) / 2 },
              { translateY: -(contentHeight * (1 - scale)) / 2 },
              { scale },
            ],
          }}
        >
          {children}
        </View>
      </View>
    </View>
  );
}

// ─── Header wave ────────────────────────────────────────────────────────────
const WAVE_HEIGHT = 50;

function wavePath1(offsetY: number) {
  return (
    `M0,${20 + offsetY} C120,${30 + offsetY} 220,${27 + offsetY} 300,${21 + offsetY} ` +
    `C380,${15 + offsetY} 480,${18 + offsetY} ${A4_WIDTH},${20 + offsetY} ` +
    `L${A4_WIDTH},${WAVE_HEIGHT} L0,${WAVE_HEIGHT} Z`
  );
}

// Inverted control points for the second wave so its curve goes in the opposite direction
function wavePath2(offsetY: number) {
  return (
    `M0,${27 + offsetY} C120,${20 + offsetY} 220,${13 + offsetY} 300,${19 + offsetY} ` +
    `C380,${28 + offsetY} 480,${20 + offsetY} ${A4_WIDTH},${20 + offsetY} ` +
    `L${A4_WIDTH},${WAVE_HEIGHT} L0,${WAVE_HEIGHT} Z`
  );
}

interface HeaderWaveProps {
  brandColor: string;
}

function HeaderWave({ brandColor }: HeaderWaveProps) {
  return (
    <Svg
      width={A4_WIDTH}
      height={WAVE_HEIGHT}
      viewBox={`0 0 ${A4_WIDTH} ${WAVE_HEIGHT}`}
      style={{ position: 'absolute', left: 0, right: 0, bottom: -1 }}
    >
      {/* Lighter wave with opposing curve path using a clear translucent white tint */}
      <Path d={wavePath2(-4)} fill="rgba(255,255,255,0.4)" />
      {/* Main solid white wave on top */}
      <Path d={wavePath1(5)} fill={colors.white} />
    </Svg>
  );
}

const TYPE_LABEL: Record<DocumentType, string> = {
  sales_invoice:    'Sales Invoice',
  proforma_invoice: 'Proforma Invoice',
  purchase_invoice: 'Supplier Order',
};

export function ModernTemplate({ doc, business }: ReceiptTemplateProps) {
  const brandColor = business.brandColorOne || '#d3aeae';

  // Prefer the document's own currency over the business's current
  // default, same convention as ModernTemplate.
  const resolvedCurrency = resolveCurrency(doc.currency || business.currency);
  const currencySymbol = resolvedCurrency.symbol;
  

   const formatCurrency = (amount: number | string | undefined | null) => {
    const n = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    const safe = typeof n === 'number' && !isNaN(n) ? n : 0;
    return `${currencySymbol} ${safe.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const billedToName = doc.customerName || doc.supplierName;

  const hasSignatureImage = business.signatureType === 'image' && !!business.signatureUrl;
  const hasSignatureText = business.signatureType === 'text' && !!business.signatureText;

  // Same responsive-size logic as ModernTemplate — a long business name
  // steps the font size down so it never wraps awkwardly or overflows the
  // header row, just scaled to Minimal's smaller header footprint.
  const businessNameLength = (business.name ?? '').length;
  const nameFontSize =
    businessNameLength > 32 ? 14 :
    businessNameLength > 24 ? 16 :
    businessNameLength > 16 ? 18 :
    20;

  return (
    <A4ScaledPage>
      <View style={{ backgroundColor: colors.white }}>

        {/* ── Wave header — solid brand color, SVG-curved bottom edge ──
            The wave is rendered last. */}
        <View style={{
          backgroundColor: brandColor,
          paddingTop: 28, paddingHorizontal: 28, paddingBottom: 54,
          overflow: 'hidden', position: 'relative',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 16 }}>
              {business.logoUrl ? (
                <Image
                  source={{ uri: business.logoUrl }}
                  style={{
                    width: 44, height: 44, borderRadius: 10, marginRight: 12,
                    backgroundColor: 'rgba(255,255,255,0.18)',
                  }}
                  contentFit="contain"
                />
              ) : null}
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: colors.white, fontWeight: '900', fontSize: nameFontSize }}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {business.name}
                </Text>
                {business.description ? (
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4 }}>
                    {business.description}
                  </Text>
                ) : null}
                {business.phone ? (
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 6 }}>
                    {business.phone}
                  </Text>
                ) : null}
                {business.email ? (
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 }}>
                    {business.email}
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={{ maxWidth: 180 }}>
              {business.addressOne ? (
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, textAlign: 'right' }}>
                  {business.addressOne}
                </Text>
              ) : null}
              {business.addressTwo ? (
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, textAlign: 'right', marginTop: 2 }}>
                  {business.addressTwo}
                </Text>
              ) : null}
            </View>
          </View>

          <HeaderWave brandColor={brandColor} />
        </View>

        <View style={{ paddingHorizontal: 28, paddingTop: 4 }}>

          {/* ── Billed To (left) + Invoice#/Date/Status/Balance stack (right) ──
              One row instead of three separate full-width rows: putting the
              stack beside Billed To (rather than above it) is what closes
              the vertical gap, and it's what puts the invoice number on the
              right, matching a classic invoice header layout. */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              {billedToName ? (
                <>
                  <Text style={{ fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
                    Billed To
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.onSurface }}>
                    {billedToName}
                  </Text>
                  {doc.customerPhone ? (
                    <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginTop: 1 }}>
                      {doc.customerPhone}
                    </Text>
                  ) : null}
                  {doc.customerEmail ? (
                    <Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>
                      {doc.customerEmail}
                    </Text>
                  ) : null}
                </>
              ) : null}
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>
                {TYPE_LABEL[doc.documentType]}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.onSurface, marginBottom: 8 }}>
                {doc.documentNumber}
              </Text>

              <Text style={{ fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>
                Date
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: colors.onSurface, marginBottom: 8 }}>
                {doc.documentDate}
              </Text>

              <Text style={{ fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>
                Status
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.onSurface, textTransform: 'capitalize', marginBottom: 8 }}>
                {doc.status}
              </Text>

             
            </View>
          </View>

          {/* ── Items table — solid brand head, alternating tint/plain rows ── */}
          <View style={{ borderRadius: 6, overflow: 'hidden', marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', backgroundColor: brandColor, paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={{ flex: 5, fontSize: 10, fontWeight: '700', color: colors.white, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Description
              </Text>
              <Text style={{ flex: 2, fontSize: 10, fontWeight: '700', color: colors.white, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>
                Rate
              </Text>
              <Text style={{ flex: 1.5, fontSize: 10, fontWeight: '700', color: colors.white, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>
                Qty
              </Text>
              <Text style={{ flex: 2, fontSize: 10, fontWeight: '700', color: colors.white, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>
                Amount
              </Text>
            </View>

            {(doc.items ?? []).map((item, idx) => (
              <View
                key={item.id}
                style={{
                  flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 12,
                  // one row tinted with the brand color, the next plain — alternating
                  backgroundColor: idx % 2 === 0 ? `${brandColor}14` : colors.white,
                }}
              >
                <Text style={{ flex: 5, fontSize: 12, color: colors.onSurface }}>{item.description}</Text>
                <Text style={{ flex: 2, fontSize: 12, color: colors.onSurfaceVariant, textAlign: 'right' }}>
                  {formatCurrency(item.unitPrice)}
                </Text>
                <Text style={{ flex: 1.5, fontSize: 12, color: colors.onSurfaceVariant, textAlign: 'right' }}>
                  {Number(item.quantity)}
                </Text>
                <Text style={{ flex: 2, fontSize: 12, fontWeight: '700', color: colors.onSurface, textAlign: 'right' }}>
                  {formatCurrency(item.total)}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Notes + Totals — same row, notes on the left, totals on the right ── */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 14, marginBottom: 24, gap: 20 }}>
            <View style={{ flex: 1 }}>
              {doc.notes ? (
                <View style={{
                  padding: 12, borderRadius: 10, borderWidth: 1,
                  borderColor: brandColor, backgroundColor: `${brandColor}08`,
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: brandColor, marginBottom: 4 }}>
                    Notes
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.onSurface, lineHeight: 17 }}>
                    {doc.notes}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={{ width: 240 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 11, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Subtotal
                </Text>
                <Text style={{ fontSize: 12, color: colors.onSurface }}>
                  {formatCurrency(doc.subtotal)}
                </Text>
              </View>
              {Number(doc.taxAmount) > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Tax ({(Number(doc.taxRate) * 100).toFixed(0)}%)
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.onSurface }}>
                    {formatCurrency(doc.taxAmount)}
                  </Text>
                </View>
              )}
              {Number(doc.discount) > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 11, color: colors.error, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Discount
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.error }}>
                    -{formatCurrency(doc.discount)}
                  </Text>
                </View>
              )}
              <View style={{
                flexDirection: 'row', justifyContent: 'space-between',
                backgroundColor: `${brandColor}14`, borderRadius: 6,
                paddingVertical: 8, paddingHorizontal: 10, marginTop: 2,
              }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: brandColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Total
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: brandColor }}>
                  {formatCurrency(doc.grandTotal)}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Signature ──
              Signature mark, then a ruled line with the company name under
              it (same convention as ModernTemplate's "Authorized Signature"
              block) — "Date Signed" is its own line written below that,
              not inside the bordered block. */}
          <View style={{ alignItems: 'flex-start', marginBottom: 14 }}>
            <View style={{ minHeight: 44, justifyContent: 'flex-end', marginBottom: 6 }}>
              {hasSignatureImage ? (
                <Image
                  source={{ uri: business.signatureUrl! }}
                  style={{ height: 48, width: 140 }}
                  contentFit="contain"
                />
              ) : hasSignatureText ? (
                <Text style={{ fontSize: 22, fontStyle: 'italic', color: colors.onSurface }}>
                  {business.signatureText}
                </Text>
              ) : null /* no signature set — leave blank */}
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: '#c9ccd4', paddingTop: 4, minWidth: 160 }}>
              <Text style={{ fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Authorized Signature
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.onSurface, marginTop: 1 }}>
                {business.name}
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'flex-start', marginBottom: 32 }}>
            <Text style={{ fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Date Signed
            </Text>
            <Text style={{ fontSize: 12, color: colors.onSurface, marginTop: 2 }}>
              {doc.documentDate}
            </Text>
          </View>

        </View>
      </View>
    </A4ScaledPage>
  );
}