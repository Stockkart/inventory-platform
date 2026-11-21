/**
 * `SettingsScreen` (R4.11): the paired shop and employee, the app version, and "Remove this phone"
 * (R3.7–R3.9). Nothing else: no login, no other HR screens.
 *
 * "Remove this phone" asks the worker to confirm first (R3.7), then runs {@link removePhone}:
 * `POST /pairings/me/unpair`, and only after the server has answered, `wipe()`; the screen then
 * hands over to the pairing screen through `onUnpaired`. When the server is not reachable the
 * screen shows `UNPAIR_NEEDS_NETWORK`, keeps every item and stays paired (R3.8). Another refusal
 * is shown word for word and changes nothing.
 *
 * The confirmation is inline (two buttons) rather than a system dialog so the step is one
 * component and one test. Dependencies are injected ({@link SettingsScreenDeps}): the version comes
 * from `readAppVersion()` (`expo-constants`) in `RootNavigator`, a literal in tests.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { PairingStore } from '../state/pairingStore';
import { removePhone, type RemovePhoneClient } from '../settings/removePhone';

export interface SettingsScreenDeps {
  client: RemovePhoneClient;
  pairingStore: Pick<PairingStore, 'load' | 'wipe'>;
  /** `app.json` version plus build number, from `expo-constants` on the phone. */
  appVersion: string;
}

export interface SettingsScreenProps {
  deps: SettingsScreenDeps;
  /** The server unpaired this phone and it is wiped (R3.7): show the pairing screen. */
  onUnpaired: () => void;
}

export const REMOVE_PHONE = 'Remove this phone';
export const REMOVE_PHONE_QUESTION = 'Remove this phone?';
export const REMOVE_PHONE_EXPLANATION =
  'Your shop will no longer accept check-ins from this phone, and everything the Attendance app saved on it is deleted. A manager can pair it again.';
export const REMOVE_PHONE_CONFIRM = 'Yes, remove';
export const REMOVE_PHONE_CANCEL = 'Cancel';

type Phase =
  | { kind: 'idle' }
  | { kind: 'confirming' }
  | { kind: 'removing' }
  /** The server refused or could not be reached; nothing changed (R3.8). */
  | { kind: 'failed'; message: string };

export function SettingsScreen({ deps, onUnpaired }: SettingsScreenProps) {
  const [shopName, setShopName] = useState<string>('');
  const [employeeName, setEmployeeName] = useState<string>('');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    deps.pairingStore
      .load()
      .then((record) => {
        if (mounted.current && record) {
          setShopName(record.shopName);
          setEmployeeName(record.employeeName);
        }
      })
      .catch(() => {
        // Names are a convenience here; the screen still works without them.
      });
    return () => {
      mounted.current = false;
    };
  }, [deps.pairingStore]);

  async function confirmRemove(): Promise<void> {
    setPhase({ kind: 'removing' });
    let result;
    try {
      result = await removePhone({ client: deps.client, pairingStore: deps.pairingStore });
    } catch (error) {
      if (mounted.current) {
        setPhase({ kind: 'failed', message: messageOf(error) });
      }
      return;
    }
    if (result.kind === 'unpaired') {
      onUnpaired();
      return;
    }
    if (mounted.current) {
      setPhase({ kind: 'failed', message: result.message });
    }
  }

  const busy = phase.kind === 'removing';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Row label="Shop" value={shopName} testID="settings-shop" />
        <Row label="Employee" value={employeeName} testID="settings-employee" />
        <Row label="App version" value={deps.appVersion} testID="settings-version" />
      </View>

      <View style={styles.section}>
        {phase.kind === 'confirming' || phase.kind === 'removing' ? (
          <View style={styles.confirm} testID="remove-phone-confirm">
            <Text style={styles.question} accessibilityRole="header">
              {REMOVE_PHONE_QUESTION}
            </Text>
            <Text style={styles.explanation}>{REMOVE_PHONE_EXPLANATION}</Text>
            <View style={styles.confirmButtons}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={REMOVE_PHONE_CANCEL}
                disabled={busy}
                onPress={() => setPhase({ kind: 'idle' })}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryLabel}>{REMOVE_PHONE_CANCEL}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={REMOVE_PHONE_CONFIRM}
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={() => void confirmRemove()}
                style={[styles.dangerButton, busy && styles.busy]}
              >
                <Text style={styles.dangerLabel}>{busy ? 'Removing…' : REMOVE_PHONE_CONFIRM}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={REMOVE_PHONE}
            onPress={() => setPhase({ kind: 'confirming' })}
            style={styles.dangerButton}
            testID="remove-phone"
          >
            <Text style={styles.dangerLabel}>{REMOVE_PHONE}</Text>
          </Pressable>
        )}
        {phase.kind === 'failed' ? (
          <Text style={styles.error} testID="remove-phone-error">
            {phase.message}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Row({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} testID={testID}>
        {value}
      </Text>
    </View>
  );
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Something went wrong. Try again.';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingHorizontal: 24, paddingVertical: 16 },
  section: { marginBottom: 32 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dddddd',
  },
  rowLabel: { fontSize: 16, color: '#555555' },
  rowValue: { fontSize: 16, color: '#111111', flexShrink: 1, textAlign: 'right' },
  confirm: { padding: 16, borderRadius: 12, backgroundColor: '#fff4f2' },
  question: { fontSize: 18, fontWeight: '600', color: '#111111' },
  explanation: { fontSize: 14, color: '#555555', marginTop: 8 },
  confirmButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 },
  dangerButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#b42318',
    alignItems: 'center',
  },
  dangerLabel: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#eeeeee',
    alignItems: 'center',
  },
  secondaryLabel: { color: '#111111', fontSize: 16 },
  busy: { opacity: 0.6 },
  error: { marginTop: 12, fontSize: 14, color: '#b42318' },
});
