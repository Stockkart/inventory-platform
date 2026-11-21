import type { CampaignState } from '@inventory-platform/plan/types';

/** Per code and state, so a dismissed teaser comes back once the sale goes live. */
export function dismissalKey(code: string, state: CampaignState): string {
  return `sk.campaignDismissed.${code}.${state}`;
}

export function isCampaignDismissed(code: string, state: CampaignState): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(dismissalKey(code, state)) === '1';
  } catch {
    return false;
  }
}

export function dismissCampaign(code: string, state: CampaignState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(dismissalKey(code, state), '1');
  } catch {
    // Storage blocked (private mode, quota): the banner just hides for this visit.
  }
}
