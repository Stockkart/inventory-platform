import type { PlanOptionResponse } from '@inventory-platform/plan/types';
import { formatPlanDate } from './planDate';

export interface PlanCardCta {
  label: string;
  disabled: boolean;
  /** Why the action waits, with the date it opens; shown under the button. */
  note: string | null;
}

const ACTION_LABELS: Record<PlanOptionResponse['action'], string> = {
  CURRENT: 'Renew plan',
  UPGRADE: 'Upgrade',
  BUY: 'Buy',
};

/**
 * The card button from the API's plan option (`planOptions` on plan status). Without one (the
 * public pages, or an older API) the caller's label is used and only the current plan is disabled.
 */
export function planCardCta(
  option: PlanOptionResponse | undefined,
  fallbackLabel: string,
  isCurrent: boolean,
): PlanCardCta {
  if (!option) {
    return { label: isCurrent ? 'Current plan' : fallbackLabel, disabled: isCurrent, note: null };
  }
  if (option.actionAvailable) {
    return { label: ACTION_LABELS[option.action], disabled: false, note: null };
  }
  const reason = option.unavailableReason ?? 'Not available right now.';
  const availableFrom = formatPlanDate(option.availableFrom);
  const note = availableFrom
    ? `${reason.replace(/\.?$/, '.')} Available from ${availableFrom}.`
    : reason;
  return { label: ACTION_LABELS[option.action], disabled: true, note };
}
