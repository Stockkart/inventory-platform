import { useState } from 'react';
import { Alert, Card, CardBody, PageHeader, Stack, Text } from '@inventory-platform/ui-kit';
import { useAuthStore } from '@inventory-platform/session';
import { InvitationList, InviteForm } from '../ui';

export function InvitationsPage() {
  const { user } = useAuthStore();
  const [refreshKey, setRefreshKey] = useState(0);

  const shopId = user?.shopId;

  if (!shopId) {
    return (
      <Stack gap="md" width="full" maxWidth="xl" mx="auto">
        <Alert variant="danger">You need to be part of a shop to manage invitations.</Alert>
      </Stack>
    );
  }

  if (user?.role === 'CASHIER') {
    return (
      <Stack gap="md" width="full" maxWidth="xl" mx="auto">
        <Alert variant="danger">You don&apos;t have permission to manage invitations.</Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader description="Send invitations to users to join your shop and manage existing invitations" />

      <Stack gap="lg" width="full">
        <Card>
          <CardBody>
            <InviteForm shopId={shopId} onInviteSent={() => setRefreshKey((prev) => prev + 1)} />
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stack gap="md" width="full">
              <Text variant="title" weight="semibold">
                Shop Invitations
              </Text>
              <InvitationList key={refreshKey} shopId={shopId} />
            </Stack>
          </CardBody>
        </Card>
      </Stack>
    </Stack>
  );
}
