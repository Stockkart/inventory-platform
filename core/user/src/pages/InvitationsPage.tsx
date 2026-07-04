import { useState } from 'react';
import { useAuthStore } from '@inventory-platform/store';
import { InviteForm, InvitationList } from '@inventory-platform/ui';
import styles from './invitations.module.css';

export function InvitationsPage() {
  const { user } = useAuthStore();
  const [refreshKey, setRefreshKey] = useState(0);

  const shopId = user?.shopId;

  if (!shopId) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          You need to be part of a shop to manage invitations.
        </div>
      </div>
    );
  }

  if (user?.role === 'CASHIER') {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          You don&apos;t have permission to manage invitations.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Manage Invitations</h1>
        <p className={styles.subtitle}>
          Send invitations to users to join your shop and manage existing
          invitations
        </p>
      </div>

      <div className={styles.content}>
        <div className={styles.section}>
          <InviteForm
            shopId={shopId}
            onInviteSent={() => setRefreshKey((prev) => prev + 1)}
          />
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Shop Invitations</h2>
          <InvitationList key={refreshKey} shopId={shopId} />
        </div>
      </div>
    </div>
  );
}
