import { useState } from 'react';
import { shopsApi } from '@inventory-platform/api';
import type { JoinRequest, UserRole } from '@inventory-platform/types';
import { RoleBadge } from './RoleBadge';
import styles from './JoinRequestCard.module.css';
import { useNotify } from '@inventory-platform/store';

interface JoinRequestCardProps {
  joinRequest: JoinRequest;
  onProcess?: () => void;
  showActions?: boolean;
}

export function JoinRequestCard({
  joinRequest,
  onProcess,
  showActions = false,
}: JoinRequestCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { error: notifyError } = useNotify;

  const handleProcess = async (action: 'ACCEPT' | 'REJECT') => {
    if (joinRequest.status !== 'PENDING') {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      await shopsApi.processJoinRequest(joinRequest.requestId, { action });
      if (onProcess) {
        onProcess();
      }
    } catch (err: any) {
      notifyError(err?.message || `Failed to ${action.toLowerCase()} request`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'PENDING':
        return styles.statusPending;
      case 'APPROVED':
        return styles.statusApproved;
      case 'REJECTED':
        return styles.statusRejected;
      default:
        return styles.statusDefault;
    }
  };

  const isPending = joinRequest.status === 'PENDING';

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.topRow}>
          <div className={styles.userInfo}>
            <h3 className={styles.userName}>{joinRequest.userName}</h3>
            <span className={styles.userEmail}>{joinRequest.userEmail}</span>
          </div>
          <RoleBadge role={joinRequest.requestedRole as UserRole} />
        </div>
        <span
          className={`${styles.status} ${getStatusColor(joinRequest.status)}`}
        >
          {joinRequest.status}
        </span>
      </div>

      <div className={styles.details}>
        <div className={styles.detailRow}>
          <span className={styles.label}>Shop:</span>
          <span className={styles.value}>{joinRequest.shopName}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.label}>Requested Role:</span>
          <span className={styles.value}>{joinRequest.requestedRole}</span>
        </div>
        {joinRequest.message && (
          <div className={styles.detailRow}>
            <span className={styles.label}>Message:</span>
            <span className={styles.value}>{joinRequest.message}</span>
          </div>
        )}
        <div className={styles.detailRow}>
          <span className={styles.label}>Requested:</span>
          <span className={styles.value}>
            {new Date(joinRequest.createdAt).toLocaleDateString()}
          </span>
        </div>
        {joinRequest.reviewedAt && (
          <div className={styles.detailRow}>
            <span className={styles.label}>Reviewed:</span>
            <span className={styles.value}>
              {new Date(joinRequest.reviewedAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      {showActions && isPending && (
        <div className={styles.actions}>
          <button
            className={styles.rejectButton}
            onClick={() => handleProcess('REJECT')}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Reject'}
          </button>
          <button
            className={styles.acceptButton}
            onClick={() => handleProcess('ACCEPT')}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Accept'}
          </button>
        </div>
      )}
    </div>
  );
}
