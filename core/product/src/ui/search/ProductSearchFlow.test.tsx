// Feature: advanced-product-search — setting-up and refining flows (R6.3, R6.3a, R6.4, R6.5, R6.8, R6.10)
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router';
import { Button, Input, Text } from '@inventory-platform/ui-kit';
import type { SearchFieldCatalog, SearchRequest, SearchResponse } from '../../model/search.types';
import { useProductSearch } from '../../search/useProductSearch';
import { SearchFilterStrip } from './SearchFilterStrip';
import { ActiveFilterChips } from './ActiveFilterChips';

// ---- API mock ---------------------------------------------------------------------------------

const api = vi.hoisted(() => ({
  searchAdvanced: vi.fn(),
  searchFields: vi.fn(),
  searchValues: vi.fn(),
}));
vi.mock('../../api/inventory.api', () => ({ inventoryApi: api }));

const CATALOG: SearchFieldCatalog = {
  defaultSort: 'expiryDate:asc',
  verticalSchemaLoaded: true,
  fields: [
    {
      key: 'companyName',
      label: 'Company',
      group: 'product',
      source: 'product',
      type: 'text',
      ops: ['in', 'matches'],
      facet: true,
      sortable: true,
      values: [],
    },
    {
      key: 'location',
      label: 'Location',
      group: 'lot',
      source: 'lot',
      type: 'text',
      ops: ['in', 'matches'],
      facet: true,
      sortable: true,
      values: [],
    },
    {
      key: 'stockState',
      label: 'Stock',
      group: 'lot',
      source: 'computed',
      type: 'enum',
      ops: ['in'],
      facet: true,
      sortable: false,
      values: [
        { value: 'IN_STOCK', label: 'In stock' },
        { value: 'LOW_STOCK', label: 'Low stock' },
        { value: 'SOLD_OUT', label: 'Sold out' },
      ],
    },
    {
      key: 'barcodeText',
      label: 'Barcode',
      group: 'product',
      source: 'product',
      type: 'text',
      ops: ['matches'],
      facet: false,
      sortable: false,
      values: [],
    },
  ],
};

function response(total: number, facets: SearchResponse['facets'] = {}): SearchResponse {
  return {
    data: Array.from(
      { length: Math.min(total, 20) },
      (_, i) => ({ id: `lot-${i}`, name: `Lot ${i}` } as never),
    ),
    page: { page: 0, size: 20, totalItems: total, totalPages: Math.ceil(total / 20) },
    facets,
    appliedSort: 'expiryDate:asc',
  };
}

// ---- harness: the hook + the panel + the chips + a results line ------------------------------------

function Harness() {
  const s = useProductSearch();
  const location = useLocation();
  return (
    <>
      <Text data-testid="mode">{s.mode}</Text>
      <Text data-testid="url">{location.search}</Text>
      <Text data-testid="total">{s.result ? String(s.result.page.totalItems) : '-'}</Text>
      <Text data-testid="error">{s.error ? s.error.message : ''}</Text>
      <Input
        aria-label="Search box"
        value={s.textInput}
        onChange={(e) => s.setTextInput(e.currentTarget.value)}
      />
      <Button onClick={s.submit}>Search</Button>
      <Button onClick={s.retry}>Retry</Button>
      <ActiveFilterChips
        filters={s.state.filters}
        fields={s.fields}
        match={s.state.match}
        onRemove={s.removeFilter}
        onClearAll={s.clearAllFilters}
        onMatchChange={s.changeMatch}
      />
      <SearchFilterStrip
        fields={s.fields}
        state={s.state}
        facets={s.facets}
        onChange={s.applyPanel}
        pinned={s.pinned}
        onPin={s.pin}
        onUnpin={s.unpin}
      />
    </>
  );
}

function renderAt(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/search', element: <Harness /> }], {
    initialEntries: [url],
  });
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

/**
 * Opens a filter's panel: adds it through "+ Add filter" when its pill is not in the strip yet
 * (adding opens it), otherwise clicks the pill. The panel stays open while ticking.
 */
