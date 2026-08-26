import { useLayoutEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { CustomerResponse } from '@inventory-platform/user/types';
import { CustomerSellDestinationFlow } from './CustomerSellDestinationFlow';

/**
 * Opens sell vs estimate picker when CRM navigates here with
 * `{ pickSellDestination: true, prefillCustomer }`. Kept in product so `core/user`
 * does not import this package (Nx Vite graph + package boundaries).
 */
export function PendingCustomerSellFlow({ sellPath }: { sellPath: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);

  useLayoutEffect(() => {
    const state = location.state as
      | { prefillCustomer?: CustomerResponse; pickSellDestination?: boolean }
      | null
      | undefined;
    if (!state?.pickSellDestination || !state.prefillCustomer?.customerId) {
      return;
    }
    setCustomer(state.prefillCustomer);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
  }, [location.state, location.pathname, location.search, navigate]);

  return (
    <CustomerSellDestinationFlow
      customer={customer}
      open={customer !== null}
      sellPath={sellPath}
      onClose={() => setCustomer(null)}
    />
  );
}
