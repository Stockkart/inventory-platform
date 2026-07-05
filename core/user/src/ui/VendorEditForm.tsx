import { useState, useEffect } from 'react';
import type { UpdateVendorDto } from '@inventory-platform/user/types';
import {
  FormField,
  Select,
  Stack,
  type SelectOptionDef,
} from '@inventory-platform/ui-kit';

interface VendorEditFormProps {
  value: UpdateVendorDto;
  onChange: (value: UpdateVendorDto) => void;
  disabled?: boolean;
}

const BUSINESS_TYPE_OPTIONS: readonly SelectOptionDef[] = [
  { value: 'WHOLESALE', label: 'Wholesale' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'MANUFACTURER', label: 'Manufacturer' },
  { value: 'DISTRIBUTOR', label: 'Distributor' },
  { value: 'C&F', label: 'C&F' },
  { value: 'OTHER', label: 'Other' },
];

const PRESET_BUSINESS_TYPES = new Set(
  BUSINESS_TYPE_OPTIONS.map((opt) => opt.value)
);

function isPresetBusinessType(value: string): boolean {
  return PRESET_BUSINESS_TYPES.has(value);
}

export function VendorEditForm({
  value,
  onChange,
  disabled = false,
}: VendorEditFormProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customType, setCustomType] = useState('');

  useEffect(() => {
    if (value.businessType && !isPresetBusinessType(value.businessType)) {
      setShowCustom(true);
      setCustomType(value.businessType);
    }
  }, [value.businessType]);

  return (
    <Stack gap="md">
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

      <FormField label="Business Type">
        <Select
          value={showCustom ? 'OTHER' : value.businessType ?? 'RETAIL'}
          disabled={disabled}
          options={BUSINESS_TYPE_OPTIONS}
          onChange={(e) => {
            const selected = e.target.value;

            if (selected === 'OTHER') {
              setShowCustom(true);
              setCustomType('');
              onChange({ ...value, businessType: 'OTHER' });
            } else {
              setShowCustom(false);
              setCustomType('');
              onChange({ ...value, businessType: selected });
            }
          }}
        />
      </FormField>

      {showCustom ? (
        <FormField
          label="Custom business type"
          value={customType}
          placeholder="Custom business type"
          disabled={disabled}
          onChange={(v) => {
            setCustomType(v);
            onChange({
              ...value,
              businessType: v.toUpperCase(),
            });
          }}
        />
      ) : null}

      <FormField
        label="GSTIN"
        value={value.gstinUin ?? ''}
        onChange={(v) => onChange({ ...value, gstinUin: v })}
        disabled={disabled}
      />
    </Stack>
  );
}
