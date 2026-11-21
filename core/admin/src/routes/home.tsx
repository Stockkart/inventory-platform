import { Navigate } from 'react-router';
import { ADMIN_PATHS } from '../session/adminGuard';

export default function AdminHomeRoute() {
  return <Navigate to={ADMIN_PATHS.mis} replace />;
}
