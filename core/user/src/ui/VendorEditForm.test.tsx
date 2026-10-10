import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { UpdateVendorDto } from '@inventory-platform/user/types';
import type { GstinLookupResult } from '../model/gstin-lookup.types';
import { VendorEditForm, prefillFromGstin, vendorIsPlaceable } from './VendorEditForm';

const api = vi.hoisted(() => ({ lookup: vi.fn(), reverify: vi.fn(), settings: vi.fn() }));
vi.mock('../api/gstin.api', () => ({ gstinApi: api }));

const RECORD: GstinLookupResult = {
  gstin: '27AAPFU0939F1ZV',
  valid: true,
  verified: true,
  verificationAvailable: true,
  problem: null,
  status: 'Active',
  legalName: 'UNITED PHOSPHORUS LIMITED',
  tradeName: 'UPL',
  taxpayerType: 'Regular',
  stateCode: '27',
  stateName: 'Maharashtra',
  registrationDate: '2017-07-01',
  cancellationDate: null,
  address: 'UPL HOUSE, BANDRA',
  city: 'MUMBAI',
  pincode: '400051',
  addressDetails: null,
  lastCheckedAt: '2026-10-09T10:00:00Z',
};

function Harness({ initial = {} }: { initial?: UpdateVendorDto }) {
  const [value, setValue] = useState<UpdateVendorDto>(initial);
  return (
    <>
      <VendorEditForm value={value} onChange={setValue} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}

function renderForm(initial?: UpdateVendorDto) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Harness initial={initial} />
    </QueryClientProvider>,
  );
}

const current = () =>
  JSON.parse(screen.getByTestId('value').textContent || '{}') as UpdateVendorDto;

beforeEach(() => {
  api.lookup.mockReset();
  api.lookup.mockResolvedValue(RECORD);
  api.settings.mockReset();
  api.settings.mockResolvedValue({ verificationEnabled: true, provider: 'gstinapi.in' });
});

describe('<VendorEditForm> with verification switched off', () => {
  it('keeps the GSTIN as plain text, never looks it up, and needs no state', async () => {
    api.settings.mockResolvedValue({ verificationEnabled: false, provider: 'none' });
    renderForm();
    await waitFor(() => expect(api.settings).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('GSTIN / UIN'), { target: { value: 'anything goes' } });
    expect(current().gstinUin).toBe('anything goes');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByLabelText('State')).not.toBeDisabled();
    expect(vendorIsPlaceable(current(), false)).toBe(true);
    await new Promise((r) => setTimeout(r, 50));
    expect(api.lookup).not.toHaveBeenCalled();
  });
});

describe('<VendorEditForm> GSTIN first', () => {
  it('looks up a complete valid GSTIN once, prefills the empty fields and locks the state', async () => {
    renderForm({ name: 'My usual name' });
    await waitFor(() => expect(api.settings).toHaveBeenCalled());
    const box = screen.getByLabelText('GSTIN / UIN');
    await waitFor(() =>
      expect(box).toHaveAttribute('placeholder', expect.stringContaining('e.g.')),
    );
    fireEvent.change(box, { target: { value: '27aapfu0939f1zv' } });

    await waitFor(() => expect(api.lookup).toHaveBeenCalledTimes(1));
    expect(api.lookup.mock.calls[0][0]).toBe('27AAPFU0939F1ZV');
    await screen.findByText('✔ Active');

    const v = current();
    expect(v.name).toBe('My usual name'); // what the user typed stays
    expect(v.companyName).toBe('UNITED PHOSPHORUS LIMITED');
    expect(v.postalAddress?.stateCode).toBe('27');
    expect(v.postalAddress?.city).toBe('MUMBAI');
    expect(v.postalAddress?.pincode).toBe('400051');
    expect(screen.getByLabelText('State')).toBeDisabled();
    expect(vendorIsPlaceable(v)).toBe(true);
  });

  it('never calls the network for a mistyped GSTIN and says what is wrong', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('GSTIN / UIN'), {
      target: { value: '27AAPFU0939F1ZW' },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(/check character/);
    expect(api.lookup).not.toHaveBeenCalled();
    expect(screen.getByLabelText('State')).not.toBeDisabled();
  });

  it('an unregistered supplier is placed by the state dropdown', async () => {
    renderForm();
    await waitFor(() => expect(api.settings).toHaveBeenCalled());
    expect(vendorIsPlaceable(current())).toBe(false);
    fireEvent.change(screen.getByLabelText('State'), { target: { value: '10' } });
    expect(current().postalAddress?.stateCode).toBe('10');
    expect(vendorIsPlaceable(current())).toBe(true);
  });

  it('warns on a cancelled registration but still fills the form', async () => {
    api.lookup.mockResolvedValue({
      ...RECORD,
      status: 'Cancelled',
      cancellationDate: '2025-03-12',
    });
    renderForm();
    fireEvent.change(screen.getByLabelText('GSTIN / UIN'), {
      target: { value: '27AAPFU0939F1ZV' },
    });
    await screen.findByText('Cancelled');
    expect(screen.getByText(/can't be claimed/)).toBeTruthy();
    expect(current().companyName).toBe('UNITED PHOSPHORUS LIMITED');
  });
});

describe('prefillFromGstin', () => {
  it('fills only empty fields unless asked to overwrite', () => {
    const typed: UpdateVendorDto = {
      name: 'Mine',
      companyName: '',
      postalAddress: { city: 'Pune' },
    };
    const soft = prefillFromGstin(typed, RECORD);
    expect(soft.name).toBe('Mine');
    expect(soft.companyName).toBe('UNITED PHOSPHORUS LIMITED');
    expect(soft.postalAddress?.city).toBe('Pune');
    expect(soft.postalAddress?.stateCode).toBe('27');
    const hard = prefillFromGstin(typed, RECORD, true);
    expect(hard.name).toBe('UPL');
    expect(hard.postalAddress?.city).toBe('MUMBAI');
  });
});
