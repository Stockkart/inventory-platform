import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Drawer, Modal } from './Modal';
import { Button } from '../forms/Button';
import { Box, Inline, Text, Stack } from '../layout';
import { Avatar } from '../feedback/Avatar';
import { Badge } from '../feedback/Badge';
import { IconButton } from '../forms/IconButton';
import { hrChrome } from '../patterns/HrChrome';
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

/**
 * `Drawer size="lg"` (480 px, full width below that) with the HR join-request layout: header,
 * scrolling sections and a sticky footer, all from `hrChrome` classes.
 */
export const DrawerLarge: Story = {
  parameters: { layout: 'fullscreen' },
  render: function DrawerLargeStory() {
    const [open, setOpen] = useState(true);
    return (
      <Box padding="lg">
        <Button onClick={() => setOpen(true)}>Open drawer</Button>
        <Drawer open={open} onClose={() => setOpen(false)} side="right" size="lg">
          <Box className={hrChrome.hrJoinDrawer}>
            <Box as="header" className={hrChrome.hrJoinDrawerHeader}>
              <Avatar name="Priya Sharma" className={hrChrome.hrJoinDrawerAvatar} />
              <Box className={hrChrome.hrJoinDrawerTitle}>
                <Text variant="heading4" as="h2">
                  Priya Sharma
                </Text>
                <Inline gap="sm" flexWrap>
                  <Badge>Pending</Badge>
                  <Text variant="caption" color="secondary">
                    2 h ago
                  </Text>
                </Inline>
              </Box>
              <IconButton label="Close" onClick={() => setOpen(false)}>
                ×
              </IconButton>
            </Box>
            <Box className={hrChrome.hrJoinDrawerBody}>
              <Box as="section" className={hrChrome.hrJoinDrawerSection}>
                <Text variant="overline" color="muted">
                  Contact
                </Text>
                <Box className={hrChrome.hrJoinDrawerRow}>
                  <Text>9876543210</Text>
                  <IconButton label="Copy phone" size="sm">
                    ⧉
                  </IconButton>
                </Box>
              </Box>
              <Box as="section" className={hrChrome.hrJoinMatchCard}>
                <Text weight="semibold">Possible match</Text>
                <Text>EMP-014 Ravi</Text>
                <Box className={hrChrome.hrJoinMatchCardActions}>
                  <Button variant="solid">Link to existing</Button>
                  <Button variant="outline">Create new</Button>
                </Box>
              </Box>
            </Box>
            <Box as="footer" className={hrChrome.hrJoinDrawerFooter}>
              <Button variant="outline">Reject</Button>
            </Box>
          </Box>
        </Drawer>
      </Box>
    );
  },
};
