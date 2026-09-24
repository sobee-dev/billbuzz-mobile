// components/receipt-templates/pdf/purchaseOrderHtml.ts
//
// HTML twin of PurchaseOrderTemplate.tsx. The RN version isn't wrapped
// in A4ScaledPage (it just renders at whatever width the screen gives
// it), but for PDF export it still benefits from the @page A4 sizing in
// PAGE_CSS — that's new behavior versus today (today's single-screenshot
// export had no real page concept at all for this template either).

import { resolveCurrency } from '@/utils/currencySymbol';
import { BusinessProfile } from '../../../services/business';
import { Document } from '../../../services/documents';
import { escapeHtml, makeCurrencyFormatter, PAGE_CSS } from './htmlShared';

const STATUS_LABEL: Record<string, string> = {
  draft: 'DRAFT',
  unpaid: 'PENDING',
  paid: 'PAID',
  delivered: 'DELIVERED',
  deleted: 'CANCELLED',
};

export function buildPurchaseOrderHtml(doc: Document, business: BusinessProfile): string {
  const currencySymbol = resolveCurrency(doc.currency || business.currency).symbol;
  const formatCurrency = makeCurrencyFormatter(currencySymbol);
  const isDelivered = doc.status === 'delivered';
  const items = doc.items ?? [];
  const statusLabel = STATUS_LABEL[doc.status] ?? doc.status.toUpperCase();

  const itemRows = items
    .map(
      (item, idx) => `
      <tr style="border-bottom:${idx < items.length - 1 ? '1px solid #f0f0f3' : 'none'};">
        <td style="padding:10px 0; font-size:13px; color:#1a1a1a;">${escapeHtml(item.description)}</td>
        <td style="padding:10px 0; font-size:13px; color:#5f6368; text-align:center;">${escapeHtml(Number(item.quantity))}</td>
        <td style="padding:10px 0; font-size:13px; font-weight:700; color:#1a1a1a; text-align:right;">${formatCurrency(item.total)}</td>
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

      <table style="width:100%; background:#1b1b1f;">
        <tr>
          <td style="padding:18px 20px;">
            <div style="font-size:11px; font-weight:700; letter-spacing:1.2px; color:rgba(255,255,255,0.6);">PURCHASE ORDER</div>
            <div style="font-size:20px; font-weight:800; color:#ffffff; margin-top:2px;">${escapeHtml(doc.documentNumber)}</div>
          </td>
          <td style="padding:18px 20px; text-align:right;">
            <span style="background:${isDelivered ? '#2e7d32' : 'rgba(255,255,255,0.15)'}; border-radius:999px; padding:5px 12px; font-size:11px; font-weight:700; color:#ffffff;">
              ${statusLabel}
            </span>
          </td>
        </tr>
      </table>

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

        <div class="avoid-break" style="background:#f5f5f8; border-radius:10px; padding:14px; margin-bottom:20px;">
          <div style="font-size:10px; color:#5f6368; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:3px;">Supplier</div>
          <div style="font-size:16px; font-weight:800; color:#1a1a1a;">${escapeHtml(doc.supplierName || '—')}</div>
        </div>

        <table style="margin-bottom:16px;">
          <thead>
            <tr style="border-bottom:1px solid #e9ecef;">
              <th style="padding:8px 0; font-size:10px; font-weight:700; text-transform:uppercase; color:#5f6368; text-align:left;">Item</th>
              <th style="padding:8px 0; font-size:10px; font-weight:700; text-transform:uppercase; color:#5f6368; text-align:center;">Qty</th>
              <th style="padding:8px 0; font-size:10px; font-weight:700; text-transform:uppercase; color:#5f6368; text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <table class="avoid-break" style="margin-bottom:16px;">
          <tr>
            <td style="width:70%;"></td>
            <td style="width:30%;">
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
                  <td style="font-size:16px; font-weight:800; color:#1a1a1a; padding-top:6px; border-top:1px solid #e9ecef;">Total</td>
                  <td style="font-size:16px; font-weight:800; color:#1a1a1a; text-align:right; padding-top:6px; border-top:1px solid #e9ecef;">${formatCurrency(doc.grandTotal)}</td>
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