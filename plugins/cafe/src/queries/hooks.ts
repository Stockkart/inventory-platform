import { useRef } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { cafeKotApi, cafeTabApi } from '../api/cafe-kot.api';
import { keyAfter, newKey } from '../lib/idempotencyAttempt';
import { clearPunchKey, readPunchKey, writePunchKey } from '../lib/punchKeyStore';
import type { CafeKot } from '../types/kot';
import type { CafeFlushTarget, CafeTab, CafeTabLineInput } from '../types/tab';
import { cafeTabKeys } from './keys';
import { outcomeOf } from './outcome';

/**
 * Runs a mutation whose request carries a non-blank Idempotency-Key that must survive one
 * attempt exactly: every call to `mutate()` while that attempt is unsettled (including a
 * caller-driven retry after a server or network error) resends the same key, so a retry can
 * never repeat the effect twice. A success or a 4xx settles the attempt and drops the key,
 * so whatever happens next gets a fresh one — see `keyAfter` in `lib/idempotencyAttempt.ts`
 * for the retention rule itself.
 *
 * The key, and the variables the request was made with, are written to `sessionStorage`
 * (`lib/punchKeyStore.ts`) keyed by `scopeId`, *before* the request goes out, and removed
 * once it settles. A ref alone is not enough: the
 * component driving this can remount when `scopeId` changes and is destroyed by a reload, so
 * a request whose response never arrived would leave the server holding an effect (tickets
 * flushed or reprinted) that the client can no longer reach — press the button again and the
 * server, correctly, finds nothing new to do, while nothing has printed. Replaying the
 * parked key makes the server replay its answer instead — which is what `CafeKotPage`'s
 * resume effect does on mount, using the parked variables as the request body.
 *
 * Shared by `useFlushTabMutation` and `useReprintKotMutation` — one scope id (a tab or a
 * ticket) per caller, one request shape per caller.
 */
function useIdempotentMutation<TData, TVariables>(
  scopeId: string,
  request: (idempotencyKey: string, variables: TVariables) => Promise<TData>,
): UseMutationResult<TData, unknown, TVariables, { scopeId: string }> {
  // Stamped with the scope it belongs to: one hook instance outlives a `scopeId` change
  // (the KOT screen rebinds it as the cashier switches tabs), and a key retained after a
  // server error must never be carried onto a different tab's flush.
  const keyRef = useRef<{ scopeId: string; key: string } | null>(null);
  const keyFor = (id: string) => (keyRef.current?.scopeId === id ? keyRef.current.key : null);

  return useMutation<TData, unknown, TVariables, { scopeId: string }>({
    // The scope the request goes out under, captured at `mutate()` time and handed to
    // `onSettled` as its context. `onSettled` runs from whichever render is current when the
    // response lands, and `scopeId` in that closure is whatever tab is selected by then — not
    // necessarily the one that was flushed. Settling against the current render's scope
    // cleared the wrong tab's parked key (stranding its round for good) and left the flushed
    // tab's key parked even on success, which the next mount then replays as a phantom resume.
    onMutate: () => ({ scopeId }),
    mutationFn: (variables: TVariables) => {
      const key = keyFor(scopeId) ?? readPunchKey(scopeId) ?? newKey();
      keyRef.current = { scopeId, key };
      // Parked before the request, not after: the case this exists for is the response
      // that never comes back. The variables ride along because replaying the key needs
      // the same request body, and after a reload nothing else remembers it.
      writePunchKey(scopeId, key, variables);
      return request(key, variables);
    },
    onSettled: (_data, error, variables, context) => {
      // `context` first; `keyRef` is the fallback for the one path that reaches `onSettled`
      // without an `onMutate` context (a mutation rejected before it was dispatched).
      const settledScopeId = context?.scopeId ?? keyRef.current?.scopeId ?? scopeId;
      const outcome = error ? outcomeOf(error) : 'SUCCESS';
      const current = keyFor(settledScopeId);
      const retained = current ? keyAfter(outcome, current) : null;
      keyRef.current = retained ? { scopeId: settledScopeId, key: retained } : null;
      if (retained) {
        writePunchKey(settledScopeId, retained, variables);
      } else {
        clearPunchKey(settledScopeId);
      }
    },
  });
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
 * and empties the tab. Requires the same parked-key discipline as `useReprintKotMutation` —
 * see `useIdempotentMutation` and `lib/punchKeyStore.ts`. A flush whose response is lost must
 * replay the exact key the server already saw, or the tickets it created become unreachable.
 */
export function useFlushTabMutation(
  tabId: string,
): UseMutationResult<CafeKot[], unknown, CafeFlushTarget> {
  return useIdempotentMutation<CafeKot[], CafeFlushTarget>(tabId, (key, target) =>
    cafeTabApi.flush(tabId, target, key),
  );
}

/**
 * Reprints ticket `kotId`, resolving to the stamped slip itself. Creates no new ticket.
 *
 * The PDF comes back from the reprint call rather than from a following `getKotPdf`,
 * because only this render carries the REPRINT stamp — an unstamped slip for food already
 * being made reads to a cook as a second order.
 */
export function useReprintKotMutation(kotId: string): UseMutationResult<Blob, unknown, void> {
  return useIdempotentMutation<Blob, void>(kotId, (key) => cafeKotApi.reprint(kotId, key));
}

/**
 * Composition writes: open a tab, add or update a line, drop a line, close a tab.
 *
 * None of these can reach the kitchen, so none of them carries an Idempotency-Key: the worst
 * a repeated add can do is put one more portion on a tab the cashier is looking at, and the
 * tab is the thing they can still edit. Every one of them settles by invalidating the tab
 * list, which is the single source the screen renders from — there is no local copy of a
 * tab's lines to drift from the server's.
 */
function useTabWriteMutation<TData, TVariables>(
  write: (variables: TVariables) => Promise<TData>,
): UseMutationResult<TData, unknown, TVariables> {
  const queryClient = useQueryClient();

  return useMutation<TData, unknown, TVariables>({
    mutationFn: write,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: cafeTabKeys.list() });
    },
  });
}

/** Opens a new tab, which allocates its token. */
export function useOpenTabMutation(): UseMutationResult<CafeTab, unknown, void> {
  return useTabWriteMutation<CafeTab, void>(() => cafeTabApi.open());
}

/** Adds a line to `tabId`, or updates one already on it when `lineRef` is supplied. */
export function useAddTabLineMutation(
  tabId: string,
): UseMutationResult<CafeTab, unknown, CafeTabLineInput> {
  return useTabWriteMutation<CafeTab, CafeTabLineInput>((line) => cafeTabApi.addLine(tabId, line));
}

/** Drops an unsent line from `tabId`. Sent lines are not here to drop — they are on the bill. */
export function useRemoveTabLineMutation(
  tabId: string,
): UseMutationResult<CafeTab, unknown, string> {
  return useTabWriteMutation<CafeTab, string>((lineRef) => cafeTabApi.removeLine(tabId, lineRef));
}

/** Closes a tab. The only way a tab ends — there is no expiry and no rollover. */
export function useCloseTabMutation(): UseMutationResult<void, unknown, string> {
  return useTabWriteMutation<void, string>((tabId) => cafeTabApi.close(tabId));
}

export { keyAfter, outcomeOf };
