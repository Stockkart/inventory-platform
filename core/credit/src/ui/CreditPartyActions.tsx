import { useEffect, useState } from 'react';
import type { CreateCreditEntryDto, CreditAccountResponse, CreditSettlementPaymentMethod } from '@inventory-platform/credit/types';
import {
  Box,
  Button,
  FormField,
  Inline,
  Input,
  Select,
  type SelectOptionDef,
  Text,
} from '@inventory-platform/ui-kit';
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

const PAYMENT_METHOD_OPTIONS: SelectOptionDef[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK', label: 'Bank transfer' },
  { value: 'CARD', label: 'Card' },
  { value: 'ADJUSTMENT', label: 'Adjustment / write-off' },
];

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
    <Box className={styles.partyActions}>
      <Box className={styles.partyContext} aria-live="polite">
        <Box className={styles.partyContextTop}>
          <Box
            as="span"
            className={`${styles.partyContextBadge} ${
              account.partyType === 'VENDOR'
                ? styles.partyContextBadgeVendor
                : styles.partyContextBadgeCustomer
            }`}
          >
            {partyKindLabel}
          </Box>
          <Text className={styles.partyContextSub}>{sub}</Text>
        </Box>
        <Box className={styles.partyContextMain}>
          <Box as="span" className={styles.partyContextName}>
            {account.partyDisplayName}
          </Box>
          {account.partyPhone ? (
            <Box as="span" className={styles.partyContextPhone}>
              {account.partyPhone}
            </Box>
          ) : null}
        </Box>
        <Box className={`${styles.partyContextBalBlock} ${CONTEXT_TONE[bal.tone]}`}>
          <Box as="span" className={styles.partyContextBalLabel}>
            {bal.headline}
          </Box>
          {bal.tone !== 'settled' ? (
            <Box as="span" className={styles.partyContextBalAmt}>
              {bal.amountLine}
            </Box>
          ) : null}
        </Box>
      </Box>

      <Inline
        className={styles.actionTabs}
        role="tablist"
        aria-label="Entry type"
        gap="none"
      >
        <Button
          type="button"
          variant="ghost"
          role="tab"
          aria-selected={mode === 'charge'}
          className={mode === 'charge' ? styles.actionTabActive : styles.actionTab}
          onClick={() => setMode('charge')}
          disabled={submitting}
        >
          {copy.tabIncrease}
        </Button>
        <Button
          type="button"
          variant="ghost"
          role="tab"
          aria-selected={mode === 'settlement'}
          className={mode === 'settlement' ? styles.actionTabActive : styles.actionTab}
          onClick={() => setMode('settlement')}
          disabled={submitting}
        >
          {copy.tabReduce}
        </Button>
      </Inline>

      <Text className={styles.modeHint}>
        {mode === 'charge' ? copy.hintIncrease : copy.hintReduce}
      </Text>

      <Box as="form" className={styles.compactForm} onSubmit={handleSubmit}>
        <FormField label="Amount (₹)" id="credit-party-amount" required className={styles.compactField}>
          <Input
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
        </FormField>

        <FormField label="Date" id="credit-party-txn-date" required className={styles.compactField}>
          <Input
            id="credit-party-txn-date"
            type="date"
            className={styles.compactInput}
            value={txnDate}
            onChange={(e) => setTxnDate(e.target.value)}
            disabled={submitting}
            required
          />
        </FormField>

        {mode === 'settlement' ? (
          <>
            <FormField
              label="Payment method"
              id="credit-party-method"
              required
              className={styles.compactField}
            >
              <Select
                id="credit-party-method"
                className={styles.compactInput}
                options={PAYMENT_METHOD_OPTIONS}
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as CreditSettlementPaymentMethod)
                }
                disabled={submitting}
                required
              />
            </FormField>
            <FormField
              label="Reference (optional)"
              id="credit-party-bank-ref"
              className={styles.compactField}
            >
              <Input
                id="credit-party-bank-ref"
                type="text"
                className={styles.compactInput}
                value={bankRef}
                onChange={(e) => setBankRef(e.target.value)}
                placeholder="UTR, cheque no., etc."
                disabled={submitting}
              />
            </FormField>
          </>
        ) : null}

        <FormField label="Note (optional)" id="credit-party-note" className={styles.compactField}>
          <Input
            id="credit-party-note"
            type="text"
            className={styles.compactInput}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Invoice ref, UPI ref…"
            disabled={submitting}
          />
        </FormField>

        <Box as="details" className={styles.advancedDetails}>
          <Box as="summary" className={styles.advancedSummary}>
            Reference (optional)
          </Box>
          <Box className={styles.advancedFields}>
            <Input
              aria-label="Reference type"
              type="text"
              className={styles.compactInput}
              value={referenceType}
              onChange={(e) => setReferenceType(e.target.value)}
              placeholder="Reference type"
              disabled={submitting}
            />
            <Input
              aria-label="Reference id"
              type="text"
              className={styles.compactInput}
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="Reference id"
              disabled={submitting}
            />
          </Box>
        </Box>

        <Button type="submit" variant="solid" className={styles.primarySubmit} disabled={submitting}>
          {submitting
            ? 'Saving…'
            : mode === 'charge'
              ? copy.submitIncrease
              : copy.submitReduce}
        </Button>
      </Box>
    </Box>
  );
}
