import { useState } from 'react';
import { Alert, Card, CardBody, PageHeader, Stack } from '@inventory-platform/ui-kit';
import { useAuthStore } from '@inventory-platform/session';
import { ShopUsersList } from '../ui';

export function ShopUsersPage() {
  const { user } = useAuthStore();
  const [refreshKey, setRefreshKey] = useState(0);

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
      <PageHeader description="View all users associated with your shop" />

      <Card>
        <CardBody>
          <ShopUsersList
            key={refreshKey}
            shopId={shopId}
            onUserChange={() => setRefreshKey((prev) => prev + 1)}
          />
        </CardBody>
      </Card>
    </Stack>
  );
}
