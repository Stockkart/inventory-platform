/**
 * Route names and params of the app's one stack (R4.11): pair → home → history → settings, plus
 * the consent screen reached from pairing and from the re-consent gate. Shared by `RootNavigator`
 * and every screen that navigates, so a route name is spelled once.
 *
 * The `Consent` params are the ones `ConsentScreen` declares (`pairing` mode carries the claim
 * token, code, names and consent text; `reconsent` mode carries the newer consent text only).
 */
import type { ConsentRouteParams } from '../screens/ConsentScreen';

export const ROUTES = {
  Pair: 'Pair',
  Consent: 'Consent',
  Home: 'Home',
  History: 'History',
  Settings: 'Settings',
} as const;

export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];

/** Params per route; `undefined` means the route takes none. */
export type RootStackParamList = {
  Pair: undefined;
  Consent: ConsentRouteParams;
  Home: undefined;
  History: undefined;
  Settings: undefined;
};
