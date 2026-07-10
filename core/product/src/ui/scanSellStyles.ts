import type { CSSProperties } from 'react';

export const scanSellPageShell: CSSProperties = {
  minHeight: 'calc(100vh - 2rem)',
  paddingBottom: '1rem',
};

export const scanSellCafePageShell: CSSProperties = {
  maxWidth: 1400,
  margin: '0 auto',
  minHeight: 'calc(100vh - 2rem)',
  paddingBottom: '5.75rem',
};

export const searchRowStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  marginBottom: '1rem',
};

export const searchRowCafeStyle: CSSProperties = {
  flexShrink: 0,
  marginBottom: '0.65rem',
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

export const viewToggleActiveStyle: CSSProperties = {
  borderColor: '#3b82f6',
  background: 'rgba(59, 130, 246, 0.1)',
  color: '#3b82f6',
  fontWeight: 500,
};

export const itemEditFieldsStyle: CSSProperties = {
  minWidth: 0,
  width: '100%',
};

export const itemPriceBlockStyle: CSSProperties = {
  flexWrap: 'nowrap',
  minWidth: 0,
  width: '100%',
};

export const itemSellingPriceInputStyle: CSSProperties = {
  width: '5.25rem',
  flex: '0 0 auto',
  padding: '0.4rem 0.5rem',
  border: '1px solid var(--border-color)',
  borderRadius: 6,
  fontSize: '0.875rem',
  fontWeight: 500,
  textAlign: 'right',
};

export const itemAdditionalInputStyle: CSSProperties = {
  width: '100%',
  maxWidth: '7rem',
  padding: '0.4rem 0.5rem',
  border: '1px solid var(--border-color)',
  borderRadius: 6,
  fontSize: '0.875rem',
  fontWeight: 500,
  textAlign: 'right',
};

export const itemRateSelectStyle: CSSProperties = {
  flex: '1 1 8rem',
  minWidth: '7rem',
  fontSize: '0.8rem',
  padding: '0.4rem 0.5rem',
  border: '1px solid var(--border-color)',
  borderRadius: 6,
};

export const itemUnitSelectStyle: CSSProperties = {
  fontSize: '0.82rem',
  width: '100%',
  minWidth: 0,
  padding: '0.4rem 0.5rem',
  border: '1px solid var(--border-color)',
  borderRadius: 6,
};

export const itemSaleRowInlineStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '0.75rem 1rem',
  alignItems: 'end',
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

export const customerBlockCafeStyle: CSSProperties = {
  flexShrink: 0,
  margin: '0.75rem 0.75rem 0',
  borderRadius: 10,
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

export const cartLineStyle: CSSProperties = {
  padding: '0.7rem 0.85rem',
  border: '1px solid var(--border-color)',
  borderRadius: 10,
  background: 'var(--bg-card, #fff)',
};

export const cartLineMenuStyle: CSSProperties = {
  borderLeft: '3px solid #3b82f6',
};

export const cartLineStockStyle: CSSProperties = {
  borderLeft: '3px solid #22c55e',
};

export const cartLineMetaStyle: CSSProperties = {
  fontSize: '0.78rem',
};

export const detailModalContentStyle: CSSProperties = {
  width: '95%',
  maxWidth: 600,
  maxHeight: 'calc(100vh - 200px)',
};

export const detailModalHeaderStyle: CSSProperties = {
  flexShrink: 0,
  padding: '1.5rem 1.75rem',
  borderBottom: '1px solid var(--border-color)',
};

export const detailModalBodyStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: '1.75rem',
};

export const detailModalSectionStyle: CSSProperties = {
  marginBottom: '2rem',
  paddingBottom: '1.5rem',
  borderBottom: '1px solid var(--border-color)',
};

export const detailCardStyle: CSSProperties = {
  padding: '1rem',
  background: 'rgba(0, 0, 0, 0.02)',
  border: '1px solid var(--border-color)',
  borderRadius: 12,
};

export const detailPricingCardStyle: CSSProperties = {
  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(6, 182, 212, 0.08))',
  borderColor: 'rgba(59, 130, 246, 0.2)',
};

export const detailPriceValueStyle: CSSProperties = {
  color: '#10b981',
  fontWeight: 700,
};

export const detailMrpValueStyle: CSSProperties = {
  color: '#6366f1',
  fontWeight: 600,
};

export const detailTotalValueStyle: CSSProperties = {
  fontWeight: 700,
};

export const cafeSellWorkspaceStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.45fr) minmax(300px, 400px)',
  gap: '1rem',
  minHeight: 'min(calc(100vh - 14rem), 780px)',
};

export const cafePickerColumnStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
};

export const cafePickerSectionStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
};

export const cafeOrderColumnStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: 12,
  overflow: 'hidden',
};

export const cafeOrderPanelStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  margin: '0.75rem',
  overflow: 'hidden',
};

export const cafeOrderCountStyle: CSSProperties = {
  fontSize: '0.72rem',
};

export const cafeOrderListStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  scrollbarWidth: 'thin',
};

export const cafeOrderEmptyStyle: CSSProperties = {
  flex: 1,
  textAlign: 'center',
  fontSize: '0.88rem',
};

export const cafeAnalyticsStyle: CSSProperties = {
  flexShrink: 0,
  margin: '0 0.75rem 0.75rem',
  fontSize: '0.82rem',
};

export const cafeCheckoutBarInnerStyle: CSSProperties = {
  width: '100%',
  maxWidth: 1400,
  margin: '0 auto',
};

export const cafeCheckoutTotalValueStyle: CSSProperties = {
  fontSize: '1.35rem',
};

export const cafeCheckoutPayBtnStyle: CSSProperties = {
  minWidth: 160,
  whiteSpace: 'nowrap',
};
