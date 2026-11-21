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
  Textarea,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import type { AdminCampaign, CampaignTheme } from '@inventory-platform/plan/types';
import { useSaveCampaignMutation } from '../hooks';
import { adminErrorMessage } from '../format';
import {
  CAMPAIGN_LIMITS,
  CAMPAIGN_THEME_LABEL,
  campaignFormState,
  emptyCampaignForm,
  toCampaignRequest,
  type CampaignFormState,
} from './campaignForm';

const THEME_OPTIONS = (Object.keys(CAMPAIGN_THEME_LABEL) as CampaignTheme[]).map((theme) => ({
  value: theme,
  label: CAMPAIGN_THEME_LABEL[theme],
}));

export interface CampaignFormModalProps {
  open: boolean;
  /** Null creates a new campaign. */
  campaign: AdminCampaign | null;
  onClose: () => void;
}

export function CampaignFormModal({ open, campaign, onClose }: CampaignFormModalProps) {
  const [form, setForm] = useState<CampaignFormState>(emptyCampaignForm);
  const [showErrors, setShowErrors] = useState(false);
  const mutation = useSaveCampaignMutation();
  const isNew = campaign === null;
  const result = toCampaignRequest(form, isNew);
  const errors = showErrors && !result.ok ? result.errors : {};
  const busy = mutation.isPending;

  useEffect(() => {
    if (!open) return;
    setForm(campaign ? campaignFormState(campaign) : emptyCampaignForm());
    setShowErrors(false);
    mutation.reset();
  }, [open, campaign?.id]);

  const set = <K extends keyof CampaignFormState>(key: K, value: CampaignFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = () => {
    setShowErrors(true);
    if (!result.ok) return;
    mutation.mutate(
      { id: campaign?.id ?? null, body: result.request },
      {
        onSuccess: () => {
          useNotify.success(isNew ? 'Campaign created' : 'Campaign saved');
          onClose();
        },
      },
    );
  };

  const text = (
    key: 'headline' | 'upcomingHeadline' | 'ctaLabel' | 'ctaPath',
    label: string,
    hint?: string,
    required?: boolean,
  ) => (
    <FormField
      label={label}
      htmlFor={`campaign-${key}`}
      hint={hint}
      required={required}
      error={errors[key]}
    >
      <Input
        id={`campaign-${key}`}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        disabled={busy}
      />
    </FormField>
  );

  const dateTime = (
    key: 'startsAt' | 'endsAt' | 'announceFrom',
    label: string,
    hint: string,
    required?: boolean,
  ) => (
    <FormField
      label={label}
      htmlFor={`campaign-${key}`}
      hint={hint}
      required={required}
      error={errors[key]}
    >
      <Input
        id={`campaign-${key}`}
        type="datetime-local"
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        disabled={busy}
      />
    </FormField>
  );

  return (
    <Modal open={open} onClose={busy ? undefined : onClose} size="lg">
      <Modal.Header
        title={isNew ? 'New campaign' : `Edit ${campaign.code}`}
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
                htmlFor="campaign-code"
                required
                hint="Fixed once created, e.g. DIWALI_2026."
                error={errors.code}
              >
                <Input
                  id="campaign-code"
                  value={form.code}
                  onChange={(e) => set('code', e.target.value.toUpperCase())}
                  disabled={busy}
                />
              </FormField>
            ) : null}
            <FormField label="Theme" htmlFor="campaign-theme" required>
              <Select
                id="campaign-theme"
                value={form.theme}
                options={THEME_OPTIONS}
                onChange={(e) => set('theme', e.target.value as CampaignTheme)}
                disabled={busy}
              />
            </FormField>
          </Inline>

          {text('headline', 'Headline', 'Shown while the sale is live.', true)}
          {text(
            'upcomingHeadline',
            'Teaser headline',
            'Shown before the start. Empty reuses the headline.',
          )}
          <FormField
            label="Subtext"
            htmlFor="campaign-subtext"
            hint={`Up to ${CAMPAIGN_LIMITS.subtext} characters.`}
            error={errors.subtext}
          >
            <Textarea
              id="campaign-subtext"
              rows={2}
              value={form.subtext}
              onChange={(e) => set('subtext', e.target.value)}
              disabled={busy}
            />
          </FormField>
          <Inline gap="md" flexWrap align="start">
            {text('ctaLabel', 'Button text', 'Empty for no button.')}
            {text('ctaPath', 'Button link', 'An app path such as /plans.')}
          </Inline>

          <Inline gap="md" flexWrap align="start">
            {dateTime('startsAt', 'Starts', 'IST.', true)}
            {dateTime('endsAt', 'Ends', 'IST.', true)}
            {dateTime('announceFrom', 'Announce from', 'IST. Empty shows it only once live.')}
          </Inline>

          <Inline gap="md" flexWrap align="start">
            <FormField
              label="'Soon' window (days)"
              htmlFor="campaign-threshold"
              hint="Days before start and end that show 'starting / ending soon'. Empty for 3."
              error={errors.imminentThresholdDays}
            >
              <Input
                id="campaign-threshold"
                inputMode="numeric"
                value={form.imminentThresholdDays}
                onChange={(e) => set('imminentThresholdDays', e.target.value)}
                disabled={busy}
              />
            </FormField>
            <FormField
              label="Priority"
              htmlFor="campaign-priority"
              hint="A live campaign beats an announced one; after that, the highest priority shows."
              error={errors.priority}
            >
              <Input
                id="campaign-priority"
                inputMode="numeric"
                value={form.priority}
                onChange={(e) => set('priority', e.target.value)}
                disabled={busy}
              />
            </FormField>
          </Inline>

          <Checkbox
            id="campaign-dismissible"
            label="Shops can dismiss the banner"
            checked={form.dismissible}
            onChange={(e) => set('dismissible', e.target.checked)}
            disabled={busy}
          />
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
