import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button, Card, CardBody, Inline, PageHeader, Stack } from '@inventory-platform/ui-kit';
import { accountingApi } from '../api/accounting.api';
import { useNotify } from '@inventory-platform/session';
import type { AccountResponse } from '@inventory-platform/accounting/types';
import { AccountingTabs } from '../ui/AccountingTabs';
import { JournalEntryEditor } from '../ui/JournalEntryEditor';
import { emptyLine } from '../model/journalEntryFormUtils';
import { getTemplate, type JournalTemplateId } from '../model/journalTemplates';
import { todayLocalDate } from '../model/format';

function parseTemplateParam(raw: string | null): JournalTemplateId | undefined {
  if (!raw) return undefined;
  const id = raw.toUpperCase().replace(/-/g, '_') as JournalTemplateId;
  const known: JournalTemplateId[] = [
    'CASH_TO_BANK',
    'BANK_TO_CASH',
    'EXPENSE_CASH',
    'EXPENSE_BANK',
    'OTHER_INCOME_BANK',
    'CUSTOMER_RECEIPT',
    'VENDOR_PAYMENT',
    'BLANK',
  ];
  return known.includes(id) ? id : undefined;
}

export function ManualJournalEntryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = parseTemplateParam(searchParams.get('template'));
  const { error: notifyError, success: notifySuccess } = useNotify;
  const [accounts, setAccounts] = useState<AccountResponse[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [txnDate, setTxnDate] = useState<string>(todayLocalDate());
  const [narration, setNarration] = useState(() =>
    templateId ? getTemplate(templateId).narration : '',
  );
  const initialLines = useMemo(() => {
    if (!templateId) return [emptyLine(), emptyLine()];
    return getTemplate(templateId).lines.map((l) => ({
      accountCode: l.accountCode,
      debit: l.debit,
      credit: l.credit,
      memo: l.memo ?? '',
    }));
  }, [templateId]);
  const [lines, setLines] = useState(initialLines);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLines(initialLines);
    if (templateId) setNarration(getTemplate(templateId).narration);
  }, [initialLines, templateId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAccountsLoading(true);
      try {
        const rows = await accountingApi.accounts();
        if (!cancelled) setAccounts(rows);
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
  }, [notifyError]);

  return (
    <Stack gap="md">
      <Stack gap="md">
        <AccountingTabs />
        <PageHeader description="Post a balanced one-off entry. Source is recorded as Manual." />
        <Inline gap="sm" align="center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/accounting/journal')}
          >
            ← Back to journal
          </Button>
        </Inline>
      </Stack>

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
            initialTemplateId={templateId}
            submitLabel="Post Entry"
            submitting={submitting}
            onValidationError={notifyError}
            onCancel={() => navigate('/dashboard/accounting/journal')}
            onSubmit={async (body) => {
              setSubmitting(true);
              try {
                const posted = await accountingApi.createManualJournal(body);
                notifySuccess(`Posted ${posted.entryNo}`);
                navigate(`/dashboard/accounting/journal/${posted.id}`);
              } catch (e) {
                notifyError(e instanceof Error ? e.message : 'Failed to post entry');
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
