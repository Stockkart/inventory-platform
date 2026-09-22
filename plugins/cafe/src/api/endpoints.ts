const id = (value: string) => encodeURIComponent(value);

export const CAFE_KOT_ENDPOINTS = {
  /** Punches the pending round on a cart. The server derives the delta; no request body. */
  PUNCH: (purchaseId: string) => `/cafe/purchases/${id(purchaseId)}/kots`,
  KOT_DOCUMENT: (kotId: string) => `/cafe/kots/${id(kotId)}/document`,
  KOT_REPRINT: (kotId: string) => `/cafe/kots/${id(kotId)}/reprint`,
} as const;
