const id = (value: string) => encodeURIComponent(value);

export const CAFE_KOT_ENDPOINTS = {
  PUNCH: (purchaseId: string) => `/cafe/purchases/${id(purchaseId)}/kots`,
  KOT_DOCUMENT: (kotId: string) => `/cafe/kots/${id(kotId)}/document`,
} as const;
