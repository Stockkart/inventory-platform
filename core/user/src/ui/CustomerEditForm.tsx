import type {
  CustomerPartyType,
  PostalAddress,
  UpdateCustomerDto,
} from '@inventory-platform/user/types';
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
import type { GstinLookupResult } from '../model/gstin-lookup.types';
import {
  addressAfterGstinChange,
  pickFilled,
  prefillAddressFromGstin,
} from '../model/gstin-prefill';
import { GstinField, stateImpliedBy } from './GstinField';

/** Derive PAN from GSTIN: 10 chars from 3rd character (1-based). */
function derivePanFromGstin(gstin: string | null | undefined): string {
  if (!gstin || gstin.length < 12) return '';
  return gstin.substring(2, 12);
}

const PARTY_TYPE_OPTIONS: readonly SelectOptionDef[] = [
  { value: 'CONSUMER', label: 'Consumer' },
  { value: 'RETAILER', label: 'Retailer' },
  { value: 'DISTRIBUTOR', label: 'Distributor' },
  { value: 'WHOLESALER', label: 'Wholesaler' },
];

const STATE_OPTIONS: readonly SelectOptionDef[] = [
  { value: '', label: 'Not known' },
  ...GST_STATES.map((s) => ({ value: s.code, label: `${s.name} (${s.code})` })),
];

/**
 * Fields the GST record can fill in for a customer. Only empty fields are touched — what the user
 * typed stays — unless `overwrite` is set (the "Use these details" link). A registered buyer is a
 * business, so the party type moves off Consumer when it is still at the default.
 */
export function prefillCustomerFromGstin<T extends UpdateCustomerDto>(
  value: T,
  r: GstinLookupResult,
  overwrite = false,
): T {
  const partyType =
    !value.partyType || value.partyType === 'CONSUMER' ? 'RETAILER' : value.partyType;
  return {
    ...value,
    name: pickFilled(value.name, r.tradeName ?? r.legalName, overwrite),
    address: pickFilled(value.address, r.address, overwrite),
    postalAddress: prefillAddressFromGstin(value.postalAddress, r, overwrite),
    partyType,
  };
}

interface CustomerEditFormProps<T extends UpdateCustomerDto> {
  value: T;
  onChange: (value: T) => void;
  /** Display-only PAN from API (derived from GSTIN). Shown read-only. */
  panNo?: string | null;
  disabled?: boolean;
  /** Prefix for element ids, so two forms on one page do not collide. */
  idPrefix?: string;
}

/**
 * GSTIN first: a registered buyer's name, address and state come from the GST network when a
 * provider is configured, and the state is read from the GSTIN itself either way. Nothing about
 * the address is required — most customers are walk-ins, and a sale with no known place is local.
 */
export function CustomerEditForm<T extends UpdateCustomerDto>({
  value,
  onChange,
  panNo,
  disabled = false,
  idPrefix = 'customer',
}: CustomerEditFormProps<T>) {
  const panDisplay = panNo ?? derivePanFromGstin(value.gstin ?? null);
  const stateFromGstin = stateImpliedBy(value.gstin);
  const stateLocked = Boolean(stateFromGstin);
  const addr = value.postalAddress ?? {};
  const setAddr = (patch: Partial<PostalAddress>) =>
    onChange({ ...value, postalAddress: { ...addr, ...patch } });

  return (
    <Stack gap="lg">
      <Stack gap="md">
        <GstinField
          id={`${idPrefix}-gstin`}
          party="customer"
          value={value.gstin}
          disabled={disabled}
          emptyHint="Leave blank for a walk-in or unregistered buyer"
          onChange={(next) =>
            onChange({
              ...value,
              gstin: next,
              postalAddress: addressAfterGstinChange(
                value.postalAddress,
                stateFromGstin,
                stateImpliedBy(next),
              ),
            })
          }
          onRecord={(record) => onChange(prefillCustomerFromGstin(value, record))}
          onUseDetails={(record) => onChange(prefillCustomerFromGstin(value, record, true))}
        />
        <FormField
          label="Name"
          value={value.name ?? ''}
          onChange={(v) => onChange({ ...value, name: v })}
          placeholder="Customer name"
          disabled={disabled}
          required
        />
        <FormField label="Party type" htmlFor={`${idPrefix}-party-type`}>
          <Select
            id={`${idPrefix}-party-type`}
            value={value.partyType ?? 'CONSUMER'}
            options={PARTY_TYPE_OPTIONS}
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
            htmlFor={`${idPrefix}-state`}
            hint={
              stateLocked
                ? `From the GSTIN: ${gstStateName(stateFromGstin)}`
                : 'Optional. A customer in another state is charged IGST instead of CGST + SGST.'
            }
          >
            <Select
              id={`${idPrefix}-state`}
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
          Licence & PAN
        </Text>
        <FormRow>
          <FormField
            label="DL No"
            value={value.dlNo ?? ''}
            onChange={(v) => onChange({ ...value, dlNo: v })}
            placeholder="Drug licence number"
            disabled={disabled}
          />
          <FormField
            label="PAN"
            value={value.pan ?? panDisplay}
            onChange={(v) => onChange({ ...value, pan: v })}
            placeholder="PAN"
            disabled={disabled}
          />
        </FormRow>
        <Text variant="caption" color="muted">
          At least one of phone, email, GSTIN, PAN, or DL is required for a unique customer.
        </Text>
      </Stack>
    </Stack>
  );
}
