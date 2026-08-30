import { Navigate, useLocation } from 'react-router';
import { ESTIMATES_LIST_PATH } from '../lib/estimatePaths';

/** Old `/dashboard/estimates/workspace` URLs → Estimates list with the same query. */
export default function EstimateWorkspaceRedirect() {
  const { search } = useLocation();
  return <Navigate to={`${ESTIMATES_LIST_PATH}${search}`} replace />;
}

export function meta() {
  return [
    { title: 'Sell Estimate - StockKart' },
    {
      name: 'description',
      content: 'Build a printable estimate, then convert it to an invoice',
    },
  ];
}
