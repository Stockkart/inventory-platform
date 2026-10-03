import { useState } from 'react';
import type {
  AmendVendorPurchaseInvoicePayload,
  PurchaseTaxTreatment,
  VendorPurchaseInvoiceDetail,
} from '@inventory-platform/product/types';
import {
  Alert,
  Button,
  FormField,
  Grid,
  Inline,
  Input,
  Select,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';

/**
 * Corrects an invoice header against the paper bill.
 *
 * <p>The bill-level discount, round off and how the line amounts state GST can be corrected; the
 * server then works the subtotal, tax and invoice total out again from the lines.
 *
 * <p>Header only. The lines record what the stock was created from; correcting a quantity here
 * would leave the invoice describing goods that were never received.
 */
export interface AmendInvoiceHeaderFormProps {
  detail: VendorPurchaseInvoiceDetail;
  onAmend: (payload: AmendVendorPurchaseInvoicePayload) => Promise<void>;
  busy?: boolean;
}

/** Blank means "leave as it stands", so a field nobody touched is not sent as a change. */
function numberOrUndefined(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function initial(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}

export function AmendInvoiceHeaderForm({ detail, onAmend, busy }: AmendInvoiceHeaderFormProps) {
  const [open, setOpen] = useState(false);
  const [overallDiscount, setOverallDiscount] = useState(initial(detail.overallDiscount));
  const [roundOff, setRoundOff] = useState(initial(detail.roundOff));
  const [taxTreatment, setTaxTreatment] = useState<PurchaseTaxTreatment | ''>(
    detail.taxTreatment ?? '',
  );
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason.trim()) {
      setError('Say why this is being corrected — an amended figure has to account for itself.');
      return;
    }
    setError(null);
    await onAmend({
      overallDiscount: numberOrUndefined(overallDiscount),
      roundOff: numberOrUndefined(roundOff),
      taxTreatment: taxTreatment || undefined,
      reason: reason.trim(),
    });
    setOpen(false);
    setReason('');
  };

  if (!open) {
    return (
      <Inline gap="sm" align="center">
        <Button variant="outline" onClick={() => setOpen(true)} disabled={busy}>
          Correct this bill
        </Button>
        {detail.amendedAt ? (
          <Text variant="caption" color="secondary">
            Last corrected: {detail.amendmentReason}
          </Text>
        ) : null}
      </Inline>
    );
  }

  return (
    <Stack gap="sm" padding="sm" border rounded="md" bg="surface">
      <Text weight="semibold">Correct the bill header</Text>
      <Text variant="caption" color="secondary">
        Only the invoice header changes. The products and quantities stay as they were received, and
        the subtotal, tax and invoice total are worked out again from them.
      </Text>

      <Grid columns={3} gap="sm">
        <FormField label="Bill discount" htmlFor="amendOverallDiscount">
          <Input
            id="amendOverallDiscount"
            inputMode="decimal"
            value={overallDiscount}
            onChange={(e) => setOverallDiscount(e.target.value)}
            disabled={busy}
          />
        </FormField>
        <FormField label="Round off" htmlFor="amendRoundOff">
          <Input
            id="amendRoundOff"
            inputMode="decimal"
            value={roundOff}
            onChange={(e) => setRoundOff(e.target.value)}
            disabled={busy}
          />
        </FormField>
        <FormField label="Line amounts" htmlFor="amendTaxTreatment">
          <Select
            id="amendTaxTreatment"
            value={taxTreatment}
            onChange={(e) => setTaxTreatment(e.target.value as PurchaseTaxTreatment | '')}
            disabled={busy}
          >
            <option value="">As this vendor usually bills</option>
            <option value="EXCLUSIVE">GST added on top</option>
            <option value="INCLUSIVE">GST already included (MRP billing)</option>
          </Select>
        </FormField>
      </Grid>

      <FormField label="Why" htmlFor="amendReason" required>
        <Input
          id="amendReason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. totals keyed from the paper bill"
          disabled={busy}
        />
      </FormField>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Inline gap="sm">
        <Button variant="solid" onClick={submit} disabled={busy}>
          Save correction
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
      </Inline>
    </Stack>
  );
}
