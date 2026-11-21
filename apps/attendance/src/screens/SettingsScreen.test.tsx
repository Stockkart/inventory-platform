import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SERVER_MESSAGES, UNPAIR_NEEDS_NETWORK } from '@inventory-platform/attendance-protocol';

import { NotReachable, ServerRefusal } from '../api/appClient';
import type { PairingRecord } from '../state/pairingStore';
import {
  REMOVE_PHONE,
  REMOVE_PHONE_CANCEL,
  REMOVE_PHONE_CONFIRM,
  REMOVE_PHONE_QUESTION,
  SettingsScreen,
} from './SettingsScreen';

const RECORD: PairingRecord = {
  pairingId: '66f1a2b3c4d5e6f708192a3b',
  shopId: '5f1a2b3c4d5e6f7081920001',
  employeeId: '5f1a2b3c4d5e6f7081920002',
  employeeName: 'Ravi Kumar',
  shopName: 'Sharma Stores',
  location: { locationCheck: false },
  consentVersion: 1,
};

function harness(answer: { unpaired: boolean } | Error) {
  const unpairMe = vi.fn(async () => {
    if (answer instanceof Error) {
      throw answer;
    }
    return answer;
  });
  const wipe = vi.fn(async () => undefined);
  const onUnpaired = vi.fn();
  const deps = {
    client: { unpairMe },
    pairingStore: { load: async () => RECORD, wipe },
    appVersion: '1.0.0 (7)',
  };
  return { deps, unpairMe, wipe, onUnpaired };
}

afterEach(cleanup);

describe('SettingsScreen', () => {
  it('shows the shop, the employee and the app version', async () => {
    const h = harness({ unpaired: true });
    render(<SettingsScreen deps={h.deps} onUnpaired={h.onUnpaired} />);
    expect((await screen.findByTestId('settings-shop')).textContent).toBe('Sharma Stores');
    expect(screen.getByTestId('settings-employee').textContent).toBe('Ravi Kumar');
    expect(screen.getByTestId('settings-version').textContent).toBe('1.0.0 (7)');
    // One control until the worker starts removing (R4.11: nothing else on this screen).
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([REMOVE_PHONE]);
  });

  it('"Remove this phone" asks first; Cancel changes nothing (R3.7)', async () => {
    const h = harness({ unpaired: true });
    render(<SettingsScreen deps={h.deps} onUnpaired={h.onUnpaired} />);

    fireEvent.click(await screen.findByRole('button', { name: REMOVE_PHONE }));
    expect(screen.getByText(REMOVE_PHONE_QUESTION)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: REMOVE_PHONE_CANCEL }));

    expect(screen.queryByText(REMOVE_PHONE_QUESTION)).toBeNull();
    expect(h.unpairMe).not.toHaveBeenCalled();
    expect(h.wipe).not.toHaveBeenCalled();
    expect(h.onUnpaired).not.toHaveBeenCalled();
  });

  it('confirming unpairs on the server, wipes, and hands over to the pairing screen', async () => {
    const h = harness({ unpaired: true });
    render(<SettingsScreen deps={h.deps} onUnpaired={h.onUnpaired} />);

    fireEvent.click(await screen.findByRole('button', { name: REMOVE_PHONE }));
    fireEvent.click(screen.getByRole('button', { name: REMOVE_PHONE_CONFIRM }));

    await waitFor(() => expect(h.onUnpaired).toHaveBeenCalledTimes(1));
    expect(h.unpairMe).toHaveBeenCalledTimes(1);
    expect(h.wipe).toHaveBeenCalledTimes(1);
    expect(h.unpairMe.mock.invocationCallOrder[0]).toBeLessThan(h.wipe.mock.invocationCallOrder[0]);
  });

  it('server not reachable → UNPAIR_NEEDS_NETWORK, data kept, still paired (R3.8)', async () => {
    const h = harness(new NotReachable('CONNECTION'));
    render(<SettingsScreen deps={h.deps} onUnpaired={h.onUnpaired} />);

    fireEvent.click(await screen.findByRole('button', { name: REMOVE_PHONE }));
    fireEvent.click(screen.getByRole('button', { name: REMOVE_PHONE_CONFIRM }));

    expect((await screen.findByTestId('remove-phone-error')).textContent).toBe(
      UNPAIR_NEEDS_NETWORK,
    );
    expect(h.wipe).not.toHaveBeenCalled();
    expect(h.onUnpaired).not.toHaveBeenCalled();
    // The worker can try again: the button is back.
    expect(screen.getByRole('button', { name: REMOVE_PHONE })).toBeTruthy();
    expect(screen.getByTestId('settings-shop').textContent).toBe('Sharma Stores');
  });

  it('another refusal is shown word for word and changes nothing', async () => {
    const h = harness(new ServerRefusal(429, SERVER_MESSAGES.HR_TOO_MANY_ATTEMPTS));
    render(<SettingsScreen deps={h.deps} onUnpaired={h.onUnpaired} />);

    fireEvent.click(await screen.findByRole('button', { name: REMOVE_PHONE }));
    fireEvent.click(screen.getByRole('button', { name: REMOVE_PHONE_CONFIRM }));

    expect((await screen.findByTestId('remove-phone-error')).textContent).toBe(
      SERVER_MESSAGES.HR_TOO_MANY_ATTEMPTS,
    );
    expect(h.wipe).not.toHaveBeenCalled();
  });

  it('the server already unpaired this phone → wiped and handed over, like any such answer', async () => {
    const h = harness(new ServerRefusal(403, SERVER_MESSAGES.HR_APP_NOT_PAIRED));
    render(<SettingsScreen deps={h.deps} onUnpaired={h.onUnpaired} />);

    fireEvent.click(await screen.findByRole('button', { name: REMOVE_PHONE }));
    fireEvent.click(screen.getByRole('button', { name: REMOVE_PHONE_CONFIRM }));

    await waitFor(() => expect(h.onUnpaired).toHaveBeenCalledTimes(1));
    expect(h.wipe).toHaveBeenCalledTimes(1);
  });
});
