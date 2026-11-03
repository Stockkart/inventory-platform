import { useEffect, useRef, useState } from 'react';
import {
  Badge,
  Button,
  FormField,
  Inline,
  Input,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import {
  GSTIN_LENGTH,
  gstinProblem,
  gstinStateCode,
  isValidGstin,
  normalizeGstin,
} from '../model/gstin';
import type { GstinLookupResult } from '../model/gstin-lookup.types';
import {
  useGstinLookupQuery,
  useGstinVerificationEnabled,
  useReverifyGstinMutation,
} from '../queries/hooks';

/** Who holds the GSTIN — the warnings read differently for the two sides of a bill. */
export type GstinParty = 'supplier' | 'customer';

export interface GstinFieldProps {
  id: string;
  label?: string;
  value: string | null | undefined;
  disabled?: boolean;
  party: GstinParty;
  /** Shown while the field is empty, e.g. who may leave it blank. */
  emptyHint: string;
  /** The text, already upper-cased and capped at 15 characters. */
  onChange: (gstin: string) => void;
  /** Fires once per verified record so the form can fill in what is still empty. */
  onRecord?: (record: GstinLookupResult) => void;
  /** The "Use these details" link; the form decides what to overwrite. */
  onUseDetails?: (record: GstinLookupResult) => void;
}

/**
 * One GSTIN input with the offline check (format + check character), the online lookup when a
 * provider is configured, status badge, re-verify and the record summary line. Both the vendor
 * and the customer forms render this so the two never drift apart.
 */
export function GstinField({
  id,
  label = 'GSTIN',
  value,
  disabled = false,
  party,
  emptyHint,
  onChange,
  onRecord,
  onUseDetails,
}: GstinFieldProps) {
  // The offline check and the state read from the GSTIN always apply. Only the network lookup —
  // status, names, address — needs a configured provider.
  const online = useGstinVerificationEnabled();
  const gstin = normalizeGstin(value);
  const gstinComplete = gstin.length === GSTIN_LENGTH;
  const gstinValid = isValidGstin(gstin);
  const lookup = useGstinLookupQuery(gstin, { enabled: online && gstinValid && !disabled });
  const reverify = useReverifyGstinMutation();
  const record = lookup.data;

  // The first time a verified record arrives for this GSTIN, hand it to the form. The latest
  // callback is read through a ref so the effect runs once per record, not on every keystroke.
  const latestOnRecord = useRef(onRecord);
  latestOnRecord.current = onRecord;
  const [seenFor, setSeenFor] = useState<string | null>(null);
  useEffect(() => {
    if (!record?.verified || seenFor === record.gstin) return;
    setSeenFor(record.gstin);
    latestOnRecord.current?.(record);
  }, [record, seenFor]);

  const statusId = `${id}-status`;

  return (
    <>
      <FormField
        label={label}
        htmlFor={id}
        hint={gstinHint({
          gstin,
          gstinComplete,
          gstinValid,
          online,
          lookup: lookup.isFetching,
          record,
          party,
          emptyHint,
        })}
        error={gstinComplete && !gstinValid ? gstinProblem(gstin) ?? undefined : undefined}
      >
        <Inline gap="sm" align="center" width="full" flexWrap>
          <Input
            id={id}
            value={value ?? ''}
            onChange={(e) => onChange(normalizeGstin(e.currentTarget.value).slice(0, GSTIN_LENGTH))}
            placeholder="15 characters, e.g. 27AAPFU0939F1ZV"
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={statusId}
            className={surfaceChrome.growMin12}
          />
          <GstinStatus
            id={statusId}
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
          {onUseDetails ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onUseDetails(record)}
            >
              Use these details
            </Button>
          ) : null}
        </Inline>
      ) : null}
    </>
  );
}

/** The state a GSTIN implies, or undefined when the text is not (yet) a valid GSTIN. */
export function stateImpliedBy(gstin: string | null | undefined): string | undefined {
  return gstinStateCode(normalizeGstin(gstin)) ?? undefined;
}

function gstinHint(s: {
  gstin: string;
  gstinComplete: boolean;
  gstinValid: boolean;
  online: boolean;
  lookup: boolean;
  record: GstinLookupResult | undefined;
  party: GstinParty;
  emptyHint: string;
}): string | undefined {
  if (!s.gstin) return s.emptyHint;
  if (!s.gstinComplete) return `${s.gstin.length} of 15 characters`;
  if (!s.gstinValid) return undefined; // the error line says why
  if (!s.online)
    return 'Format is correct. Fill in the rest by hand — online verification is not set up on this server.';
  if (s.lookup) return 'Checking with the GST network…';
  if (!s.record) return undefined;
  if (!s.record.verificationAvailable)
    return 'Format is correct. Online verification is not set up on this server.';
  if (!s.record.verified)
    return "Format is correct, but the GST network couldn't confirm it right now — you can still save.";
  if (s.record.status && s.record.status.toLowerCase() !== 'active') {
    const since = s.record.cancellationDate ? ` since ${s.record.cancellationDate}` : '';
    return s.party === 'supplier'
      ? `${s.record.status}${since} — GST credit on new bills from this supplier can't be claimed.`
      : `${s.record.status}${since} — they can't claim GST credit on your bills; treat them as an unregistered buyer.`;
  }
  if (s.record.taxpayerType?.toLowerCase().includes('composition')) {
    return s.party === 'supplier'
      ? 'Composition dealer — their bills should not carry GST.'
      : 'Composition dealer — your bill still charges GST, but they cannot claim it back.';
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
