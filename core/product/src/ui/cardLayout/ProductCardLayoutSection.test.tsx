import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { Text } from '@inventory-platform/ui-kit';
import { ProductCardLayoutSection } from './ProductCardLayoutSection';
import type {
  CardFieldCatalogResponse,
  CardLayoutsResponse,
  SaveCardLayoutRequest,
  SurfaceLayoutResponse,
} from '../../model/cardLayout.types';
import { FALLBACK_CARD_LAYOUTS } from '../../cardLayout/cardLayoutDefaults';

// ---- API mock ---------------------------------------------------------------------------------

const api = vi.hoisted(() => ({
  getAll: vi.fn(),
  fieldCatalog: vi.fn(),
  save: vi.fn(),
  defaults: vi.fn(),
  get: vi.fn(),
}));
vi.mock('../../api/cardLayout.api', () => ({ cardLayoutApi: api }));
vi.mock('@inventory-platform/session', () => ({
  useNotify: { success: vi.fn(), error: vi.fn() },
}));

const CATALOG: CardFieldCatalogResponse = {
  fields: [
    { fieldKey: 'companyName', label: 'Company', sourceGroup: 'product', valueType: 'text', itemPath: 'companyName', schemaApiKey: null, sensitivity: 'PUBLIC' },
    { fieldKey: 'barcodeText', label: 'Barcode', sourceGroup: 'product', valueType: 'text', itemPath: 'barcode', schemaApiKey: null, sensitivity: 'PUBLIC' },
    { fieldKey: 'description', label: 'Description', sourceGroup: 'product', valueType: 'text', itemPath: 'description', schemaApiKey: null, sensitivity: 'PUBLIC' },
    { fieldKey: 'mrp', label: 'MRP', sourceGroup: 'pricing', valueType: 'currency', itemPath: 'maximumRetailPrice', schemaApiKey: null, sensitivity: 'PUBLIC' },
    { fieldKey: 'sellingPrice', label: 'Selling price', sourceGroup: 'pricing', valueType: 'currency', itemPath: 'sellingPrice', schemaApiKey: null, sensitivity: 'PUBLIC' },
    { fieldKey: 'costPrice', label: 'Cost price', sourceGroup: 'pricing', valueType: 'currency', itemPath: 'costPrice', schemaApiKey: null, sensitivity: 'SHOP_INTERNAL' },
    { fieldKey: 'saleAdditionalDiscount', label: 'Additional discount', sourceGroup: 'pricing', valueType: 'percentage', itemPath: 'saleAdditionalDiscount', schemaApiKey: null, sensitivity: 'PUBLIC' },
    { fieldKey: 'batchNo', label: 'Batch no.', sourceGroup: 'lot', valueType: 'text', itemPath: 'batchNo', schemaApiKey: null, sensitivity: 'PUBLIC' },
    { fieldKey: 'expiryDate', label: 'Expiry', sourceGroup: 'lot', valueType: 'date', itemPath: 'expiryDate', schemaApiKey: null, sensitivity: 'PUBLIC' },
    { fieldKey: 'location', label: 'Location', sourceGroup: 'lot', valueType: 'text', itemPath: 'location', schemaApiKey: null, sensitivity: 'PUBLIC' },
    { fieldKey: 'availableCount', label: 'Available', sourceGroup: 'lot', valueType: 'number', itemPath: 'availableCount', schemaApiKey: null, sensitivity: 'PUBLIC' },
    { fieldKey: 'receivedCount', label: 'Received', sourceGroup: 'lot', valueType: 'number', itemPath: 'receivedCount', schemaApiKey: null, sensitivity: 'PUBLIC' },
    { fieldKey: 'soldCount', label: 'Sold', sourceGroup: 'lot', valueType: 'number', itemPath: 'soldCount', schemaApiKey: null, sensitivity: 'PUBLIC' },
    { fieldKey: 'purchaseDate', label: 'Purchased on', sourceGroup: 'lot', valueType: 'date', itemPath: 'purchaseDate', schemaApiKey: null, sensitivity: 'PUBLIC' },
    { fieldKey: 'hsn', label: 'HSN', sourceGroup: 'product', valueType: 'text', itemPath: 'hsn', schemaApiKey: null, sensitivity: 'PUBLIC' },
  ],
  surfaces: [
    { surfaceId: 'product-search', label: 'Product search', billingModeAware: true, excludedFieldKeys: [] },
    { surfaceId: 'scan-sell', label: 'Scan & Sell results', billingModeAware: true, excludedFieldKeys: ['description'] },
  ],
  limits: { maxSections: 6, maxRowsPerSection: 8, maxFieldsPerRow: 3, maxFieldsTotal: 20, maxTextLength: 40 },
  verticalSchemaLoaded: true,
};

