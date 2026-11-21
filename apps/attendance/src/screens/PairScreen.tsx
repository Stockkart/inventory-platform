/**
 * The app's first screen (R2.6): scan the QR code or type the 8 characters, then confirm "Yes,
 * this is me" against the shop and employee name the server returned. Every decision is made by
 * `PairingFlow` (`../pairing/PairingFlow.ts`); this file only renders its result unions:
 *
 * - a code with a character outside the alphabet is refused here, before any network call (R2.3);
 * - a phone without a strong biometric or secure hardware is told which setting to turn on and
 *   keeps the code (R2.7, R5.4);
 * - a server refusal shows its text word for word (R2.14); "no network" offers Retry;
 * - after 5 refused codes in 15 minutes the screen counts down the 15-minute wait (R2.5).
 *
 * "Yes, this is me" hands over to `ConsentScreen` through `onIdentityConfirmed`; "No, this isn't
 * me" abandons the code and returns to the code field.
 *
 * Route name and params are exported for the navigator (task 13.2):
 *
 * ```tsx
 * <Stack.Screen name={PAIR_ROUTE}>
 *   {({ navigation }) => (
 *     <PairScreen
 *       flow={pairingFlow}
 *       onIdentityConfirmed={(params) => navigation.navigate(CONSENT_ROUTE, params)}
 *     />
 *   )}
 * </Stack.Screen>
 * ```
 */
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PAIRING_CODE_LENGTH, normalisePairingCode } from '@inventory-platform/attendance-protocol';
import type { ClaimPairingResponse } from '@inventory-platform/attendance-protocol';

import { lockoutCountdown } from '../pairing/CodeAttemptLockout';
import type { PairingFlow, SubmitCodeResult } from '../pairing/PairingFlow';
import type { ConsentRouteParams } from './ConsentScreen';
import { BigButton, NoticeBox, ScreenFrame } from './PairingWidgets';
import { QrScanner } from './QrScanner';

/** Route name in the root stack. */
export const PAIR_ROUTE = 'Pair' as const;

/** The `Pair` route takes no params. */
export type PairRouteParams = undefined;

/** The params `PairScreen` hands to the navigator for the `Consent` route. */
export type PairingConsentParams = Extract<ConsentRouteParams, { mode: 'pairing' }>;

interface PairScreenProps {
  flow: PairingFlow;
  /** "Yes, this is me": open `ConsentScreen` with these params. */
  onIdentityConfirmed: (params: PairingConsentParams) => void;
  /** Hide the camera (tests, or a phone without one). Default: shown. */
  showScanner?: boolean;
}

type Notice = { message: string; retry: boolean } | null;

type Phase =
  | { kind: 'enter' }
  | { kind: 'busy' }
  | { kind: 'confirm'; code: string; claim: ClaimPairingResponse };

/** Longest text the field accepts: 8 characters plus separators the worker may type ("ABCD-EFGH"). */
const INPUT_MAX_LENGTH = PAIRING_CODE_LENGTH + 3;

