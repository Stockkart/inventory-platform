import type { CreditEntryResponse, CreditPartyType } from '@inventory-platform/credit/types';
import { Box, Inline, Text } from '@inventory-platform/ui-kit';
import { formatCreditLedgerEntry, formatMoney } from '../model/credit-utils';
import styles from './credit.module.css';

type Props = {
  entries: CreditEntryResponse[];
  partyType: CreditPartyType;
};

export function CreditEntriesTimeline({ entries, partyType }: Props) {
  if (!entries.length) {
    return <Text className={styles.empty}>No ledger entries for this party yet.</Text>;
  }

  return (
    <Box className={styles.timeline}>
      {entries.map((e) => {
        const { title, subtitle } = formatCreditLedgerEntry(e, partyType);
        const isReturn =
          e.entryType === 'RETURN' ||
          (e.sourceKey?.toUpperCase().startsWith('RETURN:CREDIT:') ?? false);
        return (
          <Box
            key={e.id}
            className={`${styles.timelineRow}${isReturn ? ` ${styles.timelineRowReturn}` : ''}`}
          >
            <Inline justify="between" className={styles.timelineHead}>
              <Text weight="semibold">{title}</Text>
              <Text variant="caption">{new Date(e.createdAt).toLocaleString('en-IN')}</Text>
            </Inline>
            <Box className={styles.timelineMeta}>{subtitle}</Box>
            <Box className={styles.timelineMeta}>
              Amount: Rs {formatMoney(e.amount)} · Balance after: Rs {formatMoney(e.balanceAfter)}
            </Box>
            {e.entryType === 'SETTLEMENT' && e.paymentMethod ? (
              <Box className={styles.timelineMeta}>
                Paid via {e.paymentMethod}
                {e.bankRef ? ` · ${e.bankRef}` : ''}
                {e.txnDate ? ` · ${e.txnDate}` : ''}
              </Box>
            ) : null}
            {e.referenceType && e.referenceId ? (
              <Box className={styles.timelineMeta}>
                Ref: {e.referenceType} · {e.referenceId}
              </Box>
            ) : null}
            <Box className={styles.timelineMeta}>{e.note?.trim() || '—'}</Box>
          </Box>
        );
      })}
    </Box>
  );
}
