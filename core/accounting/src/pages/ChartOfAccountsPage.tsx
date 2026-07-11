import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Input,
  PageHeader,
  SearchInput,
  Select,
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
  type SelectOptionDef,
} from '@inventory-platform/ui-kit';
import { accountingApi } from '../api/accounting.api';
import { useNotify } from '@inventory-platform/session';
import type {
  AccountResponse,
  AccountType,
  CreateAccountRequest,
  NormalBalance,
} from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';

const TYPE_ORDER: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

const TYPE_LABEL: Record<AccountType, string> = {
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  EQUITY: 'Equity',
  REVENUE: 'Revenue',
  EXPENSE: 'Expenses',
};

const TYPE_OPTIONS: readonly SelectOptionDef[] = TYPE_ORDER.map((t) => ({
  value: t,
  label: TYPE_LABEL[t],
}));

function formatNormalBalance(balance: NormalBalance): string {
  return balance === 'DEBIT' ? 'Debit' : 'Credit';
}

export function ChartOfAccountsPage() {
  const navigate = useNavigate();
  const { error: notifyError, success: notifySuccess } = useNotify;
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<CreateAccountRequest>({
    code: '',
    name: '',
    type: 'EXPENSE',
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await accountingApi.accounts();
      setAccounts(rows);
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.code.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        TYPE_LABEL[a.type].toLowerCase().includes(q),
    );
  }, [accounts, search]);

  const grouped = useMemo(() => {
    const out: Record<AccountType, AccountResponse[]> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSE: [],
    };
    filtered.forEach((a) => out[a.type].push(a));
    TYPE_ORDER.forEach((t) => out[t].sort((a, b) => a.code.localeCompare(b.code)));
    return out;
  }, [filtered]);

  const customCount = useMemo(() => accounts.filter((a) => !a.system).length, [accounts]);
  const inactiveCount = useMemo(() => accounts.filter((a) => !a.active).length, [accounts]);

  async function submit() {
    if (!draft.code.trim() || !draft.name.trim()) {
      notifyError('Code and name are required.');
      return;
    }
    setSubmitting(true);
    try {
      await accountingApi.createAccount({
        code: draft.code.trim(),
        name: draft.name.trim(),
        type: draft.type,
        normalBalance: draft.normalBalance,
      });
      notifySuccess('Account created');
      setShowCreate(false);
      setDraft({ code: '', name: '', type: 'EXPENSE' });
      await refresh();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(account: AccountResponse) {
    try {
      await accountingApi.updateAccount(account.id, {
        active: !account.active,
      });
      await refresh();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to update account');
    }
  }

  const visibleGroups = TYPE_ORDER.filter((type) => grouped[type].length > 0);

  return (
    <Stack gap="md">
      <AccountingTabs />

      <PageHeader
        description="System accounts are seeded and locked. Add custom accounts for expense or income categories you need."
        actions={
          <Button
            type="button"
            variant={showCreate ? 'outline' : 'solid'}
            onClick={() => setShowCreate((s) => !s)}
          >
            {showCreate ? 'Cancel' : 'New account'}
          </Button>
        }
      />

      <Box className={accountingChrome.partiesFilterBar}>
        <Box className={accountingChrome.partiesFilterSearch}>
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            onSearch={() => setSearch(searchInput.trim())}
            showSearchButton
            buttonVariant="solid"
            grow
            placeholder="Search by code or name…"
            disabled={loading}
            searchLabel="Search"
          />
        </Box>
      </Box>

      <Box className={accountingChrome.pnlKpiGrid}>
        <Box className={accountingChrome.overviewKpiCard}>
          <Text as="span" className={accountingChrome.overviewKpiLabel}>
            Accounts
          </Text>
          <Text as="span" className={accountingChrome.overviewKpiValue}>
            {accounts.length}
          </Text>
          <Text variant="caption" color="secondary">
            {filtered.length === accounts.length ? 'All shown' : `${filtered.length} match search`}
          </Text>
        </Box>
        <Box className={accountingChrome.overviewKpiCard}>
          <Text as="span" className={accountingChrome.overviewKpiLabel}>
            Custom
          </Text>
          <Text as="span" className={accountingChrome.overviewKpiValue}>
            {customCount}
          </Text>
          <Text variant="caption" color="secondary">
            Editable shop accounts
          </Text>
        </Box>
        <Box className={accountingChrome.overviewKpiCard}>
          <Text as="span" className={accountingChrome.overviewKpiLabel}>
            Inactive
          </Text>
          <Text
            as="span"
            className={cn(
              accountingChrome.overviewKpiValue,
              inactiveCount > 0 && accountingChrome.overviewKpiValueMuted,
            )}
          >
            {inactiveCount}
          </Text>
          <Text variant="caption" color="secondary">
            Hidden from new postings
          </Text>
        </Box>
      </Box>

      {showCreate ? (
        <Card>
          <CardBody>
            <Stack gap="md" align="start">
              <Stack gap="xs" align="start">
                <Text as="h3" className={accountingChrome.detailSectionTitle}>
                  New account
                </Text>
                <Text variant="caption" color="secondary">
                  Prefer codes that sit near related accounts (e.g. 5910 under expenses).
                </Text>
              </Stack>
              <Box className={accountingChrome.coaCreateGrid}>
                <Box className={accountingChrome.partiesFilterField}>
                  <Text as="span" className={accountingChrome.partiesFilterLabel}>
                    Code
                  </Text>
                  <Input
                    aria-label="Account code"
                    value={draft.code}
                    placeholder="5910"
                    onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                  />
                </Box>
                <Box className={accountingChrome.partiesFilterField}>
                  <Text as="span" className={accountingChrome.partiesFilterLabel}>
                    Name
                  </Text>
                  <Input
                    aria-label="Account name"
                    value={draft.name}
                    placeholder="Marketing expense"
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </Box>
                <Box className={accountingChrome.partiesFilterField}>
                  <Text as="span" className={accountingChrome.partiesFilterLabel}>
                    Type
                  </Text>
                  <Select
                    aria-label="Account type"
                    value={draft.type}
                    options={TYPE_OPTIONS}
                    onChange={(e) => setDraft({ ...draft, type: e.target.value as AccountType })}
                  />
                </Box>
                <Button variant="solid" loading={submitting} onClick={() => void submit()}>
                  Save account
                </Button>
              </Box>
            </Stack>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody>
          <Table className={cn(accountingChrome.tbTable, accountingChrome.coaTable)}>
            <TableHead>
              <TableRow>
                <TableHeaderCell className={accountingChrome.tbCodeCol}>Code</TableHeaderCell>
                <TableHeaderCell className={accountingChrome.tbAccountCol}>Account</TableHeaderCell>
                <TableHeaderCell className={accountingChrome.coaNormalCol}>Normal</TableHeaderCell>
                <TableHeaderCell className={accountingChrome.coaMetaCol}>Kind</TableHeaderCell>
                <TableHeaderCell className={accountingChrome.coaMetaCol}>Status</TableHeaderCell>
                <TableHeaderCell className={accountingChrome.coaActionCol} />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableLoadingRow colSpan={6} label="Loading accounts…" />
              ) : accounts.length === 0 ? (
                <TableEmptyRow
                  colSpan={6}
                  message="No accounts yet. Open this page once to seed the default chart, or create your first account above."
                />
              ) : filtered.length === 0 ? (
                <TableEmptyRow colSpan={6} message="No accounts match the search." />
              ) : (
                visibleGroups.map((type, index) => (
                  <RowsForType
                    key={type}
                    type={type}
                    rows={grouped[type]}
                    isFirst={index === 0}
                    onToggleActive={toggleActive}
                    onOpenLedger={(id) => navigate(`/dashboard/accounting/ledger/${id}`)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </Stack>
  );
}

function RowsForType({
  type,
  rows,
  isFirst,
  onToggleActive,
  onOpenLedger,
}: {
  type: AccountType;
  rows: AccountResponse[];
  isFirst?: boolean;
  onToggleActive: (account: AccountResponse) => void;
  onOpenLedger: (id: string) => void;
}) {
  return (
    <>
      <TableRow>
        <TableCell
          colSpan={6}
          className={cn(accountingChrome.tbGroupRow, isFirst && accountingChrome.tbGroupRowFirst)}
        >
          {TYPE_LABEL[type]}
        </TableCell>
      </TableRow>
      {rows.map((account) => (
        <TableRow key={account.id}>
          <TableCell className={accountingChrome.tbCodeCol}>{account.code}</TableCell>
          <TableCell className={accountingChrome.tbAccountCol}>
            <Box
              className={cn(
                accountingChrome.coaAccountCell,
                !account.active && accountingChrome.coaInactiveName,
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={accountingChrome.tbAccountLink}
                onClick={() => onOpenLedger(account.id)}
              >
                {account.name}
              </Button>
            </Box>
          </TableCell>
          <TableCell className={accountingChrome.coaNormalCol}>
            {formatNormalBalance(account.normalBalance)}
          </TableCell>
          <TableCell className={accountingChrome.coaMetaCol}>
            {account.system ? (
              <Badge variant="neutral">System</Badge>
            ) : (
              <Text color="secondary" variant="caption">
                Custom
              </Text>
            )}
          </TableCell>
          <TableCell className={accountingChrome.coaMetaCol}>
            <Badge variant={account.active ? 'success' : 'warning'}>
              {account.active ? 'Active' : 'Inactive'}
            </Badge>
          </TableCell>
          <TableCell className={accountingChrome.coaActionCol}>
            {!account.system ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void onToggleActive(account)}
              >
                {account.active ? 'Deactivate' : 'Activate'}
              </Button>
            ) : null}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
