import { useState } from 'react';
import type { CreateCreditEntryDto, CreditPartyType } from '@inventory-platform/credit/types';
import {
  Box,
  Button,
  FormField,
  FormRow,
  Input,
  Select,
  type SelectOptionDef,
  Text,
} from '@inventory-platform/ui-kit';
import styles from './credit.module.css';

type Props = {
  submitting: boolean;
  onSubmit: (body: CreateCreditEntryDto) => Promise<void>;
};

const PARTY_TYPE_OPTIONS: SelectOptionDef[] = [
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'VENDOR', label: 'Vendor' },
];

/**
 * Full party fields for the first manual charge when no credit accounts exist yet.
 */
export function CreditManualChargeForm({ submitting, onSubmit }: Props) {
  const [partyType, setPartyType] = useState<CreditPartyType>('CUSTOMER');
  const [partyId, setPartyId] = useState('');
  const [partyDisplayName, setPartyDisplayName] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [referenceType, setReferenceType] = useState('');
  const [referenceId, setReferenceId] = useState('');

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const amt = Number(amount.trim().replace(/,/g, ''));
    if (!partyId.trim() || !partyDisplayName.trim() || !Number.isFinite(amt) || amt <= 0) {
      return;
    }
    await onSubmit({
      partyType,
      partyId: partyId.trim(),
      partyDisplayName: partyDisplayName.trim(),
      partyPhone: partyPhone.trim() || undefined,
      amount: amt,
      note: note.trim() || undefined,
      referenceType: referenceType.trim() || undefined,
      referenceId: referenceId.trim() || undefined,
    });
    setAmount('');
    setNote('');
  }

  return (
    <Box className={styles.manualChargeCard}>
      <Text variant="heading3" className={styles.manualChargeTitle}>
        Create your first credit balance
      </Text>
      <Text className={styles.manualChargeIntro}>
        No parties in the ledger yet. Add a charge to open a customer or vendor account. After that,
        pick the party in the sidebar — you won&apos;t need to enter ids again.
      </Text>
      <Box as="form" className={styles.manualChargeForm} onSubmit={handleSubmit}>
        <Box className={styles.manualRow}>
          <FormRow>
            <FormField label="Party type" id="manual-party-kind" className={styles.compactField}>
              <Select
                id="manual-party-kind"
                className={styles.compactInput}
                options={PARTY_TYPE_OPTIONS}
                value={partyType}
                onChange={(e) => setPartyType(e.target.value as CreditPartyType)}
                disabled={submitting}
              />
            </FormField>
            <FormField
              label="Party id"
              id="manual-party-id"
              required
              className={styles.compactField}
            >
              <Input
                id="manual-party-id"
                type="text"
                className={styles.compactInput}
                placeholder="Mongo / internal id used elsewhere"
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                disabled={submitting}
                required
              />
            </FormField>
          </FormRow>
        </Box>
        <Box className={styles.manualRow}>
          <FormRow>
            <FormField
              label="Display name"
              id="manual-party-name"
              required
              className={styles.compactField}
            >
              <Input
                id="manual-party-name"
                type="text"
                className={styles.compactInput}
                placeholder="Name shown in the ledger"
                value={partyDisplayName}
                onChange={(e) => setPartyDisplayName(e.target.value)}
                disabled={submitting}
                required
              />
            </FormField>
            <FormField
              label="Phone (optional)"
              id="manual-party-phone"
              className={styles.compactField}
            >
              <Input
                id="manual-party-phone"
                type="text"
                className={styles.compactInput}
                inputMode="tel"
                placeholder="Contact"
                value={partyPhone}
                onChange={(e) => setPartyPhone(e.target.value)}
                disabled={submitting}
              />
            </FormField>
          </FormRow>
        </Box>
        <Box className={styles.manualRow}>
          <FormRow>
            <FormField label="Amount (₹)" id="manual-amt" required className={styles.compactField}>
              <Input
                id="manual-amt"
                type="text"
                inputMode="decimal"
                className={styles.amountInput}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={submitting}
                required
              />
            </FormField>
            <FormField label="Note (optional)" id="manual-note" className={styles.compactField}>
              <Input
                id="manual-note"
                type="text"
                className={styles.compactInput}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={submitting}
              />
            </FormField>
          </FormRow>
        </Box>
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
        <Button
          type="submit"
          variant="solid"
          className={styles.primarySubmit}
          disabled={submitting}
        >
          {submitting ? 'Saving…' : 'Add charge & open ledger'}
        </Button>
      </Box>
    </Box>
  );
}
