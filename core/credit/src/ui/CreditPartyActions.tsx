import { useEffect, useState } from 'react';
import type {
  CreateCreditEntryDto,
  CreditAccountResponse,
  CreditSettlementPaymentMethod,
} from '@inventory-platform/types';
import {
  creditActionCopy,
  presentCreditBalance,
  todayLocalDate,
  type CreditBalanceTone,
} from '../model/credit-utils';
import styles from './credit.module.css';

type Props = {
  account: CreditAccountResponse;
  submitting: boolean;
  onSubmitCharge: (body: CreateCreditEntryDto) => Promise<void>;
  onSubmitSettlement: (body: CreateCreditEntryDto) => Promise<void>;
};

const CONTEXT_TONE: Record<CreditBalanceTone, string> = {
  collect: styles.contextBalCollect,
  pay: styles.contextBalPay,
  advance_customer: styles.contextBalAdvIn,
  advance_vendor: styles.contextBalAdvOut,
  settled: styles.contextBalSettled,
};

export function CreditPartyActions({
  account,
  submitting,
  onSubmitCharge,
  onSubmitSettlement,
}: Props) {
  const [mode, setMode] = useState<'charge' | 'settlement'>('charge');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [referenceType, setReferenceType] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<CreditSettlementPaymentMethod>('CASH');
  const [bankRef, setBankRef] = useState('');
  const [txnDate, setTxnDate] = useState(todayLocalDate());

  const copy = creditActionCopy(account.partyType);
  const bal = presentCreditBalance(account);

  useEffect(() => {
    setMode('charge');
    setAmount('');
    setNote('');
    setReferenceType('');
    setReferenceId('');
    setPaymentMethod('CASH');
    setBankRef('');
    setTxnDate(todayLocalDate());
  }, [account.id]);

  function buildBody(): CreateCreditEntryDto {
    const amt = Number(amount.trim().replace(/,/g, ''));
    const base: CreateCreditEntryDto = {
      partyType: account.partyType,
      partyId: account.partyId,
      partyDisplayName: account.partyDisplayName,
      partyPhone: account.partyPhone?.trim() ? String(account.partyPhone).trim() : undefined,
      amount: amt,
      note: note.trim() || undefined,
      referenceType: referenceType.trim() || undefined,
      referenceId: referenceId.trim() || undefined,
    };
    base.txnDate = txnDate || todayLocalDate();
    if (mode === 'settlement') {
      base.paymentMethod = paymentMethod;
      base.bankRef = bankRef.trim() || undefined;
    }
    return base;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const body = buildBody();
    if (!Number.isFinite(body.amount) || body.amount <= 0) {
      return;
    }
    if (mode === 'charge') {
      await onSubmitCharge(body);
    } else {
      await onSubmitSettlement(body);
    }
    setAmount('');
    setNote('');
    setReferenceType('');
    setReferenceId('');
    setBankRef('');
  }

  const partyKindLabel = account.partyType === 'VENDOR' ? 'Vendor' : 'Customer';
  const sub =
    account.partyType === 'CUSTOMER'
      ? 'Money others need to pay you'
      : 'Money you need to pay suppliers';

  return (
    <div className={styles.partyActions}>
      <div className={styles.partyContext} aria-live="polite">
        <div className={styles.partyContextTop}>
          <span
            className={`${styles.partyContextBadge} ${
              account.partyType === 'VENDOR'
                ? styles.partyContextBadgeVendor
                : styles.partyContextBadgeCustomer
            }`}
          >
            {partyKindLabel}
          </span>
          <p className={styles.partyContextSub}>{sub}</p>
        </div>
        <div className={styles.partyContextMain}>
          <span className={styles.partyContextName}>{account.partyDisplayName}</span>
          {account.partyPhone ? (
            <span className={styles.partyContextPhone}>{account.partyPhone}</span>
          ) : null}
        </div>
        <div className={`${styles.partyContextBalBlock} ${CONTEXT_TONE[bal.tone]}`}>
          <span className={styles.partyContextBalLabel}>{bal.headline}</span>
          {bal.tone !== 'settled' ? (
            <span className={styles.partyContextBalAmt}>{bal.amountLine}</span>
          ) : null}
        </div>
      </div>

      <div className={styles.actionTabs} role="tablist" aria-label="Entry type">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'charge'}
          className={mode === 'charge' ? styles.actionTabActive : styles.actionTab}
          onClick={() => setMode('charge')}
          disabled={submitting}
        >
          {copy.tabIncrease}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'settlement'}
          className={mode === 'settlement' ? styles.actionTabActive : styles.actionTab}
          onClick={() => setMode('settlement')}
          disabled={submitting}
        >
          {copy.tabReduce}
        </button>
      </div>

      <p className={styles.modeHint}>{mode === 'charge' ? copy.hintIncrease : copy.hintReduce}</p>

      <form className={styles.compactForm} onSubmit={handleSubmit}>
        <div className={styles.compactField}>
          <label className={styles.compactLabel} htmlFor="credit-party-amount">
            Amount (₹)
          </label>
          <input
            id="credit-party-amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            className={styles.amountInput}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={submitting}
            required
          />
        </div>

        <div className={styles.compactField}>
          <label className={styles.compactLabel} htmlFor="credit-party-txn-date">
            Date
          </label>
          <input
            id="credit-party-txn-date"
            type="date"
            className={styles.compactInput}
            value={txnDate}
            onChange={(e) => setTxnDate(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        {mode === 'settlement' ? (
          <>
            <div className={styles.compactField}>
              <label className={styles.compactLabel} htmlFor="credit-party-method">
                Payment method
              </label>
              <select
                id="credit-party-method"
                className={styles.compactInput}
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as CreditSettlementPaymentMethod)
                }
                disabled={submitting}
                required
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK">Bank transfer</option>
                <option value="CARD">Card</option>
                <option value="ADJUSTMENT">Adjustment / write-off</option>
              </select>
            </div>
            <div className={styles.compactField}>
              <label className={styles.compactLabel} htmlFor="credit-party-bank-ref">
                Reference <span className={styles.optionalMark}>(optional)</span>
              </label>
              <input
                id="credit-party-bank-ref"
                type="text"
                className={styles.compactInput}
                value={bankRef}
                onChange={(e) => setBankRef(e.target.value)}
                placeholder="UTR, cheque no., etc."
                disabled={submitting}
              />
            </div>
          </>
        ) : null}

        <div className={styles.compactField}>
          <label className={styles.compactLabel} htmlFor="credit-party-note">
            Note <span className={styles.optionalMark}>(optional)</span>
          </label>
          <input
            id="credit-party-note"
            type="text"
            className={styles.compactInput}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Invoice ref, UPI ref…"
            disabled={submitting}
          />
        </div>

        <details className={styles.advancedDetails}>
          <summary className={styles.advancedSummary}>Reference (optional)</summary>
          <div className={styles.advancedFields}>
            <input
              aria-label="Reference type"
              type="text"
              className={styles.compactInput}
              value={referenceType}
              onChange={(e) => setReferenceType(e.target.value)}
              placeholder="Reference type"
              disabled={submitting}
            />
            <input
              aria-label="Reference id"
              type="text"
              className={styles.compactInput}
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="Reference id"
              disabled={submitting}
            />
          </div>
        </details>

        <button type="submit" className={styles.primarySubmit} disabled={submitting}>
          {submitting
            ? 'Saving…'
            : mode === 'charge'
              ? copy.submitIncrease
              : copy.submitReduce}
        </button>
      </form>
    </div>
  );
}
