import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Inline,
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
  accountingChrome,
} from '@inventory-platform/ui-kit';
import { accountingApi } from '../api/accounting.api';
import { useNotify } from '@inventory-platform/session';
import type {
  JournalEntryResponse,
  TrialBalanceResponse,
} from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import { ACCOUNT_CODES } from '../model/accountingConstants';
import { JOURNAL_TEMPLATES } from '../model/journalTemplates';
import {
  formatDateShort,
  formatJournalSource,
  formatJournalStatus,
  formatMoney,
} from '../model/format';
import { quickActionCardStyle } from '../ui/accountingStyles';

const CODES = ACCOUNT_CODES;

function pickBalance(tb: TrialBalanceResponse | null, code: string): number {
  if (!tb) return 0;
  const row = tb.rows.find((r) => r.accountCode === code);
  if (!row) return 0;
  return row.normalBalance === 'DEBIT'
    ? row.debitBalance - row.creditBalance
    : row.creditBalance - row.debitBalance;
}

function statusVariant(
  status: JournalEntryResponse['status'],
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'POSTED') return 'success';
  if (status === 'REVERSED') return 'warning';
  return 'danger';
}

export function AccountingOverviewPage() {
  const navigate = useNavigate();
  const { error: notifyError, success: notifySuccess } = useNotify;
  const [tb, setTb] = useState<TrialBalanceResponse | null>(null);
  const [recent, setRecent] = useState<JournalEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [reposting, setReposting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tbRes, journals] = await Promise.all([
        accountingApi.trialBalance(),
        accountingApi.journals({ page: 0, size: 10 }),
      ]);
      setTb(tbRes);
      setRecent(journals.entries);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to load accounting overview');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [tbRes, journals] = await Promise.all([
          accountingApi.trialBalance(),
          accountingApi.journals({ page: 0, size: 10 }),
        ]);
        if (cancelled) return;
        setTb(tbRes);
        setRecent(journals.entries);
      } catch (e) {
        if (!cancelled) {
          notifyError(e instanceof Error ? e.message : 'Failed to load accounting overview');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notifyError]);

  const handleRebuild = useCallback(async () => {
    const ok = window.confirm(
      'Re-post every vendor purchase invoice using the current shop settings (GST %, payment routing, CoA)?\n\nExisting journal entries for those invoices will be deleted and replaced. This cannot be undone.',
    );
    if (!ok) return;
    setReposting(true);
    try {
      const res = await accountingApi.backfill({ force: true });
      notifySuccess(
        `Re-posted ${res.reposted}, newly posted ${res.posted}, skipped ${res.skipped}, failed ${res.failed}.`,
      );
      await load();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to rebuild books');
    } finally {
      setReposting(false);
    }
  }, [load, notifyError, notifySuccess]);

  const cash = useMemo(() => pickBalance(tb, CODES.CASH), [tb]);
  const bank = useMemo(() => pickBalance(tb, CODES.BANK), [tb]);
  const debtors = useMemo(() => pickBalance(tb, CODES.SUNDRY_DEBTORS), [tb]);
  const creditors = useMemo(() => pickBalance(tb, CODES.SUNDRY_CREDITORS), [tb]);
  const inventory = useMemo(() => pickBalance(tb, CODES.INVENTORY), [tb]);

  const quickActions = [
    ...JOURNAL_TEMPLATES.filter((t) => t.id !== 'BLANK').map((t) => ({
      key: t.id,
      label: t.label,
      description: t.description,
      to: `/dashboard/accounting/journal/new?template=${t.id.toLowerCase().replace(/_/g, '-')}`,
    })),
    {
      key: 'opening',
      label: 'Opening balances',
      description: 'One-time wizard for starting balances',
      to: '/dashboard/accounting/opening-balances',
    },
    {
      key: 'pnl',
      label: 'Profit & Loss',
      description: 'Revenue and expenses for a period',
      to: '/dashboard/accounting/reports/profit-and-loss',
    },
    {
      key: 'bs',
      label: 'Balance sheet',
      description: 'Assets, liabilities, and equity',
      to: '/dashboard/accounting/reports/balance-sheet',
    },
  ];

  return (
    <Stack gap="md">
      <Stack gap="md">
        <AccountingTabs />
        <PageHeader
          description="Browse journals, ledgers, and the trial balance. Post manual entries when you need a one-off adjustment."
          actions={
            <Inline gap="sm">
              <Button type="button" variant="outline" onClick={handleRebuild} disabled={reposting}>
                {reposting ? 'Rebuilding…' : 'Rebuild books'}
              </Button>
              <Button
                type="button"
                variant="solid"
                onClick={() => navigate('/dashboard/accounting/journal/new')}
              >
                Manual entry
              </Button>
            </Inline>
          }
        />
      </Stack>

      <Box className={accountingChrome.overviewKpiGrid}>
        <KpiCard label="Cash in hand" value={cash} loading={loading} />
        <KpiCard label="Bank" value={bank} loading={loading} />
        <KpiCard label="Inventory (cost)" value={inventory} loading={loading} />
        <KpiCard label="Receivable" value={debtors} tone="positive" loading={loading} />
        <KpiCard label="Payable" value={creditors} tone="warning" loading={loading} />
      </Box>

      <Card>
        <CardBody>
          <Stack gap="md">
            <Text as="h3" className={accountingChrome.overviewSectionTitle}>
              Quick journal templates
            </Text>
            <Box className={accountingChrome.quickActionsGrid}>
              {quickActions.map((action) => (
                <Button
                  key={action.key}
                  type="button"
                  variant="ghost"
                  align="start"
                  fullWidth
                  className={quickActionCardStyle}
                  onClick={() => navigate(action.to)}
                >
                  <Text as="span" weight="semibold">
                    {action.label}
                  </Text>
                  <Text as="span" variant="caption" color="secondary">
                    {action.description}
                  </Text>
                </Button>
              ))}
            </Box>
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Stack gap="md">
            <Inline align="center" justify="between" flexWrap>
              <Text as="h3" className={accountingChrome.overviewSectionTitle}>
                Recent journal entries
              </Text>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard/accounting/journal')}
              >
                View all
              </Button>
            </Inline>
            <Table className={accountingChrome.recentEntriesTable}>
              <TableHead>
                <TableRow>
                  <TableHeaderCell className={accountingChrome.recentEntriesDate}>
                    Date
                  </TableHeaderCell>
                  <TableHeaderCell>Entry</TableHeaderCell>
                  <TableHeaderCell>Source</TableHeaderCell>
                  <TableHeaderCell>Narration</TableHeaderCell>
                  <TableHeaderCell className={accountingChrome.recentEntriesAmount}>
                    Amount
                  </TableHeaderCell>
                  <TableHeaderCell className={accountingChrome.recentEntriesStatus}>
                    Status
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableLoadingRow colSpan={6} label="Loading journal entries…" />
                ) : recent.length === 0 ? (
                  <TableEmptyRow
                    colSpan={6}
                    message="No journal entries yet. Register a stock purchase or post a manual entry to get started."
                  />
                ) : (
                  recent.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className={accountingChrome.recentEntriesDate}>
                        {formatDateShort(e.txnDate)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={accountingChrome.entryLink}
                          onClick={() => navigate(`/dashboard/accounting/journal/${e.id}`)}
                        >
                          {e.entryNo}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="info">{formatJournalSource(e.sourceType)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Text as="span" color="secondary" variant="caption">
                          {e.narration ?? '—'}
                        </Text>
                      </TableCell>
                      <TableCell className={accountingChrome.recentEntriesAmount}>
                        ₹{formatMoney(e.totalDebit)}
                      </TableCell>
                      <TableCell className={accountingChrome.recentEntriesStatus}>
                        <Badge variant={statusVariant(e.status)}>
                          {formatJournalStatus(e.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}

function KpiCard({
  label,
  value,
  loading,
  tone,
}: {
  label: string;
  value: number;
  loading: boolean;
  tone?: 'positive' | 'warning';
}) {
  const valueClass = loading
    ? accountingChrome.overviewKpiValueMuted
    : tone === 'positive'
    ? accountingChrome.overviewKpiValuePositive
    : tone === 'warning'
    ? accountingChrome.overviewKpiValueWarning
    : undefined;

  return (
    <Box className={accountingChrome.overviewKpiCard}>
      <Text as="p" className={accountingChrome.overviewKpiLabel}>
        {label}
      </Text>
      <Text as="p" className={`${accountingChrome.overviewKpiValue} ${valueClass ?? ''}`.trim()}>
        {loading ? '…' : `₹${formatMoney(value)}`}
      </Text>
    </Box>
  );
}
