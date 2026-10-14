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
import { gstinApi } from '../api/gstin.api';
import type { GstinLookupResult, GstinSettings } from '../model/gstin-lookup.types';
import { isValidGstin, normalizeGstin } from '../model/gstin';
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

/**
 * Whether online GSTIN verification is on. Until it is, the vendor form keeps its old behaviour
 * (free-text GSTIN, no required state). Unknown — still loading or failed — reads as off.
 */
export function useGstinSettingsQuery() {
  return useQuery<GstinSettings>({
    queryKey: userKeys.gstinSettings(),
    queryFn: gstinApi.settings,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/** True only when the server says verification is on. */
export function useGstinVerificationEnabled(): boolean {
  const settings = useGstinSettingsQuery();
  return settings.data?.verificationEnabled === true;
}

/**
 * What the GST network knows about a GSTIN, once it passes the offline check. Keyed by the
 * normalized GSTIN and kept for the session: the server already answers repeats from its registry,
 * so there is no reason to ask it twice from one screen.
 */
export function useGstinLookupQuery(
  gstin: string | null | undefined,
  options?: { enabled?: boolean },
) {
  const normalized = normalizeGstin(gstin);
  return useQuery<GstinLookupResult>({
    queryKey: userKeys.gstinLookup(normalized),
    queryFn: ({ signal }) => gstinApi.lookup(normalized, signal),
    enabled: isValidGstin(normalized) && (options?.enabled ?? true),
    staleTime: Infinity,
    retry: false,
  });
}

/** Ask the GST network again for a GSTIN and refresh what the form shows. */
export function useReverifyGstinMutation() {
  const queryClient = useQueryClient();
  return useMutation<GstinLookupResult, Error, string>({
    mutationFn: (gstin) => gstinApi.reverify(normalizeGstin(gstin)),
    onSuccess: (result) => {
      queryClient.setQueryData(userKeys.gstinLookup(result.gstin), result);
      void queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
