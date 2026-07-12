import type { CreditEntryResponse, CreditPartyType } from '@inventory-platform/credit/types';
import { Box, Inline, Stack, Text, surfaceChrome } from '@inventory-platform/ui-kit';
import { formatCreditLedgerEntry, formatMoney } from '../model/credit-utils';

type Props = {
  entries: CreditEntryResponse[];
  partyType: CreditPartyType;
};

function formatEntryDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortRef(id: string) {
  if (id.length <= 14) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export function CreditEntriesTimeline({ entries, partyType }: Props) {
  if (!entries.length) {
    return (
      <Text as="p" color="secondary" variant="caption">
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
        const note = e.note?.trim() || '';
        const hasPaymentMeta = e.entryType === 'SETTLEMENT' && e.paymentMethod;
        const hasRef = Boolean(e.referenceType || e.referenceId);

        return (
          <Box
            key={e.id}
            className={
              isReturn ? surfaceChrome.creditLedgerCardReturn : surfaceChrome.creditLedgerCard
            }
          >
            <Inline justify="between" align="start" gap="md" flexWrap>
              <Stack gap="xs">
                <Text as="p" weight="semibold">
                  {title}
                </Text>
                <Text as="p" variant="caption" color="secondary">
                  {subtitle}
                </Text>
              </Stack>
              <Stack gap="xs" align="end">
                <Text as="p" weight="semibold" className={surfaceChrome.creditLedgerAmount}>
                  ₹{formatMoney(e.amount)}
                </Text>
                <Text as="p" variant="caption" color="secondary">
                  {formatEntryDate(e.createdAt)}
                </Text>
              </Stack>
            </Inline>

            <Inline gap="md" flexWrap className={surfaceChrome.creditLedgerMeta}>
              <Text as="span" variant="caption" color="secondary">
                Balance ₹{formatMoney(e.balanceAfter)}
              </Text>
              {hasPaymentMeta ? (
                <Text as="span" variant="caption" color="secondary">
                  Via {e.paymentMethod}
                  {e.bankRef ? ` · ${e.bankRef}` : ''}
                </Text>
              ) : null}
              {hasRef ? (
                <Text
                  as="span"
                  variant="caption"
                  color="secondary"
                  title={
                    e.referenceId
                      ? `${e.referenceType ?? 'Ref'} · ${e.referenceId}`
                      : e.referenceType ?? undefined
                  }
                  className={surfaceChrome.creditLedgerRef}
                >
                  {e.referenceType ?? 'Ref'}
                  {e.referenceId ? ` · ${shortRef(e.referenceId)}` : ''}
                </Text>
              ) : null}
            </Inline>

            {note ? (
              <Text
                as="p"
                variant="caption"
                color="secondary"
                className={surfaceChrome.creditLedgerNote}
              >
                {note}
              </Text>
            ) : null}
          </Box>
        );
      })}
    </Stack>
  );
}
