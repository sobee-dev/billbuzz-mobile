// components/receipt-templates/ProfessionalTemplate.tsx
import { resolveCurrency } from '@/utils/currencySymbol';
import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DocumentType } from '../../services/documents';
import { colors } from '../../styles/globals';
import { ReceiptTemplateProps } from './index';

// ─── A4 reference canvas ───────────────────────────────────────────────────
// Same convention as every other template: lay out at a fixed A4-width
// reference (595pt — matching expo-print's A4 @72dpi) so proportions stay
// correct on any device, then scale to whatever width it's actually given.
const A4_WIDTH = 595;

// ─── Amount in words ────────────────────────────────────────────────────────
const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const SCALES = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

function threeDigitsToWords(n: number): string {
  let str = '';
  if (n >= 100) {
    str += `${ONES[Math.floor(n / 100)]} Hundred`;
    n %= 100;
    if (n > 0) str += ' ';
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)];
    if (n % 10 > 0) str += `-${ONES[n % 10]}`;
  } else if (n > 0) {
    str += ONES[n];
  }
  return str;
}

function integerToWords(n: number): string {
  if (n === 0) return 'Zero';
  const groups: number[] = [];
  let num = n;
  while (num > 0) {
    groups.push(num % 1000);
    num = Math.floor(num / 1000);
  }
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    const groupWords = threeDigitsToWords(groups[i]);
    parts.push(i > 0 ? `${groupWords} ${SCALES[i]}` : groupWords);
  }
  return parts.join(' ');
}

function amountToWords(amount: number, currencyName: string): string {
  const safeAmount = Number.isFinite(amount) ? Math.abs(amount) : 0;
  let major = Math.floor(safeAmount);
  let minor = Math.round((safeAmount - major) * 100);
  if (minor === 100) { // floating-point edge case, e.g. 19.995 rounding up
    minor = 0;
    major += 1;
  }
  const minorStr = String(minor).padStart(2, '0');
  return `${integerToWords(major)} ${currencyName} and ${minorStr} Only`;
}

// ─── Responsive A4-scaled wrapper ──────────────────────────────────────────
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

// ─── Diagonal ribbon banner (header/footer accent) ─────────────────────────
// A solid block that tapers into three progressively fainter diagonal
// stripes — the "cut ribbon" accent from the reference design, at the top
// and bottom of the page. `flipped` mirrors it horizontally, which is what
// turns the header version (solid-left, fading-right) into the footer
// version (fading-left, solid-right).
function DiagonalBanner({
  color, height, flipped = false,
}: { color: string; height: number; flipped?: boolean }) {
  const solidEnd = A4_WIDTH * 0.58;
  const stripeW = 26;
  const gap = 10;
  const skew = height * 1.3;

  const stripes = [0, 1, 2].map(i => {
    const x = solidEnd + i * (stripeW + gap);
    return `M${x},0 L${x + stripeW},0 L${x + stripeW - skew},${height} L${x - skew},${height} Z`;
  });

  return (
    <Svg
      width={A4_WIDTH}
      height={height}
      viewBox={`0 0 ${A4_WIDTH} ${height}`}
      style={flipped ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      <Path d={`M0,0 L${solidEnd},0 L${solidEnd - skew},${height} L0,${height} Z`} fill={color} />
      {stripes.map((d, i) => (
        <Path key={i} d={d} fill={color} opacity={1 - (i + 1) * 0.28} />
      ))}
    </Svg>
  );
}

// ─── Faint logo watermark — sits behind Bill To, items, notes, totals,
// amount-in-words, signature and footer. Deliberately NOT behind the
// header (business name/address) block above it, which lives outside
// this wrapper. ──────────────────────────────────────────────────────
function BodyWatermark({ logoUrl }: { logoUrl?: string }) {
  if (!logoUrl) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}
    >
      <Image
        source={{ uri: logoUrl }}
        style={{ width: 380, height: 380, opacity: 0.055 }}
        contentFit="contain"
      />
    </View>
  );
}

const TYPE_LABEL: Record<DocumentType, string> = {
  sales_invoice:    'Sales Invoice',
  proforma_invoice: 'Proforma Invoice',
  purchase_invoice: 'Supplier Order',
};

