// HR-module R9.14: the plain-English note built from the server's consent text plus the
// stored-items and retention lists kept in `model/attendance-app-privacy.ts`.
import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@inventory-platform/session';
import {
  PHONE_STORED_ITEMS,
  RETENTION_ITEMS,
  SERVER_STORED_PER_PUNCH,
  UNPAIR_RIGHT,
  type ConsentVersion,
} from '@inventory-platform/hr/types';
import { AttendanceAppPrivacyPage } from '../pages/AttendanceAppPrivacyPage';

const api = vi.hoisted(() => ({ consentLatest: vi.fn() }));
vi.mock('../api/pairing.api', () => ({ pairingApi: api }));

const CONSENT: ConsentVersion = {
  version: 3,
  kind: 'RECONSENT_REQUIRED',
  recorded: [
    'Your check-in and check-out time',
    'How far from the shop you were',
    'That your fingerprint or face check passed',
  ],
  neverRecorded: ['Your fingerprint', 'Your face', 'Your exact location'],
  visibility: ['The shop’s managers can see your attendance'],
};

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [{ path: '/dashboard/hr/attendance-app-privacy', element: <AttendanceAppPrivacyPage /> }],
    { initialEntries: ['/dashboard/hr/attendance-app-privacy'] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({ user: { shopId: 'shop-1' } } as never);
});

afterEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: null } as never);
});

describe('AttendanceAppPrivacyPage', () => {
  it('renders every consent sentence from the server under its heading', async () => {
    api.consentLatest.mockResolvedValue(CONSENT);
    renderPage();

    const recorded = await screen.findByRole('list', { name: 'What is recorded' });
    expect(
      within(recorded)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(CONSENT.recorded);
    const never = screen.getByRole('list', { name: 'What is never recorded' });
    expect(
      within(never)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(CONSENT.neverRecorded);
    const who = screen.getByRole('list', { name: 'Who can see it' });
    expect(
      within(who)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(CONSENT.visibility);
    expect(screen.getByText(/Consent text version 3/)).toBeInTheDocument();
    expect(api.consentLatest).toHaveBeenCalledTimes(1);
  });

  it('lists what is kept on the phone, on the server, for how long, and the right to unpair', async () => {
    api.consentLatest.mockResolvedValue(CONSENT);
    renderPage();

    const phone = screen.getByRole('list', { name: 'What the app keeps on the phone' });
    expect(
      within(phone)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(PHONE_STORED_ITEMS);
    const server = screen.getByRole('list', {
      name: 'What the server keeps for each check-in or check-out',
    });
    expect(
      within(server)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(SERVER_STORED_PER_PUNCH);
    const kept = screen.getByRole('list', { name: 'How long it is kept' });
    expect(
      within(kept)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(RETENTION_ITEMS);
    expect(screen.getByText(UNPAIR_RIGHT)).toBeInTheDocument();
    // Plain-word content checks of R9.14: biometrics never stored, 90-day pairing record, 15-minute code.
    expect(screen.getByText(/Never your fingerprint, your face/)).toBeInTheDocument();
    expect(screen.getByText(/deleted 90 days later/)).toBeInTheDocument();
    expect(screen.getByText(/15 minutes after it was made/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '← HR settings' })).toBeInTheDocument();
    await screen.findByRole('list', { name: 'What is recorded' });
  });

  it('keeps the static lists and explains when the consent text cannot be loaded', async () => {
    api.consentLatest.mockRejectedValue(new Error('Server is busy'));
    renderPage();

    expect(await screen.findByText('Server is busy')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'What is recorded' })).toBeNull();
    expect(screen.getByRole('list', { name: 'How long it is kept' })).toBeInTheDocument();
  });
});
