import { afterEach, describe, expect, it, vi } from 'vitest';
import { dismissCampaign, dismissalKey, isCampaignDismissed } from './dismissal';

function stubStorage(storage: Partial<Storage>) {
  vi.stubGlobal('window', { localStorage: storage });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('campaign dismissal', () => {
  it('is keyed per code and state', () => {
    expect(dismissalKey('MONSOON_2026', 'UPCOMING')).toBe(
      'sk.campaignDismissed.MONSOON_2026.UPCOMING',
    );
  });

  it('remembers a dismissal for that state only', () => {
    const map = new Map<string, string>();
    stubStorage({
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, value),
    });

    dismissCampaign('MONSOON_2026', 'UPCOMING');

    expect(isCampaignDismissed('MONSOON_2026', 'UPCOMING')).toBe(true);
    expect(isCampaignDismissed('MONSOON_2026', 'LIVE')).toBe(false);
  });

  it('shows the banner when storage throws', () => {
    stubStorage({
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });

    expect(() => dismissCampaign('MONSOON_2026', 'LIVE')).not.toThrow();
    expect(isCampaignDismissed('MONSOON_2026', 'LIVE')).toBe(false);
  });

  it('is never dismissed without a window', () => {
    expect(isCampaignDismissed('MONSOON_2026', 'LIVE')).toBe(false);
  });
});
