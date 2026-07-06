import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardBody, PageHeader, Stack } from '@inventory-platform/ui-kit';
import { InvitationList } from '../ui';
import styles from './my-invitations.module.css';

export function MyInvitationsPage() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <Stack gap="md" className={styles.container}>
      <PageHeader
        title="My Invitations"
        description="View and accept invitations to join shops"
      />

      <Card className={styles.content}>
        <CardBody>
          <InvitationList
            key={refreshKey}
            showMyInvitations={true}
            showAcceptButton={true}
            onInvitationChange={() => {
              setRefreshKey((prev) => prev + 1);
              setTimeout(() => {
                navigate('/dashboard');
              }, 1500);
            }}
          />
        </CardBody>
      </Card>
    </Stack>
  );
}
