import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';
import { Inline } from '../layout';

const meta: Meta<typeof Badge> = {
  title: 'Feedback/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Compact status chip for tables, cards, and filters.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'success', 'warning', 'danger', 'info'],
      table: { defaultValue: { summary: 'neutral' } },
    },
    children: { control: 'text' },
  },
  args: {
    variant: 'success',
    children: 'Active',
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Playground: Story = {};

export const AllVariants: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <Inline gap="sm" flexWrap>
      <Badge variant="neutral">Neutral</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
    </Inline>
  ),
};
