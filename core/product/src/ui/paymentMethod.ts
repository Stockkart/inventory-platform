import type { PaymentMethod, PaymentSplit } from '@inventory-platform/contracts';
/**
 * The set of canonical payment methods (mirrors the union in api-types). Kept
 * as a runtime array so the UI can iterate / validate without depending on
 * literal repetition.
 */
export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  'CASH',
  'ONLINE',
  'CREDIT',
  'CASH_ONLINE',
  'ONLINE_CREDIT',
  'CREDIT_CASH',
] as const;

export type Tender = 'CASH' | 'ONLINE' | 'CREDIT';

export interface PaymentMethodMeta {
  label: string;
  short: string;
  icon: string;
  tenders: readonly Tender[];
  /** Tender that posts to the credit ledger, if any. */
  creditTender?: Tender;
}

const TENDER_META: Record<Tender, { label: string; icon: string }> = {
  CASH: { label: 'Cash', icon: '💵' },
  ONLINE: { label: 'Online', icon: '💳' },
  CREDIT: { label: 'Credit', icon: '📒' },
};

/**
 * Metadata for each payment method. The order of tenders in `tenders` matches
 * the order in the enum name (left = primary categorization for accounting
 * reports; the credit slice, when present, is always the remainder).
 */
export const PAYMENT_METHOD_META: Record<PaymentMethod, PaymentMethodMeta> = {
  CASH: { label: 'Cash', short: 'Cash', icon: '💵', tenders: ['CASH'] },
  ONLINE: { label: 'Online', short: 'Online', icon: '💳', tenders: ['ONLINE'] },
  CREDIT: { label: 'Credit', short: 'Credit', icon: '📒', tenders: ['CREDIT'], creditTender: 'CREDIT' },
  CASH_ONLINE: {
    label: 'Cash + Online',
    short: 'Cash+Online',
    icon: '💵💳',
    tenders: ['CASH', 'ONLINE'],
  },
  ONLINE_CREDIT: {
    label: 'Online + Credit',
    short: 'Online+Credit',
    icon: '💳📒',
    tenders: ['ONLINE', 'CREDIT'],
    creditTender: 'CREDIT',
  },
  CREDIT_CASH: {
    label: 'Credit + Cash',
    short: 'Credit+Cash',
    icon: '📒💵',
    tenders: ['CREDIT', 'CASH'],
    creditTender: 'CREDIT',
  },
};

/** Returns true if the method represents a single-tender (non-split) payment. */
export function isSingleTender(method: PaymentMethod): boolean {
  return PAYMENT_METHOD_META[method].tenders.length === 1;
}

/** Returns true if the method involves the credit ledger. */
export function isCreditMethod(method: PaymentMethod): boolean {
  return PAYMENT_METHOD_META[method].creditTender != null;
}

/** Type guard: narrow an unknown string to one of the 6 canonical methods. */
export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return (
    typeof value === 'string' &&
    (PAYMENT_METHODS as readonly string[]).includes(value)
  );
}

