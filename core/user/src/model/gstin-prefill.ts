import type { PostalAddress } from './party.types';
import type { GstinLookupResult } from './gstin-lookup.types';

/**
 * Keep what the user typed unless it is empty — or `overwrite` is set (the "Use these details"
 * link, where the user has asked for the record to win).
 */
export function pickFilled(
  current: string | null | undefined,
  incoming: string | null | undefined,
  overwrite = false,
): string | undefined {
  return overwrite || !current?.trim() ? incoming ?? current ?? undefined : current;
}

/**
 * The address fields a GST record can fill in. The registration's state is authoritative and
 * always wins; everything else respects what is already typed.
 */
export function prefillAddressFromGstin(
  current: PostalAddress | undefined,
  r: GstinLookupResult,
  overwrite = false,
): PostalAddress {
  const address: PostalAddress = { ...(current ?? {}) };
  address.line1 = pickFilled(address.line1, r.address, overwrite);
  address.city = pickFilled(address.city, r.city, overwrite);
  address.pincode = pickFilled(address.pincode, r.pincode, overwrite);
  address.district = pickFilled(address.district, r.addressDetails?.district, overwrite);
  address.stateCode = r.stateCode ?? address.stateCode ?? undefined;
  return address;
}

/**
 * What the address should say about the state after the GSTIN text changes: a valid GSTIN says
 * where the party is; once edited away from a valid one, the state it had implied is cleared so a
 * stale code does not linger.
 */
export function addressAfterGstinChange(
  current: PostalAddress | undefined,
  previousStateFromGstin: string | undefined,
  nextStateFromGstin: string | undefined,
): PostalAddress | undefined {
  if (nextStateFromGstin) return { ...(current ?? {}), stateCode: nextStateFromGstin };
  if (previousStateFromGstin) return { ...(current ?? {}), stateCode: undefined };
  return current;
}
