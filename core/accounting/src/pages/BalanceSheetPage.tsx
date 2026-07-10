import { useEffect, useState } from 'react';
import {
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
import type {
  BalanceSheetResponse,
  FinancialReportLineDto,
} from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import { formatDate, formatMoney, todayLocalDate } from '../model/format';
import { subTotalCellStyle } from '../ui/accountingStyles';
import { numColBoldStyle, numColStyle } from '../ui/tabNav';

export function BalanceSheetPage() {
  const { error: notifyError } = useNotify;
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

  return (
    <Stack gap="md">
      <Stack gap="md">
        <AccountingTabs />
        <PageHeader
          title="Balance Sheet"
          description="Assets, liabilities, and equity as of the selected date (from trial balance)."
        />
        <Inline gap="sm">
          <Text variant="label" color="secondary">
            As of
          </Text>
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </Inline>
      </Stack>

      {loading ? (
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
                    Total assets
                  </Text>
                  <Text variant="heading2" weight="bold">
                    ₹ {formatMoney(data.totalAssets)}
                  </Text>
                </Stack>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <Stack gap="xs">
                  <Text variant="caption" color="secondary">
                    Liabilities + equity
                  </Text>
                  <Text variant="heading2" weight="bold">
                    ₹ {formatMoney(data.totalLiabilitiesAndEquity)}
                  </Text>
                </Stack>
              </CardBody>
            </Card>
            {Math.abs(data.imbalance) > 0.01 ? (
              <Card>
                <CardBody>
                  <Stack gap="xs">
                    <Text variant="caption" color="secondary">
                      Imbalance
                    </Text>
                    <Text variant="heading2" weight="bold" color="danger">
                      ₹ {formatMoney(data.imbalance)}
                    </Text>
                  </Stack>
                </CardBody>
              </Card>
            ) : null}
          </Grid>

          <BsSection title="Assets" rows={data.assets} total={data.totalAssets} />
          <BsSection title="Liabilities" rows={data.liabilities} total={data.totalLiabilities} />
          <BsSection title="Equity" rows={data.equity} total={data.totalEquity} />

          <Text variant="caption" color="secondary">
            As of {formatDate(data.asOf)}
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
  return (
    <Card>
      <CardBody>
        <Stack gap="sm">
          <Text variant="title" weight="bold">
            {title}
          </Text>
          {rows.length === 0 ? (
            <Text color="secondary" align="center">
              No balances
            </Text>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Code</TableHeaderCell>
                  <TableHeaderCell>Account</TableHeaderCell>
                  <TableHeaderCell style={numColStyle}>Balance</TableHeaderCell>
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
                    Total {title.toLowerCase()}
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
