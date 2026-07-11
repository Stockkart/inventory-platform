import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Badge,
  Button,
  Card,
  CardBody,
  PageHeader,
  Stack,
  Text,
  accountingChrome,
} from '@inventory-platform/ui-kit';
import { accountingApi } from '../api/accounting.api';
import { useNotify } from '@inventory-platform/session';
import type { AccountResponse, JournalEntryResponse } from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import { JournalEntryEditor } from '../ui/JournalEntryEditor';
import { emptyLine } from '../model/journalEntryFormUtils';
import { todayLocalDate, formatDateShort } from '../model/format';

export function OpeningBalanceWizardPage() {
  const navigate = useNavigate();
  const { error: notifyError, success: notifySuccess } = useNotify;
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [existing, setExisting] = useState<JournalEntryResponse | null | undefined>(undefined);
  const [txnDate, setTxnDate] = useState(todayLocalDate());
  const [narration, setNarration] = useState('Opening balances');
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAccountsLoading(true);
      try {
        const [rows, status] = await Promise.all([
          accountingApi.accounts(),
          accountingApi.openingBalanceStatus(),
        ]);
        if (!cancelled) {
          setAccounts(rows);
          setExisting(status);
        }
      } catch (e) {
        if (!cancelled) {
          notifyError(e instanceof Error ? e.message : 'Failed to load opening balance data');
        }
      } finally {
        if (!cancelled) setAccountsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notifyError]);

  const locked = Boolean(existing?.id);

  return (
    <Stack gap="md">
      <AccountingTabs />

      <PageHeader description="One-time entry to bring forward balances when you start using accounting." />

      {existing?.id ? (
        <Card>
          <CardBody>
            <Stack gap="sm" align="start">
              <Badge variant="info">Already posted</Badge>
              <Text color="secondary">
                Opening balances were posted on {formatDateShort(existing.txnDate)} as{' '}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={accountingChrome.entryLink}
                  onClick={() => navigate(`/dashboard/accounting/journal/${existing.id}`)}
                >
                  {existing.entryNo}
                </Button>
                . Reverse that entry before posting a new opening balance.
              </Text>
            </Stack>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody>
          <JournalEntryEditor
            accounts={accounts}
            accountsLoading={accountsLoading}
            txnDate={txnDate}
            onTxnDateChange={setTxnDate}
            narration={narration}
            onNarrationChange={setNarration}
            lines={lines}
            onLinesChange={setLines}
            showTemplates={false}
            submitLabel="Post opening balances"
            submitting={submitting}
            disabled={locked}
            onValidationError={notifyError}
            onSubmit={async (body) => {
              setSubmitting(true);
              try {
                const posted = await accountingApi.postOpeningBalance(body);
                notifySuccess(`Opening balances posted as ${posted.entryNo}`);
                navigate(`/dashboard/accounting/journal/${posted.id}`);
              } catch (e) {
                notifyError(e instanceof Error ? e.message : 'Failed to post opening balances');
              } finally {
                setSubmitting(false);
              }
            }}
          />
        </CardBody>
      </Card>
    </Stack>
  );
}
