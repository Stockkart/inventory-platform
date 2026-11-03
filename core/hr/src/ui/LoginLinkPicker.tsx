import { useState } from 'react';
import { ChoiceList, FilterDropdown } from '@inventory-platform/ui-kit';
import type { LinkableLoginResponse } from '@inventory-platform/hr/types';

const NOT_LINKED = '';

function roleLabel(role: string | null | undefined) {
  if (!role) return undefined;
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export interface LoginLinkPickerProps {
  employeeId: string;
  /** Currently linked login, or null. */
  value: string | null;
  logins: readonly LinkableLoginResponse[];
  onChange: (userId: string | null) => void;
  /** Signed-in user's own login: only the owner may link it (run B5, the server says 403). */
  currentUserId?: string | null;
  isOwner?: boolean;
  disabled?: boolean;
}

/**
 * App dropdown (not a native select, R13.4) to link an employee to one of the shop's logins
 * (R4.6). Logins already linked to another employee are left out, since one login can be linked
 * to at most one employee per shop. The signed-in user's own login is left out unless they are
 * the owner, so a member cannot link themselves to an employee's pay data.
 */
export function LoginLinkPicker({
  employeeId,
  value,
  logins,
  onChange,
  currentUserId,
  isOwner = false,
  disabled,
}: LoginLinkPickerProps) {
  const [open, setOpen] = useState(false);
  const available = logins.filter(
    (l) =>
      (!l.linkedEmployeeId || l.linkedEmployeeId === employeeId || l.userId === value) &&
      (isOwner || !currentUserId || l.userId !== currentUserId || l.userId === value),
  );
  const options = [
    { value: NOT_LINKED, label: 'Not linked' },
    ...available.map((l) => ({
      value: l.userId,
      label: l.name || 'Unnamed login',
      hint: roleLabel(l.role),
    })),
  ];
  const current = value ? logins.find((l) => l.userId === value) : undefined;
  const shown = value ? current?.name ?? 'Linked login' : 'Not linked';

  return (
    <FilterDropdown
      label="Login"
      value={shown}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      panelTitle="Link to a login"
      wide
    >
      <ChoiceList
        aria-label="Link to a login"
        options={options}
        value={value ?? NOT_LINKED}
        onChange={(v) => {
          setOpen(false);
          const next = v === NOT_LINKED ? null : v;
          if (next !== value) onChange(next);
        }}
      />
    </FilterDropdown>
  );
}
