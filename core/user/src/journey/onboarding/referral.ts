/** Codes are issued upper-case (`SK-AB2CD3`); people paste them in any case, with stray spaces. */
export function normaliseReferralCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/** A shared link carries the code as `?ref=SK-AB2CD3`. */
export function referralCodeFromSearch(search: string): string {
  const ref = new URLSearchParams(search).get('ref');
  return ref ? normaliseReferralCode(ref) : '';
}

export const REFERRED_BY_NAME_MAX = 120;
