import { useState, useEffect, useCallback } from 'react';
import { shopsApi } from '@inventory-platform/api';
import type { JoinRequest } from '@inventory-platform/types';
import { JoinRequestCard } from './JoinRequestCard';
import styles from './JoinRequestList.module.css';
import { useNotify } from '@inventory-platform/store';

interface JoinRequestListProps {
  shopId?: string;
  onRequestChange?: () => void;
}

export function JoinRequestList({ shopId, onRequestChange }: JoinRequestListProps) {
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { error: notifyError } = useNotify;

  const fetchJoinRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await shopsApi.getJoinRequests(shopId);
      setJoinRequests(data);
    } catch (err: any) {
      notifyError(err?.message || 'Failed to load join requests');
    } finally {
      setIsLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchJoinRequests();
  }, [fetchJoinRequests]);

  const handleRequestProcess = () => {
    fetchJoinRequests();
    if (onRequestChange) {
      onRequestChange();
    }
  };

  // Group requests by status
  const pendingRequests = joinRequests.filter((r) => r.status === 'PENDING');
  const approvedRequests = joinRequests.filter((r) => r.status === 'APPROVED');
  const rejectedRequests = joinRequests.filter((r) => r.status === 'REJECTED');

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading join requests...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={fetchJoinRequests} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {pendingRequests.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Pending Requests ({pendingRequests.length})
          </h2>
          <div className={styles.list}>
            {pendingRequests.map((request) => (
              <JoinRequestCard
                key={request.requestId}
                joinRequest={request}
                onProcess={handleRequestProcess}
                showActions={true}
              />
            ))}
          </div>
        </div>
      )}

      {approvedRequests.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Approved Requests ({approvedRequests.length})
          </h2>
          <div className={styles.list}>
            {approvedRequests.map((request) => (
              <JoinRequestCard
                key={request.requestId}
                joinRequest={request}
                onProcess={handleRequestProcess}
                showActions={false}
              />
            ))}
          </div>
        </div>
      )}

      {rejectedRequests.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Rejected Requests ({rejectedRequests.length})
          </h2>
          <div className={styles.list}>
            {rejectedRequests.map((request) => (
              <JoinRequestCard
                key={request.requestId}
                joinRequest={request}
                onProcess={handleRequestProcess}
                showActions={false}
              />
            ))}
          </div>
        </div>
      )}

      {joinRequests.length === 0 && (
        <div className={styles.emptyState}>
          <p>No join requests found.</p>
        </div>
      )}
    </div>
  );
}
