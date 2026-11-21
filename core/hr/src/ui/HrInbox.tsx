import { useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell } from 'lucide-react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Drawer,
  IconButton,
  Inline,
  NotificationDot,
  Stack,
  Text,
  hrChrome,
} from '@inventory-platform/ui-kit';
import { formatDateTime, type HrNotificationResponse } from '@inventory-platform/hr/types';
import { useHrAccess } from '../access/useHrAccess';
import { useHrInbox } from '../queries/hooks';

export const HR_LEAVE_PATH = '/dashboard/hr/leave';
export const MY_HR_PATH = '/dashboard/hr/me';

/** Where a row leads: approvers to the leave requests, requesters to their own leave. */
function linkOf(n: HrNotificationResponse): { path: string; label: string } {
  return n.type === 'LEAVE_REQUESTED'
    ? { path: HR_LEAVE_PATH, label: 'Open leave requests' }
    : { path: MY_HR_PATH, label: 'Open My HR' };
}

/**
 * The small HR inbox (R6.9): a bell on HR pages that polls `/me/notifications` every 60 s and when
 * the window regains focus. Approvers see new leave requests; employees see decisions on theirs.
 * Only those two groups ever get rows, so other members do not poll at all.
 */
export function HrInbox() {
  const navigate = useNavigate();
  const titleId = useId();
  const { can, employeeId, accessLoaded } = useHrAccess();
  const receives = accessLoaded && (employeeId != null || can('APPROVE_LEAVE'));
  const inbox = useHrInbox(receives);
  const [open, setOpen] = useState(false);

  if (!receives) return null;

  const follow = (n: HrNotificationResponse) => {
    if (!n.read) inbox.markRead.mutate(n.id);
    setOpen(false);
    navigate(linkOf(n).path);
  };

  return (
    <>
      <Box className={hrChrome.hrInboxAnchor}>
        <IconButton
          label={
            inbox.unread > 0
              ? `Notifications, ${inbox.unread} unread`
              : 'Notifications, none unread'
          }
          shape="circle"
          onClick={() => setOpen(true)}
        >
          <Bell size={18} aria-hidden />
        </IconButton>
        {inbox.unread > 0 ? <NotificationDot /> : null}
      </Box>
      <Drawer open={open} onClose={() => setOpen(false)} side="right" labelledBy={titleId}>
        <Box className={hrChrome.hrDayDrawer}>
          <Inline justify="between" align="start" gap="sm">
            <Text variant="heading4" as="h2" id={titleId}>
              Notifications
            </Text>
            <IconButton label="Close notifications" onClick={() => setOpen(false)}>
              ×
            </IconButton>
          </Inline>
          {inbox.error ? <Alert variant="danger">{inbox.error.message}</Alert> : null}
          {inbox.unread > 0 ? (
            <Box>
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={inbox.markAllRead.isPending}
                onClick={() => inbox.markAllRead.mutate()}
              >
                Mark all as read
              </Button>
            </Box>
          ) : null}
          {inbox.items.length === 0 ? (
            <Text color="muted">Nothing new. Leave requests and decisions show up here.</Text>
          ) : (
            <Stack as="ul" gap="sm" aria-label="HR notifications">
              {inbox.items.map((n) => {
                const link = linkOf(n);
                return (
                  <Stack as="li" key={n.id} gap="xs">
                    <Inline gap="xs" flexWrap>
                      {n.read ? null : <Badge variant="info">New</Badge>}
                      <Text weight={n.read ? undefined : 'semibold'}>{n.text}</Text>
                    </Inline>
                    <Text variant="caption" color="muted">
                      {formatDateTime(n.createdAt)}
                    </Text>
                    <Inline gap="xs" flexWrap>
                      <Button type="button" variant="ghost" size="sm" onClick={() => follow(n)}>
                        {link.label}
                      </Button>
                      {n.read ? null : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`Mark as read: ${n.text}`}
                          onClick={() => inbox.markRead.mutate(n.id)}
                        >
                          Mark as read
                        </Button>
                      )}
                    </Inline>
                  </Stack>
                );
              })}
            </Stack>
          )}
        </Box>
      </Drawer>
    </>
  );
}
