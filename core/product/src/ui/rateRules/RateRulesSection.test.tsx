import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { RateRulesSection } from './RateRulesSection';
import type {
  RateRulesPreviewResponse,
  RateRulesResponse,
  UpdateRateRulesRequest,
} from '../../model/rateRules.types';

// ---- API mock ---------------------------------------------------------------------------------

const api = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn(), preview: vi.fn() }));
vi.mock('../../api/rateRules.api', () => ({ rateRulesApi: api }));
vi.mock('@inventory-platform/session', () => ({
  useNotify: { success: vi.fn(), error: vi.fn() },
  useShopCapabilitiesStore: {
    getState: () => ({ clear: vi.fn(), fetchCapabilities: vi.fn().mockResolvedValue(undefined) }),
  },
}));

const RULES: RateRulesResponse = {
  enabled: true,
  canEdit: true,
  baseOptions: ['priceToRetail', 'maximumRetailPrice'],
  rules: [
    { name: 'Wholesale', base: 'priceToRetail', discountPercent: 5, scheme: null },
    {
      name: 'Retail',
      base: 'maximumRetailPrice',
      discountPercent: 10,
      scheme: { schemeType: 'FIXED_UNITS', schemePayFor: 10, schemeFree: 1 },
    },
  ],
};

const PREVIEW: RateRulesPreviewResponse = {
  rates: [
    {
      name: 'Wholesale',
      price: 83.64,
      base: 'priceToRetail',
      termsText: 'PTR less 5% plus GST',
      gstMode: 'EXCLUSIVE',
    },
  ],
  skipped: [],
};

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter([{ path: '/profile', element: <RateRulesSection /> }], {
    initialEntries: ['/profile'],
  });
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  api.get.mockReset().mockResolvedValue(RULES);
  api.update.mockReset().mockImplementation(async (body: UpdateRateRulesRequest) => ({
    ...RULES,
    rules: body.rules,
  }));
  api.preview.mockReset().mockResolvedValue(PREVIEW);
});

describe('RateRulesSection', () => {
  it('rendersBaseOptionsFromApi', async () => {
    mount();
    const selects = await screen.findAllByLabelText('Base');
    expect(selects).toHaveLength(2);
    const options = Array.from((selects[0] as HTMLSelectElement).options).map((o) => o.value);
    expect(options).toEqual(['priceToRetail', 'maximumRetailPrice']);
    expect(Array.from((selects[0] as HTMLSelectElement).options).map((o) => o.text)).toEqual([
      'PTR',
      'MRP',
    ]);
    expect((selects[1] as HTMLSelectElement).value).toBe('maximumRetailPrice');
  });

  it('hidesBasePickerWhenOneOption', async () => {
    api.get.mockResolvedValue({ ...RULES, baseOptions: ['sellingPrice'] });
    mount();
    await screen.findAllByLabelText('Rate name');
    expect(screen.queryByLabelText('Base')).toBeNull();
  });

  it('showsPreviewTermsAndPriceFromApi', async () => {
    mount();
    expect(await screen.findByText('83.64 + GST')).toBeTruthy();
    expect(screen.getByText('PTR less 5% plus GST')).toBeTruthy();
    // The shared, read-only generated rates list: no terms editor in the sample.
    expect(screen.getByRole('list', { name: 'Generated rates' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Reset .* to rule/ })).toBeNull();
    const body = api.preview.mock.calls[0][0];
    expect(body.rules.map((r: { name: string }) => r.name)).toEqual(['Wholesale', 'Retail']);
  });

  it('showsSkippedReasonInWords', async () => {
    api.preview.mockResolvedValue({
      ...PREVIEW,
      skipped: [{ name: 'Retail', reason: 'BELOW_COST' }],
    });
    mount();
    expect(await screen.findByText('Retail not generated: below cost')).toBeTruthy();
    expect(screen.queryByText(/BELOW_COST/)).toBeNull();
  });

  it('savesOrderedRules', async () => {
    mount();
    await screen.findAllByLabelText('Rate name');
    fireEvent.click(screen.getByRole('button', { name: 'Move Wholesale down' }));
    fireEvent.change(screen.getAllByLabelText('Discount %')[0], { target: { value: '12.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save rules' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1));
    expect(api.update.mock.calls[0][0]).toEqual({
      rules: [
        {
          name: 'Retail',
          base: 'maximumRetailPrice',
          discountPercent: 12.5,
          scheme: { schemeType: 'FIXED_UNITS', schemePayFor: 10, schemeFree: 1 },
        },
        { name: 'Wholesale', base: 'priceToRetail', discountPercent: 5, scheme: null },
      ],
    });
  });

  it('rendersNothingWhenDisabled', async () => {
    api.get.mockResolvedValue({ ...RULES, enabled: false, rules: [] });
    const { container } = mount();
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/Loading/)).toBeNull());
    expect(screen.queryByText('Rate rules')).toBeNull();
    expect(container.textContent).toBe('');
  });

  it('readOnlyWithoutCanEdit', async () => {
    api.get.mockResolvedValue({ ...RULES, canEdit: false });
    mount();
    expect(await screen.findByText('Wholesale')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save rules' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Add rule/ })).toBeNull();
    const body = api.preview.mock.calls[0]?.[0];
    expect(body?.rules).toBeUndefined();
  });
});
