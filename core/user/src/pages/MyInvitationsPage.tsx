import { useState } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader, Stack } from '@inventory-platform/ui-kit';
import { InvitationList } from '../ui';

export function MyInvitationsPage() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader description="View and accept invitations to join shops." />

      <InvitationList
        key={refreshKey}
        showMyInvitations
        showAcceptButton
        onInvitationChange={() => {
          setRefreshKey((prev) => prev + 1);
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
        }}
      />
    </Stack>
  );
}
