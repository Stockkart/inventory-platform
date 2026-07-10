import { Alert, Card, CardBody, PageHeader, Stack } from '@inventory-platform/ui-kit';
import { useAuthStore } from '@inventory-platform/session';
import { JoinRequestList } from '../ui';

export function meta() {
  return [
    { title: 'Join Requests - StockKart' },
    { name: 'description', content: 'Manage join requests for your shop' },
  ];
}

export function JoinRequestsPage() {
  const { user } = useAuthStore();

  const shopId = user?.shopId;

  if (!shopId) {
    return (
      <Stack gap="md" width="full" maxWidth="xl" mx="auto">
        <Alert variant="danger">You need to be part of a shop to manage join requests.</Alert>
      </Stack>
    );
  }

  if (user?.role === 'CASHIER') {
    return (
      <Stack gap="md" width="full" maxWidth="xl" mx="auto">
        <Alert variant="danger">You don&apos;t have permission to manage join requests.</Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader
        title="Join Requests"
        description="Review and manage requests from users who want to join your shop"
      />

      <Card>
        <CardBody>
          <JoinRequestList shopId={shopId} />
        </CardBody>
      </Card>
    </Stack>
  );
}
