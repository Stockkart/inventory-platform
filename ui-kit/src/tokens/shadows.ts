export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(15, 23, 42, 0.08)',
  md: '0 4px 12px rgba(15, 23, 42, 0.12)',
  lg: '0 18px 40px rgba(15, 23, 42, 0.18)',
} as const;

export type ShadowToken = keyof typeof shadows;
