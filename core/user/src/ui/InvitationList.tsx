import { useState, useEffect, useCallback } from 'react';
import { invitationsApi } from '../api/invitations.api';
import type { Invitation, UserRole } from '@inventory-platform/user/types';
import type { BadgeVariant } from '@inventory-platform/ui-kit';
import { RoleBadge } from './RoleBadge';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  EmptyState,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';

interface InvitationListProps {
  shopId?: string;
  showMyInvitations?: boolean;
  showAcceptButton?: boolean;
  onInvitationChange?: () => void;
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

function effectiveStatus(invitation: Invitation): string {
  const isExpired = invitation.status === 'PENDING' && new Date(invitation.expiresAt) < new Date();
  return isExpired ? 'EXPIRED' : invitation.status;
}

function sortInvitations(invitations: Invitation[]) {
  const rank = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'ACCEPTED':
        return 1;
      case 'REJECTED':
        return 2;
      case 'EXPIRED':
        return 3;
      default:
        return 4;
    }
  };
  return [...invitations].sort((a, b) => {
    const statusDiff = rank(effectiveStatus(a)) - rank(effectiveStatus(b));
    if (statusDiff !== 0) return statusDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function AcceptButton({
  invitation,
  onAccepted,
}: {
  invitation: Invitation;
  onAccepted?: () => void;
}) {
  const [isAccepting, setIsAccepting] = useState(false);
  const { error: notifyError } = useNotify;
  const status = effectiveStatus(invitation);
  if (status !== 'PENDING') return null;

  return (
    <Button
      type="button"
      size="sm"
      variant="solid"
      disabled={isAccepting}
      onClick={() => {
        void (async () => {
          setIsAccepting(true);
          try {
            await invitationsApi.acceptInvitation(invitation.invitationId);
            onAccepted?.();
          } catch (err: unknown) {
            notifyError(err instanceof Error ? err.message : 'Failed to accept invitation');
          } finally {
            setIsAccepting(false);
          }
        })();
      }}
    >
      {isAccepting ? 'Accepting…' : 'Accept'}
    </Button>
  );
}

export function InvitationList({
  shopId,
  showMyInvitations = false,
  showAcceptButton = false,
  onInvitationChange,
}: InvitationListProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { error: notifyError } = useNotify;

  const fetchInvitations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let data: Invitation[];

      if (showMyInvitations) {
        data = await invitationsApi.getMyInvitations();
      } else if (shopId) {
        data = await invitationsApi.getShopInvitations(shopId);
      } else {
        throw new Error('shopId or showMyInvitations must be provided');
      }

      setInvitations(data);
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : 'Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  }, [shopId, showMyInvitations, notifyError]);

  useEffect(() => {
    void fetchInvitations();
  }, [fetchInvitations]);

  const handleInvitationAccept = async () => {
    await fetchInvitations();
    onInvitationChange?.();
  };

  if (isLoading) {
    return <CenteredLoader label="Loading invitations…" />;
  }

  if (error) {
    return (
      <Stack gap="md" align="center">
        <Text color="danger">{error}</Text>
        <Button type="button" onClick={() => void fetchInvitations()}>
          Retry
        </Button>
      </Stack>
    );
  }

  if (invitations.length === 0) {
    return (
      <EmptyState
        title="No invitations yet"
        description={
          showMyInvitations
            ? 'When someone invites you to a shop, it will show up here.'
            : 'Send an invite above to bring teammates into this shop.'
        }
      />
    );
  }

  const rows = sortInvitations(invitations);
  const pendingCount = rows.filter((inv) => effectiveStatus(inv) === 'PENDING').length;
  const acceptedCount = rows.filter((inv) => effectiveStatus(inv) === 'ACCEPTED').length;

  return (
    <Stack gap="sm" width="full">
      <Text as="h3" className={surfaceChrome.inviteSectionTitle}>
        {showMyInvitations ? 'Your invitations' : 'Shop invitations'}
        {` · ${pendingCount} pending · ${acceptedCount} accepted`}
      </Text>

      <Card>
        <CardBody>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{showMyInvitations ? 'Shop' : 'Invitee'}</TableHeaderCell>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Invited by</TableHeaderCell>
                <TableHeaderCell>Invited</TableHeaderCell>
                <TableHeaderCell>Expires</TableHeaderCell>
                <TableHeaderCell>Accepted</TableHeaderCell>
                {showAcceptButton ? <TableHeaderCell /> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((invitation) => {
                const status = effectiveStatus(invitation);
                const primary = showMyInvitations
                  ? invitation.shopName
                  : invitation.inviteeName || invitation.inviteeEmail;
                const secondary = showMyInvitations
                  ? invitation.inviteeEmail
                  : invitation.inviteeName
                  ? invitation.inviteeEmail
                  : null;

                return (
                  <TableRow key={invitation.invitationId}>
                    <TableCell>
                      <Box className={surfaceChrome.invitePrimaryCell}>
                        <Text as="p" className={surfaceChrome.invitePrimaryName}>
                          {primary}
                        </Text>
                        {secondary ? (
                          <Text as="p" className={surfaceChrome.invitePrimaryMeta}>
                            {secondary}
                          </Text>
                        ) : null}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={invitation.role as UserRole} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(status)}>{formatStatus(status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Text variant="caption">
                        {invitation.inviterName || invitation.inviterUserId}
                      </Text>
                    </TableCell>
                    <TableCell className={surfaceChrome.inviteDateCell}>
                      {formatDate(invitation.createdAt)}
                    </TableCell>
                    <TableCell className={surfaceChrome.inviteDateCell}>
                      {formatDate(invitation.expiresAt)}
                    </TableCell>
                    <TableCell className={surfaceChrome.inviteDateCell}>
                      {invitation.acceptedAt ? formatDate(invitation.acceptedAt) : '—'}
                    </TableCell>
                    {showAcceptButton ? (
                      <TableCell className={surfaceChrome.inviteActionsCell}>
                        <AcceptButton
                          invitation={invitation}
                          onAccepted={() => void handleInvitationAccept()}
                        />
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </Stack>
  );
}
