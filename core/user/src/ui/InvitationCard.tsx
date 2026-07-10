import { useState } from 'react';
import { invitationsApi } from '../api/invitations.api';
import type { Invitation, UserRole } from '@inventory-platform/user/types';
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

interface InvitationCardProps {
  invitation: Invitation;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Inline justify="between" align="start" gap="sm" width="full">
      <Text color="secondary" variant="caption">
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
    case 'ACCEPTED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    case 'EXPIRED':
      return 'neutral';
    default:
      return 'neutral';
  }
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

  const isExpired = new Date(invitation.expiresAt) < new Date();
  const isPending = invitation.status === 'PENDING' && !isExpired;
  const statusLabel = isExpired && invitation.status === 'PENDING' ? 'EXPIRED' : invitation.status;

  return (
    <Card>
      <CardBody>
        <Stack gap="md">
          <Stack gap="sm">
            <Inline align="start" justify="between" gap="sm" flexWrap width="full">
              <Text variant="heading3" weight="semibold">
                {invitation.shopName}
              </Text>
              <RoleBadge role={invitation.role as UserRole} />
            </Inline>
            <Badge variant={statusVariant(invitation.status)}>{statusLabel}</Badge>
          </Stack>

          <Stack gap="sm">
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

          {error ? <Alert variant="danger">{error}</Alert> : null}

          {showAcceptButton && isPending ? (
            <Button variant="solid" onClick={handleAccept} disabled={isAccepting} fullWidth>
              {isAccepting ? 'Accepting...' : 'Accept Invitation'}
            </Button>
          ) : null}
        </Stack>
      </CardBody>
    </Card>
  );
}
