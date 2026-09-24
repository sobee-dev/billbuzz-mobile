// components/invoice-templates/pdf/professionalHtml.ts


import { resolveCurrency } from '@/utils/currencySymbol';
import { BusinessProfile } from '../../../services/business';
import { Document, DocumentType } from '../../../services/documents';
import { amountToWords, escapeHtml, makeCurrencyFormatter, PAGE_CSS } from './htmlShared';

const A4_WIDTH = 595;

const TYPE_LABEL: Record<DocumentType, string> = {
  sales_invoice:    'Sales Invoice',
  proforma_invoice: 'Proforma Invoice',
  purchase_invoice: 'Supplier Order',
};

// Same diagonal "cut ribbon" math as ProfessionalTemplate.tsx's
// DiagonalBanner, rendered as a raw SVG string instead of react-native-svg.
function bannerSvg(color: string, height: number, flipped = false): string {
  const solidEnd = A4_WIDTH * 0.58;
  const stripeW = 26;
  const gap = 10;
  const skew = height * 1.3;

  const stripes = [0, 1, 2]
    .map(i => {
      const x = solidEnd + i * (stripeW + gap);
      const d = `M${x},0 L${x + stripeW},0 L${x + stripeW - skew},${height} L${x - skew},${height} Z`;
      const opacity = 1 - (i + 1) * 0.28;
      return `<path d="${d}" fill="${color}" opacity="${opacity}" />`;
    })
    .join('');

  const solidPath = `M0,0 L${solidEnd},0 L${solidEnd - skew},${height} L0,${height} Z`;
  const style = flipped ? ` style="transform: scaleX(-1);"` : '';

  return `
    <svg width="${A4_WIDTH}" height="${height}" viewBox="0 0 ${A4_WIDTH} ${height}"${style}>
      <path d="${solidPath}" fill="${color}" />
      ${stripes}
    </svg>`;
}

export function buildProfessionalHtml(doc: Document, business: BusinessProfile): string {
  const brandColor = business.brandColorOne || '#d3aeae';
  const resolvedCurrency = resolveCurrency(doc.currency || business.currency);
  const currencyName = resolvedCurrency.name;
  const formatCurrency = makeCurrencyFormatter(resolvedCurrency.symbol);
  const amountInWords = amountToWords(Number(doc.grandTotal), currencyName);
  const billedToName = doc.customerName || doc.supplierName;
  const items = doc.items ?? [];

  const hasSignatureImage = business.signatureType === 'image' && !!business.signatureUrl;
  const hasSignatureText = business.signatureType === 'text' && !!business.signatureText;

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

  // `position: fixed` is what makes this repeat identically on every
  // physical page the print engine generates — the same behaviour
  // thead relies on for the repeating table header below. Extremely
  // low opacity + print-color-adjust:exact (set in PAGE_CSS) so it
  // survives export instead of being silently stripped as a
  // "background" by the print renderer.
  //
  // `top` is offset past the banner + logo/business-name/address block
  // (only present on page 1) so the watermark never renders behind it —
  // it starts at Bill To and covers everything below, on every page,
  // including continuation pages that have no header to avoid.
  const HEADER_CLEARANCE = 190;
  const watermarkHtml = business.logoUrl ? `
    <div style="
      position: fixed; top: ${HEADER_CLEARANCE}px; left: 0; right: 0; bottom: 0;
      display: flex; align-items: flex-start; justify-content: center;
      z-index: 0; pointer-events: none;
    ">
      <img src="${business.logoUrl}" style="width:380px; height:380px; object-fit:contain; opacity:0.055;" />
    </div>` : '';

  return `
<html>
  <head>
    <meta charset="utf-8" />
    <style>${PAGE_CSS}</style>
  </head>
  <body>
    ${watermarkHtml}

    <div style="position:relative; z-index:1; padding:0 32px;">

      ${bannerSvg(brandColor, 10)}

      <div style="padding-top:26px;">

        <!-- Logo + business info (left) / doc meta (right) -->
        <table class="avoid-break" style="margin-bottom:28px;">
          <tr>
            <td style="vertical-align:top; width:60%;">
              <table><tr>
                ${business.logoUrl ? `
                <td style="vertical-align:top; padding-right:14px;">
                  <img src="${business.logoUrl}" style="width:52px; height:52px; border-radius:8px;" />
                </td>` : ''}
                <td style="vertical-align:top;">
                  <div style="font-weight:800; font-size:20px; color:#1a1a1a;">${escapeHtml(business.name)}</div>
                  ${business.description ? `<div style="color:#5f6368; font-size:12px; margin-top:4px;">${escapeHtml(business.description)}</div>` : ''}
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
              <div style="font-size:13px; font-weight:600; color:#1a1a1a; margin-bottom:8px;">
                ${escapeHtml(doc.documentDate)}
              </div>
              <div style="font-size:10px; color:#5f6368; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:2px;">
                Status
              </div>
              <div style="font-size:13px; font-weight:700; color:#1a1a1a; text-transform:capitalize;">
                ${escapeHtml(doc.status)}
              </div>
            </td>
          </tr>
        </table>

        <!-- Bill To -->
        ${billedToName ? `
        <div class="avoid-break" style="margin-bottom:22px;">
          <div style="font-size:10px; color:#5f6368; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:4px;">Bill To</div>
          <div style="font-size:14px; font-weight:700; color:#1a1a1a;">${escapeHtml(billedToName)}</div>
          ${doc.customerPhone ? `<div style="font-size:12px; color:#5f6368; margin-top:1px;">${escapeHtml(doc.customerPhone)}</div>` : ''}
          ${doc.customerEmail ? `<div style="font-size:12px; color:#5f6368;">${escapeHtml(doc.customerEmail)}</div>` : ''}
        </div>` : ''}

        <!-- Items table — thead repeats per page automatically (PAGE_CSS);
             rows have no background fill so the watermark behind them
             (this whole wrapper is z-index:1 over the fixed watermark div)
             reads through on every page it appears on. -->
        <table style="border-radius:6px; overflow:hidden; margin-bottom:24px;">
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
        <table class="avoid-break" style="margin-bottom:24px;">
          <tr>
            <td style="width:50%; vertical-align:top; padding-right:20px;">
              ${doc.notes ? `
              <div style="padding:12px; border-radius:6px; border:1px solid #e9ecef; background:rgba(248,249,250,0.7);">
                <div style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:#1a1a1a; margin-bottom:4px;">Payment Info</div>
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

        <!-- Amount in words -->
        <div class="avoid-break" style="margin-bottom:24px; padding:10px; background:rgba(248,249,250,0.7); border-radius:6px; border:1px solid #e9ecef;">
          <div style="font-size:10px; font-weight:700; color:#5f6368; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">Amount in Words</div>
          <div style="font-size:11px; font-style:italic; color:#1a1a1a;">${escapeHtml(amountInWords)}</div>
        </div>

        <!-- Signature -->
        <div class="avoid-break" style="margin-bottom:20px;">
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

        <!-- Footer note -->
        <div class="avoid-break" style="margin-bottom:22px;">
          <div style="font-size:13px; color:#5f6368;">Thank you for your business!</div>
          ${business.registrationNumber ? `<div style="font-size:10px; color:#5f6368; margin-top:4px;">Reg. No: ${escapeHtml(business.registrationNumber)}</div>` : ''}
        </div>

      </div>

      ${bannerSvg(brandColor, 16, true)}

    </div>
  </body>
</html>`;
}