import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Inline,
  PageHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableLoadingRow,
  TableRow,
  Text,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import { useJournalQuery, useReverseJournalMutation } from '../queries/hooks';
import { AccountingTabs } from '../ui/AccountingTabs';
import { formatDateTime, formatDate, formatMoney } from '../model/format';
import styles from '../ui/accounting.module.css';
import { numColBoldStyle, numColStyle } from '../ui/tabNav';

function statusVariant(
  status: 'POSTED' | 'REVERSED' | 'VOID',
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'POSTED') return 'success';
  if (status === 'REVERSED') return 'warning';
  return 'danger';
}

export function JournalEntryDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const entryId = params.entryId ?? '';
  const { error: notifyError, success: notifySuccess } = useNotify;
  const { data: entry, isLoading } = useJournalQuery(entryId);
  const reverseMutation = useReverseJournalMutation({
    onSuccess: (reversal) => {
      notifySuccess(`Reversal posted: ${reversal.entryNo}`);
      navigate(`/dashboard/accounting/journal/${reversal.id}`);
    },
    onError: (e) => {
      notifyError(e instanceof Error ? e.message : 'Failed to reverse entry');
    },
  });

  async function reverse() {
    if (!entry) return;
    const reason = window.prompt(
      'Reason for reversal (optional). The original entry will be marked REVERSED and a mirroring reversal entry will be posted.',
    );
    if (reason == null) return;
    reverseMutation.mutate({ id: entry.id, body: { reason } });
  }

  return (
    <Stack gap="md">
      <Stack gap="md">
        <AccountingTabs />
        <PageHeader
          title="Journal Entry"
          actions={
            entry && entry.status === 'POSTED' ? (
              <Button
                type="button"
                variant="outline"
                onClick={reverse}
                disabled={reverseMutation.isPending}
              >
                {reverseMutation.isPending ? 'Reversing…' : 'Reverse entry'}
              </Button>
            ) : undefined
          }
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/accounting/journal')}
        >
          ← Back to journal
        </Button>
      </Stack>

      <Card>
        <CardBody>
          {isLoading || !entry ? (
            <Table>
              <TableBody>
                <TableLoadingRow colSpan={2} label={isLoading ? 'Loading…' : 'Entry not found'} />
              </TableBody>
            </Table>
          ) : (
            <Stack gap="md">
              <Table>
                <TableBody>
                  <MetaRow label="Entry #" value={entry.entryNo} />
                  <MetaRow label="Transaction Date" value={formatDate(entry.txnDate)} />
                  <MetaRow label="Posted At" value={formatDateTime(entry.postedAt)} />
                  <MetaRow
                    label="Source"
                    value={
                      <Inline gap="xs" align="center">
                        <Badge variant="info">{entry.sourceType}</Badge>
                        {entry.sourceId ? (
                          <Text variant="caption" color="secondary">
                            {entry.sourceId}
                          </Text>
                        ) : null}
                      </Inline>
                    }
                  />
                  <MetaRow
                    label="Status"
                    value={<Badge variant={statusVariant(entry.status)}>{entry.status}</Badge>}
                  />
                  {entry.reversesEntryId ? (
                    <MetaRow
                      label="Reverses"
                      value={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/dashboard/accounting/journal/${entry.reversesEntryId}`)
                          }
                        >
                          {entry.reversesEntryId}
                        </Button>
                      }
                    />
                  ) : null}
                  {entry.reversedByEntryId ? (
                    <MetaRow
                      label="Reversed By"
                      value={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/dashboard/accounting/journal/${entry.reversedByEntryId}`)
                          }
                        >
                          {entry.reversedByEntryId}
                        </Button>
                      }
                    />
                  ) : null}
                  <MetaRow label="Narration" value={entry.narration ?? '—'} />
                </TableBody>
              </Table>

              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Account</TableHeaderCell>
                    <TableHeaderCell>Party</TableHeaderCell>
                    <TableHeaderCell>Memo</TableHeaderCell>
                    <TableHeaderCell style={numColStyle}>Debit</TableHeaderCell>
                    <TableHeaderCell style={numColStyle}>Credit</TableHeaderCell>
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
                          onClick={() => navigate(`/dashboard/accounting/ledger/${l.accountId}`)}
                        >
                          {l.accountCode} · {l.accountName}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Text color="secondary" variant="caption">
                          {l.partyType
                            ? `${l.partyType}${
                                l.partyDisplayName ? ` · ${l.partyDisplayName}` : ''
                              }`
                            : '—'}
                        </Text>
                      </TableCell>
                      <TableCell>
                        <Text color="secondary" variant="caption">
                          {l.memo ?? '—'}
                        </Text>
                      </TableCell>
                      <TableCell style={numColBoldStyle}>
                        {l.debit ? formatMoney(l.debit) : ''}
                      </TableCell>
                      <TableCell style={numColBoldStyle}>
                        {l.credit ? formatMoney(l.credit) : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className={styles.grandTotalRow}>
                    <TableCell colSpan={3} style={numColStyle}>
                      Totals
                    </TableCell>
                    <TableCell style={numColBoldStyle}>{formatMoney(entry.totalDebit)}</TableCell>
                    <TableCell style={numColBoldStyle}>{formatMoney(entry.totalCredit)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Stack>
          )}
        </CardBody>
      </Card>
    </Stack>
  );
}

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <TableRow>
      <TableHeaderCell style={{ width: '12rem' }}>{label}</TableHeaderCell>
      <TableCell>{value}</TableCell>
    </TableRow>
  );
}
