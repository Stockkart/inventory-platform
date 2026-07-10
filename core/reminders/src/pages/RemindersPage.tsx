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
  FormField,
  Grid,
  Inline,
  Modal,
  PageHeader,
  PaginationBar,
  Stack,
  Text,
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
import styles from './reminders.module.css';

const SNOOZE_OPTIONS = [1, 2, 3, 5, 7, 14, 30];

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
      return new Date(dateString).toLocaleDateString('en-US', {
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

  return (
    <Stack gap="md" className={styles.page}>
      <PageHeader
        title="Reminders"
        description={
          fromNotification
            ? 'Reminder details from notification'
            : 'Manage your inventory reminders'
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
        <Grid className={styles.expiryBuckets}>
          <Card>
            <CardBody>
              <Text variant="caption" color="secondary">
                Expired
              </Text>
              <Text variant="heading2" weight="bold">
                {expiryBuckets.expired}
              </Text>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Text variant="caption" color="secondary">
                Within 7 days
              </Text>
              <Text variant="heading2" weight="bold">
                {expiryBuckets.expiringWithin7Days}
              </Text>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Text variant="caption" color="secondary">
                Within {expiryBuckets.expiringSoonDays} days
              </Text>
              <Text variant="heading2" weight="bold">
                {expiryBuckets.expiringSoonTotal}
              </Text>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Text variant="caption" color="secondary">
                Tracked expiry
              </Text>
              <Text variant="heading2" weight="bold">
                {expiryBuckets.totalWithExpiry}
              </Text>
            </CardBody>
          </Card>
        </Grid>
      ) : null}

      <Modal open={formModalOpen} onClose={closeFormModal} size="md">
        <Modal.Header
          title={editingReminder ? 'Edit Reminder' : 'Create Reminder'}
          onClose={closeFormModal}
        />
        <Modal.Body>
          <ReminderForm
            reminder={editingReminder || undefined}
            onSubmit={handleSubmit}
            onCancel={closeFormModal}
            isLoading={isSubmitting}
          />
        </Modal.Body>
      </Modal>

      <ConfirmDialog
        open={!!deletingReminderId}
        title="Delete Reminder"
        message="Are you sure you want to delete this reminder? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onCancel={() => setDeletingReminderId(null)}
        onConfirm={handleDeleteConfirm}
      />

      <Stack gap="md" className={styles.remindersContainer}>
        {!fromNotification && (
          <Stack gap="md" className={styles.filters}>
            <Inline gap="sm" className={styles.filterGroup}>
              <Text variant="label" color="secondary">
                Status:
              </Text>
              {(['all', 'PENDING', 'COMPLETED'] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={filter === value ? 'solid' : 'outline'}
                  onClick={() => setFilter(value)}
                >
                  {value === 'all' ? 'All' : value.charAt(0) + value.slice(1).toLowerCase()}
                </Button>
              ))}
            </Inline>
            <Inline gap="sm" className={styles.filterGroup}>
              <Text variant="label" color="secondary">
                Type:
              </Text>
              {(['all', 'EXPIRY', 'CUSTOM'] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={typeFilter === value ? 'solid' : 'outline'}
                  onClick={() => setTypeFilter(value)}
                >
                  {value === 'all' ? 'All' : value.charAt(0) + value.slice(1).toLowerCase()}
                </Button>
              ))}
            </Inline>
          </Stack>
        )}

        {isLoading ? (
          <CenteredLoader label="Loading reminders…" />
        ) : filteredReminders.length === 0 ? (
          <Stack gap="md" align="center" className={styles.emptyState}>
            <Text color="secondary">No reminders found.</Text>
            {!showCreateForm && !fromNotification ? (
              <Button variant="solid" onClick={() => setShowCreateForm(true)}>
                Create your first reminder
              </Button>
            ) : null}
          </Stack>
        ) : (
          <>
            <Stack gap="md" className={styles.remindersList}>
              {filteredReminders.map((reminder) => {
                const daysLeft = getDaysUntilReminder(reminder.reminderAt);
                const priority = getPriority(daysLeft);

                return (
                  <Box key={reminder.id} className={`${styles.reminderCard} ${styles[priority]}`}>
                    <Box className={styles.reminderIcon}>
                      {reminder.type === 'EXPIRY' ? '📅' : '🔔'}
                    </Box>
                    <Stack gap="sm" className={styles.reminderInfo}>
                      <Inline justify="between" align="start" className={styles.reminderHeader}>
                        <Text variant="heading3" weight="semibold" className={styles.reminderTitle}>
                          {reminder.type === 'EXPIRY' ? 'Expiry Reminder' : 'Custom Reminder'}
                        </Text>
                        <Inline gap="sm" className={styles.badges}>
                          <Badge className={`${styles.statusBadge} ${styles[reminder.status]}`}>
                            {reminder.status}
                          </Badge>
                          {reminder.type ? (
                            <Badge className={styles.typeBadge}>{reminder.type}</Badge>
                          ) : null}
                          <Badge className={`${styles.priorityBadge} ${styles[priority]}`}>
                            {priority}
                          </Badge>
                        </Inline>
                      </Inline>
                      <Stack gap="sm" className={styles.reminderDetails}>
                        <Text variant="caption">
                          <Text as="span" weight="semibold">
                            Reminder:
                          </Text>{' '}
                          {formatDate(reminder.reminderAt)}
                        </Text>
                        {reminder.expiryDate ? (
                          <Text variant="caption">
                            <Text as="span" weight="semibold">
                              End Date:
                            </Text>{' '}
                            {formatDate(reminder.expiryDate)}
                          </Text>
                        ) : null}
                        {reminder.notes ? (
                          <Text variant="caption" className={styles.notes}>
                            <Text as="span" weight="semibold">
                              Notes:
                            </Text>{' '}
                            {reminder.notes}
                          </Text>
                        ) : null}
                        {reminder.inventory ? (
                          <Stack gap="xs" className={styles.inventoryBox}>
                            <Text variant="caption">
                              <Text as="span" weight="semibold">
                                Product:
                              </Text>{' '}
                              {reminder.inventory.name ?? '—'}
                            </Text>
                            <Text variant="caption">
                              <Text as="span" weight="semibold">
                                Company:
                              </Text>{' '}
                              {reminder.inventory.companyName ?? '—'}
                            </Text>
                            <Text variant="caption">
                              <Text as="span" weight="semibold">
                                Location:
                              </Text>{' '}
                              {reminder.inventory.location ?? '—'}
                            </Text>
                          </Stack>
                        ) : null}
                        <Text variant="caption" weight="semibold" className={styles.daysLeft}>
                          {daysLeft < 0
                            ? `${Math.abs(daysLeft)} days overdue`
                            : daysLeft === 0
                            ? 'Due today'
                            : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}
                        </Text>
                      </Stack>
                    </Stack>

                    <Box className={styles.reminderActions}>
                      {fromNotification ? (
                        <Stack gap="sm" className={styles.snoozeActions}>
                          <Inline gap="sm" className={styles.snoozePresetRow}>
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

                          <Inline gap="sm" className={styles.snoozeCustomRow}>
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
                          {reminder.inventory ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedInventory(reminder.inventory)}
                            >
                              View Details
                            </Button>
                          ) : null}
                        </Stack>
                      ) : (
                        <Stack gap="sm" className={styles.actionButtonsContainer}>
                          <Inline gap="sm" className={styles.actionButtonsRow}>
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
                          {reminder.inventory ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedInventory(reminder.inventory)}
                            >
                              View Details
                            </Button>
                          ) : null}
                        </Stack>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Stack>
            {!focusReminderId && (
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
            )}
          </>
        )}
      </Stack>
      {selectedInventory && (
        <InventoryAlertDetails
          open={selectedInventory !== null}
          item={selectedInventory as never}
          onClose={() => setSelectedInventory(null)}
        />
      )}
    </Stack>
  );
}
