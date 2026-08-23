import type { UpdateCustomerDto, CustomerPartyType } from '@inventory-platform/user/types';
import { FormField, FormRow, Select, Stack, Text, surfaceChrome } from '@inventory-platform/ui-kit';

/** Derive PAN from GSTIN: 10 chars from 3rd character (1-based). */
function derivePanFromGstin(gstin: string | null | undefined): string {
  if (!gstin || gstin.length < 12) return '';
  return gstin.substring(2, 12);
}

const PARTY_TYPE_OPTIONS = [
  { value: 'CONSUMER', label: 'Consumer' },
  { value: 'RETAILER', label: 'Retailer' },
  { value: 'DISTRIBUTOR', label: 'Distributor' },
  { value: 'WHOLESALER', label: 'Wholesaler' },
] as const;

interface CustomerEditFormProps<T extends UpdateCustomerDto> {
  value: T;
  onChange: (value: T) => void;
  /** Display-only PAN from API (derived from GSTIN). Shown read-only. */
  panNo?: string | null;
  disabled?: boolean;
}

export function CustomerEditForm<T extends UpdateCustomerDto>({
  value,
  onChange,
  panNo,
  disabled = false,
}: CustomerEditFormProps<T>) {
  const panDisplay = panNo ?? derivePanFromGstin(value.gstin ?? null);

  return (
    <Stack gap="lg">
      <Stack gap="md">
        <FormField
          label="Name"
          value={value.name ?? ''}
          onChange={(v) => onChange({ ...value, name: v })}
          placeholder="Customer name"
          disabled={disabled}
          required
        />
        <FormField label="Party type">
          <Select
            value={value.partyType ?? 'CONSUMER'}
            options={[...PARTY_TYPE_OPTIONS]}
            onChange={(e) =>
              onChange({
                ...value,
                partyType: e.target.value as CustomerPartyType,
              })
            }
            disabled={disabled}
          />
        </FormField>
        <FormRow>
          <FormField
            label="Phone"
            type="tel"
            value={value.phone ?? ''}
            onChange={(v) => onChange({ ...value, phone: v })}
            placeholder="Mobile number"
            disabled={disabled}
          />
          <FormField
            label="Email"
            type="email"
            value={value.email ?? ''}
            onChange={(v) => onChange({ ...value, email: v })}
            placeholder="name@example.com"
            disabled={disabled}
          />
        </FormRow>
        <FormField
          label="Address"
          value={value.address ?? ''}
          onChange={(v) => onChange({ ...value, address: v })}
          multiline
          rows={2}
          placeholder="Street, area, city, state"
          disabled={disabled}
        />
      </Stack>

      <Stack gap="md">
        <Text as="h3" className={surfaceChrome.priceEditSectionTitle}>
          Tax & licence
        </Text>
        <FormRow>
          <FormField
            label="GSTIN"
            value={value.gstin ?? ''}
            onChange={(v) => onChange({ ...value, gstin: v })}
            placeholder="15-character GSTIN"
            disabled={disabled}
          />
          <FormField
            label="DL No"
            value={value.dlNo ?? ''}
            onChange={(v) => onChange({ ...value, dlNo: v })}
            placeholder="Drug licence number"
            disabled={disabled}
          />
        </FormRow>
        <FormField
          label="PAN"
          value={value.pan ?? panDisplay}
          onChange={(v) => onChange({ ...value, pan: v })}
          placeholder="PAN"
          hint="At least one of phone, email, GSTIN, PAN, or DL is required for a unique customer."
          disabled={disabled}
        />
      </Stack>
    </Stack>
  );
}
