import type { UpdateCustomerDto } from '@inventory-platform/types';
import { FormField } from './FormField';
import { FormRow } from './FormRow';
import styles from './CustomerEditForm.module.css';

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
    <div className={styles.form}>
      <FormField
        label="Name"
        value={value.name ?? ''}
        onChange={(v) => onChange({ ...value, name: v })}
        disabled={disabled}
      />
      <FormField
        label="Phone"
        type="tel"
        value={value.phone ?? ''}
        onChange={(v) => onChange({ ...value, phone: v })}
        disabled={disabled}
      />
      <FormField
        label="Email"
        type="email"
        value={value.email ?? ''}
        onChange={(v) => onChange({ ...value, email: v })}
        disabled={disabled}
      />
      <FormField
        label="Address"
        value={value.address ?? ''}
        onChange={(v) => onChange({ ...value, address: v })}
        multiline
        rows={3}
        disabled={disabled}
      />
      <FormRow>
        <FormField
          label="GSTIN"
          value={value.gstin ?? ''}
          onChange={(v) => onChange({ ...value, gstin: v })}
          disabled={disabled}
        />
        <FormField
          label="DL No"
          value={value.dlNo ?? ''}
          onChange={(v) => onChange({ ...value, dlNo: v })}
          disabled={disabled}
        />
      </FormRow>
      <FormField label="PAN" value={panDisplay} readOnly disabled />
    </div>
  );
}
