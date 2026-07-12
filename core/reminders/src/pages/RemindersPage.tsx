import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import type {
  CreateReminderDto,
  Reminder,
  ReminderInventorySummary,
  ReminderType,
  UpdateReminderDto,
} from '@inventory-platform/reminders/types';
import { InventoryAlertDetails } from '@inventory-platform/product';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  ConfirmDialog,
  EmptyState,
  FormField,
  Inline,
  Modal,
  PageHeader,
  PaginationBar,
  Stack,
  Text,
  accountingChrome,
  surfaceChrome,
  cn,
} from '@inventory-platform/ui-kit';
import { ReminderForm } from '../ui';
import { useNotify } from '@inventory-platform/session';
import {
  useCreateReminderMutation,
  useDeleteReminderMutation,
  useExpiryBucketsQuery,
  useReminderDetailQuery,
  useReminderDetailsQuery,
  useSnoozeReminderMutation,
  useUpdateReminderMutation,
} from '../queries/hooks';

const SNOOZE_OPTIONS = [1, 2, 3, 5, 7, 14, 30];
const REMINDER_FORM_ID = 'reminders-page-form';

function statusBadgeVariant(status: Reminder['status']) {
  return status === 'COMPLETED' ? 'success' : 'warning';
}

function priorityBadgeVariant(priority: 'high' | 'medium' | 'low') {
  if (priority === 'high') return 'danger';
  if (priority === 'medium') return 'warning';
  return 'info';
}

function statusLabel(status: Reminder['status']) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function typeLabel(type: ReminderType | undefined) {
  if (type === 'EXPIRY') return 'Expiry';
  if (type === 'CUSTOM') return 'Custom';
  return type ?? 'Reminder';
}

