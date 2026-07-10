import { useState, useEffect, useCallback } from 'react';
import { invitationsApi } from '../api/invitations.api';
import type { Invitation } from '@inventory-platform/user/types';
import { InvitationCard } from './InvitationCard';
import { Button, CenteredLoader, EmptyState, Grid, Stack, Text } from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';

interface InvitationListProps {
  shopId?: string;
  showMyInvitations?: boolean;
  showAcceptButton?: boolean;
  onInvitationChange?: () => void;
}

interface InvitationSectionProps {
  title: string;
  invitations: Invitation[];
  showAcceptButton: boolean;
  onAccept?: () => void;
}

function InvitationSection({
  title,
  invitations,
  showAcceptButton,
  onAccept,
}: InvitationSectionProps) {
  if (invitations.length === 0) {
    return null;
  }

  return (
    <Stack gap="md" width="full">
      <Text variant="heading3" weight="semibold">
        {title}
      </Text>
      <Grid columns={3} gap="md" width="full">
        {invitations.map((invitation) => (
          <InvitationCard
            key={invitation.invitationId}
            invitation={invitation}
            showAcceptButton={showAcceptButton}
            onAccept={onAccept}
          />
        ))}
      </Grid>
    </Stack>
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
    } catch (err: any) {
      notifyError(err?.message || 'Failed to load invitations');
    } finally {
      setIsLoading(false);
    }
  }, [shopId, showMyInvitations, notifyError]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleInvitationAccept = async () => {
    await fetchInvitations();
    if (onInvitationChange) {
      onInvitationChange();
    }
  };

  if (isLoading) {
    return <CenteredLoader label="Loading invitations..." />;
  }

  if (error) {
    return (
      <Stack gap="md" align="center">
        <Text color="danger">{error}</Text>
        <Button onClick={fetchInvitations}>Retry</Button>
      </Stack>
    );
  }

  if (invitations.length === 0) {
    return <EmptyState title="No invitations found" />;
  }

  const pending = invitations.filter(
    (inv) => inv.status === 'PENDING' && new Date(inv.expiresAt) >= new Date(),
  );
  const accepted = invitations.filter((inv) => inv.status === 'ACCEPTED');
  const expired = invitations.filter(
    (inv) =>
      inv.status === 'EXPIRED' ||
      (inv.status === 'PENDING' && new Date(inv.expiresAt) < new Date()),
  );
  const rejected = invitations.filter((inv) => inv.status === 'REJECTED');

  return (
    <Stack gap="lg" width="full">
      <InvitationSection
        title={`Pending (${pending.length})`}
        invitations={pending}
        showAcceptButton={showAcceptButton}
        onAccept={handleInvitationAccept}
      />
      <InvitationSection
        title={`Accepted (${accepted.length})`}
        invitations={accepted}
        showAcceptButton={false}
      />
      <InvitationSection
        title={`Rejected (${rejected.length})`}
        invitations={rejected}
        showAcceptButton={false}
      />
      <InvitationSection
        title={`Expired (${expired.length})`}
        invitations={expired}
        showAcceptButton={false}
      />
    </Stack>
  );
}
