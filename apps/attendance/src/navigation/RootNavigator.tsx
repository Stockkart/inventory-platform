/**
 * The app's one navigator (R4.11): pair → home → history → settings, reachable in that order and
 * back, plus the consent screen. No login, no account picker, no other HR screens.
 *
 * Start-up runs the launch gate (`useLaunchGate` → `resolveLaunchRoute`, task 13.3): no pairing →
 * **Pair**; `/me` says the pairing is over or the keys are gone → wipe → **Pair** with the reason
 * shown above the code entry (R3.3, R5.9); `consent.reconsentRequired` → **Consent** in `reconsent`
 * mode first, and Home is not opened until "I agree" (R9.13); otherwise **Home**. While the gate
 * runs a splash is shown. The whole navigator is keyed by the gate run, so `rerun()` (after a
 * wipe reported by the sync worker, or Retry on the consent screen) mounts it again on the new
 * initial route; inside one run the screens navigate through the callbacks this file passes them.
 *
 * Re-consent needs the consent text from `GET /consent/latest`; when the gate could not fetch it
 * (`consent: null`) the app must still not open Home (R9.13), so a retry notice is shown instead
 * with a button that runs the gate again.
 *
 * Screens get their dependencies from {@link AppDeps} as props, so none of them imports `expo-*` or
 * the navigator directly. `AppDeps.sync` (the offline queue's worker, task 14.3) feeds the home
 * screen and reports a pairing ended while sending (R3.3) through `onPairingEnded`.
 */
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ConsentVersion } from '@inventory-platform/attendance-protocol';

import type { AppDeps } from '../app/deps';
import type { LaunchRoute } from '../app/LaunchGate';
import { agreeReconsent } from '../app/reconsent';
import { useLaunchGate } from '../app/useLaunchGate';
import { ConsentScreen, type ConsentRouteParams } from '../screens/ConsentScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { PairScreen } from '../screens/PairScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ROUTES, type RootStackParamList } from './routes';

const Stack = createNativeStackNavigator<RootStackParamList>();

export interface RootNavigatorProps {
  deps: AppDeps;
}

/** Shown when the re-consent text could not be fetched (R9.13: Home stays closed). */
export const CONSENT_UNAVAILABLE =
  'The updated consent text could not be loaded. Try again when you have network.';

export function RootNavigator({ deps }: RootNavigatorProps) {
  const gate = useLaunchGate({ pairingStore: deps.pairingStore, client: deps.client });
  const rerun = gate.rerun;
  const [generation, setGeneration] = useState(0);
  /** Why the phone is back on the pairing screen, when a screen (not the gate) found out. */
  const [endedMessage, setEndedMessage] = useState<string | null>(null);

  const restart = useCallback(
    (message?: string) => {
      setEndedMessage(message ?? null);
      setGeneration((n) => n + 1);
      rerun();
    },
    [rerun],
  );

  // The sync worker found, while sending a queued punch, that the pairing is over and wiped the
  // phone (R3.3): start again, which lands on the pairing screen with the reason.
  useEffect(() => deps.onPairingEnded((ended) => restart(ended.message)), [deps, restart]);

  if (gate.state.status === 'resolving') {
    return (
      <View style={styles.centre}>
        <ActivityIndicator accessibilityLabel="Loading" />
      </View>
    );
  }

  const route = gate.state.route;

  if (route.name === 'Consent' && route.consent === null) {
    return (
      <View style={styles.centre}>
        <Text style={styles.retryText}>{CONSENT_UNAVAILABLE}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry"
          onPress={() => restart()}
          style={styles.retryButton}
        >
          <Text style={styles.retryLabel}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const consentParams = reconsentParams(route);
  const pairMessage = route.name === 'Pair' ? route.message ?? endedMessage : undefined;

  return (
    <NavigationContainer key={generation}>
      <Stack.Navigator initialRouteName={route.name} screenOptions={{ headerShown: false }}>
        <Stack.Screen name={ROUTES.Pair}>
          {({ navigation }) => (
            <View style={styles.fill}>
              {pairMessage ? (
                <Text style={styles.pairMessage} testID="pair-message">
                  {pairMessage}
                </Text>
              ) : null}
              <PairScreen
                flow={deps.pairingFlow}
                onIdentityConfirmed={(params) => navigation.navigate(ROUTES.Consent, params)}
              />
            </View>
          )}
        </Stack.Screen>
        <Stack.Screen name={ROUTES.Consent} initialParams={consentParams}>
          {({ route: current, navigation }) => (
            <ConsentScreen
              params={current.params}
              flow={deps.pairingFlow}
              onPaired={() => navigation.reset({ index: 0, routes: [{ name: ROUTES.Home }] })}
              onDeclined={() => navigation.reset({ index: 0, routes: [{ name: ROUTES.Pair }] })}
              onAgreeReconsent={async (version) => {
                const result = await agreeReconsent(deps, version);
                switch (result.kind) {
                  case 'agreed':
                    navigation.reset({ index: 0, routes: [{ name: ROUTES.Home }] });
                    return;
                  case 'not_paired':
                    navigation.reset({ index: 0, routes: [{ name: ROUTES.Pair }] });
                    return;
                  case 'not_reachable':
                    throw new Error(
                      'The server could not be reached. Try again when you have network.',
                    );
                  case 'refused':
                    throw new Error(result.message);
                }
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name={ROUTES.Home}>
          {({ navigation }) => (
            <HomeScreen
              deps={deps}
              onOpenHistory={() => navigation.navigate(ROUTES.History)}
              onOpenSettings={() => navigation.navigate(ROUTES.Settings)}
              onUnpaired={() => navigation.reset({ index: 0, routes: [{ name: ROUTES.Pair }] })}
              onSignerError={(code, message) => {
                // KEY_INVALIDATED / NO_KEYS: the pairing is over on this phone (R5.9, design
                // "App-side rules"); wipe, then start again on the pairing screen with the reason.
                if (code === 'KEY_INVALIDATED' || code === 'NO_KEYS') {
                  void deps.pairingStore
                    .wipe()
                    .catch(() => undefined)
                    .then(() => restart(message));
                }
              }}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name={ROUTES.History} options={{ headerShown: true, title: 'History' }}>
          {({ navigation }) => (
            <HistoryScreen
              deps={{
                client: deps.client,
                cache: deps.historyCache,
                pairingStore: deps.pairingStore,
              }}
              onUnpaired={() => navigation.reset({ index: 0, routes: [{ name: ROUTES.Pair }] })}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name={ROUTES.Settings} options={{ headerShown: true, title: 'Settings' }}>
          {({ navigation }) => (
            <SettingsScreen
              deps={{
                client: deps.client,
                pairingStore: deps.pairingStore,
                appVersion: deps.appVersion,
              }}
              onUnpaired={() => navigation.reset({ index: 0, routes: [{ name: ROUTES.Pair }] })}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/**
 * The `Consent` route's initial params when the gate opens on re-consent: `ConsentScreen`'s
 * `reconsent` shape, built from the text the gate fetched. Undefined on any other start.
 */
export function reconsentParams(
  route: LaunchRoute,
): Extract<ConsentRouteParams, { mode: 'reconsent' }> | undefined {
  if (route.name !== 'Consent' || route.consent === null) {
    return undefined;
  }
  const consent: ConsentVersion = route.consent;
  return { mode: 'reconsent', consent };
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
  },
  retryText: { fontSize: 16, color: '#374151', textAlign: 'center', marginBottom: 16 },
  retryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#1f6feb',
  },
  retryLabel: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  pairMessage: {
    fontSize: 15,
    color: '#8a4b00',
    backgroundColor: '#fff8e6',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
