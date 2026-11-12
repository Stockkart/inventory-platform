import { Badge, FormField, FormRow, Inline, Input, Text } from '@inventory-platform/ui-kit';

/** The fields the drug licence widget reads and writes, shared by customers and vendors. */
export interface DrugLicenceValue {
  dlNo?: string | null;
  /** Last valid day, `yyyy-MM-dd`. */
  dlExpiry?: string | null;
}

/** False when a D.L. No. is typed but its expiry date is not; the server refuses that too. */
export function drugLicenceComplete(value: DrugLicenceValue): boolean {
  return !value.dlNo?.trim() || Boolean(value.dlExpiry);
}

export const DL_EXPIRY_REQUIRED_MESSAGE = 'Enter the D.L. expiry date, or clear the D.L. No.';

interface DrugLicenceFieldsProps<T extends DrugLicenceValue> {
  value: T;
  onChange: (value: T) => void;
  /** Server's verdict on the saved licence (`dlExpired`); shown under the date. */
  expired?: boolean | null;
  disabled?: boolean;
  /** Prefix for element ids, so two forms on one page do not collide. */
  idPrefix: string;
}

/**
 * D.L. No. and its expiry date. The expiry is required only once a number is typed; clearing the
 * number clears the date, as the server does.
 */
export function DrugLicenceFields<T extends DrugLicenceValue>({
  value,
  onChange,
  expired,
  disabled = false,
  idPrefix,
}: DrugLicenceFieldsProps<T>) {
  const hasNumber = Boolean(value.dlNo?.trim());
  const expiryId = `${idPrefix}-dl-expiry`;
  return (
    <FormRow>
      <FormField
        id={`${idPrefix}-dl-no`}
        label="DL No"
        value={value.dlNo ?? ''}
        onChange={(v) => onChange({ ...value, dlNo: v, dlExpiry: v.trim() ? value.dlExpiry : '' })}
        placeholder="Drug licence number"
        disabled={disabled}
      />
      <FormField
        label="DL expiry"
        htmlFor={expiryId}
        required={hasNumber}
        hint={hasNumber ? undefined : 'Needed once a DL No is entered'}
        error={hasNumber && expired ? 'This licence has expired' : undefined}
      >
        <Input
          id={expiryId}
          type="date"
          value={value.dlExpiry ?? ''}
          onChange={(e) => onChange({ ...value, dlExpiry: e.target.value })}
          disabled={disabled || !hasNumber}
          required={hasNumber}
          hasError={hasNumber && Boolean(expired)}
        />
      </FormField>
    </FormRow>
  );
}

/** `yyyy-MM-dd` as `31 Mar 2028`, read as a calendar date (no time zone shift). */
export function formatDlExpiry(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface DrugLicenceSummaryProps {
  dlNo?: string | null;
  dlExpiry?: string | null;
  /** Server's `dlExpired`. */
  expired?: boolean | null;
}

/** D.L. No. with its expiry for lists and the selected party; "Expired" once the server says so. */
export function DrugLicenceSummary({ dlNo, dlExpiry, expired }: DrugLicenceSummaryProps) {
  if (!dlNo?.trim()) return <>—</>;
  return (
    <Inline gap="xs" flexWrap align="center">
      <Text as="span">{dlNo}</Text>
      {dlExpiry ? (
        <Text as="span" variant="caption" color="muted">
          exp {formatDlExpiry(dlExpiry)}
        </Text>
      ) : null}
      {expired ? <Badge variant="danger">DL expired</Badge> : null}
    </Inline>
  );
}
