// R1.3: the HR settings wrapper around ui-kit `PermissionGrid` auto-ticks and locks what a
// permission needs, using the backend `requires` map.
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { HrGridRole, HrPermission, HrRequiresMap } from '@inventory-platform/hr/types';
import { HrPermissionGridEditor } from './HrRolePermissionsCard';

const REQUIRES: HrRequiresMap = {
  MARK_ATTENDANCE: ['VIEW_ATTENDANCE'],
  APPROVE_LEAVE: ['VIEW_ATTENDANCE'],
  ADD_EDIT_EMPLOYEES: ['VIEW_EMPLOYEES'],
  RUN_PAYROLL: ['VIEW_SALARIES', 'VIEW_EMPLOYEES'],
};

type Rows = Partial<Record<HrGridRole, HrPermission[]>>;

function Harness({ initial }: { initial: Rows }) {
  const [value, setValue] = useState<Rows>(initial);
  return <HrPermissionGridEditor value={value} requires={REQUIRES} onChange={setValue} />;
}

const box = (permission: string, role: string) =>
  screen.getByRole('checkbox', { name: `${permission}, ${role}` });

describe('HrPermissionGridEditor', () => {
  it('ticking Run payroll ticks and locks View salaries and View employees for that role only', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ ADMIN: [], MANAGER: [], CASHIER: [] }} />);

    await user.click(box('Run payroll', 'Cashier'));

    expect(box('Run payroll', 'Cashier')).toBeChecked();
    expect(box('View salaries', 'Cashier')).toBeChecked();
    expect(box('View salaries', 'Cashier')).toBeDisabled();
    expect(box('View employees', 'Cashier')).toBeChecked();
    expect(box('View employees', 'Cashier')).toBeDisabled();
    // Other roles are untouched.
    expect(box('View salaries', 'Manager')).not.toBeChecked();
    expect(box('View salaries', 'Manager')).toBeEnabled();
  });

  it('unticking the dependant unlocks what it needed but leaves it ticked', async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ MANAGER: ['VIEW_ATTENDANCE', 'MARK_ATTENDANCE'] }} />);
    expect(box('View all attendance', 'Manager')).toBeDisabled();

    await user.click(box('Mark and fix attendance', 'Manager'));

    expect(box('Mark and fix attendance', 'Manager')).not.toBeChecked();
    expect(box('View all attendance', 'Manager')).toBeChecked();
    expect(box('View all attendance', 'Manager')).toBeEnabled();
  });

  it('describes dependencies in plain words', () => {
    render(<Harness initial={{}} />);
    // Mark and fix attendance and Approve leave both need View all attendance.
    expect(screen.getAllByText('Also gives view all attendance')).toHaveLength(2);
    expect(screen.getByText('Also gives view salaries and view employees')).toBeInTheDocument();
  });
});
