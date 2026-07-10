import type {
  CreditAccountResponse,
  CreditEntryResponse,
  CreditPartyType,
} from '@inventory-platform/credit/types';
export function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n ?? 0);
}

export type CreditBalanceTone =
  | 'collect'
  | 'pay'
  | 'advance_customer'
  | 'advance_vendor'
  | 'settled';

/** How a balance reads for customers (they pay you) vs vendors (you pay them). */
export function presentCreditBalance(
  account: Pick<CreditAccountResponse, 'partyType' | 'currentBalance'>,
): {
  tone: CreditBalanceTone;
  /** Short row label: “Owes you” (customer) / “You owe” (vendor) when money is due. */
  headline: string;
  /** Formatted Rs line */
  amountLine: string;
} {
  const raw = account.currentBalance;
  const bal = typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
  const party = (account.partyType ?? 'CUSTOMER') as CreditPartyType;
  const abs = formatMoney(Math.abs(bal));

  if (Math.abs(bal) < 0.0001) {
    return {
      tone: 'settled',
      headline: 'Settled',
      amountLine: '₹ 0.00',
    };
  }

  if (party === 'CUSTOMER') {
    if (bal > 0) {
      return {
        tone: 'collect',
        headline: 'Owes you',
        amountLine: `₹ ${abs}`,
      };
    }
    return {
      tone: 'advance_customer',
      headline: 'They paid ahead',
      amountLine: `₹ ${abs}`,
    };
  }

  if (bal > 0) {
    return {
      tone: 'pay',
      headline: 'You owe',
      amountLine: `₹ ${abs}`,
    };
  }
  return {
    tone: 'advance_vendor',
    headline: 'Vendor credit',
    amountLine: `₹ ${abs}`,
  };
}

/** Compact single string when party type is unknown. */
export function balanceLabel(balance: number, partyType?: CreditPartyType): string {
  if (partyType) {
    const p = presentCreditBalance({ partyType, currentBalance: balance });
    return p.headline === 'Settled' ? 'Settled' : `${p.headline} · ${p.amountLine}`;
  }
  if (balance > 0) return `₹ ${formatMoney(balance)} due`;
  if (balance < 0) return `₹ ${formatMoney(Math.abs(balance))} advance`;
  return 'Settled';
}

export function accountSort(a: CreditAccountResponse, b: CreditAccountResponse): number {
  return (b.lastEntryAt ?? '').localeCompare(a.lastEntryAt ?? '');
}

/** Local calendar date as {@code yyyy-mm-dd} for settlement txn date defaults. */
export function todayLocalDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Wording for tabs, hints, and primary buttons by customer vs vendor credit. */
/** Headline + subtitle for one ledger row on the Credit page. */
export function formatCreditLedgerEntry(
  entry: CreditEntryResponse,
  partyType: CreditPartyType,
): { title: string; subtitle: string } {
  const isReturnRow =
    entry.entryType === 'RETURN' ||
    (entry.sourceKey?.toUpperCase().startsWith('RETURN:CREDIT:') ?? false);
  const isVendor = partyType === 'VENDOR';

  if (isReturnRow) {
    const viaReturn =
      entry.referenceType === 'VENDOR_RETURN' || isVendor ? 'Purchase return' : 'Sales return';
    return {
      title: viaReturn,
      subtitle: isVendor
        ? 'Credit applied — you owe this vendor less (same as recording a payment on account).'
        : 'Credit applied — customer owes you less.',
    };
  }

  if (entry.entryType === 'SETTLEMENT') {
    return {
      title: isVendor ? 'You paid them' : 'They paid you',
      subtitle: entry.paymentMethod ? `Settlement · ${entry.paymentMethod}` : 'Settlement',
    };
  }

  if (entry.entryType === 'CHARGE') {
    return {
      title: isVendor ? 'You owe more' : 'They owe more',
      subtitle: 'Charge on credit',
    };
  }

  return {
    title: entry.entryType,
    subtitle: entry.note?.trim() || '—',
  };
}

export function creditActionCopy(partyType: CreditPartyType) {
  if (partyType === 'CUSTOMER') {
    return {
      tabIncrease: 'They owe more',
      tabReduce: 'They paid you',
      hintIncrease:
        'Increases the amount this customer still needs to pay you (sale on credit, fee, etc.).',
      hintReduce: 'Record money you received from them — cash, UPI, bank, or adjustment.',
      submitIncrease: 'Add to amount due',
      submitReduce: 'Record payment received',
    };
  }
  return {
    tabIncrease: 'You owe more',
    tabReduce: 'You paid them',
    hintIncrease:
      'Increases what you still owe this supplier (another stock-in on credit, charges, etc.).',
    hintReduce: 'Record a payment or adjustment you made to this vendor.',
    submitIncrease: 'Add payable',
    submitReduce: 'Record payment made',
  };
}
