import type { CreditEntryResponse } from '@inventory-platform/types';
import { formatMoney } from './credit-utils';
import styles from './credit.module.css';

type Props = { entries: CreditEntryResponse[] };

export function CreditEntriesTimeline({ entries }: Props) {
  if (!entries.length) return <p className={styles.empty}>No ledger entries for this party yet.</p>;

  return (
    <div className={styles.timeline}>
      {entries.map((e) => (
        <div key={e.id} className={styles.timelineRow}>
          <div className={styles.timelineHead}>
            <strong>{e.entryType}</strong>
            <span>{new Date(e.createdAt).toLocaleString('en-IN')}</span>
          </div>
          <div className={styles.timelineMeta}>
            Amount: Rs {formatMoney(e.amount)} · Balance after: Rs {formatMoney(e.balanceAfter)}
          </div>
          {e.entryType === 'SETTLEMENT' && e.paymentMethod ? (
            <div className={styles.timelineMeta}>
              Paid via {e.paymentMethod}
              {e.bankRef ? ` · ${e.bankRef}` : ''}
              {e.txnDate ? ` · ${e.txnDate}` : ''}
            </div>
          ) : null}
          <div className={styles.timelineMeta}>{e.note || '—'}</div>
        </div>
      ))}
    </div>
  );
}
