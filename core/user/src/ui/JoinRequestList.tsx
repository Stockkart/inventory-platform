import { useState, useEffect, useCallback } from 'react';
import { shopsApi } from '../api/shops.api';
import type { JoinRequest } from '@inventory-platform/user/types';
import { JoinRequestCard } from './JoinRequestCard';
import { Button, CenteredLoader, EmptyState, Stack, Text } from '@inventory-platform/ui-kit';
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
    <Stack gap="md" width="full">
      <Text variant="heading2" weight="semibold">
        {title}
      </Text>
      <Stack gap="md" width="full">
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
  }, [shopId, notifyError]);

  useEffect(() => {
    fetchJoinRequests();
  }, [fetchJoinRequests]);

  const handleRequestProcess = () => {
    fetchJoinRequests();
    if (onRequestChange) {
      onRequestChange();
    }
  };

  const pendingRequests = joinRequests.filter((r) => r.status === 'PENDING');
  const approvedRequests = joinRequests.filter((r) => r.status === 'APPROVED');
  const rejectedRequests = joinRequests.filter((r) => r.status === 'REJECTED');

  if (isLoading) {
    return <CenteredLoader label="Loading join requests..." />;
  }

  if (error) {
    return (
      <Stack gap="md" align="center">
        <Text color="danger">{error}</Text>
        <Button onClick={fetchJoinRequests}>Retry</Button>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" width="full">
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
      {joinRequests.length === 0 ? <EmptyState title="No join requests found." /> : null}
    </Stack>
  );
}
