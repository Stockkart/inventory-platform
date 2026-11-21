// Behaviour tests for the HR ui-kit widgets (ui-kit itself has no Vitest target, so they run here
// against the public `@inventory-platform/ui-kit` barrel, exactly as HR pages consume them).
import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  AttendanceCell,
  CalendarMonthGrid,
  DateStepper,
  MonthPicker,
  PermissionGrid,
  buildMonthWeeks,
} from '@inventory-platform/ui-kit';

function ControlledMonthPicker(props: { initial: string; min?: string; max?: string }) {
  const [value, setValue] = useState(props.initial);
  return (
    <MonthPicker
      label="Pay month"
      value={value}
      min={props.min}
      max={props.max}
      onChange={setValue}
    />
  );
}

describe('MonthPicker', () => {
  it('steps months with previous / next and rolls over the year', async () => {
    const user = userEvent.setup();
    render(<ControlledMonthPicker initial="2026-12" />);
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('button', { name: /Pay month: January 2027/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('button', { name: /Pay month: November 2026/ })).toBeInTheDocument();
  });

  it('opens a 12-month grid and picks a month with the mouse', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MonthPicker label="Pay month" value="2026-10" onChange={onChange} />);
    const trigger = screen.getByRole('button', { name: /Pay month: October 2026/ });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByRole('button', { name: /^[A-Z][a-z]+ 2026$/ })).toHaveLength(12);
    expect(within(dialog).getByRole('button', { name: 'October 2026' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(within(dialog).getByRole('button', { name: 'March 2026' }));
    expect(onChange).toHaveBeenCalledWith('2026-03');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is keyboard operable: arrows move, Enter picks, Escape closes back to the button', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MonthPicker label="Pay month" value="2026-12" onChange={onChange} />);
    const trigger = screen.getByRole('button', { name: /Pay month: December 2026/ });
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'December 2026' })).toHaveFocus();

    // Past December the focus rolls into January of the next year.
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'January 2027' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('2027-01');
    expect(trigger).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('disables months outside min / max', async () => {
    const user = userEvent.setup();
    render(<ControlledMonthPicker initial="2026-10" min="2026-03" max="2026-10" />);
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Pay month: October 2026/ }));
    expect(screen.getByRole('button', { name: 'November 2026' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'February 2026' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'March 2026' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next year' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous year' })).toBeDisabled();
  });
});

describe('CalendarMonthGrid', () => {
  it('starts weeks on Monday with leading and trailing blanks', () => {
    // 1 Oct 2026 is a Thursday: 3 blanks before, 31 days, 1 blank after = 5 full weeks.
    const weeks = buildMonthWeeks('2026-10');
    expect(weeks).toHaveLength(5);
    expect(weeks[0].slice(0, 3)).toEqual([null, null, null]);
    expect(weeks[0][3]).toEqual({ date: '2026-10-01', dayOfMonth: 1, weekday: 4 });
    expect(weeks[4][5]?.date).toBe('2026-10-31');
    expect(weeks[4][6]).toBeNull();
    // February 2027 starts on a Monday and has 28 days: exactly 4 weeks, no blanks.
    expect(buildMonthWeeks('2027-02').flat().every(Boolean)).toBe(true);
    expect(buildMonthWeeks('2027-02')).toHaveLength(4);
    // A Sunday start (Feb 2026) needs 6 leading blanks.
    expect(buildMonthWeeks('2026-02')[0].filter((d) => d === null)).toHaveLength(6);
  });

  it('renders 7 weekday headers and calls renderDay once per day', () => {
    const renderDay = vi.fn(({ dayOfMonth }: { dayOfMonth: number }) => `d${dayOfMonth}`);
    render(<CalendarMonthGrid month="2026-10" renderDay={renderDay} />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ]);
    expect(renderDay).toHaveBeenCalledTimes(31);
    expect(screen.getByRole('table', { name: 'October 2026' })).toBeInTheDocument();
    expect(screen.getByText('d31')).toBeInTheDocument();
  });
});

describe('AttendanceCell', () => {
  it('speaks the full status word, context and lateness', () => {
    render(<AttendanceCell status="HALF_DAY" late context="12 October" />);
    expect(screen.getByRole('img', { name: '12 October: Half-day, late' })).toHaveTextContent('H');
  });
});

describe('DateStepper', () => {
  it('moves a day at a time, jumps to today and respects max', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <DateStepper value="2026-03-01" today="2026-03-05" max="2026-03-05" onChange={onChange} />,
    );
    await user.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-02-28');
    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(onChange).toHaveBeenLastCalledWith('2026-03-05');

    rerender(
      <DateStepper value="2026-03-05" today="2026-03-05" max="2026-03-05" onChange={onChange} />,
    );
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Today' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-01-15' } });
    expect(onChange).toHaveBeenLastCalledWith('2026-01-15');
  });
});

describe('PermissionGrid', () => {
  const roles = [
    { id: 'MANAGER', label: 'Manager' },
    { id: 'CASHIER', label: 'Cashier' },
  ] as const;
  const permissions = [
    { id: 'VIEW_SALARIES', label: 'See salaries' },
    { id: 'RUN_PAYROLL', label: 'Run payroll' },
  ] as const;

  it('uses th headers for rows and columns and names each box by permission and role', () => {
    render(
      <PermissionGrid
        caption="Who can do what"
        roles={roles}
        permissions={permissions}
        value={{ MANAGER: ['VIEW_SALARIES'] }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('table', { name: 'Who can do what' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Permission',
      'Manager',
      'Cashier',
    ]);
    expect(screen.getAllByRole('rowheader').map((h) => h.textContent)).toEqual([
      'See salaries',
      'Run payroll',
    ]);
    expect(screen.getByRole('checkbox', { name: 'See salaries, Manager' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'See salaries, Cashier' })).not.toBeChecked();
  });

  it('reports (role, permission, checked) and honours disabled cells', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PermissionGrid
        caption="Who can do what"
        roles={roles}
        permissions={permissions}
        value={{ MANAGER: ['VIEW_SALARIES'] }}
        isCellDisabled={(role, permission) => role === 'CASHIER' && permission === 'RUN_PAYROLL'}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('checkbox', { name: 'Run payroll, Manager' }));
    expect(onChange).toHaveBeenCalledWith('MANAGER', 'RUN_PAYROLL', true);
    await user.click(screen.getByRole('checkbox', { name: 'See salaries, Manager' }));
    expect(onChange).toHaveBeenLastCalledWith('MANAGER', 'VIEW_SALARIES', false);

    const locked = screen.getByRole('checkbox', { name: 'Run payroll, Cashier' });
    expect(locked).toBeDisabled();
    await user.click(locked);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('locks every box when the whole grid is disabled', () => {
    render(
      <PermissionGrid
        caption="Who can do what"
        roles={roles}
        permissions={permissions}
        value={{}}
        disabled
        onChange={vi.fn()}
      />,
    );
    screen.getAllByRole('checkbox').forEach((box) => expect(box).toBeDisabled());
  });
});
