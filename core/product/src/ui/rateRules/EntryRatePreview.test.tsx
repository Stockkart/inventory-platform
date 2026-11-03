import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EntryRatePreview } from './EntryRatePreview';

const api = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn(), preview: vi.fn() }));
vi.mock('../../api/rateRules.api', () => ({ rateRulesApi: api }));
vi.mock('@inventory-platform/session', () => ({
  useNotify: { success: vi.fn(), error: vi.fn() },
  useShopCapabilitiesStore: { getState: () => ({}) },
}));

function mount(request = { priceToRetail: 100, costPrice: 60 }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EntryRatePreview request={request} />
    </QueryClientProvider>,
  );
}

describe('EntryRatePreview', () => {
  it('shows the previewed rates read-only, with skipped rules', async () => {
    api.preview.mockResolvedValue({
      rates: [
        {
          name: 'Rate-A',
          price: 95,
          base: 'priceToRetail',
          gstMode: 'EXCLUSIVE',
          termsText: 'PTR less 5%',
        },
      ],
      skipped: [{ name: 'Rate-C', reason: 'BELOW_COST' }],
    });
    mount();
    await waitFor(() => expect(screen.getByText('PTR less 5%')).toBeTruthy());
    expect(screen.getByText('Rate-C not generated: below cost')).toBeTruthy();
    expect(screen.queryByLabelText('Discount %')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(api.preview).toHaveBeenCalledWith({ priceToRetail: 100, costPrice: 60 });
  });

  it('does not ask the server before any price is entered', async () => {
    api.preview.mockClear();
    mount({} as never);
    await new Promise((r) => setTimeout(r, 600));
    expect(api.preview).not.toHaveBeenCalled();
  });
});
