/**
 * `HistoryScreen`: the worker's own punches of the last 31 calendar days including today
 * (Asia/Kolkata), newest first (R4.10). Each row shows the date, the time (`HH:mm`), the direction
 * and every flag as a plain sentence (`flagSentence`). Refused punches never appear (the server
 * stores none), and another employee's punches are never requested (R8.9).
 *
 * The list is read from the server every time the screen is opened or returned to (R4.10) through
 * {@link loadHistory}, which also replaces the SQLite display cache ({@link HistoryCache}, R9.3).
 * When the server is not reachable the cached copy is shown with a notice; it is display only and
 * never changes what the server holds.
 *
 * `HR_APP_NOT_PAIRED`, a missing pairing or an invalidated key wipes the phone and hands over to
 * the pairing screen (R3.2–R3.3, R5.9) through `onUnpaired`, like every other screen.
 *
 * Dependencies are injected ({@link HistoryScreenDeps}); `RootNavigator` wires the real client,
 * cache and store, tests pass fakes over `MemoryDatabase`.
 */
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NO_PUNCHES_IN_HISTORY, flagSentence } from '@inventory-platform/attendance-protocol';

import type { HistoryCache, HistoryEntry } from '../history/HistoryCache';
import { loadHistory, type HistoryClient, type HistoryLoad } from '../history/loadHistory';
import { displayDate, punchButtonLabel } from '../punch/kolkata';
import type { PairingStore } from '../state/pairingStore';

export interface HistoryScreenDeps {
  client: HistoryClient;
  cache: HistoryCache;
  pairingStore: Pick<PairingStore, 'wipe'>;
  /** Phone clock in epoch milliseconds; `Date.now` on the phone. */
  clock?: () => number;
}

export interface HistoryScreenProps {
  deps: HistoryScreenDeps;
  /** The pairing has ended and the phone is already wiped (R3.3): show the pairing screen. */
  onUnpaired: () => void;
}

/** Shown above the cached list when the server could not be reached (R6.1). */
export const HISTORY_FROM_CACHE =
  'The server could not be reached. Showing the punches saved on this phone.';

/** Shown under a duplicate punch (R4.8): kept in the list, greyed, not counted. */
export const DUPLICATE_PUNCH = 'Duplicate of an earlier punch';

type Shown =
  | { phase: 'loading' }
  | { phase: 'list'; entries: HistoryEntry[]; notice: string | null }
  | { phase: 'error'; message: string };

export function HistoryScreen({ deps, onUnpaired }: HistoryScreenProps) {
  const [shown, setShown] = useState<Shown>({ phase: 'loading' });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    let load: HistoryLoad;
    try {
      load = await loadHistory({
        client: deps.client,
        cache: deps.cache,
        ...(deps.clock ? { now: deps.clock } : {}),
      });
    } catch (error) {
      if (mounted.current) {
        setShown({ phase: 'error', message: messageOf(error) });
      }
      return;
    }
    if (load.kind === 'not_paired') {
      try {
        await deps.pairingStore.wipe();
      } finally {
        onUnpaired();
      }
      return;
    }
    if (!mounted.current) {
      return;
    }
    switch (load.kind) {
      case 'server':
        setShown({ phase: 'list', entries: load.entries, notice: null });
        return;
      case 'cache':
        setShown({ phase: 'list', entries: load.entries, notice: HISTORY_FROM_CACHE });
        return;
      case 'refused':
        setShown({ phase: 'list', entries: load.entries, notice: load.message });
        return;
    }
  }, [deps.client, deps.cache, deps.clock, deps.pairingStore, onUnpaired]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (shown.phase === 'loading') {
    return (
      <View style={styles.centre}>
        <ActivityIndicator accessibilityLabel="Loading" />
      </View>
    );
  }

  if (shown.phase === 'error') {
    return (
      <View style={styles.centre}>
        <Text style={styles.error} testID="history-error">
          {shown.message}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} testID="history-list">
      {shown.notice ? (
        <Text style={styles.notice} testID="history-notice">
          {shown.notice}
        </Text>
      ) : null}
      {shown.entries.length === 0 ? (
        <Text style={styles.empty} testID="history-empty">
          {NO_PUNCHES_IN_HISTORY}
        </Text>
      ) : (
        shown.entries.map((entry) => <HistoryRow key={entry.punchId} entry={entry} />)
      )}
    </ScrollView>
  );
}

/** One punch: date, time, direction, flags (R4.10). */
export function HistoryRow({ entry }: { entry: HistoryEntry }) {
  return (
    <View
      style={[styles.row, !entry.counted && styles.rowDuplicate]}
      testID={`history-row-${entry.punchId}`}
      accessibilityLabel={`${displayDate(entry.localDate)} ${entry.localTime} ${directionWords(
        entry.direction,
      )}`}
    >
      <View style={styles.rowHead}>
        <Text style={styles.date}>{displayDate(entry.localDate)}</Text>
        <Text style={styles.time}>{entry.localTime}</Text>
      </View>
      <Text style={styles.direction}>{directionWords(entry.direction)}</Text>
      {entry.flags.map((flag) => (
        <Text key={flag} style={styles.flag}>
          {flagSentence(flag)}
        </Text>
      ))}
      {!entry.counted ? <Text style={styles.duplicate}>{DUPLICATE_PUNCH}</Text> : null}
    </View>
  );
}

/** "Check in" / "Check out" for a punch direction, the same words as the home button (R4.1). */
export function directionWords(direction: HistoryEntry['direction']): 'Check in' | 'Check out' {
  return punchButtonLabel(direction);
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Something went wrong. Try again.';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingHorizontal: 16, paddingVertical: 12 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  notice: { fontSize: 14, color: '#8a4b00', marginBottom: 12 },
  empty: { fontSize: 16, color: '#555555', textAlign: 'center', marginTop: 32 },
  error: { fontSize: 16, color: '#b42318', textAlign: 'center', paddingHorizontal: 24 },
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dddddd',
  },
  rowDuplicate: { opacity: 0.5 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between' },
  date: { fontSize: 14, color: '#555555' },
  time: { fontSize: 16, color: '#111111', fontVariant: ['tabular-nums'] },
  direction: { fontSize: 16, color: '#111111', marginTop: 2 },
  flag: { fontSize: 14, color: '#8a4b00', marginTop: 4 },
  duplicate: { fontSize: 14, color: '#777777', marginTop: 4 },
});
