import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import type {
  CreateCustomerDto,
  CreateVendorDto,
  CustomerListResponse,
  CustomerResponse,
  UpdateCustomerDto,
  UpdateVendorDto,
  VendorListResponse,
  VendorResponse,
} from '@inventory-platform/user/types';
import type {
  ShopMemberAccess,
  ShopRbacAdmin,
  UpdateMemberPermissionsRequest,
  UpdateShopRbacPolicyRequest,
} from '@inventory-platform/access';
import { customersApi, type CustomersListParams } from '../api/customers.api';
import { invitationsApi } from '../api/invitations.api';
import { shopAccessApi } from '../api/shop-access.api';
import { vendorsApi, type VendorsListParams } from '../api/vendors.api';
import { userKeys } from './keys';

export function useCustomersQuery(
  params: CustomersListParams,
  options?: Omit<UseQueryOptions<CustomerListResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: userKeys.customers(params),
    queryFn: () => customersApi.list(params),
    ...options,
  });
}

export function useCreateCustomerMutation(
  options?: UseMutationOptions<CustomerResponse, Error, CreateCustomerDto>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => customersApi.create(data),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useUpdateCustomerMutation(
  options?: UseMutationOptions<
    CustomerResponse,
    Error,
    { customerId: string; data: UpdateCustomerDto }
  >,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, data }) => customersApi.update(customerId, data),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useVendorsQuery(
  params: VendorsListParams,
  options?: Omit<UseQueryOptions<VendorListResponse>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: userKeys.vendors(params),
    queryFn: () => vendorsApi.list(params),
    ...options,
  });
}

export function useCreateVendorMutation(
  options?: UseMutationOptions<VendorResponse, Error, CreateVendorDto>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => vendorsApi.create(data),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useUpdateVendorMutation(
  options?: UseMutationOptions<VendorResponse, Error, { vendorId: string; data: UpdateVendorDto }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorId, data }) => vendorsApi.update(vendorId, data),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useShopRbacAdminQuery(
  shopId: string | undefined,
  options?: Omit<UseQueryOptions<ShopRbacAdmin>, 'queryKey' | 'queryFn'>,
) {
  return useQuery({
    queryKey: userKeys.shopRbacAdmin(shopId ?? ''),
    queryFn: () => {
      if (!shopId) {
        return Promise.reject(new Error('shopId is required'));
      }
      return shopAccessApi.getAdmin(shopId);
    },
    enabled: Boolean(shopId),
    ...options,
  });
}

export function useUpdateShopPolicyMutation(
  options?: UseMutationOptions<void, Error, { shopId: string; body: UpdateShopRbacPolicyRequest }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shopId, body }) => shopAccessApi.updatePolicy(shopId, body),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export function useUpdateMemberAccessMutation(
  options?: UseMutationOptions<
    ShopMemberAccess,
    Error,
    { shopId: string; userId: string; body: UpdateMemberPermissionsRequest }
  >,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ shopId, userId, body }) => shopAccessApi.updateMember(shopId, userId, body),
    onSuccess: (...args) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}

export { customersApi, vendorsApi, shopAccessApi, invitationsApi };
