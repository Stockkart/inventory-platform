/** Dashboard routes reachable while the shop plan or trial is expired. */
export const PLAN_EXPIRY_ALLOWED_PATHS = [
  '/dashboard/plan-status',
  '/dashboard/plan-payment',
  '/dashboard/shops',
] as const;

export function isPlanExpiryAllowedPath(pathname: string): boolean {
  return PLAN_EXPIRY_ALLOWED_PATHS.some(
    (allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`),
  );
}
