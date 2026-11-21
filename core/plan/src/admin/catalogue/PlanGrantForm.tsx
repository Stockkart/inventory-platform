import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
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
import type { ShopPlanStatusResponse } from '@inventory-platform/contracts';
import type { PlanGrantRequest } from '@inventory-platform/plan/types';
import { usePlansQuery } from '../../queries/hooks';
import { useGrantPlanMutation } from '../../queries/admin.hooks';
import { adminErrorMessage, formatAdminDate } from '../format';
import {
  CATALOGUE_LIMITS,
  emptyPlanGrantForm,
  planGrantOptions,
  toPlanGrantRequest,
  type PlanGrantFormState,
} from './catalogueForm';

interface PlanGrantFormProps {
  shopId: string;
}

interface SummaryRowProps {
  label: string;
  value: string;
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <Inline gap="md" align="start">
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <Text weight="semibold">{value}</Text>
    </Inline>
  );
}

/** Grants a plan without payment, after a confirm step that repeats everything being sent. */
export function PlanGrantForm({ shopId }: PlanGrantFormProps) {
  const plans = usePlansQuery();
  const [form, setForm] = useState<PlanGrantFormState>(emptyPlanGrantForm);
  const [showErrors, setShowErrors] = useState(false);
  const [confirming, setConfirming] = useState<PlanGrantRequest | null>(null);
  const [granted, setGranted] = useState<ShopPlanStatusResponse | null>(null);
  const mutation = useGrantPlanMutation();
  const options = planGrantOptions(plans.data ?? []);
  const result = toPlanGrantRequest(form);
  const errors = showErrors && !result.ok ? result.errors : {};
  const busy = mutation.isPending;
  const planLabel = (code: string) => options.find((o) => o.value === code)?.label ?? code;

  useEffect(() => {
    setForm(emptyPlanGrantForm());
    setShowErrors(false);
    setConfirming(null);
    setGranted(null);
    mutation.reset();
  }, [shopId]);

  const set = <K extends keyof PlanGrantFormState>(key: K, value: PlanGrantFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const review = () => {
    setShowErrors(true);
    if (!result.ok) return;
    mutation.reset();
    setConfirming(result.request);
  };

  const confirm = () => {
    if (!confirming) return;
    mutation.mutate(
      { shopId, body: confirming },
      {
        onSuccess: (status) => {
          useNotify.success(`${planLabel(confirming.planCode)} granted`);
          setGranted(status);
          setConfirming(null);
          setForm(emptyPlanGrantForm());
          setShowErrors(false);
        },
      },
    );
  };

  return (
    <Stack gap="md">
      <Text variant="heading3" weight="semibold">
        Grant a plan
      </Text>
      <Text variant="caption" color="secondary">
        Free of charge. The same plan adds months after the current expiry; another plan can be
        granted only once the paid one has ended. Kept in the audit log.
      </Text>
      {plans.isError ? (
        <Alert variant="danger">{adminErrorMessage(plans.error, 'Could not load plans.')}</Alert>
      ) : null}
      {granted ? (
        <Alert variant="success">
          Shop {granted.shopId} is on {granted.plan?.planName ?? 'its plan'} until{' '}
          {formatAdminDate(granted.planExpiryDate)}.
        </Alert>
      ) : null}
      <Inline gap="md" flexWrap align="start">
        <FormField label="Plan" htmlFor="plan-grant-plan" required error={errors.planCode}>
          <Select
            id="plan-grant-plan"
            value={form.planCode}
            options={[{ value: '', label: 'Choose a plan' }, ...options]}
            onChange={(e) => set('planCode', e.target.value)}
            disabled={busy || plans.isLoading}
          />
        </FormField>
        <FormField
          label="Months"
          htmlFor="plan-grant-months"
          required
          hint={`1 to ${CATALOGUE_LIMITS.planGrantMonths}.`}
          error={errors.months}
        >
          <Input
            id="plan-grant-months"
            inputMode="numeric"
            value={form.months}
            onChange={(e) => set('months', e.target.value)}
            disabled={busy}
          />
        </FormField>
      </Inline>
      <FormField
        label="Reason"
        htmlFor="plan-grant-reason"
        required
        hint={`At most ${CATALOGUE_LIMITS.planGrantReason} characters.`}
        error={errors.reason}
      >
        <Textarea
          id="plan-grant-reason"
          rows={2}
          value={form.reason}
          onChange={(e) => set('reason', e.target.value)}
          disabled={busy}
        />
      </FormField>
      <Inline>
        <Button variant="solid" onClick={review} disabled={busy}>
          Review grant
        </Button>
      </Inline>

      <Modal
        open={confirming !== null}
        onClose={busy ? undefined : () => setConfirming(null)}
        size="md"
      >
        <Modal.Header
          title="Grant this plan?"
          onClose={busy ? undefined : () => setConfirming(null)}
        />
        <Modal.Body>
          <Stack gap="md">
            {mutation.error ? (
              <Alert variant="danger">{adminErrorMessage(mutation.error)}</Alert>
            ) : null}
            {confirming ? (
              <Stack gap="sm">
                <SummaryRow label="Shop" value={shopId} />
                <SummaryRow label="Plan" value={planLabel(confirming.planCode)} />
                <SummaryRow
                  label="Months"
                  value={`${confirming.durationMonths} month${
                    confirming.durationMonths === 1 ? '' : 's'
                  }`}
                />
                <SummaryRow label="Reason" value={confirming.reason} />
              </Stack>
            ) : null}
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setConfirming(null)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="solid" loading={busy} onClick={confirm}>
            Grant plan
          </Button>
        </Modal.Footer>
      </Modal>
    </Stack>
  );
}
