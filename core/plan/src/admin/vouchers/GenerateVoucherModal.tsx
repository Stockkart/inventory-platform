import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  FormField,
  Inline,
  Input,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import type { AdminAddOn, AdminVoucher, VoucherType } from '@inventory-platform/plan/types';
import { useGenerateVouchersMutation } from '../hooks';
import { adminErrorMessage } from '../format';
import {
  emptyVoucherForm,
  toGenerateRequest,
  VOUCHER_MAX_BATCH,
  VOUCHER_TYPE_LABEL,
  type VoucherFormState,
} from './voucherForm';

const MODE_OPTIONS = [
  { value: 'single', label: 'One code' },
  { value: 'batch', label: 'Batch of codes' },
] as const;

const TYPE_OPTIONS = (Object.keys(VOUCHER_TYPE_LABEL) as VoucherType[]).map((type) => ({
  value: type,
  label: VOUCHER_TYPE_LABEL[type],
}));

export interface GenerateVoucherModalProps {
  open: boolean;
  /** Only live add-ons can carry vouchers. */
  addOns: AdminAddOn[];
  defaultAddOnCode: string;
  onClose: () => void;
}

export function GenerateVoucherModal({
  open,
  addOns,
  defaultAddOnCode,
  onClose,
}: GenerateVoucherModalProps) {
  const [form, setForm] = useState<VoucherFormState>(() => emptyVoucherForm(defaultAddOnCode));
  const [showErrors, setShowErrors] = useState(false);
  const [created, setCreated] = useState<AdminVoucher[] | null>(null);
  const mutation = useGenerateVouchersMutation();
  const result = toGenerateRequest(form);
  const errors = showErrors && !result.ok ? result.errors : {};
  const busy = mutation.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(emptyVoucherForm(defaultAddOnCode));
    setShowErrors(false);
    setCreated(null);
    mutation.reset();
  }, [open]);

  const set = <K extends keyof VoucherFormState>(key: K, value: VoucherFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = () => {
    setShowErrors(true);
    if (!result.ok) return;
    mutation.mutate(result.request, {
      onSuccess: (vouchers) => {
        useNotify.success(
          vouchers.length === 1 ? 'Voucher created' : `${vouchers.length} vouchers created`,
        );
        setCreated(vouchers);
      },
    });
  };

  const copyCodes = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.map((v) => v.code).join('\n'));
      useNotify.success('Codes copied');
    } catch {
      useNotify.error('Could not copy. Select the codes and copy them instead.');
    }
  };

  const addOnOptions = [
    { value: '', label: 'Choose an add-on' },
    ...addOns.map((a) => ({ value: a.code, label: `${a.name} (${a.code})` })),
  ];

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} size="lg">
      <Modal.Header
        title={created ? 'Vouchers created' : 'Create vouchers'}
        onClose={busy ? undefined : onClose}
      />
      <Modal.Body>
        {created ? (
          <Stack gap="md">
            <Text color="secondary">
              {created.length === 1
                ? 'Share this code with the shop.'
                : `${created.length} codes. Copy them now; they also stay listed on this page.`}
            </Text>
            <Textarea
              aria-label="Created voucher codes"
              readOnly
              rows={Math.min(created.length, 12)}
              value={created.map((v) => v.code).join('\n')}
            />
          </Stack>
        ) : (
          <Stack gap="md">
            {mutation.error ? (
              <Alert variant="danger">{adminErrorMessage(mutation.error)}</Alert>
            ) : null}
            <Inline gap="md" flexWrap align="start">
              <FormField label="Create" htmlFor="voucher-mode">
                <Select
                  id="voucher-mode"
                  value={form.mode}
                  options={MODE_OPTIONS}
                  onChange={(e) => set('mode', e.target.value as VoucherFormState['mode'])}
                  disabled={busy}
                />
              </FormField>
              {form.mode === 'single' ? (
                <FormField
                  label="Code"
                  htmlFor="voucher-code"
                  hint="Leave empty to generate one."
                  error={errors.code}
                >
                  <Input
                    id="voucher-code"
                    value={form.code}
                    onChange={(e) => set('code', e.target.value.toUpperCase())}
                    disabled={busy}
                  />
                </FormField>
              ) : (
                <>
                  <FormField
                    label="How many"
                    htmlFor="voucher-count"
                    required
                    hint={`Up to ${VOUCHER_MAX_BATCH}.`}
                    error={errors.count}
                  >
                    <Input
                      id="voucher-count"
                      inputMode="numeric"
                      value={form.count}
                      onChange={(e) => set('count', e.target.value)}
                      disabled={busy}
                    />
                  </FormField>
                  <FormField
                    label="Prefix"
                    htmlFor="voucher-prefix"
                    hint="Optional, e.g. DIWALI."
                    error={errors.prefix}
                  >
                    <Input
                      id="voucher-prefix"
                      value={form.prefix}
                      onChange={(e) => set('prefix', e.target.value.toUpperCase())}
                      disabled={busy}
                    />
                  </FormField>
                </>
              )}
            </Inline>

            <Inline gap="md" flexWrap align="start">
              <FormField label="Add-on" htmlFor="voucher-addon" required error={errors.addOnCode}>
                <Select
                  id="voucher-addon"
                  value={form.addOnCode}
                  options={addOnOptions}
                  onChange={(e) => set('addOnCode', e.target.value)}
                  disabled={busy}
                />
              </FormField>
              <FormField label="Discount" htmlFor="voucher-type" required>
                <Select
                  id="voucher-type"
                  value={form.type}
                  options={TYPE_OPTIONS}
                  onChange={(e) => set('type', e.target.value as VoucherType)}
                  disabled={busy}
                />
              </FormField>
              {form.type !== 'FREE_ADDON' ? (
                <FormField
                  label={form.type === 'PERCENT_OFF' ? 'Percent' : 'Amount (₹)'}
                  htmlFor="voucher-value"
                  required
                  error={errors.value}
                >
                  <Input
                    id="voucher-value"
                    inputMode="decimal"
                    value={form.value}
                    onChange={(e) => set('value', e.target.value)}
                    disabled={busy}
                  />
                </FormField>
              ) : null}
              <FormField
                label="Quantity"
                htmlFor="voucher-quantity"
                required
                hint="Units of the add-on per use."
                error={errors.quantity}
              >
                <Input
                  id="voucher-quantity"
                  inputMode="numeric"
                  value={form.quantity}
                  onChange={(e) => set('quantity', e.target.value)}
                  disabled={busy}
                />
              </FormField>
            </Inline>

            <Inline gap="md" flexWrap align="start">
              <FormField
                label="Uses per code"
                htmlFor="voucher-cap"
                hint="Empty for no cap."
                error={errors.maxRedemptions}
              >
                <Input
                  id="voucher-cap"
                  inputMode="numeric"
                  value={form.maxRedemptions}
                  onChange={(e) => set('maxRedemptions', e.target.value)}
                  disabled={busy}
                />
              </FormField>
              <FormField
                label="Only for shop"
                htmlFor="voucher-shop"
                hint="Shop ID; empty for any shop."
              >
                <Input
                  id="voucher-shop"
                  value={form.issuedToShopId}
                  onChange={(e) => set('issuedToShopId', e.target.value)}
                  disabled={busy}
                />
              </FormField>
            </Inline>

            <Inline gap="md" flexWrap align="start">
              <FormField label="Valid from" htmlFor="voucher-from" hint="Start of the day, IST.">
                <Input
                  id="voucher-from"
                  type="date"
                  value={form.validFrom}
                  onChange={(e) => set('validFrom', e.target.value)}
                  disabled={busy}
                />
              </FormField>
              <FormField
                label="Valid until"
                htmlFor="voucher-to"
                hint="End of the day, IST."
                error={errors.validTo}
              >
                <Input
                  id="voucher-to"
                  type="date"
                  value={form.validTo}
                  onChange={(e) => set('validTo', e.target.value)}
                  disabled={busy}
                />
              </FormField>
            </Inline>

            <Checkbox
              id="voucher-single-use"
              label="Each shop can use a code only once"
              checked={form.singleUsePerShop}
              onChange={(e) => set('singleUsePerShop', e.target.checked)}
              disabled={busy}
            />

            <FormField
              label="Note"
              htmlFor="voucher-note"
              hint="Internal; kept in the audit log."
              error={errors.note}
            >
              <Textarea
                id="voucher-note"
                rows={2}
                value={form.note}
                onChange={(e) => set('note', e.target.value)}
                disabled={busy}
              />
            </FormField>
          </Stack>
        )}
      </Modal.Body>
      <Modal.Footer>
        {created ? (
          <>
            <Button variant="outline" onClick={copyCodes}>
              Copy codes
            </Button>
            <Button variant="solid" onClick={onClose}>
              Done
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="solid" loading={busy} onClick={submit}>
              Create
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
}
