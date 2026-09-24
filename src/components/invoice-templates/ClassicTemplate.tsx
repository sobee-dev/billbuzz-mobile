// components/receipt-templates/ClassicTemplate.tsx
import { resolveCurrency } from '@/utils/currencySymbol';
import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import { DocumentType } from '../../services/documents';
import { colors } from '../../styles/globals';
import { ReceiptTemplateProps } from './index';

// ─── A4 reference canvas ───────────────────────────────────────────────────
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
  if (minor === 100) {
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

const TYPE_LABEL: Record<DocumentType, string> = {
  sales_invoice: 'Sales Invoice',
  proforma_invoice: 'Proforma Invoice',
  purchase_invoice: 'Supplier Order',
};

export function ClassicTemplate({ doc, business }: ReceiptTemplateProps) {
  // Prefer the document's own currency over the business's current default
  const resolvedCurrency = resolveCurrency(doc.currency || business.currency);
  const currencySymbol = resolvedCurrency.symbol;
  const currencyName = resolvedCurrency.name;
  const currencyCode = (doc.currency || business.currency || '').toUpperCase();
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

  return (
    <A4ScaledPage>
      <View style={{ backgroundColor: colors.white, padding: 32 }}>
        
        {/* ── Header: Business Info (Left) + Document Meta Stack (Right) ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 16 }}>
            {business.logoUrl ? (
              <Image
                source={{ uri: business.logoUrl }}
                style={{
                  width: 44, height: 44, borderRadius: 10, marginRight: 12,
                  backgroundColor: '#f1f3f5',
                }}
                contentFit="contain"
              />
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.onSurface, fontWeight: '900', fontSize: 18 }} numberOfLines={2}>
                {business.name}
              </Text>
              {business.addressOne ? (
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 4 }}>
                  {business.addressOne}
                </Text>
              ) : null}
              {business.phone ? (
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                  {business.phone}
                </Text>
              ) : null}
              {business.email ? (
                <Text style={{ color: colors.onSurfaceVariant, fontSize: 12, marginTop: 2 }}>
                  {business.email}
                </Text>
              ) : null}
            </View>
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
          </View>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: '#e9ecef', marginBottom: 24 }} />

        {/* ── Billed To Section ── */}
        <View style={{ marginBottom: 24 }}>
          {billedToName ? (
            <>
              <Text style={{ fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
                Bill To
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

        {/* ── Items Table ── */}
        <View style={{ borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#e9ecef', marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', backgroundColor: '#f8f9fa', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#e9ecef' }}>
            <Text style={{ flex: 5, fontSize: 10, fontWeight: '700', color: colors.onSurface, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Description
            </Text>
            <Text style={{ flex: 2, fontSize: 10, fontWeight: '700', color: colors.onSurface, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>
              Rate
            </Text>
            <Text style={{ flex: 1.5, fontSize: 10, fontWeight: '700', color: colors.onSurface, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>
              Qty
            </Text>
            <Text style={{ flex: 2, fontSize: 10, fontWeight: '700', color: colors.onSurface, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>
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
                backgroundColor: colors.white,
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

        {/* ── Notes (Payment Info) + Totals Row ── */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24, gap: 20 }}>
          <View style={{ flex: 1 }}>
            {doc.notes ? (
              <View style={{ padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#e9ecef', backgroundColor: '#f8f9fa' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.onSurface, marginBottom: 4 }}>
                  Notes/Payment Info
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
            <View style={{ height: 1, backgroundColor: '#e9ecef', marginVertical: 6 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: colors.onSurface, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Total
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.onSurface }}>
                {formatCurrency(doc.grandTotal)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Amount in Words Section ── */}
        <View style={{ marginTop: 8, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 6, borderWidth: 1, borderColor: '#e9ecef' }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
            Amount in Words
          </Text>
          <Text style={{ fontSize: 11, fontStyle: 'italic', color: colors.onSurface }}>
            {amountInWords}
          </Text>
        </View>

      </View>
    </A4ScaledPage>
  );
}