async function openDropdown(label: string) {
  const pill = screen.queryByRole('button', { name: new RegExp(`^${label}(\\s*:|$)`) });
  if (pill) {
    fireEvent.click(pill);
    return;
  }
  fireEvent.click(await screen.findByRole('button', { name: /\+ Add filter/ }));
  fireEvent.click(await screen.findByRole('option', { name: label }));
}

function lastRequest(): SearchRequest {
  const calls = api.searchAdvanced.mock.calls;
  return calls[calls.length - 1][0] as SearchRequest;
}

beforeEach(() => {
  vi.useRealTimers();
  api.searchAdvanced.mockReset();
  api.searchFields.mockReset();
  api.searchValues.mockReset();
  api.searchFields.mockResolvedValue(CATALOG);
  api.searchValues.mockImplementation(async (field: string) =>
    field === 'companyName' ? ['Cipla', 'GSK', 'Sun Pharma'] : ['J1', 'J2'],
  );
  // like the server: only the facets that were asked for come back
  api.searchAdvanced.mockImplementation(async (request: SearchRequest) => {
    const all: SearchResponse['facets'] = {
      companyName: [
        { value: 'Cipla', label: 'Cipla', count: 30 },
        { value: 'GSK', label: 'GSK', count: 12 },
      ],
      location: [{ value: 'J1', label: 'J1', count: 42 }],
      stockState: [],
    };
    const facets: SearchResponse['facets'] = {};
    for (const k of request.facets) if (all[k]) facets[k] = all[k];
    return response(42, facets);
  });
});

describe('setting up (empty URL)', () => {
  it('lists enum values before any search, accumulates filters without requesting, then searches once', async () => {
    renderAt('/search');
    expect(screen.getByTestId('mode').textContent).toBe('settingUp');
    // enum values are known from the catalog alone
    await openDropdown('Stock');
    expect(screen.getByLabelText('In stock')).toBeTruthy();
    expect(screen.getByLabelText('Low stock')).toBeTruthy();
    // text facets fall back to /search/values for their options
    await openDropdown('Company');
    await screen.findByLabelText('GSK');
    fireEvent.click(screen.getByLabelText('Cipla'));
    // one panel open at a time: reopen Stock from its pill
    await openDropdown('Stock');
    fireEvent.click(screen.getByLabelText('Low stock'));

    // chips show, nothing has been requested, URL untouched
    const chips = screen.getByLabelText('Active filters');
    expect(within(chips).getByText('Company')).toBeTruthy();
    expect(within(chips).getByText('Stock')).toBeTruthy();
    expect(api.searchAdvanced).not.toHaveBeenCalled();
    expect(screen.getByTestId('url').textContent).toBe('');

    fireEvent.click(screen.getByText('Search'));
    await waitFor(() => expect(api.searchAdvanced).toHaveBeenCalledTimes(1));
    const req = lastRequest();
    expect(req.text).toBeNull();
    expect(req.filters).toEqual([
      { field: 'companyName', op: 'in', values: ['Cipla'] },
      { field: 'stockState', op: 'in', values: ['LOW_STOCK'] },
    ]);
    // counts only for the pills on the strip, not the whole catalog
    expect(req.facets).toEqual(['companyName', 'stockState']);
    expect(screen.getByTestId('mode').textContent).toBe('refining');
    expect(screen.getByTestId('url').textContent).toContain('f=companyName');
    await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('42'));
  });

  it('the Any/All switch appears only with two or more filters', async () => {
    renderAt('/search');
    await openDropdown('Stock');
    fireEvent.click(screen.getByLabelText('In stock'));
    expect(screen.queryByLabelText('How filters combine')).toBeNull();
    fireEvent.click(screen.getByLabelText('Low stock')); // same group, still one filter
    expect(screen.queryByLabelText('How filters combine')).toBeNull();
    await openDropdown('Company');
    await screen.findByLabelText('GSK');
    fireEvent.click(screen.getByLabelText('GSK'));
    expect(screen.getByLabelText('How filters combine')).toBeTruthy();
  });
});

