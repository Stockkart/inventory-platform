import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  Card,
  CardBody,
  FormField,
  Inline,
  PageHeader,
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
  type SelectOptionDef,
} from '@inventory-platform/ui-kit';
import { accountingApi } from '../api/accounting.api';
import { useNotify } from '@inventory-platform/session';
import type {
  AccountResponse,
  AccountType,
  CreateAccountRequest,
} from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import styles from '../ui/accounting.module.css';

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

export function ChartOfAccountsPage() {
  const navigate = useNavigate();
  const { error: notifyError, success: notifySuccess } = useNotify;
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

  const grouped = useMemo(() => {
    const out: Record<AccountType, AccountResponse[]> = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSE: [],
    };
    accounts.forEach((a) => out[a.type].push(a));
    TYPE_ORDER.forEach((t) => out[t].sort((a, b) => a.code.localeCompare(b.code)));
    return out;
  }, [accounts]);

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

  return (
    <Stack gap="md" className={styles.page}>
      <Stack gap="md">
        <PageHeader
          title="Chart of Accounts"
          description="The accounting backbone. System accounts (locked) come pre-seeded; add your own for custom expense or income categories."
          actions={
            <Button variant="solid" onClick={() => setShowCreate((s) => !s)}>
              {showCreate ? 'Cancel' : 'New account'}
            </Button>
          }
        />
        <AccountingTabs />
      </Stack>

      {showCreate ? (
        <Card>
          <CardBody>
            <Stack gap="md">
              <Text variant="heading3" weight="semibold">
                New account
              </Text>
              <Inline gap="sm" className={styles.toolbar}>
                <FormField
                  label="Code"
                  value={draft.code}
                  placeholder="e.g. 5910"
                  onChange={(code) => setDraft({ ...draft, code })}
                />
                <FormField
                  label="Name"
                  value={draft.name}
                  placeholder="e.g. Marketing Expense"
                  onChange={(name) => setDraft({ ...draft, name })}
                />
                <FormField label="Type">
                  <Select
                    value={draft.type}
                    options={TYPE_OPTIONS}
                    onChange={(e) => setDraft({ ...draft, type: e.target.value as AccountType })}
                  />
                </FormField>
                <Button variant="solid" loading={submitting} onClick={() => void submit()}>
                  Save account
                </Button>
              </Inline>
            </Stack>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Code</TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Normal</TableHeaderCell>
                <TableHeaderCell>System</TableHeaderCell>
                <TableHeaderCell>Active</TableHeaderCell>
                <TableHeaderCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableLoadingRow colSpan={7} label="Loading accounts…" />
              ) : accounts.length === 0 ? (
                <TableEmptyRow
                  colSpan={7}
                  message="No accounts yet. Open this page once to seed the default chart, or create your first account above."
                />
              ) : (
                TYPE_ORDER.map((type) => {
                  const rows = grouped[type];
                  if (rows.length === 0) return null;
                  return (
                    <RowsForType
                      key={type}
                      type={type}
                      rows={rows}
                      onToggleActive={toggleActive}
                      onOpenLedger={(id) => navigate(`/dashboard/accounting/ledger/${id}`)}
                    />
                  );
                })
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
  onToggleActive,
  onOpenLedger,
}: {
  type: AccountType;
  rows: AccountResponse[];
  onToggleActive: (account: AccountResponse) => void;
  onOpenLedger: (id: string) => void;
}) {
  return (
    <>
      <TableRow>
        <TableCell colSpan={7} className={styles.groupHeading}>
          {TYPE_LABEL[type]}
        </TableCell>
      </TableRow>
      {rows.map((account) => (
        <TableRow key={account.id}>
          <TableCell>
            <Text color="secondary" variant="caption">
              {account.code}
            </Text>
          </TableCell>
          <TableCell>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenLedger(account.id)}
            >
              {account.name}
            </Button>
          </TableCell>
          <TableCell>
            <Text color="secondary" variant="caption">
              {TYPE_LABEL[account.type]}
            </Text>
          </TableCell>
          <TableCell>
            <Text color="secondary" variant="caption">
              {account.normalBalance}
            </Text>
          </TableCell>
          <TableCell>{account.system ? '🔒 System' : '—'}</TableCell>
          <TableCell>{account.active ? 'Yes' : 'No'}</TableCell>
          <TableCell>
            {!account.system ? (
              <Button
                type="button"
                variant="outline"
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
