import { useState } from 'react';
import { useNavigate } from 'react-router';
import { InvitationList } from '@inventory-platform/ui';
import styles from './my-invitations.module.css';

export function MyInvitationsPage() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Invitations</h1>
        <p className={styles.subtitle}>
          View and accept invitations to join shops
        </p>
      </div>

      <div className={styles.content}>
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
      </div>
    </div>
  );
}
