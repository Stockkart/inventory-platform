import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '@inventory-platform/store';
import { InvitationList } from '@inventory-platform/user';
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
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate('/shop-selection')}
        >
          ← Back
        </button>
        <h1 className={styles.title}>My requests & invitations</h1>
        <p className={styles.subtitle}>
          View invitations to join shops and accept them here. After accepting,
          you’ll be taken to the dashboard.
        </p>
      </div>

      <div className={styles.content}>
        <InvitationList
          key={refreshKey}
          showMyInvitations={true}
          showAcceptButton={true}
          onInvitationChange={handleInvitationChange}
        />
      </div>
    </div>
  );
}
