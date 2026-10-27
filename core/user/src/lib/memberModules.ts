import type { MemberModulePermissions, ShopMemberAccess } from '@inventory-platform/access';

/** A member's module toggles: the stored grant where set, else what the server says is effective. */
export function modulesFromMember(member: ShopMemberAccess): MemberModulePermissions {
  const effective = member.effectiveAccess.modules;
  const stored = member.permissions?.modules ?? {};
  return {
    accounting: stored.accounting ?? effective.accounting,
    analytics: stored.analytics ?? effective.analytics,
    mis: stored.mis ?? effective.mis,
    taxes: stored.taxes ?? effective.taxes,
    stockCorrection: stored.stockCorrection ?? effective.stockCorrection,
    marketing: stored.marketing ?? effective.marketing,
    paymentPlan: stored.paymentPlan ?? effective.paymentPlan,
    productSearchEdit: stored.productSearchEdit ?? effective.productSearchEdit,
    rateRulesEdit: stored.rateRulesEdit ?? effective.rateRulesEdit,
    // HR switch: stored `null` means on (design); an older backend may not send `modules.hr`.
    hr: stored.hr ?? effective.hr ?? true,
  };
}
