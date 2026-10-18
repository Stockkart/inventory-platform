// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@inventory-platform/api-client';
import { productKeys } from './keys';
import {
  afterRateRulesSaveFailed,
  afterRateRulesSaved,
  useRateRulesAvailable,
  useUpdateRateRulesMutation,
} from './rateRules.queries';
import type { RateRulesResponse } from '../model/rateRules.types';

const capabilities = vi.hoisted(() => ({
  clear: vi.fn(),
  fetchCapabilities: vi.fn(async () => undefined),
}));
vi.mock('@inventory-platform/session', () => ({
  useShopCapabilitiesStore: { getState: () => capabilities },
}));
const api = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn(), preview: vi.fn() }));
vi.mock('../api/rateRules.api', () => ({ rateRulesApi: api }));

const SAVED: RateRulesResponse = {
  enabled: true,
  canEdit: true,
  baseOptions: ['sellingPrice', 'priceToRetail', 'maximumRetailPrice'],
  rules: [
    {
      name: 'Rate-A',
      base: 'priceToRetail',
      discountPercent: 8,
      scheme: { schemeType: 'FIXED_UNITS', schemePayFor: 10, schemeFree: 1 },
    },
  ],
};

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('afterRateRulesSaved', () => {
  it('invalidatesRulesThenForceReloadsThisShopsCapabilitiesWithoutClearing', async () => {
    const queryClient = new QueryClient();
    const calls: string[] = [];
    vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(async () => {
      calls.push('invalidate');
    });
    capabilities.fetchCapabilities.mockImplementation(async () => {
      calls.push('fetch');
    });

    await afterRateRulesSaved(queryClient, capabilities);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: productKeys.rateRules(),
    });
    expect(capabilities.fetchCapabilities).toHaveBeenCalledWith({ force: true });
    expect(capabilities.clear).not.toHaveBeenCalled();
    expect(calls).toEqual(['invalidate', 'fetch']);
  });
});

describe('afterRateRulesSaveFailed', () => {
  it('reloadsRulesOnForbidden', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

    await afterRateRulesSaveFailed(
      queryClient,
      new ApiError('Access denied', { status: 403, code: 'ACCESS_DENIED' }),
    );

    expect(invalidate).toHaveBeenCalledWith({ queryKey: productKeys.rateRules() });
  });

  it('leavesRulesAloneOnValidationError', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

    await afterRateRulesSaveFailed(queryClient, new ApiError('Bad rule', { status: 400 }));

    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('useUpdateRateRulesMutation', () => {
  it('onSuccessInvalidatesRulesAndForceReloadsCapabilities', async () => {
    api.update.mockResolvedValue(SAVED);
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const setData = vi.spyOn(queryClient, 'setQueryData');
    const { result } = renderHook(() => useUpdateRateRulesMutation(), { wrapper });

    await act(() => result.current.mutateAsync({ rules: SAVED.rules }));

    expect(api.update).toHaveBeenCalledWith({ rules: SAVED.rules });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: productKeys.rateRules() });
    expect(capabilities.fetchCapabilities).toHaveBeenCalledWith({ force: true });
    expect(capabilities.clear).not.toHaveBeenCalled();
    expect(setData).not.toHaveBeenCalled();
  });

  it('onForbiddenInvalidatesRules', async () => {
    api.update.mockRejectedValue(new ApiError('Access denied', { status: 403 }));
    const { queryClient, wrapper } = setup();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateRateRulesMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ rules: [] }).catch(() => undefined);
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: productKeys.rateRules() });
    expect(capabilities.fetchCapabilities).not.toHaveBeenCalled();
  });
});

describe('useRateRulesAvailable', () => {
  it('falseOnlyWhenApiSaysDisabled', async () => {
    api.get.mockResolvedValue({ ...SAVED, enabled: false, rules: [] });
    const { wrapper } = setup();
    const { result } = renderHook(() => useRateRulesAvailable(), { wrapper });

    expect(result.current).toBe(true);
    await waitFor(() => expect(result.current).toBe(false));
  });

  it('trueWhenEnabled', async () => {
    api.get.mockResolvedValue(SAVED);
    const { wrapper } = setup();
    const { result } = renderHook(() => useRateRulesAvailable(), { wrapper });

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(result.current).toBe(true);
  });
});
