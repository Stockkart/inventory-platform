/** List of estimates (sidebar "Sell Estimate"). */
export const ESTIMATES_LIST_PATH = '/dashboard/estimates';

/**
 * Estimate scan/cart UI lives on the Estimates route with query params
 * (`fresh=1` or `purchaseId`). Avoids a separate router path that 404s until
 * React Router reloads `app/routes.tsx`.
 */
export const ESTIMATE_WORKSPACE_PATH = ESTIMATES_LIST_PATH;

export function estimateWorkspaceHref(opts?: { purchaseId?: string; fresh?: boolean }): string {
  const params = new URLSearchParams();
  if (opts?.fresh) {
    params.set('fresh', '1');
  } else if (opts?.purchaseId) {
    params.set('purchaseId', opts.purchaseId);
  }
  const q = params.toString();
  return q ? `${ESTIMATE_WORKSPACE_PATH}?${q}` : ESTIMATE_WORKSPACE_PATH;
}

export function isEstimateListPath(pathname: string): boolean {
  return pathname === ESTIMATES_LIST_PATH || pathname === `${ESTIMATES_LIST_PATH}/`;
}

/** Legacy `/dashboard/estimates/workspace` bookmarks. */
export function isLegacyEstimateWorkspacePath(pathname: string): boolean {
  return (
    pathname === `${ESTIMATES_LIST_PATH}/workspace` ||
    pathname.startsWith(`${ESTIMATES_LIST_PATH}/workspace/`)
  );
}

export function isEstimateWorkspaceSearch(searchParams: URLSearchParams): boolean {
  return searchParams.get('fresh') === '1' || Boolean(searchParams.get('purchaseId')?.trim());
}
