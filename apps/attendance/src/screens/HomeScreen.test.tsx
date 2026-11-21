import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';

import {
  BIOMETRIC_REQUIRED,
  DUPLICATE_SENTENCE,
  KEY_INVALIDATED,
  SAVED_OFFLINE,
  flagSentence,
} from '@inventory-platform/attendance-protocol';
import type { AppStatusResponse, PairingBootstrap } from '@inventory-platform/attendance-protocol';

import { NotReachable, ServerRefusal } from '../api/appClient';
import type { PunchContext, PunchResult } from '../punch/PunchFlow';
import type { QueuedPunch } from '../queue/PunchQueue';
import type { QueueState } from '../queue/SyncWorker';
import type { BiometricSignerErrorCode } from '../signer/BiometricSigner';
import {
  HomeScreen,
  OFFLINE_NOTICE,
  REFUSAL_OK,
  nextDirectionFor,
  refusalHeading,
  type HomeScreenDeps,
} from './HomeScreen';

// The screen runs in jsdom with `react-native` aliased to DOM elements (vite.config.mts). The
// navigator's focus hook is the one piece of react-navigation the screen touches: here it is an
// effect that runs once on mount, which is what a focused screen does, and `refocus()` runs it
// again the way the navigator does when the worker comes back from History or Settings (R4.1b).
const focus = vi.hoisted(() => ({ effect: null as (() => void | (() => void)) | null }));
vi.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    focus.effect = effect;
    useEffect(() => effect(), [effect]);
  },
}));

function refocus(): void {
  act(() => {
    focus.effect?.();
  });
}

const RECORD: PairingBootstrap = {
  pairingId: '66f1a2b3c4d5e6f708192a3b',
  shopId: '5f1a2b3c4d5e6f7081920001',
  employeeId: '5f1a2b3c4d5e6f7081920002',
  employeeName: 'Ravi Kumar',
  shopName: 'Sharma Stores',
  location: { locationCheck: false },
  consentVersion: 1,
};

const ME: AppStatusResponse = {
  employeeName: 'Ravi Kumar',
  shopName: 'Sharma Stores',
  today: '2025-04-03',
  biometricApp: true,
  canPunch: true,
  reason: null,
  nextDirection: 'IN',
  todayIn: null,
  todayOut: null,
  location: {
    locationCheck: true,
    shopLat: 28.6,
    shopLng: 77.2,
    radiusMetres: 100,
    outsideAction: 'FLAG',
  },
  consent: { latestVersion: 1, reconsentRequired: false, agreedVersion: 1 },
};

/** A stand-in for the sync worker's state feed: tests push states, the screen reacts. */
class FakeSync {
  private listeners = new Set<(state: QueueState) => void>();
  state: QueueState = { waiting: 0, refused: [], newestDirection: null };
  readonly dismissed: string[] = [];