function surface(id: 'product-search' | 'scan-sell', label: string): SurfaceLayoutResponse {
  const l = FALLBACK_CARD_LAYOUTS[id];
  return {
    surfaceId: id,
    label,
    billingModeAware: true,
    isDefault: true,
    updatedAt: null,
    updatedByUserId: null,
    variants: { REGULAR: l.REGULAR, BASIC: l.BASIC },
  };
}

const LAYOUTS: CardLayoutsResponse = {
  surfaces: [surface('product-search', 'Product search'), surface('scan-sell', 'Scan & Sell results')],
};

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: '/profile', element: <ProductCardLayoutSection /> },
      { path: '/elsewhere', element: <Text>elsewhere</Text> },
    ],
    { initialEntries: ['/profile'] },
  );
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router };
}

beforeEach(() => {
  api.getAll.mockReset().mockResolvedValue(LAYOUTS);
  api.fieldCatalog.mockReset().mockResolvedValue(CATALOG);
  api.save.mockReset();
  api.defaults.mockReset();
});

describe('ProductCardLayoutSection (Req 9.2–9.11)', () => {
  it('loads the catalog and layouts, showing one tab per surface and the default fields on', async () => {
    mount();
    expect(await screen.findByRole('heading', { name: 'Product cards' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Product search/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Scan & Sell results/ })).toBeInTheDocument();
    // default product-search layout has 12 fields enabled (4 identity, 3 stock, 3 pricing, 2 dates)
    expect(screen.getByText('12 / 20')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Company$/)).toBeChecked();
    expect(screen.getByLabelText(/^HSN$/)).not.toBeChecked();
    // Save is disabled while nothing changed
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('ticking a field adds a line, selects it in the inspector and marks the draft dirty', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Product cards' });
    fireEvent.click(screen.getByLabelText(/^HSN$/));
    expect(screen.getByText('13 / 20')).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    // the new field is a chip in the layout and the inspector opens on it
    expect(screen.getByRole('button', { name: /^HSN \(selected\)/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Settings for HSN' })).toBeInTheDocument();
    // preview shows it (sample item has hsn 3004)
    expect(screen.getByLabelText('Card preview')).toHaveTextContent('HSN: 3004');
  });

  it('the inspector edits label, emphasis and section of the selected field', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Product cards' });
    fireEvent.click(screen.getByRole('button', { name: /^MRP — edit field/ }));
    const inspector = screen.getByRole('region', { name: 'Settings for MRP' });
    fireEvent.change(within(inspector).getByLabelText('Custom label for MRP'), { target: { value: 'Max price' } });
    expect(screen.getByLabelText('Card preview')).toHaveTextContent('Max price: ₹200.00');
    fireEvent.click(within(inspector).getByRole('button', { name: 'Normal' }));
    fireEvent.change(within(inspector).getByLabelText('Section for MRP'), { target: { value: 'identity' } });
    // MRP now sits in the identity section (first in the preview), before the divider
    const preview = screen.getByLabelText('Card preview').textContent ?? '';
    expect(preview.indexOf('Max price')).toBeLessThan(preview.indexOf('Available'));
    fireEvent.click(within(inspector).getByRole('button', { name: 'Remove from card' }));
    expect(screen.queryByRole('region', { name: 'Settings for MRP' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Card preview')).not.toHaveTextContent('Max price');
  });

  it('Save sends only the selected surface and adopts the server result', async () => {
    api.save.mockImplementation(async (surfaceId: string, req: SaveCardLayoutRequest) => {
      const saved = surface('product-search', 'Product search');
      return {
        ...saved,
        isDefault: false,
        updatedAt: '2026-10-03T00:00:00Z',
        updatedByUserId: 'u1',
        variants: {
          REGULAR: {
            ...saved.variants.REGULAR!,
            // echo back: server resolution of what we sent, with HSN appended
            sections: [
              ...saved.variants.REGULAR!.sections,
              {
                id: req.variants.REGULAR!.sections[req.variants.REGULAR!.sections.length - 1].id,
                title: null,
                dividerAbove: false,
                rows: [{ fields: [{ fieldKey: 'hsn', label: 'HSN', showLabel: true, emphasis: 'NORMAL', valueType: 'text', sourceGroup: 'product', itemPath: 'hsn', schemaApiKey: null, sensitivity: 'PUBLIC' }] }],
              },
            ],
          },
          BASIC: saved.variants.BASIC,
        },
      } satisfies SurfaceLayoutResponse;
    });
    mount();
    await screen.findByRole('heading', { name: 'Product cards' });
    // Toggling on lands in the last section ("dates"), so the save body appends to it.
    fireEvent.click(screen.getByLabelText(/^HSN$/));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(1));
    const [surfaceId, body] = api.save.mock.calls[0] as [string, SaveCardLayoutRequest];
    expect(surfaceId).toBe('product-search');
    expect(Object.keys(body.variants).sort()).toEqual(['BASIC', 'REGULAR']);
    const keys = body.variants.REGULAR!.sections.flatMap((s) => s.rows.flatMap((r) => r.fields.map((f) => f.fieldKey)));
    expect(keys).toContain('hsn');
    await waitFor(() => expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('shows the server validation message and keeps edits when Save fails', async () => {
    api.save.mockRejectedValue(new Error('REGULAR: unknown fields: hsn'));
    mount();
    await screen.findByRole('heading', { name: 'Product cards' });
    fireEvent.click(screen.getByLabelText(/^HSN$/));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('REGULAR: unknown fields: hsn')).toBeInTheDocument();
    expect(screen.getByLabelText(/^HSN$/)).toBeChecked();
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('switching surface keeps per-surface drafts; excluded fields are disabled there', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Product cards' });
    fireEvent.click(screen.getByLabelText(/^HSN$/));
    fireEvent.click(screen.getByRole('button', { name: /^Scan & Sell results/ }));
    expect(screen.getByText('7 / 20')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Description$/)).toBeDisabled();
    // the edited surface is marked in the switcher
    fireEvent.click(screen.getByRole('button', { name: /^Product search •/ }));
    expect(screen.getByText('13 / 20')).toBeInTheDocument();
    expect(screen.getByLabelText(/^HSN$/)).toBeChecked();
  });

  it('join merges two single-field lines into one, split undoes it', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Product cards' });
    // In the default layout the "pricing" section's line 2 (MRP) can be joined into line 1.
    const pricingSection = screen.getByLabelText('Lines in Section 3');
    fireEvent.click(within(pricingSection).getByLabelText('Join line 2 with the previous line'));
    expect(screen.getByLabelText('Card preview')).toHaveTextContent('Selling Price: ₹120.00 | MRP: ₹200.00');
    fireEvent.click(within(pricingSection).getByLabelText('Split line 1 into one field per line'));
    expect(screen.getByLabelText('Card preview')).not.toHaveTextContent('Selling Price: ₹120.00 | MRP');
  });

  it('prompts before navigating away with unsaved changes and stays when declined', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { router } = mount();
    await screen.findByRole('heading', { name: 'Product cards' });
    fireEvent.click(screen.getByLabelText(/^HSN$/));
    await router.navigate('/elsewhere');
    await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
    expect(router.state.location.pathname).toBe('/profile');
    confirmSpy.mockRestore();
  });

  it('shows an error with Retry when a load fails', async () => {
    api.fieldCatalog.mockRejectedValueOnce(new Error('boom'));
    mount();
    expect(await screen.findByText('Could not load the product card settings.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'Product cards' })).toBeInTheDocument();
  });
});