export function ProfessionalTemplate({ doc, business }: ReceiptTemplateProps) {
  const brandColor = business.brandColorOne || '#d3aeae';

  // Prefer the document's own currency over the business's current
  // default, same convention as every other template.
  const resolvedCurrency = resolveCurrency(doc.currency || business.currency);
  const currencySymbol = resolvedCurrency.symbol;
  const currencyName = resolvedCurrency.name;
  const amountInWords = amountToWords(Number(doc.grandTotal), currencyName);

  const formatCurrency = (amount: number | string | undefined | null) => {
    const n = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    const safe = typeof n === 'number' && !isNaN(n) ? n : 0;
    return `${currencySymbol} ${safe.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const billedToName = doc.customerName || doc.supplierName;
  const items = doc.items ?? [];

  const hasSignatureImage = business.signatureType === 'image' && !!business.signatureUrl;
  const hasSignatureText = business.signatureType === 'text' && !!business.signatureText;

  const businessNameLength = (business.name ?? '').length;
  const nameFontSize =
    businessNameLength > 32 ? 16 :
    businessNameLength > 24 ? 18 :
    businessNameLength > 16 ? 20 :
    22;

  return (
    <A4ScaledPage>
      <View style={{ backgroundColor: colors.white }}>

        {/* ── Header ribbon ── */}
        <DiagonalBanner color={brandColor} height={10} />

        <View style={{ paddingHorizontal: 32, paddingTop: 26 }}>

          {/* ── Logo + business info (left) / doc meta (right) ──
              No "Due" / "Balance Due" here — this app doesn't model a due
              date or a partial-balance concept, so Status (which every
              other template already surfaces) takes that slot instead. */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 16 }}>
              {business.logoUrl ? (
                <Image
                  source={{ uri: business.logoUrl }}
                  style={{ width: 52, height: 52, borderRadius: 8, marginRight: 14, backgroundColor: '#f1f3f5' }}
                  contentFit="contain"
                />
              ) : null}
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontFamily: 'Inter', fontWeight: '800', fontSize: nameFontSize, color: colors.onSurface }}
                  numberOfLines={2}
                >
                  {business.name}
                </Text>
                {business.description ? (
                  <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 4 }}>
                    {business.description}
                  </Text>
                ) : null}
                {business.addressOne ? (
                  <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 4 }}>
                    {business.addressOne}
                  </Text>
                ) : null}
                {business.phone ? (
                  <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 }}>
                    {business.phone}
                  </Text>
                ) : null}
                {business.email ? (
                  <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 }}>
                    {business.email}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'Inter', fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>
                {TYPE_LABEL[doc.documentType]}
              </Text>
              <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.onSurface, marginBottom: 8 }}>
                {doc.documentNumber}
              </Text>

              <Text style={{ fontFamily: 'Inter', fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>
                Date
              </Text>
              <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '600', color: colors.onSurface, marginBottom: 8 }}>
                {doc.documentDate}
              </Text>

              <Text style={{ fontFamily: 'Inter', fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>
                Status
              </Text>
              <Text style={{ fontFamily: 'Inter', fontSize: 13, fontWeight: '700', color: colors.onSurface, textTransform: 'capitalize' }}>
                {doc.status}
              </Text>
            </View>
          </View>

          {/* ── Watermarked body — everything from Bill To through the
              footer note sits inside this relatively-positioned wrapper,
              with the logo watermark absolutely filling it behind
              everything else. Deliberately starts here, after the
              header block above (business name/address), so the
              watermark never appears behind those. Section backgrounds
              below are left transparent/tinted (not solid white) so the
              watermark reads through, not just in the gaps. ── */}
          <View style={{ position: 'relative' }}>
            <BodyWatermark logoUrl={business.logoUrl} />

          {/* ── Bill To ── */}
          <View style={{ marginBottom: 22 }}>
            {billedToName ? (
              <>
                <Text style={{ fontFamily: 'Inter', fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
                  Bill To
                </Text>
                <Text style={{ fontFamily: 'Inter', fontSize: 14, fontWeight: '700', color: colors.onSurface }}>
                  {billedToName}
                </Text>
                {doc.customerPhone ? (
                  <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant, marginTop: 1 }}>
                    {doc.customerPhone}
                  </Text>
                ) : null}
                {doc.customerEmail ? (
                  <Text style={{ fontFamily: 'Inter', fontSize: 12, color: colors.onSurfaceVariant }}>
                    {doc.customerEmail}
                  </Text>
                ) : null}
              </>
            ) : null}
          </View>

          {/* ── Items table — brand-colour header row. Row backgrounds are
              left transparent (not solid white) so the watermark reads
              through every row, not just the gaps between them. ── */}
          <View style={{ marginBottom: 24 }}>
            <View style={{ borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#e9ecef' }}>
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

              {items.map((item, idx) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 12,
                    borderBottomWidth: idx < (items.length - 1) ? 1 : 0,
                    borderBottomColor: '#f1f3f5',
                    backgroundColor: 'transparent',
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
          </View>

          {/* ── Notes (Payment Info) + Totals ── */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24, gap: 20 }}>
            <View style={{ flex: 1 }}>
              {doc.notes ? (
                <View style={{ padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#e9ecef', backgroundColor: 'rgba(248,249,250,0.7)' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.onSurface, marginBottom: 4 }}>
                    Payment Info
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

          {/* ── Amount in Words ── */}
          <View style={{ marginBottom: 24, padding: 10, backgroundColor: 'rgba(248,249,250,0.7)', borderRadius: 6, borderWidth: 1, borderColor: '#e9ecef' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
              Amount in Words
            </Text>
            <Text style={{ fontSize: 11, fontStyle: 'italic', color: colors.onSurface }}>
              {amountInWords}
            </Text>
          </View>

          {/* ── Signature ── */}
          <View style={{ alignItems: 'flex-start', marginBottom: 20 }}>
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
              ) : null /* no signature set — leave the space blank */}
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

          {/* ── Footer note ── */}
          <View style={{ marginBottom: 22 }}>
            <Text style={{ fontFamily: 'Inter', fontSize: 13, color: colors.onSurfaceVariant }}>
              Thank you for your business!
            </Text>
            {business.registrationNumber ? (
              <Text style={{ fontFamily: 'Inter', fontSize: 10, color: colors.onSurfaceVariant, marginTop: 4 }}>
                Reg. No: {business.registrationNumber}
              </Text>
            ) : null}
          </View>

          </View>

        </View>

        {/* ── Footer ribbon (mirrored) ── */}
        <DiagonalBanner color={brandColor} height={16} flipped />
      </View>
    </A4ScaledPage>
  );
}