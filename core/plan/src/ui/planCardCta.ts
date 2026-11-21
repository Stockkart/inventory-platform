import type { PlanOptionResponse } from '@inventory-platform/plan/types';

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

/** Indian calendar day, e.g. "21 Nov 2027". */
function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

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
  const note = option.availableFrom
    ? `${reason.replace(/\.?$/, '.')} Available from ${formatDay(option.availableFrom)}.`
    : reason;
  return { label: ACTION_LABELS[option.action], disabled: true, note };
}
