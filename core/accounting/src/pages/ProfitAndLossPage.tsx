import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
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
import type { ProfitAndLossResponse } from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import { formatDateShort, formatMoney, todayLocalDate } from '../model/format';

function monthStart(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

export function ProfitAndLossPage() {
  const navigate = useNavigate();
  const { error: notifyError } = useNotify;
  const [fromInput, setFromInput] = useState(monthStart());
  const [toInput, setToInput] = useState(todayLocalDate());
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayLocalDate());
  const [data, setData] = useState<ProfitAndLossResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await accountingApi.profitAndLoss(from, to);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) {
          notifyError(e instanceof Error ? e.message : 'Failed to load P&L');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to, notifyError]);

  function handleSearch() {
    setFrom(fromInput);
    setTo(toInput);
  }

  const netProfit = data?.netProfit ?? 0;

  return (
    <Stack gap="md">
      <AccountingTabs />

      <PageHeader description="Revenue and expenses for the selected period." />

      <Box className={accountingChrome.partiesFilterBar}>
        <Box className={accountingChrome.partiesFilterDates}>
          <Box className={accountingChrome.partiesFilterField}>
            <Text as="span" className={accountingChrome.partiesFilterLabel}>
              From
            </Text>
            <Input
              aria-label="From date"
              type="date"
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
              className={accountingChrome.tbAsOfInput}
              disabled={loading}
            />
          </Box>
          <Box className={accountingChrome.partiesFilterField}>
            <Text as="span" className={accountingChrome.partiesFilterLabel}>
              To
            </Text>
            <Input
              aria-label="To date"
              type="date"
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              className={accountingChrome.tbAsOfInput}
              disabled={loading}
            />
          </Box>
          <Button
            type="button"
            variant="solid"
            onClick={handleSearch}
            loading={loading}
            disabled={loading || !fromInput || !toInput}
          >
            Search
          </Button>
        </Box>
      </Box>

      {loading && !data ? (
        <Card>
          <CardBody>
            <Table>
              <TableBody>
                <TableLoadingRow colSpan={3} label="Loading P&L…" />
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      ) : !data ? (
        <Card>
          <CardBody>
            <Text color="secondary">No data for this period.</Text>
          </CardBody>
        </Card>
      ) : (
        <Stack gap="md">
          <Box className={accountingChrome.pnlKpiGrid}>
            <Box className={accountingChrome.overviewKpiCard}>
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Total revenue
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                ₹{formatMoney(data.totalRevenue)}
              </Text>
            </Box>
            <Box className={accountingChrome.overviewKpiCard}>
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Total expenses
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                ₹{formatMoney(data.totalExpense)}
              </Text>
            </Box>
            <Box className={accountingChrome.overviewKpiCard}>
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Net profit
              </Text>
              <Text
                as="span"
                className={cn(
                  accountingChrome.overviewKpiValue,
                  netProfit >= 0
                    ? accountingChrome.overviewKpiValuePositive
                    : accountingChrome.overviewKpiValueWarning,
                )}
              >
                ₹{formatMoney(netProfit)}
              </Text>
            </Box>
          </Box>

          <ReportSection
            title="Revenue"
            rows={data.revenueLines}
            emptyLabel="No revenue in this period."
          />
          <ReportSection
            title="Expenses"
            rows={data.expenseLines}
            emptyLabel="No expenses in this period."
          />

          <Text variant="caption" color="secondary">
            Period {formatDateShort(data.from)} – {formatDateShort(data.to)} ·{' '}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={accountingChrome.entryLink}
              onClick={() => navigate('/dashboard/accounting/trial-balance')}
            >
              Trial balance
            </Button>
          </Text>
        </Stack>
      )}
    </Stack>
  );
}

function ReportSection({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: ProfitAndLossResponse['revenueLines'];
  emptyLabel: string;
}) {
  const navigate = useNavigate();
  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <Card>
      <CardBody>
        <Stack gap="sm">
          <Text as="h3" className={accountingChrome.overviewSectionTitle}>
            {title}
          </Text>
          {rows.length === 0 ? (
            <Text as="p" className={accountingChrome.reportEmpty}>
              {emptyLabel}
            </Text>
          ) : (
            <Table className={accountingChrome.tbTable}>
              <TableHead>
                <TableRow>
                  <TableHeaderCell className={accountingChrome.tbCodeCol}>Code</TableHeaderCell>
                  <TableHeaderCell className={accountingChrome.tbAccountCol}>
                    Account
                  </TableHeaderCell>
                  <TableHeaderCell className={accountingChrome.tbNumCol}>Amount</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
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
                    <TableCell className={accountingChrome.tbNumCol}>
                      {formatMoney(r.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={2} className={accountingChrome.tbTotalsLabel}>
                    Subtotal
                  </TableCell>
                  <TableCell
                    className={cn(accountingChrome.tbNumCol, accountingChrome.tbTotalsRow)}
                  >
                    {formatMoney(total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
}
