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

/** Which part of the admin app is asking. */
export type AdminArea = 'login' | 'change-password' | 'app';

export interface AdminGuardInput {
  area: AdminArea;
  hasToken: boolean;
  /** State of the signed-in admin lookup; `idle` when there is no token to look up. */
  status: 'idle' | 'loading' | 'ready' | 'error';
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
  if (area === 'app' && signedIn && mustChangePassword) return ADMIN_PATHS.changePassword;
  return null;
}
