import { useRef } from 'react';
import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { cafeKotApi, cafeTabApi } from '../api/cafe-kot.api';
import { keyAfter, newKey } from '../lib/punchBasket';
import { clearPunchKey, readPunchKey, writePunchKey } from '../lib/punchKeyStore';
import type { CafeKot } from '../types/kot';
import type { CafeFlushTarget, CafeTab } from '../types/tab';
import { cafeTabKeys } from './keys';
import { outcomeOf } from './outcome';

/**
 * Runs a mutation whose request carries a non-blank Idempotency-Key that must survive one
 * attempt exactly: every call to `mutate()` while that attempt is unsettled (including a
 * caller-driven retry after a server or network error) resends the same key, so a retry can
 * never repeat the effect twice. A success or a 4xx settles the attempt and drops the key,
 * so whatever happens next gets a fresh one — see `keyAfter` in `lib/punchBasket.ts` for the
 * retention rule itself.
 *
 * The key is written to `sessionStorage` (`lib/punchKeyStore.ts`), keyed by `scopeId`,
 * *before* the request goes out and removed once it settles. A ref alone is not enough: the
 * component driving this can remount when `scopeId` changes and is destroyed by a reload, so
 * a request whose response never arrived would leave the server holding an effect (tickets
 * punched, or flushed) that the client can no longer reach — press the button again and the
 * server, correctly, finds nothing new to do, while nothing has printed. Replaying the
 * parked key makes the server replay its answer instead.
 *
 * Shared by `usePunchMutation`, `useFlushTabMutation` and `useReprintKotMutation` — one
 * scope id (a purchase, a tab, or a ticket) per caller, one request shape per caller.
 */
function useIdempotentMutation<TData, TVariables>(
  scopeId: string,
  request: (idempotencyKey: string, variables: TVariables) => Promise<TData>,
): UseMutationResult<TData, unknown, TVariables> {
  const keyRef = useRef<string | null>(null);

  return useMutation<TData, unknown, TVariables>({
    mutationFn: (variables: TVariables) => {
      const key = keyRef.current ?? readPunchKey(scopeId) ?? newKey();
      keyRef.current = key;
      // Parked before the request, not after: the case this exists for is the response
      // that never comes back.
      writePunchKey(scopeId, key);
      return request(key, variables);
    },
    onSettled: (_data, error) => {
      const outcome = error ? outcomeOf(error) : 'SUCCESS';
      const retained = keyRef.current ? keyAfter(outcome, keyRef.current) : null;
      keyRef.current = retained;
      if (retained) {
        writePunchKey(scopeId, retained);
      } else {
        clearPunchKey(scopeId);
      }
    },
  });
}

/** Punches the pending round for `purchaseId` to the kitchen. See `useIdempotentMutation`. */
export function usePunchMutation(purchaseId: string): UseMutationResult<CafeKot[], unknown, void> {
  return useIdempotentMutation<CafeKot[], void>(purchaseId, (key) =>
    cafeKotApi.punch(purchaseId, key),
  );
}

/** The cashier's open KOT tabs. */
export function useCafeTabsQuery(options?: { enabled?: boolean }): UseQueryResult<CafeTab[]> {
  return useQuery<CafeTab[]>({
    queryKey: cafeTabKeys.list(),
    queryFn: () => cafeTabApi.list(),
    enabled: options?.enabled,
  });
}

/**
 * One tab from the cashier's open list. There is no GET-by-id endpoint — a tab is only ever
 * reached through the list the cashier already owns — so this selects out of the same query
 * (and cache) as `useCafeTabsQuery` rather than issuing a second request.
 */
export function useCafeTabQuery(
  tabId: string | undefined,
): UseQueryResult<CafeTab | undefined, unknown> {
  return useQuery<CafeTab[], unknown, CafeTab | undefined>({
    queryKey: cafeTabKeys.list(),
    queryFn: () => cafeTabApi.list(),
    enabled: Boolean(tabId),
    select: (tabs) => tabs.find((tab) => tab.id === tabId),
  });
}

/**
 * Flushes `tabId`: claims its lines, tickets them to the kitchen, appends them to `target`,
 * and empties the tab. Requires the same parked-key discipline as `usePunchMutation` — see
 * `useIdempotentMutation` and `lib/punchKeyStore.ts`. A flush whose response is lost must
 * replay the exact key the server already saw, or the tickets it created become unreachable.
 */
export function useFlushTabMutation(
  tabId: string,
): UseMutationResult<CafeKot[], unknown, CafeFlushTarget> {
  return useIdempotentMutation<CafeKot[], CafeFlushTarget>(tabId, (key, target) =>
    cafeTabApi.flush(tabId, target, key),
  );
}

/** Reprints ticket `kotId`. Creates no new ticket; the slip stamps REPRINT. */
export function useReprintKotMutation(kotId: string): UseMutationResult<CafeKot, unknown, void> {
  return useIdempotentMutation<CafeKot, void>(kotId, (key) => cafeKotApi.reprint(kotId, key));
}

export { keyAfter, outcomeOf };
