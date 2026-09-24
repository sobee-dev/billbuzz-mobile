// components/receipt-templates/pdf/htmlShared.ts
//
// Shared helpers for the HTML PDF templates. These are plain functions
// (no RN imports) so they can run inside the string-building code that
// feeds expo-print, mirroring the same logic each RN template already
// has for amount-in-words / currency formatting.

// ─── Amount in words (identical logic to ClassicTemplate/MinimalTemplate) ──
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

export function amountToWords(amount: number, currencyName: string): string {
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

// ─── Currency ───────────────────────────────────────────────────────────────
export function makeCurrencyFormatter(symbol: string) {
  return (amount: number | string | undefined | null): string => {
    const n = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    const safe = typeof n === 'number' && !isNaN(n) ? n : 0;
    return `${symbol}${safe.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };
}

// ─── HTML escaping ──────────────────────────────────────────────────────────
// Every doc/business field (customer names, notes, addresses) gets
// interpolated into raw HTML strings below, so this is not optional —
// without it, a stray "<" or "&" in a customer name or notes field can
// break the layout, and unescaped user input in HTML is a standing risk.
export function escapeHtml(value: string | number | undefined | null): string {
  const str = String(value ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Base print CSS ─────────────────────────────────────────────────────────
// The two rules that actually solve the reported problem:
//   - `.avoid-break` (+ `tbody tr`) → break-inside/page-break-inside: avoid
//     stops a row (or the totals/notes block) from being sliced across a
//     page boundary. The renderer moves the whole element to the next page
//     instead.
//   - `thead { display: table-header-group }` → the item-table header row
//     re-prints at the top of every continuation page automatically.
//
// `-webkit-print-color-adjust: exact` is what keeps background colors
// (brand-colored header bars, tinted rows) from being silently dropped —
// browsers strip backgrounds on print by default unless told not to.
export const PAGE_CSS = `
  @page { size: A4; margin: 28pt 30pt; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  table { border-collapse: collapse; width: 100%; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }

  .avoid-break, tbody tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }
`;