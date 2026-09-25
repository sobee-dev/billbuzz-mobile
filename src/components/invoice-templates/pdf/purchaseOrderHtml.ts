// components/receipt-templates/pdf/purchaseOrderHtml.ts
//
// HTML twin of PurchaseOrderTemplate.tsx. Same brand-colour wave header,
// tinted alternating item rows, and product-image column as the RN
// version — still no signature block or "thank you" footer, this stays
// an internal receiving document, not a customer-facing receipt.

import { resolveCurrency } from '@/utils/currencySymbol';
import { BusinessProfile } from '../../../services/business';
import { Document } from '../../../services/documents';
import { escapeHtml, makeCurrencyFormatter, PAGE_CSS } from './htmlShared';

const A4_WIDTH = 595;
const WAVE_HEIGHT = 34;

function wavePath1(offsetY: number) {
  return (
    `M0,${13 + offsetY} C120,${21 + offsetY} 220,${18 + offsetY} 300,${14 + offsetY} ` +
    `C380,${10 + offsetY} 480,${12 + offsetY} ${A4_WIDTH},${13 + offsetY} ` +
    `L${A4_WIDTH},${WAVE_HEIGHT} L0,${WAVE_HEIGHT} Z`
  );
}
function wavePath2(offsetY: number) {
  return (
    `M0,${18 + offsetY} C120,${13 + offsetY} 220,${8 + offsetY} 300,${12 + offsetY} ` +
    `C380,${19 + offsetY} 480,${13 + offsetY} ${A4_WIDTH},${13 + offsetY} ` +
    `L${A4_WIDTH},${WAVE_HEIGHT} L0,${WAVE_HEIGHT} Z`
  );
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'DRAFT',
  unpaid: 'PENDING',
  paid: 'PAID',
  delivered: 'DELIVERED',
  deleted: 'CANCELLED',
};

const THUMB_SIZE = 34;

function thumbCell(uri: string | null | undefined): string {
  if (uri) {
    return `<img src="${uri}" style="width:${THUMB_SIZE}px; height:${THUMB_SIZE}px; border-radius:6px; object-fit:cover; background:#f0f0f3;" />`;
  }
  return `<div style="width:${THUMB_SIZE}px; height:${THUMB_SIZE}px; border-radius:6px; background:#f0f0f3; border:1px solid #e5e7eb;"></div>`;
}

