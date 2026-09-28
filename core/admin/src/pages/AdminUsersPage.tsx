import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  Inline,
  PageHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TableLoadingRow,
  TableRow,
  Tag,
  Text,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import type { AdminAccount, AdminPasswordIssued } from '@inventory-platform/admin/types';
import { adminErrorMessage, adminStatusBadge, formatAdminDateTime } from '../forms/adminForms';
import {
  useAdminMeQuery,
  useAdminUsersQuery,
  useResetAdminPasswordMutation,
  useSetAdminActiveMutation,
} from '../queries/hooks';
import { AddAdminModal } from '../ui/AddAdminModal';
import { TemporaryPasswordModal } from '../ui/TemporaryPasswordModal';

type PendingAction = { kind: 'toggle' | 'reset'; admin: AdminAccount };

export function AdminUsersPage() {
  const me = useAdminMeQuery(true);
  const query = useAdminUsersQuery();
  const setActive = useSetAdminActiveMutation();
  const reset = useResetAdminPasswordMutation();
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [issued, setIssued] = useState<{ title: string; value: AdminPasswordIssued } | null>(null);
  const rows = query.data ?? [];
  const myId = me.data?.id;

  const confirm = () => {
    if (!pending) return;
    const { admin } = pending;
    if (pending.kind === 'toggle') {
      setActive.mutate(
        { id: admin.id, body: { active: !admin.active } },
        {
          onSuccess: () => {
            useNotify.success(
              admin.active ? `${admin.name} turned off` : `${admin.name} turned on`,
            );
            setPending(null);
          },
          onError: (error) => useNotify.error(adminErrorMessage(error)),
        },
      );
    } else {
      reset.mutate(
        { id: admin.id, body: {} },
        {
          onSuccess: (value) => {
            setPending(null);
            setIssued({ title: 'Password reset', value });
          },
          onError: (error) => useNotify.error(adminErrorMessage(error)),
        },
      );
    }
  };

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader
        title="Admins"
        description="People who can sign in to StockKart Admin. Every admin can use every tool; changes here are audited."
        actions={
          <Button variant="solid" onClick={() => setAdding(true)}>
            Add admin
          </Button>
        }
      />
      <Card>
        <CardBody>
          <Stack gap="md">
            {query.isError ? (
              <Alert variant="danger">
                {adminErrorMessage(query.error, 'Could not load admins.')}
              </Alert>
            ) : null}
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Admin</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Last sign-in</TableHeaderCell>
                  <TableHeaderCell>Added</TableHeaderCell>
                  <TableHeaderCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {query.isLoading ? (
                  <TableLoadingRow colSpan={5} />
                ) : rows.length === 0 ? (
                  <TableEmptyRow colSpan={5} message="No admins yet." />
                ) : (
                  rows.map((admin) => {
                    const status = adminStatusBadge(admin);
                    const isMe = admin.id === myId;
                    return (
                      <TableRow key={admin.id}>
                        <TableCell>
                          <Inline gap="xs" align="center">
                            <Text weight="semibold">{admin.name}</Text>
                            {isMe ? <Tag>You</Tag> : null}
                          </Inline>
                          <Text variant="caption" color="secondary">
                            {admin.email}
                          </Text>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>{formatAdminDateTime(admin.lastLoginAt)}</TableCell>
                        <TableCell>{formatAdminDateTime(admin.createdAt)}</TableCell>
                        <TableCell>
                          {isMe ? null : (
                            <Inline gap="sm">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPending({ kind: 'reset', admin })}
                              >
                                Reset password
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setPending({ kind: 'toggle', admin })}
                              >
                                {admin.active ? 'Turn off' : 'Turn on'}
                              </Button>
                            </Inline>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Stack>
        </CardBody>
      </Card>

      {adding ? (
        <AddAdminModal
          open
          onClose={() => setAdding(false)}
          onCreated={(value) => {
            setAdding(false);
            setIssued({ title: 'Admin added', value });
          }}
        />
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        title={
          pending?.kind === 'reset'
            ? 'Reset password'
            : pending?.admin.active
            ? 'Turn off admin'
            : 'Turn on admin'
        }
        message={
          pending
            ? pending.kind === 'reset'
              ? `${pending.admin.name} is signed out and gets a new temporary password to share with them.`
              : pending.admin.active
              ? `${pending.admin.name} is signed out and can no longer sign in.`
              : `${pending.admin.name} can sign in again with their current password.`
            : ''
        }
        confirmLabel={
          pending?.kind === 'reset'
            ? 'Reset password'
            : pending?.admin.active
            ? 'Turn off'
            : 'Turn on'
        }
        loading={setActive.isPending || reset.isPending}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />

      <TemporaryPasswordModal
        issued={issued?.value ?? null}
        title={issued?.title ?? ''}
        onClose={() => setIssued(null)}
      />
    </Stack>
  );
}
