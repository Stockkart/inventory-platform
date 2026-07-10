import { useState, useEffect, useCallback } from 'react';
import { shopsApi } from '../api/shops.api';
import type { JoinRequest } from '@inventory-platform/user/types';
import { JoinRequestCard } from './JoinRequestCard';
import { Box, Button, CenteredLoader, EmptyState, Stack, Text } from '@inventory-platform/ui-kit';
import styles from './JoinRequestList.module.css';
import { useNotify } from '@inventory-platform/session';

interface JoinRequestListProps {
  shopId?: string;
  onRequestChange?: () => void;
}

interface JoinRequestSectionProps {
  title: string;
  requests: JoinRequest[];
  showActions: boolean;
  onProcess?: () => void;
}

function JoinRequestSection({ title, requests, showActions, onProcess }: JoinRequestSectionProps) {
  if (requests.length === 0) {
    return null;
  }

  return (
    <Stack className={styles.section} gap="md">
      <Text variant="heading2" weight="semibold" className={styles.sectionTitle}>
        {title}
      </Text>
      <Stack className={styles.list} gap="md">
        {requests.map((request) => (
          <JoinRequestCard
            key={request.requestId}
            joinRequest={request}
            onProcess={onProcess}
            showActions={showActions}
          />
        ))}
      </Stack>
    </Stack>
  );
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
      <Box className={styles.container}>
        <CenteredLoader label="Loading join requests..." className={styles.loading} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className={styles.container}>
        <Stack className={styles.error} gap="md" align="center">
          <Text color="danger">{error}</Text>
          <Button className={styles.retryButton} onClick={fetchJoinRequests}>
            Retry
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack className={styles.container} gap="md">
      <JoinRequestSection
        title={`Pending Requests (${pendingRequests.length})`}
        requests={pendingRequests}
        showActions
        onProcess={handleRequestProcess}
      />
      <JoinRequestSection
        title={`Approved Requests (${approvedRequests.length})`}
        requests={approvedRequests}
        showActions={false}
        onProcess={handleRequestProcess}
      />
      <JoinRequestSection
        title={`Rejected Requests (${rejectedRequests.length})`}
        requests={rejectedRequests}
        showActions={false}
        onProcess={handleRequestProcess}
      />
      {joinRequests.length === 0 ? (
        <EmptyState title="No join requests found." className={styles.emptyState} />
      ) : null}
    </Stack>
  );
}
