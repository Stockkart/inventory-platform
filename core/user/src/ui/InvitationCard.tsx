import { useState } from 'react';
import { invitationsApi } from '../api/invitations.api';
import type { Invitation, UserRole } from '@inventory-platform/user/types';
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
import styles from './InvitationCard.module.css';
import { useNotify } from '@inventory-platform/session';

interface InvitationCardProps {
  invitation: Invitation;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Inline className={styles.detailRow} align="start">
      <Text className={styles.label}>{label}</Text>
      <Text className={styles.value}>{value}</Text>
    </Inline>
  );
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
  const statusLabel =
    isExpired && invitation.status === 'PENDING'
      ? 'EXPIRED'
      : invitation.status;

  return (
    <Card className={styles.card}>
      <Stack className={styles.header} gap="sm">
        <Inline className={styles.topRow} align="start" justify="between">
          <Box className={styles.shopInfo}>
            <Text variant="heading3" weight="semibold" className={styles.shopName}>
              {invitation.shopName}
            </Text>
          </Box>
          <RoleBadge role={invitation.role as UserRole} />
        </Inline>
        <Box
          as="span"
          className={`${styles.status} ${getStatusColor(invitation.status)}`}
        >
          {statusLabel}
        </Box>
      </Stack>

      <Stack className={styles.details} gap="sm">
        <DetailRow
          label="Invited by:"
          value={invitation.inviterName || invitation.inviterUserId}
        />
        <DetailRow label="Email:" value={invitation.inviteeEmail} />
        {invitation.inviteeName ? (
          <DetailRow label="Name:" value={invitation.inviteeName} />
        ) : null}
        <DetailRow
          label="Invited:"
          value={new Date(invitation.createdAt).toLocaleDateString()}
        />
        <DetailRow
          label="Expires:"
          value={new Date(invitation.expiresAt).toLocaleDateString()}
        />
        {invitation.acceptedAt ? (
          <DetailRow
            label="Accepted:"
            value={new Date(invitation.acceptedAt).toLocaleDateString()}
          />
        ) : null}
      </Stack>

      {error ? (
        <Alert variant="danger" className={styles.errorMessage}>
          {error}
        </Alert>
      ) : null}

      {showAcceptButton && isPending ? (
        <Button
          variant="solid"
          className={styles.acceptButton}
          onClick={handleAccept}
          disabled={isAccepting}
        >
          {isAccepting ? 'Accepting...' : 'Accept Invitation'}
        </Button>
      ) : null}
    </Card>
  );
}
