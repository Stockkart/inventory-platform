import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  Inline,
  PermissionGrid,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';
import { useNotify } from '@inventory-platform/session';
import {
  HR_GRID_ROLES,
  HR_GRID_ROLE_LABELS,
  HR_PERMISSIONS,
  HR_PERMISSION_LABELS,
  HR_PERMISSION_REQUIRES,
  lockedPermissions,
  togglePermission,
  type HrGridRole,
  type HrPermission,
  type HrRequiresMap,
  type HrRolePermissionsResponse,
} from '@inventory-platform/hr/types';
import { useHrRolePermissionsQuery, useUpdateHrRolePermissionsMutation } from '../queries/hooks';

type Rows = Partial<Record<HrGridRole, HrPermission[]>>;

const ROLE_COLUMNS = HR_GRID_ROLES.map((id) => ({ id, label: HR_GRID_ROLE_LABELS[id] }));

function rowsEqual(a: Rows, b: Rows) {
  return HR_GRID_ROLES.every((r) => (a[r] ?? []).join() === (b[r] ?? []).join());
}

/** "Needs View all attendance" style hint for permissions that depend on others. */
function permissionRows(requires: HrRequiresMap) {
  return HR_PERMISSIONS.map((id) => {
    const needs = requires[id] ?? [];
    return {
      id,
      label: HR_PERMISSION_LABELS[id],
      description: needs.length
        ? `Also gives ${needs.map((p) => HR_PERMISSION_LABELS[p].toLowerCase()).join(' and ')}`
        : undefined,
    };
  });
}

export interface HrPermissionGridEditorProps {
  value: Rows;
  requires: HrRequiresMap;
  onChange: (next: Rows) => void;
  disabled?: boolean;
}

/**
 * `PermissionGrid` with the backend's dependency rules (R1.3): ticking a permission also ticks
 * what it needs, and a needed permission is locked (ticked, greyed out) while something that needs
 * it is ticked in the same role.
 */
export function HrPermissionGridEditor({
  value,
  requires,
  onChange,
  disabled,
}: HrPermissionGridEditorProps) {
  const locked = useMemo(() => {
    const byRole = {} as Record<HrGridRole, Set<HrPermission>>;
    for (const role of HR_GRID_ROLES) byRole[role] = lockedPermissions(value[role] ?? [], requires);
    return byRole;
  }, [value, requires]);
  const rows = useMemo(() => permissionRows(requires), [requires]);

  return (
    <PermissionGrid<HrGridRole, HrPermission>
      caption="HR permissions by role"
      roles={ROLE_COLUMNS}
      permissions={rows}
      value={value}
      disabled={disabled}
      isCellDisabled={(role, permission) => locked[role].has(permission)}
      onChange={(role, permission, checked) =>
        onChange({
          ...value,
          [role]: togglePermission(
            value[role] ?? [],
            permission,
            checked,
            requires,
            HR_PERMISSIONS,
          ),
        })
      }
      rowHeaderLabel="Permission"
    />
  );
}

function rolesOf(data: HrRolePermissionsResponse | undefined): Rows {
  return { ...(data?.roles ?? {}) };
}

/** Owner-only card: who can do what in HR. Saving reloads the signed-in user's access. */
export function HrRolePermissionsCard() {
  const grid = useHrRolePermissionsQuery();
  const save = useUpdateHrRolePermissionsMutation();
  const [draft, setDraft] = useState<Rows>(() => rolesOf(grid.data));

  useEffect(() => {
    setDraft(rolesOf(grid.data));
  }, [grid.data]);

  // The server's map is the source of truth; the pinned copy only covers a missing map.
  const requires = grid.data?.requires ?? HR_PERMISSION_REQUIRES;
  const dirty = grid.data ? !rowsEqual(draft, rolesOf(grid.data)) : false;

  return (
    <Card>
      <CardBody>
        <Stack gap="md">
          <Stack gap="xs">
            <Text variant="heading4" as="h3">
              Who can do what in HR
            </Text>
            <Text variant="caption" color="muted">
              You, the owner, can always do everything. Changes apply the next time a person opens a
              page; nobody needs to sign in again. Anyone linked to an employee can always see their
              own attendance, leave and payslips.
            </Text>
          </Stack>

          {grid.isLoading ? <CenteredLoader label="Loading permissions…" /> : null}
          {grid.error ? <Alert variant="danger">{grid.error.message}</Alert> : null}
          {grid.data ? (
            <HrPermissionGridEditor
              value={draft}
              requires={requires}
              onChange={setDraft}
              disabled={save.isPending}
            />
          ) : null}

          {grid.data ? (
            <Inline gap="sm" justify="end">
              <Button
                type="button"
                variant="outline"
                disabled={!dirty || save.isPending}
                onClick={() => {
                  setDraft(rolesOf(grid.data));
                }}
              >
                Undo changes
              </Button>
              <Button
                type="button"
                variant="solid"
                disabled={!dirty}
                loading={save.isPending}
                onClick={() => {
                  save.mutate(
                    { roles: draft },
                    {
                      onSuccess: () => useNotify.success('HR permissions saved'),
                      onError: (err) =>
                        useNotify.error(err.message || 'Could not save HR permissions'),
                    },
                  );
                }}
              >
                Save permissions
              </Button>
            </Inline>
          ) : null}
        </Stack>
      </CardBody>
    </Card>
  );
}
