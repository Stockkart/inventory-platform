import type { Meta, StoryObj } from '@storybook/react';
import { AttendanceCell, ATTENDANCE_STATUS_META, type AttendanceStatus } from './AttendanceCell';
import { hrChrome } from './HrChrome';

const meta: Meta<typeof AttendanceCell> = {
  title: 'Patterns/AttendanceCell',
  component: AttendanceCell,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'One attendance mark: a letter on the status colour (`--sk-attendance-*` tokens), a red dot when late. Screen readers hear the full word, e.g. "12 October: Present, late".',
      },
    },
  },
  argTypes: {
    status: { control: 'inline-radio', options: Object.keys(ATTENDANCE_STATUS_META) },
  },
  args: {
    status: 'PRESENT',
    late: false,
    size: 'md',
    context: '12 October',
  },
};

export default meta;
type Story = StoryObj<typeof AttendanceCell>;

export const AllStatuses: Story = {
  render: function AllStatusesStory(args) {
    const statuses = Object.keys(ATTENDANCE_STATUS_META) as AttendanceStatus[];
    return (
      <span className={hrChrome.hrLegend}>
        <span className={hrChrome.hrLegendItem}>
          <AttendanceCell {...args} />
          Playground
        </span>
        {statuses.map((status) => (
          <span key={status} className={hrChrome.hrLegendItem}>
            <AttendanceCell status={status} size={args.size} />
            {ATTENDANCE_STATUS_META[status].word}
          </span>
        ))}
        <span className={hrChrome.hrLegendItem}>
          <AttendanceCell status="PRESENT" late size={args.size} />
          Present, late
        </span>
      </span>
    );
  },
};
