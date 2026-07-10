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
  PageHeader,
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
import { formatDate, formatMoney } from '../model/format';
import styles from '../ui/accounting.module.css';
import { numColBoldStyle, numColStyle } from '../ui/tabNav';

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

  return (
    <Stack gap="md">
      <Stack gap="md">
        <PageHeader
          title="Ledger"
          description="Every account in your books. Pick one to see its postings with a running balance on its normal side."
        />
        <AccountingTabs />
      </Stack>

      <Box display="grid" className={styles.ledgerLayout}>
        <Card className={styles.acctList}>
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
                      <Stack key={t} gap="xs">
                        <Text variant="label" weight="semibold">
                          {TYPE_LABEL[t]}
                        </Text>
                        {rows.map((account) => {
                          const bal = balances.get(account.id);
                          const net = netBalance(bal);
                          const hasActivity =
                            !!bal && (bal.debitTurnover > 0 || bal.creditTurnover > 0);
                          const active = account.id === accountId;
                          return (
                            <Button
                              key={account.id}
                              type="button"
                              variant="ghost"
                              size="sm"
                              fullWidth
                              className={active ? styles.acctItemActive : styles.acctItem}
                              onClick={() => openAccount(account.id)}
                            >
                              <Stack gap="none" className={styles.acctItemName}>
                                <Text as="span" className={styles.acctItemCode}>
                                  {account.code}
                                </Text>
                                <Text as="span" className={styles.acctItemLabel}>
                                  {account.name}
                                </Text>
                              </Stack>
                              <Text
                                as="span"
                                className={
                                  hasActivity ? styles.acctItemBalance : styles.acctItemBalanceMuted
                                }
                              >
                                {hasActivity ? formatMoney(net) : '—'}
                              </Text>
                            </Button>
                          );
                        })}
                      </Stack>
                    );
                  })}
                  <Inline justify="between">
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
                  <Stack gap="xs">
                    <Text variant="heading3" weight="semibold">
                      {selected.code} · {selected.name}
                    </Text>
                    <Text color="secondary" variant="caption">
                      {TYPE_LABEL[selected.type]} · Normal balance {selected.normalBalance}
                      {selectedBalance
                        ? ` · Closing ${formatMoney(netBalance(selectedBalance))}`
                        : ''}
                    </Text>
                  </Stack>
                  <Inline gap="sm">
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
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell>Entry #</TableHeaderCell>
                      <TableHeaderCell>Source</TableHeaderCell>
                      <TableHeaderCell>Party</TableHeaderCell>
                      <TableHeaderCell>Narration</TableHeaderCell>
                      <TableHeaderCell style={numColStyle}>Debit</TableHeaderCell>
                      <TableHeaderCell style={numColStyle}>Credit</TableHeaderCell>
                      <TableHeaderCell style={numColStyle}>Balance</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableLoadingRow colSpan={8} label="Loading ledger…" />
                    ) : (data?.entries.length ?? 0) === 0 ? (
                      <TableEmptyRow colSpan={8} message="No postings in this range." />
                    ) : (
                      (data?.entries ?? []).map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{formatDate(row.txnDate)}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(`/dashboard/accounting/journal/${row.journalEntryId}`)
                              }
                            >
                              {row.journalEntryNo}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Badge variant="info">{row.sourceType}</Badge>
                          </TableCell>
                          <TableCell>
                            <Text color="secondary" variant="caption">
                              {row.partyType
                                ? `${row.partyType}${
                                    row.partyDisplayName ? ` · ${row.partyDisplayName}` : ''
                                  }`
                                : '—'}
                            </Text>
                          </TableCell>
                          <TableCell>
                            <Text color="secondary" variant="caption">
                              {row.narration ?? '—'}
                            </Text>
                          </TableCell>
                          <TableCell style={numColBoldStyle}>
                            {row.debit ? formatMoney(row.debit) : '—'}
                          </TableCell>
                          <TableCell style={numColBoldStyle}>
                            {row.credit ? formatMoney(row.credit) : '—'}
                          </TableCell>
                          <TableCell style={numColBoldStyle}>
                            {formatMoney(row.balanceAfter)}
                          </TableCell>
                        </TableRow>
                      ))
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
