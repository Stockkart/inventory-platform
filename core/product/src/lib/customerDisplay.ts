/** Default label when no saved customer is on the bill (counter / guest sale). */
export const GUEST_CUSTOMER_LABEL = 'Guest';

const LEGACY_GUEST_NAMES = new Set([
  'general customer',
  'walk-in',
  'walk-in customer',
  'guest',
  'guest customer',
]);

/** True when the stored name is a backend placeholder, not a real customer name. */
export function isDefaultGuestCustomerName(name?: string | null): boolean {
  const normalized = (name ?? '').trim().toLowerCase();
  return normalized.length === 0 || LEGACY_GUEST_NAMES.has(normalized);
}

/** User-facing customer label; maps legacy walk-in / general-customer placeholders to Guest. */
export function formatCustomerDisplayName(name?: string | null): string {
  if (isDefaultGuestCustomerName(name)) {
    return GUEST_CUSTOMER_LABEL;
  }
  return (name ?? '').trim();
}
