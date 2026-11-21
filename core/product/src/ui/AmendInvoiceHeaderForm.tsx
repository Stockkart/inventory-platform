import { useMemo, useState } from 'react';
import type {
  AmendVendorPurchaseInvoicePayload,
  InvoiceHeaderFigures,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { useInvoiceAmendmentPreviewQuery } from '../queries/hooks';

/**
 * Corrects an invoice header against the paper bill.
 *
 * <p>The bill-level discount, round off and how the line amounts state GST can be corrected; the
 * server then works the subtotal, tax and invoice total out again from the lines. Before saving,
 * the form shows the saved figures beside the corrected ones, as the server works them out, so
 * nothing changes on the invoice or in the journal without the operator seeing it.
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

function money(value: number | null | undefined): string {
  return value == null ? '—' : `₹${value.toFixed(2)}`;
}

function treatmentLabel(value: PurchaseTaxTreatment | null | undefined): string {
  if (value === 'INCLUSIVE') return 'GST is already included in the price';
  if (value === 'EXCLUSIVE') return 'GST is added to the price';
  return 'Not recorded';
}

const ROWS: {
  field: keyof InvoiceHeaderFigures;
  label: string;
  show: (figures: InvoiceHeaderFigures) => string;
}[] = [
  { field: 'taxTreatment', label: 'Line amounts', show: (f) => treatmentLabel(f.taxTreatment) },
  { field: 'overallDiscount', label: 'Bill discount', show: (f) => money(f.overallDiscount) },
  { field: 'roundOff', label: 'Round off', show: (f) => money(f.roundOff) },
  { field: 'lineSubTotal', label: 'Line subtotal', show: (f) => money(f.lineSubTotal) },
  { field: 'taxTotal', label: 'Tax total', show: (f) => money(f.taxTotal) },
  { field: 'invoiceTotal', label: 'Invoice total', show: (f) => money(f.invoiceTotal) },
];

export function AmendInvoiceHeaderForm({ detail, onAmend, busy }: AmendInvoiceHeaderFormProps) {
  const [open, setOpen] = useState(false);
  const [overallDiscount, setOverallDiscount] = useState(initial(detail.overallDiscount));
  const [roundOff, setRoundOff] = useState(initial(detail.roundOff));
  const [taxTreatment, setTaxTreatment] = useState<PurchaseTaxTreatment | ''>(
    detail.taxTreatment ?? '',
  );
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const changes = useMemo<AmendVendorPurchaseInvoicePayload>(
    () => ({
      overallDiscount: numberOrUndefined(overallDiscount),
      roundOff: numberOrUndefined(roundOff),
      taxTreatment: taxTreatment || undefined,
      reason: '',
    }),
    [overallDiscount, roundOff, taxTreatment],
  );
  const preview = useInvoiceAmendmentPreviewQuery(detail.id, changes, open).data;
  const changed = new Set(preview?.changedFields ?? []);
  const nothingChanges = preview != null && changed.size === 0;

  const submit = async () => {
    if (!reason.trim()) {
      setError('Say why this is being corrected — an amended figure has to account for itself.');
      return;
    }
    setError(null);
    await onAmend({ ...changes, reason: reason.trim() });
    setOpen(false);
    setReason('');
  };

  if (!open) {
    const before = detail.previousHeader;
    return (
      <Inline gap="sm" align="center">
        <Button variant="outline" onClick={() => setOpen(true)} disabled={busy}>
          Correct this bill
        </Button>
        {detail.amendedAt ? (
          <Text variant="caption" color="secondary">
            Last corrected: {detail.amendmentReason}
            {before
              ? ` — invoice total ${money(before.invoiceTotal)} → ${money(
                  detail.invoiceTotal,
                )}, tax ${money(before.taxTotal)} → ${money(detail.taxTotal)}`
              : ''}
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
        the subtotal, tax and invoice total are worked out again from them. Check the figures below
        before saving.
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
            <option value="EXCLUSIVE">GST is added to the price</option>
            <option value="INCLUSIVE">GST is already included in the price</option>
          </Select>
        </FormField>
      </Grid>

      {preview ? (
        <Table className={surfaceChrome.tableWideDense}>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Figure</TableHeaderCell>
              <TableHeaderCell>Saved now</TableHeaderCell>
              <TableHeaderCell>After correction</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ROWS.map((row) => {
              const moves = changed.has(row.field);
              return (
                <TableRow key={row.field}>
                  <TableCell>{row.label}</TableCell>
                  <TableCell>{row.show(preview.saved)}</TableCell>
                  <TableCell>
                    <Text as="span" weight={moves ? 'semibold' : undefined}>
                      {row.show(preview.corrected)}
                      {moves ? ' (changes)' : ''}
                    </Text>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : null}

      {nothingChanges ? <Alert variant="info">Nothing would change on this invoice.</Alert> : null}
      {preview?.journalReposted ? (
        <Alert variant="warning">
          Saving reverses this bill&apos;s purchase journal entry and posts it again with the
          corrected figures.
        </Alert>
      ) : null}

      <FormField label="Why" htmlFor="amendReason" required>
        <Input
          id="amendReason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. PARAS bills at MRP, GST is already included in the price"
          disabled={busy}
        />
      </FormField>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Inline gap="sm">
        <Button variant="solid" onClick={submit} disabled={busy || !preview || nothingChanges}>
          Save correction
        </Button>
        <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
      </Inline>
    </Stack>
  );
}
