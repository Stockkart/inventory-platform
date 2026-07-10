import type { CSSProperties } from 'react';

export const menuSellPageShell: CSSProperties = {
  minHeight: 'calc(100vh - 2rem)',
  paddingBottom: '1rem',
};

export const searchRowStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  marginBottom: '1rem',
};

export const searchInputWrapperStyle: CSSProperties = {
  padding: '0.5rem 0.75rem',
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  borderRadius: 8,
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

export const searchInputWrapperFocusedStyle: CSSProperties = {
  borderColor: '#3b82f6',
  boxShadow: '0 0 0 2px var(--focus-ring)',
};

export const searchInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  background: 'transparent',
  padding: '0.35rem 0',
  fontSize: '0.95rem',
  boxShadow: 'none',
};

export const dropdownListStyle: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: '0.5rem',
  minWidth: 0,
};

export const dropdownItemStyle: CSSProperties = {
  padding: '0.65rem 0.75rem',
  background: 'var(--bg-primary)',
  maxWidth: '100%',
  minWidth: 0,
  textAlign: 'left',
  cursor: 'default',
  borderRadius: 8,
  marginBottom: '0.5rem',
  border: '1px solid var(--border-color)',
  boxSizing: 'border-box',
};

export const dropdownItemNameStyle: CSSProperties = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export const cartSectionStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
};

export const cartItemsStyle: CSSProperties = {
  flex: 1,
  overflow: 'auto',
};

export const cartActionsStyle: CSSProperties = {
  marginTop: 'auto',
  paddingTop: '1rem',
  borderTop: '1px solid var(--border-color)',
};

export const customerBlockStyle: CSSProperties = {
  border: '1px solid var(--border-color)',
  borderRadius: 8,
  background: 'var(--bg-primary)',
  overflow: 'hidden',
};

export const customerToggleStyle: CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  justifyContent: 'flex-start',
  textAlign: 'left',
};

export const customerToggleValueStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--text-secondary)',
};

export const customerToggleIconStyle: CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--text-tertiary)',
  flexShrink: 0,
};

export const customerFormStyle: CSSProperties = {
  padding: '0 0.85rem 0.85rem',
  borderTop: '1px solid var(--border-color)',
};

export const customerInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
};

export const sidebarSearchBtnStyle: CSSProperties = {
  width: 40,
  flexShrink: 0,
};
