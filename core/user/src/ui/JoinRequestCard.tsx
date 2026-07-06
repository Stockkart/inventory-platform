import { useState } from 'react';
import { shopsApi } from '../api/shops.api';
import type { JoinRequest, UserRole } from '@inventory-platform/user/types';
import { RoleBadge } from './RoleBadge';
import {
  Alert,
  Box,
  Button,
  Card,
  Inline,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import styles from './JoinRequestCard.module.css';
import { useNotify } from '@inventory-platform/session';

interface JoinRequestCardProps {
  joinRequest: JoinRequest;
  onProcess?: () => void;
  showActions?: boolean;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Inline className={styles.detailRow} align="start">
      <Text className={styles.label}>{label}</Text>
      <Text className={styles.value}>{value}</Text>
    </Inline>
  );
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
    <Card className={styles.card}>
      <Stack className={styles.header} gap="sm">
        <Inline className={styles.topRow} align="start">
          <Stack className={styles.userInfo} gap="xs">
            <Text variant="heading3" weight="semibold" className={styles.userName}>
              {joinRequest.userName}
            </Text>
            <Text color="secondary" className={styles.userEmail}>
              {joinRequest.userEmail}
            </Text>
          </Stack>
          <RoleBadge role={joinRequest.requestedRole as UserRole} />
        </Inline>
        <Box
          as="span"
          className={`${styles.status} ${getStatusColor(joinRequest.status)}`}
        >
          {joinRequest.status}
        </Box>
      </Stack>

      <Stack className={styles.details} gap="sm">
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

      {error ? (
        <Alert variant="danger" className={styles.errorMessage}>
          {error}
        </Alert>
      ) : null}

      {showActions && isPending ? (
        <Inline className={styles.actions} gap="sm" justify="end">
          <Button
            variant="outline"
            className={styles.rejectButton}
            onClick={() => handleProcess('REJECT')}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Reject'}
          </Button>
          <Button
            variant="solid"
            className={styles.acceptButton}
            onClick={() => handleProcess('ACCEPT')}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Accept'}
          </Button>
        </Inline>
      ) : null}
    </Card>
  );
}
