import { useState } from 'react';
import { invitationsApi } from '../api/invitations.api';
import type { Invitation, UserRole } from '@inventory-platform/user/types';
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

interface InvitationCardProps {
  invitation: Invitation;
  onAccept?: () => void;
  showAcceptButton?: boolean;
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
      onAccept?.();
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  const isExpired = new Date(invitation.expiresAt) < new Date();
  const isPending = invitation.status === 'PENDING' && !isExpired;
  const statusLabel = isExpired && invitation.status === 'PENDING' ? 'EXPIRED' : invitation.status;

  return (
    <Card className={surfaceChrome.inviteCardCompact}>
      <CardBody className={surfaceChrome.inviteCardBody}>
        <Box className={surfaceChrome.inviteCardHeader}>
          <Box className={surfaceChrome.invitePrimaryCell}>
            <Text as="p" className={surfaceChrome.invitePrimaryName}>
              {invitation.shopName}
            </Text>
            <Inline gap="sm" flexWrap>
              <RoleBadge role={invitation.role as UserRole} />
              <Badge variant={statusVariant(statusLabel)}>{formatStatus(statusLabel)}</Badge>
            </Inline>
          </Box>
          {showAcceptButton && isPending ? (
            <Button
              type="button"
              size="sm"
              variant="solid"
              onClick={() => void handleAccept()}
              disabled={isAccepting}
            >
              {isAccepting ? 'Accepting…' : 'Accept'}
            </Button>
          ) : null}
        </Box>

        <Box as="dl" className={surfaceChrome.inviteCardMeta}>
          <Text as="dt" className={surfaceChrome.inviteCardMetaLabel}>
            Invited by
          </Text>
          <Text as="dd" className={surfaceChrome.inviteCardMetaValue}>
            {invitation.inviterName || invitation.inviterUserId}
          </Text>
          <Text as="dt" className={surfaceChrome.inviteCardMetaLabel}>
            Email
          </Text>
          <Text as="dd" className={surfaceChrome.inviteCardMetaValue}>
            {invitation.inviteeEmail}
          </Text>
          {invitation.inviteeName ? (
            <>
              <Text as="dt" className={surfaceChrome.inviteCardMetaLabel}>
                Name
              </Text>
              <Text as="dd" className={surfaceChrome.inviteCardMetaValue}>
                {invitation.inviteeName}
              </Text>
            </>
          ) : null}
          <Text as="dt" className={surfaceChrome.inviteCardMetaLabel}>
            Invited
          </Text>
          <Text as="dd" className={surfaceChrome.inviteCardMetaValue}>
            {formatDate(invitation.createdAt)}
          </Text>
          <Text as="dt" className={surfaceChrome.inviteCardMetaLabel}>
            Expires
          </Text>
          <Text as="dd" className={surfaceChrome.inviteCardMetaValue}>
            {formatDate(invitation.expiresAt)}
          </Text>
          {invitation.acceptedAt ? (
            <>
              <Text as="dt" className={surfaceChrome.inviteCardMetaLabel}>
                Accepted
              </Text>
              <Text as="dd" className={surfaceChrome.inviteCardMetaValue}>
                {formatDate(invitation.acceptedAt)}
              </Text>
            </>
          ) : null}
        </Box>

        {error ? <Alert variant="danger">{error}</Alert> : null}
      </CardBody>
    </Card>
  );
}
