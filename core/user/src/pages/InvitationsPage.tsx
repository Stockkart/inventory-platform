import { useState } from 'react';
import { Alert, Card, CardBody, PageHeader, Stack, Text } from '@inventory-platform/ui-kit';
import { useAuthStore } from '@inventory-platform/session';
import { InvitationList, InviteForm } from '../ui';
import styles from './invitations.module.css';

export function InvitationsPage() {
  const { user } = useAuthStore();
  const [refreshKey, setRefreshKey] = useState(0);

  const shopId = user?.shopId;

  if (!shopId) {
    return (
      <Stack gap="md" className={styles.container}>
        <Alert variant="danger">You need to be part of a shop to manage invitations.</Alert>
      </Stack>
    );
  }

  if (user?.role === 'CASHIER') {
    return (
      <Stack gap="md" className={styles.container}>
        <Alert variant="danger">You don&apos;t have permission to manage invitations.</Alert>
      </Stack>
    );
  }

  return (
    <Stack gap="md" className={styles.container}>
      <PageHeader
        title="Manage Invitations"
        description="Send invitations to users to join your shop and manage existing invitations"
      />

      <Stack gap="lg" className={styles.content}>
        <Card className={styles.section}>
          <CardBody>
            <InviteForm shopId={shopId} onInviteSent={() => setRefreshKey((prev) => prev + 1)} />
          </CardBody>
        </Card>

        <Card className={styles.section}>
          <CardBody>
            <Text variant="title" weight="semibold" className={styles.sectionTitle}>
              Shop Invitations
            </Text>
            <InvitationList key={refreshKey} shopId={shopId} />
          </CardBody>
        </Card>
      </Stack>
    </Stack>
  );
}
