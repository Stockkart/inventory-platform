import type { Meta, StoryObj } from '@storybook/react';
import { ReasonDialog } from './ReasonDialog';

const meta: Meta<typeof ReasonDialog> = {
  title: 'Overlay/Reason dialog',
  component: ReasonDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Confirm an action that needs a written reason. Confirm stays disabled until a reason is typed.',
      },
    },
  },
  args: {
    open: true,
    title: 'Turn off this voucher?',
    message: 'Shops can no longer redeem it. Orders already placed keep their discount.',
    confirmLabel: 'Turn off',
    onConfirm: () => undefined,
    onClose: () => undefined,
  },
};

export default meta;
type Story = StoryObj<typeof ReasonDialog>;

export const Playground: Story = {};

export const Danger: Story = {
  args: { confirmVariant: 'danger', confirmLabel: 'Reject', title: 'Reject this referral?' },
};

export const WithError: Story = {
  args: { error: 'Could not save. Try again.' },
};

export const Busy: Story = {
  args: { busy: true },
};
