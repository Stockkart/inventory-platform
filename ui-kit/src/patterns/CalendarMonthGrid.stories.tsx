import type { Meta, StoryObj } from '@storybook/react';
import { CalendarMonthGrid } from './CalendarMonthGrid';
import { AttendanceCell, type AttendanceStatus } from './AttendanceCell';
import { hrChrome } from './HrChrome';

const meta: Meta<typeof CalendarMonthGrid> = {
  title: 'Patterns/CalendarMonthGrid',
  component: CalendarMonthGrid,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Seven-column month calendar, weeks start on Monday, blank cells before the 1st and after the last day. `renderDay` draws each day — here a day number and an `AttendanceCell` laid out with `hrChrome.hrCalendarDay`.',
      },
    },
  },
  args: {
    month: '2026-10',
    showCaption: true,
  },
};

export default meta;
type Story = StoryObj<typeof CalendarMonthGrid>;

/** Sample statuses: Sundays off, a holiday on the 2nd, a leave day, unmarked future days. */
function sampleStatus(dayOfMonth: number, weekday: number): AttendanceStatus {
  if (weekday === 7) return 'WEEK_OFF';
  if (dayOfMonth === 2) return 'HOLIDAY';
  if (dayOfMonth === 14) return 'LEAVE';
  if (dayOfMonth === 9) return 'ABSENT';
  if (dayOfMonth === 16) return 'HALF_DAY';
  if (dayOfMonth > 24) return 'UNMARKED';
  return 'PRESENT';
}

export const AttendanceMonth: Story = {
  render: function AttendanceMonthStory(args) {
    return (
      <CalendarMonthGrid
        {...args}
        renderDay={(day) => (
          <span className={hrChrome.hrCalendarDay}>
            <span className={hrChrome.hrCalendarDayNumber} aria-hidden="true">
              {day.dayOfMonth}
            </span>
            <AttendanceCell
              size="sm"
              status={sampleStatus(day.dayOfMonth, day.weekday)}
              late={day.dayOfMonth === 6}
              context={`${day.dayOfMonth} October`}
            />
          </span>
        )}
      />
    );
  },
};
