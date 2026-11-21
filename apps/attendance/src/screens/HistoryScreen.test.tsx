import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  KEY_INVALIDATED,
  NO_PUNCHES_IN_HISTORY,
  SERVER_MESSAGES,
  flagSentence,
} from '@inventory-platform/attendance-protocol';
import type { PunchResponse } from '@inventory-platform/attendance-protocol';

import { NotReachable, ServerRefusal } from '../api/appClient';
import { HistoryCache } from '../history/HistoryCache';
import { MemoryDatabase } from '../queue/memoryDb';
import { BiometricSignerError } from '../signer/BiometricSigner';
import { DUPLICATE_PUNCH, HISTORY_FROM_CACHE, HistoryScreen } from './HistoryScreen';

// jsdom with `react-native` aliased to DOM elements (vite.config.mts). The focus hook is an effect
// that runs once on mount, which is what a focused screen does.
vi.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    useEffect(() => effect(), [effect]);
  },
}));

// 2025-04-03 09:12 IST
const NOW = Date.UTC(2025, 3, 3, 3, 42, 0);

function punch(id: string, at: string, extra: Partial<PunchResponse> = {}): PunchResponse {
  return {
    id,
    employeeId: '5f1a2b3c4d5e6f7081920002',
    at,
    source: 'BIOMETRIC_APP',
    direction: 'IN',
    flags: [],
    counted: true,
    ...extra,
  };
}

function harness(answers: Array<PunchResponse[] | Error>) {
  const getPunches = vi.fn(async (_from: string, _to: string) => {
    const next = answers.shift();
    if (next === undefined) {
      throw new Error('no scripted answer');
    }
    if (next instanceof Error) {
      throw next;
    }
    return next;
  });
  const cache = new HistoryCache(new MemoryDatabase(), { now: () => NOW });
  const wipe = vi.fn(async () => undefined);
  const onUnpaired = vi.fn();
  const deps = { client: { getPunches }, cache, pairingStore: { wipe }, clock: () => NOW };
  return { deps, getPunches, cache, wipe, onUnpaired };
}

afterEach(cleanup);

describe('HistoryScreen', () => {
  it('lists the last 31 days newest first with date, time, direction and flags in plain words (R4.10)', async () => {
    const h = harness([
      [
        punch('a', '2025-04-01T04:05:00Z'),
        punch('b', '2025-04-03T03:40:00Z', {
          direction: 'OUT',
          flags: ['OUTSIDE_SHOP', 'RECORDED_OFFLINE'],
        }),
        punch('c', '2025-04-03T03:38:00Z', { counted: false }),
      ],
    ]);
    render(<HistoryScreen deps={h.deps} onUnpaired={h.onUnpaired} />);

    const list = await screen.findByTestId('history-list');
    expect(h.getPunches).toHaveBeenCalledWith('2025-03-04', '2025-04-03');

    const rows = list.querySelectorAll('[data-testid^="history-row-"]');
    expect(Array.from(rows).map((row) => row.getAttribute('data-testid'))).toEqual([
      'history-row-b',
      'history-row-c',
      'history-row-a',
    ]);
    expect(rows[0].textContent).toContain('Thu, 3 Apr 2025');
    expect(rows[0].textContent).toContain('09:10');
    expect(rows[0].textContent).toContain('Check out');
    expect(rows[0].textContent).toContain(flagSentence('OUTSIDE_SHOP'));
    expect(rows[0].textContent).toContain('Recorded offline — your manager will see this');
    expect(rows[1].textContent).toContain(DUPLICATE_PUNCH);
    expect(rows[2].textContent).toContain('Tue, 1 Apr 2025');
    expect(rows[2].textContent).toContain('09:35');
    expect(rows[2].textContent).toContain('Check in');
    expect(screen.queryByTestId('history-notice')).toBeNull();
    expect(screen.queryByTestId('history-empty')).toBeNull();
  });

  it('shows one line when there are no punches in the window', async () => {
    const h = harness([[]]);
    render(<HistoryScreen deps={h.deps} onUnpaired={h.onUnpaired} />);
    expect((await screen.findByTestId('history-empty')).textContent).toBe(NO_PUNCHES_IN_HISTORY);
  });

  it('when the server is not reachable it shows the cached copy with a notice', async () => {
    const h = harness([new NotReachable('TIMEOUT')]);
    await h.cache.replaceAll(
      [
        {
          punchId: 'cached',
          atMs: Date.UTC(2025, 3, 2, 4, 0, 0),
          localDate: '2025-04-02',
          localTime: '09:30',
          direction: 'IN',
          flags: [],
          counted: true,
        },
      ],
      '2025-03-04',
    );
    render(<HistoryScreen deps={h.deps} onUnpaired={h.onUnpaired} />);

    expect((await screen.findByTestId('history-notice')).textContent).toBe(HISTORY_FROM_CACHE);
    expect(screen.getByTestId('history-row-cached').textContent).toContain('Wed, 2 Apr 2025');
    expect(h.wipe).not.toHaveBeenCalled();
  });

  it('a refusal other than not-paired is shown word for word above the cached list', async () => {
    const h = harness([new ServerRefusal(429, SERVER_MESSAGES.HR_TOO_MANY_ATTEMPTS)]);
    render(<HistoryScreen deps={h.deps} onUnpaired={h.onUnpaired} />);
    expect((await screen.findByTestId('history-notice')).textContent).toBe(
      SERVER_MESSAGES.HR_TOO_MANY_ATTEMPTS,
    );
    expect(screen.getByTestId('history-empty')).toBeTruthy();
  });

  it('HR_APP_NOT_PAIRED wipes the phone and hands over to the pairing screen (R3.2–R3.3)', async () => {
    const h = harness([new ServerRefusal(403, SERVER_MESSAGES.HR_APP_NOT_PAIRED)]);
    render(<HistoryScreen deps={h.deps} onUnpaired={h.onUnpaired} />);
    await waitFor(() => expect(h.onUnpaired).toHaveBeenCalledTimes(1));
    expect(h.wipe).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('history-list')).toBeNull();
  });

  it('an invalidated key wipes the phone too', async () => {
    const h = harness([new BiometricSignerError('KEY_INVALIDATED')]);
    render(<HistoryScreen deps={h.deps} onUnpaired={h.onUnpaired} />);
    await waitFor(() => expect(h.onUnpaired).toHaveBeenCalledTimes(1));
    expect(h.wipe).toHaveBeenCalledTimes(1);
    expect(KEY_INVALIDATED).toContain('paired again');
  });

  it('an unexpected error is shown rather than swallowed', async () => {
    const h = harness([new TypeError('boom')]);
    render(<HistoryScreen deps={h.deps} onUnpaired={h.onUnpaired} />);
    expect((await screen.findByTestId('history-error')).textContent).toBe('boom');
  });
});
