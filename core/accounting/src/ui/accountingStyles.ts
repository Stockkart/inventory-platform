import type { CSSProperties } from 'react';

export const journalLineGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '2.2fr 1fr 1fr 1fr 2rem',
  gap: '0.4rem 0.5rem',
  alignItems: 'stretch',
  marginBottom: '0.4rem',
};

export const journalHeaderLineGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '2.2fr 1fr 1fr 1fr 2rem',
  gap: '0.4rem 0.5rem',
  marginBottom: '0.2rem',
};

export function ledgerLayoutStyle(compact?: boolean): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: compact ? '1fr' : 'minmax(280px, 340px) 1fr',
    gap: '1rem',
    alignItems: 'start',
  };
}

export const acctItemStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: '0.25rem 0.6rem',
  alignItems: 'center',
  justifyContent: 'stretch',
  width: '100%',
  padding: '0.5rem 0.6rem',
  borderRadius: 8,
  border: '1px solid transparent',
  background: 'transparent',
  color: 'var(--text-primary, #0f172a)',
  cursor: 'pointer',
  textAlign: 'left',
  fontSize: '0.85rem',
  fontWeight: 400,
  minHeight: 'unset',
  boxShadow: 'none',
};

export const acctItemActiveStyle: CSSProperties = {
  ...acctItemStyle,
  background: 'color-mix(in srgb, #2563eb 12%, transparent)',
  borderColor: 'color-mix(in srgb, #2563eb 30%, transparent)',
  boxShadow: 'inset 0 0 0 1px color-mix(in srgb, #2563eb 8%, transparent)',
};

export const acctItemCodeStyle: CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 700,
  color: 'var(--text-secondary, #64748b)',
  letterSpacing: '0.03em',
};

export const acctItemLabelStyle: CSSProperties = {
  fontWeight: 600,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

export const acctItemBalanceStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  fontWeight: 700,
  fontSize: '0.85rem',
  whiteSpace: 'nowrap',
};

export const acctItemBalanceMutedStyle: CSSProperties = {
  ...acctItemBalanceStyle,
  color: 'var(--text-secondary, #94a3b8)',
  fontWeight: 500,
};

export function templateChipStyle(active: boolean): CSSProperties {
  return {
    padding: '0.35rem 0.7rem',
    borderRadius: 999,
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: active
      ? '1px solid #2563eb'
      : '1px solid var(--border-color, rgba(148, 163, 184, 0.45))',
    background: active ? 'color-mix(in srgb, #2563eb 12%, transparent)' : 'var(--card-bg, #fff)',
    color: active ? '#1d4ed8' : 'var(--text-primary, #0f172a)',
  };
}

export const quickActionCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  padding: '0.75rem 0.85rem',
  borderRadius: 10,
  border: '1px solid var(--border-color, rgba(148, 163, 184, 0.35))',
  background: 'color-mix(in srgb, var(--card-bg, #fff) 96%, #2563eb 4%)',
  textDecoration: 'none',
  color: 'inherit',
  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  textAlign: 'left',
  height: 'auto',
  justifyContent: 'flex-start',
};

export const balanceFooterStyle: CSSProperties = {
  flexWrap: 'wrap',
  paddingTop: '0.6rem',
  borderTop: '1px dashed var(--border-color, rgba(148, 163, 184, 0.35))',
  fontVariantNumeric: 'tabular-nums',
};

export const balanceBalancedStyle: CSSProperties = { color: '#047857' };

export const balanceUnbalancedStyle: CSSProperties = { color: '#b91c1c' };

export const subTotalCellStyle: CSSProperties = {
  background: 'color-mix(in srgb, var(--card-bg, #fff) 88%, var(--border-color, #e2e8f0))',
  fontWeight: 700,
};

export const grandTotalCellStyle: CSSProperties = {
  background: 'color-mix(in srgb, #2563eb 9%, transparent)',
  fontWeight: 800,
};

export const groupHeadingCellStyle: CSSProperties = {
  fontWeight: 800,
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-secondary, #64748b)',
};
