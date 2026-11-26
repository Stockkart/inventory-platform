import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore, useNotify } from '@inventory-platform/session';
import { Text } from '@inventory-platform/ui-kit';
import type { AttendanceCaptureDto, HrSettingsResponse } from '@inventory-platform/hr/types';
import { AttendanceCaptureCard, BIOMETRIC_NO_LOCATION_WARNING } from './AttendanceCaptureCard';

const api = vi.hoisted(() => ({ updateSettings: vi.fn() }));
vi.mock('../api/settings.api', () => ({ hrSettingsApi: api }));

const CAPTURE: AttendanceCaptureDto = {
  selfCheckIn: false,
  biometricApp: false,
  locationCheck: false,
  shopLat: null,
  shopLng: null,
  radiusMetres: 100,
  outsideAction: 'BLOCK',
};
const BASE: HrSettingsResponse = {
  saved: true,
  revision: 3,
  attendanceCapture: CAPTURE,
  pairedEmployeeCount: 0,
};

const withCapture = (
  patch: Partial<AttendanceCaptureDto>,
  rest: Partial<HrSettingsResponse> = {},
): HrSettingsResponse => ({
  ...BASE,
  ...rest,
  attendanceCapture: { ...CAPTURE, ...patch },
});

/** Shows where an in-card link navigated to. */
function WhereAmI() {
  const location = useLocation();
  return <Text data-testid="where">{`${location.pathname}${location.search}`}</Text>;
}

