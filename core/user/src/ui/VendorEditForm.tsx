import { useEffect, useRef, useState } from 'react';
import type { PostalAddress, UpdateVendorDto } from '@inventory-platform/user/types';
import {
  Badge,
  Button,
  FormField,
  FormRow,
  Inline,
  Input,
  Select,
  Stack,
  Text,
  surfaceChrome,
  type SelectOptionDef,
} from '@inventory-platform/ui-kit';
import { GST_STATES, gstStateName } from '../model/gst-states';
import {
  GSTIN_LENGTH,
  gstinProblem,
  gstinStateCode,
  isValidGstin,
  normalizeGstin,
} from '../model/gstin';
import type { GstinLookupResult } from '../model/gstin-lookup.types';
import { useGstinLookupQuery, useReverifyGstinMutation } from '../queries/hooks';

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
  const pick = (current: string | null | undefined, incoming: string | null | undefined) =>
    overwrite || !current?.trim() ? incoming ?? current ?? undefined : current;
  const address: PostalAddress = { ...(value.postalAddress ?? {}) };
  address.line1 = pick(address.line1, r.address) ?? undefined;
  address.city = pick(address.city, r.city) ?? undefined;
  address.pincode = pick(address.pincode, r.pincode) ?? undefined;
  address.district = pick(address.district, r.addressDetails?.district) ?? undefined;
  // the registration's state is authoritative; it always wins
  address.stateCode = r.stateCode ?? address.stateCode ?? undefined;
  return {
    ...value,
    name: pick(value.name, r.tradeName ?? r.legalName) ?? undefined,
    companyName: pick(value.companyName, r.legalName) ?? undefined,
    address: pick(value.address, r.address) ?? undefined,
    postalAddress: address,
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

  const gstin = normalizeGstin(value.gstinUin);
  const gstinComplete = gstin.length === GSTIN_LENGTH;
  const gstinValid = isValidGstin(gstin);
  const lookup = useGstinLookupQuery(gstin, { enabled: gstinValid && !disabled });
  const reverify = useReverifyGstinMutation();
  const record = lookup.data;

  // The first time a verified record arrives for this GSTIN, fill what is still empty. The
  // latest value/onChange are read through a ref so the effect runs once per record, not on
  // every keystroke.
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  useEffect(() => {
    if (!record?.verified || prefilledFor === record.gstin) return;
    setPrefilledFor(record.gstin);
    latest.current.onChange(prefillFromGstin(latest.current.value, record));
  }, [record, prefilledFor]);

  const stateFromGstin = gstinStateCode(gstin);
  const stateLocked = Boolean(stateFromGstin);
  const addr = value.postalAddress ?? {};
  const setAddr = (patch: Partial<PostalAddress>) =>
    onChange({ ...value, postalAddress: { ...addr, ...patch } });

  const placeable = vendorIsPlaceable(value);

  return (
    <Stack gap="lg">
      <Stack gap="md">
        <FormField
          label="GSTIN / UIN"
          htmlFor="vendor-gstin"
          hint={gstinHint({ gstin, gstinComplete, gstinValid, lookup: lookup.isFetching, record })}
          error={gstinComplete && !gstinValid ? gstinProblem(gstin) ?? undefined : undefined}
        >
          <Inline gap="sm" align="center" width="full" flexWrap>
            <Input
              id="vendor-gstin"
              value={value.gstinUin ?? ''}
              onChange={(e) => {
                const next = normalizeGstin(e.currentTarget.value).slice(0, GSTIN_LENGTH);
                const nextState = gstinStateCode(next);
                onChange({
                  ...value,
                  gstinUin: next,
                  // a valid GSTIN says where the vendor is; an edited one no longer does
                  postalAddress: nextState
                    ? { ...addr, stateCode: nextState }
                    : stateLocked
                    ? { ...addr, stateCode: undefined }
                    : value.postalAddress,
                });
              }}
              placeholder="15 characters, e.g. 27AAPFU0939F1ZV"
              disabled={disabled}
              autoComplete="off"
              spellCheck={false}
              aria-describedby="vendor-gstin-status"
              className={surfaceChrome.growMin12}
            />
            <GstinStatus
              id="vendor-gstin-status"
              record={record}
              loading={lookup.isFetching}
              valid={gstinValid}
            />
            {record?.verified ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || reverify.isPending}
                onClick={() => reverify.mutate(gstin)}
              >
                {reverify.isPending ? 'Checking…' : 'Re-verify'}
              </Button>
            ) : null}
          </Inline>
        </FormField>
        {record?.verified ? (
          <Inline gap="sm" align="center" flexWrap>
            <Text variant="caption" color="secondary">
              {[
                record.legalName,
                record.tradeName && record.tradeName !== record.legalName
                  ? `(${record.tradeName})`
                  : null,
                record.stateName,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onChange(prefillFromGstin(value, record, true))}
            >
              Use these details
            </Button>
          </Inline>
        ) : null}

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

function gstinHint(s: {
  gstin: string;
  gstinComplete: boolean;
  gstinValid: boolean;
  lookup: boolean;
  record: GstinLookupResult | undefined;
}): string | undefined {
  if (!s.gstin) return 'Leave blank for an unregistered supplier — then pick their state below';
  if (!s.gstinComplete) return `${s.gstin.length} of 15 characters`;
  if (!s.gstinValid) return undefined; // the error line says why
  if (s.lookup) return 'Checking with the GST network…';
  if (!s.record) return undefined;
  if (!s.record.verificationAvailable)
    return 'Format is correct. Online verification is not set up on this server.';
  if (!s.record.verified)
    return "Format is correct, but the GST network couldn't confirm it right now — you can still save.";
  if (s.record.status && s.record.status.toLowerCase() !== 'active') {
    return `${s.record.status}${
      s.record.cancellationDate ? ` since ${s.record.cancellationDate}` : ''
    } — GST credit on new bills from this supplier can't be claimed.`;
  }
  if (s.record.taxpayerType?.toLowerCase().includes('composition')) {
    return 'Composition dealer — their bills should not carry GST.';
  }
  return undefined;
}

function GstinStatus({
  id,
  record,
  loading,
  valid,
}: {
  id: string;
  record: GstinLookupResult | undefined;
  loading: boolean;
  valid: boolean;
}) {
  if (!valid) return null;
  if (loading) return <Badge variant="neutral">Checking…</Badge>;
  if (!record) return null;
  if (!record.verified) return <Badge variant="neutral">Not verified</Badge>;
  const active = (record.status ?? '').toLowerCase() === 'active';
  return (
    <Text as="span" id={id}>
      <Badge variant={active ? 'success' : 'warning'}>
        {active ? '✔ Active' : record.status ?? 'Unknown'}
      </Badge>
    </Text>
  );
}
