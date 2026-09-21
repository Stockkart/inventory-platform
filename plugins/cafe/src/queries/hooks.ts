import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cafeOrderApi } from '../api/cafe-order.api';
import { keyAfter, toPunchBody, type Basket } from '../lib/punchBasket';
import type { CafeKot, OpenOrderBody } from '../types/order';
import { cafeOrderKeys } from './keys';
import { outcomeOf } from './outcome';

export function useOpenOrdersQuery() {
  return useQuery({
    queryKey: cafeOrderKeys.openOrders(),
    queryFn: () => cafeOrderApi.listOpen(),
    staleTime: Infinity,
  });
}

export function useOrderQuery(orderId: string | null | undefined) {
  const id = orderId?.trim() ?? '';
  return useQuery({
    queryKey: cafeOrderKeys.order(id),
    queryFn: () => cafeOrderApi.get(id),
    enabled: Boolean(id),
    staleTime: Infinity,
  });
}

export function useOpenOrderMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: OpenOrderBody) => cafeOrderApi.open(body),
    onSuccess: () => void client.invalidateQueries({ queryKey: cafeOrderKeys.openOrders() }),
  });
}

export function usePunchMutation(orderId: string) {
  const client = useQueryClient();
  return useMutation<CafeKot[], unknown, Basket>({
    mutationFn: (basket) => cafeOrderApi.punch(orderId, toPunchBody(basket), basket.key),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: cafeOrderKeys.order(orderId) });
      void client.invalidateQueries({ queryKey: cafeOrderKeys.openOrders() });
    },
  });
}

export { keyAfter, outcomeOf };
