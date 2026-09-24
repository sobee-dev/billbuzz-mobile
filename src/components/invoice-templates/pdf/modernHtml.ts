// components/invoice-templates/pdf/modernHtml.ts

import { resolveCurrency } from '@/utils/currencySymbol';
import { BusinessProfile } from '../../../services/business';
import { Document, DocumentType } from '../../../services/documents';
import { escapeHtml, makeCurrencyFormatter, PAGE_CSS } from './htmlShared';

const A4_WIDTH = 595;
const WAVE_HEIGHT = 50;

function wavePath1(offsetY: number) {
  return (
    `M0,${20 + offsetY} C120,${30 + offsetY} 220,${27 + offsetY} 300,${21 + offsetY} ` +
    `C380,${15 + offsetY} 480,${18 + offsetY} ${A4_WIDTH},${20 + offsetY} ` +
    `L${A4_WIDTH},${WAVE_HEIGHT} L0,${WAVE_HEIGHT} Z`
  );
}

function wavePath2(offsetY: number) {
  return (
    `M0,${27 + offsetY} C120,${20 + offsetY} 220,${13 + offsetY} 300,${19 + offsetY} ` +
    `C380,${28 + offsetY} 480,${20 + offsetY} ${A4_WIDTH},${20 + offsetY} ` +
    `L${A4_WIDTH},${WAVE_HEIGHT} L0,${WAVE_HEIGHT} Z`
  );
}

const TYPE_LABEL: Record<DocumentType, string> = {
  sales_invoice: 'Sales Invoice',
  proforma_invoice: 'Proforma Invoice',
  purchase_invoice: 'Supplier Order',
};