  subscribe(listener: (state: QueueState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async dismissRefused(punchId: string): Promise<boolean> {
    this.dismissed.push(punchId);
    this.publish({
      ...this.state,
      refused: this.state.refused.filter((p) => p.punchId !== punchId),
    });
    return true;
  }

  publish(state: QueueState): void {
    this.state = state;
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

function queued(overrides: Partial<QueuedPunch> = {}): QueuedPunch {
  return {
    punchId: 'a1b2c3d4-0000-4000-8000-000000000001',
    request: {
      pairingId: RECORD.pairingId,
      shopId: RECORD.shopId,
      employeeId: RECORD.employeeId,
      punchId: 'a1b2c3d4-0000-4000-8000-000000000001',
      phoneTime: '2025-04-03T03:42:07Z',
      offline: true,
      locationChecked: false,
      distanceMetres: null,
      accuracyMetres: null,
      mock: false,
      signature: 'sig',
    },
    phoneTime: '2025-04-03T03:42:07Z',
    directionGuess: 'IN',
    state: 'WAITING',
    refusalMessage: null,
    attempts: 0,
    nextAttemptAt: 0,
    createdAt: 0,
    ...overrides,
  };
}

interface Harness {
  deps: HomeScreenDeps;
  getMe: Mock<() => Promise<AppStatusResponse>>;
  run: Mock<(context: PunchContext) => Promise<PunchResult>>;
  updateLocation: Mock<() => Promise<undefined>>;
  wipe: Mock<() => Promise<undefined>>;
  sync: FakeSync;
  onUnpaired: Mock<() => void>;
  onOpenHistory: Mock<() => void>;
  onOpenSettings: Mock<() => void>;
}

function harness(
  meAnswers: Array<AppStatusResponse | Error>,
  results: PunchResult[] = [],
): Harness {
  const getMe = vi.fn(async () => {
    const next = meAnswers.shift();
    if (next === undefined) {
      throw new Error('no scripted /me answer');
    }
    if (next instanceof Error) {
      throw next;
    }
    return next;
  });
  const run = vi.fn(async (_context: PunchContext) => {
    const next = results.shift();
    if (next === undefined) {
      throw new Error('no scripted punch result');
    }
    return next;
  });
  const updateLocation = vi.fn(async () => undefined);
  const wipe = vi.fn(async () => undefined);
  const sync = new FakeSync();
  return {
    deps: {
      client: { getMe },
      pairingStore: { load: async () => RECORD, updateLocation, wipe },
      punchFlow: { run },
      sync,
      clock: () => Date.UTC(2025, 3, 3, 3, 0, 0),
    },
    getMe,
    run,
    updateLocation,
    wipe,
    sync,
    onUnpaired: vi.fn<() => void>(),
    onOpenHistory: vi.fn<() => void>(),
    onOpenSettings: vi.fn<() => void>(),
  };
}

function renderHome(h: Harness) {
  return render(
    <HomeScreen
      deps={h.deps}
      onOpenHistory={h.onOpenHistory}
      onOpenSettings={h.onOpenSettings}
      onUnpaired={h.onUnpaired}
    />,
  );
}

afterEach(cleanup);

describe('HomeScreen', () => {
  it('labels the button from /me nextDirection and shows name, shop, date and today’s times', async () => {
    const h = harness([{ ...ME, nextDirection: 'OUT', todayIn: '09:12', todayOut: '18:05' }]);
    renderHome(h);

    expect(await screen.findByRole('button', { name: 'Check out' })).toBeTruthy();
    expect(screen.getByText('Ravi Kumar')).toBeTruthy();
    expect(screen.getByText('Sharma Stores')).toBeTruthy();
    expect(screen.getByText('Thu, 3 Apr 2025')).toBeTruthy();
    expect(screen.getByText('09:12')).toBeTruthy();
    expect(screen.getByText('18:05')).toBeTruthy();
    expect(h.getMe).toHaveBeenCalledTimes(1);
    // R9.3: the Location check settings are kept current from every /me answer.
    await waitFor(() => expect(h.updateLocation).toHaveBeenCalledWith(ME.location));
    // Only three tappable controls: the punch button, History and Settings (R4.1, R4.11).
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getAllByRole('link').map((el) => el.textContent)).toEqual([
      'History',
      'Settings',
    ]);
  });

  it('shows "Check in" with no times when nobody has punched today', async () => {
    renderHome(harness([ME]));
    expect(await screen.findByRole('button', { name: 'Check in' })).toBeTruthy();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('asks /me again every time the screen is returned to, and takes the label from that answer (R4.1b)', async () => {
    const h = harness([ME, { ...ME, nextDirection: 'OUT', todayIn: '09:12' }]);
    renderHome(h);
    await screen.findByRole('button', { name: 'Check in' });
    expect(h.getMe).toHaveBeenCalledTimes(1);

    // Back from History or Settings: the navigator focuses the screen again, no tap in between.
    refocus();

    expect(await screen.findByRole('button', { name: 'Check out' })).toBeTruthy();
    expect(screen.getByText('09:12')).toBeTruthy();
    expect(h.getMe).toHaveBeenCalledTimes(2);
    expect(h.run).not.toHaveBeenCalled();
  });

  it('a stored punch shows the confirmation lines and asks /me again', async () => {
    const after: AppStatusResponse = { ...ME, nextDirection: 'OUT', todayIn: '09:12' };
    const h = harness(
      [ME, after],
      [
        {
          kind: 'stored',
          response: {
            outcome: 'STORED',
            direction: 'IN',
            at: '2025-04-03T03:42:08Z',
            atLocal: '09:12',
            flags: ['OUTSIDE_SHOP'],
            duplicate: false,
            todayIn: '09:12',
            todayOut: null,
            nextDirection: 'OUT',
          },
          lines: ['Checked in at 09:12', flagSentence('OUTSIDE_SHOP')],
        },
      ],
    );
    renderHome(h);

    fireEvent.click(await screen.findByRole('button', { name: 'Check in' }));

    expect(await screen.findByText('Checked in at 09:12')).toBeTruthy();
    expect(screen.getByText('Outside shop — your manager will see this')).toBeTruthy();
    expect(h.run).toHaveBeenCalledWith({ directionGuess: 'IN' });
    await waitFor(() => expect(h.getMe).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('button', { name: 'Check out' })).toBeTruthy();
    expect(screen.getByText('09:12')).toBeTruthy();
  });

  it('a duplicate shows the duplicate line and leaves the label and times as they were', async () => {
    const before: AppStatusResponse = { ...ME, nextDirection: 'OUT', todayIn: '09:12' };
    const h = harness(
      [before, before],
      [
        {
          kind: 'stored',
          response: {
            outcome: 'DUPLICATE',
            direction: 'OUT',
            at: '2025-04-03T03:44:00Z',
            atLocal: '09:14',
            flags: [],
            duplicate: true,
            todayIn: '09:12',
            todayOut: null,
            nextDirection: 'OUT',
          },
          lines: ['Checked out at 09:14', DUPLICATE_SENTENCE],
        },
      ],
    );
    renderHome(h);
    fireEvent.click(await screen.findByRole('button', { name: 'Check out' }));
    expect(await screen.findByText(DUPLICATE_SENTENCE)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Check out' })).toBeTruthy();
    expect(screen.getByText('09:12')).toBeTruthy();
  });

  it('a refusal is shown word for word, one line per line, and the screen is otherwise unchanged', async () => {
    const before: AppStatusResponse = { ...ME, nextDirection: 'OUT', todayIn: '09:12' };
    const h = harness(
      [before],
      [
        {
          kind: 'refused',
          message:
            'Your shop has not turned on the Attendance app. Ask your manager to mark your attendance.',
          code: 'HR_APP_OFF',
        },
      ],
    );
    renderHome(h);
    fireEvent.click(await screen.findByRole('button', { name: 'Check out' }));
    expect(
      await screen.findByText(
        'Your shop has not turned on the Attendance app. Ask your manager to mark your attendance.',
      ),
    ).toBeTruthy();
    // R4.3: today's times and the label do not change, and nothing was asked of the server again.
    expect(screen.getByRole('button', { name: 'Check out' })).toBeTruthy();
    expect(screen.getByText('09:12')).toBeTruthy();
    expect(h.getMe).toHaveBeenCalledTimes(1);
  });

  it('a failed biometric check shows the R5.5 sentence and asks nothing of the server', async () => {
    const before: AppStatusResponse = { ...ME, nextDirection: 'OUT', todayIn: '09:12' };
    const h = harness(
      [before],
      [{ kind: 'biometric_required', message: BIOMETRIC_REQUIRED, code: 'BIOMETRIC_CANCELLED' }],
    );
    renderHome(h);
    fireEvent.click(await screen.findByRole('button', { name: 'Check out' }));
    expect(await screen.findByText(BIOMETRIC_REQUIRED)).toBeTruthy();
    // R4.2d: the home screen is unchanged — same label, same times, no new /me read, no wipe.
    expect(h.getMe).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Check out' })).toBeTruthy();
    expect(screen.getByText('09:12')).toBeTruthy();
    expect(h.wipe).not.toHaveBeenCalled();
    expect(h.onUnpaired).not.toHaveBeenCalled();
  });

  it.each(['KEY_INVALIDATED', 'NO_KEYS'] as const)(
    '%s from the signer shows the message and hands the code to onSignerError, which wipes (R5.9)',
    async (code) => {
      const message =
        code === 'KEY_INVALIDATED' ? KEY_INVALIDATED : 'No pairing keys exist on this phone.';
      const h = harness([ME], [{ kind: 'signer_error', message, code }]);
      const onSignerError = vi.fn<(code: BiometricSignerErrorCode, message: string) => void>();
      render(
        <HomeScreen
          deps={h.deps}
          onOpenHistory={h.onOpenHistory}
          onOpenSettings={h.onOpenSettings}
          onUnpaired={h.onUnpaired}
          onSignerError={onSignerError}
        />,
      );
      fireEvent.click(await screen.findByRole('button', { name: 'Check in' }));

      expect(await screen.findByText(message)).toBeTruthy();
      expect(onSignerError).toHaveBeenCalledWith(code, message);
      // The navigator owns the wipe and the restart; the screen itself asks nothing more of the
      // server and does not treat this as a server-side unpair.
      expect(h.getMe).toHaveBeenCalledTimes(1);
      expect(h.onUnpaired).not.toHaveBeenCalled();
    },
  );

  it('HR_APP_NOT_PAIRED from a punch hands over to the pairing screen', async () => {
    const h = harness(
      [ME],
      [{ kind: 'unpaired', message: 'This phone is no longer paired. Ask your manager.' }],
    );
    renderHome(h);
    fireEvent.click(await screen.findByRole('button', { name: 'Check in' }));
    await waitFor(() => expect(h.onUnpaired).toHaveBeenCalledTimes(1));
  });

  it('HR_APP_NOT_PAIRED from /me wipes the phone and hands over to the pairing screen', async () => {
    const h = harness([
      new ServerRefusal(403, 'This phone is no longer paired. Ask your manager.'),
    ]);
    renderHome(h);
    await waitFor(() => expect(h.onUnpaired).toHaveBeenCalledTimes(1));
    expect(h.wipe).toHaveBeenCalledTimes(1);
  });

  it('when /me is not reachable it shows the stored names, an offline notice and still offers Check in', async () => {
    const h = harness([new NotReachable('TIMEOUT')]);
    renderHome(h);
    expect(await screen.findByText(OFFLINE_NOTICE)).toBeTruthy();
    expect(screen.getByText('Ravi Kumar')).toBeTruthy();
    expect(screen.getByText('Sharma Stores')).toBeTruthy();
    expect(screen.getByText('Thu, 3 Apr 2025')).toBeTruthy();
    // R6.2: a tap still works; with nothing known the label is the "no counted punch" one.
    expect(screen.getByRole('button', { name: 'Check in' })).toBeTruthy();
    expect(h.onUnpaired).not.toHaveBeenCalled();
  });

  it('History and Settings are the only other controls and call their callbacks', async () => {
    const h = harness([ME]);
    renderHome(h);
    await screen.findByRole('button', { name: 'Check in' });
    fireEvent.click(screen.getByText('History'));
    fireEvent.click(screen.getByText('Settings'));
    expect(h.onOpenHistory).toHaveBeenCalledTimes(1);
    expect(h.onOpenSettings).toHaveBeenCalledTimes(1);
  });
});

describe('HomeScreen offline (R6.3, R6.4, R6.13, R6.14, R6.16)', () => {
  it('a queued punch shows SAVED_OFFLINE and does not ask /me again', async () => {
    const h = harness(
      [ME],
      [{ kind: 'queued', message: SAVED_OFFLINE, punch: queued(), signedOnline: false }],
    );
    renderHome(h);
    fireEvent.click(await screen.findByRole('button', { name: 'Check in' }));
    expect(await screen.findByText(SAVED_OFFLINE)).toBeTruthy();
    expect(h.getMe).toHaveBeenCalledTimes(1);
    expect(h.run).toHaveBeenCalledWith({ directionGuess: 'IN' });
  });

  it('while punches wait, the label comes from the newest queued punch, not from /me (R6.4)', async () => {
    const h = harness([ME]); // /me says IN
    renderHome(h);
    await screen.findByRole('button', { name: 'Check in' });

    act(() => h.sync.publish({ waiting: 1, refused: [], newestDirection: 'IN' }));
    expect(await screen.findByRole('button', { name: 'Check out' })).toBeTruthy();

    act(() => h.sync.publish({ waiting: 2, refused: [], newestDirection: 'OUT' }));
    expect(await screen.findByRole('button', { name: 'Check in' })).toBeTruthy();

    // Queue drained: back to the server's answer.
    act(() => h.sync.publish({ waiting: 0, refused: [], newestDirection: null }));
    expect(await screen.findByRole('button', { name: 'Check in' })).toBeTruthy();
  });

  it('the tap passes the queue-derived direction as the guess', async () => {
    const h = harness(
      [ME],
      [{ kind: 'queued', message: SAVED_OFFLINE, punch: queued(), signedOnline: false }],
    );
    renderHome(h);
    await screen.findByRole('button', { name: 'Check in' });
    act(() => h.sync.publish({ waiting: 1, refused: [], newestDirection: 'IN' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Check out' }));
    await waitFor(() => expect(h.run).toHaveBeenCalledWith({ directionGuess: 'OUT' }));
  });

  it('shows "N punches waiting to be sent" from the published state and hides it at 0 (R6.16)', async () => {
    const h = harness([ME]);
    renderHome(h);
    await screen.findByRole('button', { name: 'Check in' });
    expect(screen.queryByTestId('waiting-line')).toBeNull();

    act(() => h.sync.publish({ waiting: 1, refused: [], newestDirection: 'IN' }));
    expect(await screen.findByText('1 punch waiting to be sent')).toBeTruthy();

    act(() => h.sync.publish({ waiting: 2, refused: [], newestDirection: 'OUT' }));
    expect(await screen.findByText('2 punches waiting to be sent')).toBeTruthy();

    act(() => h.sync.publish({ waiting: 0, refused: [], newestDirection: null }));
    await waitFor(() => expect(screen.queryByTestId('waiting-line')).toBeNull());
  });

  it('a refused saved punch is a card with date, time, direction and the message; OK dismisses it (R6.13, R6.14)', async () => {
    const h = harness([ME]);
    const refused = queued({
      punchId: 'a1b2c3d4-0000-4000-8000-000000000009',
      phoneTime: '2025-04-02T12:35:00Z', // 18:05 IST on 2 Apr
      directionGuess: 'OUT',
      state: 'REFUSED',
      refusalMessage: 'Too late to send this check-in. Ask your manager to mark your attendance.',
    });
    renderHome(h);
    await screen.findByRole('button', { name: 'Check in' });
    act(() => h.sync.publish({ waiting: 0, refused: [refused], newestDirection: null }));

    const card = await screen.findByTestId(`refused-${refused.punchId}`);
    expect(card.textContent).toContain('Wed, 2 Apr 2025 · 18:05 · Check out');
    expect(card.textContent).toContain(
      'Too late to send this check-in. Ask your manager to mark your attendance.',
    );
    // The refused punch is not "waiting to be sent".
    expect(screen.queryByTestId('waiting-line')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: REFUSAL_OK }));
    await waitFor(() => expect(h.sync.dismissed).toEqual([refused.punchId]));
    await waitFor(() => expect(screen.queryByTestId(`refused-${refused.punchId}`)).toBeNull());
  });

  it('nextDirectionFor: queue first while waiting, then the server, then IN', () => {
    expect(nextDirectionFor({ waiting: 1, newestDirection: 'IN' }, { nextDirection: 'IN' })).toBe(
      'OUT',
    );
    expect(nextDirectionFor({ waiting: 1, newestDirection: 'OUT' }, { nextDirection: 'OUT' })).toBe(
      'IN',
    );
    expect(nextDirectionFor({ waiting: 0, newestDirection: null }, { nextDirection: 'OUT' })).toBe(
      'OUT',
    );
    expect(nextDirectionFor({ waiting: 0, newestDirection: null }, null)).toBe('IN');
  });

  it('refusalHeading formats the phone time in Asia/Kolkata and falls back to the raw text', () => {
    expect(refusalHeading({ phoneTime: '2025-04-03T03:42:07Z', directionGuess: 'IN' })).toBe(
      'Thu, 3 Apr 2025 · 09:12 · Check in',
    );
    expect(refusalHeading({ phoneTime: 'garbage', directionGuess: 'OUT' })).toBe(
      'garbage · Check out',
    );
  });
});
