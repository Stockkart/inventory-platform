import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './Modal';
import { Button } from '../forms/Button';
import { Text, Stack } from '../layout';
import { FormField } from '../forms/FormField';

const meta: Meta<typeof Modal> = {
  title: 'Overlay/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Dialog overlay. Toggle `open` and `size` from Controls on the Playground story.',
      },
    },
  },
  argTypes: {
    open: { control: 'boolean' },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg', 'full'],
    },
    onClose: { action: 'closed', table: { disable: true } },
  },
  args: {
    open: true,
    size: 'md',
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Playground: Story = {
  render: function PlaygroundStory(args) {
    const [open, setOpen] = useState(args.open ?? true);
    return (
      <Stack gap="md">
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        <Modal
          {...args}
          open={open}
          onClose={() => {
            setOpen(false);
            args.onClose?.();
          }}
        >
          <Modal.Header
            title="Edit vendor"
            onClose={() => {
              setOpen(false);
              args.onClose?.();
            }}
          />
          <Modal.Body>
            <Stack gap="md">
              <Text color="secondary">Change size / open in Controls, then re-open.</Text>
              <FormField label="Vendor name" value="Acme Supplies" onChange={() => undefined} />
            </Stack>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                args.onClose?.();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              onClick={() => {
                setOpen(false);
                args.onClose?.();
              }}
            >
              Save
            </Button>
          </Modal.Footer>
        </Modal>
      </Stack>
    );
  },
};
