import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_LOCATION_TIMEOUT_MS,
  LocationReader,
  haversineMetres,
  toDistanceReading,
  type LocationPermission,
  type LocationProvider,
  type PhonePosition,
} from './LocationReader';

const SHOP = { shopLat: 28.6139, shopLng: 77.209 };

const granted: LocationPermission = { granted: true, canAskAgain: true };
const denied: LocationPermission = { granted: false, canAskAgain: true };
const deniedForever: LocationPermission = { granted: false, canAskAgain: false };

const position = (
  latitude: number,
  longitude: number,
  accuracy: number | null = 10,
  mocked?: boolean,
): PhonePosition => ({ coords: { latitude, longitude, accuracy }, mocked });

/**
 * A scripted `LocationProvider` that records the order of calls; every method can be overridden
 * per test (the override is still recorded).
 */
function fakeProvider(overrides: Partial<LocationProvider> = {}) {
  const calls: string[] = [];
  const defaults: LocationProvider = {
    getForegroundPermissionsAsync: async () => granted,
    requestForegroundPermissionsAsync: async () => granted,
    hasServicesEnabledAsync: async () => true,
    getCurrentPositionAsync: async () => position(28.6148, 77.2101),
  };
  const impl: LocationProvider = { ...defaults, ...overrides };
  const provider: LocationProvider = {
    getForegroundPermissionsAsync() {
      calls.push('getPermissions');
      return impl.getForegroundPermissionsAsync();
    },
    requestForegroundPermissionsAsync() {
      calls.push('requestPermissions');
      return impl.requestForegroundPermissionsAsync();
    },
    hasServicesEnabledAsync() {
      calls.push('services');
      return impl.hasServicesEnabledAsync();
    },
    getCurrentPositionAsync() {
      calls.push('position');
      return impl.getCurrentPositionAsync();
    },
  };
  return { provider, calls };
}

/**
 * Reference values from the server's `GeoDistance.metres` (inventory-api, run on the JVM):
 * [lat1, lng1, lat2, lng2, metres as Java printed it, Math.round].
 */
const JAVA_VECTORS: [number, number, number, number, number, number][] = [
  [28.6139, 77.209, 28.6139, 77.209, 0.0, 0],
  [28.6139, 77.209, 28.6148, 77.2101, 146.78082033268453, 147],
  [19.076, 72.8777, 19.0765, 72.878, 63.91411755611307, 64],
  [12.9716, 77.5946, 13.0827, 80.2707, 290172.42575573263, 290172],
  [0, 0, 0, 1, 111195.0802335329, 111195],
  [-33.8688, 151.2093, 51.5074, -0.1278, 1.699395693281654e7, 16993957],
  [28.6139, 77.209, 28.61390001, 77.209, 0.0011119504992942685, 0],
  [90, 0, -90, 0, 2.0015114442035925e7, 20015114],
  [28.6139, 77.209, 28.6139, 77.2093, 29.284341397511472, 29],
  [0, 179.9999, 0, -179.9999, 22.23901604566269, 22],
];

describe('haversineMetres', () => {
  it.each(JAVA_VECTORS)(
    'matches GeoDistance.metres(%f, %f, %f, %f)',
    (lat1, lng1, lat2, lng2, metres, rounded) => {
      const actual = haversineMetres(lat1, lng1, lat2, lng2);
      // the Java and V8 sin/cos may differ in the last bit; the rounded metre must not
      expect(actual).toBeCloseTo(metres, 6);
      expect(Math.round(actual)).toBe(rounded);
    },
  );

  it('is symmetric and non-negative', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        (lat1, lng1, lat2, lng2) => {
          const d = haversineMetres(lat1, lng1, lat2, lng2);
          expect(d).toBeGreaterThanOrEqual(0);
          expect(d).toBeLessThanOrEqual(Math.PI * 6_371_008.8 + 1);
          expect(haversineMetres(lat2, lng2, lat1, lng1)).toBe(d);
        },
      ),
    );
  });
});

