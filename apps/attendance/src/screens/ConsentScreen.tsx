/**
 * Consent screen (R2.8, R2.9, R9.13). Two modes behind one route:
 *
 * - `pairing`: reached from `PairScreen` after "Yes, this is me". Shows the consent version the
 *   server returned on `claim` as three plain-word lists. "I agree" → `PairingFlow.agree()`
 *   (keys in secure hardware → `complete` → `pairingStore.save()`) → confirmation with the shop
 *   and employee name → `onPaired`. "Don't agree" → `PairingFlow.decline()` (the code is
 *   invalidated) → `onDeclined`.
 * - `reconsent` (task 13.3): the app opens this screen first when `GET /me` reports a newer
 *   `RECONSENT_REQUIRED` version. "I agree" → `onAgreeReconsent(version)` (the caller posts
 *   `/consent` and updates the stored version); "Don't agree" → `onDeclineReconsent`. This screen
 *   decides nothing in that mode beyond showing the text.
 *
 * Route name and params are exported for the navigator (task 13.2):
 *
 * ```tsx
 * <Stack.Screen name={CONSENT_ROUTE}>
 *   {({ route, navigation }) => (
 *     <ConsentScreen
 *       params={route.params}
 *       flow={pairingFlow}
 *       onPaired={() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] })}
 *       onDeclined={() => navigation.popToTop()}
 *       onAgreeReconsent={...}
 *     />
 *   )}
 * </Stack.Screen>
 * ```
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ConsentVersion, PairingBootstrap } from '@inventory-platform/attendance-protocol';

import type { AgreeResult, PairingFlow } from '../pairing/PairingFlow';
import { BigButton, NoticeBox, ScreenFrame, SentenceList } from './PairingWidgets';

/** Route name in the root stack. */
export const CONSENT_ROUTE = 'Consent' as const;

/** Params of the `Consent` route. */
export type ConsentRouteParams =
  | {
      mode: 'pairing';
      claimToken: string;
      /** The normalised code the claim was made with; kept so a refusal can name the problem. */
      code: string;
      consent: ConsentVersion;
      shopName: string;
      employeeName: string;
    }
  | {
      mode: 'reconsent';
      consent: ConsentVersion;
    };

export const CONSENT_HEADINGS = {
  recorded: 'What is recorded',
  neverRecorded: 'What is never recorded',
  visibility: 'Who can see it',
} as const;

/** R2.9: the confirmation screen's title. */
export const PAIRED_TITLE = 'This phone is paired';

interface ConsentScreenProps {
  params: ConsentRouteParams;
  /** Needed in `pairing` mode; may be omitted in `reconsent` mode. */
  flow?: PairingFlow;
  /** `pairing` mode: "Continue" on the confirmation screen. */
  onPaired?: (pairing: PairingBootstrap) => void;
  /** `pairing` mode: "Don't agree", or "Back" after a refusal; the caller returns to `Pair`. */
  onDeclined?: () => void;
  /** `reconsent` mode (task 13.3): post `/consent` for `version`. Rejections are shown as a notice. */
  onAgreeReconsent?: (version: number) => Promise<void>;
  /** `reconsent` mode (task 13.3): "Don't agree". */
  onDeclineReconsent?: () => void;
}

type Phase =
  | { kind: 'consent'; notice: string | null; retry: boolean }
  | { kind: 'busy' }
  | { kind: 'paired'; pairing: PairingBootstrap }
  /** The pairing cannot go on (code expired, phone not fit); only "Back" remains. */
  | { kind: 'stopped'; message: string };

export function ConsentScreen({
  params,
  flow,
  onPaired,
  onDeclined,
  onAgreeReconsent,
  onDeclineReconsent,
}: ConsentScreenProps) {
  const [phase, setPhase] = useState<Phase>({ kind: 'consent', notice: null, retry: false });
  const consent = params.consent;

  async function agree() {
    setPhase({ kind: 'busy' });
    if (params.mode === 'reconsent') {
      // ---- re-consent seam (task 13.3): the caller posts /consent and moves on. ----
      try {
        await onAgreeReconsent?.(consent.version);
      } catch (error) {
        setPhase({
          kind: 'consent',
          notice:
            error instanceof Error && error.message ? error.message : 'Could not save. Try again.',
          retry: true,
        });
      }
      return;
    }
    if (!flow) {
      throw new Error('ConsentScreen in pairing mode needs a PairingFlow');
    }
    const result: AgreeResult = await flow.agree(params.claimToken, consent.version);
    switch (result.kind) {
      case 'paired':
        setPhase({ kind: 'paired', pairing: result.pairing });
        return;
      case 'not_reachable':
        setPhase({ kind: 'consent', notice: result.message, retry: true });
        return;
      case 'phone_not_ready':
      case 'refused':
        setPhase({ kind: 'stopped', message: result.message });
        return;
    }
  }

  async function decline() {
    if (params.mode === 'reconsent') {
      onDeclineReconsent?.();
      return;
    }
    setPhase({ kind: 'busy' });
    await flow?.decline(params.claimToken);
    onDeclined?.();
  }

  if (phase.kind === 'paired') {
    const { pairing } = phase;
    return (
      <ScreenFrame title={PAIRED_TITLE}>
        <View style={styles.names}>
          <Text style={styles.nameLabel}>Shop</Text>
          <Text style={styles.name}>{pairing.shopName}</Text>
          <Text style={styles.nameLabel}>Employee</Text>
          <Text style={styles.name}>{pairing.employeeName}</Text>
        </View>
        <Text style={styles.hint}>
          Open the app near the shop and tap the button to check in or out.
        </Text>
        <BigButton label="Continue" onPress={() => onPaired?.(pairing)} />
      </ScreenFrame>
    );
  }

  if (phase.kind === 'stopped') {
    return (
      <ScreenFrame title="Pairing stopped">
        <NoticeBox message={phase.message} />
        <BigButton label="Back" variant="secondary" onPress={() => onDeclined?.()} />
      </ScreenFrame>
    );
  }

  const busy = phase.kind === 'busy';
  const notice = phase.kind === 'consent' ? phase.notice : null;
  const retry = phase.kind === 'consent' && phase.retry;

  return (
    <ScreenFrame
      title={params.mode === 'pairing' ? 'Before we pair this phone' : 'Updated consent'}
      busy={busy}
    >
      {params.mode === 'pairing' ? (
        <Text style={styles.hint}>
          {`${params.employeeName} at ${params.shopName}. Please read, then choose.`}
        </Text>
      ) : (
        <Text style={styles.hint}>
          The consent text has changed. Please read it again before your next check-in.
        </Text>
      )}
      <SentenceList heading={CONSENT_HEADINGS.recorded} sentences={consent.recorded} />
      <SentenceList heading={CONSENT_HEADINGS.neverRecorded} sentences={consent.neverRecorded} />
      <SentenceList heading={CONSENT_HEADINGS.visibility} sentences={consent.visibility} />
      {notice ? <NoticeBox message={notice} /> : null}
      <BigButton
        label={retry ? 'Retry' : 'I agree'}
        disabled={busy}
        onPress={() => {
          void agree();
        }}
      />
      <BigButton
        label="Don't agree"
        variant="secondary"
        disabled={busy}
        onPress={() => {
          void decline();
        }}
      />
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 16, lineHeight: 22, color: '#374151' },
  names: { gap: 4 },
  nameLabel: { fontSize: 13, color: '#6b7280', textTransform: 'uppercase' },
  name: { fontSize: 20, fontWeight: '600', color: '#111827', marginBottom: 8 },
});
