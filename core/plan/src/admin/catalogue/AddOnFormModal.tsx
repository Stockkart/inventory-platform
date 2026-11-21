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
import type { AddOnGrantType, AdminAddOn, PlanFeature } from '@inventory-platform/plan/types';
import { useSaveAddOnMutation } from '../hooks';
import { adminErrorMessage } from '../format';
import { FEATURE_LABELS } from '../../ui/planPricing';
import {
  addOnFormState,
  emptyAddOnForm,
  GRANT_TYPE_LABEL,
  toAddOnRequest,
  type AddOnFormState,
} from './catalogueForm';

const GRANT_TYPE_OPTIONS = (Object.keys(GRANT_TYPE_LABEL) as AddOnGrantType[]).map((type) => ({
  value: type,
  label: GRANT_TYPE_LABEL[type],
}));

const FEATURE_OPTIONS = [
  { value: '', label: 'Choose a feature' },
  ...(Object.keys(FEATURE_LABELS) as PlanFeature[]).map((feature) => ({
    value: feature,
    label: FEATURE_LABELS[feature],
  })),
];

const QUANTITY_LABEL: Record<Exclude<AddOnGrantType, 'FEATURE'>, string> = {
  SEATS: 'Users per pack',
  SMS: 'SMS per pack',
  OCR_CREDITS: 'Credits per pack',
};

export interface AddOnFormModalProps {
  open: boolean;
  /** Null creates a new add-on. */
  addOn: AdminAddOn | null;
  onClose: () => void;
}

export function AddOnFormModal({ open, addOn, onClose }: AddOnFormModalProps) {
  const [form, setForm] = useState<AddOnFormState>(emptyAddOnForm);
  const [showErrors, setShowErrors] = useState(false);
  const mutation = useSaveAddOnMutation();
  const isNew = addOn === null;
  const result = toAddOnRequest(form, isNew);
  const errors = showErrors && !result.ok ? result.errors : {};
  const busy = mutation.isPending;
  const feature = form.grantType === 'FEATURE';

  useEffect(() => {
    if (!open) return;
    setForm(addOn ? addOnFormState(addOn) : emptyAddOnForm());
    setShowErrors(false);
    mutation.reset();
  }, [open, addOn?.id]);

  const set = <K extends keyof AddOnFormState>(key: K, value: AddOnFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = () => {
    setShowErrors(true);
    if (!result.ok) return;
    mutation.mutate(
      { id: addOn?.id ?? null, body: result.request },
      {
        onSuccess: () => {
          useNotify.success(isNew ? 'Add-on created' : 'Add-on saved');
          onClose();
        },
      },
    );
  };

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} size="lg">
      <Modal.Header
        title={isNew ? 'New add-on' : `Edit ${addOn.name}`}
        onClose={busy ? undefined : onClose}
      />
      <Modal.Body>
        <Stack gap="md">
          {mutation.error ? (
            <Alert variant="danger">{adminErrorMessage(mutation.error)}</Alert>
          ) : null}
          <Inline gap="md" flexWrap align="start">
            {isNew ? (
              <FormField
                label="Code"
                htmlFor="addon-code"
                required
                hint="Fixed once created, e.g. EXTRA_SEAT."
                error={errors.code}
              >
                <Input
                  id="addon-code"
                  value={form.code}
                  onChange={(e) => set('code', e.target.value.toUpperCase())}
                  disabled={busy}
                />
              </FormField>
            ) : null}
            <FormField label="Name" htmlFor="addon-name" required error={errors.name}>
              <Input
                id="addon-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                disabled={busy}
              />
            </FormField>
          </Inline>
          <FormField label="Description" htmlFor="addon-description" error={errors.description}>
            <Textarea
              id="addon-description"
              rows={2}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              disabled={busy}
            />
          </FormField>

          <Inline gap="md" flexWrap align="start">
            <FormField
              label="What it gives"
              htmlFor="addon-grant-type"
              required
              hint={isNew ? 'Fixed once created.' : undefined}
            >
              <Select
                id="addon-grant-type"
                value={form.grantType}
                options={GRANT_TYPE_OPTIONS}
                onChange={(e) => set('grantType', e.target.value as AddOnGrantType)}
                disabled={busy || !isNew}
              />
            </FormField>
            {feature ? (
              <FormField
                label="Feature"
                htmlFor="addon-feature"
                required
                error={errors.grantsFeature}
              >
                <Select
                  id="addon-feature"
                  value={form.grantsFeature}
                  options={FEATURE_OPTIONS}
                  onChange={(e) => set('grantsFeature', e.target.value as PlanFeature | '')}
                  disabled={busy}
                />
              </FormField>
            ) : (
              <FormField
                label={QUANTITY_LABEL[form.grantType as Exclude<AddOnGrantType, 'FEATURE'>]}
                htmlFor="addon-quantity"
                required
                error={errors.grantsQuantity}
              >
                <Input
                  id="addon-quantity"
                  inputMode="numeric"
                  value={form.grantsQuantity}
                  onChange={(e) => set('grantsQuantity', e.target.value)}
                  disabled={busy}
                />
              </FormField>
            )}
          </Inline>

          <Inline gap="md" flexWrap align="start">
            <FormField
              label="Price (₹)"
              htmlFor="addon-price"
              required
              hint={form.grantType === 'OCR_CREDITS' ? 'One-time.' : 'Per year, for the plan term.'}
              error={errors.price}
            >
              <Input
                id="addon-price"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                disabled={busy}
              />
            </FormField>
            {feature ? null : (
              <FormField
                label="Most per order"
                htmlFor="addon-max"
                hint="Empty for no limit."
                error={errors.maxQuantity}
              >
                <Input
                  id="addon-max"
                  inputMode="numeric"
                  value={form.maxQuantity}
                  onChange={(e) => set('maxQuantity', e.target.value)}
                  disabled={busy}
                />
              </FormField>
            )}
            <FormField
              label="Display order"
              htmlFor="addon-order"
              hint="Lower shows first."
              error={errors.displayOrder}
            >
              <Input
                id="addon-order"
                inputMode="numeric"
                value={form.displayOrder}
                onChange={(e) => set('displayOrder', e.target.value)}
                disabled={busy}
              />
            </FormField>
          </Inline>

          {feature ? (
            <Text variant="caption" color="secondary">
              A feature add-on is bought once per shop.
            </Text>
          ) : (
            <Checkbox
              id="addon-stackable"
              label="More than one can be bought in an order"
              checked={form.stackable}
              onChange={(e) => set('stackable', e.target.checked)}
              disabled={busy}
            />
          )}
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="solid" loading={busy} onClick={submit}>
          {isNew ? 'Create' : 'Save'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
