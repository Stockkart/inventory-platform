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
import type {
  AdminAddOn,
  AdminVoucher,
  VoucherTarget,
  VoucherType,
} from '@inventory-platform/plan/types';
import { useAdminPlansQuery, useGenerateVouchersMutation, usePlanVoucherPreview } from '../hooks';
import { useDebouncedValue } from '../useDebouncedValue';
import { adminErrorMessage } from '../format';
import {
  emptyVoucherForm,
  TARGET_OPTIONS,
  toGenerateRequest,
  typeOptionsFor,
  VOUCHER_MAX_BATCH,
  withTarget,
  type VoucherFormState,
} from './voucherForm';
import { describePlanVoucherPreview, previewRequestFor } from './planVoucherPreview';

const MODE_OPTIONS = [
  { value: 'single', label: 'One code' },
  { value: 'batch', label: 'Batch of codes' },
] as const;

const PREVIEW_DEBOUNCE_MS = 300;

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
  const plans = useAdminPlansQuery();
  const isPlan = form.target === 'PLAN';
  // The preview follows what was typed 300 ms ago, so it is only trusted once it has caught up.
  const typed = previewRequestFor(form);
  const settled = useDebouncedValue(typed, PREVIEW_DEBOUNCE_MS);
  const caughtUp = JSON.stringify(typed) === JSON.stringify(settled);
  const preview = usePlanVoucherPreview(isPlan ? settled : null);
  const previewLine = preview.data ? describePlanVoucherPreview(preview.data) : null;
  const previewBlocks =
    isPlan &&
    typed !== null &&
    (!caughtUp || preview.isFetching || preview.isError || previewLine?.allowed === false);
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

  const setTarget = (target: VoucherTarget) => setForm((prev) => withTarget(prev, target));

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

  const planOptions = [
    { value: '', label: 'Choose a plan' },
    ...(plans.data ?? [])
      .filter((p) => p.active && p.code)
      .map((p) => ({ value: p.code as string, label: p.planName })),
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
              <FormField label="Applies to" htmlFor="voucher-target" required>
                <Select
                  id="voucher-target"
                  value={form.target}
                  options={TARGET_OPTIONS}
                  onChange={(e) => setTarget(e.target.value as VoucherTarget)}
                  disabled={busy}
                />
              </FormField>
              {isPlan ? (
                <FormField label="Plan" htmlFor="voucher-plan" required error={errors.planCode}>
                  <Select
                    id="voucher-plan"
                    value={form.planCode}
                    options={planOptions}
                    onChange={(e) => set('planCode', e.target.value)}
                    disabled={busy}
                  />
                </FormField>
              ) : (
                <FormField label="Add-on" htmlFor="voucher-addon" required error={errors.addOnCode}>
                  <Select
                    id="voucher-addon"
                    value={form.addOnCode}
                    options={addOnOptions}
                    onChange={(e) => set('addOnCode', e.target.value)}
                    disabled={busy}
                  />
                </FormField>
              )}
              <FormField label="Discount" htmlFor="voucher-type" required error={errors.type}>
                <Select
                  id="voucher-type"
                  value={form.type}
                  options={typeOptionsFor(form.target)}
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
              {isPlan ? null : (
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
              )}
            </Inline>

            {isPlan && typed ? (
              <Text
                variant="caption"
                color={previewLine?.allowed === false || preview.isError ? 'danger' : 'secondary'}
                aria-live="polite"
              >
                {preview.isError
                  ? 'Could not check this discount. Try again.'
                  : previewLine && caughtUp && !preview.isFetching
                  ? previewLine.text
                  : 'Checking the price…'}
              </Text>
            ) : null}

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
            <Button variant="solid" loading={busy} disabled={previewBlocks} onClick={submit}>
              Create
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  );
}
