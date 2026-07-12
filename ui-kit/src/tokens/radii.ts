export const radii = {
  none: '0',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '14px',
  full: '9999px',
} as const;

export type RadiusToken = keyof typeof radii;
