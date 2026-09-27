import type {
  AdminCampaign,
  CampaignRequest,
  CampaignState,
  CampaignTheme,
} from '@inventory-platform/plan/types';
import type { BadgeVariant } from '@inventory-platform/ui-kit';
import { fromIstDateTime, istDateTime } from '../dates';

/** Mirrors CampaignValidator so most mistakes show before the request. */
const CODE = /^[A-Z0-9_]{3,40}$/;
const CTA_PATH = /^\/(?!\/)[A-Za-z0-9/_-]*$/;
export const CAMPAIGN_LIMITS = {
  headline: 120,
  subtext: 200,
  ctaLabel: 30,
  thresholdDays: 30,
  priority: 100,
} as const;

export const CAMPAIGN_THEME_LABEL: Record<CampaignTheme, string> = {
  DEFAULT: 'Default',
  MONSOON: 'Monsoon',
  SUMMER: 'Summer',
  DIWALI: 'Diwali',
  NEW_YEAR: 'New Year',
};

/** Date-time fields hold datetime-local values, read as IST. */
export interface CampaignFormState {
  code: string;
  headline: string;
  upcomingHeadline: string;
  subtext: string;
  ctaLabel: string;
  ctaPath: string;
  theme: CampaignTheme;
  startsAt: string;
  endsAt: string;
  announceFrom: string;
  imminentThresholdDays: string;
  dismissible: boolean;
  priority: string;
}

export const emptyCampaignForm = (): CampaignFormState => ({
  code: '',
  headline: '',
  upcomingHeadline: '',
  subtext: '',
  ctaLabel: 'View plans',
  ctaPath: '/plans',
  theme: 'DEFAULT',
  startsAt: '',
  endsAt: '',
  announceFrom: '',
  imminentThresholdDays: '',
  dismissible: true,
  priority: '0',
});

export const campaignFormState = (campaign: AdminCampaign): CampaignFormState => ({
  code: campaign.code,
  headline: campaign.headline,
  upcomingHeadline: campaign.upcomingHeadline ?? '',
  subtext: campaign.subtext ?? '',
  ctaLabel: campaign.ctaLabel ?? '',
  ctaPath: campaign.ctaPath ?? '',
  theme: campaign.theme,
  startsAt: istDateTime(campaign.startsAt),
  endsAt: istDateTime(campaign.endsAt),
  announceFrom: istDateTime(campaign.announceFrom),
  imminentThresholdDays:
    campaign.imminentThresholdDays != null ? String(campaign.imminentThresholdDays) : '',
  dismissible: campaign.dismissible,
  priority: String(campaign.priority),
});

export type CampaignFormErrors = Partial<Record<keyof CampaignFormState, string>>;

function wholeNumber(input: string): number | null {
  return /^\d+$/.test(input.trim()) ? Number(input.trim()) : null;
}

function optional(input: string): string | null {
  const trimmed = input.trim();
  return trimmed ? trimmed : null;
}

function tooLong(value: string, max: number): string | undefined {
  return value.trim().length > max ? `At most ${max} characters.` : undefined;
}

/** `isNew` checks the code; edits keep the original one. */
export function toCampaignRequest(
  form: CampaignFormState,
  isNew: boolean,
): { ok: true; request: CampaignRequest } | { ok: false; errors: CampaignFormErrors } {
  const errors: CampaignFormErrors = {};
  const code = form.code.trim().toUpperCase();
  if (isNew && !CODE.test(code)) errors.code = '3–40 characters of A–Z, 0–9 or _.';

  if (!form.headline.trim()) errors.headline = 'Required.';
  else errors.headline = tooLong(form.headline, CAMPAIGN_LIMITS.headline);
  errors.upcomingHeadline = tooLong(form.upcomingHeadline, CAMPAIGN_LIMITS.headline);
  errors.subtext = tooLong(form.subtext, CAMPAIGN_LIMITS.subtext);
  errors.ctaLabel = tooLong(form.ctaLabel, CAMPAIGN_LIMITS.ctaLabel);

  const ctaLabel = optional(form.ctaLabel);
  const ctaPath = optional(form.ctaPath);
  if (Boolean(ctaLabel) !== Boolean(ctaPath)) {
    errors[ctaLabel ? 'ctaPath' : 'ctaLabel'] = 'Button text and link go together.';
  } else if (ctaPath && !CTA_PATH.test(ctaPath)) {
    errors.ctaPath = 'An app path such as /plans.';
  }

  if (!form.startsAt) errors.startsAt = 'Required.';
  if (!form.endsAt) errors.endsAt = 'Required.';
  else if (form.startsAt && form.endsAt <= form.startsAt)
    errors.endsAt = 'Must be after the start.';
  if (form.announceFrom && form.startsAt && form.announceFrom > form.startsAt) {
    errors.announceFrom = 'Cannot be after the start.';
  }

  let threshold: number | null = null;
  if (form.imminentThresholdDays.trim()) {
    const n = wholeNumber(form.imminentThresholdDays);
    if (n === null || n > CAMPAIGN_LIMITS.thresholdDays) {
      errors.imminentThresholdDays = `0–${CAMPAIGN_LIMITS.thresholdDays} days, or empty for the default.`;
    } else {
      threshold = n;
    }
  }

  const priority = wholeNumber(form.priority);
  if (priority === null || priority > CAMPAIGN_LIMITS.priority) {
    errors.priority = `0–${CAMPAIGN_LIMITS.priority}.`;
  }

  const found = Object.fromEntries(
    Object.entries(errors).filter(([, message]) => message !== undefined),
  ) as CampaignFormErrors;
  if (Object.keys(found).length > 0) return { ok: false, errors: found };

  return {
    ok: true,
    request: {
      code,
      headline: form.headline.trim(),
      upcomingHeadline: optional(form.upcomingHeadline),
      subtext: optional(form.subtext),
      ctaLabel,
      ctaPath,
      theme: form.theme,
      startsAt: fromIstDateTime(form.startsAt),
      endsAt: fromIstDateTime(form.endsAt),
      announceFrom: form.announceFrom ? fromIstDateTime(form.announceFrom) : null,
      imminentThresholdDays: threshold,
      dismissible: form.dismissible,
      priority: priority ?? 0,
    },
  };
}

const STATE_BADGE: Record<CampaignState, { label: string; variant: BadgeVariant }> = {
  UPCOMING: { label: 'Announced', variant: 'info' },
  STARTING_SOON: { label: 'Starting soon', variant: 'info' },
  LIVE: { label: 'Live', variant: 'success' },
  ENDING_SOON: { label: 'Ending soon', variant: 'warning' },
};

/** What shops see right now. */
export function campaignVisibility(
  campaign: Pick<AdminCampaign, 'active' | 'state' | 'endsAt'>,
  now: number = Date.now(),
): { label: string; variant: BadgeVariant } {
  if (!campaign.active) return { label: 'Off', variant: 'neutral' };
  if (campaign.state) return STATE_BADGE[campaign.state];
  if (Date.parse(campaign.endsAt) <= now) return { label: 'Ended', variant: 'neutral' };
  return { label: 'Not announced yet', variant: 'neutral' };
}
