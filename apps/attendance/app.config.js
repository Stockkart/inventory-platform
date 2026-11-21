/**
 * Dynamic Expo config. Expo CLI reads `app.json`, passes it in as `config`, and uses what this
 * function returns. The only thing added here is a build-time gate: `EXPO_PUBLIC_API_URL` is
 * inlined into the JS bundle by Metro, so every `expo start`, `expo prebuild` and `eas build`
 * refuses to proceed unless it is an `https://` URL (requirement R9.7: the app never talks plain
 * HTTP). `src/config.ts` applies the same rule to the inlined value when the bundle loads.
 *
 * Set the variable in `apps/attendance/.env` for local work (see `.env-example`) and as an EAS
 * environment variable for the `preview` and `production` build profiles (`eas.json`).
 */
const HTTPS_URL = /^https:\/\/[^\s/?#]+/;

module.exports = ({ config }) => {
  const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();
  if (!HTTPS_URL.test(apiUrl)) {
    throw new Error(
      `EXPO_PUBLIC_API_URL must be an https:// URL (got ${JSON.stringify(apiUrl)}). ` +
        'Set it in apps/attendance/.env or in the EAS environment for this build profile.',
    );
  }
  return config;
};
