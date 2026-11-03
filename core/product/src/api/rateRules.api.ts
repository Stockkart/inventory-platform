import { apiClient } from '@inventory-platform/api-client';
import type { ApiResponse } from '@inventory-platform/contracts';
import { RATE_RULES_ENDPOINTS } from './endpoints';
import type {
  RateRulesPreviewRequest,
  RateRulesPreviewResponse,
  RateRulesResponse,
  UpdateRateRulesRequest,
} from '../model/rateRules.types';

/** Active-shop rate rules API. All rate maths happens on the server. */
export const rateRulesApi = {
  get: async (): Promise<RateRulesResponse> => {
    const response = await apiClient.get<ApiResponse<RateRulesResponse>>(RATE_RULES_ENDPOINTS.BASE);
    return response.data;
  },
  update: async (data: UpdateRateRulesRequest): Promise<RateRulesResponse> => {
    const response = await apiClient.put<ApiResponse<RateRulesResponse>>(
      RATE_RULES_ENDPOINTS.BASE,
      data,
    );
    return response.data;
  },
  /** Server-computed rates for raw cost inputs; nothing is saved. */
  preview: async (data: RateRulesPreviewRequest): Promise<RateRulesPreviewResponse> => {
    const response = await apiClient.post<ApiResponse<RateRulesPreviewResponse>>(
      RATE_RULES_ENDPOINTS.PREVIEW,
      data,
    );
    return response.data;
  },
};