describe('toDistanceReading', () => {
  it('rounds the distance like the server (Math.round) and the accuracy up (Math.ceil)', () => {
    expect(toDistanceReading(position(28.6148, 77.2101, 12.3), SHOP)).toEqual({
      distanceMetres: 147,
      accuracyMetres: 13,
      mocked: false,
    });
    expect(toDistanceReading(position(28.6139, 77.2093, 8), SHOP)).toEqual({
      distanceMetres: 29,
      accuracyMetres: 8,
      mocked: false,
    });
  });

  it('reports mocked only when the phone says exactly true', () => {
    expect(toDistanceReading(position(28.6139, 77.209, 5, true), SHOP)).toMatchObject({
      mocked: true,
    });
    expect(toDistanceReading(position(28.6139, 77.209, 5, false), SHOP)).toMatchObject({
      mocked: false,
    });
    expect(toDistanceReading(position(28.6139, 77.209, 5, undefined), SHOP)).toMatchObject({
      mocked: false,
    });
  });

  it('passes a missing or invalid accuracy through as null (the server treats it as unclear)', () => {
    expect(toDistanceReading(position(28.6139, 77.209, null), SHOP)).toMatchObject({
      accuracyMetres: null,
    });
    expect(toDistanceReading(position(28.6139, 77.209, -1), SHOP)).toMatchObject({
      accuracyMetres: null,
    });
    expect(toDistanceReading(position(28.6139, 77.209, Number.NaN), SHOP)).toMatchObject({
      accuracyMetres: null,
    });
  });

  it('is NO_LOCATION when the shop has no coordinates', () => {
    expect(toDistanceReading(position(28.6139, 77.209), { shopLat: null, shopLng: null })).toBe(
      'NO_LOCATION',
    );
    expect(toDistanceReading(position(28.6139, 77.209), {})).toBe('NO_LOCATION');
  });

  it('is NO_LOCATION when the position is not a valid point', () => {
    expect(toDistanceReading(position(Number.NaN, 77.209), SHOP)).toBe('NO_LOCATION');
    expect(toDistanceReading(position(91, 77.209), SHOP)).toBe('NO_LOCATION');
    expect(toDistanceReading(position(28.6139, 181), SHOP)).toBe('NO_LOCATION');
  });

  it('never returns coordinates: only distanceMetres, accuracyMetres and mocked (R9.2)', () => {
    const coordinate = (bound: number) =>
      fc.double({ min: -bound, max: bound, noNaN: true, noInteger: true });
    fc.assert(
      fc.property(
        coordinate(90),
        coordinate(180),
        coordinate(90),
        coordinate(180),
        fc.option(fc.double({ min: 0, max: 5000, noNaN: true }), { nil: null }),
        fc.option(fc.boolean(), { nil: undefined }),
        (shopLat, shopLng, latitude, longitude, accuracy, mocked) => {
          const reading = toDistanceReading(
            { coords: { latitude, longitude, accuracy }, mocked },
            { shopLat, shopLng },
          );
          expect(reading).not.toBe('NO_LOCATION');
          if (reading === 'NO_LOCATION') {
            return;
          }
          expect(Object.keys(reading).sort()).toEqual([
            'accuracyMetres',
            'distanceMetres',
            'mocked',
          ]);
          expect(Number.isInteger(reading.distanceMetres)).toBe(true);
          expect(reading.distanceMetres).toBe(
            Math.round(haversineMetres(shopLat, shopLng, latitude, longitude)),
          );
          expect(reading.accuracyMetres).toBe(accuracy === null ? null : Math.ceil(accuracy));
          expect(reading.mocked).toBe(mocked === true);
          const text = JSON.stringify(reading);
          for (const value of [latitude, longitude, shopLat, shopLng]) {
            expect(text).not.toContain(String(value));
          }
        },
      ),
    );
  });
});

describe('LocationReader.read', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the distance reading when permission, services and the fix are all there', async () => {
    const { provider, calls } = fakeProvider();
    const reader = new LocationReader(provider);
    await expect(reader.read(DEFAULT_LOCATION_TIMEOUT_MS, SHOP)).resolves.toEqual({
      distanceMetres: 147,
      accuracyMetres: 10,
      mocked: false,
    });
    expect(calls).toEqual(['getPermissions', 'services', 'position']);
  });

  it('asks for permission once when it can, and reads when the worker grants it', async () => {
    const { provider, calls } = fakeProvider({
      getForegroundPermissionsAsync: async () => denied,
    });
    await expect(new LocationReader(provider).read(1000, SHOP)).resolves.toMatchObject({
      distanceMetres: 147,
    });
    expect(calls).toEqual(['getPermissions', 'requestPermissions', 'services', 'position']);
  });

  it('is NO_LOCATION when permission is refused, without asking for a position', async () => {
    const { provider, calls } = fakeProvider({
      getForegroundPermissionsAsync: async () => denied,
      requestForegroundPermissionsAsync: async () => denied,
    });
    await expect(new LocationReader(provider).read(1000, SHOP)).resolves.toBe('NO_LOCATION');
    expect(calls).not.toContain('position');
  });

  it('is NO_LOCATION when permission is off and cannot be asked again', async () => {
    const { provider, calls } = fakeProvider({
      getForegroundPermissionsAsync: async () => deniedForever,
    });
    await expect(new LocationReader(provider).read(1000, SHOP)).resolves.toBe('NO_LOCATION');
    expect(calls).toEqual(['getPermissions']);
  });

  it('is NO_LOCATION when location services are off', async () => {
    const { provider, calls } = fakeProvider({ hasServicesEnabledAsync: async () => false });
    await expect(new LocationReader(provider).read(1000, SHOP)).resolves.toBe('NO_LOCATION');
    expect(calls).toEqual(['getPermissions', 'services']);
  });

  it('is NO_LOCATION when no fix arrives within the timeout (R4.2a)', async () => {
    vi.useFakeTimers();
    const { provider } = fakeProvider({
      getCurrentPositionAsync: () => new Promise<PhonePosition>(() => undefined),
    });
    const result = new LocationReader(provider).read(DEFAULT_LOCATION_TIMEOUT_MS, SHOP);
    await vi.advanceTimersByTimeAsync(DEFAULT_LOCATION_TIMEOUT_MS - 1);
    let settled = false;
    void result.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe('NO_LOCATION');
  });

  it('is NO_LOCATION when the provider throws or rejects', async () => {
    const rejecting = fakeProvider({
      getCurrentPositionAsync: async () => {
        throw new Error('Location request failed due to unsatisfied device settings');
      },
    });
    await expect(new LocationReader(rejecting.provider).read(1000, SHOP)).resolves.toBe(
      'NO_LOCATION',
    );
    const throwing = fakeProvider({
      hasServicesEnabledAsync: () => {
        throw new Error('native module missing');
      },
    });
    await expect(new LocationReader(throwing.provider).read(1000, SHOP)).resolves.toBe(
      'NO_LOCATION',
    );
  });

  it('is NO_LOCATION when the shop has no saved location', async () => {
    const { provider } = fakeProvider();
    await expect(
      new LocationReader(provider).read(1000, { shopLat: null, shopLng: null }),
    ).resolves.toBe('NO_LOCATION');
  });

  it('clears its timer once the fix arrives', async () => {
    vi.useFakeTimers();
    const { provider } = fakeProvider();
    await expect(new LocationReader(provider).read(1000, SHOP)).resolves.toMatchObject({
      distanceMetres: 147,
    });
    expect(vi.getTimerCount()).toBe(0);
  });
});
