/**
 * Subscription entitlements, the second gating axis beside {@link ShopUiCapabilities}.
 * A nav item or route is shown only when both allow it. Which paths need which feature is
 * declared on the nav items (`requiresFeature` in `@inventory-platform/routing`).
 */
export interface PlanEntitlementsView {
  enforcement: 'OFF' | 'LOG_ONLY' | 'ENFORCE';
  features: readonly string[];
}

/**
 * Allowed unless the backend is enforcing and the plan lacks the feature. Unknown entitlements
 * (not loaded, failed) allow, because the backend check is the real gate.
 */
export function isPlanFeatureEnabled(
  entitlements: PlanEntitlementsView | null | undefined,
  feature: string,
): boolean {
  if (!entitlements || entitlements.enforcement !== 'ENFORCE') {
    return true;
  }
  return entitlements.features.includes(feature);
}
