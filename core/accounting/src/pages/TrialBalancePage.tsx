import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Input,
  PageHeader,
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
import type {
  AccountType,
  TrialBalanceResponse,
  TrialBalanceRow,
} from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import { formatMoney, formatTurnover, todayLocalDate } from '../model/format';

const GROUP_ORDER: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

const GROUP_LABEL: Record<AccountType, string> = {
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  EQUITY: 'Equity',
  REVENUE: 'Revenue',
  EXPENSE: 'Expenses',
};

export function TrialBalancePage() {
  const { error: notifyError } = useNotify;
  const [asOf, setAsOf] = useState<string>(todayLocalDate());
  const [data, setData] = useState<TrialBalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await accountingApi.trialBalance(asOf || undefined);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) {
          notifyError(e instanceof Error ? e.message : 'Failed to load trial balance');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asOf, notifyError]);

  const grouped = useMemo(() => {
    const rows = data?.rows ?? [];
    const out: Record<AccountType, TrialBalanceRow[]> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSE: [],
    };
    for (const r of rows) {
      out[r.accountType].push(r);
    }
    return out;
  }, [data]);

  function groupSubtotal(rows: TrialBalanceRow[]) {
    let dr = 0;
    let cr = 0;
    rows.forEach((r) => {
      dr += r.debitBalance;
      cr += r.creditBalance;
    });
    return { dr, cr };
  }

  const isBalanced = !!data && Math.abs(data.totalDebit - data.totalCredit) < 0.005;
  const totalDebit = data?.totalDebit ?? 0;
  const totalCredit = data?.totalCredit ?? 0;
  const groups = GROUP_ORDER.flatMap((type) => {
    const rows = grouped[type];
    if (rows.length === 0) return [];
    return [{ type, rows, sub: groupSubtotal(rows) }];
  });

  return (
    <Stack gap="md">
      <AccountingTabs />

      <PageHeader description="Closing balances as of a date. Debits must equal credits." />

      <Box className={accountingChrome.partiesFilterBar}>
        <Box className={accountingChrome.partiesFilterField}>
          <Text as="span" className={accountingChrome.partiesFilterLabel}>
            As of
          </Text>
          <Input
            aria-label="As of date"
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className={accountingChrome.tbAsOfInput}
          />
        </Box>
      </Box>

      {!loading && data && data.rows.length > 0 ? (
        <Box className={accountingChrome.partiesKpiGrid}>
          <Box className={accountingChrome.overviewKpiCard}>
            <Text as="span" className={accountingChrome.overviewKpiLabel}>
              Total debit
            </Text>
            <Text as="span" className={accountingChrome.overviewKpiValue}>
              ₹{formatMoney(totalDebit)}
            </Text>
          </Box>
          <Box className={accountingChrome.overviewKpiCard}>
            <Text as="span" className={accountingChrome.overviewKpiLabel}>
              Total credit
            </Text>
            <Text as="span" className={accountingChrome.overviewKpiValue}>
              ₹{formatMoney(totalCredit)}
            </Text>
          </Box>
        </Box>
      ) : null}

      <Card>
        <CardBody>
          {loading ? (
            <Table>
              <TableBody>
                <TableLoadingRow colSpan={4} label="Loading trial balance…" />
              </TableBody>
            </Table>
          ) : !data || data.rows.length === 0 ? (
            <Table>
              <TableBody>
                <TableEmptyRow
                  colSpan={4}
                  message="No postings yet. Once you register vendor invoices or post journals, the trial balance will populate."
                />
              </TableBody>
            </Table>
          ) : (
            <Stack gap="md">
              <Table className={accountingChrome.tbTable}>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell className={accountingChrome.tbCodeCol}>Code</TableHeaderCell>
                    <TableHeaderCell className={accountingChrome.tbAccountCol}>
                      Account
                    </TableHeaderCell>
                    <TableHeaderCell className={accountingChrome.tbNumCol}>Debit</TableHeaderCell>
                    <TableHeaderCell className={accountingChrome.tbNumCol}>Credit</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groups.map((group, index) => (
                    <RowsForType
                      key={group.type}
                      type={group.type}
                      rows={group.rows}
                      subDr={group.sub.dr}
                      subCr={group.sub.cr}
                      isFirst={index === 0}
                    />
                  ))}
                  <TableRow>
                    <TableCell colSpan={2} className={accountingChrome.tbTotalsLabel}>
                      Totals
                    </TableCell>
                    <TableCell
                      className={cn(accountingChrome.tbNumCol, accountingChrome.tbTotalsRow)}
                    >
                      {formatMoney(totalDebit)}
                    </TableCell>
                    <TableCell
                      className={cn(accountingChrome.tbNumCol, accountingChrome.tbTotalsRow)}
                    >
                      {formatMoney(totalCredit)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Box className={accountingChrome.tbStatus}>
                <Badge variant={isBalanced ? 'success' : 'warning'}>
                  {isBalanced ? 'Balanced' : 'Out of balance'}
                </Badge>
                <Text as="span" variant="caption" color="secondary">
                  {isBalanced
                    ? 'Total debits equal total credits.'
                    : 'Investigate before posting further entries.'}
                </Text>
              </Box>
            </Stack>
          )}
        </CardBody>
      </Card>
    </Stack>
  );
}

function AmountCell({ value }: { value: number }) {
  const label = formatTurnover(value);
  return (
    <TableCell
      className={cn(accountingChrome.tbNumCol, label === '—' && accountingChrome.tbNumMuted)}
    >
      {label}
    </TableCell>
  );
}

function RowsForType({
  type,
  rows,
  subDr,
  subCr,
  isFirst,
}: {
  type: AccountType;
  rows: TrialBalanceRow[];
  subDr: number;
  subCr: number;
  isFirst?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <>
      <TableRow>
        <TableCell
          colSpan={4}
          className={cn(accountingChrome.tbGroupRow, isFirst && accountingChrome.tbGroupRowFirst)}
        >
          {GROUP_LABEL[type]}
        </TableCell>
      </TableRow>
      {rows.map((r) => (
        <TableRow key={r.accountId}>
          <TableCell className={accountingChrome.tbCodeCol}>{r.accountCode}</TableCell>
          <TableCell className={accountingChrome.tbAccountCol}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={accountingChrome.tbAccountLink}
              onClick={() => navigate(`/dashboard/accounting/ledger/${r.accountId}`)}
            >
              {r.accountName}
            </Button>
          </TableCell>
          <AmountCell value={r.debitBalance} />
          <AmountCell value={r.creditBalance} />
        </TableRow>
      ))}
      <TableRow>
        <TableCell colSpan={2} className={accountingChrome.tbSubtotalLabel}>
          {GROUP_LABEL[type]} subtotal
        </TableCell>
        <TableCell className={cn(accountingChrome.tbNumCol, accountingChrome.tbSubtotalRow)}>
          {formatMoney(subDr)}
        </TableCell>
        <TableCell className={cn(accountingChrome.tbNumCol, accountingChrome.tbSubtotalRow)}>
          {formatMoney(subCr)}
        </TableCell>
      </TableRow>
    </>
  );
}
