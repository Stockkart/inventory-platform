import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  Inline,
  Input,
  PaginationBar,
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
import type {
  AccountResponse,
  AccountType,
  LedgerPageResponse,
  TrialBalanceRow,
} from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import { formatDateShort, formatJournalSource, formatMoney, formatTurnover } from '../model/format';
import {
  acctItemActiveStyle,
  acctItemBalanceMutedStyle,
  acctItemBalanceStyle,
  acctItemCodeStyle,
  acctItemLabelStyle,
  acctItemStyle,
  ledgerLayoutStyle,
} from '../ui/accountingStyles';

const TYPE_ORDER: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

const TYPE_LABEL: Record<AccountType, string> = {
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  EQUITY: 'Equity',
  REVENUE: 'Revenue',
  EXPENSE: 'Expenses',
};

type BalanceMap = Map<string, TrialBalanceRow>;

function netBalance(row: TrialBalanceRow | undefined): number {
  if (!row) return 0;
  if (row.normalBalance === 'DEBIT') return row.debitBalance - row.creditBalance;
  return row.creditBalance - row.debitBalance;
}

export function LedgerPage() {
  const navigate = useNavigate();
  const params = useParams();
  const accountId = params.accountId ?? '';
  const { error: notifyError } = useNotify;

  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [balances, setBalances] = useState<BalanceMap>(new Map());
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<LedgerPageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [compactLayout, setCompactLayout] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 960px)');
    const update = () => setCompactLayout(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setAccountsLoading(true);
      try {
        const [rows, tb] = await Promise.all([
          accountingApi.accounts(),
          accountingApi.trialBalance().catch(() => ({ rows: [] as TrialBalanceRow[] })),
        ]);
        if (cancelled) return;
        setAccounts(rows);
        const map: BalanceMap = new Map();
        for (const r of tb.rows ?? []) map.set(r.accountId, r);
        setBalances(map);
        if (!accountId && rows.length > 0) {
          const firstWithActivity = rows.find((a) => {
            const bal = map.get(a.id);
            return bal && (bal.debitTurnover > 0 || bal.creditTurnover > 0);
          });
          const target = firstWithActivity ?? rows[0];
          navigate(`/dashboard/accounting/ledger/${target.id}`, { replace: true });
        }
      } catch (e) {
        if (!cancelled) {
          notifyError(e instanceof Error ? e.message : 'Failed to load accounts');
        }
      } finally {
        if (!cancelled) setAccountsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accountId, navigate, notifyError]);

  const reload = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await accountingApi.ledger(accountId, {
        from: from || undefined,
        to: to || undefined,
        page,
        size: 50,
      });
      setData(res);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  }, [accountId, from, to, page, notifyError]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? accounts.filter((a) => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))
      : accounts;
    const byType: Record<AccountType, AccountResponse[]> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSE: [],
    };
    for (const a of filtered) byType[a.type].push(a);
    for (const t of TYPE_ORDER) {
      byType[t].sort((x, y) => x.code.localeCompare(y.code));
    }
    return byType;
  }, [accounts, search]);

  function openAccount(nextId: string) {
    setPage(0);
    navigate(`/dashboard/accounting/ledger/${nextId}`);
  }

  const selected = data?.account;
  const selectedBalance = selected ? balances.get(selected.id) : undefined;
  const closing = selectedBalance ? netBalance(selectedBalance) : 0;

  return (
    <Stack gap="md">
      <AccountingTabs />

      <Box className={ledgerLayoutStyle(compactLayout)}>
        <Card className={accountingChrome.sidebarScrollCard}>
          <CardBody>
            <Stack gap="md">
              <SearchInput
                value={searchInput}
                onChange={setSearchInput}
                onSearch={() => setSearch(searchInput.trim())}
                placeholder="Search accounts…"
              />
              {accountsLoading ? (
                <CenteredLoader label="Loading accounts…" minHeight="8rem" />
              ) : accounts.length === 0 ? (
                <Stack gap="sm" align="center">
                  <Text color="secondary">No chart of accounts found.</Text>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/dashboard/accounting/chart-of-accounts')}
                  >
                    Set it up
                  </Button>
                </Stack>
              ) : (
                <>
                  {TYPE_ORDER.map((t) => {
                    const rows = grouped[t];
                    if (rows.length === 0) return null;
                    return (
                      <Stack key={t} gap="none">
                        <Text as="h3" className={accountingChrome.ledgerGroupTitle}>
                          {TYPE_LABEL[t]}
                        </Text>
                        {rows.map((account) => {
                          const bal = balances.get(account.id);
                          const net = netBalance(bal);
                          const hasActivity =
                            !!bal && (bal.debitTurnover > 0 || bal.creditTurnover > 0);
                          const active = account.id === accountId;
                          const balanceMuted = !hasActivity || net === 0;
                          return (
                            <Button
                              key={account.id}
                              type="button"
                              variant="ghost"
                              size="sm"
                              fullWidth
                              align="start"
                              title={`${account.code} · ${account.name}`}
                              className={cn(acctItemStyle, active && acctItemActiveStyle)}
                              onClick={() => openAccount(account.id)}
                            >
                              <Box className={accountingChrome.acctItemMain}>
                                <Text as="span" className={acctItemCodeStyle}>
                                  {account.code}
                                </Text>
                                <Text as="span" className={acctItemLabelStyle}>
                                  {account.name}
                                </Text>
                              </Box>
                              <Text
                                as="span"
                                className={cn(
                                  balanceMuted ? acctItemBalanceMutedStyle : acctItemBalanceStyle,
                                  hasActivity && net < 0 && accountingChrome.acctItemBalanceNeg,
                                )}
                              >
                                {hasActivity ? formatMoney(net) : '—'}
                              </Text>
                            </Button>
                          );
                        })}
                      </Stack>
                    );
                  })}
                  <Inline justify="between" align="center">
                    <Text variant="caption" color="secondary">
                      {accounts.length} accounts
                    </Text>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/dashboard/accounting/chart-of-accounts')}
                    >
                      Manage
                    </Button>
                  </Inline>
                </>
              )}
            </Stack>
          </CardBody>
        </Card>

        <Stack gap="md">
          <Card>
            <CardBody>
              {selected ? (
                <Stack gap="md">
                  <Inline justify="between" align="start" gap="md">
                    <Stack gap="sm">
                      <Text as="h2" className={accountingChrome.ledgerAccountTitle}>
                        {selected.code} · {selected.name}
                      </Text>
                      <Inline gap="sm" align="center">
                        <Badge variant="neutral">{TYPE_LABEL[selected.type]}</Badge>
                        <Badge variant="info">
                          Normal {selected.normalBalance === 'DEBIT' ? 'debit' : 'credit'}
                        </Badge>
                      </Inline>
                    </Stack>
                    <Box className={accountingChrome.ledgerClosing}>
                      <Text as="span" className={accountingChrome.ledgerClosingLabel}>
                        Closing
                      </Text>
                      <Text
                        as="span"
                        className={cn(
                          accountingChrome.ledgerClosingValue,
                          closing < 0 && accountingChrome.ledgerClosingValueNeg,
                        )}
                      >
                        ₹{formatMoney(closing)}
                      </Text>
                    </Box>
                  </Inline>

                  <Inline gap="sm" align="end" flexWrap>
                    <Inline gap="sm" align="center">
                      <Text variant="label" color="secondary">
                        From
                      </Text>
                      <Input
                        type="date"
                        value={from}
                        onChange={(e) => {
                          setPage(0);
                          setFrom(e.target.value);
                        }}
                      />
                    </Inline>
                    <Inline gap="sm" align="center">
                      <Text variant="label" color="secondary">
                        To
                      </Text>
                      <Input
                        type="date"
                        value={to}
                        onChange={(e) => {
                          setPage(0);
                          setTo(e.target.value);
                        }}
                      />
                    </Inline>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFrom('');
                        setTo('');
                        setPage(0);
                      }}
                      disabled={!from && !to}
                    >
                      Clear
                    </Button>
                  </Inline>
                </Stack>
              ) : (
                <Text color="secondary">Pick an account from the list to view its ledger.</Text>
              )}
            </CardBody>
          </Card>

          {selected ? (
            <Card>
              <CardBody>
                <Table className={accountingChrome.ledgerTable}>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell className={accountingChrome.ledgerDateCol}>
                        Date
                      </TableHeaderCell>
                      <TableHeaderCell className={accountingChrome.ledgerEntryCol}>
                        Entry
                      </TableHeaderCell>
                      <TableHeaderCell className={accountingChrome.ledgerSourceCol}>
                        Source
                      </TableHeaderCell>
                      <TableHeaderCell>Narration</TableHeaderCell>
                      <TableHeaderCell className={accountingChrome.ledgerAmountCol}>
                        Debit
                      </TableHeaderCell>
                      <TableHeaderCell className={accountingChrome.ledgerAmountCol}>
                        Credit
                      </TableHeaderCell>
                      <TableHeaderCell className={accountingChrome.ledgerBalanceCol}>
                        Balance
                      </TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableLoadingRow colSpan={7} label="Loading ledger…" />
                    ) : (data?.entries.length ?? 0) === 0 ? (
                      <TableEmptyRow colSpan={7} message="No postings in this range." />
                    ) : (
                      (data?.entries ?? []).map((row) => {
                        const debitLabel = formatTurnover(row.debit);
                        const creditLabel = formatTurnover(row.credit);
                        return (
                          <TableRow key={row.id}>
                            <TableCell className={accountingChrome.ledgerDateCol}>
                              {formatDateShort(row.txnDate)}
                            </TableCell>
                            <TableCell className={accountingChrome.ledgerEntryCol}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={accountingChrome.entryLink}
                                onClick={() =>
                                  navigate(`/dashboard/accounting/journal/${row.journalEntryId}`)
                                }
                              >
                                {row.journalEntryNo}
                              </Button>
                            </TableCell>
                            <TableCell className={accountingChrome.ledgerSourceCol}>
                              <Badge variant="info">{formatJournalSource(row.sourceType)}</Badge>
                            </TableCell>
                            <TableCell
                              className={accountingChrome.ledgerNarrationCol}
                              title={row.narration ?? undefined}
                            >
                              {row.narration?.trim() ? row.narration : '—'}
                            </TableCell>
                            <TableCell
                              className={cn(
                                accountingChrome.ledgerAmountCol,
                                debitLabel === '—' && accountingChrome.ledgerAmountMuted,
                              )}
                            >
                              {debitLabel}
                            </TableCell>
                            <TableCell
                              className={cn(
                                accountingChrome.ledgerAmountCol,
                                creditLabel === '—' && accountingChrome.ledgerAmountMuted,
                              )}
                            >
                              {creditLabel}
                            </TableCell>
                            <TableCell className={accountingChrome.ledgerBalanceCol}>
                              {formatMoney(row.balanceAfter)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {(data?.entries.length ?? 0) > 0 || loading ? (
                  <PaginationBar
                    page={data?.page ?? page}
                    totalPages={Math.max(data?.totalPages ?? 1, 1)}
                    totalItems={data?.totalItems ?? 0}
                    disabled={loading}
                    onPageChange={setPage}
                    aria-label="Ledger pages"
                  />
                ) : null}
              </CardBody>
            </Card>
          ) : null}
        </Stack>
      </Box>
    </Stack>
  );
}
