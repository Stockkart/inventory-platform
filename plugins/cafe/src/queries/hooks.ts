import { useRef } from 'react';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { cafeKotApi } from '../api/cafe-kot.api';
import { keyAfter, newKey } from '../lib/idempotencyAttempt';
import { clearPunchKey, readPunchKey, writePunchKey } from '../lib/punchKeyStore';
import type { CafeKot } from '../types/kot';
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
 * punched or reprinted) that the client can no longer reach — press the button again and the
 * server, correctly, finds nothing new to do, while nothing has printed. Replaying the
 * parked key makes the server replay its answer instead — which is what `CafeKotBar`'s
 * resume effect does on mount, using the parked variables as the request body.
 *
 * Shared by `usePunchMutation` and `useReprintKotMutation` — one scope id (a cart or a
 * ticket) per caller, one request shape per caller.
 */
function useIdempotentMutation<TData, TVariables>(
  scopeId: string,
  request: (idempotencyKey: string, variables: TVariables) => Promise<TData>,
): UseMutationResult<TData, unknown, TVariables, { scopeId: string }> {
  // Stamped with the scope it belongs to: one hook instance outlives a `scopeId` change
  // (the Sell screen rebinds it as the cashier switches carts or opens a quotation), and a
  // key retained after a server error must never be carried onto a different cart's punch.
  const keyRef = useRef<{ scopeId: string; key: string } | null>(null);
  const keyFor = (id: string) => (keyRef.current?.scopeId === id ? keyRef.current.key : null);

  return useMutation<TData, unknown, TVariables, { scopeId: string }>({
    // The scope the request goes out under, captured at `mutate()` time and handed to
    // `onSettled` as its context. `onSettled` runs from whichever render is current when the
    // response lands, and `scopeId` in that closure is whatever cart is selected by then —
    // not necessarily the one that was punched. Settling against the current render's scope
    // cleared the wrong cart's parked key (stranding its round for good) and left the punched
    // cart's key parked even on success, which the next mount then replays as a phantom
    // resume.
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

/**
 * Punches the pending round on `purchaseId` to the kitchen, resolving with the tickets the
 * server created (an empty list when the kitchen already has everything — a legitimate
 * no-op, not a failure).
 *
 * Carries no request body: the server derives the delta. Requires the parked-key discipline
 * of `useIdempotentMutation` — a punch whose response is lost must replay the exact key the
 * server already saw, or the tickets it created become unreachable and nothing ever prints.
 */
export function usePunchMutation(purchaseId: string): UseMutationResult<CafeKot[], unknown, void> {
  return useIdempotentMutation<CafeKot[], void>(purchaseId, (key) =>
    cafeKotApi.punch(purchaseId, key),
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

export { keyAfter, outcomeOf };
