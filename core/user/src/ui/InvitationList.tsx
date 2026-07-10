import { useState, useEffect, useCallback } from 'react';
import { invitationsApi } from '../api/invitations.api';
import type { Invitation } from '@inventory-platform/user/types';
import { InvitationCard } from './InvitationCard';
import { Box, Button, CenteredLoader, EmptyState, Stack, Text } from '@inventory-platform/ui-kit';
import styles from './InvitationList.module.css';
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
    <Stack className={styles.section} gap="md">
      <Text variant="heading3" weight="semibold" className={styles.sectionTitle}>
        {title}
      </Text>
      <Box className={styles.grid}>
        {invitations.map((invitation) => (
          <InvitationCard
            key={invitation.invitationId}
            invitation={invitation}
            showAcceptButton={showAcceptButton}
            onAccept={onAccept}
          />
        ))}
      </Box>
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
  }, [shopId, showMyInvitations]);

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
    return (
      <Box className={styles.container}>
        <CenteredLoader label="Loading invitations..." className={styles.loading} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className={styles.container}>
        <Stack className={styles.error} gap="md" align="center">
          <Text color="danger">{error}</Text>
          <Button className={styles.retryButton} onClick={fetchInvitations}>
            Retry
          </Button>
        </Stack>
      </Box>
    );
  }

  if (invitations.length === 0) {
    return (
      <Box className={styles.container}>
        <EmptyState title="No invitations found" className={styles.empty} />
      </Box>
    );
  }

  // Group invitations by status
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
    <Stack className={styles.container} gap="md">
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
