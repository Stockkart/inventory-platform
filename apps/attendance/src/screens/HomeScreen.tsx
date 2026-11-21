/**
 * `HomeScreen`: the punch screen (R4.1). One big button labelled **Check in** or **Check out**,
 * the employee's name, the shop name, today's date (Asia/Kolkata) and today's in / out times; the
 * only other tappable controls are the links to History and Settings (R4.11) and, while a refused
 * offline punch waits for acknowledgement, its OK button (R6.13).
 *
 * The label and today's times come from `GET /me` on every focus of the screen and after every
 * punch (R4.1a–b); the phone never works the label out itself while online. Each `/me` answer also
 * refreshes the stored Location check settings (R9.3), which `PunchFlow` reads at the next tap.
 *
 * Offline (R6): the screen subscribes to the sync worker's {@link QueueState}. While at least one
 * saved punch is waiting, the label comes from the newest queued punch (**Check out** after an
 * `IN`, **Check in** after an `OUT`, R6.4) rather than from the server; "N punches waiting to be
 * sent" is shown from the same state, which the worker publishes on every save, send and refusal
 * (R6.16); each refused queued punch is shown as a card with its date, time, direction and the
 * server's message until the worker taps OK, which deletes it (R6.13–R6.14). When `/me` itself is
 * not reachable the screen keeps the last answer it has (or, on a cold start with nothing known,
 * **Check in**: the My HR rule for "no counted punch known") and still offers the button, since a
 * tap then saves the punch on the phone (R6.2); a short notice says so.
 *
 * A tap runs {@link PunchFlow.run} and shows its outcome inline: the confirmation lines (R4.7,
 * R4.8), a refusal word for word (R4.3, R7.10), the R5.5 sentence after a failed biometric check
 * with the screen otherwise unchanged (R4.2d), or `SAVED_OFFLINE` when the punch was queued (R6.3).
 * `HR_APP_NOT_PAIRED`, from `/me` or from a punch, wipes the phone and hands over to the pairing
 * screen (R3.2–R3.3).
 *
 * Everything the screen needs is injected through {@link HomeScreenDeps}; `RootNavigator` wires the
 * real client, store, flow and sync worker, tests pass fakes.
 */
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { waitingToSendLine } from '@inventory-platform/attendance-protocol';
import type { AppStatusResponse, PunchDirection } from '@inventory-platform/attendance-protocol';

import { isNotReachable, isServerRefusal } from '../api/appClient';
import { kolkataTime, parseInstant } from '../history/kolkataDates';
import { displayDate, kolkataDate, punchButtonLabel } from '../punch/kolkata';
import type { PunchFlow, PunchResult } from '../punch/PunchFlow';
import type { QueuedPunch } from '../queue/PunchQueue';
import type { QueueState, Unsubscribe } from '../queue/SyncWorker';
import type { BiometricSignerErrorCode } from '../signer/BiometricSigner';
import type { PairingRecord, PairingStore } from '../state/pairingStore';

/** The slice of `AppClient` the screen calls. */
export interface StatusClient {
  getMe(): Promise<AppStatusResponse>;
}

/** The slice of the sync supervisor / worker the screen uses (R6.4, R6.13, R6.14, R6.16). */
export interface HomeSync {
  /** Called at once with the current state, then on every change. */
  subscribe(listener: (state: QueueState) => void): Unsubscribe;
  /** The worker tapped OK on a refusal card: the refused punch is deleted (R6.14). */
  dismissRefused(punchId: string): Promise<boolean>;
}

export interface HomeScreenDeps {
  client: StatusClient;
  pairingStore: Pick<PairingStore, 'load' | 'updateLocation' | 'wipe'>;
  punchFlow: Pick<PunchFlow, 'run'>;
  sync: HomeSync;
  /** Phone clock in epoch milliseconds, for the date shown while the server has not answered. */
  clock?: () => number;
}

export interface HomeScreenProps {
  deps: HomeScreenDeps;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  /** The pairing has ended and the phone is already wiped (R3.3): show the pairing screen. */
  onUnpaired: () => void;
  /** The signer failed outside the biometric check (`KEY_INVALIDATED`, `NO_KEYS`); the caller wipes. */
  onSignerError?: (code: BiometricSignerErrorCode, message: string) => void;
}

/** What the notice area shows after a tap or a failed refresh. */
export interface Notice {
  tone: 'ok' | 'error' | 'info';
  lines: string[];
}

/** Shown when `/me` could not reach the server: the button still works, offline (R6.1–R6.2). */
export const OFFLINE_NOTICE =
  'The server could not be reached. A check-in now is saved on your phone and sent when you have network.';

/** The OK button of a refusal card (R6.13–R6.14). */
export const REFUSAL_OK = 'OK';

const EMPTY_QUEUE: QueueState = { waiting: 0, refused: [], newestDirection: null };

