export const zIndex = {
  dropdown: 1000,
  sticky: 1100,
  /** Persistent, non-modal floating surfaces (calculator panel). Below `modal`
   *  so an exclusive dialog covers them, above `sticky` so the app header does not. */
  floating: 8000,
  modal: 9000,
  toast: 9500,
} as const;

export type ZIndexToken = keyof typeof zIndex;
