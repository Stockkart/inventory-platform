import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import type { CreateCustomerDto } from '@inventory-platform/user/types';
import type { GstinLookupResult } from '../model/gstin-lookup.types';
import { CustomerEditForm, prefillCustomerFromGstin } from './CustomerEditForm';

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

function Harness({ initial }: { initial: CreateCustomerDto }) {
  const [value, setValue] = useState<CreateCustomerDto>(initial);
  return (
    <>
      <CustomerEditForm value={value} onChange={setValue} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}

function renderForm(initial: CreateCustomerDto = { name: '' }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Harness initial={initial} />
    </QueryClientProvider>,
  );
}

const current = () =>
  JSON.parse(screen.getByTestId('value').textContent || '{}') as CreateCustomerDto;

beforeEach(() => {
  api.lookup.mockReset();
  api.lookup.mockResolvedValue(RECORD);
  api.settings.mockReset();
  api.settings.mockResolvedValue({ verificationEnabled: true, provider: 'gstinapi.in' });
});

describe('<CustomerEditForm> walk-ins', () => {
  it('needs neither a GSTIN nor a state', async () => {
    renderForm();
    await waitFor(() => expect(api.settings).toHaveBeenCalled());
    expect(screen.getByText(/walk-in or unregistered buyer/)).toBeTruthy();
    expect(screen.getByLabelText('State')).not.toBeDisabled();
    expect(screen.getByLabelText('State')).not.toBeRequired();
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '9876543210' } });
    expect(current().phone).toBe('9876543210');
    expect(current().postalAddress).toBeUndefined();
  });

  it('a state can still be picked by hand for an out-of-state buyer', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('State'), { target: { value: '29' } });
    expect(current().postalAddress?.stateCode).toBe('29');
  });
});

describe('<CustomerEditForm> GSTIN first', () => {
  it('reads the state from a valid GSTIN offline, with no provider', async () => {
    api.settings.mockResolvedValue({ verificationEnabled: false, provider: 'none' });
    renderForm();
    await waitFor(() => expect(api.settings).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('GSTIN'), { target: { value: '27aapfu0939f1zv' } });
    expect(current().gstin).toBe('27AAPFU0939F1ZV');
    expect(current().postalAddress?.stateCode).toBe('27');
    expect(screen.getByLabelText('State')).toBeDisabled();
    await new Promise((r) => setTimeout(r, 50));
    expect(api.lookup).not.toHaveBeenCalled();
  });

  it('looks up a valid GSTIN once and fills what is still empty', async () => {
    renderForm({ name: 'Sharma Medicals' });
    await waitFor(() => expect(api.settings).toHaveBeenCalled());
    fireEvent.change(screen.getByLabelText('GSTIN'), { target: { value: '27AAPFU0939F1ZV' } });
    await waitFor(() => expect(api.lookup).toHaveBeenCalledTimes(1));
    await screen.findByText('✔ Active');
    const v = current();
    expect(v.name).toBe('Sharma Medicals');
    expect(v.partyType).toBe('RETAILER'); // a GSTIN holder is a business, not a consumer
    expect(v.postalAddress?.stateCode).toBe('27');
    expect(v.postalAddress?.city).toBe('MUMBAI');
    expect(v.address).toBe('UPL HOUSE, BANDRA');
  });

  it('clears a state that came from the GSTIN once the GSTIN is edited away', async () => {
    renderForm();
    const box = screen.getByLabelText('GSTIN');
    fireEvent.change(box, { target: { value: '27AAPFU0939F1ZV' } });
    expect(current().postalAddress?.stateCode).toBe('27');
    fireEvent.change(box, { target: { value: '27AAPFU0939F1Z' } });
    expect(current().postalAddress?.stateCode).toBeUndefined();
    expect(screen.getByLabelText('State')).not.toBeDisabled();
  });

  it('flags a mistyped GSTIN and never calls out', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('GSTIN'), { target: { value: '27AAPFU0939F1ZW' } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/check character/);
    expect(api.lookup).not.toHaveBeenCalled();
  });

  it('words a cancelled registration for the buyer side', async () => {
    api.lookup.mockResolvedValue({ ...RECORD, status: 'Cancelled' });
    renderForm();
    fireEvent.change(screen.getByLabelText('GSTIN'), { target: { value: '27AAPFU0939F1ZV' } });
    await screen.findByText(/unregistered buyer/);
  });
});

describe('prefillCustomerFromGstin', () => {
  it('fills only empty fields unless asked to overwrite, and keeps a chosen party type', () => {
    const typed: CreateCustomerDto = {
      name: 'Mine',
      partyType: 'WHOLESALER',
      postalAddress: { city: 'Pune' },
    };
    const soft = prefillCustomerFromGstin(typed, RECORD);
    expect(soft.name).toBe('Mine');
    expect(soft.partyType).toBe('WHOLESALER');
    expect(soft.postalAddress?.city).toBe('Pune');
    expect(soft.postalAddress?.stateCode).toBe('27');
    const hard = prefillCustomerFromGstin(typed, RECORD, true);
    expect(hard.name).toBe('UPL');
    expect(hard.postalAddress?.city).toBe('MUMBAI');
  });
});
