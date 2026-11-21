import { useState } from 'react';
import { ChoiceList, FilterDropdown, SearchInput, Stack, Text } from '@inventory-platform/ui-kit';

export interface EmployeePickerOption {
  employeeId: string;
  code: string;
  name: string;
}

export interface EmployeePickerProps {
  value: string;
  employees: readonly EmployeePickerOption[];
  onChange: (employeeId: string) => void;
  disabled?: boolean;
}

/** Shown at most at once; typing narrows the list (registers can hold up to 1,000 people). */
const MAX_SHOWN = 50;

/** App dropdown (R13.4) to choose one employee, with a search box over name and code. */
export function EmployeePicker({ value, employees, onChange, disabled }: EmployeePickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const matches = needle
    ? employees.filter(
        (e) => e.name.toLowerCase().includes(needle) || e.code.toLowerCase().includes(needle),
      )
    : employees;
  const shown = matches.slice(0, MAX_SHOWN);
  const current = employees.find((e) => e.employeeId === value);

  return (
    <FilterDropdown
      label="Employee"
      value={current ? current.name : 'Choose'}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQ('');
      }}
      disabled={disabled}
      wide
    >
      <Stack gap="sm">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Name or code"
          aria-label="Find an employee"
        />
        {shown.length === 0 ? (
          <Text variant="caption" color="muted">
            No employee matches “{q}”.
          </Text>
        ) : (
          <ChoiceList
            aria-label="Employee"
            options={shown.map((e) => ({ value: e.employeeId, label: e.name, hint: e.code }))}
            value={value}
            onChange={(v) => {
              setOpen(false);
              setQ('');
              onChange(v);
            }}
          />
        )}
        {matches.length > shown.length ? (
          <Text variant="caption" color="muted">
            Showing {shown.length} of {matches.length}. Type to narrow the list.
          </Text>
        ) : null}
      </Stack>
    </FilterDropdown>
  );
}
