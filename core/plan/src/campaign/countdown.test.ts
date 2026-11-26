import { describe, expect, it } from 'vitest';
import type { CampaignResponse } from '@inventory-platform/plan/types';
import {
  clockOffsetMs,
  countdownLabel,
  countdownTargetMs,
  formatRemaining,
  tickIntervalMs,
} from './countdown';

// Sale: 10 Oct 00:00 IST (9 Oct 18:30Z) to 20 Oct 00:00 IST (19 Oct 18:30Z).
const campaign = (overrides: Partial<CampaignResponse>): CampaignResponse => ({
  code: 'MONSOON_2026',
  state: 'LIVE',
  headline: 'Monsoon sale',
  subtext: null,
  ctaLabel: null,
  ctaPath: null,
  theme: 'MONSOON',
  startsAt: '2026-10-09T18:30:00Z',
  endsAt: '2026-10-19T18:30:00Z',
  dismissible: true,
  serverNow: '2026-10-12T06:00:00Z',
  nextTransitionAt: '2026-10-16T18:30:00Z',
  ...overrides,
});

describe('clockOffsetMs', () => {
  it('is server minus device time at receipt', () => {
    expect(clockOffsetMs('2026-10-12T06:00:10Z', Date.parse('2026-10-12T06:00:00Z'))).toBe(10_000);
  });

  it('falls back to zero on a bad timestamp', () => {
    expect(clockOffsetMs('nope', 123)).toBe(0);
  });
});

describe('countdownTargetMs', () => {
  it('targets the start before live and the end once live', () => {
    expect(countdownTargetMs(campaign({ state: 'STARTING_SOON' }))).toBe(
      Date.parse('2026-10-09T18:30:00Z'),
    );
    expect(countdownTargetMs(campaign({ state: 'ENDING_SOON' }))).toBe(
      Date.parse('2026-10-19T18:30:00Z'),
    );
  });
});

describe('formatRemaining', () => {
  it('drops to finer units as the time shrinks', () => {
    expect(formatRemaining((2 * 24 + 4) * 3_600_000)).toBe('2d 04h');
    expect(formatRemaining(3 * 3_600_000 + 7 * 60_000)).toBe('3h 07m');
    expect(formatRemaining(12 * 60_000 + 5_000)).toBe('12m 05s');
    expect(formatRemaining(-1)).toBe('0m 00s');
  });
});

describe('countdownLabel', () => {
  const now = Date.parse('2026-10-18T18:30:00Z');

  it('ticks in the soon states', () => {
    expect(countdownLabel(campaign({ state: 'ENDING_SOON' }), now)).toBe('Ends in 1d 00h');
  });

  it('shows the IST last day for a sale ending at midnight', () => {
    expect(countdownLabel(campaign({ state: 'LIVE' }), now)).toBe('Ends 19 Oct');
  });

  it('shows the IST start day while upcoming', () => {
    expect(countdownLabel(campaign({ state: 'UPCOMING' }), now)).toBe('Starts 10 Oct');
  });
});

describe('tickIntervalMs', () => {
  it('ticks every second only in the final hour of a soon state', () => {
    expect(tickIntervalMs('ENDING_SOON', 30 * 60_000)).toBe(1000);
    expect(tickIntervalMs('ENDING_SOON', 5 * 3_600_000)).toBe(30_000);
    expect(tickIntervalMs('LIVE', 30 * 60_000)).toBe(60_000);
  });
});