export function buildPurchaseOrderHtml(doc: Document, business: BusinessProfile): string {
  const brandColor = business.brandColorOne || '#d3aeae';
  const currencySymbol = resolveCurrency(doc.currency || business.currency).symbol;
  const formatCurrency = makeCurrencyFormatter(currencySymbol);
  const isDelivered = doc.status === 'delivered';
  const items = doc.items ?? [];
  const statusLabel = STATUS_LABEL[doc.status] ?? doc.status.toUpperCase();

  const itemRows = items
    .map(
      (item, idx) => `
      <tr style="background:${idx % 2 === 0 ? `${brandColor}0d` : '#ffffff'};">
        <td style="padding:8px 10px; width:${THUMB_SIZE + 10}px;">${thumbCell(item.productImageUrl)}</td>
        <td style="padding:8px 10px; font-size:13px; color:#1a1a1a;">${escapeHtml(item.description)}</td>
        <td style="padding:8px 10px; font-size:13px; color:#5f6368; text-align:center;">${escapeHtml(Number(item.quantity))}</td>
        <td style="padding:8px 10px; font-size:13px; font-weight:700; color:#1a1a1a; text-align:right;">${formatCurrency(item.total)}</td>
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
    <div style="border-radius:12px; overflow:hidden; border:1px solid #e9ecef;">

      <!-- Header — brand-colour wave, same convention as modernHtml.ts -->
      <div style="position:relative; background:${brandColor}; padding:18px 20px 26px 20px; overflow:hidden;">
        <table style="width:100%;">
          <tr>
            <td style="vertical-align:top;">
              <div style="font-size:11px; font-weight:700; letter-spacing:1.2px; color:rgba(255,255,255,0.75);">PURCHASE ORDER</div>
              <div style="font-size:20px; font-weight:800; color:#ffffff; margin-top:2px;">${escapeHtml(doc.documentNumber)}</div>
            </td>
            <td style="vertical-align:top; text-align:right;">
              <span style="background:${isDelivered ? '#2e7d32' : 'rgba(255,255,255,0.2)'}; border-radius:999px; padding:5px 12px; font-size:11px; font-weight:700; color:#ffffff;">
                ${statusLabel}
              </span>
            </td>
          </tr>
        </table>

        <svg width="${A4_WIDTH}" height="${WAVE_HEIGHT}" viewBox="0 0 ${A4_WIDTH} ${WAVE_HEIGHT}"
             style="position:absolute; left:0; right:0; bottom:-1px;">
          <path d="${wavePath2(-2)}" fill="rgba(255,255,255,0.35)" />
          <path d="${wavePath1(3)}" fill="#ffffff" />
        </svg>
      </div>

      <div style="padding:20px;">

        <table class="avoid-break" style="margin-bottom:20px;">
          <tr>
            <td style="vertical-align:top;">
              <div style="font-size:10px; color:#5f6368; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:3px;">Received By</div>
              <div style="font-size:14px; font-weight:700; color:#1a1a1a;">${escapeHtml(business.name)}</div>
            </td>
            <td style="vertical-align:top; text-align:right;">
              <div style="font-size:10px; color:#5f6368; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:3px;">Date</div>
              <div style="font-size:14px; font-weight:700; color:#1a1a1a;">${escapeHtml(doc.documentDate)}</div>
            </td>
          </tr>
        </table>

        <div class="avoid-break" style="background:${brandColor}0d; border:1px solid ${brandColor}25; border-radius:10px; padding:14px; margin-bottom:20px;">
          <div style="font-size:10px; color:#5f6368; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:3px;">Supplier</div>
          <div style="font-size:16px; font-weight:800; color:#1a1a1a;">${escapeHtml(doc.supplierName || '—')}</div>
        </div>

        <table style="border-radius:8px; overflow:hidden; margin-bottom:16px;">
          <thead>
            <tr style="background:${brandColor};">
              <th style="padding:8px 10px; width:${THUMB_SIZE + 10}px;"></th>
              <th style="padding:8px 10px; font-size:10px; font-weight:700; text-transform:uppercase; color:#ffffff; text-align:left;">Item</th>
              <th style="padding:8px 10px; font-size:10px; font-weight:700; text-transform:uppercase; color:#ffffff; text-align:center;">Qty</th>
              <th style="padding:8px 10px; font-size:10px; font-weight:700; text-transform:uppercase; color:#ffffff; text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <table class="avoid-break" style="margin-bottom:16px;">
          <tr>
            <td style="width:60%;"></td>
            <td style="width:40%;">
              <table style="width:100%;">
                <tr>
                  <td style="font-size:13px; color:#5f6368; padding-bottom:4px;">Subtotal</td>
                  <td style="font-size:13px; color:#5f6368; text-align:right; padding-bottom:4px;">${formatCurrency(doc.subtotal)}</td>
                </tr>
                ${Number(doc.taxAmount) > 0 ? `
                <tr>
                  <td style="font-size:13px; color:#5f6368; padding-bottom:4px;">Tax</td>
                  <td style="font-size:13px; color:#5f6368; text-align:right; padding-bottom:4px;">${formatCurrency(doc.taxAmount)}</td>
                </tr>` : ''}
                <tr>
                  <td style="background:${brandColor}14; border-radius:6px; padding:8px 10px; font-size:14px; font-weight:800; color:${brandColor}; text-transform:uppercase; letter-spacing:0.5px;">Total</td>
                  <td style="background:${brandColor}14; border-radius:6px; padding:8px 10px; font-size:15px; font-weight:800; color:${brandColor}; text-align:right;">${formatCurrency(doc.grandTotal)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${doc.notes ? `
        <div class="avoid-break" style="background:#f5f5f8; border-radius:10px; padding:12px;">
          <div style="font-size:10px; font-weight:700; text-transform:uppercase; color:#5f6368; margin-bottom:4px;">Notes</div>
          <div style="font-size:13px; color:#1a1a1a;">${escapeHtml(doc.notes)}</div>
        </div>` : ''}

        ${isDelivered && doc.deliveredAt ? `
        <div style="font-size:11px; color:#5f6368; margin-top:12px; text-align:center;">
          Marked delivered on ${escapeHtml(new Date(doc.deliveredAt).toLocaleDateString())}
        </div>` : ''}

      </div>
    </div>
  </body>
</html>`;
}