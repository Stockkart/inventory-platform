import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { ApiError } from '@inventory-platform/api-client';
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
    expect(await screen.findByText('83.64')).toBeTruthy();
    expect(screen.getByText('PTR less 5% plus GST')).toBeTruthy();
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

  it('hasOneSaveButton', async () => {
    mount();
    await screen.findAllByLabelText('Rate name');
    expect(screen.getAllByRole('button', { name: /save/i })).toHaveLength(1);
  });

  it('turnsReadOnlyWhenSaveIsForbidden', async () => {
    api.update.mockRejectedValue(
      new ApiError('You cannot edit rate rules', { status: 403, code: 'ACCESS_DENIED' }),
    );
    mount();
    await screen.findAllByLabelText('Rate name');
    fireEvent.change(screen.getAllByLabelText('Discount %')[0], { target: { value: '7' } });
    api.get.mockResolvedValue({ ...RULES, canEdit: false });
    fireEvent.click(screen.getByRole('button', { name: 'Save rules' }));

    expect(
      await screen.findByText('You can view the rate rules but not change them.'),
    ).toBeTruthy();
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save rules' })).toBeNull();
  });

  it('showsServerMessageAndLoadsTheirRulesOnConflict', async () => {
    const message =
      'Rate rules were changed by someone else at the same time. Reload and save again.';
    api.update.mockRejectedValue(new ApiError(message, { status: 409 }));
    mount();
    await screen.findAllByLabelText('Rate name');
    fireEvent.change(screen.getAllByLabelText('Rate name')[0], { target: { value: 'Mine' } });
    api.get.mockResolvedValue({
      ...RULES,
      rules: [{ name: 'Theirs', base: 'priceToRetail', discountPercent: 3, scheme: null }],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save rules' }));

    expect(await screen.findByText(message)).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.getAllByLabelText('Rate name').map((el) => (el as HTMLInputElement).value),
      ).toEqual(['Theirs']),
    );
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Unsaved changes')).toBeNull();
    expect(screen.getByText(message)).toBeTruthy();
  });

  it('keepsTheDraftWhenTheConflictReloadFails', async () => {
    const message =
      'Rate rules were changed by someone else at the same time. Reload and save again.';
    api.update.mockRejectedValue(new ApiError(message, { status: 409 }));
    mount();
    await screen.findAllByLabelText('Rate name');
    fireEvent.change(screen.getAllByLabelText('Rate name')[0], { target: { value: 'Mine' } });
    api.get.mockRejectedValue(new ApiError('Network error', { status: 0 }));
    fireEvent.click(screen.getByRole('button', { name: 'Save rules' }));

    expect(
      await screen.findByText(
        `${message} The latest rules could not be loaded; your changes are kept.`,
      ),
    ).toBeTruthy();
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(
      screen.getAllByLabelText('Rate name').map((el) => (el as HTMLInputElement).value),
    ).toEqual(['Mine', 'Retail']);
    expect(screen.getByText('Unsaved changes')).toBeTruthy();
    expect(screen.queryByText('Could not load the rate rules.')).toBeNull();
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
