// components/receipt-templates/pdf/classicHtml.ts
//
// HTML twin of ClassicTemplate.tsx, built for expo-print's
// Print.printToFileAsync({ html }) instead of a screenshot. Layout,
// spacing and colors mirror the RN component as closely as HTML/CSS
// allows; see htmlShared.ts for the page-break rules that make this
// worth doing over the old screenshot-in-an-<img> approach.

import { resolveCurrency } from '@/utils/currencySymbol';
import { BusinessProfile } from '../../../services/business';
import { Document, DocumentType } from '../../../services/documents';
import { amountToWords, escapeHtml, makeCurrencyFormatter, PAGE_CSS } from './htmlShared';

const TYPE_LABEL: Record<DocumentType, string> = {
  sales_invoice: 'Sales Invoice',
  proforma_invoice: 'Proforma Invoice',
  purchase_invoice: 'Supplier Order',
};

export function buildClassicHtml(doc: Document, business: BusinessProfile): string {
  const resolvedCurrency = resolveCurrency(doc.currency || business.currency);
  const currencyName = resolvedCurrency.name;
  const formatCurrency = makeCurrencyFormatter(resolvedCurrency.symbol);
  const amountInWords = amountToWords(Number(doc.grandTotal), currencyName);
  const billedToName = doc.customerName || doc.supplierName;
  const items = doc.items ?? [];

  const itemRows = items
    .map(
      (item, idx) => `
      <tr style="border-bottom:${idx < items.length - 1 ? '1px solid #f1f3f5' : 'none'};">
        <td style="padding:9px 12px; font-size:12px; color:#1a1a1a;">${escapeHtml(item.description)}</td>
        <td style="padding:9px 12px; font-size:12px; color:#5f6368; text-align:right;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding:9px 12px; font-size:12px; color:#5f6368; text-align:right;">${escapeHtml(Number(item.quantity))}</td>
        <td style="padding:9px 12px; font-size:12px; font-weight:700; color:#1a1a1a; text-align:right;">${formatCurrency(item.total)}</td>
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
    <div style="padding:32px;">

      <!-- Header: business info (left) + doc meta (right) -->
      <table style="margin-bottom:32px;">
        <tr>
          <td style="vertical-align:top; width:60%;">
            <table><tr>
              ${business.logoUrl ? `
              <td style="vertical-align:top; padding-right:12px;">
                <img src="${business.logoUrl}" style="width:44px; height:44px; border-radius:10px;" />
              </td>` : ''}
              <td style="vertical-align:top;">
                <div style="font-weight:900; font-size:18px; color:#1a1a1a;">${escapeHtml(business.name)}</div>
                ${business.addressOne ? `<div style="color:#5f6368; font-size:12px; margin-top:4px;">${escapeHtml(business.addressOne)}</div>` : ''}
                ${business.phone ? `<div style="color:#5f6368; font-size:12px; margin-top:2px;">${escapeHtml(business.phone)}</div>` : ''}
                ${business.email ? `<div style="color:#5f6368; font-size:12px; margin-top:2px;">${escapeHtml(business.email)}</div>` : ''}
              </td>
            </tr></table>
          </td>
          <td style="vertical-align:top; text-align:right;">
            <div style="font-size:10px; color:#5f6368; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:2px;">
              ${TYPE_LABEL[doc.documentType]}
            </div>
            <div style="font-size:13px; font-weight:700; color:#1a1a1a; margin-bottom:8px;">
              ${escapeHtml(doc.documentNumber)}
            </div>
            <div style="font-size:10px; color:#5f6368; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:2px;">
              Date
            </div>
            <div style="font-size:13px; font-weight:600; color:#1a1a1a;">
              ${escapeHtml(doc.documentDate)}
            </div>
          </td>
        </tr>
      </table>

      <div style="height:1px; background:#e9ecef; margin-bottom:24px;"></div>

      <!-- Billed To -->
      ${billedToName ? `
      <div class="avoid-break" style="margin-bottom:24px;">
        <div style="font-size:10px; color:#5f6368; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:4px;">Bill To</div>
        <div style="font-size:14px; font-weight:700; color:#1a1a1a;">${escapeHtml(billedToName)}</div>
        ${doc.customerPhone ? `<div style="font-size:12px; color:#5f6368; margin-top:1px;">${escapeHtml(doc.customerPhone)}</div>` : ''}
        ${doc.customerEmail ? `<div style="font-size:12px; color:#5f6368;">${escapeHtml(doc.customerEmail)}</div>` : ''}
      </div>` : ''}

      <!-- Items table — thead repeats per page, each tbody row is break-safe -->
      <table style="border:1px solid #e9ecef; border-radius:6px; margin-bottom:24px; overflow:hidden;">
        <thead>
          <tr style="background:#f8f9fa; border-bottom:1px solid #e9ecef;">
            <th style="padding:8px 12px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; text-align:left;">Description</th>
            <th style="padding:8px 12px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; text-align:right;">Rate</th>
            <th style="padding:8px 12px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; text-align:right;">Qty</th>
            <th style="padding:8px 12px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <!-- Notes + Totals — kept together as one unit -->
      <table class="avoid-break" style="margin-bottom:24px;">
        <tr>
          <td style="width:50%; vertical-align:top; padding-right:20px;">
            ${doc.notes ? `
            <div style="padding:12px; border-radius:6px; border:1px solid #e9ecef; background:#f8f9fa;">
              <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:#1a1a1a; margin-bottom:4px;">
                Notes/Payment Info
              </div>
              <div style="font-size:12px; color:#1a1a1a; line-height:17px;">${escapeHtml(doc.notes)}</div>
            </div>` : ''}
          </td>
          <td style="width:240px; vertical-align:top;">
            <table style="width:100%;">
              <tr>
                <td style="font-size:11px; color:#5f6368; text-transform:uppercase; letter-spacing:0.5px; padding-bottom:6px;">Subtotal</td>
                <td style="font-size:12px; color:#1a1a1a; text-align:right; padding-bottom:6px;">${formatCurrency(doc.subtotal)}</td>
              </tr>
              ${Number(doc.taxAmount) > 0 ? `
              <tr>
                <td style="font-size:11px; color:#5f6368; text-transform:uppercase; letter-spacing:0.5px; padding-bottom:6px;">
                  Tax (${(Number(doc.taxRate) * 100).toFixed(0)}%)
                </td>
                <td style="font-size:12px; color:#1a1a1a; text-align:right; padding-bottom:6px;">${formatCurrency(doc.taxAmount)}</td>
              </tr>` : ''}
              ${Number(doc.discount) > 0 ? `
              <tr>
                <td style="font-size:11px; color:#d32f2f; text-transform:uppercase; letter-spacing:0.5px; padding-bottom:6px;">Discount</td>
                <td style="font-size:12px; color:#d32f2f; text-align:right; padding-bottom:6px;">-${formatCurrency(doc.discount)}</td>
              </tr>` : ''}
              <tr><td colspan="2" style="border-top:1px solid #e9ecef; padding-top:6px;"></td></tr>
              <tr>
                <td style="font-size:13px; font-weight:800; color:#1a1a1a; text-transform:uppercase; letter-spacing:0.5px;">Total</td>
                <td style="font-size:14px; font-weight:800; color:#1a1a1a; text-align:right;">${formatCurrency(doc.grandTotal)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Amount in words -->
      <div class="avoid-break" style="padding:10px; background:#f8f9fa; border-radius:6px; border:1px solid #e9ecef;">
        <div style="font-size:10px; font-weight:700; color:#5f6368; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">
          Amount in Words
        </div>
        <div style="font-size:11px; font-style:italic; color:#1a1a1a;">${escapeHtml(amountInWords)}</div>
      </div>

    </div>
  </body>
</html>`;
}