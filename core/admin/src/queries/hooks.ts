import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@inventory-platform/api-client';
import type {
  AdminActiveChangeRequest,
  AdminChangePasswordRequest,
  AdminCreateRequest,
  AdminLoginRequest,
  AdminReasonBody,
} from '@inventory-platform/admin/types';
import { adminApi } from '../api/admin.api';
import { adminKeys } from './keys';

export function useAdminMeQuery(enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.me(),
    queryFn: adminApi.me,
    enabled,
    retry: false,
    staleTime: 60_000,
  });
}

export function useAdminLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminLoginRequest) => adminApi.login(body),
    onSuccess: (response) => {
      apiClient.setToken(response.token);
      queryClient.setQueryData(adminKeys.me(), response.admin);
    },
  });
}

/** Ends the session on the server when possible; the local session is cleared either way. */
export function useAdminLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.logout().catch(() => undefined),
    onSettled: () => {
      apiClient.setToken(null);
      queryClient.clear();
    },
  });
}

export function useAdminChangePasswordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminChangePasswordRequest) => adminApi.changePassword(body),
    onSuccess: (admin) => {
      queryClient.setQueryData(adminKeys.me(), admin);
    },
  });
}

export function useAdminUsersQuery() {
  return useQuery({
    queryKey: adminKeys.admins(),
    queryFn: adminApi.listAdmins,
  });
}

export function useCreateAdminMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminCreateRequest) => adminApi.createAdmin(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.admins() }),
  });
}

export function useSetAdminActiveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminActiveChangeRequest }) =>
      adminApi.setActive(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.admins() }),
  });
}

export function useResetAdminPasswordMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminReasonBody }) =>
      adminApi.resetPassword(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.admins() }),
  });
}
