/** System chart-of-accounts codes (must match backend {@code SystemAccountCode}). */
export const ACCOUNT_CODES = {
  CASH: '1100',
  BANK: '1110',
  CARD_CLEARING: '1120',
  UPI_CLEARING: '1130',
  SUNDRY_DEBTORS: '1200',
  INVENTORY: '1300',
  INPUT_CGST: '1400',
  INPUT_SGST: '1410',
  SUNDRY_CREDITORS: '2100',
  OWNERS_CAPITAL: '3100',
  RETAINED_EARNINGS: '3200',
  SALES: '4100',
  OTHER_OPERATING_EXPENSES: '5900',
} as const;

export function isDebtorsAccount(code: string): boolean {
  return code === ACCOUNT_CODES.SUNDRY_DEBTORS;
}

export function isCreditorsAccount(code: string): boolean {
  return code === ACCOUNT_CODES.SUNDRY_CREDITORS;
}

export function needsPartyOnLine(accountCode: string): boolean {
  return isDebtorsAccount(accountCode) || isCreditorsAccount(accountCode);
}
