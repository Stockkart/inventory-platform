import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@inventory-platform/api-client';
import { rateRulesApi } from './rateRules.api';
import type {
  RateRulesPreviewRequest,
  RateRulesResponse,
  UpdateRateRulesRequest,
} from '../model/rateRules.types';

vi.mock('@inventory-platform/api-client', () => ({
  apiClient: { get: vi.fn(), put: vi.fn(), post: vi.fn() },
}));

describe('rateRulesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getRateRulesCallsActiveShopPath', async () => {
    const payload = { enabled: true, canEdit: true, baseOptions: ['sellingPrice'], rules: [] };
    vi.mocked(apiClient.get).mockResolvedValue({ data: payload });

    const result = await rateRulesApi.get();

    expect(apiClient.get).toHaveBeenCalledWith('/shops/active-shop/rate-rules');
    expect(result).toBe(payload);
  });

  it('updatePutsRulesToActiveShopPath', async () => {
    const body: UpdateRateRulesRequest = {
      rules: [{ name: 'Wholesale', base: 'priceToRetail', discountPercent: 5 }],
    };
    const payload: RateRulesResponse = {
      enabled: true,
      canEdit: true,
      baseOptions: ['priceToRetail', 'maximumRetailPrice'],
      rules: body.rules,
    };
    vi.mocked(apiClient.put).mockResolvedValue({ data: payload });

    const result = await rateRulesApi.update(body);

    expect(apiClient.put).toHaveBeenCalledWith('/shops/active-shop/rate-rules', body);
    expect(result).toBe(payload);
  });

  it('previewPostsRawCostInputs', async () => {
    const body: RateRulesPreviewRequest = {
      sellingPrice: 100,
      priceToRetail: 90,
      maximumRetailPrice: 120,
      costPrice: 70,
      costPriceIncludesTax: true,
      purchaseAdditionalDiscount: 2,
      purchaseScheme: { schemeType: 'FIXED_UNITS', schemePayFor: 10, schemeFree: 1 },
      sgst: '6',
      cgst: '6',
      rules: [{ name: 'Wholesale', base: 'maximumRetailPrice', discountPercent: 5 }],
    };
    const payload = { rates: [], skipped: [] };
    vi.mocked(apiClient.post).mockResolvedValue({ data: payload });

    const result = await rateRulesApi.preview(body);

    expect(apiClient.post).toHaveBeenCalledWith('/shops/active-shop/rate-rules/preview', body);
    expect(result).toBe(payload);
  });
});
