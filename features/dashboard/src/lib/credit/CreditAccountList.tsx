import type { CreditAccountResponse } from '@inventory-platform/types';
import type { CreditBalanceTone } from './credit-utils';
import { presentCreditBalance } from './credit-utils';
import styles from './credit.module.css';

type Props = {
  accounts: CreditAccountResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Shown when the filtered list is empty (e.g. no dues); not used for global empty shop state. */
  emptyMessage?: string;
};

function toneClass(tone: CreditBalanceTone): string {
  const m: Record<CreditBalanceTone, string> = {
    collect: styles.balCollect,
    pay: styles.balPay,
    advance_customer: styles.balAdvCustomer,
    advance_vendor: styles.balAdvVendor,
    settled: styles.balSettled,
  };
  return m[tone];
}

export function CreditAccountList({
  accounts,
  selectedId,
  onSelect,
  emptyMessage = 'No credit accounts yet. Add a charge or settlement first.',
}: Props) {
  if (!accounts.length) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  return (
    <ul className={styles.accountList}>
      {accounts.map((a) => {
        const active = a.id === selectedId;
        const pr = presentCreditBalance(a);
        return (
          <li key={a.id}>
            <button
              type="button"
              className={`${styles.accountBtn} ${active ? styles.accountBtnActive : ''}`}
              onClick={() => onSelect(a.id)}
            >
              <span className={styles.accountName}>{a.partyDisplayName}</span>
              <span className={styles.accountRole}>
                {a.partyType === 'CUSTOMER'
                  ? 'Customer — you collect from them'
                  : 'Vendor — you pay them'}
              </span>
              <span className={`${styles.accountBal} ${toneClass(pr.tone)}`}>
                <span className={styles.accountBalHeadline}>{pr.headline}</span>
                {pr.tone !== 'settled' ? (
                  <span className={styles.accountBalAmt}>{pr.amountLine}</span>
                ) : null}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
