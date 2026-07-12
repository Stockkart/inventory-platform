export const zIndex = {
  dropdown: 1000,
  sticky: 1100,
  modal: 9000,
  toast: 9500,
} as const;

export type ZIndexToken = keyof typeof zIndex;
