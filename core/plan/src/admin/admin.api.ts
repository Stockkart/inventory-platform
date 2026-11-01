import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  AddOnAdminRequest,
  AddOnGrantRequest,
  AdminActiveRequest,
  AdminAddOn,
  AdminCampaign,
  AdminPlan,
  PlanAdminRequest,
  ShopAddOn,
  CampaignRequest,
  AdminReferralAttribution,
  AdminReferralReward,
  AdminVoucher,
  AdminVoucherRedemption,
  VoucherGenerateRequest,
  VoucherUpdateRequest,
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

  listAddOns: async (): Promise<AdminAddOn[]> => {
    const response = await apiClient.get<ApiResponse<AdminAddOn[]>>(PLAN_ENDPOINTS.ADMIN_ADDONS);
    return response.data;
  },

  saveAddOn: async (id: string | null, body: AddOnAdminRequest): Promise<AdminAddOn> => {
    const response = id
      ? await apiClient.put<ApiResponse<AdminAddOn>>(PLAN_ENDPOINTS.ADMIN_ADDON(id), body)
      : await apiClient.post<ApiResponse<AdminAddOn>>(PLAN_ENDPOINTS.ADMIN_ADDONS, body);
    return response.data;
  },

  setAddOnActive: async (id: string, body: AdminActiveRequest): Promise<AdminAddOn> => {
    const response = await apiClient.patch<ApiResponse<AdminAddOn>>(
      PLAN_ENDPOINTS.ADMIN_ADDON_ACTIVE(id),
      body,
    );
    return response.data;
  },

  grantAddOn: async (body: AddOnGrantRequest): Promise<ShopAddOn> => {
    const response = await apiClient.post<ApiResponse<ShopAddOn>>(
      PLAN_ENDPOINTS.ADMIN_ADDON_GRANTS,
      body,
    );
    return response.data;
  },

  listShopAddOns: async (shopId: string): Promise<ShopAddOn[]> => {
    const response = await apiClient.get<ApiResponse<ShopAddOn[]>>(
      PLAN_ENDPOINTS.ADMIN_ADDON_GRANTS,
      { shopId },
    );
    return response.data;
  },

  listPlans: async (): Promise<AdminPlan[]> => {
    const response = await apiClient.get<ApiResponse<AdminPlan[]>>(PLAN_ENDPOINTS.ADMIN_PLANS);
    return response.data;
  },

  savePlan: async (id: string | null, body: PlanAdminRequest): Promise<AdminPlan> => {
    const response = id
      ? await apiClient.put<ApiResponse<AdminPlan>>(PLAN_ENDPOINTS.ADMIN_PLAN(id), body)
      : await apiClient.post<ApiResponse<AdminPlan>>(PLAN_ENDPOINTS.ADMIN_PLANS, body);
    return response.data;
  },

  setPlanActive: async (id: string, body: AdminActiveRequest): Promise<AdminPlan> => {
    const response = await apiClient.patch<ApiResponse<AdminPlan>>(
      PLAN_ENDPOINTS.ADMIN_PLAN_ACTIVE(id),
      body,
    );
    return response.data;
  },

  listVouchers: async (addOnCode: string | null): Promise<AdminVoucher[]> => {
    const response = await apiClient.get<ApiResponse<AdminVoucher[]>>(
      PLAN_ENDPOINTS.ADMIN_VOUCHERS,
      addOnCode ? { addOnCode } : undefined,
    );
    return response.data;
  },

  generateVouchers: async (body: VoucherGenerateRequest): Promise<AdminVoucher[]> => {
    const response = await apiClient.post<ApiResponse<AdminVoucher[]>>(
      PLAN_ENDPOINTS.ADMIN_VOUCHERS,
      body,
    );
    return response.data;
  },

  updateVoucher: async (id: string, body: VoucherUpdateRequest): Promise<AdminVoucher> => {
    const response = await apiClient.put<ApiResponse<AdminVoucher>>(
      PLAN_ENDPOINTS.ADMIN_VOUCHER(id),
      body,
    );
    return response.data;
  },

  setVoucherActive: async (id: string, body: AdminActiveRequest): Promise<AdminVoucher> => {
    const response = await apiClient.patch<ApiResponse<AdminVoucher>>(
      PLAN_ENDPOINTS.ADMIN_VOUCHER_ACTIVE(id),
      body,
    );
    return response.data;
  },

  listVoucherRedemptions: async (id: string): Promise<AdminVoucherRedemption[]> => {
    const response = await apiClient.get<ApiResponse<AdminVoucherRedemption[]>>(
      PLAN_ENDPOINTS.ADMIN_VOUCHER_REDEMPTIONS(id),
    );
    return response.data;
  },

  listCampaigns: async (): Promise<AdminCampaign[]> => {
    const response = await apiClient.get<ApiResponse<AdminCampaign[]>>(
      PLAN_ENDPOINTS.ADMIN_CAMPAIGNS,
    );
    return response.data;
  },

  createCampaign: async (body: CampaignRequest): Promise<AdminCampaign> => {
    const response = await apiClient.post<ApiResponse<AdminCampaign>>(
      PLAN_ENDPOINTS.ADMIN_CAMPAIGNS,
      body,
    );
    return response.data;
  },

  updateCampaign: async (id: string, body: CampaignRequest): Promise<AdminCampaign> => {
    const response = await apiClient.put<ApiResponse<AdminCampaign>>(
      PLAN_ENDPOINTS.ADMIN_CAMPAIGN(id),
      body,
    );
    return response.data;
  },

  setCampaignActive: async (id: string, body: AdminActiveRequest): Promise<AdminCampaign> => {
    const response = await apiClient.patch<ApiResponse<AdminCampaign>>(
      PLAN_ENDPOINTS.ADMIN_CAMPAIGN_ACTIVE(id),
      body,
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
