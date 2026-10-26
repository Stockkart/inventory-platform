import { useState, type ReactNode } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  EditModal,
  FormField,
  Grid,
  Inline,
  Input,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import { useAuthStore, useNotify } from '@inventory-platform/session';
import {
  PAYMENT_METHOD_LABELS,
  employeeToForm,
  formToRequest,
  formatDate,
  formatPay,
  linkRequest,
  todayIso,
  validateEmployeeForm,
  type EmployeeFormErrors,
  type EmployeeFormValue,
  type EmployeeResponse,
} from '@inventory-platform/hr/types';
import { useHrAccess } from '../access/useHrAccess';
import {
  useExitEmployeeMutation,
  useLinkableLoginsQuery,
  useUpdateEmployeeMutation,
} from '../queries/hooks';
import { EmployeeForm } from './EmployeeForm';
import { LoginLinkPicker } from './LoginLinkPicker';

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap="xs">
      <Text variant="caption" color="muted">
        {label}
      </Text>
      <Text>{children}</Text>
    </Stack>
  );
}

/** Payment line exactly as the server sent it (masked values are shown as given). */
export function paymentText(e: EmployeeResponse) {
  if (e.paymentMethod === 'BANK') {
    return `${PAYMENT_METHOD_LABELS.BANK}: ${e.bankAccountNumber ?? '—'}${
      e.ifsc ? `, IFSC ${e.ifsc}` : ''
    }`;
  }
  if (e.paymentMethod === 'UPI') return `${PAYMENT_METHOD_LABELS.UPI}: ${e.upiId ?? '—'}`;
  if (e.paymentMethod === 'CASH') return PAYMENT_METHOD_LABELS.CASH;
  // Method hidden: show any masked detail the server still returned.
  if (e.bankAccountNumber) return `Bank account ${e.bankAccountNumber}`;
  if (e.upiId) return `UPI ${e.upiId}`;
  return 'Hidden';
}

export interface EmployeeProfileTabProps {
  employee: EmployeeResponse;
}

