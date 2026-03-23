import { Navigate } from 'react-router';

// Import section disabled for now – redirect to dashboard
export function meta() {
  return [{ title: 'Import - StockKart' }];
}

export default function ImportRedirect() {
  return <Navigate to="/dashboard" replace />;
}
