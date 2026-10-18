import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { productKeys } from './keys';
import { afterRateRulesSaved } from './rateRules.queries';

vi.mock('@inventory-platform/session', () => ({
  useShopCapabilitiesStore: { getState: vi.fn() },
}));

describe('afterRateRulesSaved', () => {
  it('updateInvalidatesRateRulesQueryAndRefreshesCapabilities', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    const calls: string[] = [];
    const capabilities = {
      clear: vi.fn(() => {
        calls.push('clear');
      }),
      fetchCapabilities: vi.fn(async () => {
        calls.push('fetch');
      }),
    };

    await afterRateRulesSaved(queryClient, capabilities);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: productKeys.rateRules() });
    expect(calls).toEqual(['clear', 'fetch']);
  });
});
