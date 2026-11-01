import { Outlet } from 'react-router';
import { AdminLayout } from '../ui/AdminLayout';

export default function AdminLayoutRoute() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