export function buildModernHtml(doc: Document, business: BusinessProfile): string {
  const brandColor = business.brandColorOne || '#d3aeae';
  const resolvedCurrency = resolveCurrency(doc.currency || business.currency);
  const formatCurrency = makeCurrencyFormatter(resolvedCurrency.symbol);
  const billedToName = doc.customerName || doc.supplierName;
  const items = doc.items ?? [];

  const hasSignatureImage = business.signatureType === 'image' && !!business.signatureUrl;
  const hasSignatureText = business.signatureType === 'text' && !!business.signatureText;

  const itemRows = items
    .map(
      (item, idx) => `
      <tr style="background:${idx % 2 === 0 ? `${brandColor}14` : '#ffffff'};">
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

    <!-- Wave header -->
    <div style="position:relative; background:${brandColor}; padding:28px 28px 54px 28px; overflow:hidden;">
      <table style="width:100%;">
        <tr>
          <td style="vertical-align:top;">
            <table><tr>
              ${business.logoUrl ? `
              <td style="vertical-align:top; padding-right:12px;">
                <img src="${business.logoUrl}" style="width:44px; height:44px; border-radius:10px;" />
              </td>` : ''}
              <td style="vertical-align:top;">
                <div style="color:#ffffff; font-weight:900; font-size:18px;">${escapeHtml(business.name)}</div>
                ${business.description ? `<div style="color:rgba(255,255,255,0.85); font-size:12px; margin-top:4px;">${escapeHtml(business.description)}</div>` : ''}
                ${business.phone ? `<div style="color:rgba(255,255,255,0.85); font-size:12px; margin-top:6px;">${escapeHtml(business.phone)}</div>` : ''}
                ${business.email ? `<div style="color:rgba(255,255,255,0.85); font-size:12px; margin-top:2px;">${escapeHtml(business.email)}</div>` : ''}
              </td>
            </tr></table>
          </td>
          <td style="vertical-align:top; text-align:right;">
            <div style="max-width:180px; display:inline-block;">
              ${business.addressOne ? `<div style="color:rgba(255,255,255,0.85); font-size:12px;">${escapeHtml(business.addressOne)}</div>` : ''}
              ${business.addressTwo ? `<div style="color:rgba(255,255,255,0.85); font-size:12px; margin-top:2px;">${escapeHtml(business.addressTwo)}</div>` : ''}
            </div>
          </td>
        </tr>
      </table>

      <svg width="${A4_WIDTH}" height="${WAVE_HEIGHT}" viewBox="0 0 ${A4_WIDTH} ${WAVE_HEIGHT}"
           style="position:absolute; left:0; right:0; bottom:-1px;">
        <path d="${wavePath2(-4)}" fill="rgba(255,255,255,0.4)" />
        <path d="${wavePath1(5)}" fill="#ffffff" />
      </svg>
    </div>

    <div style="padding:4px 28px 0 28px;">

      <!-- Billed To + doc meta -->
      <table class="avoid-break" style="margin-bottom:20px;">
        <tr>
          <td style="vertical-align:top; padding-right:16px;">
            ${billedToName ? `
            <div style="font-size:10px; color:#5f6368; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:4px;">Billed To</div>
            <div style="font-size:14px; font-weight:700; color:#1a1a1a;">${escapeHtml(billedToName)}</div>
            ${doc.customerPhone ? `<div style="font-size:12px; color:#5f6368; margin-top:1px;">${escapeHtml(doc.customerPhone)}</div>` : ''}
            ${doc.customerEmail ? `<div style="font-size:12px; color:#5f6368;">${escapeHtml(doc.customerEmail)}</div>` : ''}
            ` : ''}
          </td>
          <td style="vertical-align:top; text-align:right;">
            <div style="font-size:10px; color:#5f6368; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:2px;">${TYPE_LABEL[doc.documentType]}</div>
            <div style="font-size:13px; font-weight:700; color:#1a1a1a; margin-bottom:8px;">${escapeHtml(doc.documentNumber)}</div>
            <div style="font-size:10px; color:#5f6368; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:2px;">Date</div>
            <div style="font-size:13px; font-weight:600; color:#1a1a1a; margin-bottom:8px;">${escapeHtml(doc.documentDate)}</div>
            <div style="font-size:10px; color:#5f6368; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:2px;">Status</div>
            <div style="font-size:13px; font-weight:700; color:#1a1a1a; text-transform:capitalize;">${escapeHtml(doc.status)}</div>
          </td>
        </tr>
      </table>

      <!-- Items table -->
      <table style="border-radius:6px; overflow:hidden; margin-bottom:4px;">
        <thead>
          <tr style="background:${brandColor};">
            <th style="padding:8px 12px; font-size:10px; font-weight:700; color:#ffffff; text-transform:uppercase; letter-spacing:0.5px; text-align:left;">Description</th>
            <th style="padding:8px 12px; font-size:10px; font-weight:700; color:#ffffff; text-transform:uppercase; letter-spacing:0.5px; text-align:right;">Rate</th>
            <th style="padding:8px 12px; font-size:10px; font-weight:700; color:#ffffff; text-transform:uppercase; letter-spacing:0.5px; text-align:right;">Qty</th>
            <th style="padding:8px 12px; font-size:10px; font-weight:700; color:#ffffff; text-transform:uppercase; letter-spacing:0.5px; text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <!-- Notes + Totals -->
      <table class="avoid-break" style="margin-top:14px; margin-bottom:24px;">
        <tr>
          <td style="width:50%; vertical-align:top; padding-right:20px;">
            ${doc.notes ? `
            <div style="padding:12px; border-radius:10px; border:1px solid ${brandColor}; background:${brandColor}08;">
              <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:${brandColor}; margin-bottom:4px;">Notes</div>
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
                <td style="font-size:11px; color:#5f6368; text-transform:uppercase; letter-spacing:0.5px; padding-bottom:6px;">Tax (${(Number(doc.taxRate) * 100).toFixed(0)}%)</td>
                <td style="font-size:12px; color:#1a1a1a; text-align:right; padding-bottom:6px;">${formatCurrency(doc.taxAmount)}</td>
              </tr>` : ''}
              ${Number(doc.discount) > 0 ? `
              <tr>
                <td style="font-size:11px; color:#d32f2f; text-transform:uppercase; letter-spacing:0.5px; padding-bottom:6px;">Discount</td>
                <td style="font-size:12px; color:#d32f2f; text-align:right; padding-bottom:6px;">-${formatCurrency(doc.discount)}</td>
              </tr>` : ''}
              <tr>
                <td style="background:${brandColor}14; border-radius:6px; padding:8px 10px; font-size:13px; font-weight:800; color:${brandColor}; text-transform:uppercase; letter-spacing:0.5px;">Total</td>
                <td style="background:${brandColor}14; border-radius:6px; padding:8px 10px; font-size:14px; font-weight:800; color:${brandColor}; text-align:right;">${formatCurrency(doc.grandTotal)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Signature -->
      <div class="avoid-break" style="margin-bottom:14px;">
        <div style="min-height:44px; margin-bottom:6px;">
          ${hasSignatureImage
            ? `<img src="${business.signatureUrl}" style="height:48px;" />`
            : hasSignatureText
              ? `<div style="font-size:22px; font-style:italic; color:#1a1a1a;">${escapeHtml(business.signatureText)}</div>`
              : ''}
        </div>
        <div style="border-top:1px solid #c9ccd4; padding-top:4px; min-width:160px; display:inline-block;">
          <div style="font-size:10px; color:#5f6368; text-transform:uppercase; letter-spacing:0.6px;">Authorized Signature</div>
          <div style="font-size:12px; font-weight:700; color:#1a1a1a; margin-top:1px;">${escapeHtml(business.name)}</div>
        </div>
      </div>

      <div class="avoid-break" style="margin-bottom:32px;">
        <div style="font-size:10px; color:#5f6368; text-transform:uppercase; letter-spacing:0.6px;">Date Signed</div>
        <div style="font-size:12px; color:#1a1a1a; margin-top:2px;">${escapeHtml(doc.documentDate)}</div>
      </div>

    </div>
  </body>
</html>`;
}