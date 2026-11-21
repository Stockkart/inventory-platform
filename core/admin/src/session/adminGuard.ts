import { isApiError } from '@inventory-platform/api-client';

export const ADMIN_PATHS = {
  home: '/',
  login: '/login',
  changePassword: '/change-password',
  mis: '/mis',
  referrals: '/referrals',
  vouchers: '/vouchers',
  campaigns: '/campaigns',
  catalogue: '/catalogue',
  admins: '/admins',
} as const;

export type AdminSessionStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';

/**
 * Only a 401 means the session is over. Any other failure (server error, no network) keeps the
 * token and shows a retry, so a short outage never signs every admin out.
 */
export function adminSessionStatus({
  hasToken,
  hasAdmin,
  error,
}: {
  hasToken: boolean;
  hasAdmin: boolean;
  error: unknown;
}): AdminSessionStatus {
  if (!hasToken) return 'idle';
  if (hasAdmin) return 'ready';
  if (error == null) return 'loading';
  return isApiError(error) && error.status === 401 ? 'error' : 'unavailable';
}

/** Which part of the admin app is asking. */
export type AdminArea = 'login' | 'change-password' | 'app';

export interface AdminGuardInput {
  area: AdminArea;
  hasToken: boolean;
  /**
   * State of the signed-in admin lookup: `idle` with no token to look up, `error` when the API
   * rejected the session (401), `unavailable` when it could not answer (5xx, network).
   */
  status: AdminSessionStatus;
  mustChangePassword?: boolean;
}

/**
 * Where to send the admin, or null to stay. A pending password change only allows the
 * change-password page; everything else needs a live session.
 */
export function adminRedirect({
  area,
  hasToken,
  status,
  mustChangePassword,
}: AdminGuardInput): string | null {
  const signedIn = hasToken && status === 'ready';

  if (area === 'login') {
    if (!signedIn) return null;
    return mustChangePassword ? ADMIN_PATHS.changePassword : ADMIN_PATHS.home;
  }

  if (!hasToken || status === 'error') return ADMIN_PATHS.login;
  // The API could not answer: stay, keep the token, and let the page offer a retry.
  if (status === 'unavailable') return null;
  if (area === 'app' && signedIn && mustChangePassword) return ADMIN_PATHS.changePassword;
  return null;
}
