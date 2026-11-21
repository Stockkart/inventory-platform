import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  NO_STRONG_BIOMETRIC_ENROLLED,
  PAIRING_NO_NETWORK,
  SERVER_MESSAGES,
  pairingCodeLockedMessage,
} from '@inventory-platform/attendance-protocol';
import type {
  ClaimPairingResponse,
  PairingBootstrap,
} from '@inventory-platform/attendance-protocol';

import { NotReachable, ServerRefusal } from '../api/appClient';
import { CodeAttemptLockout } from '../pairing/CodeAttemptLockout';
import { PairingFlow, type PairingClient } from '../pairing/PairingFlow';
import { FakeBiometricSigner } from '../signer/FakeBiometricSigner';
import { CONSENT_HEADINGS, ConsentScreen, PAIRED_TITLE } from './ConsentScreen';
import { PairScreen } from './PairScreen';

// The screens run in jsdom with `react-native` aliased to DOM elements (vite.config.mts). The
// camera is not rendered here (`showScanner={false}`), but `QrScanner` imports expo-camera at
// module load, so the module is replaced by an empty shell.
vi.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [null, async () => undefined],
}));

const CODE = 'ABCD2345';
const CLAIM: ClaimPairingResponse = {
  claimToken: 'claim-token-1',
  shopName: 'Sharma Stores',
  employeeName: 'Ravi Kumar',
  consent: {
    version: 2,
    kind: 'RECONSENT_REQUIRED',
    recorded: ['Your check-in and check-out time', 'How far from the shop you were'],
    neverRecorded: ['Your fingerprint', 'Your face'],
    visibility: ["The shop's managers can see your attendance"],
  },
};
const BOOTSTRAP: PairingBootstrap = {
  pairingId: '66f1a2b3c4d5e6f708192a3b',
  shopId: '66f1a2b3c4d5e6f708192a3c',
  employeeId: '66f1a2b3c4d5e6f708192a3d',
  employeeName: 'Ravi Kumar',
  shopName: 'Sharma Stores',
  location: { locationCheck: false },
  consentVersion: 2,
};

function harness(options: { client?: Partial<PairingClient>; signer?: FakeBiometricSigner } = {}) {
  const client = {
    claim: vi.fn(options.client?.claim ?? (async () => CLAIM)),
    complete: vi.fn(options.client?.complete ?? (async () => BOOTSTRAP)),
    abandon: vi.fn(options.client?.abandon ?? (async () => ({ abandoned: true }))),
  };
  const store = {
    installationId: vi.fn(async () => '0f8fad5b-d9cb-469f-a165-70867728950e'),
    save: vi.fn(async () => undefined),
  };
  const flow = new PairingFlow({
    client,
    signer: options.signer ?? new FakeBiometricSigner(),
    store,
    device: { os: 'ANDROID', osVersion: '13', phoneModel: 'Redmi Note 11', appVersion: '0.1.0' },
    lockout: new CodeAttemptLockout(),
  });
  const onIdentityConfirmed = vi.fn();
  return { flow, client, store, onIdentityConfirmed };
}

function typeCode(text: string) {
  fireEvent.change(screen.getByLabelText('Pairing code'), { target: { value: text } });
}

afterEach(cleanup);

