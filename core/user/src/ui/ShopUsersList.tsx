import { useState, useEffect, useCallback } from 'react';
import { invitationsApi } from '../api/invitations.api';
import type { ShopUser, UserRole } from '@inventory-platform/user/types';
import { RoleBadge } from './RoleBadge';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  EmptyState,
  Grid,
  Inline,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
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
    <Card>
      <CardBody>
        <Stack gap="md">
          <Inline justify="between" align="start" gap="sm" flexWrap width="full">
            <Stack gap="xs">
              <Text weight="semibold">{user.name}</Text>
              <Text color="secondary" variant="caption">
                {user.email}
              </Text>
            </Stack>
            <RoleBadge role={user.role as UserRole} />
          </Inline>
          <Stack gap="xs">
            {showUserId ? (
              <Inline justify="between" gap="sm" width="full">
                <Text color="secondary" variant="caption">
                  User ID:
                </Text>
                <Text variant="caption">{user.userId}</Text>
              </Inline>
            ) : null}
            <Inline justify="between" gap="sm" width="full">
              <Text color="secondary" variant="caption">
                Joined:
              </Text>
              <Text variant="caption">
                {user.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'N/A'}
              </Text>
            </Inline>
            <Inline justify="between" gap="sm" width="full" align="center">
              <Text color="secondary" variant="caption">
                Status:
              </Text>
              <Badge variant={user.active ? 'success' : 'neutral'}>
                {user.active ? 'Active' : 'Inactive'}
              </Badge>
            </Inline>
          </Stack>
        </Stack>
      </CardBody>
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
    <Stack gap="md" width="full">
      <Text variant="heading3" weight="semibold">
        {title}
      </Text>
      <Grid columns={3} gap="md" width="full">
        {users.map((user) => (
          <ShopUserCard key={user.userId} user={user} showUserId={showUserId} />
        ))}
      </Grid>
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
  }, [shopId, notifyError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  if (isLoading) {
    return <CenteredLoader label="Loading users..." />;
  }

  if (error) {
    return (
      <Stack gap="md" align="center">
        <Text color="danger">{error}</Text>
        <Button onClick={fetchUsers}>Retry</Button>
      </Stack>
    );
  }

  if (users.length === 0) {
    return <EmptyState title="No users found for this shop" />;
  }

  const owners = users.filter(
    (u) => u.relationship === 'OWNER' || (u.relationship === null && u.role === 'OWNER'),
  );
  const invited = users.filter((u) => u.relationship === 'INVITED');
  const otherUsers = users.filter((u) => !owners.includes(u) && !invited.includes(u));
  const active = users.filter((u) => u.active);
  const inactive = users.filter((u) => !u.active);

  return (
    <Stack gap="lg" width="full">
      <UserSection title={`Owners (${owners.length})`} users={owners} />
      <UserSection title={`Invited Users (${invited.length})`} users={invited} />
      <UserSection title={`Users (${otherUsers.length})`} users={otherUsers} />
      {active.length === 0 && inactive.length > 0 ? (
        <UserSection title={`Inactive Users (${inactive.length})`} users={inactive} showUserId />
      ) : null}
    </Stack>
  );
}