export function PairScreen({ flow, onIdentityConfirmed, showScanner = true }: PairScreenProps) {
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<Phase>({ kind: 'enter' });
  const [notice, setNotice] = useState<Notice>(null);
  const [lockRemainingMs, setLockRemainingMs] = useState(() => flow.lockoutRemainingMs());
  const locked = lockRemainingMs > 0;

  // R2.5: tick the countdown once a second while locked; clear the notice when the lock ends.
  useEffect(() => {
    if (!locked) {
      return;
    }
    const timer = setInterval(() => {
      const left = flow.lockoutRemainingMs();
      setLockRemainingMs(left);
      if (left <= 0) {
        setNotice(null);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [flow, locked]);

  const submit = useCallback(
    async (text: string) => {
      if (phase.kind === 'busy') {
        return;
      }
      setPhase({ kind: 'busy' });
      setNotice(null);
      let result: SubmitCodeResult;
      try {
        result = await flow.submitCode(text);
      } catch (error) {
        setPhase({ kind: 'enter' });
        setNotice({
          message:
            error instanceof Error && error.message
              ? error.message
              : 'Something went wrong. Try again.',
          retry: true,
        });
        return;
      }
      switch (result.kind) {
        case 'claimed':
          setPhase({ kind: 'confirm', code: result.code, claim: result.claim });
          return;
        case 'locked':
          setLockRemainingMs(result.remainingMs);
          setPhase({ kind: 'enter' });
          setNotice({ message: result.message, retry: false });
          return;
        case 'not_reachable':
          setPhase({ kind: 'enter' });
          setNotice({ message: result.message, retry: true });
          return;
        case 'invalid_code':
        case 'phone_not_ready':
        case 'refused':
          // The code stays in the field (R2.7, R2.14) so the worker can fix it or retry later.
          setPhase({ kind: 'enter' });
          setNotice({ message: result.message, retry: false });
          return;
      }
    },
    [flow, phase.kind],
  );

  const onScanned = useCallback(
    (payload: string) => {
      const code = flow.parseCode(payload);
      if (code) {
        setTyped(code);
      }
      void submit(payload);
    },
    [flow, submit],
  );

  async function declineIdentity(claimToken: string) {
    setPhase({ kind: 'busy' });
    await flow.decline(claimToken);
    setTyped('');
    setNotice(null);
    setPhase({ kind: 'enter' });
  }

  if (phase.kind === 'confirm') {
    const { claim, code } = phase;
    return (
      <ScreenFrame title="Is this you?">
        <View style={styles.names}>
          <Text style={styles.nameLabel}>Shop</Text>
          <Text style={styles.name}>{claim.shopName}</Text>
          <Text style={styles.nameLabel}>Employee</Text>
          <Text style={styles.name}>{claim.employeeName}</Text>
        </View>
        <BigButton
          label="Yes, this is me"
          onPress={() =>
            onIdentityConfirmed({
              mode: 'pairing',
              claimToken: claim.claimToken,
              code,
              consent: claim.consent,
              shopName: claim.shopName,
              employeeName: claim.employeeName,
            })
          }
        />
        <BigButton
          label="No, this isn't me"
          variant="secondary"
          onPress={() => {
            void declineIdentity(claim.claimToken);
          }}
        />
      </ScreenFrame>
    );
  }

  const busy = phase.kind === 'busy';
  const noticeText = locked ? lockoutCountdown(lockRemainingMs) : notice?.message;
  const canSubmit = !busy && !locked && normalisePairingCode(typed).length > 0;

  return (
    <ScreenFrame title="Pair this phone" busy={busy}>
      <Text style={styles.hint}>
        Scan the QR code your manager shows you, or type the 8 characters under it.
      </Text>
      {showScanner ? <QrScanner onScanned={onScanned} paused={busy || locked} /> : null}
      <TextInput
        accessibilityLabel="Pairing code"
        placeholder="8 characters"
        value={typed}
        onChangeText={setTyped}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={INPUT_MAX_LENGTH}
        editable={!busy && !locked}
        returnKeyType="go"
        onSubmitEditing={() => {
          if (canSubmit) {
            void submit(typed);
          }
        }}
        style={styles.input}
        testID="pairing-code"
      />
      {noticeText ? <NoticeBox message={noticeText} tone={locked ? 'info' : 'error'} /> : null}
      <BigButton
        label={notice?.retry ? 'Retry' : 'Continue'}
        disabled={!canSubmit}
        onPress={() => {
          void submit(typed);
        }}
      />
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 16, lineHeight: 22, color: '#374151' },
  input: {
    minHeight: 56,
    borderWidth: 2,
    borderColor: '#9ca3af',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    letterSpacing: 4,
    textAlign: 'center',
    color: '#111827',
  },
  names: { gap: 4 },
  nameLabel: { fontSize: 13, color: '#6b7280', textTransform: 'uppercase' },
  name: { fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 8 },
});
