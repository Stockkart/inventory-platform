import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Button,
  Card,
  CardBody,
  Inline,
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
} from '@inventory-platform/ui-kit';
import { accountingApi } from '../api/accounting.api';
import { useNotify } from '@inventory-platform/session';
import type {
  AccountType,
  TrialBalanceResponse,
  TrialBalanceRow,
} from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import { formatDate, formatMoney, todayLocalDate } from '../model/format';
import {
  grandTotalCellStyle,
  groupHeadingCellStyle,
  subTotalCellStyle,
} from '../ui/accountingStyles';
import { numColBoldStyle, numColStyle } from '../ui/tabNav';

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

  return (
    <Stack gap="md">
      <Stack gap="md">
        <AccountingTabs />
        <PageHeader
          title="Trial Balance"
          description="Closing balances as of a date. Total Debit must equal Total Credit — if they don't, no entry can be unbalanced."
        />
        <Inline gap="sm">
          <Text variant="label" color="secondary">
            As of
          </Text>
          <Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          {data ? (
            <Text variant="caption" color="secondary">
              · {formatDate(data.asOf)}
            </Text>
          ) : null}
        </Inline>
      </Stack>

      <Card>
        <CardBody>
          {loading ? (
            <Table>
              <TableBody>
                <TableLoadingRow colSpan={6} label="Loading trial balance…" />
              </TableBody>
            </Table>
          ) : !data || data.rows.length === 0 ? (
            <Table>
              <TableBody>
                <TableEmptyRow
                  colSpan={6}
                  message="No postings yet. Once you register vendor invoices or post journals, the trial balance will populate."
                />
              </TableBody>
            </Table>
          ) : (
            <Stack gap="sm">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Code</TableHeaderCell>
                    <TableHeaderCell>Account</TableHeaderCell>
                    <TableHeaderCell style={numColStyle}>Debit Turnover</TableHeaderCell>
                    <TableHeaderCell style={numColStyle}>Credit Turnover</TableHeaderCell>
                    <TableHeaderCell style={numColStyle}>Debit Balance</TableHeaderCell>
                    <TableHeaderCell style={numColStyle}>Credit Balance</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {GROUP_ORDER.map((type) => {
                    const rows = grouped[type];
                    if (rows.length === 0) return null;
                    const sub = groupSubtotal(rows);
                    return (
                      <RowsForType
                        key={type}
                        type={type}
                        rows={rows}
                        subDr={sub.dr}
                        subCr={sub.cr}
                      />
                    );
                  })}
                  <TableRow>
                    <TableCell colSpan={4} style={numColStyle}>
                      Grand Totals
                    </TableCell>
                    <TableCell style={{ ...numColBoldStyle, ...grandTotalCellStyle }}>
                      {formatMoney(data.totalDebit)}
                    </TableCell>
                    <TableCell style={{ ...numColBoldStyle, ...grandTotalCellStyle }}>
                      {formatMoney(data.totalCredit)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <Alert variant={isBalanced ? 'success' : 'warning'} role="status">
                {isBalanced
                  ? '✓ Books balance — total debits = total credits'
                  : '⚠ Trial balance does not match — investigate immediately'}
              </Alert>
            </Stack>
          )}
        </CardBody>
      </Card>
    </Stack>
  );
}

function RowsForType({
  type,
  rows,
  subDr,
  subCr,
}: {
  type: AccountType;
  rows: TrialBalanceRow[];
  subDr: number;
  subCr: number;
}) {
  const navigate = useNavigate();

  return (
    <>
      <TableRow>
        <TableCell colSpan={6} style={groupHeadingCellStyle}>
          {GROUP_LABEL[type]}
        </TableCell>
      </TableRow>
      {rows.map((r) => (
        <TableRow key={r.accountId}>
          <TableCell>
            <Text variant="caption" color="secondary">
              {r.accountCode}
            </Text>
          </TableCell>
          <TableCell>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/dashboard/accounting/ledger/${r.accountId}`)}
            >
              {r.accountName}
            </Button>
          </TableCell>
          <TableCell style={numColBoldStyle}>{formatMoney(r.debitTurnover)}</TableCell>
          <TableCell style={numColBoldStyle}>{formatMoney(r.creditTurnover)}</TableCell>
          <TableCell style={numColBoldStyle}>
            {r.debitBalance ? formatMoney(r.debitBalance) : ''}
          </TableCell>
          <TableCell style={numColBoldStyle}>
            {r.creditBalance ? formatMoney(r.creditBalance) : ''}
          </TableCell>
        </TableRow>
      ))}
      <TableRow>
        <TableCell colSpan={4} style={{ ...numColStyle, ...subTotalCellStyle }}>
          {GROUP_LABEL[type]} subtotal
        </TableCell>
        <TableCell style={{ ...numColBoldStyle, ...subTotalCellStyle }}>
          {formatMoney(subDr)}
        </TableCell>
        <TableCell style={{ ...numColBoldStyle, ...subTotalCellStyle }}>
          {formatMoney(subCr)}
        </TableCell>
      </TableRow>
    </>
  );
}
