import type { CreditEntryResponse, CreditPartyType } from '@inventory-platform/credit/types';
import { Box, Inline, Stack, Text } from '@inventory-platform/ui-kit';
import { formatCreditLedgerEntry, formatMoney } from '../model/credit-utils';
import { timelineReturnStyle } from './creditStyles';

type Props = {
  entries: CreditEntryResponse[];
  partyType: CreditPartyType;
};

export function CreditEntriesTimeline({ entries, partyType }: Props) {
  if (!entries.length) {
    return (
      <Text color="secondary" variant="caption">
        No ledger entries for this party yet.
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      {entries.map((e) => {
        const { title, subtitle } = formatCreditLedgerEntry(e, partyType);
        const isReturn =
          e.entryType === 'RETURN' ||
          (e.sourceKey?.toUpperCase().startsWith('RETURN:CREDIT:') ?? false);
        return (
          <Box
            key={e.id}
            padding="sm"
            rounded="md"
            border
            style={isReturn ? timelineReturnStyle : undefined}
          >
            <Inline justify="between" gap="md">
              <Text weight="semibold">{title}</Text>
              <Text variant="caption">{new Date(e.createdAt).toLocaleString('en-IN')}</Text>
            </Inline>
            <Text variant="caption" color="secondary">
              {subtitle}
            </Text>
            <Text variant="caption" color="secondary">
              Amount: Rs {formatMoney(e.amount)} · Balance after: Rs {formatMoney(e.balanceAfter)}
            </Text>
            {e.entryType === 'SETTLEMENT' && e.paymentMethod ? (
              <Text variant="caption" color="secondary">
                Paid via {e.paymentMethod}
                {e.bankRef ? ` · ${e.bankRef}` : ''}
                {e.txnDate ? ` · ${e.txnDate}` : ''}
              </Text>
            ) : null}
            {e.referenceType && e.referenceId ? (
              <Text variant="caption" color="secondary">
                Ref: {e.referenceType} · {e.referenceId}
              </Text>
            ) : null}
            <Text variant="caption" color="secondary">
              {e.note?.trim() || '—'}
            </Text>
          </Box>
        );
      })}
    </Stack>
  );
}
