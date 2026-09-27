import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddOnAdminRequest,
  AddOnGrantRequest,
  AdminActiveRequest,
  CampaignRequest,
  PlanAdminRequest,
  VoucherGenerateRequest,
  VoucherUpdateRequest,
  ReferralApprovalRequest,
  ReferralAttributionStatus,
  ReferralRewardStatus,
  WalletAdjustmentRequest,
} from '@inventory-platform/plan/types';
import { planKeys } from '../queries/keys';
import { planAdminApi } from './admin.api';

export function useAdminAttributionsQuery(status: ReferralAttributionStatus) {
  return useQuery({
    queryKey: planKeys.adminAttributions(status),
    queryFn: () => planAdminApi.listAttributions(status),
  });
}

export function useAdminRewardsQuery(status: ReferralRewardStatus | null) {
  return useQuery({
    queryKey: planKeys.adminRewards(status),
    queryFn: () => planAdminApi.listRewards(status),
  });
}

export function useAdminWalletQuery(shopId: string | null) {
  return useQuery({
    queryKey: planKeys.adminWallet(shopId ?? ''),
    queryFn: () => planAdminApi.getWallet(shopId ?? ''),
    enabled: Boolean(shopId),
    retry: false,
  });
}

/** Approving a referral can record a reward, so both lists refresh. */
export function useApproveAttributionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReferralApprovalRequest }) =>
      planAdminApi.approveAttribution(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: planKeys.adminReferrals() }),
  });
}

export function useRejectAttributionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      planAdminApi.rejectAttribution(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: planKeys.adminReferrals() }),
  });
}

/** Clawback moves wallet money too, so any open wallet view refreshes as well. */
export function useRewardActionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: 'approve' | 'void' | 'clawback';
      reason: string;
    }) => planAdminApi.rewardAction(id, action, reason),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: planKeys.adminReferrals() }),
        queryClient.invalidateQueries({ queryKey: [...planKeys.all, 'admin-wallet'] }),
      ]),
  });
}

export function useAdminAddOnsQuery() {
  return useQuery({
    queryKey: planKeys.adminAddOns(),
    queryFn: () => planAdminApi.listAddOns(),
  });
}

/** Also refreshes the shop-facing catalogue so the admin sees the effect right away. */
function useInvalidateAddOns() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: planKeys.adminAddOns() }),
      queryClient.invalidateQueries({ queryKey: planKeys.addOns() }),
    ]);
}

export function useSaveAddOnMutation() {
  const invalidate = useInvalidateAddOns();
  return useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: AddOnAdminRequest }) =>
      planAdminApi.saveAddOn(id, body),
    onSuccess: invalidate,
  });
}

export function useSetAddOnActiveMutation() {
  const invalidate = useInvalidateAddOns();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminActiveRequest }) =>
      planAdminApi.setAddOnActive(id, body),
    onSuccess: invalidate,
  });
}

export function useShopAddOnsQuery(shopId: string | null) {
  return useQuery({
    queryKey: planKeys.adminShopAddOns(shopId ?? ''),
    queryFn: () => planAdminApi.listShopAddOns(shopId ?? ''),
    enabled: Boolean(shopId),
    retry: false,
  });
}

export function useGrantAddOnMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddOnGrantRequest) => planAdminApi.grantAddOn(body),
    onSuccess: (_granted, body) =>
      queryClient.invalidateQueries({ queryKey: planKeys.adminShopAddOns(body.shopId) }),
  });
}

export function useAdminPlansQuery() {
  return useQuery({
    queryKey: planKeys.adminPlans(),
    queryFn: () => planAdminApi.listPlans(),
  });
}

/** Plan edits can change limits and features, so the admin's own plan status refreshes too. */
function useInvalidatePlans() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: planKeys.adminPlans() }),
      queryClient.invalidateQueries({ queryKey: planKeys.list() }),
      queryClient.invalidateQueries({ queryKey: planKeys.shopStatus() }),
    ]);
}

export function useSavePlanMutation() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: PlanAdminRequest }) =>
      planAdminApi.savePlan(id, body),
    onSuccess: invalidate,
  });
}

export function useSetPlanActiveMutation() {
  const invalidate = useInvalidatePlans();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminActiveRequest }) =>
      planAdminApi.setPlanActive(id, body),
    onSuccess: invalidate,
  });
}

export function useAdminVouchersQuery(addOnCode: string | null) {
  return useQuery({
    queryKey: planKeys.adminVoucherList(addOnCode),
    queryFn: () => planAdminApi.listVouchers(addOnCode),
  });
}

export function useVoucherRedemptionsQuery(id: string | null) {
  return useQuery({
    queryKey: planKeys.adminVoucherRedemptions(id ?? ''),
    queryFn: () => planAdminApi.listVoucherRedemptions(id ?? ''),
    enabled: Boolean(id),
  });
}

function useInvalidateVouchers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: planKeys.adminVouchers() });
}

export function useGenerateVouchersMutation() {
  const invalidate = useInvalidateVouchers();
  return useMutation({
    mutationFn: (body: VoucherGenerateRequest) => planAdminApi.generateVouchers(body),
    onSuccess: invalidate,
  });
}

export function useUpdateVoucherMutation() {
  const invalidate = useInvalidateVouchers();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: VoucherUpdateRequest }) =>
      planAdminApi.updateVoucher(id, body),
    onSuccess: invalidate,
  });
}

export function useSetVoucherActiveMutation() {
  const invalidate = useInvalidateVouchers();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminActiveRequest }) =>
      planAdminApi.setVoucherActive(id, body),
    onSuccess: invalidate,
  });
}

export function useAdminCampaignsQuery() {
  return useQuery({
    queryKey: planKeys.adminCampaigns(),
    queryFn: () => planAdminApi.listCampaigns(),
  });
}

/** Also refreshes the banner query so the admin sees the effect right away. */
function useInvalidateCampaigns() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: planKeys.adminCampaigns() }),
      queryClient.invalidateQueries({ queryKey: planKeys.activeCampaign() }),
    ]);
}

export function useSaveCampaignMutation() {
  const invalidate = useInvalidateCampaigns();
  return useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: CampaignRequest }) =>
      id ? planAdminApi.updateCampaign(id, body) : planAdminApi.createCampaign(body),
    onSuccess: invalidate,
  });
}

export function useSetCampaignActiveMutation() {
  const invalidate = useInvalidateCampaigns();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminActiveRequest }) =>
      planAdminApi.setCampaignActive(id, body),
    onSuccess: invalidate,
  });
}

export function useAdjustWalletMutation(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: WalletAdjustmentRequest) => planAdminApi.adjustWallet(shopId, body),
    onSuccess: (wallet) => queryClient.setQueryData(planKeys.adminWallet(shopId), wallet),
  });
}
