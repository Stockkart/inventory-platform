import { describe, expect, it } from 'vitest';
import { freeTrialLabel, trialLabel } from './trialLabel';

describe('trial labels', () => {
  it('uses the trial length from the API', () => {
    expect(trialLabel(3)).toBe('3-day trial');
    expect(freeTrialLabel(3)).toBe('Free 3-day trial');
  });

  it('names no length when an older API omits it', () => {
    expect(trialLabel(undefined)).toBe('Free trial');
    expect(trialLabel(null)).toBe('Free trial');
    expect(trialLabel(0)).toBe('Free trial');
    expect(freeTrialLabel(undefined)).toBe('Free trial');
  });
});
