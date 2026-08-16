// ─────────────────────────────────────────────────────────────────────────────
// inventory.ts — mock inventory transaction history per product
// ─────────────────────────────────────────────────────────────────────────────

export type TxType = 'sale' | 'purchase' | 'adjustment';

export interface InventoryTransaction {
  id:        string;
  productId: string;
  type:      TxType;
  qty:       number;     // positive = stock in, negative = stock out
  docNumber: string;
  dateGroup: string;     // e.g. "TODAY, MAY 31"  — used for grouping header
  time:      string;     // "02:15 PM"
  reason?:   string;     // adjustments only
}

// ── helper ────────────────────────────────────────────────────────────────────

/** Returns transactions for a product, newest first (by array order). */
export function txForProduct(productId: string): InventoryTransaction[] {
  return INVENTORY_TRANSACTIONS.filter(t => t.productId === productId);
}

/** Groups an already-filtered list by dateGroup, preserving order. */
export function groupByDate(
  txs: InventoryTransaction[],
): { dateGroup: string; items: InventoryTransaction[] }[] {
  const map = new Map<string, InventoryTransaction[]>();
  for (const t of txs) {
    if (!map.has(t.dateGroup)) map.set(t.dateGroup, []);
    map.get(t.dateGroup)!.push(t);
  }
  return Array.from(map.entries()).map(([dateGroup, items]) => ({ dateGroup, items }));
}

// ── data ──────────────────────────────────────────────────────────────────────

