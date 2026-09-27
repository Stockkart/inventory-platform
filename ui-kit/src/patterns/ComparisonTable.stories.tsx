import type { Meta, StoryObj } from '@storybook/react';
import { ComparisonTable, type ComparisonColumn, type ComparisonRow } from './ComparisonTable';
import { Box } from '../layout';

const meta: Meta<typeof ComparisonTable> = {
  title: 'Patterns/Comparison table',
  component: ComparisonTable,
};

export default meta;

const columns: ComparisonColumn[] = [
  { key: 'starter', header: 'Starter' },
  { key: 'pro', header: 'Professional', highlighted: true },
  { key: 'ent', header: 'Enterprise' },
];

const rows: ComparisonRow[] = [
  {
    key: 'price',
    label: 'Price per year',
    cells: { starter: '₹4,999', pro: '₹9,999', ent: '₹19,999' },
  },
  { key: 'users', label: 'Users', cells: { starter: '2', pro: '5', ent: 'Unlimited' } },
  { key: 'sms', label: 'SMS per month', cells: { starter: '100', pro: '500', ent: 'Unlimited' } },
  { key: 'acct', label: 'Accounting', cells: { starter: '—', pro: '✓', ent: '✓' } },
  { key: 'salary', label: 'Salary', cells: { starter: '—', pro: '—', ent: '✓' } },
];

export const ThreePlans: StoryObj<typeof ComparisonTable> = {
  args: { caption: 'Compare plans', cornerLabel: 'Features', columns, rows },
};

/** Narrow container: the feature labels stay pinned while the plan columns scroll. */
export const NarrowScroll: StoryObj<typeof ComparisonTable> = {
  render: (args) => (
    <Box style={{ maxWidth: 360 }}>
      <ComparisonTable {...args} />
    </Box>
  ),
  args: { caption: 'Compare plans', cornerLabel: 'Features', columns, rows },
};
