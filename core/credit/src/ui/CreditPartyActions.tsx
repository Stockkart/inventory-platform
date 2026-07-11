import { useEffect, useState } from 'react';
import type {
  CreateCreditEntryDto,
  CreditAccountResponse,
  CreditSettlementPaymentMethod,
} from '@inventory-platform/credit/types';
import {
  Badge,
  Box,
  Button,
  FormField,
  Grid,
  Inline,
  Input,
  Select,
  Stack,
  type SelectOptionDef,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { creditActionCopy, presentCreditBalance, todayLocalDate } from '../model/credit-utils';
import {
  accountBalToneStyle,
  actionTabStyle,
  contextBalBlockStyle,
  contextBalLabelStyle,
} from './creditStyles';

type Props = {
  account: CreditAccountResponse;
  submitting: boolean;
  onSubmitCharge: (body: CreateCreditEntryDto) => Promise<void>;
  onSubmitSettlement: (body: CreateCreditEntryDto) => Promise<void>;
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
  const [paymentMethod, setPaymentMethod] = useState<CreditSettlementPaymentMethod>('CASH');
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
    <Stack gap="md">
      <Stack
        gap="sm"
        padding="md"
        rounded="lg"
        border
        aria-live="polite"
        className={surfaceChrome.creditContextCard}
      >
        <Inline justify="between" align="start" flexWrap>
          <Badge variant={account.partyType === 'VENDOR' ? 'info' : 'success'}>
            {partyKindLabel}
          </Badge>
          <Text
            variant="caption"
            color="secondary"
            align="right"
            className={surfaceChrome.growMin8}
          >
            {sub}
          </Text>
        </Inline>
        <Stack gap="xs">
          <Text weight="bold">{account.partyDisplayName}</Text>
          {account.partyPhone ? (
            <Text variant="caption" color="secondary">
              {account.partyPhone}
            </Text>
          ) : null}
        </Stack>
        <Inline
          justify="between"
          align="end"
          flexWrap
          padding="sm"
          rounded="md"
          border
          style={contextBalBlockStyle[bal.tone]}
        >
          <Text weight="bold" style={contextBalLabelStyle[bal.tone]}>
            {bal.headline}
          </Text>
          {bal.tone !== 'settled' ? (
            <Text weight="bold" style={accountBalToneStyle[bal.tone]}>
              {bal.amountLine}
            </Text>
          ) : null}
        </Inline>
      </Stack>

      <Inline
        role="tablist"
        aria-label="Entry type"
        gap="none"
        padding="xs"
        rounded="md"
        className={surfaceChrome.creditTabTrack}
      >
        <Button
          type="button"
          variant="ghost"
          role="tab"
          aria-selected={mode === 'charge'}
          style={actionTabStyle(mode === 'charge')}
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
          style={actionTabStyle(mode === 'settlement')}
          onClick={() => setMode('settlement')}
          disabled={submitting}
        >
          {copy.tabReduce}
        </Button>
      </Inline>

      <Text variant="caption" color="secondary">
        {mode === 'charge' ? copy.hintIncrease : copy.hintReduce}
      </Text>

      <Box as="form" onSubmit={handleSubmit}>
        <Stack gap="md">
          <FormField label="Amount (₹)" id="credit-party-amount" required>
            <Input
              id="credit-party-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={submitting}
              required
              className={surfaceChrome.amountInputLg}
            />
          </FormField>

          <FormField label="Date" id="credit-party-txn-date" required>
            <Input
              id="credit-party-txn-date"
              type="date"
              value={txnDate}
              onChange={(e) => setTxnDate(e.target.value)}
              disabled={submitting}
              required
            />
          </FormField>

          {mode === 'settlement' ? (
            <>
              <FormField label="Payment method" id="credit-party-method" required>
                <Select
                  id="credit-party-method"
                  options={PAYMENT_METHOD_OPTIONS}
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as CreditSettlementPaymentMethod)
                  }
                  disabled={submitting}
                  required
                />
              </FormField>
              <FormField label="Reference (optional)" id="credit-party-bank-ref">
                <Input
                  id="credit-party-bank-ref"
                  type="text"
                  value={bankRef}
                  onChange={(e) => setBankRef(e.target.value)}
                  placeholder="UTR, cheque no., etc."
                  disabled={submitting}
                />
              </FormField>
            </>
          ) : null}

          <FormField label="Note (optional)" id="credit-party-note">
            <Input
              id="credit-party-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Invoice ref, UPI ref…"
              disabled={submitting}
            />
          </FormField>

          <Box as="details">
            <Box as="summary">
              <Text variant="caption" weight="semibold" color="secondary">
                Reference (optional)
              </Text>
            </Box>
            <Box padding="sm">
              <Grid columns={2} gap="sm">
                <Input
                  aria-label="Reference type"
                  type="text"
                  value={referenceType}
                  onChange={(e) => setReferenceType(e.target.value)}
                  placeholder="Reference type"
                  disabled={submitting}
                />
                <Input
                  aria-label="Reference id"
                  type="text"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  placeholder="Reference id"
                  disabled={submitting}
                />
              </Grid>
            </Box>
          </Box>

          <Button type="submit" variant="solid" disabled={submitting}>
            {submitting ? 'Saving…' : mode === 'charge' ? copy.submitIncrease : copy.submitReduce}
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}
