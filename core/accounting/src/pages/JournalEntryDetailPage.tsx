import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  FormField,
  Inline,
  Modal,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  cn,
  accountingChrome,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import { useJournalQuery, useReverseJournalMutation } from '../queries/hooks';
import { AccountingTabs } from '../ui/AccountingTabs';
import {
  formatDateShort,
  formatDateTime,
  formatJournalSource,
  formatJournalStatus,
  formatMoney,
  formatPartyLabel,
} from '../model/format';

function statusVariant(
  status: 'POSTED' | 'REVERSED' | 'VOID',
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'POSTED') return 'success';
  if (status === 'REVERSED') return 'warning';
  return 'danger';
}

function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box className={accountingChrome.detailMetaItem}>
      <Text as="span" className={accountingChrome.detailMetaLabel}>
        {label}
      </Text>
      <Text as="span" className={accountingChrome.detailMetaValue}>
        {value}
      </Text>
    </Box>
  );
}

function formatLineParty(partyType?: string | null, partyDisplayName?: string | null): string {
  if (!partyType) return '—';
  const kind = formatPartyLabel(partyType);
  return partyDisplayName ? `${kind} · ${partyDisplayName}` : kind;
}

export function JournalEntryDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const entryId = params.entryId ?? '';
  const { error: notifyError, success: notifySuccess } = useNotify;
  const { data: entry, isLoading } = useJournalQuery(entryId);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState('');
  const reverseMutation = useReverseJournalMutation({
    onSuccess: (reversal) => {
      setReverseOpen(false);
      setReverseReason('');
      notifySuccess(`Reversal posted: ${reversal.entryNo}`);
      navigate(`/dashboard/accounting/journal/${reversal.id}`);
    },
    onError: (e) => {
      notifyError(e instanceof Error ? e.message : 'Failed to reverse entry');
    },
  });

  function openReverseModal() {
    setReverseReason('');
    setReverseOpen(true);
  }

  function closeReverseModal() {
    if (reverseMutation.isPending) return;
    setReverseOpen(false);
    setReverseReason('');
  }

  function confirmReverse() {
    if (!entry) return;
    const reason = reverseReason.trim();
    reverseMutation.mutate({ id: entry.id, body: reason ? { reason } : {} });
  }

  return (
    <Stack gap="md">
      <AccountingTabs />

      <Inline justify="between" align="center" gap="md" className={accountingChrome.detailToolbar}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/accounting/journal')}
        >
          ← Back to journal
        </Button>
        {entry && entry.status === 'POSTED' ? (
          <Button
            type="button"
            variant="solid"
            size="sm"
            onClick={openReverseModal}
            disabled={reverseMutation.isPending}
          >
            Reverse entry
          </Button>
        ) : null}
      </Inline>

      <Modal open={reverseOpen} onClose={closeReverseModal} size="sm">
        <Modal.Header title="Reverse entry" onClose={closeReverseModal} />
        <Modal.Body>
          <Stack gap="md">
            {entry ? (
              <Box className={accountingChrome.reverseSummary}>
                <Box className={accountingChrome.reverseSummaryRow}>
                  <Text as="span" className={accountingChrome.reverseSummaryLabel}>
                    Entry
                  </Text>
                  <Text as="span" className={accountingChrome.reverseSummaryValue}>
                    {entry.entryNo}
                  </Text>
                </Box>
                <Box className={accountingChrome.reverseSummaryRow}>
                  <Text as="span" className={accountingChrome.reverseSummaryLabel}>
                    Amount
                  </Text>
                  <Text as="span" className={accountingChrome.reverseSummaryValue}>
                    ₹{formatMoney(entry.totalDebit)}
                  </Text>
                </Box>
                <Box className={accountingChrome.reverseSummaryRow}>
                  <Text as="span" className={accountingChrome.reverseSummaryLabel}>
                    Source
                  </Text>
                  <Text as="span" className={accountingChrome.reverseSummaryValue}>
                    {formatJournalSource(entry.sourceType)}
                  </Text>
                </Box>
              </Box>
            ) : null}

            <Text as="p" className={accountingChrome.reverseHint}>
              The original entry will be marked reversed, and a new mirroring entry will be posted.
            </Text>

            <FormField
              id="reverse-reason"
              label="Reason"
              hint="Optional — helps explain this reversal later."
              multiline
              rows={3}
              value={reverseReason}
              onChange={setReverseReason}
              placeholder="e.g. Duplicate posting, incorrect amount…"
              disabled={reverseMutation.isPending}
            />
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="button"
            variant="ghost"
            onClick={closeReverseModal}
            disabled={reverseMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={reverseMutation.isPending}
            onClick={confirmReverse}
          >
            {reverseMutation.isPending ? 'Reversing…' : 'Reverse'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Card>
        <CardBody>
          {isLoading ? (
            <CenteredLoader label="Loading journal entry…" />
          ) : !entry ? (
            <Stack gap="sm" align="center">
              <Text color="secondary">Entry not found.</Text>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard/accounting/journal')}
              >
                Back to journal
              </Button>
            </Stack>
          ) : (
            <Stack gap="lg">
              <Stack gap="sm" className={accountingChrome.detailHeader}>
                <Inline justify="between" align="start" gap="md">
                  <Stack gap="xs">
                    <Text as="h2" className={accountingChrome.detailEntryNo}>
                      {entry.entryNo}
                    </Text>
                    {entry.narration ? (
                      <Text as="p" className={accountingChrome.detailNarration}>
                        {entry.narration}
                      </Text>
                    ) : null}
                  </Stack>
                  <Inline gap="sm" align="center" flexShrink={0}>
                    <Badge variant={statusVariant(entry.status)}>
                      {formatJournalStatus(entry.status)}
                    </Badge>
                    <Badge variant="info">{formatJournalSource(entry.sourceType)}</Badge>
                  </Inline>
                </Inline>

                <Box className={accountingChrome.detailMetaGrid}>
                  <MetaItem label="Date" value={formatDateShort(entry.txnDate)} />
                  <MetaItem label="Posted" value={formatDateTime(entry.postedAt)} />
                  {entry.reversesEntryId ? (
                    <MetaItem
                      label="Reverses"
                      value={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={accountingChrome.entryLink}
                          onClick={() =>
                            navigate(`/dashboard/accounting/journal/${entry.reversesEntryId}`)
                          }
                        >
                          View original
                        </Button>
                      }
                    />
                  ) : null}
                  {entry.reversedByEntryId ? (
                    <MetaItem
                      label="Reversed by"
                      value={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={accountingChrome.entryLink}
                          onClick={() =>
                            navigate(`/dashboard/accounting/journal/${entry.reversedByEntryId}`)
                          }
                        >
                          View reversal
                        </Button>
                      }
                    />
                  ) : null}
                </Box>
              </Stack>

              <Stack gap="sm">
                <Text as="h3" className={accountingChrome.detailSectionTitle}>
                  Lines
                </Text>
                <Table className={accountingChrome.detailLinesTable}>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Account</TableHeaderCell>
                      <TableHeaderCell>Party</TableHeaderCell>
                      <TableHeaderCell>Memo</TableHeaderCell>
                      <TableHeaderCell className={accountingChrome.detailAmountCol}>
                        Debit
                      </TableHeaderCell>
                      <TableHeaderCell className={accountingChrome.detailAmountCol}>
                        Credit
                      </TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entry.lines.map((l) => (
                      <TableRow key={l.lineIndex}>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={accountingChrome.entryLink}
                            onClick={() => navigate(`/dashboard/accounting/ledger/${l.accountId}`)}
                          >
                            {l.accountCode} · {l.accountName}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Text as="span" className={accountingChrome.detailParty}>
                            {formatLineParty(l.partyType, l.partyDisplayName)}
                          </Text>
                        </TableCell>
                        <TableCell>
                          <Text as="span" className={accountingChrome.detailMemo}>
                            {l.memo?.trim() ? l.memo : '—'}
                          </Text>
                        </TableCell>
                        <TableCell
                          className={cn(
                            accountingChrome.detailAmountCol,
                            !l.debit && accountingChrome.detailAmountMuted,
                          )}
                        >
                          {l.debit ? formatMoney(l.debit) : '—'}
                        </TableCell>
                        <TableCell
                          className={cn(
                            accountingChrome.detailAmountCol,
                            !l.credit && accountingChrome.detailAmountMuted,
                          )}
                        >
                          {l.credit ? formatMoney(l.credit) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className={cn(
                          accountingChrome.detailTotalsCell,
                          accountingChrome.detailAmountCol,
                        )}
                      >
                        Totals
                      </TableCell>
                      <TableCell
                        className={cn(
                          accountingChrome.detailAmountCol,
                          accountingChrome.detailTotalsCell,
                        )}
                      >
                        {formatMoney(entry.totalDebit)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          accountingChrome.detailAmountCol,
                          accountingChrome.detailTotalsCell,
                        )}
                      >
                        {formatMoney(entry.totalCredit)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </Stack>
            </Stack>
          )}
        </CardBody>
      </Card>
    </Stack>
  );
}
