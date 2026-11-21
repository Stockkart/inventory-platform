/**
 * The app's one real {@link LocationReader}, bound to `expo-location`. Import this from app code;
 * tests build a `LocationReader` over a fake `LocationProvider` and never load this file (it needs
 * the React Native runtime through `expo`).
 */
import * as Location from 'expo-location';

import { LocationReader, type LocationProvider } from './LocationReader';

/** `expo-location` as a {@link LocationProvider}; positions are requested at `Accuracy.High`. */
export const expoLocationProvider: LocationProvider = {
  getForegroundPermissionsAsync: () => Location.getForegroundPermissionsAsync(),
  requestForegroundPermissionsAsync: () => Location.requestForegroundPermissionsAsync(),
  hasServicesEnabledAsync: () => Location.hasServicesEnabledAsync(),
  getCurrentPositionAsync: () =>
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
};

export const locationReader = new LocationReader(expoLocationProvider);
