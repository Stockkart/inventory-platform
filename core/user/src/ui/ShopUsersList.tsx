import { useState, useEffect, useCallback } from 'react';
import { invitationsApi } from '../api/invitations.api';
import type { ShopUser, UserRole } from '@inventory-platform/user/types';
import { RoleBadge } from './RoleBadge';
import {
  Box,
  Button,
  Card,
  CenteredLoader,
  EmptyState,
  Inline,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import styles from './ShopUsersList.module.css';
import { useNotify } from '@inventory-platform/session';

interface ShopUsersListProps {
  shopId: string;
  onUserChange?: () => void;
}

interface ShopUserCardProps {
  user: ShopUser;
  showUserId?: boolean;
}

function ShopUserCard({ user, showUserId = false }: ShopUserCardProps) {
  return (
    <Card className={styles.card}>
      <Box className={styles.header}>
        <Box className={styles.userInfo}>
          <Text weight="semibold" className={styles.userName}>
            {user.name}
          </Text>
          <Text color="secondary" className={styles.userEmail}>
            {user.email}
          </Text>
        </Box>
        <RoleBadge role={user.role as UserRole} />
      </Box>
      <Stack className={styles.details} gap="xs">
        {showUserId ? (
          <Inline className={styles.detailRow}>
            <Text className={styles.label}>User ID:</Text>
            <Text className={styles.value}>{user.userId}</Text>
          </Inline>
        ) : null}
        <Inline className={styles.detailRow}>
          <Text className={styles.label}>Joined:</Text>
          <Text className={styles.value}>
            {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'N/A'}
          </Text>
        </Inline>
        <Inline className={styles.detailRow}>
          <Text className={styles.label}>Status:</Text>
          <Box
            as="span"
            className={`${styles.status} ${
              user.active ? styles.statusActive : styles.statusInactive
            }`}
          >
            {user.active ? 'Active' : 'Inactive'}
          </Box>
        </Inline>
      </Stack>
    </Card>
  );
}

interface UserSectionProps {
  title: string;
  users: ShopUser[];
  showUserId?: boolean;
}

function UserSection({ title, users, showUserId = false }: UserSectionProps) {
  if (users.length === 0) {
    return null;
  }

  return (
    <Stack className={styles.section} gap="md">
      <Text variant="heading3" weight="semibold" className={styles.sectionTitle}>
        {title}
      </Text>
      <Box className={styles.grid}>
        {users.map((user) => (
          <ShopUserCard key={user.userId} user={user} showUserId={showUserId} />
        ))}
      </Box>
    </Stack>
  );
}

export function ShopUsersList({ shopId, onUserChange }: ShopUsersListProps) {
  const [users, setUsers] = useState<ShopUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { error: notifyError } = useNotify;

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await invitationsApi.getShopUsers(shopId);
      setUsers(data);
    } catch (err: any) {
      notifyError(err?.message || 'Failed to load shop users');
    } finally {
      setIsLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  if (isLoading) {
    return (
      <Box className={styles.container}>
        <CenteredLoader label="Loading users..." className={styles.loading} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className={styles.container}>
        <Stack className={styles.error} gap="md" align="center">
          <Text color="danger">{error}</Text>
          <Button className={styles.retryButton} onClick={fetchUsers}>
            Retry
          </Button>
        </Stack>
      </Box>
    );
  }

  if (users.length === 0) {
    return (
      <Box className={styles.container}>
        <EmptyState title="No users found for this shop" className={styles.empty} />
      </Box>
    );
  }

  // Handle null relationship - if relationship is null but role is OWNER, treat as owner
  const owners = users.filter(
    (u) => u.relationship === 'OWNER' || (u.relationship === null && u.role === 'OWNER'),
  );
  const invited = users.filter((u) => u.relationship === 'INVITED');
  // Get users that don't match owner or invited (fallback for any edge cases)
  const otherUsers = users.filter((u) => !owners.includes(u) && !invited.includes(u));
  const active = users.filter((u) => u.active);
  const inactive = users.filter((u) => !u.active);

  return (
    <Stack className={styles.container} gap="md">
      <UserSection title={`Owners (${owners.length})`} users={owners} />
      <UserSection title={`Invited Users (${invited.length})`} users={invited} />
      <UserSection title={`Users (${otherUsers.length})`} users={otherUsers} />
      {active.length === 0 && inactive.length > 0 ? (
        <UserSection title={`Inactive Users (${inactive.length})`} users={inactive} showUserId />
      ) : null}
    </Stack>
  );
}
