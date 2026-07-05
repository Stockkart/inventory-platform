import { index, route, type RouteConfigEntry } from '@react-router/dev/routes';
import {
  composeDashboardRouteEntries,
  type RoutePackageRegistration,
} from '@inventory-platform/routing';
import { mobileUploadRoutes } from '../../../core/product/src/routes';

const CORE = '../../../core';
const USER_JOURNEY = `${CORE}/user/src/journey`;
const PLAN_MARKETING = `${CORE}/plan/src/marketing`;

const PUBLIC_ROUTE_MANIFEST: Array<
  | { kind: 'index'; file: string }
  | { kind: 'route'; path: string; file: string }
> = [
  { kind: 'index', file: `${PLAN_MARKETING}/landing.tsx` },
  { kind: 'route', path: 'favicon.ico', file: './routes/favicon.tsx' },
  {
    kind: 'route',
    path: '.well-known/appspecific/com.chrome.devtools.json',
    file: './routes/well-known-chrome-devtools.tsx',
  },
  { kind: 'route', path: 'login', file: `${USER_JOURNEY}/auth/routes/login.tsx` },
  { kind: 'route', path: 'signup', file: `${USER_JOURNEY}/auth/routes/signup.tsx` },
  {
    kind: 'route',
    path: 'forgot-password',
    file: `${USER_JOURNEY}/auth/routes/forgot-password.tsx`,
  },
  {
    kind: 'route',
    path: 'reset-password',
    file: `${USER_JOURNEY}/auth/routes/reset-password.tsx`,
  },
  { kind: 'route', path: 'plans', file: `${PLAN_MARKETING}/plans.tsx` },
  {
    kind: 'route',
    path: 'shop-selection',
    file: `${USER_JOURNEY}/onboarding/shop-selection.tsx`,
  },
  {
    kind: 'route',
    path: 'request-join-shop',
    file: `${USER_JOURNEY}/onboarding/request-join-shop.tsx`,
  },
  {
    kind: 'route',
    path: 'my-requests-invitations',
    file: `${USER_JOURNEY}/onboarding/my-requests-invitations.tsx`,
  },
  {
    kind: 'route',
    path: 'onboarding',
    file: `${USER_JOURNEY}/onboarding/onboarding.tsx`,
  },
];

const MOBILE_UPLOAD_REGISTRATION: RoutePackageRegistration = {
  root: `${CORE}/product/src`,
  modules: mobileUploadRoutes,
};

/** Pre-auth and utility routes for the inventory app shell. */
export function publicRoutes(): RouteConfigEntry[] {
  const utilityRoutes = PUBLIC_ROUTE_MANIFEST.map((entry) => {
    if (entry.kind === 'index') {
      return index(entry.file);
    }
    return route(entry.path, entry.file);
  });

  const mobileUpload = composeDashboardRouteEntries([
    MOBILE_UPLOAD_REGISTRATION,
  ]).map((entry) => route(entry.path, entry.file));

  return [...utilityRoutes, ...mobileUpload];
}

export { PUBLIC_ROUTE_MANIFEST };
