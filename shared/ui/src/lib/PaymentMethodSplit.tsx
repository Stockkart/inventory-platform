import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import type { PaymentMethod, PaymentSplit } from '@inventory-platform/types';
import styles from './PaymentMethodSplit.module.css';
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_META,
  defaultPaymentSplit,
  emptyPaymentSplit,
  formatRupees,
  isCreditMethod,
  isSingleTender,
  roundMoney,
  type Tender,
  validatePaymentSplit,
} from './paymentMethod';

export type PaymentSplitContext = 'sale' | 'purchase';

export interface PaymentMethodSplitValue {
  /** `null` until the user picks one of the 6 chips. */
  method: PaymentMethod | null;
  split: PaymentSplit;
}

export interface PaymentMethodSplitProps {
  /**
   * The bill total the split must sum to. The component handles the math; the
   * parent only needs to pass a fresh total when it changes.
   */
  total: number;
  /** Controlled value (method + per-tender amounts). */
  value: PaymentMethodSplitValue;
  onChange: (next: PaymentMethodSplitValue) => void;
  /**
   * Selling = sale (credit means "customer owes you"); Registration =
   * purchase (credit means "you owe vendor"). Controls copy only.
   */
  context: PaymentSplitContext;
  /** Optional title; defaults to "Payment". */
  title?: string;
  /** Optional intro under the title. */
  intro?: string;
  /** Disable all inputs (e.g. while a submit is in flight). */
  disabled?: boolean;
  /** When true, hide the inline validation message (parent handles errors). */
  hideError?: boolean;
}

const TENDER_BADGE_CLASS: Record<Tender, string> = {
  CASH: styles.legBadgeCash,
  ONLINE: styles.legBadgeOnline,
  CREDIT: styles.legBadgeCredit,
};

function tenderLabel(tender: Tender, context: PaymentSplitContext): string {
  if (tender === 'CASH') return 'Cash';
  if (tender === 'ONLINE') return 'Online';
  return context === 'sale' ? 'Credit (owes you)' : 'Credit (you owe)';
}

function tenderAmount(split: PaymentSplit, tender: Tender): number {
  if (tender === 'CASH') return split.cashAmount;
  if (tender === 'ONLINE') return split.onlineAmount;
  return split.creditAmount;
}

function setTenderAmount(
  split: PaymentSplit,
  tender: Tender,
  amount: number
): PaymentSplit {
  if (tender === 'CASH') return { ...split, cashAmount: amount };
  if (tender === 'ONLINE') return { ...split, onlineAmount: amount };
  return { ...split, creditAmount: amount };
}

