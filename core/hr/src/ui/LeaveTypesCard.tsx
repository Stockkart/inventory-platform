import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EditModal,
  FormField,
  Inline,
  Input,
  Stack,
  Switch,
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
import { useNotify } from '@inventory-platform/session';
import type { LeaveTypeResponse, SaveLeaveTypeRequest } from '@inventory-platform/hr/types';
import { useLeaveTypesQuery, useSaveLeaveTypeMutation } from '../queries/hooks';

interface LeaveTypeDraft {
  id?: string;
  name: string;
  paid: boolean;
  /** Blank = no limit. */
  quota: string;
}

function quotaLabel(days: number | null | undefined) {
  if (days == null) return 'No limit';
  return `${days} day${days === 1 ? '' : 's'} a year`;
}

/** Same rule as the backend `LeaveTypeValidator`: whole or half days, 0–366. */
function quotaError(raw: string): string | null {
  if (!raw.trim()) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 366 || !Number.isInteger(n * 2)) {
    return 'Yearly quota must be whole or half days between 0 and 366';
  }
  return null;
}

export interface LeaveTypesCardProps {
  readOnly: boolean;
}

/** Leave types (R6.1): name, paid or unpaid, yearly quota; deactivate instead of delete. */
export function LeaveTypesCard({ readOnly }: LeaveTypesCardProps) {
  const leaveTypes = useLeaveTypesQuery();
  const save = useSaveLeaveTypeMutation();
  const [draft, setDraft] = useState<LeaveTypeDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  const handleSave = () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setDraftError('Leave type name is required');
      return;
    }
    if (name.length > 50) {
      setDraftError('Leave type name may have at most 50 characters');
      return;
    }
    const problem = quotaError(draft.quota);
    if (problem) {
      setDraftError(problem);
      return;
    }
    setDraftError(null);
    const body: SaveLeaveTypeRequest = {
      name,
      paid: draft.paid,
      yearlyQuotaDays: draft.quota.trim() ? Number(draft.quota) : null,
      // null keeps "active" as it is on update (and makes new types active).
      active: null,
    };
    save.mutate(
      { id: draft.id, body },
      {
        onSuccess: () => {
          useNotify.success(draft.id ? 'Leave type updated' : 'Leave type added');
          setDraft(null);
        },
        onError: (err) => useNotify.error(err.message || 'Could not save the leave type'),
      },
    );
  };

  const setActive = (lt: LeaveTypeResponse, active: boolean) => {
    save.mutate(
      {
        id: lt.id,
        body: {
          name: lt.name,
          paid: lt.paid ?? false,
          yearlyQuotaDays: lt.yearlyQuotaDays ?? null,
          active,
        },
      },
      {
        onSuccess: () =>
          useNotify.success(active ? `${lt.name} can be used again` : `${lt.name} switched off`),
        onError: (err) => useNotify.error(err.message || 'Could not change the leave type'),
      },
    );
  };

  const rows = leaveTypes.data ?? [];
  const colSpan = readOnly ? 4 : 5;

  return (
    <Card>
      <CardBody>
        <Stack gap="md">
          <Inline gap="sm" justify="between" flexWrap>
            <Stack gap="xs">
              <Text variant="heading4" as="h3">
                Leave types
              </Text>
              <Text variant="caption" color="muted">
                Each employee gets the yearly quota of every paid leave type. Switched-off types
                cannot be used for new leave.
              </Text>
            </Stack>
            {readOnly ? null : (
              <Button
                type="button"
                size="sm"
                variant="solid"
                onClick={() => {
                  setDraft({ name: '', paid: true, quota: '' });
                  setDraftError(null);
                }}
              >
                Add leave type
              </Button>
            )}
          </Inline>

          {leaveTypes.error ? <Alert variant="danger">{leaveTypes.error.message}</Alert> : null}

          <Table aria-label="Leave types">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Pay</TableHeaderCell>
                <TableHeaderCell>Yearly quota</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                {readOnly ? null : <TableHeaderCell>Actions</TableHeaderCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {leaveTypes.isLoading ? (
                <TableLoadingRow colSpan={colSpan} />
              ) : rows.length === 0 ? (
                <TableEmptyRow colSpan={colSpan} message="No leave types yet" />
              ) : (
                rows.map((lt) => {
                  const active = lt.active !== false;
                  return (
                    <TableRow key={lt.id}>
                      <TableCell>{lt.name}</TableCell>
                      <TableCell>{lt.paid ? 'Paid' : 'Unpaid'}</TableCell>
                      <TableCell>{quotaLabel(lt.yearlyQuotaDays)}</TableCell>
                      <TableCell>
                        <Badge variant={active ? 'success' : 'neutral'}>
                          {active ? 'In use' : 'Switched off'}
                        </Badge>
                      </TableCell>
                      {readOnly ? null : (
                        <TableCell>
                          <Inline gap="xs">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-label={`Edit ${lt.name}`}
                              onClick={() => {
                                setDraft({
                                  id: lt.id,
                                  name: lt.name,
                                  paid: lt.paid ?? false,
                                  quota:
                                    lt.yearlyQuotaDays == null ? '' : String(lt.yearlyQuotaDays),
                                });
                                setDraftError(null);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-label={active ? `Switch off ${lt.name}` : `Use ${lt.name} again`}
                              disabled={save.isPending}
                              onClick={() => setActive(lt, !active)}
                            >
                              {active ? 'Switch off' : 'Use again'}
                            </Button>
                          </Inline>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Stack>
      </CardBody>

      <EditModal
        open={draft !== null}
        title={draft?.id ? 'Edit leave type' : 'Add leave type'}
        onClose={() => setDraft(null)}
        onCancel={() => setDraft(null)}
        onSave={handleSave}
        saving={save.isPending}
        error={draftError}
        saveLabel={draft?.id ? 'Save' : 'Add'}
      >
        {draft ? (
          <Stack gap="sm">
            <FormField label="Leave type name" id="hr-leave-type-name">
              <Input
                id="hr-leave-type-name"
                value={draft.name}
                maxLength={50}
                placeholder="For example Casual"
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </FormField>
            <Switch
              label="Paid leave"
              checked={draft.paid}
              onChange={(e) => setDraft({ ...draft, paid: e.target.checked })}
            />
            <FormField
              label="Days per leave year"
              id="hr-leave-type-quota"
              hint="Leave blank for no limit. Half days like 1.5 are allowed."
            >
              <Input
                id="hr-leave-type-quota"
                type="number"
                inputMode="decimal"
                min={0}
                max={366}
                step={0.5}
                value={draft.quota}
                onChange={(e) => setDraft({ ...draft, quota: e.target.value })}
              />
            </FormField>
          </Stack>
        ) : null}
      </EditModal>
    </Card>
  );
}
