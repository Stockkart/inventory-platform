import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/session';
import { InvitationList } from '../../ui';
import { Button, Stack, Text } from '@inventory-platform/ui-kit';

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
    <Stack
      gap="lg"
      width="full"
      maxWidth="md"
      mx="auto"
      padding="lg"
      style={{ minHeight: '100vh' }}
    >
      <Stack gap="xs">
        <Button variant="ghost" onClick={() => navigate('/shop-selection')}>
          ← Back
        </Button>
        <Text variant="heading1">My requests & invitations</Text>
        <Text color="secondary">
          View invitations to join shops and accept them here. After accepting, you&apos;ll be taken
          to the dashboard.
        </Text>
      </Stack>

      <InvitationList
        key={refreshKey}
        showMyInvitations={true}
        showAcceptButton={true}
        onInvitationChange={handleInvitationChange}
      />
    </Stack>
  );
}
