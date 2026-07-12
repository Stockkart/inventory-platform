import { useState, useEffect, useCallback } from 'react';
import { shopsApi } from '../api/shops.api';
import type { JoinRequest, UserRole } from '@inventory-platform/user/types';
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
  Inline,
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

interface JoinRequestListProps {
  shopId?: string;
  onRequestChange?: () => void;
}

function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'danger';
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

function sortRequests(requests: JoinRequest[]) {
  const rank = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'APPROVED':
        return 1;
      case 'REJECTED':
        return 2;
      default:
        return 3;
    }
  };
  return [...requests].sort((a, b) => {
    const statusDiff = rank(a.status) - rank(b.status);
    if (statusDiff !== 0) return statusDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function RequestActions({ request, onProcess }: { request: JoinRequest; onProcess?: () => void }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { error: notifyError } = useNotify;

  if (request.status !== 'PENDING') return null;

  const handleProcess = async (action: 'ACCEPT' | 'REJECT') => {
    setIsProcessing(true);
    try {
      await shopsApi.processJoinRequest(request.requestId, { action });
      onProcess?.();
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : `Failed to ${action.toLowerCase()} request`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Inline gap="xs" justify="end">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isProcessing}
        onClick={() => void handleProcess('REJECT')}
      >
        Reject
      </Button>
      <Button
        type="button"
        size="sm"
        variant="solid"
        disabled={isProcessing}
        onClick={() => void handleProcess('ACCEPT')}
      >
        {isProcessing ? 'Saving…' : 'Approve'}
      </Button>
    </Inline>
  );
}

export function JoinRequestList({ shopId, onRequestChange }: JoinRequestListProps) {
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { error: notifyError } = useNotify;

  const fetchJoinRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await shopsApi.getJoinRequests(shopId);
      setJoinRequests(data);
    } catch (err: unknown) {
      notifyError(err instanceof Error ? err.message : 'Failed to load join requests');
    } finally {
      setIsLoading(false);
    }
  }, [shopId, notifyError]);

  useEffect(() => {
    void fetchJoinRequests();
  }, [fetchJoinRequests]);

  const handleRequestProcess = () => {
    void fetchJoinRequests();
    onRequestChange?.();
  };

  if (isLoading) {
    return <CenteredLoader label="Loading join requests…" />;
  }

  if (error) {
    return (
      <Stack gap="md" align="center">
        <Text color="danger">{error}</Text>
        <Button type="button" onClick={() => void fetchJoinRequests()}>
          Retry
        </Button>
      </Stack>
    );
  }

  if (joinRequests.length === 0) {
    return (
      <EmptyState
        title="No join requests"
        description="When someone asks to join this shop, their request will appear here."
      />
    );
  }

  const rows = sortRequests(joinRequests);
  const pendingCount = rows.filter((r) => r.status === 'PENDING').length;
  const approvedCount = rows.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = rows.filter((r) => r.status === 'REJECTED').length;
  const hasPending = pendingCount > 0;

  return (
    <Stack gap="sm" width="full">
      <Text as="h3" className={surfaceChrome.inviteSectionTitle}>
        Join requests
        {` · ${pendingCount} pending · ${approvedCount} approved · ${rejectedCount} rejected`}
      </Text>

      <Card>
        <CardBody>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Requester</TableHeaderCell>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Shop</TableHeaderCell>
                <TableHeaderCell>Requested</TableHeaderCell>
                <TableHeaderCell>Reviewed</TableHeaderCell>
                {hasPending ? <TableHeaderCell /> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((request) => (
                <TableRow key={request.requestId}>
                  <TableCell>
                    <Box className={surfaceChrome.invitePrimaryCell}>
                      <Text as="p" className={surfaceChrome.invitePrimaryName}>
                        {request.userName}
                      </Text>
                      <Text as="p" className={surfaceChrome.invitePrimaryMeta}>
                        {request.userEmail}
                      </Text>
                      {request.message ? (
                        <Text as="p" className={surfaceChrome.invitePrimaryMeta}>
                          “{request.message}”
                        </Text>
                      ) : null}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={request.requestedRole as UserRole} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(request.status)}>
                      {formatStatus(request.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Text variant="caption">{request.shopName}</Text>
                  </TableCell>
                  <TableCell className={surfaceChrome.inviteDateCell}>
                    {formatDate(request.createdAt)}
                  </TableCell>
                  <TableCell className={surfaceChrome.inviteDateCell}>
                    {request.reviewedAt ? formatDate(request.reviewedAt) : '—'}
                  </TableCell>
                  {hasPending ? (
                    <TableCell className={surfaceChrome.inviteActionsCell}>
                      <RequestActions request={request} onProcess={handleRequestProcess} />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </Stack>
  );
}
