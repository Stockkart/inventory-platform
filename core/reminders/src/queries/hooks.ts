import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type { CreateReminderDto, Reminder, ReminderDetail, ReminderDetailListResponse, UpdateReminderDto } from '@inventory-platform/reminders/types';
import type { InventoryExpiryBuckets, InventoryItem, PaginationInventoryResponse } from '@inventory-platform/product/types';
import { inventoryAlertApi } from '../api/inventory-alert.api';
import {
  remindersApi,
  type ExpiryBucketsParams,
} from '../api/reminders.api';
import { remindersKeys } from './keys';

export function useReminderDetailsQuery(
  page: number,
  size: number,
  options?: Omit<UseQueryOptions<ReminderDetailListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: remindersKeys.reminderDetails(page, size),
    queryFn: () => remindersApi.getDetails(page, size),
    ...options,
  });
}

export function useReminderDetailQuery(
  id: string | undefined,
  options?: Omit<UseQueryOptions<ReminderDetail>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: remindersKeys.reminderDetail(id ?? ''),
    queryFn: () => remindersApi.getDetailById(id!),
    enabled: Boolean(id),
    ...options,
  });
}

export function useExpiryBucketsQuery(
  params: ExpiryBucketsParams,
  options?: Omit<UseQueryOptions<InventoryExpiryBuckets>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: remindersKeys.expiryBuckets(params),
    queryFn: () => remindersApi.getExpiryBuckets(params),
    ...options,
  });
}

export function useLowStockAlertsQuery(
  page: number,
  size: number,
  options?: Omit<UseQueryOptions<PaginationInventoryResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: remindersKeys.lowStock(page, size),
    queryFn: () => inventoryAlertApi.getLowStock(page, size),
    ...options,
  });
}

export function useInventoryItemQuery(
  id: string | null | undefined,
  options?: Omit<UseQueryOptions<InventoryItem>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: remindersKeys.inventoryItem(id ?? ''),
    queryFn: () => inventoryAlertApi.getById(id!),
    enabled: Boolean(id),
    ...options,
  });
}

export function useCreateReminderMutation(
  options?: UseMutationOptions<Reminder, Error, CreateReminderDto>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => remindersApi.create(data),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: remindersKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useUpdateReminderMutation(
  options?: UseMutationOptions<
    Reminder,
    Error,
    { id: string; data: UpdateReminderDto }
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => remindersApi.update(id, data),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: remindersKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useDeleteReminderMutation(
  options?: UseMutationOptions<number, Error, string>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => remindersApi.delete(id),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: remindersKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useSnoozeReminderMutation(
  options?: UseMutationOptions<Reminder, Error, { id: string; snoozeDays: number }>
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, snoozeDays }) => remindersApi.snooze(id, snoozeDays),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: remindersKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useUpdateThresholdMutation(
  options?: UseMutationOptions<
    void,
    Error,
    { inventoryId: string; thresholdCount: number }
  >
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ inventoryId, thresholdCount }) =>
      inventoryAlertApi.updateThreshold(inventoryId, thresholdCount),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: remindersKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}
