import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  AddOnResponse,
  AssignPlanRequest,
  CampaignResponse,
  CreatePlanCheckoutInput,
  PaymentConfigResponse,
  PlanCheckoutResponse,
  PlanResponse,
  PlanTransactionResponse,
  QuoteRequest,
  QuoteResponse,
  ShopPlanStatusResponse,
  UsageResponse,
  VerifyPlanPaymentRequest,
  VerifyPlanPaymentResponse,
  VoucherCheckResponse,
} from '@inventory-platform/plan/types';
import { PLAN_ENDPOINTS } from './endpoints';

export const plansApi = {
  list: async (): Promise<PlanResponse[]> => {
    const response = await apiClient.get<ApiResponse<PlanResponse[]>>(PLAN_ENDPOINTS.BASE);
    return response.data;
  },

  getById: async (planId: string): Promise<PlanResponse> => {
    const response = await apiClient.get<ApiResponse<PlanResponse>>(PLAN_ENDPOINTS.BY_ID(planId));
    return response.data;
  },

  getShopStatus: async (): Promise<ShopPlanStatusResponse> => {
    const response = await apiClient.get<ApiResponse<ShopPlanStatusResponse>>(
      PLAN_ENDPOINTS.SHOP_STATUS,
    );
    return response.data;
  },

  getSuggestedPlan: async (shopId: string): Promise<PlanResponse | null> => {
    const response = await apiClient.get<ApiResponse<PlanResponse | null>>(
      PLAN_ENDPOINTS.SHOP_SUGGESTED(shopId),
    );
    return response.data;
  },

  assignPlan: async (shopId: string, data: AssignPlanRequest): Promise<PlanResponse> => {
    const response = await apiClient.post<ApiResponse<PlanResponse>>(
      PLAN_ENDPOINTS.SHOP_ASSIGN(shopId),
      data,
    );
    return response.data;
  },

  getUsage: async (): Promise<UsageResponse> => {
    const response = await apiClient.get<ApiResponse<UsageResponse>>(PLAN_ENDPOINTS.SHOP_USAGE);
    return response.data;
  },

  listTransactions: async (): Promise<PlanTransactionResponse[]> => {
    const response = await apiClient.get<ApiResponse<PlanTransactionResponse[]>>(
      PLAN_ENDPOINTS.SHOP_TRANSACTIONS,
    );
    return response.data;
  },

  getPaymentConfig: async (): Promise<PaymentConfigResponse> => {
    const response = await apiClient.get<ApiResponse<PaymentConfigResponse>>(
      PLAN_ENDPOINTS.PAYMENT_CONFIG,
    );
    return response.data;
  },

  createCheckout: async ({
    request,
    idempotencyKey,
  }: CreatePlanCheckoutInput): Promise<PlanCheckoutResponse> => {
    const response = await apiClient.post<ApiResponse<PlanCheckoutResponse>>(
      PLAN_ENDPOINTS.PAYMENT_CHECKOUT,
      request,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return response.data;
  },

  listAddOns: async (): Promise<AddOnResponse[]> => {
    const response = await apiClient.get<ApiResponse<AddOnResponse[]>>(PLAN_ENDPOINTS.ADDONS);
    return response.data;
  },

  validateVoucher: async (code: string): Promise<VoucherCheckResponse> => {
    const response = await apiClient.get<ApiResponse<VoucherCheckResponse>>(
      PLAN_ENDPOINTS.VOUCHER_VALIDATE,
      { code },
    );
    return response.data;
  },

  quote: async (data: QuoteRequest): Promise<QuoteResponse> => {
    const response = await apiClient.post<ApiResponse<QuoteResponse>>(
      PLAN_ENDPOINTS.ORDER_QUOTE,
      data,
    );
    return response.data;
  },

  getActiveCampaign: async (): Promise<CampaignResponse | null> => {
    const response = await apiClient.get<ApiResponse<CampaignResponse | null>>(
      PLAN_ENDPOINTS.CAMPAIGN_ACTIVE,
    );
    return response.data ?? null;
  },

  verifyPayment: async (data: VerifyPlanPaymentRequest): Promise<VerifyPlanPaymentResponse> => {
    const response = await apiClient.post<ApiResponse<VerifyPlanPaymentResponse>>(
      PLAN_ENDPOINTS.PAYMENT_VERIFY,
      data,
    );
    return response.data;
  },
};
