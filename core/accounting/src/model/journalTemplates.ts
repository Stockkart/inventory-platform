import { ACCOUNT_CODES } from './accountingConstants';

export type JournalTemplateId =
  | 'CASH_TO_BANK'
  | 'BANK_TO_CASH'
  | 'EXPENSE_CASH'
  | 'EXPENSE_BANK'
  | 'OTHER_INCOME_BANK'
  | 'CUSTOMER_RECEIPT'
  | 'VENDOR_PAYMENT'
  | 'BLANK';

export interface JournalTemplateLine {
  accountCode: string;
  debit: string;
  credit: string;
  memo?: string;
}

export interface JournalTemplate {
  id: JournalTemplateId;
  label: string;
  description: string;
  narration: string;
  lines: JournalTemplateLine[];
}

export const JOURNAL_TEMPLATES: JournalTemplate[] = [
  {
    id: 'CASH_TO_BANK',
    label: 'Cash → Bank',
    description: 'Deposit cash into the bank',
    narration: 'Cash deposited to bank',
    lines: [
      { accountCode: ACCOUNT_CODES.BANK, debit: '', credit: '' },
      { accountCode: ACCOUNT_CODES.CASH, debit: '', credit: '' },
    ],
  },
  {
    id: 'BANK_TO_CASH',
    label: 'Bank → Cash',
    description: 'Withdraw cash for counter / petty cash',
    narration: 'Cash withdrawn from bank',
    lines: [
      { accountCode: ACCOUNT_CODES.CASH, debit: '', credit: '' },
      { accountCode: ACCOUNT_CODES.BANK, debit: '', credit: '' },
    ],
  },
  {
    id: 'EXPENSE_CASH',
    label: 'Expense (cash)',
    description: 'Pay an expense from cash — pick expense account on line 1',
    narration: 'Expense paid in cash',
    lines: [
      { accountCode: ACCOUNT_CODES.OTHER_OPERATING_EXPENSES, debit: '', credit: '' },
      { accountCode: ACCOUNT_CODES.CASH, debit: '', credit: '' },
    ],
  },
  {
    id: 'EXPENSE_BANK',
    label: 'Expense (bank)',
    description: 'Pay an expense from bank',
    narration: 'Expense paid from bank',
    lines: [
      { accountCode: ACCOUNT_CODES.OTHER_OPERATING_EXPENSES, debit: '', credit: '' },
      { accountCode: ACCOUNT_CODES.BANK, debit: '', credit: '' },
    ],
  },
  {
    id: 'OTHER_INCOME_BANK',
    label: 'Other income (bank)',
    description: 'Misc income received in bank',
    narration: 'Other income received',
    lines: [
      { accountCode: ACCOUNT_CODES.BANK, debit: '', credit: '' },
      { accountCode: ACCOUNT_CODES.SALES, debit: '', credit: '' },
    ],
  },
  {
    id: 'CUSTOMER_RECEIPT',
    label: 'Customer payment',
    description: 'Customer pays you (cash) — reduces receivable',
    narration: 'Customer payment received',
    lines: [
      { accountCode: ACCOUNT_CODES.CASH, debit: '', credit: '' },
      {
        accountCode: ACCOUNT_CODES.SUNDRY_DEBTORS,
        debit: '',
        credit: '',
        memo: 'Select customer below',
      },
    ],
  },
  {
    id: 'VENDOR_PAYMENT',
    label: 'Vendor payment',
    description: 'Pay vendor from bank — reduces payable',
    narration: 'Payment to vendor',
    lines: [
      {
        accountCode: ACCOUNT_CODES.SUNDRY_CREDITORS,
        debit: '',
        credit: '',
        memo: 'Select vendor below',
      },
      { accountCode: ACCOUNT_CODES.BANK, debit: '', credit: '' },
    ],
  },
  {
    id: 'BLANK',
    label: 'Blank',
    description: 'Start with two empty lines',
    narration: '',
    lines: [
      { accountCode: '', debit: '', credit: '' },
      { accountCode: '', debit: '', credit: '' },
    ],
  },
];

export function getTemplate(id: JournalTemplateId): JournalTemplate {
  return (
    JOURNAL_TEMPLATES.find((t) => t.id === id) ?? JOURNAL_TEMPLATES[JOURNAL_TEMPLATES.length - 1]!
  );
}
