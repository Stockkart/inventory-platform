import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Inline,
  Input,
  PageHeader,
  PaginationBar,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TableLoadingRow,
  TableRow,
  Text,
  type SelectOptionDef,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import type { JournalEntryResponse, JournalSource } from '@inventory-platform/accounting/types';
import { useJournalsQuery } from '../queries/hooks';
import { AccountingTabs } from '../ui/AccountingTabs';
import { numColBoldStyle, numColStyle } from '../ui/tabNav';
import { formatDate, formatMoney } from '../model/format';

const SOURCE_OPTIONS: readonly SelectOptionDef[] = [
  { value: '', label: 'All sources' },
  { value: 'VENDOR_PURCHASE_INVOICE', label: 'Vendor Purchase' },
  { value: 'VENDOR_PURCHASE_RETURN', label: 'Vendor Return' },
  { value: 'SALE', label: 'Sale' },
  { value: 'SALES_RETURN', label: 'Sales Return' },
  { value: 'CUSTOMER_SETTLEMENT', label: 'Customer Settlement' },
  { value: 'VENDOR_PAYMENT', label: 'Vendor Payment' },
  { value: 'INVENTORY_CORRECTION', label: 'Inventory Correction' },
  { value: 'MANUAL', label: 'Manual' },
  { value: 'REVERSAL', label: 'Reversal' },
  { value: 'OPENING_BALANCE', label: 'Opening Balance' },
];

function statusVariant(
  status: JournalEntryResponse['status'],
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'POSTED') return 'success';
  if (status === 'REVERSED') return 'warning';
  return 'danger';
}

export function JournalEntriesPage() {
  const navigate = useNavigate();
  const { error: notifyError } = useNotify;
  const [source, setSource] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, error } = useJournalsQuery({
    sourceType: (source || undefined) as JournalSource | undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    size: 20,
  });

  useEffect(() => {
    if (isError) {
      notifyError(error instanceof Error ? error.message : 'Failed to load journal entries');
    }
  }, [isError, error, notifyError]);

  const entries = useMemo<JournalEntryResponse[]>(() => data?.entries ?? [], [data]);

  return (
    <Stack gap="md">
      <Stack gap="md">
        <PageHeader
          title="Journal Entries"
          description="Every business event creates a balanced journal entry. Filter, drill in, or post a manual entry."
          actions={
            <Button variant="solid" onClick={() => navigate('/dashboard/accounting/journal/new')}>
              Manual entry
            </Button>
          }
        />
        <AccountingTabs />
        <Inline gap="sm">
          <Inline gap="sm" align="center">
            <Text variant="label" color="secondary">
              Source
            </Text>
            <Select
              id="source"
              value={source}
              options={SOURCE_OPTIONS}
              onChange={(e) => {
                setPage(0);
                setSource(e.target.value);
              }}
            />
          </Inline>
          <Inline gap="sm" align="center">
            <Text variant="label" color="secondary">
              From
            </Text>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => {
                setPage(0);
                setFrom(e.target.value);
              }}
            />
          </Inline>
          <Inline gap="sm" align="center">
            <Text variant="label" color="secondary">
              To
            </Text>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => {
                setPage(0);
                setTo(e.target.value);
              }}
            />
          </Inline>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSource('');
              setFrom('');
              setTo('');
              setPage(0);
            }}
            disabled={!source && !from && !to}
          >
            Clear
          </Button>
        </Inline>
      </Stack>

      <Card>
        <CardBody>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Entry #</TableHeaderCell>
                <TableHeaderCell>Source</TableHeaderCell>
                <TableHeaderCell>Narration</TableHeaderCell>
                <TableHeaderCell style={numColStyle}>Debit</TableHeaderCell>
                <TableHeaderCell style={numColStyle}>Credit</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableLoadingRow colSpan={7} label="Loading journal entries…" />
              ) : entries.length === 0 ? (
                <TableEmptyRow colSpan={7} message="No journal entries match your filters." />
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.txnDate)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/dashboard/accounting/journal/${entry.id}`)}
                      >
                        {entry.entryNo}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="info">{entry.sourceType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Text color="secondary" variant="caption">
                        {entry.narration ?? '—'}
                      </Text>
                    </TableCell>
                    <TableCell style={numColBoldStyle}>{formatMoney(entry.totalDebit)}</TableCell>
                    <TableCell style={numColBoldStyle}>{formatMoney(entry.totalCredit)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(entry.status)}>{entry.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {entries.length > 0 || isLoading ? (
            <PaginationBar
              page={data?.page ?? page}
              totalPages={Math.max(data?.totalPages ?? 1, 1)}
              totalItems={data?.totalItems ?? 0}
              disabled={isLoading}
              onPageChange={setPage}
              aria-label="Journal entry pages"
            />
          ) : null}
        </CardBody>
      </Card>
    </Stack>
  );
}
