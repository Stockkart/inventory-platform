/**
 * Subscription entitlements, the second gating axis beside {@link ShopUiCapabilities}.
 * A nav item or route is shown only when both allow it.
 */
export interface PlanEntitlementsView {
  enforcement: 'OFF' | 'LOG_ONLY' | 'ENFORCE';
  features: readonly string[];
}

/** Dashboard paths that need a plan feature. Matches the path and everything under it. */
const PATH_FEATURES: ReadonlyArray<readonly [string, string]> = [
  ['/dashboard/accounting', 'ACCOUNTING'],
  ['/dashboard/credit', 'CREDIT_BALANCE'],
  ['/dashboard/barcodes', 'BARCODE_GENERATOR'],
];

export function planFeatureForPath(path: string): string | null {
  for (const [prefix, feature] of PATH_FEATURES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return feature;
    }
  }
  return null;
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

export function isPathEntitled(
  path: string,
  entitlements: PlanEntitlementsView | null | undefined,
): boolean {
  const feature = planFeatureForPath(path);
  return feature == null || isPlanFeatureEnabled(entitlements, feature);
}
