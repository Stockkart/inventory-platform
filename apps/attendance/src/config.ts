/**
 * Build-time configuration of the Attendance app.
 *
 * `EXPO_PUBLIC_*` variables are inlined into the bundle by Metro, so the value checked here is
 * fixed at build time. `app.config.js` applies the same `https://` rule before any build starts;
 * this module repeats it on the inlined value so a bundle can never carry a plain-HTTP API URL
 * (requirement R9.7). A bad value throws on first import, before any screen renders.
 *
 * `new URL()` is deliberately not used: React Native's built-in `URL` throws "not implemented"
 * for `protocol` and most other getters.
 */

/** `https://` followed by a host: no whitespace, path, query or fragment inside the host. */
const HTTPS_URL = /^https:\/\/[^\s/?#]+/;

/**
 * Returns `value` trimmed and without trailing slashes, or throws when it is missing, is not a
 * URL, or does not use `https://`. `name` is only used in the error message.
 */
export function requireHttpsUrl(name: string, value: string | undefined): string {
  const trimmed = (value ?? '').trim();
  if (trimmed === '') {
    throw new Error(`${name} is not set. The Attendance app needs an https:// API URL.`);
  }
  if (!HTTPS_URL.test(trimmed)) {
    throw new Error(
      `${name} must be an https:// URL, got ${JSON.stringify(trimmed)}. ` +
        'The Attendance app never uses plain HTTP.',
    );
  }
  return trimmed.replace(/\/+$/, '');
}

/** Base URL of inventory-api, e.g. `https://api.example.in/api/v1`. Never `http://`. */
export const API_URL = requireHttpsUrl('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL);