describe('refining (URL has a search)', () => {
  it('starts from the URL, ticks apply after the debounce, chips and URL follow, counts come from the answer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderAt('/search?q=para&f=companyName:in:Cipla');
    expect(screen.getByTestId('mode').textContent).toBe('refining');
    await waitFor(() => expect(api.searchAdvanced).toHaveBeenCalledTimes(1));
    expect(lastRequest()).toMatchObject({
      text: 'para',
      filters: [{ field: 'companyName', op: 'in', values: ['Cipla'] }],
    });
    await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('42'));
    // the Company pill came from the URL and shows its selection; counts from the answer appear inside
    expect(screen.getByRole('button', { name: /^Company\s*:\s*Cipla/ })).toBeTruthy();
    await openDropdown('Company');
    expect(screen.getByLabelText('30 results')).toBeTruthy();

    // adding the Location pill asks for its counts straight away (one request, same criteria)
    await openDropdown('Location');
    await waitFor(() => expect(api.searchAdvanced).toHaveBeenCalledTimes(2));
    expect(lastRequest().facets).toEqual(['companyName', 'location']);
    expect(lastRequest().filters).toEqual([{ field: 'companyName', op: 'in', values: ['Cipla'] }]);
    await screen.findByLabelText('J1');
    fireEvent.click(screen.getByLabelText('J1'));
    expect(api.searchAdvanced).toHaveBeenCalledTimes(2); // not yet: debounced
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    await waitFor(() => expect(api.searchAdvanced).toHaveBeenCalledTimes(3));
    expect(lastRequest().filters).toEqual([
      { field: 'companyName', op: 'in', values: ['Cipla'] },
      { field: 'location', op: 'in', values: ['J1'] },
    ]);
    expect(lastRequest().text).toBe('para');
    expect(screen.getByTestId('url').textContent).toContain('f=location%3Ain%3AJ1');
    const chips = screen.getByLabelText('Active filters');
    expect(within(chips).getByText('Location')).toBeTruthy();
  });

  it('removing a chip and Clear all apply at once and keep the text', async () => {
    renderAt('/search?q=para&f=companyName:in:Cipla&f=location:in:J1');
    await waitFor(() => expect(api.searchAdvanced).toHaveBeenCalledTimes(1));

    // removing with the pill's ✕ drops the filter and the pill
    fireEvent.click(screen.getByLabelText('Remove Location filter'));
    await waitFor(() => expect(api.searchAdvanced).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('button', { name: /^Location/ })).toBeNull();
    expect(lastRequest().filters).toEqual([{ field: 'companyName', op: 'in', values: ['Cipla'] }]);

    fireEvent.click(within(screen.getByLabelText('Active filters')).getByText('Clear all'));
    await waitFor(() => expect(api.searchAdvanced).toHaveBeenCalledTimes(3));
    expect(lastRequest()).toMatchObject({ text: 'para', filters: [] });
    expect(screen.getByTestId('url').textContent).toBe('?q=para');
  });

  it('text edits wait for Search; a failed search keeps the previous results and can be retried', async () => {
    renderAt('/search?q=para');
    await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('42'));

    fireEvent.change(screen.getByLabelText('Search box'), { target: { value: 'amox' } });
    expect(api.searchAdvanced).toHaveBeenCalledTimes(1);

    api.searchAdvanced.mockRejectedValueOnce(
      new Error('This search is too slow — please narrow it down'),
    );
    fireEvent.click(screen.getByText('Search'));
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('too slow'));
    expect(lastRequest().text).toBe('amox');
    // the old answer is still on screen
    expect(screen.getByTestId('total').textContent).toBe('42');

    api.searchAdvanced.mockResolvedValueOnce(response(3));
    fireEvent.click(screen.getByText('Retry'));
    await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('3'));
    expect(screen.getByTestId('error').textContent).toBe('');
  });
});
