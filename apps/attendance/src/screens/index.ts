/**
 * Public surface of the pairing screens (task 13.1). The navigator (task 13.2) imports the route
 * names and param types from here; Home, History and Settings add their own exports when they land.
 */
export { PAIR_ROUTE, PairScreen } from './PairScreen';
export type { PairRouteParams, PairingConsentParams } from './PairScreen';
export { CONSENT_HEADINGS, CONSENT_ROUTE, ConsentScreen, PAIRED_TITLE } from './ConsentScreen';
export type { ConsentRouteParams } from './ConsentScreen';

// History and Settings (task 13.3), with the launch gate the navigator runs at start-up.
export { DUPLICATE_PUNCH, HISTORY_FROM_CACHE, HistoryScreen } from './HistoryScreen';
export type { HistoryScreenDeps, HistoryScreenProps } from './HistoryScreen';
export { REMOVE_PHONE, REMOVE_PHONE_CONFIRM, SettingsScreen } from './SettingsScreen';
export type { SettingsScreenDeps, SettingsScreenProps } from './SettingsScreen';
export { resolveLaunchRoute } from '../app/LaunchGate';
export type { LaunchGateDeps, LaunchRoute } from '../app/LaunchGate';
