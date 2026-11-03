import { useState } from 'react';
import { ChoiceList, FilterDropdown, Stack, Text, hrChrome } from '@inventory-platform/ui-kit';
import type { LinkableLoginResponse } from '@inventory-platform/hr/types';

const NEW_PERSON = '';
const NEW_PERSON_LABEL = 'New person (no login)';

function roleLabel(role: string | null | undefined) {
  if (!role) return undefined;
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export interface TeamLoginPickerProps {
  /** Logins that may be picked (already filtered: unlinked, own login only for the owner). */
  logins: readonly LinkableLoginResponse[];
  /** Picked login, or null for a new person without a login. */
  value: string | null;
  onChange: (userId: string | null) => void;
  disabled?: boolean;
}

/**
 * "Add from your team" at the top of the Add employee form (run F9): an app dropdown (not a
 * native select) of the shop's logins that are not an employee yet. Picking one fills in the
 * details and creates the employee already linked to that login.
 */
export function TeamLoginPicker({ logins, value, onChange, disabled }: TeamLoginPickerProps) {
  const [open, setOpen] = useState(false);
  const options = [
    { value: NEW_PERSON, label: NEW_PERSON_LABEL },
    ...logins.map((l) => ({
      value: l.userId,
      label: l.name || 'Unnamed login',
      hint: roleLabel(l.role),
    })),
  ];
  const picked = value ? logins.find((l) => l.userId === value) : undefined;

  return (
    <Stack gap="xs" align="start">
      <FilterDropdown
        label="Add from your team"
        value={picked ? picked.name || 'Unnamed login' : NEW_PERSON_LABEL}
        open={open}
        onOpenChange={setOpen}
        disabled={disabled}
        panelTitle="Add from your team"
        wide
        className={hrChrome.hrTeamPicker}
      >
        <ChoiceList
          aria-label="Add from your team"
          options={options}
          value={value ?? NEW_PERSON}
          onChange={(v) => {
            setOpen(false);
            const next = v === NEW_PERSON ? null : v;
            if (next !== value) onChange(next);
          }}
        />
      </FilterDropdown>
      <Text variant="caption" color="muted">
        {picked
          ? 'Their login is linked, so they can see their own attendance, leave and payslips.'
          : 'Pick someone who already has a login to fill in their details and link it.'}
      </Text>
    </Stack>
  );
}
