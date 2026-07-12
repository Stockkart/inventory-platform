import { useMemo, useState } from 'react';
import type { CreditAccountResponse } from '@inventory-platform/credit/types';
import { Box, Button, Input, Stack, Text, surfaceChrome } from '@inventory-platform/ui-kit';
import { CreditAccountList } from './CreditAccountList';
import { accountSort, presentCreditBalance } from '../model/credit-utils';

type Props = {
  allAccounts: CreditAccountResponse[];
  pendingAccounts: CreditAccountResponse[];
  favourAccounts: CreditAccountResponse[];
  selectedId: string | null;
  onSelect: (id: string) => void;
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
          (a.partyId && a.partyId.toLowerCase().includes(q)),
      )
      .sort(accountSort)
      .slice(0, 14);
  }, [allAccounts, q]);

  function pickParty(id: string) {
    onSelect(id);
    setQuery('');
  }

  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Text variant="title" weight="semibold">
          Outstanding
        </Text>
        <Text as="p" variant="caption" color="secondary">
          Customers you collect from, vendors you pay. Search includes settled parties.
        </Text>
      </Stack>

      <Box position="relative">
        <Input
          id="credit-party-search"
          type="search"
          aria-label="Search any party"
          placeholder="Search any party…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        {q ? (
          searchMatches.length > 0 ? (
            <Box
              as="ul"
              role="listbox"
              margin="sm"
              border
              rounded="md"
              bg="elevated"
              overflow="auto"
              padding="none"
              className={surfaceChrome.listPlainScroll}
            >
              {searchMatches.map((a) => {
                const pr = presentCreditBalance(a);
                return (
                  <Box as="li" key={a.id}>
                    <Button
                      type="button"
                      variant="ghost"
                      role="option"
                      aria-selected={selectedId === a.id}
                      onClick={() => pickParty(a.id)}
                      fullWidth
                      align="start"
                      className={surfaceChrome.radiusNone}
                    >
                      <Stack gap="none">
                        <Text weight="semibold">{a.partyDisplayName}</Text>
                        <Text variant="caption" color="secondary">
                          {a.partyType === 'CUSTOMER' ? 'Customer' : 'Vendor'} ·{' '}
                          {pr.tone === 'settled' ? 'Settled' : `${pr.headline} ${pr.amountLine}`}
                        </Text>
                      </Stack>
                    </Button>
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Text as="p" variant="caption" color="secondary">
              No party matches.
            </Text>
          )
        ) : null}
      </Box>

      <Stack gap="sm">
        <Text variant="heading3" weight="semibold">
          Still open
        </Text>
        <CreditAccountList
          accounts={pendingAccounts}
          selectedId={selectedId}
          onSelect={onSelect}
          emptyMessage={pendingListEmptyMessage}
        />
      </Stack>

      {favourAccounts.length > 0 ? (
        <Stack gap="sm">
          <Text variant="heading3" weight="semibold">
            In your favour
          </Text>
          <CreditAccountList
            accounts={favourAccounts}
            selectedId={selectedId}
            onSelect={onSelect}
            emptyMessage=""
          />
        </Stack>
      ) : null}
    </Stack>
  );
}
