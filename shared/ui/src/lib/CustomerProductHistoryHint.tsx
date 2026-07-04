import { useState } from 'react';
import type {
  CustomerProductHistoryGroup,
  CustomerProductHistoryResponse,
} from '@inventory-platform/types';
import styles from './CustomerProductHistoryHint.module.css';

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const moneyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type SaleEntry = NonNullable<CustomerProductHistoryGroup['lastSale']>;

function formatRate(price: number): string {
  if (!Number.isFinite(price)) return moneyFormatter.format(0);
  const isWhole = price % 1 === 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  }).format(price);
}

function formatQtyAtRate(qty: SaleEntry['quantity'], priceToRetail: number): string {
  const n = Number(qty);
  const qtyLabel = Number.isFinite(n) ? (n === 1 ? '1 pc' : `${n} pcs`) : String(qty);
  return `${qtyLabel} at ${formatRate(priceToRetail)} rate`;
}

function HistoryEntryRow({
  entry,
  variant = 'primary',
}: {
  entry: SaleEntry;
  variant?: 'primary' | 'prior';
}) {
  const date = entry.soldAt ? dateFormatter.format(new Date(entry.soldAt)) : '—';
  const qtyAtRate = formatQtyAtRate(
    entry.quantity,
    Number(entry.priceToRetail) || 0
  );
  const invoice = entry.invoiceNo?.trim();

  return (
    <div
      className={
        variant === 'primary' ? styles.entryRow : styles.entryRowPrior
      }
    >
      <span className={styles.entryDate}>{date}</span>
      <span className={styles.entryDot} aria-hidden>
        ·
      </span>
      <span className={styles.entryQtyRate}>{qtyAtRate}</span>
      {invoice ? (
        <span className={styles.entryInvoice} title="Invoice number">
          {invoice}
        </span>
      ) : null}
    </div>
  );
}

export interface CustomerProductHistoryHintProps {
  sellableRef: string;
  history: CustomerProductHistoryResponse | null;
  loading?: boolean;
}

export function CustomerProductHistoryHint({
  sellableRef,
  history,
  loading = false,
}: CustomerProductHistoryHintProps) {
  const [expanded, setExpanded] = useState(false);
  const group = history?.bySellableRef?.[sellableRef];

  if (loading && !group) {
    return (
      <div className={styles.hint} role="status" aria-live="polite">
        <span className={styles.loadingPulse} />
        <span className={styles.loadingText}>Checking past purchases…</span>
      </div>
    );
  }

  if (!group?.lastSale) {
    return (
      <div className={`${styles.hint} ${styles.hintNew}`}>
        <span className={styles.newBadge}>New for customer</span>
      </div>
    );
  }

  const prior = group.history.slice(1);
  const priorLabel =
    prior.length === 1 ? '1 earlier' : `${prior.length} earlier`;

  return (
    <div className={`${styles.hint} ${styles.hintHasHistory}`}>
      <div className={styles.header}>
        <span className={styles.historyBadge}>Bought before</span>
        {prior.length > 0 ? (
          <button
            type="button"
            className={styles.expandBtn}
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-label={
              expanded
                ? 'Hide earlier purchases'
                : `Show ${prior.length} earlier purchase${prior.length === 1 ? '' : 's'}`
            }
          >
            <span className={styles.expandLabel}>
              {expanded ? 'Hide' : priorLabel}
            </span>
            <span
              className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
              aria-hidden
            >
              ▾
            </span>
          </button>
        ) : null}
      </div>

      <HistoryEntryRow entry={group.lastSale} variant="primary" />

      {expanded && prior.length > 0 ? (
        <ul className={styles.priorList}>
          {prior.map((entry) => (
            <li key={`${entry.purchaseId}-${entry.soldAt}`}>
              <HistoryEntryRow entry={entry} variant="prior" />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
