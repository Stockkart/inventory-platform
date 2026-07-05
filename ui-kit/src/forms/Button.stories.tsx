import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { Inline } from '../layout/Stack';

const meta: Meta<typeof Button> = {
  title: 'Forms/Button',
  component: Button,
  args: {
    children: 'Button',
    variant: 'solid',
    size: 'md',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Solid: Story = {};

export const Outline: Story = {
  args: { variant: 'outline' },
};

export const Ghost: Story = {
  args: { variant: 'ghost' },
};

export const Danger: Story = {
  args: { variant: 'danger', children: 'Delete' },
};

export const Loading: Story = {
  args: { loading: true, children: 'Saving…' },
};

export const Sizes: Story = {
  render: () => (
    <Inline gap="sm">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </Inline>
  ),
};
