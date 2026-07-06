import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Grid,
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
} from '@inventory-platform/ui-kit';
import { accountingApi } from '../api/accounting.api';
import { useNotify } from '@inventory-platform/session';
import type { JournalEntryResponse, TrialBalanceResponse } from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import { ACCOUNT_CODES } from '../model/accountingConstants';
import { JOURNAL_TEMPLATES } from '../model/journalTemplates';
import { formatDate, formatMoney } from '../model/format';
import styles from '../ui/accounting.module.css';

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
  status: JournalEntryResponse['status']
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
      notifyError(
        e instanceof Error ? e.message : 'Failed to load accounting overview'
      );
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
          notifyError(
            e instanceof Error ? e.message : 'Failed to load accounting overview'
          );
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
      'Re-post every vendor purchase invoice using the current shop settings (GST %, payment routing, CoA)?\n\nExisting journal entries for those invoices will be deleted and replaced. This cannot be undone.'
    );
    if (!ok) return;
    setReposting(true);
    try {
      const res = await accountingApi.backfill({ force: true });
      notifySuccess(
        `Re-posted ${res.reposted}, newly posted ${res.posted}, skipped ${res.skipped}, failed ${res.failed}.`
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
    <Stack gap="md" className={styles.page}>
      <Stack gap="md">
        <AccountingTabs />
        <PageHeader
          title="Accounting"
          description="Every business event is recorded as a balanced journal entry. Browse the journal, drill into per-account ledgers, and view the trial balance."
          actions={
            <Inline gap="sm">
              <Button
                type="button"
                variant="outline"
                onClick={handleRebuild}
                disabled={reposting}
                title="Re-post every vendor purchase invoice using current shop settings (GST %, payment routing, etc.)"
              >
                {reposting ? 'Rebuilding…' : 'Rebuild Books'}
              </Button>
              <Button
                type="button"
                variant="solid"
                onClick={() => navigate('/dashboard/accounting/journal/new')}
              >
                + Manual Entry
              </Button>
            </Inline>
          }
        />
      </Stack>

      <Grid gap="md" className={styles.kpiRow}>
        <KpiCard label="Cash in Hand" value={cash} loading={loading} />
        <KpiCard label="Bank" value={bank} loading={loading} />
        <KpiCard label="Inventory (Cost)" value={inventory} loading={loading} />
        <KpiCard
          label="Receivable (Customers)"
          value={debtors}
          tone="positive"
          loading={loading}
        />
        <KpiCard
          label="Payable (Vendors)"
          value={creditors}
          tone="warning"
          loading={loading}
        />
      </Grid>

      <Card>
        <CardBody>
          <Stack gap="sm">
            <Text variant="title" weight="bold">
              Quick journal templates
            </Text>
            <Grid gap="sm" className={styles.quickActionGrid}>
              {quickActions.map((action) => (
                <Button
                  key={action.key}
                  type="button"
                  variant="ghost"
                  className={styles.quickActionCard}
                  onClick={() => navigate(action.to)}
                >
                  <Text weight="semibold">{action.label}</Text>
                  <Text variant="caption" color="secondary">
                    {action.description}
                  </Text>
                </Button>
              ))}
            </Grid>
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Stack gap="sm">
            <Inline align="center" className={styles.header}>
              <Text variant="title" weight="bold">
                Recent Journal Entries
              </Text>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={styles.tabLink}
                onClick={() => navigate('/dashboard/accounting/journal')}
              >
                View all
              </Button>
            </Inline>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Entry #</TableHeaderCell>
                  <TableHeaderCell>Source</TableHeaderCell>
                  <TableHeaderCell>Narration</TableHeaderCell>
                  <TableHeaderCell className={styles.right}>Debit</TableHeaderCell>
                  <TableHeaderCell className={styles.right}>Credit</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableLoadingRow colSpan={7} label="Loading journal entries…" />
                ) : recent.length === 0 ? (
                  <TableEmptyRow
                    colSpan={7}
                    message="No journal entries yet. Register a stock purchase or post a manual entry to get started."
                  />
                ) : (
                  recent.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{formatDate(e.txnDate)}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/dashboard/accounting/journal/${e.id}`)
                          }
                        >
                          {e.entryNo}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge className={styles.sourcePill}>{e.sourceType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Text color="secondary" variant="caption">
                          {e.narration ?? '—'}
                        </Text>
                      </TableCell>
                      <TableCell className={`${styles.right} ${styles.number}`}>
                        {formatMoney(e.totalDebit)}
                      </TableCell>
                      <TableCell className={`${styles.right} ${styles.number}`}>
                        {formatMoney(e.totalCredit)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(e.status)}>{e.status}</Badge>
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
  const color =
    tone === 'positive' ? 'success' : tone === 'warning' ? 'danger' : 'primary';

  return (
    <Card>
      <CardBody>
        <Stack gap="xs">
          <Text variant="caption" color="secondary">
            {label}
          </Text>
          <Text variant="heading2" weight="bold" color={loading ? 'secondary' : color}>
            {loading ? '…' : `₹ ${formatMoney(value)}`}
          </Text>
        </Stack>
      </CardBody>
    </Card>
  );
}
