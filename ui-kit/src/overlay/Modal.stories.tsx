import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './Modal';
import { Button } from '../forms/Button';
import { Text } from '../layout/Text';

const meta: Meta = {
  title: 'Overlay/Modal',
};

export default meta;

export const Basic: StoryObj = {
  render: function ModalStory() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        <Modal open={open} onClose={() => setOpen(false)} size="md">
          <Modal.Header title="Edit vendor" onClose={() => setOpen(false)} />
          <Modal.Body>
            <Text>Modal body content goes here.</Text>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="solid" onClick={() => setOpen(false)}>
              Save
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  },
};
