import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  EditModal,
  FormField,
  IconButton,
  Icon,
  Inline,
  Input,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TableLoadingRow,
  TableRow,
  Text,
} from '@inventory-platform/ui-kit';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNotify } from '@inventory-platform/session';
import { formatDate, type HolidayResponse } from '@inventory-platform/hr/types';
import {
  useDeleteHolidayMutation,
  useHolidaysQuery,
  useSaveHolidayMutation,
} from '../queries/hooks';

interface HolidayDraft {
  id?: string;
  date: string;
  name: string;
}

export interface HolidaysCardProps {
  readOnly: boolean;
  /** Year shown first; defaults to this year. */
  initialYear?: number;
}

/** Shop holidays for one year (R3): add, edit, remove. Holidays are paid days. */
export function HolidaysCard({ readOnly, initialYear }: HolidaysCardProps) {
  const [year, setYear] = useState(() => initialYear ?? new Date().getFullYear());
  const holidays = useHolidaysQuery(year);
  const save = useSaveHolidayMutation();
  const remove = useDeleteHolidayMutation();
  const [draft, setDraft] = useState<HolidayDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<HolidayResponse | null>(null);

  const openNew = () => {
    setDraft({ date: `${year}-01-01`, name: '' });
    setDraftError(null);
  };

  const handleSave = () => {
    if (!draft) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
      setDraftError('Holiday date must be a date like 2025-08-15');
      return;
    }
    if (!draft.name.trim()) {
      setDraftError('Holiday name is required');
      return;
    }
    if (draft.name.trim().length > 100) {
      setDraftError('Holiday name may have at most 100 characters');
      return;
    }
    setDraftError(null);
    save.mutate(
      { id: draft.id, body: { date: draft.date, name: draft.name.trim() } },
      {
        onSuccess: (saved) => {
          useNotify.success(draft.id ? 'Holiday updated' : 'Holiday added');
          setDraft(null);
          // Jump to the saved holiday's year so it is visible in the list.
          const savedYear = Number(saved.date.slice(0, 4));
          if (Number.isFinite(savedYear) && savedYear !== year) setYear(savedYear);
        },
        onError: (err) => setDraftError(err.message || 'Could not save the holiday'),
      },
    );
  };

  const rows = holidays.data ?? [];
  const colSpan = readOnly ? 2 : 3;

  return (
    <Card>
      <CardBody>
        <Stack gap="md">
          <Inline gap="sm" justify="between" flexWrap>
            <Stack gap="xs">
              <Text variant="heading4" as="h3">
                Holidays
              </Text>
              <Text variant="caption" color="muted">
                Holidays are paid days and are filled in on the attendance register.
              </Text>
            </Stack>
            <Inline gap="xs">
              <IconButton
                label="Previous year"
                size="sm"
                onClick={() => setYear((y) => y - 1)}
                disabled={year <= 2000}
              >
                <Icon icon={ChevronLeft} size="sm" />
              </IconButton>
              <Text as="span" weight="semibold" aria-live="polite">
                {year}
              </Text>
              <IconButton
                label="Next year"
                size="sm"
                onClick={() => setYear((y) => y + 1)}
                disabled={year >= 2100}
              >
                <Icon icon={ChevronRight} size="sm" />
              </IconButton>
              {readOnly ? null : (
                <Button type="button" size="sm" variant="solid" onClick={openNew}>
                  Add holiday
                </Button>
              )}
            </Inline>
          </Inline>

          {holidays.error ? <Alert variant="danger">{holidays.error.message}</Alert> : null}

          <Table aria-label={`Holidays in ${year}`}>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Holiday</TableHeaderCell>
                {readOnly ? null : <TableHeaderCell>Actions</TableHeaderCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {holidays.isLoading ? (
                <TableLoadingRow colSpan={colSpan} />
              ) : rows.length === 0 ? (
                <TableEmptyRow colSpan={colSpan} message={`No holidays added for ${year}`} />
              ) : (
                rows.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{formatDate(h.date)}</TableCell>
                    <TableCell>{h.name}</TableCell>
                    {readOnly ? null : (
                      <TableCell>
                        <Inline gap="xs">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label={`Edit ${h.name}`}
                            onClick={() => {
                              setDraft({ id: h.id, date: h.date, name: h.name });
                              setDraftError(null);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label={`Remove ${h.name}`}
                            onClick={() => setRemoving(h)}
                          >
                            Remove
                          </Button>
                        </Inline>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Stack>
      </CardBody>

      <EditModal
        open={draft !== null}
        title={draft?.id ? 'Edit holiday' : 'Add holiday'}
        onClose={() => setDraft(null)}
        onCancel={() => setDraft(null)}
        onSave={handleSave}
        saving={save.isPending}
        error={draftError}
        saveLabel={draft?.id ? 'Save' : 'Add'}
      >
        {draft ? (
          <Stack gap="sm">
            <FormField label="Date" id="hr-holiday-date">
              <Input
                id="hr-holiday-date"
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
              />
            </FormField>
            <FormField label="Holiday name" id="hr-holiday-name">
              <Input
                id="hr-holiday-name"
                value={draft.name}
                maxLength={100}
                placeholder="For example Independence Day"
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </FormField>
          </Stack>
        ) : null}
      </EditModal>

      <ConfirmDialog
        open={removing !== null}
        title="Remove holiday?"
        message={
          removing
            ? `${removing.name} on ${formatDate(removing.date)} will be a normal working day again.`
            : ''
        }
        confirmLabel="Remove"
        loading={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return;
          remove.mutate(removing.id, {
            onSuccess: () => {
              useNotify.success('Holiday removed');
              setRemoving(null);
            },
            onError: (err) => {
              useNotify.error(err.message || 'Could not remove the holiday');
              setRemoving(null);
            },
          });
        }}
      />
    </Card>
  );
}
