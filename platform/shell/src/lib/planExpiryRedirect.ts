import { isPlanExpiryAllowedPath } from '@inventory-platform/contracts';

/** Where an expired shop renews (My Plan). */
export const PLAN_STATUS_PATH = '/dashboard/plan-status';

/**
 * True when the shop's plan or trial has expired and `pathname` is not one of the screens kept
 * open for renewal, so the dashboard must go to My Plan instead of rendering the screen.
 */
export function mustLeaveForPlanStatus(pathname: string, planExpired: boolean): boolean {
  return planExpired && !isPlanExpiryAllowedPath(pathname);
}
