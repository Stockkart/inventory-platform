import type { UpdateCustomerDto } from '@inventory-platform/user/types';
import { FormField, FormRow, Stack, Text, surfaceChrome } from '@inventory-platform/ui-kit';

/** Derive PAN from GSTIN: 10 chars from 3rd character (1-based). */
function derivePanFromGstin(gstin: string | null | undefined): string {
  if (!gstin || gstin.length < 12) return '';
  return gstin.substring(2, 12);
}

interface CustomerEditFormProps {
  value: UpdateCustomerDto;
  onChange: (value: UpdateCustomerDto) => void;
  /** Display-only PAN from API (derived from GSTIN). Shown read-only. */
  panNo?: string | null;
  disabled?: boolean;
}

export function CustomerEditForm({
  value,
  onChange,
  panNo,
  disabled = false,
}: CustomerEditFormProps) {
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
          value={panDisplay}
          readOnly
          placeholder="Derived from GSTIN"
          hint="Auto-filled from GSTIN when available. Not editable here."
        />
      </Stack>
    </Stack>
  );
}
