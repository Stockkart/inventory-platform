import { useState, useEffect, useCallback } from 'react';
import { invitationsClient } from './invitationsClient';
import type { Invitation } from '@inventory-platform/types';
import { InvitationCard } from './InvitationCard';
import styles from './InvitationList.module.css';
import { useNotify } from '@inventory-platform/store';

interface InvitationListProps {
  shopId?: string;
  showMyInvitations?: boolean;
  showAcceptButton?: boolean;
  onInvitationChange?: () => void;
}

export function InvitationList({
  shopId,
  showMyInvitations = false,
  showAcceptButton = false,
  onInvitationChange,
}: InvitationListProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { error: notifyError } = useNotify;

  const fetchInvitations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let data: Invitation[];

      if (showMyInvitations) {
        data = await invitationsClient.getMyInvitations();
      } else if (shopId) {
        data = await invitationsClient.getShopInvitations(shopId);
      } else {
        throw new Error('shopId or showMyInvitations must be provided');
      }

      setInvitations(data);
    } catch (err: any) {
      notifyError(err?.message || 'Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  }, [shopId, showMyInvitations]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleInvitationAccept = async () => {
    await fetchInvitations();
    if (onInvitationChange) {
      onInvitationChange();
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading invitations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          {error}
          <button className={styles.retryButton} onClick={fetchInvitations}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>No invitations found</p>
        </div>
      </div>
    );
  }

  // Group invitations by status
  const pending = invitations.filter(
    (inv) => inv.status === 'PENDING' && new Date(inv.expiresAt) >= new Date()
  );
  const accepted = invitations.filter((inv) => inv.status === 'ACCEPTED');
  const expired = invitations.filter(
    (inv) =>
      inv.status === 'EXPIRED' ||
      (inv.status === 'PENDING' && new Date(inv.expiresAt) < new Date())
  );
  const rejected = invitations.filter((inv) => inv.status === 'REJECTED');

  return (
    <div className={styles.container}>
      {pending.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Pending ({pending.length})</h3>
          <div className={styles.grid}>
            {pending.map((invitation) => (
              <InvitationCard
                key={invitation.invitationId}
                invitation={invitation}
                showAcceptButton={showAcceptButton}
                onAccept={handleInvitationAccept}
              />
            ))}
          </div>
        </div>
      )}

      {accepted.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Accepted ({accepted.length})</h3>
          <div className={styles.grid}>
            {accepted.map((invitation) => (
              <InvitationCard
                key={invitation.invitationId}
                invitation={invitation}
                showAcceptButton={false}
              />
            ))}
          </div>
        </div>
      )}

      {rejected.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Rejected ({rejected.length})</h3>
          <div className={styles.grid}>
            {rejected.map((invitation) => (
              <InvitationCard
                key={invitation.invitationId}
                invitation={invitation}
                showAcceptButton={false}
              />
            ))}
          </div>
        </div>
      )}

      {expired.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Expired ({expired.length})</h3>
          <div className={styles.grid}>
            {expired.map((invitation) => (
              <InvitationCard
                key={invitation.invitationId}
                invitation={invitation}
                showAcceptButton={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
