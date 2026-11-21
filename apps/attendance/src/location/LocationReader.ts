/**
 * `LocationReader`: the only place in the app that sees the worker's coordinates (R9.2). It reads
 * the phone's current position, works out the distance from the shop on the phone with the same
 * haversine formula and rounding as the server's `GeoDistance.metres` + `Math.round`, and returns
 * only `{distanceMetres, accuracyMetres, mocked}`. Latitude and longitude never leave `read()`:
 * they are not returned, not stored, not logged.
 *
 * Step 2a of the punch flow (R4.2):
 * - no reading within the timeout (15 s), location permission off, or location services off →
 *   `'NO_LOCATION'`; the punch continues and the server applies its no-location rule (R4.5);
 * - `mocked` is what Android reports (`LocationObject.mocked === true`); iOS has no such flag, so it
 *   is always false there. The server applies the fake-location rule (R4.6).
 *
 * `expo-location` is injected behind {@link LocationProvider} so this module and its tests never
 * load Expo or React Native; `expoLocation.ts` builds the real one.
 */
import type { AppLocationSettings } from '@inventory-platform/attendance-protocol';

/** R4.2a: the longest the app waits for a position before punching with "no location". */
export const DEFAULT_LOCATION_TIMEOUT_MS = 15_000;

/** What `read()` returns when a position was obtained. Never carries coordinates (R9.2). */
export interface DistanceReading {
  /** Whole metres from the shop's saved location, rounded like the server (`Math.round`). */
  distanceMetres: number;
  /**
   * The phone's reported accuracy in whole metres (`Math.ceil`); null when the phone reported none.
   * The server treats null as "location unclear" (fail closed).
   */
  accuracyMetres: number | null;
  /** The phone marked the reading as a mock (faked) location (Android only; R4.6). */
  mocked: boolean;
}

/** `'NO_LOCATION'`: permission or services off, timeout, error, or no usable shop location. */
export type LocationReadResult = DistanceReading | 'NO_LOCATION';

/** The subset of `expo-location`'s `PermissionResponse` the reader needs. */
export interface LocationPermission {
  granted: boolean;
  /** false when the worker chose "don't ask again": requesting would be a no-op. */
  canAskAgain: boolean;
}

/** The subset of `expo-location`'s `LocationObject` the reader needs. */
export interface PhonePosition {
  coords: {
    latitude: number;
    longitude: number;
    /** Metres; null when the platform reports none. */
    accuracy: number | null;
  };
  /** Android: the reading came from a mock-location provider. Absent on iOS. */
  mocked?: boolean;
}

/**
 * `expo-location` behind one interface. `getCurrentPositionAsync` is expected to ask for a high
 * accuracy fix (`Accuracy.High`); the real binding in `expoLocation.ts` passes that option.
 */
export interface LocationProvider {
  getForegroundPermissionsAsync(): Promise<LocationPermission>;
  requestForegroundPermissionsAsync(): Promise<LocationPermission>;
  hasServicesEnabledAsync(): Promise<boolean>;
  getCurrentPositionAsync(): Promise<PhonePosition>;
}

/** Mean Earth radius in metres (IUGG); the same constant as the server's `GeoDistance`. */
export const EARTH_RADIUS_METRES = 6_371_008.8;

const DEGREES_TO_RADIANS = Math.PI / 180;

/**
 * Great-circle distance (haversine) in metres between two points given in degrees. Written step
 * for step like `GeoDistance.metres` so both sides round the same double to the same integer.
 */
export function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const phi1 = lat1 * DEGREES_TO_RADIANS;
  const phi2 = lat2 * DEGREES_TO_RADIANS;
  const dPhi = (lat2 - lat1) * DEGREES_TO_RADIANS;
  const dLambda = (lng2 - lng1) * DEGREES_TO_RADIANS;
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  // min guards against a tiny overshoot above 1 from rounding
  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Turns a position and the shop's saved location into a {@link DistanceReading}. Pure; returns
 * `'NO_LOCATION'` when the shop has no coordinates or the position is not a valid point.
 */
export function toDistanceReading(
  position: PhonePosition,
  shop: Pick<AppLocationSettings, 'shopLat' | 'shopLng'>,
): LocationReadResult {
  const { shopLat, shopLng } = shop;
  if (!isLatitude(shopLat) || !isLongitude(shopLng)) {
    return 'NO_LOCATION';
  }
  const { latitude, longitude, accuracy } = position.coords;
  if (!isLatitude(latitude) || !isLongitude(longitude)) {
    return 'NO_LOCATION';
  }
  return {
    distanceMetres: Math.round(haversineMetres(shopLat, shopLng, latitude, longitude)),
    accuracyMetres: toAccuracyMetres(accuracy),
    mocked: position.mocked === true,
  };
}

function toAccuracyMetres(accuracy: number | null | undefined): number | null {
  if (typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy < 0) {
    return null;
  }
  return Math.ceil(accuracy);
}

function isLatitude(value: number | null | undefined): value is number {
  return typeof value === 'number' && value >= -90 && value <= 90;
}

function isLongitude(value: number | null | undefined): value is number {
  return typeof value === 'number' && value >= -180 && value <= 180;
}

export class LocationReader {
  constructor(private readonly provider: LocationProvider) {}

  /**
   * Reads the phone's position and returns the distance from `shop`, or `'NO_LOCATION'`. The
   * whole read (permission check, services check, position) is raced against `timeoutMs` so the
   * punch flow never waits longer than that (R4.2a). Never rejects: any provider error is
   * `'NO_LOCATION'`. Coordinates are consumed inside this call and do not leave it (R9.2).
   */
  async read(
    timeoutMs: number,
    shop: Pick<AppLocationSettings, 'shopLat' | 'shopLng'>,
  ): Promise<LocationReadResult> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<'NO_LOCATION'>((resolve) => {
      timer = setTimeout(() => resolve('NO_LOCATION'), timeoutMs);
    });
    try {
      return await Promise.race([this.locate(shop), timeout]);
    } catch {
      return 'NO_LOCATION';
    } finally {
      clearTimeout(timer);
    }
  }

  private async locate(
    shop: Pick<AppLocationSettings, 'shopLat' | 'shopLng'>,
  ): Promise<LocationReadResult> {
    if (!(await this.hasPermission())) {
      return 'NO_LOCATION';
    }
    if (!(await this.provider.hasServicesEnabledAsync())) {
      return 'NO_LOCATION';
    }
    const position = await this.provider.getCurrentPositionAsync();
    return toDistanceReading(position, shop);
  }

  private async hasPermission(): Promise<boolean> {
    const current = await this.provider.getForegroundPermissionsAsync();
    if (current.granted) {
      return true;
    }
    if (!current.canAskAgain) {
      return false;
    }
    return (await this.provider.requestForegroundPermissionsAsync()).granted;
  }
}
