import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
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

export function useAdjustWalletMutation(shopId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: WalletAdjustmentRequest) => planAdminApi.adjustWallet(shopId, body),
    onSuccess: (wallet) => queryClient.setQueryData(planKeys.adminWallet(shopId), wallet),
  });
}
