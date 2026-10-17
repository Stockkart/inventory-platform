import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import type { ShopDetailResponse } from '../model/shop.types';
import { ProfilePage } from '../pages/ProfilePage';

// Feature: new-profile-shop-ui — read-only "Shop" tab is a gradient banner with an at-a-glance
// stat strip (Type/Vertical/Status/Opened) plus Contact/Business/Address field sections.

const api = vi.hoisted(() => ({ getActiveShop: vi.fn(), updateActiveShop: vi.fn() }));
vi.mock('../api/shops.api', () => ({ shopsApi: api }));

const SHOP: ShopDetailResponse = {
  shopId: 'shop-1',
  name: 'Acme Hardware',
  tagline: 'Nuts, bolts and everything',
  contactEmail: 'hello@acme.test',
  contactPhone: '+91 99999 00000',
  gstinNo: '27AAPFU0939F1ZV',
  panNo: 'AAPFU0939F',
  verticalId: 'hardware-store',
  dlNo: 'DL-123',
  fssai: 'FSSAI-9',
  shopType: 'RETAILER',
  sgst: '9%',
  cgst: '9%',
  status: 'ACTIVE',
  createdAt: '2024-03-01T00:00:00Z',
  location: {
    primaryAddress: '12 Market Rd',
    secondaryAddress: 'Unit 4',
    state: 'Maharashtra',
    city: 'Pune',
    pin: '411001',
    country: 'IND',
  },
};

function renderPage(url = '/profile') {
  const router = createMemoryRouter([{ path: '/profile', element: <ProfilePage /> }], {
    initialEntries: [url],
  });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  api.getActiveShop.mockReset();
  api.updateActiveShop.mockReset();
  api.getActiveShop.mockResolvedValue(SHOP);
});

describe('ProfilePage read-only shop view', () => {
  it('renders the banner identity (name + tagline)', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Acme Hardware' })).toBeInTheDocument();
    expect(screen.getByText('Nuts, bolts and everything')).toBeInTheDocument();
  });

  it('renders the stat strip with Type/Vertical/Status/Opened exactly once each', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Acme Hardware' });

    // Stat strip labels appear once (the duplicate "Shop" section was removed).
    expect(screen.getAllByText('Type')).toHaveLength(1);
    expect(screen.getAllByText('Vertical')).toHaveLength(1);
    expect(screen.getAllByText('Status')).toHaveLength(1);
    expect(screen.getAllByText('Opened')).toHaveLength(1);

    // Formatted values from the existing helpers.
    expect(screen.getByText('Retailer')).toBeInTheDocument();
    expect(screen.getByText('Hardware Store')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders the Contact / Business details / Address sections', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Acme Hardware' });

    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('Business details')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    // "Shop" survives only as the tab label; the standalone "Shop" section was removed
    // (its fields now live in the banner stat strip), so there is exactly one occurrence.
    expect(screen.getAllByText('Shop')).toHaveLength(1);
    expect(screen.getByRole('tab', { name: 'Shop' })).toBeInTheDocument();
  });

  it('enters edit mode when "Edit profile" is clicked', async () => {
    renderPage();
    const editButton = await screen.findByRole('button', { name: 'Edit profile' });
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit shop' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });
});
