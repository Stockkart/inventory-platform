import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  AdminReferralAttribution,
  AdminReferralReward,
  ReferralApprovalRequest,
  ReferralAttributionStatus,
  ReferralRewardStatus,
  WalletAdjustmentRequest,
  WalletResponse,
} from '@inventory-platform/plan/types';
import { PLAN_ENDPOINTS } from '../api/endpoints';

/** Platform admin calls. The API rejects anyone without the platform admin role. */
export const planAdminApi = {
  listAttributions: async (
    status: ReferralAttributionStatus,
  ): Promise<AdminReferralAttribution[]> => {
    const response = await apiClient.get<ApiResponse<AdminReferralAttribution[]>>(
      PLAN_ENDPOINTS.ADMIN_REFERRAL_ATTRIBUTIONS,
      { status },
    );
    return response.data;
  },

  approveAttribution: async (
    id: string,
    body: ReferralApprovalRequest,
  ): Promise<AdminReferralAttribution> => {
    const response = await apiClient.post<ApiResponse<AdminReferralAttribution>>(
      PLAN_ENDPOINTS.ADMIN_REFERRAL_ATTRIBUTION_ACTION(id, 'approve'),
      body,
    );
    return response.data;
  },

  rejectAttribution: async (id: string, reason: string): Promise<AdminReferralAttribution> => {
    const response = await apiClient.post<ApiResponse<AdminReferralAttribution>>(
      PLAN_ENDPOINTS.ADMIN_REFERRAL_ATTRIBUTION_ACTION(id, 'reject'),
      { reason },
    );
    return response.data;
  },

  listRewards: async (status: ReferralRewardStatus | null): Promise<AdminReferralReward[]> => {
    const response = await apiClient.get<ApiResponse<AdminReferralReward[]>>(
      PLAN_ENDPOINTS.ADMIN_REFERRAL_REWARDS,
      status ? { status } : undefined,
    );
    return response.data;
  },

  rewardAction: async (
    id: string,
    action: 'approve' | 'void' | 'clawback',
    reason: string,
  ): Promise<AdminReferralReward> => {
    const response = await apiClient.post<ApiResponse<AdminReferralReward>>(
      PLAN_ENDPOINTS.ADMIN_REFERRAL_REWARD_ACTION(id, action),
      { reason },
    );
    return response.data;
  },

  getWallet: async (shopId: string): Promise<WalletResponse> => {
    const response = await apiClient.get<ApiResponse<WalletResponse>>(
      PLAN_ENDPOINTS.ADMIN_WALLET(shopId),
    );
    return response.data;
  },

  adjustWallet: async (shopId: string, body: WalletAdjustmentRequest): Promise<WalletResponse> => {
    const response = await apiClient.post<ApiResponse<WalletResponse>>(
      PLAN_ENDPOINTS.ADMIN_WALLET_ADJUSTMENTS(shopId),
      body,
    );
    return response.data;
  },
};
