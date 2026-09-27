import { describe, expect, it } from 'vitest';
import type { AdminCampaign } from '@inventory-platform/plan/types';
import {
  campaignFormState,
  campaignVisibility,
  emptyCampaignForm,
  toCampaignRequest,
  type CampaignFormState,
} from './campaignForm';

const filled = (over: Partial<CampaignFormState> = {}): CampaignFormState => ({
  ...emptyCampaignForm(),
  code: 'diwali_2026',
  headline: 'Diwali sale: 20% off annual plans',
  startsAt: '2026-10-20T00:00',
  endsAt: '2026-11-05T23:59',
  ...over,
});

const campaign: AdminCampaign = {
  id: 'c1',
  code: 'DIWALI_2026',
  headline: 'Diwali sale',
  subtext: null,
  upcomingHeadline: 'Diwali sale coming',
  ctaLabel: 'View plans',
  ctaPath: '/plans',
  theme: 'DIWALI',
  startsAt: '2026-10-19T18:30:00.000Z',
  endsAt: '2026-11-05T18:29:00.000Z',
  announceFrom: null,
  imminentThresholdDays: 2,
  dismissible: false,
  priority: 5,
  active: true,
  state: null,
  createdAt: null,
  updatedAt: null,
};

describe('toCampaignRequest', () => {
  it('reads times as IST and trims optional text to null', () => {
    const result = toCampaignRequest(
      filled({ subtext: '  ', announceFrom: '2026-10-10T09:00' }),
      true,
    );
    expect(result).toEqual({
      ok: true,
      request: {
        code: 'DIWALI_2026',
        headline: 'Diwali sale: 20% off annual plans',
        upcomingHeadline: null,
        subtext: null,
        ctaLabel: 'View plans',
        ctaPath: '/plans',
        theme: 'DEFAULT',
        startsAt: '2026-10-19T18:30:00.000Z',
        endsAt: '2026-11-05T18:29:00.000Z',
        announceFrom: '2026-10-10T03:30:00.000Z',
        imminentThresholdDays: null,
        dismissible: true,
        priority: 0,
      },
    });
  });

  it('round-trips an existing campaign unchanged', () => {
    const result = toCampaignRequest(campaignFormState(campaign), false);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { id, active, state, createdAt, updatedAt, ...request } = campaign;
    void [id, active, state, createdAt, updatedAt];
    expect(result.request).toEqual(request);
  });

  it('only checks the code on create', () => {
    expect(toCampaignRequest(filled({ code: 'x' }), true).ok).toBe(false);
    expect(toCampaignRequest(filled({ code: 'x' }), false).ok).toBe(true);
  });

  it('reports the rules the server would reject', () => {
    const result = toCampaignRequest(
      filled({
        headline: '',
        ctaLabel: '',
        ctaPath: '//evil.example',
        startsAt: '2026-10-20T00:00',
        endsAt: '2026-10-19T00:00',
        announceFrom: '2026-10-21T00:00',
        imminentThresholdDays: '31',
        priority: '101',
      }),
      true,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(
      [
        'announceFrom',
        'ctaLabel',
        'endsAt',
        'headline',
        'imminentThresholdDays',
        'priority',
      ].sort(),
    );
  });

  it('rejects an absolute link', () => {
    const result = toCampaignRequest(filled({ ctaPath: 'https://example.com' }), true);
    expect(result).toEqual({ ok: false, errors: { ctaPath: expect.any(String) } });
  });
});

describe('campaignVisibility', () => {
  const now = Date.parse('2026-10-01T00:00:00Z');

  it('follows the server state, then explains why a campaign is hidden', () => {
    expect(campaignVisibility({ ...campaign, state: 'LIVE' }, now).label).toBe('Live');
    expect(campaignVisibility({ ...campaign, active: false, state: null }, now).label).toBe('Off');
    expect(campaignVisibility(campaign, now).label).toBe('Not announced yet');
    expect(campaignVisibility({ ...campaign, endsAt: '2026-09-01T00:00:00Z' }, now).label).toBe(
      'Ended',
    );
  });
});
