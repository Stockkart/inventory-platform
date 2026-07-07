import type { CreditAccountResponse } from '@inventory-platform/credit/types';
import { Box, Button, Text } from '@inventory-platform/ui-kit';
import type { CreditBalanceTone } from '../model/credit-utils';
import { presentCreditBalance } from '../model/credit-utils';
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
    return <Text className={styles.empty}>{emptyMessage}</Text>;
  }

  return (
    <Box as="ul" className={styles.accountList}>
      {accounts.map((a) => {
        const active = a.id === selectedId;
        const pr = presentCreditBalance(a);
        return (
          <Box as="li" key={a.id}>
            <Button
              type="button"
              variant="ghost"
              className={`${styles.accountBtn} ${active ? styles.accountBtnActive : ''}`}
              onClick={() => onSelect(a.id)}
            >
              <Box as="span" className={styles.accountName}>
                {a.partyDisplayName}
              </Box>
              <Box as="span" className={styles.accountRole}>
                {a.partyType === 'CUSTOMER'
                  ? 'Customer — you collect from them'
                  : 'Vendor — you pay them'}
              </Box>
              <Box as="span" className={`${styles.accountBal} ${toneClass(pr.tone)}`}>
                <Box as="span" className={styles.accountBalHeadline}>
                  {pr.headline}
                </Box>
                {pr.tone !== 'settled' ? (
                  <Box as="span" className={styles.accountBalAmt}>
                    {pr.amountLine}
                  </Box>
                ) : null}
              </Box>
            </Button>
          </Box>
        );
      })}
    </Box>
  );
}
