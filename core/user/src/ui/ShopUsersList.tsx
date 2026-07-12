import { useState, useEffect, useCallback, useMemo } from 'react';
import { invitationsApi } from '../api/invitations.api';
import type { ShopUser, UserRole } from '@inventory-platform/user/types';
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

interface ShopUsersListProps {
  shopId: string;
  onUserChange?: () => void;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
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

function relationshipLabel(user: ShopUser) {
  if (user.relationship === 'OWNER' || (user.relationship === null && user.role === 'OWNER')) {
    return 'Owner';
  }
  if (user.relationship === 'INVITED') return 'Invited';
  return 'Member';
}

function relationshipRank(user: ShopUser) {
  const label = relationshipLabel(user);
  if (label === 'Owner') return 0;
  if (label === 'Invited') return 1;
  return 2;
}

export function ShopUsersList({ shopId }: ShopUsersListProps) {
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
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : 'Failed to load shop users');
    } finally {
      setIsLoading(false);
    }
  }, [shopId, notifyError]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const rows = useMemo(
    () =>
      [...users].sort((a, b) => {
        const rel = relationshipRank(a) - relationshipRank(b);
        if (rel !== 0) return rel;
        const activeDiff = Number(b.active) - Number(a.active);
        if (activeDiff !== 0) return activeDiff;
        return a.name.localeCompare(b.name);
      }),
    [users],
  );

  const ownerCount = rows.filter((u) => relationshipLabel(u) === 'Owner').length;
  const activeCount = rows.filter((u) => u.active).length;

  if (isLoading) {
    return <CenteredLoader label="Loading users…" />;
  }

  if (error) {
    return (
      <Stack gap="md" align="center">
        <Text color="danger">{error}</Text>
        <Button type="button" onClick={() => void fetchUsers()}>
          Retry
        </Button>
      </Stack>
    );
  }

  if (users.length === 0) {
    return (
      <EmptyState
        title="No users in this shop"
        description="Invite teammates or approve join requests to grow your team."
      />
    );
  }

  return (
    <Stack gap="sm" width="full">
      <Text as="h3" className={surfaceChrome.inviteSectionTitle}>
        Team
        {` · ${rows.length} total · ${ownerCount} owner${
          ownerCount === 1 ? '' : 's'
        } · ${activeCount} active`}
      </Text>

      <Card>
        <CardBody>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>User</TableHeaderCell>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Joined</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((user) => (
                <TableRow key={user.userId}>
                  <TableCell>
                    <Box className={surfaceChrome.invitePrimaryCell}>
                      <Text as="p" className={surfaceChrome.invitePrimaryName}>
                        {user.name}
                      </Text>
                      <Text as="p" className={surfaceChrome.invitePrimaryMeta}>
                        {user.email}
                      </Text>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={user.role as UserRole} />
                  </TableCell>
                  <TableCell>
                    <Text variant="caption">{relationshipLabel(user)}</Text>
                  </TableCell>
                  <TableCell className={surfaceChrome.inviteDateCell}>
                    {formatDate(user.joinedAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.active ? 'success' : 'neutral'}>
                      {user.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </Stack>
  );
}
