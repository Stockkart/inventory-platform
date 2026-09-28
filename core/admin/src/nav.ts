import type { LucideIcon } from 'lucide-react';
import { Handshake, Megaphone, Package, Receipt, TrendingUp, Users } from 'lucide-react';
import { ADMIN_PATHS } from './session/adminGuard';

export interface AdminNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

/** The admin app's sidebar; the plan tools' routes are composed by the plugin registry. */
export const ADMIN_NAV: AdminNavItem[] = [
  { path: ADMIN_PATHS.mis, label: 'Revenue MIS', icon: TrendingUp },
  { path: ADMIN_PATHS.referrals, label: 'Referral operations', icon: Handshake },
  { path: ADMIN_PATHS.vouchers, label: 'Vouchers', icon: Receipt },
  { path: ADMIN_PATHS.campaigns, label: 'Sale campaigns', icon: Megaphone },
  { path: ADMIN_PATHS.catalogue, label: 'Plans & add-ons', icon: Package },
  { path: ADMIN_PATHS.admins, label: 'Admins', icon: Users },
];