export function RemindersPage() {
  const location = useLocation();
  const fromNotification = location.state?.fromNotification === true;
  const focusReminderId = location.state?.reminderId as string | undefined;
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'COMPLETED'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ReminderType>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null);
  const [snoozingReminderId, setSnoozingReminderId] = useState<string | null>(null);
  const [customSnoozeDays, setCustomSnoozeDays] = useState<number | ''>('');
  const [selectedInventory, setSelectedInventory] = useState<ReminderInventorySummary | null>(null);
  const { error: notifyError } = useNotify;

  const listQuery = useReminderDetailsQuery(page, size, {
    enabled: !focusReminderId,
  });
  const focusQuery = useReminderDetailQuery(focusReminderId, {
    enabled: Boolean(focusReminderId),
  });
  const { data: expiryBuckets } = useExpiryBucketsQuery(
    { expiringSoonDays: 30 },
    { enabled: !fromNotification },
  );

  const reminders = focusReminderId
    ? focusQuery.data
      ? [focusQuery.data]
      : []
    : listQuery.data?.data ?? [];
  const totalPages = focusReminderId ? 1 : listQuery.data?.meta.totalPages ?? 1;
  const isLoading = focusReminderId ? focusQuery.isLoading : listQuery.isLoading;

  const createMutation = useCreateReminderMutation({
    onError: (err) => notifyError(err instanceof Error ? err.message : 'Failed to create reminder'),
  });
  const updateMutation = useUpdateReminderMutation({
    onError: (err) => notifyError(err instanceof Error ? err.message : 'Failed to update reminder'),
  });
  const deleteMutation = useDeleteReminderMutation({
    onError: (err) => notifyError(err instanceof Error ? err.message : 'Failed to delete reminder'),
  });
  const snoozeMutation = useSnoozeReminderMutation({
    onError: (err) => notifyError(err instanceof Error ? err.message : 'Failed to snooze reminder'),
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (focusReminderId) {
      window.history.replaceState({}, '', '/dashboard/reminders');
    }
  }, [focusReminderId]);

  const handleSnooze = async (reminderId: string, snoozeDays: number) => {
    if (!snoozeDays || snoozeDays <= 0) {
      notifyError('Snooze days must be a positive number');
      return;
    }

    setSnoozingReminderId(reminderId);
    try {
      await snoozeMutation.mutateAsync({ id: reminderId, snoozeDays });
      setCustomSnoozeDays('');
    } finally {
      setSnoozingReminderId(null);
    }
  };

  const handleSubmit = async (data: CreateReminderDto | UpdateReminderDto) => {
    if (editingReminder) {
      await updateMutation.mutateAsync({
        id: editingReminder.id,
        data: data as UpdateReminderDto,
      });
      setEditingReminder(null);
    } else {
      await createMutation.mutateAsync(data as CreateReminderDto);
      setShowCreateForm(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingReminderId) return;

    try {
      await deleteMutation.mutateAsync(deletingReminderId);
      setDeletingReminderId(null);
    } catch {
      setDeletingReminderId(null);
    }
  };

  const filteredReminders = useMemo(
    () =>
      reminders.filter((reminder) => {
        const statusMatch = filter === 'all' || reminder.status === filter;
        const typeMatch = typeFilter === 'all' || reminder.type === typeFilter;
        return statusMatch && typeMatch;
      }),
    [reminders, filter, typeFilter],
  );

  const getDaysUntilReminder = (reminderAt: string): number => {
    const now = new Date();
    const reminderDate = new Date(reminderAt);
    const diffTime = reminderDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getPriority = (daysLeft: number): 'high' | 'medium' | 'low' => {
    if (daysLeft < 0) return 'high';
    if (daysLeft <= 3) return 'high';
    if (daysLeft <= 7) return 'medium';
    return 'low';
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const closeFormModal = () => {
    setShowCreateForm(false);
    setEditingReminder(null);
  };

  const formModalOpen = !fromNotification && (showCreateForm || !!editingReminder);
  const isEditModal = !!editingReminder;

  const dueCopy = (daysLeft: number) => {
    if (daysLeft < 0) return `${Math.abs(daysLeft)} days overdue`;
    if (daysLeft === 0) return 'Due today';
    return `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`;
  };

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader
        description={
          fromNotification
            ? 'Reminder details from notification'
            : 'Track expiry and custom reminders for your inventory.'
        }
        actions={
          !fromNotification ? (
            <Button
              variant="solid"
              onClick={() => {
                setShowCreateForm(true);
                setEditingReminder(null);
              }}
            >
              Create reminder
            </Button>
          ) : undefined
        }
      />

      {!fromNotification && expiryBuckets ? (
        <Box className={accountingChrome.kpiGrid4}>
          <Box className={accountingChrome.overviewKpiCard}>
            <Text as="span" className={accountingChrome.overviewKpiLabel}>
              Expired
            </Text>
            <Text as="span" className={accountingChrome.overviewKpiValue}>
              {expiryBuckets.expired}
            </Text>
          </Box>
          <Box className={accountingChrome.overviewKpiCard}>
            <Text as="span" className={accountingChrome.overviewKpiLabel}>
              Within 7 days
            </Text>
            <Text as="span" className={accountingChrome.overviewKpiValue}>
              {expiryBuckets.expiringWithin7Days}
            </Text>
          </Box>
          <Box className={accountingChrome.overviewKpiCard}>
            <Text as="span" className={accountingChrome.overviewKpiLabel}>
              Within {expiryBuckets.expiringSoonDays} days
            </Text>
            <Text as="span" className={accountingChrome.overviewKpiValue}>
              {expiryBuckets.expiringSoonTotal}
            </Text>
          </Box>
          <Box className={accountingChrome.overviewKpiCard}>
            <Text as="span" className={accountingChrome.overviewKpiLabel}>
              Tracked expiry
            </Text>
            <Text as="span" className={accountingChrome.overviewKpiValue}>
              {expiryBuckets.totalWithExpiry}
            </Text>
          </Box>
        </Box>
      ) : null}

      <Modal open={formModalOpen} onClose={closeFormModal} size="md">
        <Modal.Header
          title={isEditModal ? 'Edit reminder' : 'Create reminder'}
          onClose={closeFormModal}
        />
        <Modal.Body>
          <ReminderForm
            key={editingReminder?.id ?? 'create'}
            formId={REMINDER_FORM_ID}
            reminder={editingReminder || undefined}
            onSubmit={handleSubmit}
            isLoading={isSubmitting}
            showActions={false}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline" onClick={closeFormModal} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form={REMINDER_FORM_ID} variant="solid" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEditModal ? 'Update reminder' : 'Create reminder'}
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmDialog
        open={!!deletingReminderId}
        title="Delete reminder"
        message="Are you sure you want to delete this reminder? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onCancel={() => setDeletingReminderId(null)}
        onConfirm={handleDeleteConfirm}
      />

      {!fromNotification ? (
        <Box className={surfaceChrome.reminderFilterBar}>
          <Box className={surfaceChrome.reminderFilterGroup}>
            <Text as="span" className={surfaceChrome.reminderFilterLabel}>
              Status
            </Text>
            <Box
              className={surfaceChrome.reminderSegment}
              role="group"
              aria-label="Filter by status"
            >
              {(['all', 'PENDING', 'COMPLETED'] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-pressed={filter === value}
                  className={cn(
                    surfaceChrome.reminderSegmentBtn,
                    filter === value && surfaceChrome.reminderSegmentBtnActive,
                  )}
                  onClick={() => setFilter(value)}
                >
                  {value === 'all' ? 'All' : statusLabel(value)}
                </Button>
              ))}
            </Box>
          </Box>
          <Box className={surfaceChrome.reminderFilterGroup}>
            <Text as="span" className={surfaceChrome.reminderFilterLabel}>
              Type
            </Text>
            <Box className={surfaceChrome.reminderSegment} role="group" aria-label="Filter by type">
              {(['all', 'EXPIRY', 'CUSTOM'] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-pressed={typeFilter === value}
                  className={cn(
                    surfaceChrome.reminderSegmentBtn,
                    typeFilter === value && surfaceChrome.reminderSegmentBtnActive,
                  )}
                  onClick={() => setTypeFilter(value)}
                >
                  {value === 'all' ? 'All' : typeLabel(value)}
                </Button>
              ))}
            </Box>
          </Box>
        </Box>
      ) : null}

      {isLoading ? (
        <CenteredLoader label="Loading reminders…" />
      ) : filteredReminders.length === 0 ? (
        <EmptyState
          title="No reminders found"
          description={
            fromNotification
              ? undefined
              : 'Create a custom reminder, or let expiry tracking surface upcoming dates.'
          }
          action={
            !fromNotification ? (
              <Button variant="solid" onClick={() => setShowCreateForm(true)}>
                Create reminder
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Stack gap="md">
          {filteredReminders.map((reminder) => {
            const daysLeft = getDaysUntilReminder(reminder.reminderAt);
            const priority = getPriority(daysLeft);
            const title =
              reminder.inventory?.name?.trim() ||
              (reminder.type === 'EXPIRY' ? 'Expiry reminder' : 'Custom reminder');

            return (
              <Card
                key={reminder.id}
                className={cn(
                  surfaceChrome.reminderListCard,
                  surfaceChrome.reminderPriority,
                  priority === 'high' && surfaceChrome.reminderPriorityHigh,
                  priority === 'medium' && surfaceChrome.reminderPriorityMedium,
                  priority === 'low' && surfaceChrome.reminderPriorityLow,
                )}
              >
                <CardBody>
                  <Box className={surfaceChrome.reminderListMain}>
                    <Box className={surfaceChrome.reminderListHeader}>
                      <Box className={surfaceChrome.reminderListTitleBlock}>
                        <Text as="p" className={surfaceChrome.reminderListKind}>
                          {typeLabel(reminder.type)} reminder
                        </Text>
                        <Text as="p" className={surfaceChrome.reminderListTitle}>
                          {title}
                        </Text>
                        <Inline gap="sm" flexWrap>
                          <Badge variant={statusBadgeVariant(reminder.status)}>
                            {statusLabel(reminder.status)}
                          </Badge>
                          <Badge variant={priorityBadgeVariant(priority)}>{priority}</Badge>
                        </Inline>
                      </Box>
                      <Box className={surfaceChrome.reminderListActions}>
                        <Text
                          as="p"
                          className={cn(
                            surfaceChrome.reminderListDue,
                            daysLeft < 0 && surfaceChrome.reminderListDueOverdue,
                            daysLeft >= 0 && daysLeft <= 3 && surfaceChrome.reminderListDueSoon,
                          )}
                        >
                          {dueCopy(daysLeft)}
                        </Text>
                        {fromNotification ? null : (
                          <Inline gap="sm" flexWrap>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingReminder(reminder)}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              onClick={() => setDeletingReminderId(reminder.id)}
                            >
                              Delete
                            </Button>
                          </Inline>
                        )}
                        {reminder.inventory ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedInventory(reminder.inventory)}
                          >
                            View details
                          </Button>
                        ) : null}
                      </Box>
                    </Box>

                    <Box className={surfaceChrome.reminderListGrid}>
                      <Box className={surfaceChrome.reminderListField}>
                        <Text as="p" className={surfaceChrome.reminderListLabel}>
                          Reminder
                        </Text>
                        <Text as="p" className={surfaceChrome.reminderListValue}>
                          {formatDate(reminder.reminderAt)}
                        </Text>
                      </Box>
                      {reminder.expiryDate ? (
                        <Box className={surfaceChrome.reminderListField}>
                          <Text as="p" className={surfaceChrome.reminderListLabel}>
                            End date
                          </Text>
                          <Text as="p" className={surfaceChrome.reminderListValue}>
                            {formatDate(reminder.expiryDate)}
                          </Text>
                        </Box>
                      ) : null}
                      {reminder.notes ? (
                        <Box className={surfaceChrome.reminderListField}>
                          <Text as="p" className={surfaceChrome.reminderListLabel}>
                            Notes
                          </Text>
                          <Text as="p" className={surfaceChrome.reminderListValue}>
                            {reminder.notes}
                          </Text>
                        </Box>
                      ) : null}
                    </Box>

                    {reminder.inventory ? (
                      <Box className={surfaceChrome.reminderListInventory}>
                        <Box className={surfaceChrome.reminderListGrid}>
                          <Box className={surfaceChrome.reminderListField}>
                            <Text as="p" className={surfaceChrome.reminderListLabel}>
                              Product
                            </Text>
                            <Text as="p" className={surfaceChrome.reminderListValue}>
                              {reminder.inventory.name ?? '—'}
                            </Text>
                          </Box>
                          <Box className={surfaceChrome.reminderListField}>
                            <Text as="p" className={surfaceChrome.reminderListLabel}>
                              Company
                            </Text>
                            <Text as="p" className={surfaceChrome.reminderListValue}>
                              {reminder.inventory.companyName ?? '—'}
                            </Text>
                          </Box>
                          <Box className={surfaceChrome.reminderListField}>
                            <Text as="p" className={surfaceChrome.reminderListLabel}>
                              Location
                            </Text>
                            <Text as="p" className={surfaceChrome.reminderListValue}>
                              {reminder.inventory.location ?? '—'}
                            </Text>
                          </Box>
                        </Box>
                      </Box>
                    ) : null}

                    {fromNotification ? (
                      <Stack gap="sm">
                        <Inline gap="sm" flexWrap>
                          {SNOOZE_OPTIONS.map((days) => (
                            <Button
                              key={days}
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={snoozingReminderId === reminder.id}
                              onClick={() => void handleSnooze(reminder.id, days)}
                            >
                              {days}d
                            </Button>
                          ))}
                        </Inline>
                        <Inline gap="sm" flexWrap align="end">
                          <FormField
                            label="Custom days"
                            type="number"
                            value={customSnoozeDays === '' ? '' : String(customSnoozeDays)}
                            onChange={(value) =>
                              setCustomSnoozeDays(value === '' ? '' : Number(value))
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="solid"
                            disabled={
                              snoozingReminderId === reminder.id ||
                              customSnoozeDays === '' ||
                              Number(customSnoozeDays) <= 0
                            }
                            onClick={() =>
                              customSnoozeDays !== '' &&
                              void handleSnooze(reminder.id, Number(customSnoozeDays))
                            }
                          >
                            {snoozingReminderId === reminder.id ? 'Snoozing…' : 'Snooze'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => setDeletingReminderId(reminder.id)}
                          >
                            Delete
                          </Button>
                        </Inline>
                      </Stack>
                    ) : null}
                  </Box>
                </CardBody>
              </Card>
            );
          })}

          {!focusReminderId ? (
            <PaginationBar
              page={page}
              totalPages={Math.max(totalPages, 1)}
              disabled={isLoading}
              onPageChange={setPage}
              pageSize={size}
              pageSizeOptions={[5, 10, 20, 50]}
              onPageSizeChange={(n) => {
                setPage(0);
                setSize(n);
              }}
              aria-label="Reminder pages"
            />
          ) : null}
        </Stack>
      )}

      {selectedInventory ? (
        <InventoryAlertDetails
          open={selectedInventory !== null}
          item={selectedInventory as never}
          onClose={() => setSelectedInventory(null)}
        />
      ) : null}
    </Stack>
  );
}
