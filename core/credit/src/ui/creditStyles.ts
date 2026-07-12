import type { CSSProperties } from 'react';

export type BalanceTone = 'collect' | 'pay' | 'advance_customer' | 'advance_vendor' | 'settled';

export const accountBalToneStyle: Record<BalanceTone, CSSProperties> = {
  collect: { color: '#065f46' },
  pay: { color: '#9a3412' },
  advance_customer: { color: '#0c4a6e' },
  advance_vendor: { color: '#1e40af' },
  settled: { color: 'var(--sk-color-text-secondary)' },
};

export const accountBalHeadlineStyle: Record<BalanceTone, CSSProperties> = {
  collect: { color: '#047857' },
  pay: { color: '#b45309' },
  advance_customer: { color: '#0369a1' },
  advance_vendor: { color: '#1d4ed8' },
  settled: { color: 'var(--sk-color-text-secondary)', fontWeight: 600 },
};

export const contextBalBlockStyle: Record<BalanceTone, CSSProperties> = {
  collect: {
    borderColor: 'color-mix(in srgb, #059669 35%, var(--sk-color-border-default))',
    background: 'color-mix(in srgb, #059669 9%, var(--sk-color-bg-elevated))',
  },
  pay: {
    borderColor: 'color-mix(in srgb, #d97706 40%, var(--sk-color-border-default))',
    background: 'color-mix(in srgb, #d97706 10%, var(--sk-color-bg-elevated))',
  },
  advance_customer: {
    borderColor: 'color-mix(in srgb, #0284c7 35%, var(--sk-color-border-default))',
    background: 'color-mix(in srgb, #0284c7 8%, var(--sk-color-bg-elevated))',
  },
  advance_vendor: {
    borderColor: 'color-mix(in srgb, #2563eb 40%, var(--sk-color-border-default))',
    background: 'color-mix(in srgb, #2563eb 10%, var(--sk-color-bg-elevated))',
  },
  settled: { borderStyle: 'dashed', opacity: 0.95 },
};

export const contextBalLabelStyle: Record<BalanceTone, CSSProperties> = {
  collect: { color: '#047857' },
  pay: { color: '#b45309' },
  advance_customer: { color: '#0369a1' },
  advance_vendor: { color: '#1d4ed8' },
  settled: { color: 'var(--sk-color-text-secondary)', fontWeight: 600 },
};

export const actionTabStyle = (active: boolean): CSSProperties => ({
  flex: 1,
  border: 'none',
  borderRadius: 8,
  background: active ? 'var(--sk-color-bg-elevated)' : 'transparent',
  color: active ? 'var(--sk-color-text-primary)' : 'var(--sk-color-text-secondary)',
  boxShadow: active ? '0 1px 3px rgba(15, 23, 42, 0.08)' : undefined,
  fontWeight: 600,
  fontSize: '0.78rem',
  padding: '0.45rem 0.4rem',
  cursor: 'pointer',
});

export const timelineReturnStyle: CSSProperties = {
  borderColor: 'rgba(16, 185, 129, 0.45)',
  background: 'rgba(16, 185, 129, 0.06)',
};

export const accountBtnStyle = (active: boolean): CSSProperties => ({
  width: '100%',
  textAlign: 'left',
  justifyContent: 'flex-start',
  justifyItems: 'start',
  border: active ? '1px solid #2563eb' : '1px solid var(--sk-color-border-default)',
  background: active ? 'rgba(59, 130, 246, 0.08)' : 'var(--sk-color-bg-elevated)',
  borderRadius: 10,
  padding: '0.65rem 0.7rem',
  cursor: 'pointer',
  display: 'grid',
  gap: '0.2rem',
});
