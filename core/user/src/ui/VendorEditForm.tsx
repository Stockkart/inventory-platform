import { useEffect, useState } from 'react';
import type { PostalAddress, UpdateVendorDto } from '@inventory-platform/user/types';
import {
  FormField,
  FormRow,
  Select,
  Stack,
  Text,
  surfaceChrome,
  type SelectOptionDef,
} from '@inventory-platform/ui-kit';
import { GST_STATES, gstStateName } from '../model/gst-states';
import { isValidGstin } from '../model/gstin';
import type { GstinLookupResult } from '../model/gstin-lookup.types';
import {
  addressAfterGstinChange,
  pickFilled,
  prefillAddressFromGstin,
} from '../model/gstin-prefill';
import { GstinField, stateImpliedBy } from './GstinField';

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

const STATE_OPTIONS: readonly SelectOptionDef[] = [
  { value: '', label: 'Select state' },
  ...GST_STATES.map((s) => ({ value: s.code, label: `${s.name} (${s.code})` })),
];

const PRESET_BUSINESS_TYPES = new Set(BUSINESS_TYPE_OPTIONS.map((opt) => opt.value));

function isPresetBusinessType(value: string): boolean {
  return PRESET_BUSINESS_TYPES.has(value);
}

/** The vendor can be placed for tax: a valid GSTIN, or a state on the address. */
export function vendorIsPlaceable(
  value: Pick<UpdateVendorDto, 'gstinUin' | 'postalAddress'>,
): boolean {
  return isValidGstin(value.gstinUin) || Boolean(value.postalAddress?.stateCode);
}

export const VENDOR_PLACE_REQUIRED_MESSAGE =
  "Add the vendor's GSTIN, or at least the state on their address, so tax can be worked out";

/**
 * Fields the GST record can fill in. Only empty fields are touched — what the user typed stays —
 * unless `overwrite` is set (the "Use these details" link).
 */
export function prefillFromGstin(
  value: UpdateVendorDto,
  r: GstinLookupResult,
  overwrite = false,
): UpdateVendorDto {
  return {
    ...value,
    name: pickFilled(value.name, r.tradeName ?? r.legalName, overwrite),
    companyName: pickFilled(value.companyName, r.legalName, overwrite),
    address: pickFilled(value.address, r.address, overwrite),
    postalAddress: prefillAddressFromGstin(value.postalAddress, r, overwrite),
  };
}

export function VendorEditForm({ value, onChange, disabled = false }: VendorEditFormProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [customType, setCustomType] = useState('');

  useEffect(() => {
    if (value.businessType && !isPresetBusinessType(value.businessType)) {
      setShowCustom(true);
      setCustomType(value.businessType);
    }
  }, [value.businessType]);

  const gstinValid = isValidGstin(value.gstinUin);
  const stateFromGstin = stateImpliedBy(value.gstinUin);
  const stateLocked = Boolean(stateFromGstin);
  const addr = value.postalAddress ?? {};
  const setAddr = (patch: Partial<PostalAddress>) =>
    onChange({ ...value, postalAddress: { ...addr, ...patch } });

  const placeable = vendorIsPlaceable(value);

  return (
    <Stack gap="lg">
      <Stack gap="md">
        <GstinField
          id="vendor-gstin"
          label="GSTIN / UIN"
          party="supplier"
          value={value.gstinUin}
          disabled={disabled}
          emptyHint="Leave blank for an unregistered supplier — then pick their state below"
          onChange={(next) =>
            onChange({
              ...value,
              gstinUin: next,
              postalAddress: addressAfterGstinChange(
                value.postalAddress,
                stateFromGstin,
                stateImpliedBy(next),
              ),
            })
          }
          onRecord={(record) => onChange(prefillFromGstin(value, record))}
          onUseDetails={(record) => onChange(prefillFromGstin(value, record, true))}
        />

        <FormField
          label="Name"
          value={value.name ?? ''}
          onChange={(v) => onChange({ ...value, name: v })}
          placeholder="What you call this supplier"
          disabled={disabled}
          required
        />
        <FormField
          label="Company name"
          value={value.companyName ?? ''}
          onChange={(v) => onChange({ ...value, companyName: v })}
          placeholder="Legal name on their bills"
          disabled={disabled}
        />
      </Stack>

      <Stack gap="md">
        <Text as="h3" className={surfaceChrome.priceEditSectionTitle}>
          Address
        </Text>
        <FormField
          label="Address"
          value={addr.line1 ?? value.address ?? ''}
          onChange={(v) => onChange({ ...value, address: v, postalAddress: { ...addr, line1: v } })}
          multiline
          rows={2}
          placeholder="Street, area"
          disabled={disabled}
        />
        <FormRow>
          <FormField
            label="City"
            value={addr.city ?? ''}
            onChange={(v) => setAddr({ city: v })}
            disabled={disabled}
          />
          <FormField
            label="State"
            htmlFor="vendor-state"
            required={!gstinValid}
            hint={
              stateLocked
                ? `From the GSTIN: ${gstStateName(stateFromGstin)}`
                : !placeable
                ? VENDOR_PLACE_REQUIRED_MESSAGE
                : undefined
            }
          >
            <Select
              id="vendor-state"
              value={addr.stateCode ?? ''}
              options={STATE_OPTIONS}
              disabled={disabled || stateLocked}
              onChange={(e) => setAddr({ stateCode: e.target.value || undefined })}
            />
          </FormField>
          <FormField
            label="Pincode"
            value={addr.pincode ?? ''}
            onChange={(v) => setAddr({ pincode: v.replace(/\D/g, '').slice(0, 6) })}
            placeholder="6 digits"
            disabled={disabled}
          />
        </FormRow>
      </Stack>

      <Stack gap="md">
        <Text as="h3" className={surfaceChrome.priceEditSectionTitle}>
          Contact & business
        </Text>
        <FormRow>
          <FormField
            label="Phone"
            type="tel"
            value={value.contactPhone ?? ''}
            onChange={(v) => onChange({ ...value, contactPhone: v })}
            placeholder="Mobile number"
            disabled={disabled}
          />
          <FormField
            label="Email"
            type="email"
            value={value.contactEmail ?? ''}
            onChange={(v) => onChange({ ...value, contactEmail: v })}
            placeholder="name@example.com"
            disabled={disabled}
          />
        </FormRow>
        <FormField label="Business type">
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
            placeholder="Enter business type"
            disabled={disabled}
            onChange={(v) => {
              setCustomType(v);
              onChange({ ...value, businessType: v.toUpperCase() });
            }}
          />
        ) : null}
        <FormField
          label="DL no."
          value={value.dlNo ?? ''}
          onChange={(v) => onChange({ ...value, dlNo: v })}
          placeholder="Drug licence number"
          disabled={disabled}
        />
      </Stack>
    </Stack>
  );
}