describe('PairScreen', () => {
  it('refuses a code with a character outside the alphabet before any network call (R2.3)', async () => {
    const h = harness();
    render(
      <PairScreen flow={h.flow} onIdentityConfirmed={h.onIdentityConfirmed} showScanner={false} />,
    );

    typeCode('ABCD234O');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      SERVER_MESSAGES.HR_PAIRING_CODE_WRONG,
    );
    expect(h.client.claim).not.toHaveBeenCalled();
    // The code stays in the field so the worker can fix it.
    expect(screen.getByLabelText('Pairing code')).toHaveValue('ABCD234O');
  });

  it('keeps Continue disabled until something is typed', () => {
    const h = harness();
    render(
      <PairScreen flow={h.flow} onIdentityConfirmed={h.onIdentityConfirmed} showScanner={false} />,
    );

    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    typeCode('abcd 2345');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('names the phone setting to turn on and keeps the code when no strong biometric is enrolled (R2.7)', async () => {
    const h = harness({
      signer: new FakeBiometricSigner({ capability: 'NO_STRONG_BIOMETRIC_ENROLLED' }),
    });
    render(
      <PairScreen flow={h.flow} onIdentityConfirmed={h.onIdentityConfirmed} showScanner={false} />,
    );

    typeCode(CODE);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(NO_STRONG_BIOMETRIC_ENROLLED);
    expect(h.client.claim).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Pairing code')).toHaveValue(CODE);
  });

  it('shows the shop and employee name after claim, and "Yes, this is me" hands over to Consent (R2.6)', async () => {
    const h = harness();
    render(
      <PairScreen flow={h.flow} onIdentityConfirmed={h.onIdentityConfirmed} showScanner={false} />,
    );

    typeCode(' abcd-2345 ');
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Sharma Stores')).toBeTruthy();
    expect(screen.getByText('Ravi Kumar')).toBeTruthy();
    expect(h.client.claim).toHaveBeenCalledTimes(1);
    expect(h.client.claim.mock.calls[0][0].code).toBe(CODE);

    fireEvent.click(screen.getByRole('button', { name: 'Yes, this is me' }));

    expect(h.onIdentityConfirmed).toHaveBeenCalledWith({
      mode: 'pairing',
      claimToken: CLAIM.claimToken,
      code: CODE,
      consent: CLAIM.consent,
      shopName: 'Sharma Stores',
      employeeName: 'Ravi Kumar',
    });
  });

  it('"No, this isn\'t me" abandons the code and returns to an empty code field (R2.6)', async () => {
    const h = harness();
    render(
      <PairScreen flow={h.flow} onIdentityConfirmed={h.onIdentityConfirmed} showScanner={false} />,
    );

    typeCode(CODE);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(await screen.findByRole('button', { name: "No, this isn't me" }));

    await waitFor(() =>
      expect(h.client.abandon).toHaveBeenCalledWith({ claimToken: CLAIM.claimToken }),
    );
    expect(await screen.findByLabelText('Pairing code')).toHaveValue('');
    expect(h.client.complete).not.toHaveBeenCalled();
    expect(h.onIdentityConfirmed).not.toHaveBeenCalled();
  });

  it('shows the server refusal word for word (R2.14)', async () => {
    const h = harness({
      client: {
        claim: async () => {
          throw new ServerRefusal(410, SERVER_MESSAGES.HR_PAIRING_CODE_EXPIRED);
        },
      },
    });
    render(
      <PairScreen flow={h.flow} onIdentityConfirmed={h.onIdentityConfirmed} showScanner={false} />,
    );

    typeCode(CODE);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      SERVER_MESSAGES.HR_PAIRING_CODE_EXPIRED,
    );
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('offers Retry when the server is not reachable, and Retry sends the same code (R2.14)', async () => {
    const claim = vi
      .fn<PairingClient['claim']>()
      .mockRejectedValueOnce(new NotReachable('TIMEOUT'))
      .mockResolvedValueOnce(CLAIM);
    const h = harness({ client: { claim } });
    render(
      <PairScreen flow={h.flow} onIdentityConfirmed={h.onIdentityConfirmed} showScanner={false} />,
    );

    typeCode(CODE);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(PAIRING_NO_NETWORK);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Ravi Kumar')).toBeTruthy();
    expect(claim).toHaveBeenCalledTimes(2);
    expect(claim.mock.calls[1][0].code).toBe(CODE);
  });

  it('counts down the lockout and disables the field while locked (R2.5)', async () => {
    const h = harness({
      client: {
        claim: async () => {
          throw new ServerRefusal(429, pairingCodeLockedMessage(15));
        },
      },
    });
    render(
      <PairScreen flow={h.flow} onIdentityConfirmed={h.onIdentityConfirmed} showScanner={false} />,
    );

    typeCode(CODE);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many wrong codes. Wait 15 minutes and try again.',
    );
    expect(screen.getByLabelText('Pairing code')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});

describe('ConsentScreen (pairing)', () => {
  function renderConsent(h: ReturnType<typeof harness>) {
    const onPaired = vi.fn();
    const onDeclined = vi.fn();
    render(
      <ConsentScreen
        params={{
          mode: 'pairing',
          claimToken: CLAIM.claimToken,
          code: CODE,
          consent: CLAIM.consent,
          shopName: CLAIM.shopName,
          employeeName: CLAIM.employeeName,
        }}
        flow={h.flow}
        onPaired={onPaired}
        onDeclined={onDeclined}
      />,
    );
    return { onPaired, onDeclined };
  }

  it('shows the three plain-word lists from the server (R2.8)', () => {
    renderConsent(harness());

    for (const heading of Object.values(CONSENT_HEADINGS)) {
      expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
    }
    for (const sentence of [
      ...CLAIM.consent.recorded,
      ...CLAIM.consent.neverRecorded,
      ...CLAIM.consent.visibility,
    ]) {
      expect(screen.getByText(`\u2022 ${sentence}`)).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'I agree' })).toBeTruthy();
    expect(screen.getByRole('button', { name: "Don't agree" })).toBeTruthy();
  });

  it('"I agree" creates keys, completes, saves and shows the confirmation (R2.9, R5.1)', async () => {
    const h = harness();
    const { onPaired } = renderConsent(h);

    fireEvent.click(screen.getByRole('button', { name: 'I agree' }));

    expect(await screen.findByRole('heading', { name: PAIRED_TITLE })).toBeTruthy();
    expect(screen.getByText('Sharma Stores')).toBeTruthy();
    expect(screen.getByText('Ravi Kumar')).toBeTruthy();
    expect(h.client.complete).toHaveBeenCalledTimes(1);
    expect(h.client.complete.mock.calls[0][0].consentVersion).toBe(2);
    expect(h.store.save).toHaveBeenCalledWith(BOOTSTRAP);

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onPaired).toHaveBeenCalledWith(BOOTSTRAP);
  });

  it('"Don\'t agree" abandons the code and creates no pairing (R2.8)', async () => {
    const h = harness();
    const { onDeclined } = renderConsent(h);

    fireEvent.click(screen.getByRole('button', { name: "Don't agree" }));

    await waitFor(() => expect(onDeclined).toHaveBeenCalledTimes(1));
    expect(h.client.abandon).toHaveBeenCalledWith({ claimToken: CLAIM.claimToken });
    expect(h.client.complete).not.toHaveBeenCalled();
    expect(h.store.save).not.toHaveBeenCalled();
  });

  it('a refusal on complete stops the pairing and offers only Back', async () => {
    const h = harness({
      client: {
        complete: async () => {
          throw new ServerRefusal(422, SERVER_MESSAGES.HR_PAIRING_EMPLOYEE_EXITED);
        },
      },
    });
    const { onDeclined } = renderConsent(h);

    fireEvent.click(screen.getByRole('button', { name: 'I agree' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      SERVER_MESSAGES.HR_PAIRING_EMPLOYEE_EXITED,
    );
    expect(h.store.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onDeclined).toHaveBeenCalledTimes(1);
  });
});

describe('ConsentScreen (reconsent seam)', () => {
  it('"I agree" calls onAgreeReconsent with the version instead of completing a pairing', async () => {
    const onAgreeReconsent = vi.fn(async (_version: number) => undefined);
    render(
      <ConsentScreen
        params={{ mode: 'reconsent', consent: CLAIM.consent }}
        onAgreeReconsent={onAgreeReconsent}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'I agree' }));

    await waitFor(() => expect(onAgreeReconsent).toHaveBeenCalledWith(2));
  });
});
