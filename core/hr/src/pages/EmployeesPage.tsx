import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  ChoiceList,
  EditModal,
  FilterDropdown,
  FilterStrip,
  Inline,
  PageHeader,
  PaginationBar,
  SearchInput,
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
  surfaceChrome,
  LinkButton,
} from '@inventory-platform/ui-kit';
import { useAuthStore, useNotify } from '@inventory-platform/session';
import {
  EMPLOYEE_STATUS_LABELS,
  newEmployeeForm,
  fillFromLogin,
  formToRequest,
  formatDate,
  unlinkedLogins,
  validateEmployeeForm,
  type EmployeeFormErrors,
  type EmployeeFormValue,
  type EmployeeListParams,
  type EmployeeStatus,
} from '@inventory-platform/hr/types';
import { useHrAccess } from '../access/useHrAccess';
import { HrInbox } from '../ui/HrInbox';
import {
  useCreateEmployeeMutation,
  useEmployeeDesignationsQuery,
  useEmployeesQuery,
  useHrSetupStatusQuery,
  useLinkableLoginsQuery,
} from '../queries/hooks';
import { EmployeeForm } from '../ui/EmployeeForm';
import { employeePath } from '../ui/EmployeeNameLink';
import { HrGetStartedCard } from '../ui/HrGetStartedCard';
import { TeamLoginPicker } from '../ui/TeamLoginPicker';

type StatusFilter = EmployeeStatus | 'ALL';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXITED', label: 'Exited' },
  { value: 'ALL', label: 'Everyone' },
];
const ANY_DESIGNATION = '';

