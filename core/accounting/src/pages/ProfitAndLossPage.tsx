import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  Card,
  CardBody,
  Grid,
  Inline,
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
} from '@inventory-platform/ui-kit';
import { accountingApi } from '../api/accounting.api';
import { useNotify } from '@inventory-platform/session';
import type { ProfitAndLossResponse } from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import { formatDate, formatMoney, todayLocalDate } from '../model/format';
import { subTotalCellStyle } from '../ui/accountingStyles';
import { numColBoldStyle, numColStyle } from '../ui/tabNav';

function monthStart(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

export function ProfitAndLossPage() {
  const navigate = useNavigate();
  const { error: notifyError } = useNotify;
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

  const netProfitColor = useMemo(() => {
    if (!data) return 'primary' as const;
    return data.netProfit >= 0 ? ('success' as const) : ('danger' as const);
  }, [data]);

  return (
    <Stack gap="md">
      <Stack gap="md">
        <AccountingTabs />
        <PageHeader
          title="Profit & Loss"
          description="Revenue and expense accounts for the selected period (turnover, not closing balances)."
        />
        <Inline gap="sm">
          <Text variant="label" color="secondary">
            From
          </Text>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Text variant="label" color="secondary">
            To
          </Text>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </Inline>
      </Stack>

      {loading ? (
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
            <Text color="secondary" align="center">
              No data.
            </Text>
          </CardBody>
        </Card>
      ) : (
        <Stack gap="md">
          <Grid gap="md">
            <Card>
              <CardBody>
                <Stack gap="xs">
                  <Text variant="caption" color="secondary">
                    Total revenue
                  </Text>
                  <Text variant="heading2" weight="bold">
                    ₹ {formatMoney(data.totalRevenue)}
                  </Text>
                </Stack>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stack gap="xs">
                  <Text variant="caption" color="secondary">
                    Total expenses
                  </Text>
                  <Text variant="heading2" weight="bold">
                    ₹ {formatMoney(data.totalExpense)}
                  </Text>
                </Stack>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stack gap="xs">
                  <Text variant="caption" color="secondary">
                    Net profit
                  </Text>
                  <Text variant="heading2" weight="bold" color={netProfitColor}>
                    ₹ {formatMoney(data.netProfit)}
                  </Text>
                </Stack>
              </CardBody>
            </Card>
          </Grid>

          <ReportSection
            title="Revenue"
            rows={data.revenueLines}
            emptyLabel="No revenue in period"
          />
          <ReportSection
            title="Expenses"
            rows={data.expenseLines}
            emptyLabel="No expenses in period"
          />

          <Inline gap="xs" align="center">
            <Text variant="caption" color="secondary">
              Period {formatDate(data.from)} – {formatDate(data.to)} ·
            </Text>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/accounting/trial-balance')}
            >
              Trial balance
            </Button>
          </Inline>
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
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <Card>
      <CardBody>
        <Stack gap="sm">
          <Text variant="title" weight="bold">
            {title}
          </Text>
          {rows.length === 0 ? (
            <Text color="secondary" align="center">
              {emptyLabel}
            </Text>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Code</TableHeaderCell>
                  <TableHeaderCell>Account</TableHeaderCell>
                  <TableHeaderCell style={numColStyle}>Amount</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.accountId}>
                    <TableCell>{r.accountCode}</TableCell>
                    <TableCell>{r.accountName}</TableCell>
                    <TableCell style={numColBoldStyle}>{formatMoney(r.amount)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={2} style={subTotalCellStyle}>
                    Subtotal
                  </TableCell>
                  <TableCell style={{ ...numColBoldStyle, ...subTotalCellStyle }}>
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
