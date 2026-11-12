import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CustomerResponse } from '@inventory-platform/user/types';
import { CustomerSearchPanel } from './CustomerSearchPanel';

const CUSTOMER: CustomerResponse = {
  customerId: 'c1',
  name: 'Shiv Medicals',
  phone: '9876543210',
  address: null,
  email: null,
  dlNo: '20B/123',
  dlExpiry: '2020-03-31',
  dlExpired: true,
  createdAt: '',
  updatedAt: '',
};

function renderPanel(selected: CustomerResponse) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CustomerSearchPanel selected={selected} onSelect={vi.fn()} onClear={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('CustomerSearchPanel drug licence', () => {
  it('warns when the selected customer licence has expired', () => {
    renderPanel(CUSTOMER);
    expect(screen.getByRole('alert')).toHaveTextContent("This customer's drug licence expired");
  });

  it('says nothing while the licence is still valid', () => {
    renderPanel({ ...CUSTOMER, dlExpiry: '2099-03-31', dlExpired: false });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(/DL 20B\/123 \(exp /)).toBeInTheDocument();
  });
});
