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
import type { AdminPlan, PlanFeature } from '@inventory-platform/plan/types';
import { useSavePlanMutation } from '../hooks';
import { adminErrorMessage } from '../format';
import { FEATURE_LABELS } from '../../ui/planPricing';
import { emptyPlanForm, planFormState, toPlanRequest, type PlanFormState } from './catalogueForm';

type TextKey = Exclude<keyof PlanFormState, 'unlimited' | 'features'>;

const FEATURES = Object.keys(FEATURE_LABELS) as PlanFeature[];

export interface PlanFormModalProps {
  open: boolean;
  /** Null creates a new plan. */
  plan: AdminPlan | null;
  plans: AdminPlan[];
  onClose: () => void;
}

export function PlanFormModal({ open, plan, plans, onClose }: PlanFormModalProps) {
  const [form, setForm] = useState<PlanFormState>(emptyPlanForm);
  const [showErrors, setShowErrors] = useState(false);
  const mutation = useSavePlanMutation();
  const result = toPlanRequest(form, plan?.id ?? null);
  const errors = showErrors && !result.ok ? result.errors : {};
  const busy = mutation.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(plan ? planFormState(plan) : emptyPlanForm());
    setShowErrors(false);
    mutation.reset();
  }, [open, plan?.id]);

  const set = <K extends keyof PlanFormState>(key: K, value: PlanFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleFeature = (feature: PlanFeature, on: boolean) =>
    set('features', on ? [...form.features, feature] : form.features.filter((f) => f !== feature));

  const submit = () => {
    setShowErrors(true);
    if (!result.ok) return;
    mutation.mutate(
      { id: plan?.id ?? null, body: result.request },
      {
        onSuccess: () => {
          useNotify.success(plan ? 'Plan saved' : 'Plan created');
          onClose();
        },
      },
    );
  };

  const field = (
    key: TextKey,
    label: string,
    options: { hint?: string; required?: boolean; numeric?: boolean } = {},
  ) => (
    <FormField
      label={label}
      htmlFor={`plan-${key}`}
      hint={options.hint}
      required={options.required}
      error={errors[key]}
    >
      <Input
        id={`plan-${key}`}
        inputMode={options.numeric ? 'decimal' : undefined}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        disabled={busy}
      />
    </FormField>
  );

  const upsellOptions = [
    { value: '', label: 'None' },
    ...plans
      .filter((p) => p.id !== plan?.id)
      .map((p) => ({ value: p.id, label: `${p.planName}${p.code ? ` (${p.code})` : ''}` })),
  ];

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} size="lg">
      <Modal.Header
        title={plan ? `Edit ${plan.planName}` : 'New plan'}
        onClose={busy ? undefined : onClose}
      />
      <Modal.Body>
        <Stack gap="md">
          {mutation.error ? (
            <Alert variant="danger">{adminErrorMessage(mutation.error)}</Alert>
          ) : null}
          {plan ? (
            <Text color="secondary">
              Changes apply to every shop on this plan straight away, including limits and features.
            </Text>
          ) : null}
          <Inline gap="md" flexWrap align="start">
            {plan
              ? null
              : field('code', 'Code', { required: true, hint: 'Fixed once created, e.g. GROWTH.' })}
            {field('planName', 'Name', { required: true })}
          </Inline>
          <Inline gap="md" flexWrap align="start">
            {field('arcPrice', 'Annual price (₹)', { required: true, numeric: true })}
            {field('price', 'Service fee (₹)', { numeric: true, hint: 'Empty for none.' })}
            {field('displayOrder', 'Display order', { numeric: true, hint: 'Lower shows first.' })}
          </Inline>

          <Text variant="heading3" weight="semibold">
            Limits
          </Text>
          <Text variant="caption" color="secondary">
            Empty means no limit of that kind.
          </Text>
          <Checkbox
            id="plan-unlimited"
            label="Unlimited billing (ignores the billing limits)"
            checked={form.unlimited}
            onChange={(e) => set('unlimited', e.target.checked)}
            disabled={busy}
          />
          <Inline gap="md" flexWrap align="start">
            {field('billingLimit', 'Billing value (₹)', { numeric: true })}
            {field('billCountLimit', 'Bills', { numeric: true })}
            {field('userLimit', 'Users', { numeric: true })}
          </Inline>
          <Inline gap="md" flexWrap align="start">
            {field('smsLimit', 'SMS', { numeric: true })}
            {field('whatsappLimit', 'WhatsApp', { numeric: true })}
            {field('ocrLimit', 'OCR invoices / month', { numeric: true })}
          </Inline>

          <Text variant="heading3" weight="semibold">
            Features
          </Text>
          <Inline gap="md" flexWrap>
            {FEATURES.map((feature) => (
              <Checkbox
                key={feature}
                id={`plan-feature-${feature}`}
                label={FEATURE_LABELS[feature]}
                checked={form.features.includes(feature)}
                onChange={(e) => toggleFeature(feature, e.target.checked)}
                disabled={busy}
              />
            ))}
          </Inline>

          <Text variant="heading3" weight="semibold">
            Presentation
          </Text>
          <Inline gap="md" flexWrap align="start">
            {field('badge', 'Badge', { hint: 'e.g. MOST_POPULAR. Empty for none.' })}
            <FormField
              label="Upsell to"
              htmlFor="plan-linkedId"
              hint="The plan suggested as the next step up."
              error={errors.linkedId}
            >
              <Select
                id="plan-linkedId"
                value={form.linkedId}
                options={upsellOptions}
                onChange={(e) => set('linkedId', e.target.value)}
                disabled={busy}
              />
            </FormField>
          </Inline>
          <FormField label="Best for" htmlFor="plan-bestFor" error={errors.bestFor}>
            <Textarea
              id="plan-bestFor"
              rows={2}
              value={form.bestFor}
              onChange={(e) => set('bestFor', e.target.value)}
              disabled={busy}
            />
          </FormField>
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="solid" loading={busy} onClick={submit}>
          {plan ? 'Save' : 'Create'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
