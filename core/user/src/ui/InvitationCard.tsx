import { useState } from 'react';
import { invitationsApi } from '../api/invitations.api';
import type { Invitation, UserRole } from '@inventory-platform/user/types';
import { RoleBadge } from './RoleBadge';
import styles from './InvitationCard.module.css';
import { useNotify } from '@inventory-platform/session';

interface InvitationCardProps {
  invitation: Invitation;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export function InvitationCard({
  invitation,
  onAccept,
  showAcceptButton = false,
}: InvitationCardProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { error: notifyError } = useNotify;

  const handleAccept = async () => {
    if (invitation.status !== 'PENDING') {
      return;
    }

    setIsAccepting(true);
    setError(null);

    try {
      await invitationsApi.acceptInvitation(invitation.invitationId);
      if (onAccept) {
        onAccept();
      }
    } catch (err: any) {
      notifyError(err?.message || 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'PENDING':
        return styles.statusPending;
      case 'ACCEPTED':
        return styles.statusAccepted;
      case 'REJECTED':
        return styles.statusRejected;
      case 'EXPIRED':
        return styles.statusExpired;
      default:
        return styles.statusDefault;
    }
  };

  const isExpired = new Date(invitation.expiresAt) < new Date();
  const isPending = invitation.status === 'PENDING' && !isExpired;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.topRow}>
          <div className={styles.shopInfo}>
            <h3 className={styles.shopName}>{invitation.shopName}</h3>
          </div>
          <RoleBadge role={invitation.role as UserRole} />
        </div>
        <span
          className={`${styles.status} ${getStatusColor(invitation.status)}`}
        >
          {isExpired && invitation.status === 'PENDING'
            ? 'EXPIRED'
            : invitation.status}
        </span>
      </div>

      <div className={styles.details}>
        <div className={styles.detailRow}>
          <span className={styles.label}>Invited by:</span>
          <span className={styles.value}>
            {invitation.inviterName || invitation.inviterUserId}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.label}>Email:</span>
          <span className={styles.value}>{invitation.inviteeEmail}</span>
        </div>
        {invitation.inviteeName && (
          <div className={styles.detailRow}>
            <span className={styles.label}>Name:</span>
            <span className={styles.value}>{invitation.inviteeName}</span>
          </div>
        )}
        <div className={styles.detailRow}>
          <span className={styles.label}>Invited:</span>
          <span className={styles.value}>
            {new Date(invitation.createdAt).toLocaleDateString()}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.label}>Expires:</span>
          <span className={styles.value}>
            {new Date(invitation.expiresAt).toLocaleDateString()}
          </span>
        </div>
        {invitation.acceptedAt && (
          <div className={styles.detailRow}>
            <span className={styles.label}>Accepted:</span>
            <span className={styles.value}>
              {new Date(invitation.acceptedAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {showAcceptButton && isPending && (
        <button
          className={styles.acceptButton}
          onClick={handleAccept}
          disabled={isAccepting}
        >
          {isAccepting ? 'Accepting...' : 'Accept Invitation'}
        </button>
      )}
    </div>
  );
}
