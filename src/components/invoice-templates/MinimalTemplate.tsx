
import { resolveCurrency } from '@/utils/currencySymbol';
import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { LayoutChangeEvent, Text, View } from 'react-native';
import { DocumentType } from '../../services/documents';
import { ReceiptTemplateProps } from './index';
// ─── A4 reference canvas ───────────────────────────────────────────────────
// The whole template is laid out at a fixed A4-width reference (595pt — the
// same width most PDF engines, including expo-print, use for A4 at 72dpi)
// so spacing, font sizes and proportions always match a real printed A4
// page. A4ScaledPage below then scales that fixed-width canvas down (or up)
// to fit whatever width the screen actually gives it, so on a small phone
// it still reads like a properly proportioned invoice rather than a
// zoomed-in crop, and the screenshot captured for PDF/image export keeps
// A4 proportions regardless of device.
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

/**
 * Converts a monetary amount into words, e.g. 1234.5 -> "One Thousand Two
 * Hundred Thirty-Four Naira and 50/100 Only". Uses the "and XX/100"
 * convention for the minor unit, the same one used on a bank cheque,
 * rather than guessing a subunit name (cents, kobo, pence...) per
 * currency, since that data isn't available here. This stays accurate
 * for any currency without needing a lookup table.
 */
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
// Renders children at the fixed A4_WIDTH reference, measures the natural
// height that produces, then scales the whole thing to fit whatever width
// it's actually given, anchored to the top-left corner (RN scales from
// center by default, so the translate offsets below correct for that).
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
  sales_invoice:    'Sales Invoice',
  proforma_invoice: 'Proforma Invoice',
  purchase_invoice: 'Supplier Order',
};

