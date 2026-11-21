import type { CampaignResponse, CampaignState } from '@inventory-platform/plan/types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const CAMPAIGN_TIME_ZONE = 'Asia/Kolkata';

export function isLiveState(state: CampaignState): boolean {
  return state === 'LIVE' || state === 'ENDING_SOON';
}

/** Server minus device clock, measured when the response arrived. */
export function clockOffsetMs(serverNow: string, receivedAtMs: number): number {
  const server = Date.parse(serverNow);
  return Number.isNaN(server) ? 0 : server - receivedAtMs;
}

/** Counts down to the end once live, to the start before that. */
export function countdownTargetMs(campaign: CampaignResponse): number {
  return Date.parse(isLiveState(campaign.state) ? campaign.endsAt : campaign.startsAt);
}

const pad = (value: number) => String(value).padStart(2, '0');

export function formatRemaining(ms: number): string {
  const remaining = Math.max(0, ms);
  const days = Math.floor(remaining / DAY);
  const hours = Math.floor((remaining % DAY) / HOUR);
  const minutes = Math.floor((remaining % HOUR) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  if (days > 0) return `${days}d ${pad(hours)}h`;
  if (hours > 0) return `${hours}h ${pad(minutes)}m`;
  return `${minutes}m ${pad(seconds)}s`;
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: CAMPAIGN_TIME_ZONE,
  });
}

/** A sale ending at midnight is shown as ending the day before. */
function lastDayIso(endsAt: string): string {
  return new Date(Date.parse(endsAt) - 1).toISOString();
}

/** Soon states tick down; the others show a calendar date. */
export function countdownLabel(campaign: CampaignResponse, nowMs: number): string {
  const remaining = countdownTargetMs(campaign) - nowMs;
  switch (campaign.state) {
    case 'UPCOMING':
      return `Starts ${formatDay(campaign.startsAt)}`;
    case 'STARTING_SOON':
      return `Starts in ${formatRemaining(remaining)}`;
    case 'LIVE':
      return `Ends ${formatDay(lastDayIso(campaign.endsAt))}`;
    case 'ENDING_SOON':
      return `Ends in ${formatRemaining(remaining)}`;
  }
}

export const STATE_EYEBROW: Record<CampaignState, string> = {
  UPCOMING: 'Coming soon',
  STARTING_SOON: 'Starting soon',
  LIVE: 'Sale is live',
  ENDING_SOON: 'Last days',
};

/** Seconds matter only in the final hour; otherwise a slow tick saves battery. */
export function tickIntervalMs(state: CampaignState, remainingMs: number): number {
  if (state === 'UPCOMING' || state === 'LIVE') return 60_000;
  return remainingMs <= HOUR ? 1000 : 30_000;
}