function renderCard(settings: HrSettingsResponse, readOnly = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <>
            <AttendanceCaptureCard settings={settings} readOnly={readOnly} />
            <WhereAmI />
          </>
        ),
      },
    ],
    { initialEntries: ['/dashboard/hr/settings'] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
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
  it('only allows location check while a check-in switch is on', async () => {
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
    expect(location).toBeDisabled();
    expect(screen.queryByLabelText('Radius (metres)')).not.toBeInTheDocument();

    // The app follows the same Location check (D5), so it can be turned on for the app alone.
    await userEvent.click(screen.getByLabelText('Biometric app check-in'));
    expect(location).toBeEnabled();
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
        biometricApp: false,
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
    const notifyError = vi.spyOn(useNotify, 'error');
    notifyError.mockClear();
    mockGeolocation((_ok, fail) => fail({ code: 1 } as GeolocationPositionError));
    renderCard(withCapture({ selfCheckIn: true, locationCheck: true }));

    await userEvent.click(screen.getByRole('button', { name: 'Use my current location' }));

    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith(
        expect.stringMatching(/Location is blocked for this site/),
      ),
    );
    expect(api.updateSettings).not.toHaveBeenCalled();
  });

  it('checks the radius before saving', async () => {
    const notifyError = vi.spyOn(useNotify, 'error');
    notifyError.mockClear();
    renderCard(withCapture({ selfCheckIn: true, locationCheck: true, shopLat: 1, shopLng: 2 }));
    expect(screen.getByText('Location set')).toBeInTheDocument();
    const radius = screen.getByLabelText('Radius (metres)');

    await userEvent.clear(radius);
    await userEvent.type(radius, '20');
    await userEvent.click(screen.getByRole('button', { name: 'Save attendance' }));
    expect(notifyError).toHaveBeenCalledWith(
      expect.stringMatching(/Radius must be a whole number from 30 to 1,000/),
    );
    expect(api.updateSettings).not.toHaveBeenCalled();

    await userEvent.clear(radius);
    await userEvent.type(radius, '250');
    await userEvent.click(screen.getByRole('button', { name: 'Allow and flag' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save attendance' }));
    await waitFor(() =>
      expect(api.updateSettings).toHaveBeenCalledWith({
        attendanceCapture: {
          selfCheckIn: true,
          biometricApp: false,
          locationCheck: true,
          radiusMetres: 250,
          outsideAction: 'FLAG',
        },
        revision: 3,
      }),
    );
  });

  it('is read-only without manage HR settings', () => {
    renderCard(withCapture({ selfCheckIn: true, biometricApp: true, locationCheck: true }), true);
    expect(screen.getByLabelText('Self check-in')).toBeDisabled();
    expect(screen.getByLabelText('Radius (metres)')).toBeDisabled();
    // The third switch keeps its value visible but cannot be flipped (R1.7).
    const biometric = screen.getByLabelText('Biometric app check-in');
    expect(biometric).toBeChecked();
    expect(biometric).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Use my current location' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save attendance' })).toBeNull();
  });

  // HR-module R1.1, R1.2: the third switch, off by default, saved on its own field.
  it('shows Biometric app check-in off by default and saves it without touching the others', async () => {
    renderCard(BASE);
    const switches = screen.getAllByRole('checkbox');
    const biometric = screen.getByLabelText('Biometric app check-in');
    expect(biometric).not.toBeChecked();
    // Third, below Self check-in and Location check.
    expect(switches).toHaveLength(3);
    expect(switches[2]).toBe(biometric);

    await userEvent.click(biometric);
    await userEvent.click(screen.getByRole('button', { name: 'Save attendance' }));
    await waitFor(() =>
      expect(api.updateSettings).toHaveBeenCalledWith({
        attendanceCapture: {
          selfCheckIn: false,
          biometricApp: true,
          locationCheck: false,
          radiusMetres: 100,
          outsideAction: 'BLOCK',
        },
        revision: 3,
      }),
    );
  });

  // HR-module R1.6: the warning follows the two switches and never blocks saving.
  it('warns when the app is on without Location check, and lets the owner save anyway', async () => {
    renderCard(withCapture({ biometricApp: true, locationCheck: false }));
    expect(screen.getByRole('status')).toHaveTextContent(BIOMETRIC_NO_LOCATION_WARNING);

    await userEvent.click(screen.getByRole('button', { name: 'Save attendance' }));
    await waitFor(() => expect(api.updateSettings).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByLabelText('Location check (only inside the shop)'));
    expect(screen.queryByText(BIOMETRIC_NO_LOCATION_WARNING)).toBeNull();

    await userEvent.click(screen.getByLabelText('Location check (only inside the shop)'));
    expect(screen.getByText(BIOMETRIC_NO_LOCATION_WARNING)).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Biometric app check-in'));
    expect(screen.queryByText(BIOMETRIC_NO_LOCATION_WARNING)).toBeNull();
  });

  it('shows no warning while the app is off or Location check is on', () => {
    renderCard(withCapture({ selfCheckIn: true, biometricApp: false, locationCheck: false }));
    expect(screen.queryByText(BIOMETRIC_NO_LOCATION_WARNING)).toBeNull();
  });

  // HR-module R1.9: the paired count, a link even at 0.
  it('links the paired-phone count to the filtered employee list', async () => {
    renderCard(withCapture({}, { pairedEmployeeCount: 0 }));
    const zero = screen.getByRole('link', { name: '0 employees have a paired phone' });
    expect(zero).toHaveAttribute('href', '/dashboard/hr/employees?paired=true');

    await userEvent.click(zero);
    expect(screen.getByTestId('where')).toHaveTextContent('/dashboard/hr/employees?paired=true');
  });

  it('counts paired phones in plain words whatever the switch says', () => {
    renderCard(withCapture({ biometricApp: false }, { pairedEmployeeCount: 1 }));
    expect(screen.getByRole('link', { name: '1 employee has a paired phone' })).toBeInTheDocument();
  });

  it('treats a missing count as 0 and links to the privacy note', () => {
    renderCard(withCapture({}, { pairedEmployeeCount: undefined }));
    expect(
      screen.getByRole('link', { name: '0 employees have a paired phone' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'What the app records' })).toHaveAttribute(
      'href',
      '/dashboard/hr/attendance-app-privacy',
    );
  });
});