export const INVENTORY_TRANSACTIONS: InventoryTransaction[] = [

  // ── AeroMax Runner (id: '1') ─────────────────────────────────────────────
  { id: 'tx-1-1', productId: '1', type: 'sale',       qty: -4,  docNumber: 'INV-2026-0041', dateGroup: 'TODAY, MAY 31',      time: '11:05 AM' },
  { id: 'tx-1-2', productId: '1', type: 'purchase',   qty: +20, docNumber: 'PO-2026-0017',  dateGroup: 'TODAY, MAY 31',      time: '08:00 AM' },
  { id: 'tx-1-3', productId: '1', type: 'adjustment', qty: -1,  docNumber: 'ADJ-009',       dateGroup: 'YESTERDAY, MAY 30',  time: '03:20 PM', reason: 'Item returned damaged — written off after quality check.' },
  { id: 'tx-1-4', productId: '1', type: 'sale',       qty: -6,  docNumber: 'INV-2026-0038', dateGroup: 'YESTERDAY, MAY 30',  time: '10:45 AM' },
  { id: 'tx-1-5', productId: '1', type: 'sale',       qty: -3,  docNumber: 'INV-2026-0031', dateGroup: 'WED, MAY 28',        time: '02:30 PM' },
  { id: 'tx-1-6', productId: '1', type: 'purchase',   qty: +30, docNumber: 'PO-2026-0015',  dateGroup: 'WED, MAY 28',        time: '09:00 AM' },

  // ── Chronos Elite (id: '2') ──────────────────────────────────────────────
  { id: 'tx-2-1', productId: '2', type: 'sale',       qty: -5,  docNumber: 'INV-2026-0040', dateGroup: 'TODAY, MAY 31',      time: '01:45 PM' },
  { id: 'tx-2-2', productId: '2', type: 'sale',       qty: -3,  docNumber: 'INV-2026-0039', dateGroup: 'TODAY, MAY 31',      time: '10:10 AM' },
  { id: 'tx-2-3', productId: '2', type: 'purchase',   qty: +60, docNumber: 'PO-2026-0016',  dateGroup: 'YESTERDAY, MAY 30',  time: '09:15 AM' },
  { id: 'tx-2-4', productId: '2', type: 'adjustment', qty: -2,  docNumber: 'ADJ-008',       dateGroup: 'TUE, MAY 27',        time: '04:00 PM', reason: 'Display unit used for trade show — removed from sellable stock.' },
  { id: 'tx-2-5', productId: '2', type: 'sale',       qty: -8,  docNumber: 'INV-2026-0030', dateGroup: 'MON, MAY 26',        time: '11:30 AM' },

  // ── Sonic Studio Z1 (id: '3') ────────────────────────────────────────────
  { id: 'tx-3-1', productId: '3', type: 'sale',       qty: -3,  docNumber: 'INV-2026-0042', dateGroup: 'TODAY, MAY 31',      time: '03:00 PM' },
  { id: 'tx-3-2', productId: '3', type: 'purchase',   qty: +25, docNumber: 'PO-2026-0018',  dateGroup: 'YESTERDAY, MAY 30',  time: '10:30 AM' },
  { id: 'tx-3-3', productId: '3', type: 'sale',       qty: -7,  docNumber: 'INV-2026-0035', dateGroup: 'WED, MAY 28',        time: '01:20 PM' },
  { id: 'tx-3-4', productId: '3', type: 'adjustment', qty: +3,  docNumber: 'ADJ-010',       dateGroup: 'WED, MAY 28',        time: '09:50 AM', reason: 'Correction after stock count — 3 units found in back storage.' },
  { id: 'tx-3-5', productId: '3', type: 'sale',       qty: -5,  docNumber: 'INV-2026-0028', dateGroup: 'TUE, MAY 27',        time: '02:15 PM' },

  // ── Polar Flex Instant (id: '4') ─────────────────────────────────────────
  { id: 'tx-4-1', productId: '4', type: 'sale',       qty: -1,  docNumber: 'INV-2026-0043', dateGroup: 'TODAY, MAY 31',      time: '12:00 PM' },
  { id: 'tx-4-2', productId: '4', type: 'purchase',   qty: +15, docNumber: 'PO-2026-0019',  dateGroup: 'YESTERDAY, MAY 30',  time: '08:45 AM' },
  { id: 'tx-4-3', productId: '4', type: 'adjustment', qty: -1,  docNumber: 'ADJ-011',       dateGroup: 'TUE, MAY 27',        time: '05:00 PM', reason: 'Camera body cracked during warehouse shelf collapse.' },
  { id: 'tx-4-4', productId: '4', type: 'sale',       qty: -4,  docNumber: 'INV-2026-0025', dateGroup: 'MON, MAY 26',        time: '03:30 PM' },

  // ── Vista Shade Pro (id: '5') ────────────────────────────────────────────
  { id: 'tx-5-1', productId: '5', type: 'sale',       qty: -12, docNumber: 'INV-2026-0044', dateGroup: 'TODAY, MAY 31',      time: '02:20 PM' },
  { id: 'tx-5-2', productId: '5', type: 'sale',       qty: -8,  docNumber: 'INV-2026-0043', dateGroup: 'TODAY, MAY 31',      time: '09:55 AM' },
  { id: 'tx-5-3', productId: '5', type: 'purchase',   qty: +100,docNumber: 'PO-2026-0020',  dateGroup: 'YESTERDAY, MAY 30',  time: '07:30 AM' },
  { id: 'tx-5-4', productId: '5', type: 'sale',       qty: -20, docNumber: 'INV-2026-0036', dateGroup: 'WED, MAY 28',        time: '04:10 PM' },
  { id: 'tx-5-5', productId: '5', type: 'adjustment', qty: -4,  docNumber: 'ADJ-012',       dateGroup: 'TUE, MAY 27',        time: '11:00 AM', reason: 'Samples sent to influencer campaign — expensed separately.' },

  // ── Precision Chrono X1 (id: '6') ────────────────────────────────────────
  { id: 'tx-6-1', productId: '6', type: 'sale',       qty: -4,  docNumber: 'INV-2026-0045', dateGroup: 'TODAY, MAY 31',      time: '11:30 AM' },
  { id: 'tx-6-2', productId: '6', type: 'purchase',   qty: +50, docNumber: 'PO-2026-0021',  dateGroup: 'YESTERDAY, MAY 30',  time: '08:00 AM' },
  { id: 'tx-6-3', productId: '6', type: 'sale',       qty: -6,  docNumber: 'INV-2026-0037', dateGroup: 'WED, MAY 28',        time: '03:40 PM' },
  { id: 'tx-6-4', productId: '6', type: 'adjustment', qty: -1,  docNumber: 'ADJ-013',       dateGroup: 'MON, MAY 26',        time: '04:30 PM', reason: 'Packaging defect noticed — item isolated for brand assessment.' },

  // ── Ergonomic Task Chair (id: '7') ───────────────────────────────────────
  { id: 'tx-7-1', productId: '7', type: 'purchase',   qty: +20, docNumber: 'PO-2026-0022',  dateGroup: 'TODAY, MAY 31',      time: '09:00 AM' },
  { id: 'tx-7-2', productId: '7', type: 'sale',       qty: -4,  docNumber: 'INV-2026-0046', dateGroup: 'YESTERDAY, MAY 30',  time: '02:00 PM' },
  { id: 'tx-7-3', productId: '7', type: 'sale',       qty: -6,  docNumber: 'INV-2026-0032', dateGroup: 'WED, MAY 28',        time: '10:15 AM' },
  { id: 'tx-7-4', productId: '7', type: 'adjustment', qty: -2,  docNumber: 'ADJ-014',       dateGroup: 'TUE, MAY 27',        time: '01:00 PM', reason: 'Damaged in transit during shelf relocation.' },
  { id: 'tx-7-5', productId: '7', type: 'sale',       qty: -8,  docNumber: 'INV-2026-0027', dateGroup: 'MON, MAY 26',        time: '11:45 AM' },

  // ── Standing Desk V2 (id: '8') ───────────────────────────────────────────
  { id: 'tx-8-1', productId: '8', type: 'sale',       qty: -2,  docNumber: 'INV-2026-0047', dateGroup: 'TODAY, MAY 31',      time: '01:15 PM' },
  { id: 'tx-8-2', productId: '8', type: 'purchase',   qty: +10, docNumber: 'PO-2026-0023',  dateGroup: 'YESTERDAY, MAY 30',  time: '09:45 AM' },
  { id: 'tx-8-3', productId: '8', type: 'adjustment', qty: -1,  docNumber: 'ADJ-015',       dateGroup: 'WED, MAY 28',        time: '03:00 PM', reason: 'Motor fault detected during pre-ship QC check. Unit scrapped.' },
  { id: 'tx-8-4', productId: '8', type: 'sale',       qty: -3,  docNumber: 'INV-2026-0029', dateGroup: 'TUE, MAY 27',        time: '12:30 PM' },

  // ── LED Monitor 27" (id: '9') ────────────────────────────────────────────
  { id: 'tx-9-1', productId: '9', type: 'sale',       qty: -12, docNumber: 'INV-2026-0082', dateGroup: 'TODAY, MAY 31',      time: '02:15 PM' },
  { id: 'tx-9-2', productId: '9', type: 'purchase',   qty: +50, docNumber: 'PO-99231',      dateGroup: 'TODAY, MAY 31',      time: '09:30 AM' },
  { id: 'tx-9-3', productId: '9', type: 'adjustment', qty: -2,  docNumber: 'ADJ-004',       dateGroup: 'YESTERDAY, MAY 30',  time: '04:45 PM', reason: 'Damaged in transit during shelf relocation.' },
  { id: 'tx-9-4', productId: '9', type: 'sale',       qty: -8,  docNumber: 'INV-2026-0081', dateGroup: 'YESTERDAY, MAY 30',  time: '11:20 AM' },
  { id: 'tx-9-5', productId: '9', type: 'sale',       qty: -5,  docNumber: 'INV-2026-0076', dateGroup: 'WED, MAY 28',        time: '03:00 PM' },
  { id: 'tx-9-6', productId: '9', type: 'purchase',   qty: +40, docNumber: 'PO-99228',      dateGroup: 'TUE, MAY 27',        time: '08:30 AM' },
  { id: 'tx-9-7', productId: '9', type: 'adjustment', qty: +3,  docNumber: 'ADJ-003',       dateGroup: 'MON, MAY 26',        time: '05:15 PM', reason: 'Surplus from cancelled B2B order — added back to stock.' },
];
