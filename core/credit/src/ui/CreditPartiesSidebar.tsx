import { useMemo, useState } from 'react';
import type { CreditAccountResponse } from '@inventory-platform/credit/types';
import { Box, Button, Input, Text } from '@inventory-platform/ui-kit';
import { CreditAccountList } from './CreditAccountList';
import { accountSort, presentCreditBalance } from '../model/credit-utils';
import styles from './credit.module.css';

type Props = {
  allAccounts: CreditAccountResponse[];
  pendingAccounts: CreditAccountResponse[];
  favourAccounts: CreditAccountResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Message when the “Due now” list has no rows (depends on shop-wide empty vs none due). */
  pendingListEmptyMessage: string;
};

export function CreditPartiesSidebar({
  allAccounts,
  pendingAccounts,
  favourAccounts,
  selectedId,
  onSelect,
  pendingListEmptyMessage,
}: Props) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const searchMatches = useMemo(() => {
    if (!q) return [];
    return allAccounts
      .filter(
        (a) =>
          (a.partyDisplayName && a.partyDisplayName.toLowerCase().includes(q)) ||
          (a.partyType && a.partyType.toLowerCase().includes(q)) ||
          (a.partyId && a.partyId.toLowerCase().includes(q))
      )
      .sort(accountSort)
      .slice(0, 14);
  }, [allAccounts, q]);

  function pickParty(id: string) {
    onSelect(id);
    setQuery('');
  }

  return (
    <Box className={styles.partiesSidebar}>
      <Text variant="title" className={styles.partiesSidebarTitle}>
        Outstanding
      </Text>
      <Text className={styles.sidebarHint}>
        <strong>Customer</strong> rows are money <em>to collect</em>.{' '}
        <strong>Vendor</strong> rows are money <em>you must pay</em>. Search finds anyone to view
        past ledger entries, including fully settled parties.
      </Text>

      <Box className={styles.partySearchWrap}>
        <Input
          id="credit-party-search"
          type="search"
          aria-label="Search any party"
          className={styles.partySearchInput}
          placeholder="Search any party…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        {q ? (
          searchMatches.length > 0 ? (
            <Box as="ul" className={styles.searchResults} role="listbox">
              {searchMatches.map((a) => {
                const pr = presentCreditBalance(a);
                return (
                  <Box as="li" key={a.id}>
                    <Button
                      type="button"
                      variant="ghost"
                      className={styles.searchResultBtn}
                      role="option"
                      aria-selected={selectedId === a.id}
                      onClick={() => pickParty(a.id)}
                    >
                      <Box as="span" className={styles.searchResultName}>
                        {a.partyDisplayName}
                      </Box>
                      <Box as="span" className={styles.searchResultMeta}>
                        {a.partyType === 'CUSTOMER' ? 'Customer' : 'Vendor'} ·{' '}
                        {pr.tone === 'settled' ? 'Settled' : `${pr.headline} ${pr.amountLine}`}
                      </Box>
                    </Button>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Text className={styles.searchEmpty}>No party matches.</Text>
          )
        ) : null}
      </Box>

      <Text variant="heading3" className={styles.sidebarSubheading}>
        Still open
      </Text>
      <CreditAccountList
        accounts={pendingAccounts}
        selectedId={selectedId}
        onSelect={onSelect}
        emptyMessage={pendingListEmptyMessage}
      />

      {favourAccounts.length > 0 ? (
        <>
          <Text variant="heading3" className={styles.sidebarSubheading}>
            In your favour
          </Text>
          <Text className={styles.sidebarHint}>
            Often from a <strong>return on credit</strong> when you had little or no payable left
            — the supplier owes you (vendor credit) or the customer paid ahead.
          </Text>
          <CreditAccountList
            accounts={favourAccounts}
            selectedId={selectedId}
            onSelect={onSelect}
            emptyMessage=""
          />
        </>
      ) : null}
    </Box>
  );
}
