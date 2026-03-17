import { useState, useEffect } from 'react';
import type { UpdateVendorDto } from '@inventory-platform/types';
import { FormField } from './FormField';
import formStyles from './forms.module.css';
import styles from './VendorEditForm.module.css';

interface VendorEditFormProps {
  value: UpdateVendorDto;
  onChange: (value: UpdateVendorDto) => void;
  disabled?: boolean;
}

const BUSINESS_TYPES = [
  'WHOLESALE',
  'RETAIL',
  'MANUFACTURER',
  'DISTRIBUTOR',
  'C&F',
  'OTHER',
] as const;

export function VendorEditForm({
  value,
  onChange,
  disabled = false,
}: VendorEditFormProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customType, setCustomType] = useState('');

  useEffect(() => {
    if (
      value.businessType &&
      !BUSINESS_TYPES.includes(value.businessType as any)
    ) {
      setShowCustom(true);
      setCustomType(value.businessType);
    }
  }, [value.businessType]);

  return (
    <div className={formStyles.form}>
      <FormField
        label="Name"
        value={value.name ?? ''}
        onChange={(v) => onChange({ ...value, name: v })}
        disabled={disabled}
      />

      <FormField
        label="Contact Phone"
        type="tel"
        value={value.contactPhone ?? ''}
        onChange={(v) => onChange({ ...value, contactPhone: v })}
        disabled={disabled}
      />

      <FormField
        label="Email"
        type="email"
        value={value.contactEmail ?? ''}
        onChange={(v) => onChange({ ...value, contactEmail: v })}
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

      {/* ✅ Business Type dropdown */}
      <div className={formStyles.formGroup}>
        <label className={formStyles.label}>Business Type</label>

        <div className={styles.selectWrap}>
          <select
            className={`${formStyles.input} ${styles.selectInput}`}
            value={showCustom ? 'OTHER' : value.businessType ?? 'RETAIL'}
            disabled={disabled}
            onChange={(e) => {
              const val = e.target.value;

              if (val === 'OTHER') {
                setShowCustom(true);
                setCustomType('');
                onChange({ ...value, businessType: 'OTHER' });
              } else {
                setShowCustom(false);
                setCustomType('');
                onChange({ ...value, businessType: val });
              }
            }}
          >
            <option value="WHOLESALE">Wholesale</option>
            <option value="RETAIL">Retail</option>
            <option value="MANUFACTURER">Manufacturer</option>
            <option value="DISTRIBUTOR">Distributor</option>
            <option value="C&F">C&F</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {showCustom && (
          <input
            className={formStyles.input}
            placeholder="Custom business type"
            value={customType}
            disabled={disabled}
            onChange={(e) => {
              setCustomType(e.target.value);
              onChange({
                ...value,
                businessType: e.target.value.toUpperCase(),
              });
            }}
          />
        )}
      </div>

      <FormField
        label="GSTIN"
        value={value.gstinUin ?? ''}
        onChange={(v) => onChange({ ...value, gstinUin: v })}
        disabled={disabled}
      />
    </div>
  );
}
