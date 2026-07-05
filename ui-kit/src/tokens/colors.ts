/** Semantic color roles — actual values live in theme/tokens.css */
export const colorRoles = [
  'bg-canvas',
  'bg-surface',
  'bg-elevated',
  'bg-muted',
  'text-primary',
  'text-secondary',
  'text-muted',
  'text-inverse',
  'border-default',
  'border-strong',
  'accent',
  'accent-hover',
  'success',
  'warning',
  'danger',
  'info',
  'focus-ring',
] as const;

export type ColorRole = (typeof colorRoles)[number];
