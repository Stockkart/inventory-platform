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
import type {
  BalanceSheetResponse,
  FinancialReportLineDto,
} from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import { formatDateShort, formatMoney, todayLocalDate } from '../model/format';

export function BalanceSheetPage() {
  const navigate = useNavigate();
  const { error: notifyError } = useNotify;
  const [asOfInput, setAsOfInput] = useState(todayLocalDate());
  const [asOf, setAsOf] = useState(todayLocalDate());
  const [data, setData] = useState<BalanceSheetResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await accountingApi.balanceSheet(asOf || undefined);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) {
          notifyError(e instanceof Error ? e.message : 'Failed to load balance sheet');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asOf, notifyError]);

  function handleSearch() {
    setAsOf(asOfInput);
  }

  const showImbalance = !!data && Math.abs(data.imbalance) > 0.01;

  return (
    <Stack gap="md">
      <AccountingTabs />

      <PageHeader description="Assets, liabilities, and equity as of the selected date." />

      <Box className={accountingChrome.partiesFilterBar}>
        <Box className={accountingChrome.partiesFilterDates}>
          <Box className={accountingChrome.partiesFilterField}>
            <Text as="span" className={accountingChrome.partiesFilterLabel}>
              As of
            </Text>
            <Input
              aria-label="As of date"
              type="date"
              value={asOfInput}
              onChange={(e) => setAsOfInput(e.target.value)}
              className={accountingChrome.tbAsOfInput}
              disabled={loading}
            />
          </Box>
          <Button
            type="button"
            variant="solid"
            onClick={handleSearch}
            loading={loading}
            disabled={loading || !asOfInput}
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
                <TableLoadingRow colSpan={3} label="Loading balance sheet…" />
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      ) : !data ? (
        <Card>
          <CardBody>
            <Text color="secondary">No data for this date.</Text>
          </CardBody>
        </Card>
      ) : (
        <Stack gap="md">
          <Box className={accountingChrome.pnlKpiGrid}>
            <Box className={accountingChrome.overviewKpiCard}>
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Total assets
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                ₹{formatMoney(data.totalAssets)}
              </Text>
            </Box>
            <Box className={accountingChrome.overviewKpiCard}>
              <Text as="span" className={accountingChrome.overviewKpiLabel}>
                Liabilities + equity
              </Text>
              <Text as="span" className={accountingChrome.overviewKpiValue}>
                ₹{formatMoney(data.totalLiabilitiesAndEquity)}
              </Text>
            </Box>
            {showImbalance ? (
              <Box className={accountingChrome.overviewKpiCard}>
                <Text as="span" className={accountingChrome.overviewKpiLabel}>
                  Imbalance
                </Text>
                <Text
                  as="span"
                  className={cn(
                    accountingChrome.overviewKpiValue,
                    accountingChrome.overviewKpiValueWarning,
                  )}
                >
                  ₹{formatMoney(data.imbalance)}
                </Text>
              </Box>
            ) : (
              <Box className={accountingChrome.overviewKpiCard}>
                <Text as="span" className={accountingChrome.overviewKpiLabel}>
                  Status
                </Text>
                <Text
                  as="span"
                  className={cn(
                    accountingChrome.overviewKpiValue,
                    accountingChrome.overviewKpiValuePositive,
                  )}
                >
                  Balanced
                </Text>
              </Box>
            )}
          </Box>

          <BsSection title="Assets" rows={data.assets} total={data.totalAssets} />
          <BsSection title="Liabilities" rows={data.liabilities} total={data.totalLiabilities} />
          <BsSection title="Equity" rows={data.equity} total={data.totalEquity} />

          <Text variant="caption" color="secondary">
            As of {formatDateShort(data.asOf)} ·{' '}
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

function BsSection({
  title,
  rows,
  total,
}: {
  title: string;
  rows: FinancialReportLineDto[];
  total: number;
}) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardBody>
        <Stack gap="sm">
          <Text as="h3" className={accountingChrome.overviewSectionTitle}>
            {title}
          </Text>
          {rows.length === 0 ? (
            <Text as="p" className={accountingChrome.reportEmpty}>
              No balances in this section.
            </Text>
          ) : (
            <Table className={accountingChrome.tbTable}>
              <TableHead>
                <TableRow>
                  <TableHeaderCell className={accountingChrome.tbCodeCol}>Code</TableHeaderCell>
                  <TableHeaderCell className={accountingChrome.tbAccountCol}>
                    Account
                  </TableHeaderCell>
                  <TableHeaderCell className={accountingChrome.tbNumCol}>Balance</TableHeaderCell>
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
                    Total {title.toLowerCase()}
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
