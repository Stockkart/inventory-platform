import { useState } from 'react';
import { shopsApi } from '../api/shops.api';
import type { JoinRequest, UserRole } from '@inventory-platform/user/types';
import type { BadgeVariant } from '@inventory-platform/ui-kit';
import { RoleBadge } from './RoleBadge';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Inline,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';

interface JoinRequestCardProps {
  joinRequest: JoinRequest;
  onProcess?: () => void;
  showActions?: boolean;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Inline align="start" gap="sm" width="full">
      <Text color="secondary" variant="caption" style={{ minWidth: '7.5rem' }}>
        {label}
      </Text>
      <Text variant="caption">{value}</Text>
    </Inline>
  );
}

function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    default:
      return 'neutral';
  }
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

  const isPending = joinRequest.status === 'PENDING';

  return (
    <Card>
      <CardBody>
        <Stack gap="md">
          <Stack gap="sm">
            <Inline align="start" gap="sm" width="full">
              <Stack gap="xs">
                <Text variant="heading3" weight="semibold">
                  {joinRequest.userName}
                </Text>
                <Text color="secondary" variant="caption">
                  {joinRequest.userEmail}
                </Text>
              </Stack>
              <RoleBadge role={joinRequest.requestedRole as UserRole} />
            </Inline>
            <Badge variant={statusVariant(joinRequest.status)}>{joinRequest.status}</Badge>
          </Stack>

          <Stack gap="sm">
            <DetailRow label="Shop:" value={joinRequest.shopName} />
            <DetailRow label="Requested Role:" value={joinRequest.requestedRole} />
            {joinRequest.message ? (
              <DetailRow label="Message:" value={joinRequest.message} />
            ) : null}
            <DetailRow
              label="Requested:"
              value={new Date(joinRequest.createdAt).toLocaleDateString()}
            />
            {joinRequest.reviewedAt ? (
              <DetailRow
                label="Reviewed:"
                value={new Date(joinRequest.reviewedAt).toLocaleDateString()}
              />
            ) : null}
          </Stack>

          {error ? <Alert variant="danger">{error}</Alert> : null}

          {showActions && isPending ? (
            <Inline gap="sm" justify="end" width="full">
              <Button
                variant="outline"
                onClick={() => handleProcess('REJECT')}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Reject'}
              </Button>
              <Button
                variant="solid"
                onClick={() => handleProcess('ACCEPT')}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Accept'}
              </Button>
            </Inline>
          ) : null}
        </Stack>
      </CardBody>
    </Card>
  );
}
