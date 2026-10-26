import { useState } from 'react';
import { Alert, Box, Button, Modal, Stack, Text } from '@inventory-platform/ui-kit';
import {
  formatDayShort,
  formatMonth,
  type UnmarkedDaysResponse,
} from '@inventory-platform/hr/types';
import { useMarkUnmarkedPresentMutation } from '../queries/hooks';

export interface UnmarkedDaysModalProps {
  /** null = closed. */
  unmarked: UnmarkedDaysResponse | null;
  /** MARK_ATTENDANCE: may use "Mark them all Present". */
  canMark: boolean;
  /** Called after marking; the page re-checks and goes on to finalise when nothing is left. */
  onMarked: () => void;
  onOpenAttendance: () => void;
  onClose: () => void;
}

/**
 * Finalise is blocked while anyone has Unmarked days (R8.12). Lists who and which days, and
 * offers to mark them all Present in one go through `POST /attendance/mark-unmarked-present`.
 */
export function UnmarkedDaysModal({
  unmarked,
  canMark,
  onMarked,
  onOpenAttendance,
  onClose,
}: UnmarkedDaysModalProps) {
  const mark = useMarkUnmarkedPresentMutation();
  const [error, setError] = useState<string | null>(null);

  if (!unmarked) return null;

  const employees = unmarked.employees;
  // Every listed date, once, oldest first. The server no longer lists days after today (and
  // refuses to finalise a month that is not over yet), so every listed date can be marked.
  const allDates = [...new Set(employees.flatMap((e) => e.dates))].sort();

  const markAll = () => {
    setError(null);
    mark.mutate(
      { dates: allDates, employeeIds: employees.map((e) => e.employeeId) },
      {
        onSuccess: () => onMarked(),
        onError: (err) => setError(err.message || 'Could not mark the days'),
      },
    );
  };

  return (
    <Modal open onClose={onClose} size="md">
      <Modal.Header title="Some days are not marked yet" onClose={onClose} />
      <Modal.Body>
        <Stack gap="md">
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <Text>
            Payroll for {formatMonth(unmarked.period)} can be finalised only when every day has
            attendance. These days have nothing marked:
          </Text>
          <Stack as="ul" gap="sm" aria-label="Unmarked days">
            {employees.map((e) => (
              <Box as="li" key={e.employeeId}>
                <Text weight="semibold">
                  {e.name}{' '}
                  <Text as="span" variant="caption" color="muted">
                    {e.code}
                  </Text>
                </Text>
                <Text variant="caption" color="secondary">
                  {e.dates.map(formatDayShort).join(', ')}
                </Text>
              </Box>
            ))}
          </Stack>
          {!canMark ? (
            <Text variant="caption" color="secondary">
              Ask someone who can mark attendance to fill these days in.
            </Text>
          ) : null}
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="ghost" onClick={onClose} disabled={mark.isPending}>
          Close
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onOpenAttendance}
          disabled={mark.isPending}
        >
          Open attendance
        </Button>
        {canMark && allDates.length > 0 ? (
          <Button type="button" variant="solid" loading={mark.isPending} onClick={markAll}>
            Mark them all Present
          </Button>
        ) : null}
      </Modal.Footer>
    </Modal>
  );
}
