import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/session';
import { InvitationList } from '../../ui';
import { Box, Button, Stack, Text } from '@inventory-platform/ui-kit';
import styles from './my-requests-invitations.module.css';

export function meta() {
  return [
    { title: 'My requests & invitations - StockKart' },
    {
      name: 'description',
      content: 'View your invitations and join request status',
    },
  ];
}

export default function MyRequestsInvitationsPage() {
  const navigate = useNavigate();
  const { fetchCurrentUser } = useAuthStore();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleInvitationChange = async () => {
    setRefreshKey((k) => k + 1);
    await fetchCurrentUser();
    const updatedUser = useAuthStore.getState().user;
    if (updatedUser?.shopId) {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <Stack className={styles.container} gap="lg">
      <Stack className={styles.header} gap="xs">
        <Button
          variant="ghost"
          className={styles.backButton}
          onClick={() => navigate('/shop-selection')}
        >
          ← Back
        </Button>
        <Text variant="heading1" className={styles.title}>
          My requests & invitations
        </Text>
        <Text color="secondary" className={styles.subtitle}>
          View invitations to join shops and accept them here. After accepting, you&apos;ll be taken
          to the dashboard.
        </Text>
      </Stack>

      <Box className={styles.content}>
        <InvitationList
          key={refreshKey}
          showMyInvitations={true}
          showAcceptButton={true}
          onInvitationChange={handleInvitationChange}
        />
      </Box>
    </Stack>
  );
}
