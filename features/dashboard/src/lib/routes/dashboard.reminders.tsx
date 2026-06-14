import { useState, useEffect } from 'react';
import { useLocation } from 'react-router';
import { remindersApi } from '@inventory-platform/api';
import type {
  Reminder,
  ReminderType,
  CreateReminderDto,
  UpdateReminderDto,
  ReminderDetail,
  ReminderInventorySummary,
  InventoryExpiryBuckets,
} from '@inventory-platform/types';
import {
  ReminderForm,
  InventoryAlertDetails,
  PaginationBar,
} from '@inventory-platform/ui';
import styles from './dashboard.reminders.module.css';
import { useNotify } from '@inventory-platform/store';

export function meta() {
  return [
    { title: 'Reminders - StockKart' },
    { name: 'description', content: 'Manage your inventory reminders' },
  ];
}

const SNOOZE_OPTIONS = [1, 2, 3, 5, 7, 14, 30];

export default function RemindersPage() {
  const location = useLocation();
  const fromNotification = location.state?.fromNotification === true;
  const focusReminderId = location.state?.reminderId as string | undefined;
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [reminders, setReminders] = useState<ReminderDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'PENDING' | 'COMPLETED'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ReminderType>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(
    null
  );
  const [snoozingReminderId, setSnoozingReminderId] = useState<string | null>(
    null
  );
  const [customSnoozeDays, setCustomSnoozeDays] = useState<number | ''>(''); // 👈 for manual days
  const [selectedInventory, setSelectedInventory] =
    useState<ReminderInventorySummary | null>(null);
  const [expiryBuckets, setExpiryBuckets] =
    useState<InventoryExpiryBuckets | null>(null);
  const { error: notifyError } = useNotify;

  const handleSnooze = async (reminderId: string, snoozeDays: number) => {
    if (!snoozeDays || snoozeDays <= 0) {
      notifyError('Snooze days must be a positive number');
      return;
    }

    setSnoozingReminderId(reminderId);
    setError(null);
    try {
      await remindersApi.snooze(reminderId, snoozeDays);
      await fetchReminders();
      setCustomSnoozeDays('');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to snooze reminder';
      notifyError(errorMessage);
    } finally {
      setSnoozingReminderId(null);
    }
  };

  const fetchReminders = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (focusReminderId) {
        const reminder = await remindersApi.getDetailById(focusReminderId);

        setReminders([reminder]);
        setTotalPages(1);
      } else {
        const res = await remindersApi.getDetails(page, size);

        setReminders(res.data);
        setTotalPages(res.meta.totalPages);
      }
    } catch (err) {
      notifyError(
        err instanceof Error ? err.message : 'Failed to load reminders'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size]);

  useEffect(() => {
    if (fromNotification) return;
    let cancelled = false;
    remindersApi
      .getExpiryBuckets(30)
      .then((buckets) => {
        if (!cancelled) setExpiryBuckets(buckets);
      })
      .catch(() => {
        if (!cancelled) setExpiryBuckets(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fromNotification]);

  useEffect(() => {
    if (focusReminderId) {
      window.history.replaceState({}, '', '/dashboard/reminders');
    }
  }, [focusReminderId]);

  const handleCreate = async (
    data: Parameters<typeof remindersApi.create>[0]
  ) => {
    setIsSubmitting(true);
    try {
      await remindersApi.create(data);
      await fetchReminders();
      setShowCreateForm(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create reminder';
      notifyError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (
    data: Parameters<typeof remindersApi.update>[1]
  ) => {
    if (!editingReminder) return;

    setIsSubmitting(true);
    try {
      await remindersApi.update(editingReminder.id, data);
      await fetchReminders();
      setEditingReminder(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update reminder';
      notifyError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (data: CreateReminderDto | UpdateReminderDto) => {
    if (editingReminder) {
      await handleUpdate(data as UpdateReminderDto);
    } else {
      await handleCreate(data as CreateReminderDto);
    }
  };

  const handleDeleteClick = (reminderId: string) => {
    setDeletingReminderId(reminderId);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingReminderId) return;

    try {
      await remindersApi.delete(deletingReminderId);
      await fetchReminders();
      setDeletingReminderId(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete reminder';
      notifyError(errorMessage);
      setDeletingReminderId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingReminderId(null);
  };

  const getDaysUntilReminder = (reminderAt: string): number => {
    const now = new Date();
    const reminderDate = new Date(reminderAt);
    const diffTime = reminderDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPriority = (daysLeft: number): 'high' | 'medium' | 'low' => {
    if (daysLeft < 0) return 'high';
    if (daysLeft <= 3) return 'high';
    if (daysLeft <= 7) return 'medium';
    return 'low';
  };

  const filteredReminders = reminders.filter((reminder) => {
    const statusMatch = filter === 'all' || reminder.status === filter;
    const typeMatch = typeFilter === 'all' || reminder.type === typeFilter;
    return statusMatch && typeMatch;
  });

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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Reminders</h2>
          <p className={styles.subtitle}>
            {fromNotification
              ? 'Reminder details from notification'
              : 'Manage your inventory reminders'}
          </p>
        </div>

        {!fromNotification && (
          <button
            className={styles.createButton}
            onClick={() => {
              setShowCreateForm(true);
              setEditingReminder(null);
            }}
          >
            + Create Reminder
          </button>
        )}
      </div>

      {!fromNotification && expiryBuckets && (
        <div className={styles.expiryBuckets}>
          <div className={styles.bucketCard}>
            <span className={styles.bucketLabel}>Expired</span>
            <span className={styles.bucketValue}>{expiryBuckets.expired}</span>
          </div>
          <div className={styles.bucketCard}>
            <span className={styles.bucketLabel}>Within 7 days</span>
            <span className={styles.bucketValue}>
              {expiryBuckets.expiringWithin7Days}
            </span>
          </div>
          <div className={styles.bucketCard}>
            <span className={styles.bucketLabel}>
              Within {expiryBuckets.expiringSoonDays} days
            </span>
            <span className={styles.bucketValue}>
              {expiryBuckets.expiringSoonTotal}
            </span>
          </div>
          <div className={styles.bucketCard}>
            <span className={styles.bucketLabel}>Tracked expiry</span>
            <span className={styles.bucketValue}>
              {expiryBuckets.totalWithExpiry}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className={styles.errorMessage}>
          {error}
          <button
            className={styles.dismissButton}
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      {!fromNotification && (showCreateForm || editingReminder) && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{editingReminder ? 'Edit Reminder' : 'Create Reminder'}</h3>
              <button
                className={styles.closeButton}
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingReminder(null);
                }}
              >
                ×
              </button>
            </div>
            <ReminderForm
              reminder={editingReminder || undefined}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowCreateForm(false);
                setEditingReminder(null);
              }}
              isLoading={isSubmitting}
            />
          </div>
        </div>
      )}

      {deletingReminderId && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Delete Reminder</h3>
              <button
                className={styles.closeButton}
                onClick={handleDeleteCancel}
              >
                ×
              </button>
            </div>
            <div className={styles.confirmContent}>
              <p>
                Are you sure you want to delete this reminder? This action
                cannot be undone.
              </p>
              <div className={styles.confirmActions}>
                <button
                  className={styles.cancelButton}
                  onClick={handleDeleteCancel}
                >
                  Cancel
                </button>
                <button
                  className={styles.confirmButton}
                  onClick={handleDeleteConfirm}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.remindersContainer}>
        {!fromNotification && (
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Status:</span>
              <button
                className={`${styles.filterBtn} ${
                  filter === 'all' ? styles.active : ''
                }`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                className={`${styles.filterBtn} ${
                  filter === 'PENDING' ? styles.active : ''
                }`}
                onClick={() => setFilter('PENDING')}
              >
                Pending
              </button>
              <button
                className={`${styles.filterBtn} ${
                  filter === 'COMPLETED' ? styles.active : ''
                }`}
                onClick={() => setFilter('COMPLETED')}
              >
                Completed
              </button>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Type:</span>
              <button
                className={`${styles.filterBtn} ${
                  typeFilter === 'all' ? styles.active : ''
                }`}
                onClick={() => setTypeFilter('all')}
              >
                All
              </button>
              <button
                className={`${styles.filterBtn} ${
                  typeFilter === 'EXPIRY' ? styles.active : ''
                }`}
                onClick={() => setTypeFilter('EXPIRY')}
              >
                Expiry
              </button>
              <button
                className={`${styles.filterBtn} ${
                  typeFilter === 'CUSTOM' ? styles.active : ''
                }`}
                onClick={() => setTypeFilter('CUSTOM')}
              >
                Custom
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className={styles.loading}>Loading reminders...</div>
        ) : filteredReminders.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No reminders found.</p>
            {!showCreateForm && !fromNotification && (
              <button
                className={styles.createButton}
                onClick={() => setShowCreateForm(true)}
              >
                Create Your First Reminder
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={styles.remindersList}>
              {filteredReminders.map((reminder) => {
                const daysLeft = getDaysUntilReminder(reminder.reminderAt);
                const priority = getPriority(daysLeft);

                return (
                  <div
                    key={reminder.id}
                    className={`${styles.reminderCard} ${styles[priority]}`}
                  >
                    <div className={styles.reminderIcon}>
                      {reminder.type === 'EXPIRY' ? '📅' : '🔔'}
                    </div>
                    <div className={styles.reminderInfo}>
                      <div className={styles.reminderHeader}>
                        <h3 className={styles.reminderTitle}>
                          {reminder.type === 'EXPIRY'
                            ? 'Expiry Reminder'
                            : 'Custom Reminder'}
                        </h3>
                        <div className={styles.badges}>
                          <span
                            className={`${styles.statusBadge} ${
                              styles[reminder.status]
                            }`}
                          >
                            {reminder.status}
                          </span>
                          {reminder.type && (
                            <span className={styles.typeBadge}>
                              {reminder.type}
                            </span>
                          )}
                          <span
                            className={`${styles.priorityBadge} ${styles[priority]}`}
                          >
                            {priority}
                          </span>
                        </div>
                      </div>
                      <div className={styles.reminderDetails}>
                        <div>
                          <strong>Reminder:</strong>{' '}
                          {formatDate(reminder.reminderAt)}
                        </div>
                        {reminder.expiryDate && (
                          <div>
                            <strong>End Date:</strong>{' '}
                            {formatDate(reminder.expiryDate)}
                          </div>
                        )}
                        {reminder.notes && (
                          <div className={styles.notes}>
                            <strong>Notes:</strong> {reminder.notes}
                          </div>
                        )}
                        {reminder.inventory && (
                          <div className={styles.inventoryBox}>
                            <div>
                              <strong>Product:</strong>{' '}
                              {reminder.inventory.name ?? '—'}
                            </div>
                            <div>
                              <strong>Company:</strong>{' '}
                              {reminder.inventory.companyName ?? '—'}
                            </div>
                            <div>
                              <strong>Location:</strong>{' '}
                              {reminder.inventory.location ?? '—'}
                            </div>
                          </div>
                        )}
                        <div className={styles.daysLeft}>
                          {daysLeft < 0
                            ? `${Math.abs(daysLeft)} days overdue`
                            : daysLeft === 0
                            ? 'Due today'
                            : `${daysLeft} ${
                                daysLeft === 1 ? 'day' : 'days'
                              } left`}
                        </div>
                      </div>
                    </div>

                    <div className={styles.reminderActions}>
                      {fromNotification ? (
                        <div className={styles.snoozeActions}>
                          <div className={styles.snoozePresetRow}>
                            {SNOOZE_OPTIONS.map((days) => (
                              <button
                                key={days}
                                type="button"
                                className={styles.snoozeChip}
                                disabled={snoozingReminderId === reminder.id}
                                onClick={() => handleSnooze(reminder.id, days)}
                              >
                                {days}d
                              </button>
                            ))}
                          </div>

                          <div className={styles.snoozeCustomRow}>
                            <input
                              type="number"
                              min={1}
                              className={styles.snoozeInput}
                              placeholder="Custom days"
                              value={customSnoozeDays}
                              onChange={(e) =>
                                setCustomSnoozeDays(
                                  e.target.value === ''
                                    ? ''
                                    : Number(e.target.value)
                                )
                              }
                            />
                            <button
                              type="button"
                              className={styles.actionBtn}
                              disabled={
                                snoozingReminderId === reminder.id ||
                                customSnoozeDays === '' ||
                                Number(customSnoozeDays) <= 0
                              }
                              onClick={() =>
                                customSnoozeDays !== '' &&
                                handleSnooze(
                                  reminder.id,
                                  Number(customSnoozeDays)
                                )
                              }
                            >
                              {snoozingReminderId === reminder.id
                                ? 'Snoozing...'
                                : 'Snooze'}
                            </button>
                            <button
                              type="button"
                              className={styles.actionBtnDanger}
                              onClick={() => handleDeleteClick(reminder.id)}
                            >
                              Delete
                            </button>
                          </div>
                          {reminder.inventory && (
                            <button
                              type="button"
                              className={styles.viewDetailsBtn}
                              onClick={() =>
                                setSelectedInventory(reminder.inventory)
                              }
                            >
                              View Details
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className={styles.actionButtonsContainer}>
                          <div className={styles.actionButtonsRow}>
                            <button
                              className={styles.actionBtn}
                              onClick={() => setEditingReminder(reminder)}
                            >
                              Edit
                            </button>
                            <button
                              className={styles.actionBtnDanger}
                              onClick={() => handleDeleteClick(reminder.id)}
                            >
                              Delete
                            </button>
                          </div>
                          {reminder.inventory && (
                            <button
                              className={styles.viewDetailsBtn}
                              onClick={() =>
                                setSelectedInventory(reminder.inventory)
                              }
                            >
                              View Details
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
      </div>
      {selectedInventory && (
        <InventoryAlertDetails
          open={selectedInventory !== null}
          item={selectedInventory as any}
          onClose={() => setSelectedInventory(null)}
        />
      )}
    </div>
  );
}
