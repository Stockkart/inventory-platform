import { Navigate } from 'react-router';

/** Old Sales MIS URL — now a tab on Customer MIS. */
export default function SalesMisRedirect() {
  return <Navigate to="/dashboard/mis/customer-money?tab=sales" replace />;
}

export function meta() {
  return [{ title: 'Customer MIS - StockKart' }];
}