/**
 * The direction the next tap would have (R4.1a, R6.4): while saved punches wait, the opposite of
 * the newest queued punch's guess; otherwise the server's `nextDirection`; with nothing known,
 * `IN` (no counted punch known today). Pure, for tests.
 */
export function nextDirectionFor(
  queue: Pick<QueueState, 'waiting' | 'newestDirection'>,
  status: Pick<AppStatusResponse, 'nextDirection'> | null,
): PunchDirection {
  if (queue.waiting > 0 && queue.newestDirection) {
    return queue.newestDirection === 'IN' ? 'OUT' : 'IN';
  }
  return status?.nextDirection ?? 'IN';
}

export function HomeScreen({
  deps,
  onOpenHistory,
  onOpenSettings,
  onUnpaired,
  onSignerError,
}: HomeScreenProps) {
  const [status, setStatus] = useState<AppStatusResponse | null>(null);
  const [stored, setStored] = useState<PairingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [queue, setQueue] = useState<QueueState>(EMPTY_QUEUE);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // R6.4, R6.13, R6.16: the queue state, as the sync worker publishes it.
  useEffect(() => deps.sync.subscribe(setQueue), [deps.sync]);

  const handleUnpaired = useCallback(async () => {
    try {
      await deps.pairingStore.wipe();
    } finally {
      onUnpaired();
    }
  }, [deps.pairingStore, onUnpaired]);

  /** R4.1b: `GET /me` for the label and today's times. */
  const refresh = useCallback(async () => {
    try {
      const me = await deps.client.getMe();
      if (!mounted.current) {
        return;
      }
      setStatus(me);
      setLoading(false);
      setNotice((current) => (current?.tone === 'info' ? null : current));
      try {
        await deps.pairingStore.updateLocation(me.location);
      } catch {
        // The stored settings are a convenience for the next tap; the answer itself is what counts.
      }
    } catch (error) {
      if (isServerRefusal(error) && error.notPaired) {
        await handleUnpaired();
        return;
      }
      const record = await deps.pairingStore.load();
      if (!mounted.current) {
        return;
      }
      setStored(record);
      setLoading(false);
      setNotice(
        isNotReachable(error)
          ? { tone: 'info', lines: [OFFLINE_NOTICE] }
          : { tone: 'error', lines: splitLines(messageOf(error)) },
      );
    }
  }, [deps.client, deps.pairingStore, handleUnpaired]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const direction = nextDirectionFor(queue, status);

  const onPunch = useCallback(async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      const result = await deps.punchFlow.run({ directionGuess: direction });
      if (!mounted.current) {
        return;
      }
      await applyResult(result);
    } catch (error) {
      if (mounted.current) {
        setNotice({ tone: 'error', lines: splitLines(messageOf(error)) });
      }
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }

    async function applyResult(result: PunchResult): Promise<void> {
      switch (result.kind) {
        case 'stored':
          setNotice({ tone: 'ok', lines: result.lines });
          setStatus((current) =>
            current == null
              ? current
              : {
                  ...current,
                  todayIn: result.response.todayIn,
                  todayOut: result.response.todayOut,
                  nextDirection: result.response.nextDirection,
                },
          );
          await refresh();
          return;
        case 'queued':
          // R6.3; the label and the waiting line follow from the worker's published state (R6.4,
          // R6.16). No `/me` read: the server was just found not reachable.
          setNotice({ tone: 'info', lines: [result.message] });
          return;
        case 'refused':
        case 'biometric_required':
          setNotice({ tone: 'error', lines: splitLines(result.message) });
          return;
        case 'signer_error':
          setNotice({ tone: 'error', lines: splitLines(result.message) });
          onSignerError?.(result.code, result.message);
          return;
        case 'unpaired':
          // PunchFlow has already wiped the phone.
          onUnpaired();
          return;
      }
    }
  }, [busy, direction, deps.punchFlow, refresh, onSignerError, onUnpaired]);

  const dismiss = useCallback(
    (punchId: string) => {
      void deps.sync.dismissRefused(punchId).catch(() => undefined);
    },
    [deps.sync],
  );

  const employeeName = status?.employeeName ?? stored?.employeeName ?? '';
  const shopName = status?.shopName ?? stored?.shopName ?? '';
  const today = status?.today ?? kolkataDate(new Date((deps.clock ?? Date.now)()));
  const label = punchButtonLabel(direction);
  const waitingLine = waitingToSendLine(queue.waiting);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.employee} accessibilityRole="header">
          {employeeName}
        </Text>
        <Text style={styles.shop}>{shopName}</Text>
        <Text style={styles.date}>{displayDate(today)}</Text>
      </View>

      <View style={styles.times}>
        <TimeRow label="Check-in" value={status?.todayIn ?? null} />
        <TimeRow label="Check-out" value={status?.todayOut ?? null} />
      </View>

      <View style={styles.action}>
        {loading && status == null ? (
          <ActivityIndicator accessibilityLabel="Loading" />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => void onPunch()}
            style={[styles.punchButton, busy && styles.punchButtonBusy]}
            testID="punch-button"
          >
            <Text style={styles.punchLabel}>{label}</Text>
          </Pressable>
        )}
        {status && !status.canPunch && status.reason ? (
          <Text style={styles.reason}>{status.reason}</Text>
        ) : null}
        {waitingLine ? (
          <Text style={styles.waiting} testID="waiting-line">
            {waitingLine}
          </Text>
        ) : null}
      </View>

      <ScrollView style={styles.noticeArea} contentContainerStyle={styles.noticeContent}>
        {queue.refused.map((punch) => (
          <RefusalCard key={punch.punchId} punch={punch} onDismiss={dismiss} />
        ))}
        {notice
          ? notice.lines.map((line, index) => (
              <Text
                key={`${index}-${line}`}
                style={[
                  styles.noticeLine,
                  notice.tone === 'ok' && styles.noticeOk,
                  notice.tone === 'error' && styles.noticeError,
                ]}
                testID={`notice-line-${index}`}
              >
                {line}
              </Text>
            ))
          : null}
      </ScrollView>

      <View style={styles.nav}>
        <Pressable accessibilityRole="link" onPress={onOpenHistory} style={styles.navLink}>
          <Text style={styles.navText}>History</Text>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={onOpenSettings} style={styles.navLink}>
          <Text style={styles.navText}>Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * One refused saved punch (R6.13): its date, time and direction as the phone recorded them, the
 * server's refusal word for word, and OK, which deletes it (R6.14).
 */
