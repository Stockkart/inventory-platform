/** Answer of GET /taxation/gstin/{gstin}: offline validity, then what the GST network knows. */
export interface GstinLookupResult {
  gstin: string;
  /** Passes the offline shape and check-character test. */
  valid: boolean;
  /** The GST network has a record for it. */
  verified: boolean;
  /** A lookup provider is configured on the server; false means offline checks only. */
  verificationAvailable: boolean;
  /** Why it is not valid, in plain words; null when valid. */
  problem: string | null;
  status: string | null;
  legalName: string | null;
  tradeName: string | null;
  taxpayerType: string | null;
  stateCode: string | null;
  stateName: string | null;
  registrationDate: string | null;
  cancellationDate: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  addressDetails: {
    buildingNumber?: string | null;
    buildingName?: string | null;
    floor?: string | null;
    street?: string | null;
    locality?: string | null;
    district?: string | null;
    city?: string | null;
    state?: string | null;
    landmark?: string | null;
    pincode?: string | null;
  } | null;
  lastCheckedAt: string | null;
}

/** GET /taxation/gstin/settings — whether online verification (and the stricter rules) is on. */
export interface GstinSettings {
  verificationEnabled: boolean;
  provider: string;
}
