import { useRef } from 'react';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { cafeKotApi } from '../api/cafe-kot.api';
import { keyAfter, newKey } from '../lib/punchBasket';
import { clearPunchKey, readPunchKey, writePunchKey } from '../lib/punchKeyStore';
import type { CafeKot } from '../types/kot';
import { outcomeOf } from './outcome';

/**
 * Punches the pending round for `purchaseId` to the kitchen.
 *
 * The Idempotency-Key lives for one punch attempt: every call to `mutate()` while that
 * attempt is unsettled (including a caller-driven retry after a server or network error)
 * resends the exact same key, so a retry can never cook a round twice. A success or a 4xx
 * settles the attempt and drops the key, so whatever gets punched next gets a fresh one —
 * see `keyAfter` in `lib/punchBasket.ts` for the retention rule itself.
 *
 * The key is written to `sessionStorage`, keyed by purchase, *before* the request goes
 * out and removed once it settles. A ref alone is not enough: this component is remounted
 * on every `purchaseId` change and destroyed by a reload, so a punch whose response never
 * arrived would leave the server holding tickets it created under a key the client has
 * thrown away — press Print KOT again and the server, correctly, computes zero deltas and
 * the UI reports "Nothing new to send" while nothing has printed. Replaying the parked key
 * makes the server replay its answer instead.
 */
export function usePunchMutation(purchaseId: string): UseMutationResult<CafeKot[], unknown, void> {
  const keyRef = useRef<string | null>(null);

  return useMutation<CafeKot[], unknown, void>({
    mutationFn: () => {
      const key = keyRef.current ?? readPunchKey(purchaseId) ?? newKey();
      keyRef.current = key;
      // Parked before the request, not after: the case this exists for is the response
      // that never comes back.
      writePunchKey(purchaseId, key);
      return cafeKotApi.punch(purchaseId, key);
    },
    onSettled: (_data, error) => {
      const outcome = error ? outcomeOf(error) : 'SUCCESS';
      const retained = keyRef.current ? keyAfter(outcome, keyRef.current) : null;
      keyRef.current = retained;
      if (retained) {
        writePunchKey(purchaseId, retained);
      } else {
        clearPunchKey(purchaseId);
      }
    },
  });
}

export { keyAfter, outcomeOf };
