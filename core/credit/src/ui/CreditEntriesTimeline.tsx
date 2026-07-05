import type { CreditEntryResponse, CreditPartyType } from '@inventory-platform/credit/types';
import { formatCreditLedgerEntry, formatMoney } from '../model/credit-utils';
import styles from './credit.module.css';

type Props = {
  entries: CreditEntryResponse[];
  partyType: CreditPartyType;
};

export function CreditEntriesTimeline({ entries, partyType }: Props) {
  if (!entries.length) {
    return <p className={styles.empty}>No ledger entries for this party yet.</p>;
  }

  return (
    <div className={styles.timeline}>
      {entries.map((e) => {
        const { title, subtitle } = formatCreditLedgerEntry(e, partyType);
        const isReturn =
          e.entryType === 'RETURN' ||
          (e.sourceKey?.toUpperCase().startsWith('RETURN:CREDIT:') ?? false);
        return (
          <div
            key={e.id}
            className={`${styles.timelineRow}${isReturn ? ` ${styles.timelineRowReturn}` : ''}`}
          >
            <div className={styles.timelineHead}>
              <strong>{title}</strong>
              <span>{new Date(e.createdAt).toLocaleString('en-IN')}</span>
            </div>
            <div className={styles.timelineMeta}>{subtitle}</div>
            <div className={styles.timelineMeta}>
              Amount: Rs {formatMoney(e.amount)} · Balance after: Rs{' '}
              {formatMoney(e.balanceAfter)}
            </div>
            {e.entryType === 'SETTLEMENT' && e.paymentMethod ? (
              <div className={styles.timelineMeta}>
                Paid via {e.paymentMethod}
                {e.bankRef ? ` · ${e.bankRef}` : ''}
                {e.txnDate ? ` · ${e.txnDate}` : ''}
              </div>
            ) : null}
            {e.referenceType && e.referenceId ? (
              <div className={styles.timelineMeta}>
                Ref: {e.referenceType} · {e.referenceId}
              </div>
            ) : null}
            <div className={styles.timelineMeta}>{e.note?.trim() || '—'}</div>
          </div>
        );
      })}
    </div>
  );
}