/** Two-decimal money rounding used for all split arithmetic on the client. */
export function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Indian-locale currency formatter (₹). */
export function formatRupees(n: number): string {
  const safe = Number.isFinite(n) ? n : 0;
  return `₹${safe.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Build the canonical zero split. Used as a starting point and a sentinel
 * when callers don't have one yet.
 */
export function emptyPaymentSplit(): PaymentSplit {
  return { cashAmount: 0, onlineAmount: 0, creditAmount: 0 };
}

/**
 * Derive the default split for a given method + total. For two-tender methods
 * the convention is:
 *   - CASH_ONLINE   → 50/50
 *   - ONLINE_CREDIT → full online, no credit (caller fills in if any)
 *   - CREDIT_CASH   → full credit, no cash (caller fills in any deposit)
 * Single-tender methods put the whole total in the one bucket.
 */
export function defaultPaymentSplit(
  method: PaymentMethod,
  total: number
): PaymentSplit {
  const t = roundMoney(total);
  switch (method) {
    case 'CASH':
      return { cashAmount: t, onlineAmount: 0, creditAmount: 0 };
    case 'ONLINE':
      return { cashAmount: 0, onlineAmount: t, creditAmount: 0 };
    case 'CREDIT':
      return { cashAmount: 0, onlineAmount: 0, creditAmount: t };
    case 'CASH_ONLINE': {
      const half = roundMoney(t / 2);
      return { cashAmount: half, onlineAmount: roundMoney(t - half), creditAmount: 0 };
    }
    case 'ONLINE_CREDIT':
      return { cashAmount: 0, onlineAmount: t, creditAmount: 0 };
    case 'CREDIT_CASH':
      return { cashAmount: 0, onlineAmount: 0, creditAmount: t };
    default:
      return { cashAmount: t, onlineAmount: 0, creditAmount: 0 };
  }
}

export type PaymentSplitInvalidReason =
  | 'METHOD_MISSING'
  | 'EMPTY_TOTAL'
  | 'SUM_MISMATCH'
  | 'NEGATIVE_AMOUNT'
  | 'TENDER_NOT_ALLOWED'
  | 'TENDER_MISSING';

export interface PaymentSplitValidation {
  ok: boolean;
  reason?: PaymentSplitInvalidReason;
  message?: string;
}

/**
 * Validates that a (method, split, total) tuple is internally consistent.
 *
 * Rules:
 * 0. A payment method must be selected (no default).
 * 1. Each leg amount must be a finite non-negative number.
 * 2. The sum of all three legs must equal `total` within 1 paisa.
 * 3. Every non-zero leg must be one of the tenders allowed by `method`.
 * 4. Every tender required by a two-tender method must have amount > 0
 *    (a 0+total split should pick the corresponding single-tender method).
 */
export function validatePaymentSplit(
  method: PaymentMethod | null | undefined,
  split: PaymentSplit,
  total: number
): PaymentSplitValidation {
  if (method == null) {
    return {
      ok: false,
      reason: 'METHOD_MISSING',
      message: 'Select a payment method to continue.',
    };
  }
  if (!Number.isFinite(total) || total < 0) {
    return { ok: false, reason: 'EMPTY_TOTAL', message: 'Total must be a positive amount.' };
  }
  const legs: Array<{ tender: Tender; amount: number }> = [
    { tender: 'CASH', amount: split.cashAmount },
    { tender: 'ONLINE', amount: split.onlineAmount },
    { tender: 'CREDIT', amount: split.creditAmount },
  ];
  for (const leg of legs) {
    if (!Number.isFinite(leg.amount) || leg.amount < 0) {
      return {
        ok: false,
        reason: 'NEGATIVE_AMOUNT',
        message: `${TENDER_META[leg.tender].label} amount must be zero or positive.`,
      };
    }
  }
  const meta = PAYMENT_METHOD_META[method];
  const allowed = new Set<Tender>(meta.tenders);
  for (const leg of legs) {
    if (leg.amount > 0 && !allowed.has(leg.tender)) {
      return {
        ok: false,
        reason: 'TENDER_NOT_ALLOWED',
        message: `${TENDER_META[leg.tender].label} is not allowed for "${meta.label}".`,
      };
    }
  }
  if (!isSingleTender(method)) {
    for (const tender of meta.tenders) {
      const amt =
        tender === 'CASH'
          ? split.cashAmount
          : tender === 'ONLINE'
          ? split.onlineAmount
          : split.creditAmount;
      if (amt <= 0) {
        return {
          ok: false,
          reason: 'TENDER_MISSING',
          message: `Enter a ${TENDER_META[tender].label.toLowerCase()} amount for "${meta.label}".`,
        };
      }
    }
  }
  const sum = roundMoney(split.cashAmount + split.onlineAmount + split.creditAmount);
  if (Math.abs(sum - roundMoney(total)) > 0.01) {
    return {
      ok: false,
      reason: 'SUM_MISMATCH',
      message: `Split (${formatRupees(sum)}) does not match total (${formatRupees(total)}).`,
    };
  }
  return { ok: true };
}

/**
 * Derive the canonical PaymentMethod from a split when the caller only has
 * amounts (e.g. reading a legacy response). Returns the closest method that
 * matches the non-zero buckets, defaulting to CASH for a zero split.
 */
export function paymentMethodFromSplit(split: PaymentSplit): PaymentMethod {
  const hasCash = split.cashAmount > 0;
  const hasOnline = split.onlineAmount > 0;
  const hasCredit = split.creditAmount > 0;
  if (hasCash && hasOnline && !hasCredit) return 'CASH_ONLINE';
  if (hasOnline && hasCredit && !hasCash) return 'ONLINE_CREDIT';
  if (hasCash && hasCredit && !hasOnline) return 'CREDIT_CASH';
  if (hasOnline && !hasCash && !hasCredit) return 'ONLINE';
  if (hasCredit && !hasCash && !hasOnline) return 'CREDIT';
  return 'CASH';
}

/**
 * Human-readable label for a payment method (handles canonical + legacy
 * strings such as 'CARD').
 */
export function formatPaymentMethod(method: PaymentMethod | string | null | undefined): string {
  if (!method) return 'Not specified';
  if (isPaymentMethod(method)) return PAYMENT_METHOD_META[method].label;
  const upper = method.toUpperCase();
  if (upper === 'CARD') return 'Card';
  return method;
}

/**
 * Short label without icon, useful in tight UIs (chips, table cells).
 */
export function formatPaymentMethodShort(method: PaymentMethod | string | null | undefined): string {
  if (!method) return '—';
  if (isPaymentMethod(method)) return PAYMENT_METHOD_META[method].short;
  return method;
}

/**
 * Compact split breakdown like "₹600 Credit · ₹400 Cash". Returns an empty
 * string when the row has no per-tender amounts (e.g. legacy data).
 */
export function formatPaymentSplit(
  split: Partial<PaymentSplit> | null | undefined
): string {
  if (!split) return '';
  const parts: string[] = [];
  if (split.cashAmount && split.cashAmount > 0) {
    parts.push(`${formatRupees(split.cashAmount)} Cash`);
  }
  if (split.onlineAmount && split.onlineAmount > 0) {
    parts.push(`${formatRupees(split.onlineAmount)} Online`);
  }
  if (split.creditAmount && split.creditAmount > 0) {
    parts.push(`${formatRupees(split.creditAmount)} Credit`);
  }
  return parts.length > 1 ? parts.join(' · ') : '';
}
