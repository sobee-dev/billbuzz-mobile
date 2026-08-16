// components/receipt-templates/ModernTemplate.tsx
import { resolveCurrency } from '@/utils/currencySymbol';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Text, View, } from 'react-native';
import { ReceiptTemplateProps } from './index';

// TODO: supply real implementations — these produced the "Amount in Words"
// line on the web template and aren't available in this codebase yet.

// (currency name resolution below IS implemented — only the words-from-
// number conversion itself is still a stub.)
function numberToWords(amount: number, currencyName: string): string {
  return `${currencyName} amount-in-words not yet implemented`;
}


export function ModernTemplate({ doc, business }: ReceiptTemplateProps) {
  console.log('logoUrl:', business.logoUrl);
  const brandColorOne = business.brandColorOne || '#d3aeae';
  
// Prefer the document's own currency (what it was actually issued in)
// over the business's current default, which may have changed since.
  const resolvedCurrency = resolveCurrency(doc.currency || business.currency);
  const currencySymbol = resolvedCurrency.symbol;
  const currencyName = resolvedCurrency.name;
  const amountInWords = numberToWords(Number(doc.grandTotal), currencyName);
  const isPaid = doc.status === 'paid';

  // Web version auto-shrinks the business name to fit one line via
  // scrollWidth/offsetWidth measurement — no RN equivalent for that DOM
  // API. This is a fixed responsive size instead; revisit if long
  // business names actually wrap awkwardly in practice.
  const [nameFontSize] = useState(32);

  const formatCurrency = (amount: number | string | undefined | null) => {
    const n = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    const safe = typeof n === 'number' && !isNaN(n) ? n : 0;
    return `${currencySymbol} ${safe.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
      })}`;
      };

  return (
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
          <View className="w-full items-center z-10">
            <Text
              className="font-black uppercase tracking-tighter text-center"
              style={{ color: brandColorOne, fontSize: nameFontSize, lineHeight: nameFontSize * 1.0 }}
              numberOfLines={1}
              adjustsFontSizeToFit
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
          className="flex-row justify-between items-center mb-2 pb-1.5 border-b"
          style={{ borderColor: brandColorOne }}
        >
          <View>
            <Text className="text-xs text-gray-400 uppercase tracking-wider">head office</Text>
            <Text className="mb-1 font-semibold text-gray-800">{business.addressOne}</Text>
            <Text className="text-xs text-gray-400 uppercase tracking-wider">date</Text>
            <Text className="font-semibold text-gray-800">{doc.documentDate}</Text>
          </View>

          <View className="p-2 rounded-xl" style={{ backgroundColor: `${brandColorOne}08` }}>
            <Text className="text-sm p-1.5 font-bold text-center" style={{ fontFamily: 'monospace' }}>
              Sales Invoice
            </Text>
            <Text className="text-sm rounded-2xl text-center p-1.5 font-bold" style={{ fontFamily: 'monospace' }}>
              {doc.documentNumber}
            </Text>
          </View>

          <View className="items-end">
            {business.addressTwo ? (
              <>
                <Text className="text-xs text-gray-400 uppercase tracking-wider">branch office</Text>
                <Text className="font-semibold text-gray-800">{business.addressTwo}</Text>
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
            {business.signatureType === 'image' && business.signatureUrl ? (
              <Image
                source={{ uri: business.signatureUrl }}
                style={{ maxHeight: 48, width: 120 }}
                contentFit="contain"
              />
            ) : business.signatureType === 'text' && business.signatureText ? (
              <Text className="text-2xl italic text-gray-700 tracking-tight" style={{ fontFamily: 'serif' }}>
                {business.signatureText}
              </Text>
            ) : (
              <Text className="text-2xl italic text-gray-700 tracking-tight" style={{ fontFamily: 'serif' }}>
                {business.name}
              </Text>
            )}
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
  );
}