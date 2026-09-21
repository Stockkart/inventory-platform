import { useRef } from 'react';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { cafeKotApi } from '../api/cafe-kot.api';
import { keyAfter, newKey } from '../lib/punchBasket';
import type { CafeKot } from '../types/kot';
import { outcomeOf } from './outcome';

/**
 * Punches the pending round for `purchaseId` to the kitchen.
 *
 * The Idempotency-Key lives in a ref for the life of one punch attempt: every call to
 * `mutate()` while that attempt is unsettled (including a caller-driven retry after a
 * server or network error) resends the exact same key, so a retry can never cook a round
 * twice. A success or a 4xx settles the attempt and rotates the key for whatever gets
 * punched next — see `keyAfter` in `lib/punchBasket.ts` for the retention rule itself.
 * The key is never regenerated mid-attempt; only `onSettled` below touches it.
 */
export function usePunchMutation(purchaseId: string): UseMutationResult<CafeKot[], unknown, void> {
  const keyRef = useRef(newKey());

  return useMutation<CafeKot[], unknown, void>({
    mutationFn: () => cafeKotApi.punch(purchaseId, keyRef.current),
    onSettled: (_data, error) => {
      const outcome = error ? outcomeOf(error) : 'SUCCESS';
      const retained = keyAfter(outcome, keyRef.current);
      keyRef.current = retained ?? newKey();
    },
  });
}

export { keyAfter, outcomeOf };
