import { describe, expect, it } from 'vitest';
import type { ShopAccess, ShopMemberAccess } from '@inventory-platform/access';
import { modulesFromMember } from './memberModules';

function member(
  effective: Partial<ShopAccess['modules']>,
  stored?: ShopMemberAccess['permissions'],
): ShopMemberAccess {
  return {
    userId: 'u1',
    name: 'A',
    email: 'a@x.in',
    role: 'MANAGER',
    relationship: 'EMPLOYEE',
    active: true,
    permissions: stored,
    effectiveAccess: {
      modules: {
        accounting: false,
        analytics: false,
        mis: false,
        taxes: false,
        stockCorrection: false,
        marketing: false,
        paymentPlan: false,
        productSearchEdit: false,
        rateRulesEdit: false,
        ...effective,
      },
    } as ShopAccess,
  };
}

describe('modulesFromMember', () => {
  it('mapsRateRulesEditFromEffectiveAccess', () => {
    expect(modulesFromMember(member({ rateRulesEdit: true })).rateRulesEdit).toBe(true);
  });

  it('prefersStoredRateRulesGrant', () => {
    const m = member({ rateRulesEdit: true }, { modules: { rateRulesEdit: false } });
    expect(modulesFromMember(m).rateRulesEdit).toBe(false);
  });
});
