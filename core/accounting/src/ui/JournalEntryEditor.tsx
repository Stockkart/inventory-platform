import { useMemo, useState } from 'react';
import type { AccountResponse, CreateJournalLineRequest } from '@inventory-platform/types';
import { AccountPicker } from './AccountPicker';
import { PartyLineFields } from './PartyLineFields';
import {
  type DraftLine,
  buildCleanedLines,
  emptyLine,
  parseAmount,
} from '../model/journalEntryFormUtils';
import {
  JOURNAL_TEMPLATES,
  type JournalTemplateId,
  getTemplate,
} from '../model/journalTemplates';
import { needsPartyOnLine } from '../model/accountingConstants';
import { formatMoney } from '../model/format';
import styles from './accounting.module.css';

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
    initialTemplateId ?? null
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
    <>
      {showTemplates ? (
        <div className={styles.templateBar} role="group" aria-label="Journal templates">
          {JOURNAL_TEMPLATES.filter((t) => t.id !== 'BLANK').map((t) => (
            <button
              key={t.id}
              type="button"
              className={
                activeTemplate === t.id ? styles.templateChipActive : styles.templateChip
              }
              onClick={() => applyTemplate(t.id)}
              disabled={disabled || accountsLoading}
              title={t.description}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            className={
              activeTemplate === 'BLANK' ? styles.templateChipActive : styles.templateChip
            }
            onClick={() => applyTemplate('BLANK')}
            disabled={disabled || accountsLoading}
          >
            Blank
          </button>
        </div>
      ) : null}

      <div className={styles.toolbar} style={{ marginBottom: '0.75rem' }}>
        <label className={styles.muted}>Date</label>
        <input
          type="date"
          value={txnDate}
          onChange={(e) => onTxnDateChange(e.target.value)}
          disabled={disabled}
        />
        <label className={styles.muted}>Narration</label>
        <input
          type="text"
          value={narration}
          onChange={(e) => onNarrationChange(e.target.value)}
          placeholder="What is this entry about?"
          style={{ flex: 1, minWidth: '14rem' }}
          disabled={disabled}
        />
      </div>

      <div className={styles.headerLineGrid}>
        <span>Account</span>
        <span className={styles.right}>Debit</span>
        <span className={styles.right}>Credit</span>
        <span>Memo</span>
        <span />
      </div>
      {lines.map((line, idx) => (
        <div key={idx} className={styles.lineGrid}>
          <div className={styles.lineAccountCell}>
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
          </div>
          <input
            className={styles.right}
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
          <input
            className={styles.right}
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
          <input
            type="text"
            value={line.memo}
            onChange={(e) => patchLine(idx, { memo: e.target.value })}
            placeholder="Optional"
            disabled={disabled}
          />
          <button
            type="button"
            className={styles.removeBtn}
            title="Remove line"
            aria-label="Remove line"
            onClick={() => removeLine(idx)}
            disabled={lines.length <= 2 || disabled}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className={styles.btnGhost} onClick={addLine} disabled={disabled}>
        + Add line
      </button>

      <div
        className={`${styles.balanceFooter} ${
          balanced ? styles.balanceBalanced : styles.balanceUnbalanced
        }`}
      >
        <span>Total Debit: ₹ {formatMoney(totalDebit)}</span>
        <span>Total Credit: ₹ {formatMoney(totalCredit)}</span>
        <span>
          Difference: ₹ {formatMoney(Math.abs(totalDebit - totalCredit))}{' '}
          {balanced ? '✓ Balanced' : '· Must be 0 to save'}
        </span>
      </div>
      <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.6rem' }}>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={handleSubmit}
          disabled={submitting || !balanced || disabled}
        >
          {submitting ? 'Posting…' : submitLabel}
        </button>
        {onCancel ? (
          <button type="button" className={styles.btnGhost} onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        ) : null}
      </div>
    </>
  );
}