export function MinimalTemplate({ doc, business }: ReceiptTemplateProps) {
  const brandColorOne = business.brandColorOne || '#d3aeae';

  // Prefer the document's own currency (what it was actually issued in)
  // over the business's current default, which may have changed since.
  const resolvedCurrency = resolveCurrency(doc.currency || business.currency);
  const currencySymbol = resolvedCurrency.symbol;
  const currencyName = resolvedCurrency.name;
  const amountInWords = amountToWords(Number(doc.grandTotal), currencyName);
  const isPaid = doc.status === 'paid';

  

  const businessNameLength = (business.name ?? '').length;
  const nameFontSize =
    businessNameLength > 32 ? 18 :
    businessNameLength > 24 ? 22 :
    businessNameLength > 16 ? 26 :
    32;

  const formatCurrency = (amount: number | string | undefined | null) => {
    const n = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    const safe = typeof n === 'number' && !isNaN(n) ? n : 0;
    return `${currencySymbol} ${safe.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const hasSignatureImage = business.signatureType === 'image' && !!business.signatureUrl;
  const hasSignatureText = business.signatureType === 'text' && !!business.signatureText;

  return (
    <A4ScaledPage>
      <View className="bg-white rounded-xl overflow-hidden">

        <View className="px-4 py-2">

          {/* ── Header: logo + business name ── */}
          <View className="relative w-full py-3 flex-row items-center px-2">
            {business.logoUrl && (
              <View className="absolute left-4 z-10">
                <Image
                  source={{ uri: business.logoUrl }}
                  style={{ height: 56, width: 56 }}
                  contentFit="contain"
                />
              </View>
            )}
            <View
              className="w-full items-center z-10"
              style={{ paddingHorizontal: business.logoUrl ? 76 : 12 }}
            >
              <Text
                className="font-black uppercase tracking-tighter text-center"
                style={{ color: brandColorOne, fontSize: nameFontSize, lineHeight: nameFontSize * 1.15 }}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {business.name}
              </Text>
            </View>
          </View>

          {business.description ? (
            <Text className="text-sm mb-4 text-center font-bold" style={{ fontFamily: 'monospace' }}>
              {business.description}
            </Text>
          ) : null}

          {/* ── Head office / doc type / branch office row ── */}
          <View
            className="flex-row items-start mb-2 pb-1.5 border-b"
            style={{ borderColor: brandColorOne }}
          >
            <View style={{ flex: 4 }}>
              <Text className="text-xs text-gray-400 uppercase tracking-wider">head office</Text>
              <Text className="mb-1 font-semibold text-gray-800" numberOfLines={3} ellipsizeMode="tail">
                {business.addressOne}
              </Text>
              <Text className="text-xs text-gray-400 uppercase tracking-wider">date</Text>
              <Text className="font-semibold text-gray-800">{doc.documentDate}</Text>
            </View>

            <View style={{ flex: 3 }} className="items-center px-1">
              <View className="p-2 rounded-xl" style={{ backgroundColor: `${brandColorOne}08` }}>
                <Text
                  className="text-sm p-1.5 font-bold text-center"
                  style={{ fontFamily: 'monospace' }}
                  numberOfLines={2}
                >
                  {TYPE_LABEL[doc.documentType]}
                </Text>
                <Text className="text-sm rounded-2xl text-center p-1.5 font-bold" style={{ fontFamily: 'monospace' }}>
                  {doc.documentNumber}
                </Text>
              </View>
            </View>

            <View style={{ flex: 4 }} className="items-end">
              {business.addressTwo ? (
                <>
                  <Text className="text-xs text-gray-400 uppercase tracking-wider">branch office</Text>
                  <Text
                    className="font-semibold text-gray-800 text-right"
                    numberOfLines={3}
                    ellipsizeMode="tail"
                  >
                    {business.addressTwo}
                  </Text>
                </>
              ) : null}
              <Text className="text-xs text-gray-600 uppercase tracking-wider">Business Contact</Text>
              <Text className="text-sm text-gray-800">{business.phone}</Text>
            </View>
          </View>

        </View>

        <View className="p-6">

          {/* ── Customer ── */}
          <View className="mb-5">
            <Text className="text-xs text-gray-400 uppercase tracking-wider mb-1.5">Billed To</Text>
            <Text className="text-lg font-bold text-gray-900">
              {doc.customerName || doc.supplierName}
            </Text>
            {doc.customerPhone ? <Text className="text-gray-600">{doc.customerPhone}</Text> : null}
            {doc.customerEmail ? <Text className="text-gray-600">{doc.customerEmail}</Text> : null}
          </View>

          {/* ── Items ── */}
          <View className="mb-5">
            <View className="rounded-xl" style={{ backgroundColor: `${brandColorOne}08` }}>

              <View className="flex-row px-4 py-2.5 border-b border-gray-200">
                <Text className="flex-[5] text-xs text-gray-500 uppercase tracking-wider font-medium">Item</Text>
                <Text className="flex-[2] text-xs text-gray-500 uppercase tracking-wider font-medium text-center">Qty</Text>
                <Text className="flex-[2] text-xs text-gray-500 uppercase tracking-wider font-medium text-right">Price</Text>
                <Text className="flex-[3] text-xs text-gray-500 uppercase tracking-wider font-medium text-right">Total</Text>
              </View>

              {(doc.items ?? []).map((item, idx) => (
                <View
                  key={item.id}
                  className={`flex-row px-4 py-2 text-sm ${idx < (doc.items?.length ?? 0) - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <Text className="flex-[5] text-sm font-medium text-gray-900">{item.description}</Text>
                  <Text className="flex-[2] text-sm text-gray-600 text-center">{Number(item.quantity)}</Text>
                  <Text className="flex-[2] text-sm text-gray-600 text-right">{formatCurrency(item.unitPrice)}</Text>
                  <Text className="flex-[3] text-sm font-semibold text-gray-900 text-right">{formatCurrency(item.total)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Totals ── */}
          <View className="items-end mb-2">
            <View style={{ width: 288 }} className="gap-1.5">
              <View className="flex-row justify-between">
                <Text className="text-gray-600 text-sm">Subtotal</Text>
                <Text className="text-gray-600 text-sm">{formatCurrency(doc.subtotal)}</Text>
              </View>
              {Number(doc.taxAmount) > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 text-sm">Tax ({(Number(doc.taxRate) * 100).toFixed(0)}%)</Text>
                  <Text className="text-gray-600 text-sm">{formatCurrency(doc.taxAmount)}</Text>
                </View>
              )}
              {Number(doc.discount) > 0 && (
                <View className="flex-row justify-between">
                  <Text className="text-red-500 text-sm">Discount</Text>
                  <Text className="text-red-500 text-sm">-{formatCurrency(doc.discount)}</Text>
                </View>
              )}
              <View className="flex-row justify-between pt-3 border-t border-gray-200">
                <Text className="text-xl font-bold" style={{ color: brandColorOne }}>Total</Text>
                <Text className="text-xl font-bold" style={{ color: brandColorOne }}>{formatCurrency(doc.grandTotal)}</Text>
              </View>
            </View>
          </View>

          {/* ── Amount in words ── */}
          <View
            className="mb-4 ml-auto border-t items-end"
            style={{ width: '50%', borderColor: brandColorOne, backgroundColor: `${brandColorOne}07`, borderStyle: 'dashed' }}
          >
            <Text className="text-sm font-bold text-gray-800 uppercase mb-0.5 text-right">Amount in words</Text>
            <Text className="text-xs font-medium text-gray-600 italic text-right" style={{ fontStyle: 'italic' }}>
              {amountInWords}
            </Text>
          </View>

          {/* ── Notes ── */}
          {doc.notes ? (
            <View
              className="p-3 rounded-xl border"
              style={{ borderColor: brandColorOne, backgroundColor: `${brandColorOne}08` }}
            >
              <Text className="text-xs uppercase tracking-wider font-medium mb-1" style={{ color: brandColorOne }}>
                Notes
              </Text>
              <Text className="text-sm text-gray-800">{doc.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Signature ── */}
        <View className="mt-3 px-6 pb-6 items-end">
          <View style={{ width: 224 }} className="items-center">
            <View className="mb-1 items-center justify-end" style={{ minHeight: 40 }}>
              {hasSignatureImage ? (
                <Image
                  source={{ uri: business.signatureUrl! }}
                  style={{ maxHeight: 48, width: 120 }}
                  contentFit="contain"
                />
              ) : hasSignatureText ? (
                <Text className="text-2xl italic text-gray-700 tracking-tight" style={{ fontFamily: 'serif' }}>
                  {business.signatureText}
                </Text>
              ) : null /* no signature set — leave the space blank */}
            </View>
            <View className="border-t border-gray-400 pt-1 items-center">
              <Text className="text-xs text-gray-500 uppercase tracking-widest font-bold">
                Authorized Signature
              </Text>
              <Text className="text-[10px] text-gray-400 mt-1 uppercase italic">
                {business.name}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Footer ── */}
        <View
          className="px-8 py-3 items-center border-t-4"
          style={{ backgroundColor: `${brandColorOne}15`, borderColor: brandColorOne }}
        >
          <Text className="text-sm text-gray-500">Thank you for choosing {business.name}!</Text>
          {business.registrationNumber ? (
            <Text className="text-xs text-gray-400 mt-1">Reg. No: {business.registrationNumber}</Text>
          ) : null}
        </View>

      </View>
    </A4ScaledPage>
  );
}