export function EmployeesPage() {
  const navigate = useNavigate();
  const { can, isOwner } = useHrAccess();
  const currentUserId = useAuthStore((s) => s.user?.userId ?? null);
  const canView = can('VIEW_EMPLOYEES');
  const canEdit = can('ADD_EDIT_EMPLOYEES');
  const withSalaries = can('VIEW_SALARIES');
  // Linking a login decides who sees the pay data, so it needs VIEW_SALARIES too (run B5).
  const canLink = canEdit && withSalaries;

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ACTIVE');
  const [designation, setDesignation] = useState(ANY_DESIGNATION);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [statusOpen, setStatusOpen] = useState(false);
  const [designationOpen, setDesignationOpen] = useState(false);

  const params: EmployeeListParams = {
    q: query || undefined,
    status: status === 'ALL' ? undefined : status,
    designation: designation || undefined,
    page,
    size,
  };
  const list = useEmployeesQuery(params, canView);
  const designations = useEmployeeDesignationsQuery(canView);
  const setup = useHrSetupStatusQuery(canView);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<EmployeeFormValue>(() => newEmployeeForm());
  const [errors, setErrors] = useState<EmployeeFormErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loginId, setLoginId] = useState<string | null>(null);
  const create = useCreateEmployeeMutation();
  const logins = useLinkableLoginsQuery(createOpen && canLink);
  // "Add from your team" (run F9): logins that are not an employee yet; own login owner-only.
  const team = canLink ? unlinkedLogins(logins.data ?? [], currentUserId, isOwner) : [];

  const pickLogin = (next: string | null) => {
    const before = team.find((l) => l.userId === loginId) ?? null;
    const after = next ? team.find((l) => l.userId === next) ?? null : null;
    setForm((f) => fillFromLogin(f, before, after));
    setLoginId(next);
  };

  const openCreate = () => {
    setForm(newEmployeeForm());
    setLoginId(null);
    setErrors({});
    setSaveError(null);
    setCreateOpen(true);
  };

  const handleCreate = () => {
    const found = validateEmployeeForm(form, {
      creating: true,
      withPay: withSalaries,
      withPayment: withSalaries,
    });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setSaveError('Please fix the highlighted fields.');
      return;
    }
    setSaveError(null);
    const body = formToRequest(form, {
      creating: true,
      withSalaries,
      // Only a login still on offer is sent (a refetch may have dropped it).
      userId: team.some((l) => l.userId === loginId) ? loginId : null,
    });
    create.mutate(body, {
      onSuccess: (saved) => {
        useNotify.success(`${saved.name} added as ${saved.code}`);
        setCreateOpen(false);
      },
      onError: (err) => setSaveError(err.message || 'Could not add the employee'),
    });
  };

  if (!canView) {
    return (
      <Stack gap="md">
        <Alert variant="info">You do not have permission to see employees in this shop.</Alert>
      </Stack>
    );
  }

  const rows = list.data?.items ?? [];
  const pageMeta = list.data?.page;
  const noFilters = !query && status === 'ACTIVE' && !designation;
  // Show the guide instead of an empty table while the shop has no employees at all.
  const showGuide =
    setup.data != null &&
    noFilters &&
    setup.data.employeeCount === 0 &&
    !list.isLoading &&
    rows.length === 0;

  const designationOptions = [
    { value: ANY_DESIGNATION, label: 'Any designation' },
    ...(designations.data ?? []).map((d) => ({ value: d, label: d })),
  ];

  return (
    <Stack gap="md">
      <PageHeader
        description="Everyone who works in your shop, with or without a login."
        actions={
          <>
            {canEdit ? (
              <Button type="button" variant="solid" onClick={openCreate}>
                Add employee
              </Button>
            ) : null}
            <HrInbox />
          </>
        }
      />

      {showGuide && setup.data ? (
        <HrGetStartedCard status={setup.data} onAddEmployee={canEdit ? openCreate : undefined} />
      ) : null}

      <Inline gap="sm" flexWrap align="stretch" width="full">
        <Box flex="1" className={surfaceChrome.minW280}>
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            onSearch={() => {
              setQuery(searchInput.trim());
              setPage(0);
            }}
            showSearchButton
            buttonVariant="solid"
            grow
            placeholder="Search by name, code or phone"
            aria-label="Search employees"
          />
        </Box>
      </Inline>

      <FilterStrip aria-label="Employee filters">
        <FilterDropdown
          label="Status"
          value={STATUS_OPTIONS.find((o) => o.value === status)?.label}
          open={statusOpen}
          onOpenChange={setStatusOpen}
        >
          <ChoiceList
            aria-label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(v) => {
              setStatus(v as StatusFilter);
              setPage(0);
              setStatusOpen(false);
            }}
          />
        </FilterDropdown>
        <FilterDropdown
          label="Designation"
          value={designation || undefined}
          open={designationOpen}
          onOpenChange={setDesignationOpen}
          onRemove={
            designation
              ? () => {
                  setDesignation(ANY_DESIGNATION);
                  setPage(0);
                }
              : undefined
          }
        >
          <ChoiceList
            aria-label="Designation"
            options={designationOptions}
            value={designation}
            onChange={(v) => {
              setDesignation(v);
              setPage(0);
              setDesignationOpen(false);
            }}
          />
        </FilterDropdown>
      </FilterStrip>

      {list.error ? <Alert variant="danger">{list.error.message}</Alert> : null}

      <Text as="span" className={surfaceChrome.pricingMeta} aria-live="polite">
        {list.isLoading
          ? 'Loading…'
          : `${pageMeta?.totalItems ?? 0} employee${pageMeta?.totalItems === 1 ? '' : 's'}`}
        {query ? ` matching “${query}”` : null}
      </Text>

      <Card>
        <CardBody>
          <Table aria-label="Employees">
            <TableHead>
              <TableRow>
                <TableHeaderCell>Code</TableHeaderCell>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Designation</TableHeaderCell>
                <TableHeaderCell>Phone</TableHeaderCell>
                <TableHeaderCell>Login</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.isLoading ? (
                <TableLoadingRow colSpan={6} />
              ) : rows.length === 0 ? (
                <TableEmptyRow colSpan={6} message="No employees found" />
              ) : (
                rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.code}</TableCell>
                    <TableCell>
                      <LinkButton onClick={() => navigate(employeePath(e.id))}>{e.name}</LinkButton>
                    </TableCell>
                    <TableCell>{e.designation || '—'}</TableCell>
                    <TableCell>{e.phone || '—'}</TableCell>
                    <TableCell>{e.userId ? 'Linked' : '—'}</TableCell>
                    <TableCell>
                      <Badge variant={e.status === 'ACTIVE' ? 'success' : 'neutral'}>
                        {EMPLOYEE_STATUS_LABELS[e.status]}
                        {e.status === 'EXITED' && e.exitDate ? ` on ${formatDate(e.exitDate)}` : ''}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <PaginationBar
        page={page}
        totalPages={pageMeta?.totalPages ?? 0}
        totalItems={pageMeta?.totalItems ?? 0}
        pageSize={size}
        // Backend caps page size at 100.
        pageSizeOptions={[20, 50, 100]}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setSize(n);
          setPage(0);
        }}
      />

      <EditModal
        open={createOpen}
        title="Add employee"
        onClose={() => setCreateOpen(false)}
        onCancel={() => setCreateOpen(false)}
        onSave={handleCreate}
        saving={create.isPending}
        error={saveError}
        saveLabel="Add"
      >
        <Stack gap="md">
          {team.length > 0 ? (
            <TeamLoginPicker
              logins={team}
              value={loginId}
              onChange={pickLogin}
              disabled={create.isPending}
            />
          ) : null}
          <EmployeeForm
            value={form}
            onChange={setForm}
            errors={errors}
            creating
            withSalaries={withSalaries}
            disabled={create.isPending}
          />
        </Stack>
      </EditModal>
    </Stack>
  );
}
