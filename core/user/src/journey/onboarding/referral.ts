/** Codes are issued upper-case (`SK-AB2CD3`); people paste them in any case, with stray spaces. */
export function normaliseReferralCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** A shared link carries the code as `?ref=SK-AB2CD3`. */
export function referralCodeFromSearch(search: string): string {
  const ref = new URLSearchParams(search).get('ref');
  return ref ? normaliseReferralCode(ref) : '';
}

/**
 * The code from a shared link is kept for the browser tab, because sign-up, login and shop
 * selection all sit between the link and the onboarding referral step and none of them carry
 * the query string. Storage can be blocked (private mode, site data off): then the code is only
 * prefilled when the link lands on onboarding directly.
 */
const REFERRAL_STORAGE_KEY = 'sk_referral_code';

/** Keep `?ref=` from the current URL, if there is one, for the onboarding step. */
export function rememberReferralCode(search: string): void {
  const code = referralCodeFromSearch(search);
  if (!code) return;
  try {
    sessionStorage.setItem(REFERRAL_STORAGE_KEY, code);
  } catch {
    // Storage blocked or unavailable (server render): nothing to keep.
  }
}

/** Code to prefill on onboarding: the URL first, else the one kept from the shared link. */
export function initialReferralCode(search: string): string {
  const fromUrl = referralCodeFromSearch(search);
  if (fromUrl) return fromUrl;
  try {
    return normaliseReferralCode(sessionStorage.getItem(REFERRAL_STORAGE_KEY) ?? '');
  } catch {
    return '';
  }
}

/** Drop the kept code once a shop has been created, so the next shop does not reuse it. */
export function forgetReferralCode(): void {
  try {
    sessionStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    // Storage blocked: nothing was kept.
  }
}

export const REFERRED_BY_NAME_MAX = 120;
