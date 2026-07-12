import { Alert, PageHeader, Stack } from '@inventory-platform/ui-kit';
import { useAuthStore } from '@inventory-platform/session';
import { ShopUsersList } from '../ui';

export function ShopUsersPage() {
  const { user } = useAuthStore();
  const shopId = user?.shopId;

  if (!shopId) {
    return (
      <Stack gap="md" width="full" maxWidth="xl" mx="auto">
        <Alert variant="danger">You need to be part of a shop to view users.</Alert>
      </Stack>
    );
  }

  if (user?.role === 'CASHIER') {
    return (
      <Stack gap="md" width="full" maxWidth="xl" mx="auto">
        <Alert variant="danger">You don&apos;t have permission to view shop users.</Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader description="View everyone associated with your shop — owners, members, and invites." />
      <ShopUsersList shopId={shopId} />
    </Stack>
  );
}