export function RefusalCard({
  punch,
  onDismiss,
}: {
  punch: QueuedPunch;
  onDismiss: (punchId: string) => void;
}) {
  return (
    <View style={styles.card} testID={`refused-${punch.punchId}`}>
      <Text style={styles.cardHead}>{refusalHeading(punch)}</Text>
      <Text style={styles.cardMessage}>{punch.refusalMessage ?? ''}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={REFUSAL_OK}
        onPress={() => onDismiss(punch.punchId)}
        style={styles.cardButton}
        testID={`refused-ok-${punch.punchId}`}
      >
        <Text style={styles.cardButtonLabel}>{REFUSAL_OK}</Text>
      </Pressable>
    </View>
  );
}

/** "Thu, 3 Apr 2025 · 09:12 · Check in" from the phone's recorded time and guessed direction. */
export function refusalHeading(punch: Pick<QueuedPunch, 'phoneTime' | 'directionGuess'>): string {
  const ms = parseInstant(punch.phoneTime);
  const when =
    ms === null
      ? punch.phoneTime
      : `${displayDate(kolkataDate(new Date(ms)))} · ${kolkataTime(ms)}`;
  return `${when} · ${punchButtonLabel(punch.directionGuess)}`;
}

function TimeRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={styles.timeRow}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={styles.timeValue}>{value ?? '—'}</Text>
    </View>
  );
}

function splitLines(message: string): string[] {
  return message
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Something went wrong. Try again.';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 24, paddingTop: 24 },
  header: { alignItems: 'center', marginBottom: 16 },
  employee: { fontSize: 22, fontWeight: '600', color: '#111111' },
  shop: { fontSize: 16, color: '#555555', marginTop: 4 },
  date: { fontSize: 14, color: '#777777', marginTop: 8 },
  times: { marginBottom: 24 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  timeLabel: { fontSize: 16, color: '#555555' },
  timeValue: { fontSize: 16, color: '#111111', fontVariant: ['tabular-nums'] },
  action: { alignItems: 'center', marginBottom: 16 },
  punchButton: {
    width: '80%',
    paddingVertical: 28,
    borderRadius: 16,
    backgroundColor: '#1f6feb',
    alignItems: 'center',
  },
  punchButtonBusy: { opacity: 0.6 },
  punchLabel: { color: '#ffffff', fontSize: 24, fontWeight: '700' },
  reason: { marginTop: 12, fontSize: 14, color: '#8a4b00', textAlign: 'center' },
  waiting: { marginTop: 12, fontSize: 14, color: '#555555', textAlign: 'center' },
  noticeArea: { flex: 1 },
  noticeContent: { paddingVertical: 8 },
  noticeLine: { fontSize: 16, color: '#333333', marginBottom: 6 },
  noticeOk: { color: '#1a7f37' },
  noticeError: { color: '#b42318' },
  card: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff4f2',
    marginBottom: 12,
  },
  cardHead: { fontSize: 14, color: '#555555' },
  cardMessage: { fontSize: 16, color: '#b42318', marginTop: 4 },
  cardButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#eeeeee',
  },
  cardButtonLabel: { fontSize: 16, color: '#111111', fontWeight: '600' },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#dddddd',
  },
  navLink: { paddingHorizontal: 16, paddingVertical: 8 },
  navText: { fontSize: 16, color: '#1f6feb' },
});
