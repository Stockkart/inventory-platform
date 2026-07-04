/** Taxation REST paths (mirrors backend `/taxation/*`). */
export const TAXATION_ENDPOINTS = {
  GSTR1: '/taxation/gstr1',
  GSTR1_DOWNLOAD: '/taxation/gstr1/download',
  GSTR1_OFFLINE_DOWNLOAD: '/taxation/gstr1/download/offline-return',
  GSTR2: '/taxation/gstr2',
  GSTR2_DOWNLOAD: '/taxation/gstr2/download',
  GSTR3B: '/taxation/gstr3b',
  GSTR3B_DOWNLOAD: '/taxation/gstr3b/download',
} as const;
