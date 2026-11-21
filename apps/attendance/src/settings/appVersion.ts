/**
 * The app version shown on the settings screen, from `expo-constants` (`app.json` `version`, plus
 * the native build number when the binary carries one). Import this from app code only; tests
 * pass `appVersion` to the screen directly and never load this file.
 */
import Constants from 'expo-constants';

export function readAppVersion(): string {
  const config = Constants.expoConfig;
  const version = config?.version ?? 'dev';
  const build = config?.android?.versionCode ?? config?.ios?.buildNumber;
  return build === undefined || build === null ? version : `${version} (${build})`;
}
