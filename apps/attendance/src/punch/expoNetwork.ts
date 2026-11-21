/**
 * The phone's own report of its connection, for the reachability probe (`./reachability.ts`,
 * R6.1 "the phone reports no network connection"). Import this from app code only; tests pass a
 * plain `() => Promise<boolean>` and never load this file (it needs the React Native runtime).
 *
 * False only when NetInfo is sure there is no connection or no internet; "unknown" (`null`) counts
 * as connected so the probe still asks the server rather than queueing on a guess.
 */
import NetInfo from '@react-native-community/netinfo';

export async function netInfoConnected(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected !== false && state.isInternetReachable !== false;
}
