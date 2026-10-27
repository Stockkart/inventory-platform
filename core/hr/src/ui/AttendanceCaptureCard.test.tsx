import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@inventory-platform/session';
import type { AttendanceCaptureDto, HrSettingsResponse } from '@inventory-platform/hr/types';
import { AttendanceCaptureCard } from './AttendanceCaptureCard';

const api = vi.hoisted(() => ({ updateSettings: vi.fn() }));
vi.mock('../api/settings.api', () => ({ hrSettingsApi: api }));

const CAPTURE: AttendanceCaptureDto = {
  selfCheckIn: false,
  locationCheck: false,
  shopLat: null,
  shopLng: null,
  radiusMetres: 100,
  outsideAction: 'BLOCK',
};
const BASE: HrSettingsResponse = { saved: true, revision: 3, attendanceCapture: CAPTURE };

const withCapture = (patch: Partial<AttendanceCaptureDto>): HrSettingsResponse => ({
  ...BASE,
  attendanceCapture: { ...CAPTURE, ...patch },
});

function renderCard(settings: HrSettingsResponse, readOnly = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AttendanceCaptureCard settings={settings} readOnly={readOnly} />
    </QueryClientProvider>,
  );
}

function mockGeolocation(
  impl: (ok: PositionCallback, fail: PositionErrorCallback, options?: PositionOptions) => void,
) {
  const getCurrentPosition = vi.fn(impl);
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });
  return getCurrentPosition;
}

beforeEach(() => {
  useAuthStore.setState({ user: { shopId: 'shop-1' } } as never);
  api.updateSettings.mockImplementation(async (body) => ({ ...BASE, ...body }));
});

afterEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: null } as never);
});

describe('AttendanceCaptureCard', () => {
  it('only allows location check while self check-in is on', async () => {
    renderCard(BASE);
    const location = screen.getByLabelText('Location check (only inside the shop)');
    expect(location).toBeDisabled();

    await userEvent.click(screen.getByLabelText('Self check-in'));
    expect(location).toBeEnabled();
    await userEvent.click(location);
    expect(screen.getByLabelText('Radius (metres)')).toBeInTheDocument();
    expect(screen.getByText(/Phone locations can be faked/)).toBeInTheDocument();

    // Turning self check-in off turns location check off too.
    await userEvent.click(screen.getByLabelText('Self check-in'));
    expect(location).not.toBeChecked();
    expect(screen.queryByLabelText('Radius (metres)')).not.toBeInTheDocument();
  });

  it('saves the shop location from the browser and shows only its accuracy', async () => {
    const geo = mockGeolocation((ok) =>
      ok({ coords: { latitude: 12.97, longitude: 77.59, accuracy: 11.6 } } as GeolocationPosition),
    );
    renderCard(withCapture({ selfCheckIn: true, locationCheck: true }));

    await userEvent.click(screen.getByRole('button', { name: 'Use my current location' }));

    expect(await screen.findByText('Shop location saved (±12 m)')).toBeInTheDocument();
    expect(geo.mock.calls[0][2]).toMatchObject({ enableHighAccuracy: true, timeout: 15_000 });
    expect(api.updateSettings).toHaveBeenCalledWith({
      attendanceCapture: {
        selfCheckIn: true,
        locationCheck: true,
        radiusMetres: 100,
        outsideAction: 'BLOCK',
        shopLat: 12.97,
        shopLng: 77.59,
      },
      revision: 3,
    });
    expect(screen.queryByText(/12\.97/)).not.toBeInTheDocument();
  });

  it('explains a denied location and saves nothing', async () => {
    mockGeolocation((_ok, fail) => fail({ code: 1 } as GeolocationPositionError));
    renderCard(withCapture({ selfCheckIn: true, locationCheck: true }));

    await userEvent.click(screen.getByRole('button', { name: 'Use my current location' }));

    expect(await screen.findByText(/Location is blocked for this site/)).toBeInTheDocument();
    expect(api.updateSettings).not.toHaveBeenCalled();
  });

  it('checks the radius before saving', async () => {
    renderCard(withCapture({ selfCheckIn: true, locationCheck: true, shopLat: 1, shopLng: 2 }));
    expect(screen.getByText('Location set')).toBeInTheDocument();
    const radius = screen.getByLabelText('Radius (metres)');

    await userEvent.clear(radius);
    await userEvent.type(radius, '20');
    await userEvent.click(screen.getByRole('button', { name: 'Save attendance' }));
    expect(screen.getByText(/Radius must be a whole number from 30 to 1,000/)).toBeInTheDocument();
    expect(api.updateSettings).not.toHaveBeenCalled();

    await userEvent.clear(radius);
    await userEvent.type(radius, '250');
    await userEvent.click(screen.getByRole('button', { name: 'Allow and flag' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save attendance' }));
    await waitFor(() =>
      expect(api.updateSettings).toHaveBeenCalledWith({
        attendanceCapture: {
          selfCheckIn: true,
          locationCheck: true,
          radiusMetres: 250,
          outsideAction: 'FLAG',
        },
        revision: 3,
      }),
    );
  });

  it('is read-only without manage HR settings', () => {
    renderCard(withCapture({ selfCheckIn: true, locationCheck: true }), true);
    expect(screen.getByLabelText('Self check-in')).toBeDisabled();
    expect(screen.getByLabelText('Radius (metres)')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Use my current location' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save attendance' })).toBeNull();
  });
});
