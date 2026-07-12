import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Box,
  Button,
  Card,
  CardBody,
  Input,
  PageHeader,
  SearchInput,
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
  cn,
  accountingChrome,
} from '@inventory-platform/ui-kit';
import { accountingApi } from '../api/accounting.api';
import { useNotify } from '@inventory-platform/session';
import type { PartySummariesResponse } from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import { formatDateShort, formatMoney, formatTurnover } from '../model/format';

/** Subsidiary ledgers exist for vendors and customers; SHOP entries don't get a per-party view. */
export type SubsidiaryPartyType = 'VENDOR' | 'CUSTOMER';

const COPY: Record<
  SubsidiaryPartyType,
  {
    title: string;
    subtitle: string;
    balanceCol: string;
    netLabel: string;
    emptyLabel: string;
    searchPlaceholder: string;
  }
> = {
  VENDOR: {
    title: 'Vendors',
    subtitle:
      'Subsidiary ledger of Sundry Creditors. Each row is one supplier; the balance is what you owe them as of today.',
    balanceCol: 'Payable',
    netLabel: 'Total payable',
    emptyLabel: 'No vendor activity yet.',
    searchPlaceholder: 'Search vendors…',
  },
  CUSTOMER: {
    title: 'Customers',
    subtitle:
      'Subsidiary ledger of Sundry Debtors. Each row is one customer; the balance is what they owe you as of today.',
    balanceCol: 'Receivable',
    netLabel: 'Total receivable',
    emptyLabel: 'No customer activity yet.',
    searchPlaceholder: 'Search customers…',
  },
};

export interface PartiesPageProps {
  partyType: SubsidiaryPartyType;
}

export function PartiesPage({ partyType }: PartiesPageProps) {
  const navigate = useNavigate();
  const copy = COPY[partyType];
  const { error: notifyError } = useNotify;

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [data, setData] = useState<PartySummariesResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await accountingApi.parties({
        type: partyType,
        from: from || undefined,
        to: to || undefined,
      });
      setData(res);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to load parties');
    } finally {
      setLoading(false);
    }
  }, [partyType, from, to, notifyError]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleSearch = () => {
    setSearch(searchInput.trim());
  };

  const filtered = useMemo(() => {
    const rows = data?.parties ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (p) =>
        (p.partyDisplayName ?? '').toLowerCase().includes(q) ||
        p.partyRefId.toLowerCase().includes(q),
    );
  }, [data, search]);

  const partyHref = (refId: string) =>
    `/dashboard/accounting/${partyType.toLowerCase()}s/${encodeURIComponent(refId)}`;

  const totalBalance = data?.totalBalance ?? 0;

  return (
    <Stack gap="md">
      <AccountingTabs />
      <PageHeader description={copy.subtitle} />

      <Box className={accountingChrome.partiesFilterBar}>
        <Box className={accountingChrome.partiesFilterSearch}>
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            onSearch={handleSearch}
            showSearchButton
            buttonVariant="solid"
            grow
            placeholder={copy.searchPlaceholder}
            disabled={loading}
            searchLabel={loading ? 'Searching…' : 'Search'}
          />
        </Box>
        <Box className={accountingChrome.partiesFilterDates}>
          <Box className={accountingChrome.partiesFilterField}>
            <Text as="span" className={accountingChrome.partiesFilterLabel}>
              From
            </Text>
            <Input
              aria-label="From date"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Box>
          <Box className={accountingChrome.partiesFilterField}>
            <Text as="span" className={accountingChrome.partiesFilterLabel}>
              To
            </Text>
            <Input
              aria-label="To date"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Box>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFrom('');
              setTo('');
            }}
            disabled={!from && !to}
          >
            Clear
          </Button>
        </Box>
      </Box>

      <Box className={accountingChrome.partiesKpiGrid}>
        <Box className={accountingChrome.overviewKpiCard}>
          <Text as="span" className={accountingChrome.overviewKpiLabel}>
            {copy.netLabel}
          </Text>
          <Text
            as="span"
            className={cn(
              accountingChrome.overviewKpiValue,
              totalBalance < 0 && accountingChrome.overviewKpiValueWarning,
            )}
          >
            ₹{formatMoney(totalBalance)}
          </Text>
          <Text variant="caption" color="secondary">
            Debit {formatMoney(data?.totalDebit ?? 0)} · Credit{' '}
            {formatMoney(data?.totalCredit ?? 0)}
          </Text>
        </Box>
        <Box className={accountingChrome.overviewKpiCard}>
          <Text as="span" className={accountingChrome.overviewKpiLabel}>
            Active parties
          </Text>
          <Text as="span" className={accountingChrome.overviewKpiValue}>
            {data?.parties.length ?? 0}
          </Text>
          <Text variant="caption" color="secondary">
            {filtered.length === (data?.parties.length ?? 0)
              ? 'All shown'
              : `${filtered.length} match search`}
          </Text>
        </Box>
      </Box>

      <Card>
        <CardBody>
          <Table className={accountingChrome.partiesTable}>
            <TableHead>
              <TableRow>
                <TableHeaderCell className={accountingChrome.partiesNameCol}>
                  {partyType === 'VENDOR' ? 'Vendor' : 'Customer'}
                </TableHeaderCell>
                <TableHeaderCell className={accountingChrome.partiesNumCol}>Debit</TableHeaderCell>
                <TableHeaderCell className={accountingChrome.partiesNumCol}>Credit</TableHeaderCell>
                <TableHeaderCell className={accountingChrome.partiesOwedCol}>
                  {copy.balanceCol}
                </TableHeaderCell>
                <TableHeaderCell className={accountingChrome.partiesActivityCol}>
                  Last activity
                </TableHeaderCell>
                <TableHeaderCell className={accountingChrome.partiesTxnsCol}>Txns</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableLoadingRow colSpan={6} label="Loading parties…" />
              ) : filtered.length === 0 ? (
                <TableEmptyRow
                  colSpan={6}
                  message={
                    (data?.parties.length ?? 0) === 0
                      ? copy.emptyLabel
                      : 'No parties match the search.'
                  }
                />
              ) : (
                filtered.map((p) => {
                  const debitLabel = formatTurnover(p.debitTurnover);
                  const creditLabel = formatTurnover(p.creditTurnover);
                  return (
                    <TableRow key={p.partyRefId}>
                      <TableCell className={accountingChrome.partiesNameCol}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={accountingChrome.entryLink}
                          onClick={() => navigate(partyHref(p.partyRefId))}
                        >
                          {p.partyDisplayName || `Party ${p.partyRefId}`}
                        </Button>
                      </TableCell>
                      <TableCell
                        className={cn(
                          accountingChrome.partiesNumCol,
                          debitLabel === '—' && accountingChrome.ledgerAmountMuted,
                        )}
                      >
                        {debitLabel}
                      </TableCell>
                      <TableCell
                        className={cn(
                          accountingChrome.partiesNumCol,
                          creditLabel === '—' && accountingChrome.ledgerAmountMuted,
                        )}
                      >
                        {creditLabel}
                      </TableCell>
                      <TableCell className={accountingChrome.partiesOwedCol}>
                        {formatMoney(p.balance)}
                      </TableCell>
                      <TableCell className={accountingChrome.partiesActivityCol}>
                        {formatDateShort(p.lastTxnDate)}
                      </TableCell>
                      <TableCell className={accountingChrome.partiesTxnsCol}>
                        {p.txnCount}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </Stack>
  );
}

export function VendorsPage() {
  return <PartiesPage partyType="VENDOR" />;
}

export function CustomersPage() {
  return <PartiesPage partyType="CUSTOMER" />;
}
