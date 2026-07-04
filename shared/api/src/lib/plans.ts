import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type {
  ApiResponse,
  PlanResponse,
  ShopPlanStatusResponse,
  UsageResponse,
  AssignPlanRequest,
  PlanTransactionResponse,
  PaymentConfigResponse,
  PlanCheckoutResponse,
  CreatePlanCheckoutRequest,
  VerifyPlanPaymentRequest,
  VerifyPlanPaymentResponse,
} from '@inventory-platform/types';

export const plansApi = {
  /** List all plans (public - no auth required) */
  list: async (): Promise<PlanResponse[]> => {
    const response = await apiClient.get<ApiResponse<PlanResponse[]>>(
      API_ENDPOINTS.PLANS.BASE
    );
    return response.data;
  },

  /** Get plan by ID (public) */
  getById: async (planId: string): Promise<PlanResponse> => {
    const response = await apiClient.get<ApiResponse<PlanResponse>>(
      API_ENDPOINTS.PLANS.BY_ID(planId)
    );
    return response.data;
  },

  /** Get current shop plan status (requires auth) */
  getShopStatus: async (): Promise<ShopPlanStatusResponse> => {
    const response = await apiClient.get<ApiResponse<ShopPlanStatusResponse>>(
      API_ENDPOINTS.PLANS.SHOP_STATUS
    );
    return response.data;
  },

  /** Get suggested next plan for upsell */
  getSuggestedPlan: async (shopId: string): Promise<PlanResponse | null> => {
    const response = await apiClient.get<ApiResponse<PlanResponse | null>>(
      API_ENDPOINTS.PLANS.SHOP_SUGGESTED(shopId)
    );
    return response.data;
  },

  /** Assign plan to shop (internal — requires verified payment metadata) */
  assignPlan: async (
    shopId: string,
    data: AssignPlanRequest
  ): Promise<PlanResponse> => {
    const response = await apiClient.post<ApiResponse<PlanResponse>>(
      API_ENDPOINTS.PLANS.SHOP_ASSIGN(shopId),
      data
    );
    return response.data;
  },

  /** Get current month usage */
  getUsage: async (): Promise<UsageResponse> => {
    const response = await apiClient.get<ApiResponse<UsageResponse>>(
      API_ENDPOINTS.PLANS.SHOP_USAGE
    );
    return response.data;
  },

  /** List plan payment transactions for current shop */
  listTransactions: async (): Promise<PlanTransactionResponse[]> => {
    const response = await apiClient.get<ApiResponse<PlanTransactionResponse[]>>(
      API_ENDPOINTS.PLANS.SHOP_TRANSACTIONS
    );
    return response.data;
  },

  getPaymentConfig: async (): Promise<PaymentConfigResponse> => {
    const response = await apiClient.get<ApiResponse<PaymentConfigResponse>>(
      API_ENDPOINTS.PLANS.PAYMENT_CONFIG
    );
    return response.data;
  },

  createCheckout: async (
    data: CreatePlanCheckoutRequest
  ): Promise<PlanCheckoutResponse> => {
    const response = await apiClient.post<ApiResponse<PlanCheckoutResponse>>(
      API_ENDPOINTS.PLANS.PAYMENT_CHECKOUT,
      data
    );
    return response.data;
  },

  verifyPayment: async (
    data: VerifyPlanPaymentRequest
  ): Promise<VerifyPlanPaymentResponse> => {
    const response = await apiClient.post<ApiResponse<VerifyPlanPaymentResponse>>(
      API_ENDPOINTS.PLANS.PAYMENT_VERIFY,
      data
    );
    return response.data;
  },
};
