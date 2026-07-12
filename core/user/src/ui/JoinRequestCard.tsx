import { useState } from 'react';
import { shopsApi } from '../api/shops.api';
import type { JoinRequest, UserRole } from '@inventory-platform/user/types';
import type { BadgeVariant } from '@inventory-platform/ui-kit';
import { RoleBadge } from './RoleBadge';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Inline,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';

interface JoinRequestCardProps {
  joinRequest: JoinRequest;
  onProcess?: () => void;
  showActions?: boolean;
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

function formatStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

/** Compact card kept for reuse outside the admin table list. */
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
      onProcess?.();
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : `Failed to ${action.toLowerCase()} request`);
    } finally {
      setIsProcessing(false);
    }
  };

  const isPending = joinRequest.status === 'PENDING';

  return (
    <Card className={surfaceChrome.inviteCardCompact}>
      <CardBody className={surfaceChrome.inviteCardBody}>
        <Box className={surfaceChrome.inviteCardHeader}>
          <Box className={surfaceChrome.invitePrimaryCell}>
            <Text as="p" className={surfaceChrome.invitePrimaryName}>
              {joinRequest.userName}
            </Text>
            <Text as="p" className={surfaceChrome.invitePrimaryMeta}>
              {joinRequest.userEmail}
            </Text>
            <Inline gap="sm" flexWrap>
              <RoleBadge role={joinRequest.requestedRole as UserRole} />
              <Badge variant={statusVariant(joinRequest.status)}>
                {formatStatus(joinRequest.status)}
              </Badge>
            </Inline>
          </Box>
          {showActions && isPending ? (
            <Inline gap="xs">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void handleProcess('REJECT')}
                disabled={isProcessing}
              >
                Reject
              </Button>
              <Button
                type="button"
                size="sm"
                variant="solid"
                onClick={() => void handleProcess('ACCEPT')}
                disabled={isProcessing}
              >
                {isProcessing ? 'Saving…' : 'Approve'}
              </Button>
            </Inline>
          ) : null}
        </Box>

        <Box as="dl" className={surfaceChrome.inviteCardMeta}>
          <Text as="dt" className={surfaceChrome.inviteCardMetaLabel}>
            Shop
          </Text>
          <Text as="dd" className={surfaceChrome.inviteCardMetaValue}>
            {joinRequest.shopName}
          </Text>
          {joinRequest.message ? (
            <>
              <Text as="dt" className={surfaceChrome.inviteCardMetaLabel}>
                Message
              </Text>
              <Text as="dd" className={surfaceChrome.inviteCardMetaValue}>
                {joinRequest.message}
              </Text>
            </>
          ) : null}
          <Text as="dt" className={surfaceChrome.inviteCardMetaLabel}>
            Requested
          </Text>
          <Text as="dd" className={surfaceChrome.inviteCardMetaValue}>
            {formatDate(joinRequest.createdAt)}
          </Text>
          {joinRequest.reviewedAt ? (
            <>
              <Text as="dt" className={surfaceChrome.inviteCardMetaLabel}>
                Reviewed
              </Text>
              <Text as="dd" className={surfaceChrome.inviteCardMetaValue}>
                {formatDate(joinRequest.reviewedAt)}
              </Text>
            </>
          ) : null}
        </Box>

        {error ? <Alert variant="danger">{error}</Alert> : null}
      </CardBody>
    </Card>
  );
}
