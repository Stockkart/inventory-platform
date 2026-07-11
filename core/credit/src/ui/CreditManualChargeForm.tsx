import { useState } from 'react';
import type { CreateCreditEntryDto, CreditPartyType } from '@inventory-platform/credit/types';
import {
  Box,
  Button,
  FormField,
  FormRow,
  Grid,
  Input,
  Select,
  Stack,
  type SelectOptionDef,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';

type Props = {
  submitting: boolean;
  onSubmit: (body: CreateCreditEntryDto) => Promise<void>;
};

const PARTY_TYPE_OPTIONS: SelectOptionDef[] = [
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'VENDOR', label: 'Vendor' },
];

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
    <Stack gap="md" padding="md" rounded="lg" border className={surfaceChrome.creditManualCard}>
      <Text variant="heading3" weight="bold">
        Create your first credit balance
      </Text>
      <Text variant="caption" color="secondary">
        No parties in the ledger yet. Add a charge to open a customer or vendor account. After that,
        pick the party in the sidebar — you won&apos;t need to enter ids again.
      </Text>
      <Box as="form" onSubmit={handleSubmit}>
        <Stack gap="md">
          <FormRow>
            <FormField label="Party type" id="manual-party-kind">
              <Select
                id="manual-party-kind"
                options={PARTY_TYPE_OPTIONS}
                value={partyType}
                onChange={(e) => setPartyType(e.target.value as CreditPartyType)}
                disabled={submitting}
              />
            </FormField>
            <FormField label="Party id" id="manual-party-id" required>
              <Input
                id="manual-party-id"
                type="text"
                placeholder="Mongo / internal id used elsewhere"
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                disabled={submitting}
                required
              />
            </FormField>
          </FormRow>
          <FormRow>
            <FormField label="Display name" id="manual-party-name" required>
              <Input
                id="manual-party-name"
                type="text"
                placeholder="Name shown in the ledger"
                value={partyDisplayName}
                onChange={(e) => setPartyDisplayName(e.target.value)}
                disabled={submitting}
                required
              />
            </FormField>
            <FormField label="Phone (optional)" id="manual-party-phone">
              <Input
                id="manual-party-phone"
                type="text"
                inputMode="tel"
                placeholder="Contact"
                value={partyPhone}
                onChange={(e) => setPartyPhone(e.target.value)}
                disabled={submitting}
              />
            </FormField>
          </FormRow>
          <FormRow>
            <FormField label="Amount (₹)" id="manual-amt" required>
              <Input
                id="manual-amt"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={submitting}
                required
                className={surfaceChrome.amountInputLg}
              />
            </FormField>
            <FormField label="Note (optional)" id="manual-note">
              <Input
                id="manual-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={submitting}
              />
            </FormField>
          </FormRow>
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
            {submitting ? 'Saving…' : 'Add charge & open ledger'}
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
}
