const id = (value: string) => encodeURIComponent(value);

export const CAFE_KOT_ENDPOINTS = {
  KOT_DOCUMENT: (kotId: string) => `/cafe/kots/${id(kotId)}/document`,
  KOT_REPRINT: (kotId: string) => `/cafe/kots/${id(kotId)}/reprint`,
} as const;

/** A tab holds only what has not yet been sent to the kitchen — see types/tab.ts. */
export const CAFE_TAB_ENDPOINTS = {
  TABS: () => `/cafe/tabs`,
  TAB: (tabId: string) => `/cafe/tabs/${id(tabId)}`,
  TAB_LINES: (tabId: string) => `/cafe/tabs/${id(tabId)}/lines`,
  TAB_LINE: (tabId: string, lineRef: string) => `/cafe/tabs/${id(tabId)}/lines/${id(lineRef)}`,
  TAB_FLUSH: (tabId: string) => `/cafe/tabs/${id(tabId)}/flush`,
} as const;
