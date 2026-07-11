import { useMemo, useState } from 'react';
import type {
  AccountResponse,
  CreateJournalLineRequest,
} from '@inventory-platform/accounting/types';
import {
  Box,
  Button,
  IconButton,
  Inline,
  Input,
  Stack,
  Text,
  cn,
  accountingChrome,
} from '@inventory-platform/ui-kit';
import { AccountPicker } from './AccountPicker';
import { PartyLineFields } from './PartyLineFields';
import {
  type DraftLine,
  buildCleanedLines,
  emptyLine,
  parseAmount,
} from '../model/journalEntryFormUtils';
import { JOURNAL_TEMPLATES, type JournalTemplateId, getTemplate } from '../model/journalTemplates';
import { needsPartyOnLine } from '../model/accountingConstants';
import { formatMoney } from '../model/format';
import {
  balanceBalancedStyle,
  balanceFooterStyle,
  balanceUnbalancedStyle,
  journalHeaderLineGridStyle,
  journalLineGridStyle,
  templateChipStyle,
} from './accountingStyles';

export type JournalEntryEditorProps = {
  accounts: AccountResponse[];
  accountsLoading?: boolean;
  txnDate: string;
  onTxnDateChange: (v: string) => void;
  narration: string;
  onNarrationChange: (v: string) => void;
  lines: DraftLine[];
  onLinesChange: (lines: DraftLine[]) => void;
  showTemplates?: boolean;
  initialTemplateId?: JournalTemplateId;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (payload: {
    txnDate: string;
    narration?: string;
    lines: CreateJournalLineRequest[];
  }) => void | Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
  onValidationError?: (message: string) => void;
};

function linesFromTemplate(id: JournalTemplateId): DraftLine[] {
  const t = getTemplate(id);
  return t.lines.map((l) => ({
    accountCode: l.accountCode,
    debit: l.debit,
    credit: l.credit,
    memo: l.memo ?? '',
  }));
}

