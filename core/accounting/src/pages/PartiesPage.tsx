import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  Card,
  CardBody,
  Grid,
  Inline,
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
} from '@inventory-platform/ui-kit';
import { accountingApi } from '../api/accounting.api';
import { useNotify } from '@inventory-platform/session';
import type { PartySummariesResponse } from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import { formatDate, formatMoney } from '../model/format';
import styles from '../ui/accounting.module.css';

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
  }
> = {
  VENDOR: {
    title: 'Vendors',
    subtitle:
      'Subsidiary ledger of Sundry Creditors. Each row is one supplier; the balance is what you owe them as of today.',
    balanceCol: 'Owed to vendor',
    netLabel: 'Total payable',
    emptyLabel: 'No vendor activity yet.',
  },
  CUSTOMER: {
    title: 'Customers',
    subtitle:
      'Subsidiary ledger of Sundry Debtors. Each row is one customer; the balance is what they owe you as of today.',
    balanceCol: 'Owed by customer',
    netLabel: 'Total receivable',
    emptyLabel: 'No customer activity yet.',
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

  return (
    <Stack gap="md" className={styles.page}>
      <Stack gap="md">
        <PageHeader title={copy.title} description={copy.subtitle} />
        <AccountingTabs />
        <Inline gap="sm" className={styles.toolbar}>
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            onSearch={handleSearch}
            showSearchButton
            placeholder={`Search ${partyType === 'VENDOR' ? 'vendors' : 'customers'}…`}
            className={styles.acctSearch}
          />
          <FormFieldRow label="From">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </FormFieldRow>
          <FormFieldRow label="To">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </FormFieldRow>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFrom('');
              setTo('');
            }}
            disabled={!from && !to}
          >
            Clear dates
          </Button>
        </Inline>
      </Stack>

      <Grid columns={2} gap="md" className={styles.kpiRow}>
        <Card>
          <CardBody>
            <Stack gap="xs">
              <Text variant="caption" color="secondary">
                {copy.netLabel}
              </Text>
              <Text variant="heading2" weight="bold">
                {formatMoney(data?.totalBalance ?? 0)}
              </Text>
              <Text variant="caption" color="secondary">
                Total debit {formatMoney(data?.totalDebit ?? 0)} · Total credit{' '}
                {formatMoney(data?.totalCredit ?? 0)}
              </Text>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stack gap="xs">
              <Text variant="caption" color="secondary">
                Active parties
              </Text>
              <Text variant="heading2" weight="bold">
                {data?.parties.length ?? 0}
              </Text>
              <Text variant="caption" color="secondary">
                {filtered.length === (data?.parties.length ?? 0)
                  ? 'All shown'
                  : `${filtered.length} match search`}
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Card>
        <CardBody>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{partyType === 'VENDOR' ? 'Vendor' : 'Customer'}</TableHeaderCell>
                <TableHeaderCell className={styles.right}>Debit</TableHeaderCell>
                <TableHeaderCell className={styles.right}>Credit</TableHeaderCell>
                <TableHeaderCell className={styles.right}>{copy.balanceCol}</TableHeaderCell>
                <TableHeaderCell>Last activity</TableHeaderCell>
                <TableHeaderCell className={styles.right}>Txns</TableHeaderCell>
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
                filtered.map((p) => (
                  <TableRow key={p.partyRefId}>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(partyHref(p.partyRefId))}
                      >
                        {p.partyDisplayName || `Party ${p.partyRefId}`}
                      </Button>
                    </TableCell>
                    <TableCell className={`${styles.right} ${styles.number}`}>
                      {p.debitTurnover ? formatMoney(p.debitTurnover) : '—'}
                    </TableCell>
                    <TableCell className={`${styles.right} ${styles.number}`}>
                      {p.creditTurnover ? formatMoney(p.creditTurnover) : '—'}
                    </TableCell>
                    <TableCell className={`${styles.right} ${styles.number}`}>
                      {formatMoney(p.balance)}
                    </TableCell>
                    <TableCell>
                      <Text color="secondary" variant="caption">
                        {formatDate(p.lastTxnDate)}
                      </Text>
                    </TableCell>
                    <TableCell className={`${styles.right} ${styles.number}`}>
                      {p.txnCount}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </Stack>
  );
}

function FormFieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Inline gap="sm" align="center">
      <Text variant="label" color="secondary">
        {label}
      </Text>
      {children}
    </Inline>
  );
}

export function VendorsPage() {
  return <PartiesPage partyType="VENDOR" />;
}

export function CustomersPage() {
  return <PartiesPage partyType="CUSTOMER" />;
}
