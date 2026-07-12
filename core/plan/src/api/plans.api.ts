import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import type {
  AssignPlanRequest,
  CreatePlanCheckoutRequest,
  PaymentConfigResponse,
  PlanCheckoutResponse,
  PlanResponse,
  PlanTransactionResponse,
  ShopPlanStatusResponse,
  UsageResponse,
  VerifyPlanPaymentRequest,
  VerifyPlanPaymentResponse,
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

  createCheckout: async (data: CreatePlanCheckoutRequest): Promise<PlanCheckoutResponse> => {
    const response = await apiClient.post<ApiResponse<PlanCheckoutResponse>>(
      PLAN_ENDPOINTS.PAYMENT_CHECKOUT,
      data,
    );
    return response.data;
  },

  verifyPayment: async (data: VerifyPlanPaymentRequest): Promise<VerifyPlanPaymentResponse> => {
    const response = await apiClient.post<ApiResponse<VerifyPlanPaymentResponse>>(
      PLAN_ENDPOINTS.PAYMENT_VERIFY,
      data,
    );
    return response.data;
  },
};
