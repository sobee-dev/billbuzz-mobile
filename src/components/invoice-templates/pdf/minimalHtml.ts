// components/receipt-templates/pdf/minimalHtml.ts
//
// HTML twin of MinimalTemplate.tsx. Note: the RN version leans on
// nativewind utility classes and an absolutely-positioned overlapping
// logo; this reproduces the same visual intent in plain CSS rather than
// a 1:1 class translation, since nativewind classes don't carry over.
// Worth a visual compare against the on-screen preview after dropping
// this in, in case of small spacing differences.

import { resolveCurrency } from '@/utils/currencySymbol';
import { BusinessProfile } from '../../../services/business';
import { Document, DocumentType } from '../../../services/documents';
import { amountToWords, escapeHtml, makeCurrencyFormatter, PAGE_CSS } from './htmlShared';

const TYPE_LABEL: Record<DocumentType, string> = {
  sales_invoice: 'Sales Invoice',
  proforma_invoice: 'Proforma Invoice',
  purchase_invoice: 'Supplier Order',
};

export function buildMinimalHtml(doc: Document, business: BusinessProfile): string {
  const brandColor = business.brandColorOne || '#d3aeae';
  const resolvedCurrency = resolveCurrency(doc.currency || business.currency);
  const currencyName = resolvedCurrency.name;
  const formatCurrency = makeCurrencyFormatter(resolvedCurrency.symbol);
  const amountInWords = amountToWords(Number(doc.grandTotal), currencyName);
  const items = doc.items ?? [];

  const businessNameLength = (business.name ?? '').length;
  const nameFontSize =
    businessNameLength > 32 ? 18 :
    businessNameLength > 24 ? 22 :
    businessNameLength > 16 ? 26 :
    32;

  const hasSignatureImage = business.signatureType === 'image' && !!business.signatureUrl;
  const hasSignatureText = business.signatureType === 'text' && !!business.signatureText;

  const itemRows = items
    .map(
      (item, idx) => `
      <tr style="border-bottom:${idx < items.length - 1 ? '1px solid #f1f3f5' : 'none'};">
        <td style="padding:8px 16px; font-size:13px; font-weight:500; color:#111827;">${escapeHtml(item.description)}</td>
        <td style="padding:8px 16px; font-size:13px; color:#4b5563; text-align:center;">${escapeHtml(Number(item.quantity))}</td>
        <td style="padding:8px 16px; font-size:13px; color:#4b5563; text-align:right;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding:8px 16px; font-size:13px; font-weight:600; color:#111827; text-align:right;">${formatCurrency(item.total)}</td>
      </tr>`
    )
    .join('');

  return `
<html>
  <head>
    <meta charset="utf-8" />
    <style>${PAGE_CSS}</style>
  </head>
  <body>
    <div style="padding:8px 16px;">

      <!-- Header: centered business name, logo overlapping on the left -->
      <div style="position:relative; padding:12px 8px; text-align:center;">
        ${business.logoUrl ? `
        <img src="${business.logoUrl}" style="position:absolute; left:16px; top:12px; height:56px; width:56px;" />` : ''}
        <div style="font-weight:900; text-transform:uppercase; letter-spacing:-0.5px; color:${brandColor}; font-size:${nameFontSize}px; line-height:${nameFontSize * 1.15}px; padding:0 ${business.logoUrl ? '76px' : '12px'};">
          ${escapeHtml(business.name)}
        </div>
      </div>

      ${business.description ? `
      <div style="font-size:14px; margin-bottom:16px; text-align:center; font-weight:700; font-family:monospace;">
        ${escapeHtml(business.description)}
      </div>` : ''}

      <!-- Head office / doc type / branch office -->
      <table class="avoid-break" style="margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid ${brandColor};">
        <tr>
          <td style="width:34%; vertical-align:top;">
            <div style="font-size:11px; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px;">Head Office</div>
            <div style="margin-bottom:4px; font-weight:600; color:#1f2937;">${escapeHtml(business.addressOne)}</div>
            <div style="font-size:11px; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px;">Date</div>
            <div style="font-weight:600; color:#1f2937;">${escapeHtml(doc.documentDate)}</div>
          </td>
          <td style="width:32%; vertical-align:top; text-align:center;">
            <div style="display:inline-block; padding:8px; border-radius:12px; background:${brandColor}08;">
              <div style="font-size:14px; padding:6px; font-weight:700; text-align:center; font-family:monospace;">${TYPE_LABEL[doc.documentType]}</div>
              <div style="font-size:14px; text-align:center; padding:6px; font-weight:700; font-family:monospace;">${escapeHtml(doc.documentNumber)}</div>
            </div>
          </td>
          <td style="width:34%; vertical-align:top; text-align:right;">
            ${business.addressTwo ? `
            <div style="font-size:11px; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px;">Branch Office</div>
            <div style="font-weight:600; color:#1f2937;">${escapeHtml(business.addressTwo)}</div>` : ''}
            <div style="font-size:11px; color:#4b5563; text-transform:uppercase; letter-spacing:0.5px;">Business Contact</div>
            <div style="color:#1f2937;">${escapeHtml(business.phone)}</div>
          </td>
        </tr>
      </table>

      <div style="padding:0 8px;">

        <!-- Billed To -->
        <div class="avoid-break" style="margin-bottom:20px;">
          <div style="font-size:11px; color:#9ca3af; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Billed To</div>
          <div style="font-size:17px; font-weight:700; color:#111827;">${escapeHtml(doc.customerName || doc.supplierName)}</div>
          ${doc.customerPhone ? `<div style="color:#4b5563;">${escapeHtml(doc.customerPhone)}</div>` : ''}
          ${doc.customerEmail ? `<div style="color:#4b5563;">${escapeHtml(doc.customerEmail)}</div>` : ''}
        </div>

        <!-- Items -->
        <table style="border-radius:12px; overflow:hidden; margin-bottom:20px; background:${brandColor}08;">
          <thead>
            <tr style="border-bottom:1px solid #e5e7eb;">
              <th style="padding:10px 16px; font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; text-align:left;">Item</th>
              <th style="padding:10px 16px; font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; text-align:center;">Qty</th>
              <th style="padding:10px 16px; font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; text-align:right;">Price</th>
              <th style="padding:10px 16px; font-size:10px; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <!-- Totals -->
        <table class="avoid-break" style="margin-bottom:8px;">
          <tr>
            <td style="width:60%;"></td>
            <td style="width:40%;">
              <table style="width:100%;">
                <tr>
                  <td style="font-size:13px; color:#4b5563; padding-bottom:6px;">Subtotal</td>
                  <td style="font-size:13px; color:#4b5563; text-align:right; padding-bottom:6px;">${formatCurrency(doc.subtotal)}</td>
                </tr>
                ${Number(doc.taxAmount) > 0 ? `
                <tr>
                  <td style="font-size:13px; color:#4b5563; padding-bottom:6px;">Tax (${(Number(doc.taxRate) * 100).toFixed(0)}%)</td>
                  <td style="font-size:13px; color:#4b5563; text-align:right; padding-bottom:6px;">${formatCurrency(doc.taxAmount)}</td>
                </tr>` : ''}
                ${Number(doc.discount) > 0 ? `
                <tr>
                  <td style="font-size:13px; color:#ef4444; padding-bottom:6px;">Discount</td>
                  <td style="font-size:13px; color:#ef4444; text-align:right; padding-bottom:6px;">-${formatCurrency(doc.discount)}</td>
                </tr>` : ''}
                <tr>
                  <td style="font-size:20px; font-weight:700; color:${brandColor}; padding-top:10px; border-top:1px solid #e5e7eb;">Total</td>
                  <td style="font-size:20px; font-weight:700; color:${brandColor}; text-align:right; padding-top:10px; border-top:1px solid #e5e7eb;">${formatCurrency(doc.grandTotal)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Amount in words -->
        <div class="avoid-break" style="width:50%; margin:0 0 16px auto; border-top:1px dashed ${brandColor}; background:${brandColor}07; padding:6px 0; text-align:right;">
          <div style="font-size:13px; font-weight:700; color:#1f2937; text-transform:uppercase; margin-bottom:2px;">Amount in Words</div>
          <div style="font-size:11px; font-weight:500; color:#4b5563; font-style:italic;">${escapeHtml(amountInWords)}</div>
        </div>

        <!-- Notes -->
        ${doc.notes ? `
        <div class="avoid-break" style="padding:12px; border-radius:12px; border:1px solid ${brandColor}; background:${brandColor}08;">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; font-weight:500; color:${brandColor}; margin-bottom:4px;">Notes</div>
          <div style="font-size:13px; color:#1f2937;">${escapeHtml(doc.notes)}</div>
        </div>` : ''}
      </div>

      <!-- Signature -->
      <div class="avoid-break" style="margin-top:12px; padding:0 24px 24px; text-align:right;">
        <div style="display:inline-block; width:224px; text-align:center;">
          <div style="min-height:40px; margin-bottom:4px;">
            ${hasSignatureImage
              ? `<img src="${business.signatureUrl}" style="max-height:48px; width:120px;" />`
              : hasSignatureText
                ? `<div style="font-size:24px; font-style:italic; color:#374151; font-family:serif;">${escapeHtml(business.signatureText)}</div>`
                : ''}
          </div>
          <div style="border-top:1px solid #9ca3af; padding-top:4px;">
            <div style="font-size:11px; color:#6b7280; text-transform:uppercase; letter-spacing:1px; font-weight:700;">Authorized Signature</div>
            <div style="font-size:10px; color:#9ca3af; margin-top:4px; text-transform:uppercase; font-style:italic;">${escapeHtml(business.name)}</div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="avoid-break" style="padding:12px 32px; text-align:center; border-top:4px solid ${brandColor}; background:${brandColor}15;">
        <div style="font-size:13px; color:#6b7280;">Thank you for choosing ${escapeHtml(business.name)}!</div>
        ${business.registrationNumber ? `<div style="font-size:11px; color:#9ca3af; margin-top:4px;">Reg. No: ${escapeHtml(business.registrationNumber)}</div>` : ''}
      </div>

    </div>
  </body>
</html>`;
}