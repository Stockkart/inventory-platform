import { useMemo, useState } from 'react';
import type { CreditAccountResponse } from '@inventory-platform/credit/types';
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
    <div className={styles.partiesSidebar}>
      <h2 className={styles.partiesSidebarTitle}>Outstanding</h2>
      <p className={styles.sidebarHint}>
        <strong>Customer</strong> rows are money <em>to collect</em>.{' '}
        <strong>Vendor</strong> rows are money <em>you must pay</em>. Search finds anyone to view
        past ledger entries, including fully settled parties.
      </p>

      <div className={styles.partySearchWrap}>
        <label htmlFor="credit-party-search" className={styles.srOnly}>
          Search any party
        </label>
        <input
          id="credit-party-search"
          type="search"
          className={styles.partySearchInput}
          placeholder="Search any party…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        {q ? (
          searchMatches.length > 0 ? (
            <ul className={styles.searchResults} role="listbox">
              {              searchMatches.map((a) => {
                const pr = presentCreditBalance(a);
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      className={styles.searchResultBtn}
                      role="option"
                      aria-selected={selectedId === a.id}
                      onClick={() => pickParty(a.id)}
                    >
                      <span className={styles.searchResultName}>{a.partyDisplayName}</span>
                      <span className={styles.searchResultMeta}>
                        {a.partyType === 'CUSTOMER' ? 'Customer' : 'Vendor'} ·{' '}
                        {pr.tone === 'settled' ? 'Settled' : `${pr.headline} ${pr.amountLine}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.searchEmpty}>No party matches.</p>
          )
        ) : null}
      </div>

      <h3 className={styles.sidebarSubheading}>Still open</h3>
      <CreditAccountList
        accounts={pendingAccounts}
        selectedId={selectedId}
        onSelect={onSelect}
        emptyMessage={pendingListEmptyMessage}
      />

      {favourAccounts.length > 0 ? (
        <>
          <h3 className={styles.sidebarSubheading}>In your favour</h3>
          <p className={styles.sidebarHint}>
            Often from a <strong>return on credit</strong> when you had little or no payable left
            — the supplier owes you (vendor credit) or the customer paid ahead.
          </p>
          <CreditAccountList
            accounts={favourAccounts}
            selectedId={selectedId}
            onSelect={onSelect}
            emptyMessage=""
          />
        </>
      ) : null}
    </div>
  );
}
