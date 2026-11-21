/**
 * What the phone says about itself in `POST /pairings/claim` (R2.15: phone model and OS version
 * as the operating system reports them, plus the app version). Read from React Native's
 * `Platform.constants` and `expo-constants`; no `expo-device`, no identifiers of any kind (R2.16).
 *
 * `describeDevice` is pure so tests can feed it a fake platform; `readDeviceInfo` binds the real
 * one and is the only export the composition root needs.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { DeviceInfo } from '../pairing/PairingFlow';

/** The slice of `Platform` this module reads. */
export interface PlatformLike {
  OS: string;
  Version: number | string;
  constants: Record<string, unknown>;
}

/** Longest `phoneModel` the server's validator accepts. */
export const MAX_PHONE_MODEL_LENGTH = 80;

export function describeDevice(platform: PlatformLike, appVersion: string | undefined): DeviceInfo {
  const os = platform.OS === 'ios' ? 'IOS' : 'ANDROID';
  const c = platform.constants;
  const model =
    os === 'ANDROID'
      ? joinWords(stringOf(c['Manufacturer']) ?? stringOf(c['Brand']), stringOf(c['Model']))
      : // iOS exposes no model name without expo-device; the OS name is what a manager can read.
        joinWords(stringOf(c['systemName']) ?? 'iPhone', stringOf(c['interfaceIdiom']));
  return {
    os,
    osVersion: String(stringOf(c['Release']) ?? stringOf(c['osVersion']) ?? platform.Version),
    phoneModel: (model || (os === 'IOS' ? 'iPhone' : 'Android phone')).slice(
      0,
      MAX_PHONE_MODEL_LENGTH,
    ),
    appVersion: appVersion ?? '0.0.0',
  };
}

/** The running phone, for `PairingFlow`. */
export function readDeviceInfo(): DeviceInfo {
  return describeDevice(
    Platform as unknown as PlatformLike,
    Constants.expoConfig?.version ?? undefined,
  );
}

function stringOf(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** "Xiaomi Redmi Note 11"; drops a repeated brand ("Samsung Samsung SM-A125F" → "Samsung SM-A125F"). */
function joinWords(first: string | undefined, second: string | undefined): string {
  if (!first) {
    return second ?? '';
  }
  if (!second) {
    return first;
  }
  return second.toLowerCase().startsWith(first.toLowerCase()) ? second : `${first} ${second}`;
}