/** Profile tab: details, edit, login link and exit (R4.2–R4.7). */
export function EmployeeProfileTab({ employee }: EmployeeProfileTabProps) {
  const { can, isOwner } = useHrAccess();
  const currentUserId = useAuthStore((s) => s.user?.userId ?? null);
  const canEdit = can('ADD_EDIT_EMPLOYEES');
  const withSalaries = can('VIEW_SALARIES') && !employee.payHidden;
  // The login link and email decide who gets the pay data, so both need VIEW_SALARIES (run B5).
  const canLink = canEdit && can('VIEW_SALARIES');
  const logins = useLinkableLoginsQuery(canEdit);
  const update = useUpdateEmployeeMutation();
  const exit = useExitEmployeeMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<EmployeeFormValue>(() => employeeToForm(employee));
  const [errors, setErrors] = useState<EmployeeFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [exitDate, setExitDate] = useState(todayIso());
  const [exitError, setExitError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const linkedLogin = employee.userId
    ? logins.data?.find((l) => l.userId === employee.userId)
    : undefined;

  const openEdit = () => {
    setForm(employeeToForm(employee));
    setErrors({});
    setSaveError(null);
    setEditOpen(true);
  };

  const handleSave = () => {
    const found = validateEmployeeForm(form, {
      creating: false,
      withPay: false,
      withPayment: withSalaries,
    });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setSaveError('Please fix the highlighted fields.');
      return;
    }
    setSaveError(null);
    const body = formToRequest(form, {
      creating: false,
      withSalaries,
      mayChangeLinkAndEmail: can('VIEW_SALARIES'),
      userId: employee.userId ?? null,
      storedEmail: employee.email ?? null,
      revision: employee.revision ?? null,
    });
    update.mutate(
      { id: employee.id, body },
      {
        onSuccess: () => {
          useNotify.success('Employee details saved');
          setEditOpen(false);
        },
        onError: (err) => setSaveError(err.message || 'Could not save the employee'),
      },
    );
  };

  const handleLink = (userId: string | null) => {
    setLinkError(null);
    update.mutate(
      { id: employee.id, body: linkRequest(employee, userId, can('VIEW_SALARIES')) },
      {
        onSuccess: () => useNotify.success(userId ? 'Login linked' : 'Login unlinked'),
        onError: (err) => setLinkError(err.message || 'Could not change the login link'),
      },
    );
  };

  const handleExit = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exitDate)) {
      setExitError('Exit date must be a date like 2025-04-30');
      return;
    }
    if (employee.joinDate && exitDate < employee.joinDate) {
      setExitError('Exit date cannot be before the join date');
      return;
    }
    setExitError(null);
    exit.mutate(
      { id: employee.id, body: { exitDate } },
      {
        onSuccess: () => {
          useNotify.success(`${employee.name} marked as exited`);
          setExitOpen(false);
        },
        onError: (err) => setExitError(err.message || 'Could not mark the employee as exited'),
      },
    );
  };

  const ownHours =
    employee.workStart && employee.workEnd
      ? `${employee.workStart} to ${employee.workEnd}`
      : "Shop's hours";

  return (
    <Stack gap="md">
      <Card>
        <CardBody>
          <Stack gap="md">
            <Inline gap="sm" justify="between" flexWrap>
              <Text variant="heading4" as="h3">
                Details
              </Text>
              {canEdit ? (
                <Button type="button" variant="outline" size="sm" onClick={openEdit}>
                  Edit details
                </Button>
              ) : null}
            </Inline>
            <Grid columns={2} gap="md">
              <Detail label="Employee code">{employee.code}</Detail>
              <Detail label="Designation">{employee.designation || '—'}</Detail>
              <Detail label="Phone">{employee.phone || '—'}</Detail>
              <Detail label="Email">{employee.email || '—'}</Detail>
              <Detail label="Joined">{formatDate(employee.joinDate)}</Detail>
              <Detail label="Working hours">{ownHours}</Detail>
              {employee.status === 'EXITED' ? (
                <Detail label="Left on">{formatDate(employee.exitDate)}</Detail>
              ) : null}
              {/* Never show pay when the server withheld it (R4.13). */}
              {employee.payHidden ? null : (
                <Detail label="Pay this month">
                  {formatPay(employee.payType, employee.salaryAmount)}
                </Detail>
              )}
              <Detail label="Paid by">{paymentText(employee)}</Detail>
            </Grid>
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Stack gap="sm">
            <Text variant="heading4" as="h3">
              Login
            </Text>
            <Text variant="caption" color="muted">
              A linked employee can sign in and see their own attendance, leave and payslips.
            </Text>
            {canLink ? (
              <Inline gap="sm" flexWrap>
                <LoginLinkPicker
                  employeeId={employee.id}
                  value={employee.userId ?? null}
                  logins={logins.data ?? []}
                  onChange={handleLink}
                  currentUserId={currentUserId}
                  isOwner={isOwner}
                  disabled={update.isPending || logins.isLoading}
                />
              </Inline>
            ) : (
              <Text>
                {employee.userId
                  ? linkedLogin?.name
                    ? `Linked to ${linkedLogin.name}`
                    : 'Linked to a login'
                  : 'Not linked'}
              </Text>
            )}
            {canEdit && !canLink ? (
              <Text variant="caption" color="muted">
                Only someone who can see salaries can link or unlink a login.
              </Text>
            ) : null}
            {logins.error ? <Alert variant="danger">{logins.error.message}</Alert> : null}
            {linkError ? <Alert variant="danger">{linkError}</Alert> : null}
          </Stack>
        </CardBody>
      </Card>

      {canEdit && employee.status === 'ACTIVE' ? (
        <Card>
          <CardBody>
            <Inline gap="sm" justify="between" flexWrap>
              <Stack gap="xs">
                <Text variant="heading4" as="h3">
                  Leaving the shop
                </Text>
                <Text variant="caption" color="muted">
                  After the exit date the employee is left out of new attendance and payroll, but
                  stays in the list for history.
                </Text>
              </Stack>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setExitDate(todayIso());
                  setExitError(null);
                  setExitOpen(true);
                }}
              >
                Mark as exited
              </Button>
            </Inline>
          </CardBody>
        </Card>
      ) : null}

      <EditModal
        open={editOpen}
        title="Edit employee"
        onClose={() => setEditOpen(false)}
        onCancel={() => setEditOpen(false)}
        onSave={handleSave}
        saving={update.isPending}
        error={saveError}
      >
        <EmployeeForm
          value={form}
          onChange={setForm}
          errors={errors}
          creating={false}
          withSalaries={withSalaries}
          emailReadOnly={!can('VIEW_SALARIES')}
          disabled={update.isPending}
        />
      </EditModal>

      <EditModal
        open={exitOpen}
        title={`Mark ${employee.name} as exited`}
        onClose={() => setExitOpen(false)}
        onCancel={() => setExitOpen(false)}
        onSave={handleExit}
        saving={exit.isPending}
        error={exitError}
        saveLabel="Mark as exited"
      >
        <FormField label="Last working day" id="hr-exit-date">
          <Input
            id="hr-exit-date"
            type="date"
            value={exitDate}
            min={employee.joinDate ?? undefined}
            onChange={(e) => setExitDate(e.target.value)}
          />
        </FormField>
      </EditModal>
    </Stack>
  );
}