export function JournalEntryEditor({
  accounts,
  accountsLoading,
  txnDate,
  onTxnDateChange,
  narration,
  onNarrationChange,
  lines,
  onLinesChange,
  showTemplates = true,
  initialTemplateId,
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
  disabled,
  onValidationError,
}: JournalEntryEditorProps) {
  const [activeTemplate, setActiveTemplate] = useState<JournalTemplateId | null>(
    initialTemplateId ?? null,
  );

  const { totalDebit, totalCredit, balanced } = useMemo(() => {
    let d = 0;
    let c = 0;
    for (const l of lines) {
      d += parseAmount(l.debit);
      c += parseAmount(l.credit);
    }
    return {
      totalDebit: d,
      totalCredit: c,
      balanced: Math.abs(d - c) < 0.005 && d > 0,
    };
  }, [lines]);

  function patchLine(idx: number, patch: Partial<DraftLine>) {
    onLinesChange(lines.map((line, i) => (i === idx ? { ...line, ...patch } : line)));
  }

  function applyTemplate(id: JournalTemplateId) {
    const t = getTemplate(id);
    setActiveTemplate(id);
    onNarrationChange(t.narration);
    onLinesChange(linesFromTemplate(id));
  }

  function addLine() {
    onLinesChange([...lines, emptyLine()]);
  }

  function removeLine(idx: number) {
    if (lines.length <= 2) return;
    onLinesChange(lines.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!balanced) {
      onValidationError?.('Entry is unbalanced. Debits must equal credits.');
      return;
    }
    const built = buildCleanedLines(lines);
    if (typeof built === 'string') {
      onValidationError?.(built);
      return;
    }
    await onSubmit({
      txnDate,
      narration: narration.trim() || undefined,
      lines: built,
    });
  }

  return (
    <Stack gap="md">
      {showTemplates ? (
        <Inline gap="sm" flexWrap>
          {JOURNAL_TEMPLATES.filter((t) => t.id !== 'BLANK').map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant="ghost"
              className={templateChipStyle(activeTemplate === t.id)}
              onClick={() => applyTemplate(t.id)}
              disabled={disabled || accountsLoading}
              title={t.description}
            >
              {t.label}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={templateChipStyle(activeTemplate === 'BLANK')}
            onClick={() => applyTemplate('BLANK')}
            disabled={disabled || accountsLoading}
          >
            Blank
          </Button>
        </Inline>
      ) : null}

      <Inline gap="sm" flexWrap>
        <Text variant="label" color="secondary">
          Date
        </Text>
        <Input
          type="date"
          value={txnDate}
          onChange={(e) => onTxnDateChange(e.target.value)}
          disabled={disabled}
        />
        <Text variant="label" color="secondary">
          Narration
        </Text>
        <Input
          type="text"
          value={narration}
          onChange={(e) => onNarrationChange(e.target.value)}
          placeholder="What is this entry about?"
          className={accountingChrome.growMin14}
          disabled={disabled}
        />
      </Inline>

      <Box className={journalHeaderLineGridStyle}>
        <Text variant="label" color="secondary">
          Account
        </Text>
        <Text variant="label" color="secondary" align="right">
          Debit
        </Text>
        <Text variant="label" color="secondary" align="right">
          Credit
        </Text>
        <Text variant="label" color="secondary">
          Memo
        </Text>
        <Box />
      </Box>
      {lines.map((line, idx) => (
        <Box key={idx} className={journalLineGridStyle}>
          <Stack gap="xs">
            <AccountPicker
              accounts={accounts}
              value={line.accountCode}
              onChange={(code) =>
                patchLine(idx, {
                  accountCode: code,
                  partyType: undefined,
                  partyRefId: undefined,
                  partyDisplayName: undefined,
                })
              }
              disabled={disabled || accountsLoading}
            />
            {needsPartyOnLine(line.accountCode) ? (
              <PartyLineFields
                accountCode={line.accountCode}
                partyType={line.partyType}
                partyRefId={line.partyRefId}
                partyDisplayName={line.partyDisplayName}
                onChange={(p) => patchLine(idx, p)}
                disabled={disabled}
              />
            ) : null}
          </Stack>
          <Input
            className={accountingChrome.inputNumRight}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={line.debit}
            onChange={(e) =>
              patchLine(idx, {
                debit: e.target.value,
                credit: e.target.value ? '' : line.credit,
              })
            }
            placeholder="0.00"
            disabled={disabled}
          />
          <Input
            className={accountingChrome.inputNumRight}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={line.credit}
            onChange={(e) =>
              patchLine(idx, {
                credit: e.target.value,
                debit: e.target.value ? '' : line.debit,
              })
            }
            placeholder="0.00"
            disabled={disabled}
          />
          <Input
            type="text"
            value={line.memo}
            onChange={(e) => patchLine(idx, { memo: e.target.value })}
            placeholder="Optional"
            disabled={disabled}
          />
          <IconButton
            type="button"
            label="Remove line"
            onClick={() => removeLine(idx)}
            disabled={lines.length <= 2 || disabled}
          >
            ×
          </IconButton>
        </Box>
      ))}
      <Button type="button" variant="ghost" onClick={addLine} disabled={disabled}>
        + Add line
      </Button>

      <Inline
        gap="md"
        className={cn(balanceFooterStyle, balanced ? balanceBalancedStyle : balanceUnbalancedStyle)}
      >
        <Text weight="semibold">Total Debit: ₹ {formatMoney(totalDebit)}</Text>
        <Text weight="semibold">Total Credit: ₹ {formatMoney(totalCredit)}</Text>
        <Text weight="semibold">
          Difference: ₹ {formatMoney(Math.abs(totalDebit - totalCredit))}{' '}
          {balanced ? '✓ Balanced' : '· Must be 0 to save'}
        </Text>
      </Inline>
      <Inline gap="sm">
        <Button
          type="button"
          variant="solid"
          onClick={handleSubmit}
          disabled={submitting || !balanced || disabled}
          loading={submitting}
        >
          {submitting ? 'Posting…' : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        ) : null}
      </Inline>
    </Stack>
  );
}