function parseAmountInput(raw: string): number {
  const trimmed = raw.replace(/,/g, '').trim();
  if (trimmed === '') return 0;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export function PaymentMethodSplit({
  total,
  value,
  onChange,
  context,
  title,
  intro,
  disabled,
  hideError,
}: PaymentMethodSplitProps) {
  const reactId = useId();
  const safeTotal = roundMoney(total);
  const method = value.method;
  const meta = method ? PAYMENT_METHOD_META[method] : null;
  const validation = useMemo(
    () => validatePaymentSplit(method, value.split, safeTotal),
    [method, value.split, safeTotal]
  );

  // When the total changes (e.g. invoice rows are added), re-fit the split
  // proportionally so the user's pick stays consistent with the new total.
  const lastTotalRef = useRef<number>(safeTotal);
  useEffect(() => {
    if (lastTotalRef.current === safeTotal) return;
    const prevTotal = lastTotalRef.current;
    lastTotalRef.current = safeTotal;
    if (!method) return;
    if (isSingleTender(method)) {
      const next = defaultPaymentSplit(method, safeTotal);
      if (
        next.cashAmount !== value.split.cashAmount ||
        next.onlineAmount !== value.split.onlineAmount ||
        next.creditAmount !== value.split.creditAmount
      ) {
        onChange({ method, split: next });
      }
      return;
    }
    const currentSum = roundMoney(
      value.split.cashAmount + value.split.onlineAmount + value.split.creditAmount
    );
    if (currentSum === 0 || prevTotal === 0 || currentSum === safeTotal) {
      onChange({ method, split: defaultPaymentSplit(method, safeTotal) });
      return;
    }
    const ratio = safeTotal / currentSum;
    const scaled: PaymentSplit = {
      cashAmount: roundMoney(value.split.cashAmount * ratio),
      onlineAmount: roundMoney(value.split.onlineAmount * ratio),
      creditAmount: roundMoney(value.split.creditAmount * ratio),
    };
    const drift = roundMoney(
      safeTotal - (scaled.cashAmount + scaled.onlineAmount + scaled.creditAmount)
    );
    if (drift !== 0) {
      const credit = PAYMENT_METHOD_META[method].creditTender;
      if (credit) {
        scaled.creditAmount = roundMoney(scaled.creditAmount + drift);
      } else if (scaled.cashAmount > 0) {
        scaled.cashAmount = roundMoney(scaled.cashAmount + drift);
      } else {
        scaled.onlineAmount = roundMoney(scaled.onlineAmount + drift);
      }
    }
    onChange({ method, split: scaled });
    // We intentionally only react to total changes here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeTotal]);

  const handleMethodChange = useCallback(
    (next: PaymentMethod) => {
      if (next === method) return;
      onChange({ method: next, split: defaultPaymentSplit(next, safeTotal) });
    },
    [method, onChange, safeTotal]
  );

  const handleLegChange = useCallback(
    (tender: Tender, raw: string) => {
      if (!method) return;
      const parsed = parseAmountInput(raw);
      const amount = Number.isFinite(parsed) ? roundMoney(parsed) : 0;
      if (isSingleTender(method)) {
        onChange({
          method,
          split: setTenderAmount(emptyPaymentSplit(), tender, amount),
        });
        return;
      }
      const tenders = PAYMENT_METHOD_META[method].tenders;
      const otherTender = tenders.find((t) => t !== tender);
      let next: PaymentSplit = setTenderAmount(
        emptyPaymentSplit(),
        tender,
        Math.min(amount, safeTotal)
      );
      if (otherTender) {
        next = setTenderAmount(
          next,
          otherTender,
          roundMoney(
            Math.max(
              0,
              safeTotal - next.cashAmount - next.onlineAmount - next.creditAmount
            )
          )
        );
      }
      onChange({ method, split: next });
    },
    [method, onChange, safeTotal]
  );

  const showError = !validation.ok && !hideError && method != null && safeTotal > 0;
  const showSplitInputs = method != null && !isSingleTender(method);
  const summaryTenders: readonly Tender[] = meta?.tenders ?? [];

  return (
    <div className={styles.panel} aria-describedby={`${reactId}-summary`}>
      <div className={styles.head}>
        <h3 className={styles.title}>
          {title ?? 'Payment'}
          <span className={styles.titleRequired} aria-hidden="true">
            *
          </span>
        </h3>
        {intro != null && intro !== '' ? <p className={styles.intro}>{intro}</p> : null}
      </div>

      <div className={styles.totalRow}>
        <span>Bill total</span>
        <span className={styles.totalValue}>{formatRupees(safeTotal)}</span>
      </div>

      <div
        className={styles.chipGroup}
        role="radiogroup"
        aria-label="Payment method"
        aria-required="true"
      >
        {PAYMENT_METHODS.map((m) => {
          const mMeta = PAYMENT_METHOD_META[m];
          const active = m === method;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={active}
              className={active ? styles.chipActive : styles.chip}
              onClick={() => handleMethodChange(m)}
              disabled={disabled}
            >
              {mMeta.label}
            </button>
          );
        })}
      </div>

      {method == null ? (
        <p className={styles.placeholder}>Pick a payment method to continue.</p>
      ) : showSplitInputs ? (
        <div className={meta?.tenders.length === 2 ? styles.legsTwo : styles.legs}>
          {meta!.tenders.map((tender) => {
            const inputId = `${reactId}-${tender.toLowerCase()}`;
            return (
              <div key={tender} className={styles.legField}>
                <label htmlFor={inputId} className={styles.legLabel}>
                  <span className={`${styles.legBadge} ${TENDER_BADGE_CLASS[tender]}`}>
                    {tender === 'CASH' ? 'Cash' : tender === 'ONLINE' ? 'Online' : 'Credit'}
                  </span>
                </label>
                <div className={styles.legInputRow}>
                  <span className={styles.legCurrency} aria-hidden="true">
                    ₹
                  </span>
                  <input
                    id={inputId}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className={styles.legInput}
                    value={
                      tenderAmount(value.split, tender) === 0
                        ? ''
                        : String(tenderAmount(value.split, tender))
                    }
                    onChange={(ev) => handleLegChange(tender, ev.target.value)}
                    placeholder="0.00"
                    disabled={disabled || safeTotal <= 0}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {method != null ? (
        <div
          id={`${reactId}-summary`}
          className={`${styles.summary} ${
            isCreditMethod(method) && value.split.creditAmount > 0
              ? styles.summaryCreditHighlight
              : ''
          }`}
          aria-live="polite"
        >
          {summaryTenders.map((tender) => (
            <div key={tender} className={styles.summaryRow}>
              <span className={styles.summaryLabel}>
                {tender === 'CREDIT'
                  ? context === 'sale'
                    ? 'On credit · owes you'
                    : 'On credit · you owe'
                  : tenderLabel(tender, context)}
              </span>
              <span className={styles.summaryAmt}>
                {formatRupees(tenderAmount(value.split, tender))}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {showError && validation.message ? (
        <p className={styles.error} role="alert">
          {validation.message}
        </p>
      ) : null}
    </div>
  );
}
