/**
 * Public surface of `src/location`. The bound Expo instance is exported from `./expoLocation`
 * only, so importing the reader, its types or the pure helpers never touches `expo`.
 */
export {
  DEFAULT_LOCATION_TIMEOUT_MS,
  EARTH_RADIUS_METRES,
  LocationReader,
  haversineMetres,
  toDistanceReading,
} from './LocationReader';
export type {
  DistanceReading,
  LocationPermission,
  LocationProvider,
  LocationReadResult,
  PhonePosition,
} from './LocationReader';
