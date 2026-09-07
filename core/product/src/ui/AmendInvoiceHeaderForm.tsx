import { useState } from 'react';
import type {
  AmendVendorPurchaseInvoicePayload,
  PurchaseTaxTreatment,
  VendorPurchaseInvoiceDetail,
} from '@inventory-platform/product/types';
import {
  Alert,
  Box,
  Button,
  Grid,
  Inline,
  Input,
  Label,
  Select,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';

/**
 * Corrects an invoice header against the paper bill.
 *
 * <p>The way out of a flagged invoice. Registration warns when the totals do not reconcile, but
 * the goods are already in stock by then, so re-entering the bill would double them — until now
 * there was nowhere to act on the warning at all.
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
  const [lineSubTotal, setLineSubTotal] = useState(initial(detail.lineSubTotal));
  const [taxTotal, setTaxTotal] = useState(initial(detail.taxTotal));
  const [overallDiscount, setOverallDiscount] = useState(initial(detail.overallDiscount));
  const [roundOff, setRoundOff] = useState(initial(detail.roundOff));
  const [invoiceTotal, setInvoiceTotal] = useState(initial(detail.invoiceTotal));
  const [taxTreatment, setTaxTreatment] = useState<PurchaseTaxTreatment | ''>(
    detail.taxTreatment ?? '',
  );
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const verdict = detail.headerReconciliation;
  const flagged = Boolean(verdict) && verdict !== 'OK';

  const submit = async () => {
    if (!reason.trim()) {
      setError('Say why this is being corrected — an amended figure has to account for itself.');
      return;
    }
    setError(null);
    await onAmend({
      lineSubTotal: numberOrUndefined(lineSubTotal),
      taxTotal: numberOrUndefined(taxTotal),
      overallDiscount: numberOrUndefined(overallDiscount),
      roundOff: numberOrUndefined(roundOff),
      invoiceTotal: numberOrUndefined(invoiceTotal),
      taxTreatment: taxTreatment || undefined,
      reason: reason.trim(),
    });
    setOpen(false);
    setReason('');
  };

  if (!open) {
    return (
      <Inline gap="sm" align="center">
        <Button variant="secondary" onClick={() => setOpen(true)} disabled={busy}>
          Correct these totals
        </Button>
        {flagged ? (
          <Text variant="caption" color="secondary">
            This invoice does not reconcile with its lines.
          </Text>
        ) : null}
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
      <Text weight="semibold">Correct the totals from the bill</Text>
      <Text variant="caption" color="secondary">
        Only the invoice header changes. The products and quantities stay as they were received.
      </Text>

      {flagged ? (
        <Alert variant="warning">
          {verdict === 'MISSING'
            ? 'This bill was recorded without totals, so its GST is being worked out from line prices.'
            : verdict === 'RATE_CONFLICT'
            ? 'The tax on this bill does not match any rate on its products — check the GST rate on the items as well.'
            : `The lines come to ${detail.computedLineSubTotal ?? '—'} taxable and ${
                detail.computedTaxTotal ?? '—'
              } tax.`}
        </Alert>
      ) : null}

      <Grid columns={3} gap="sm">
        <Box>
          <Label htmlFor="amendLineSubTotal">Line subtotal</Label>
          <Input
            id="amendLineSubTotal"
            inputMode="decimal"
            value={lineSubTotal}
            onChange={(e) => setLineSubTotal(e.target.value)}
            disabled={busy}
          />
        </Box>
        <Box>
          <Label htmlFor="amendTaxTotal">Tax total</Label>
          <Input
            id="amendTaxTotal"
            inputMode="decimal"
            value={taxTotal}
            onChange={(e) => setTaxTotal(e.target.value)}
            disabled={busy}
          />
        </Box>
        <Box>
          <Label htmlFor="amendOverallDiscount">Bill discount</Label>
          <Input
            id="amendOverallDiscount"
            inputMode="decimal"
            value={overallDiscount}
            onChange={(e) => setOverallDiscount(e.target.value)}
            disabled={busy}
          />
        </Box>
        <Box>
          <Label htmlFor="amendRoundOff">Round off</Label>
          <Input
            id="amendRoundOff"
            inputMode="decimal"
            value={roundOff}
            onChange={(e) => setRoundOff(e.target.value)}
            disabled={busy}
          />
        </Box>
        <Box>
          <Label htmlFor="amendInvoiceTotal">Invoice total</Label>
          <Input
            id="amendInvoiceTotal"
            inputMode="decimal"
            value={invoiceTotal}
            onChange={(e) => setInvoiceTotal(e.target.value)}
            disabled={busy}
          />
        </Box>
        <Box>
          <Label htmlFor="amendTaxTreatment">Line amounts</Label>
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
        </Box>
      </Grid>

      <Box>
        <Label htmlFor="amendReason">Why</Label>
        <Input
          id="amendReason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. totals keyed from the paper bill"
          disabled={busy}
        />
      </Box>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <Inline gap="sm">
        <Button onClick={submit} disabled={busy}>
          Save correction
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
      </Inline>
    </Stack>
  );
}
