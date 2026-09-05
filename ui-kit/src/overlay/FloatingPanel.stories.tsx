import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FloatingPanel, type FloatingPanelPosition } from './FloatingPanel';
import { Box, Stack, Text } from '../layout';
import { Button, Input } from '../forms';

const meta: Meta = {
  title: 'Overlay/FloatingPanel',
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
};

export default meta;

function Demo({ withLongBody = false }: { withLongBody?: boolean }) {
  const [open, setOpen] = useState(true);
  const [position, setPosition] = useState<FloatingPanelPosition | null>(null);

  return (
    <Box padding="lg" style={{ minHeight: '100vh' }}>
      <Stack gap="md" style={{ maxWidth: 520 }}>
        <Text variant="heading3">The page keeps working</Text>
        <Text color="muted">
          Unlike <code>Modal</code>, a floating panel has no backdrop, traps no focus and does not
          lock scrolling. Everything below stays clickable and typable while it is open — which is
          the whole reason it exists.
        </Text>
        <Input placeholder="Type here with the panel open" />
        <Stack direction="row" gap="sm">
          <Button onClick={() => setOpen((value) => !value)}>{open ? 'Hide' : 'Show'} panel</Button>
          <Button variant="ghost" onClick={() => setPosition(null)}>
            Reset position
          </Button>
        </Stack>
        <Text variant="caption" color="muted">
          Drag the title bar, or focus it and use the arrow keys (Shift for fine steps, Home to
          re-dock). Drop it past an edge and it clamps back; resize the window and it clamps again.
        </Text>
        <Text variant="caption" color="muted">
          Position: {position ? `${Math.round(position.x)}, ${Math.round(position.y)}` : 'default'}
        </Text>
      </Stack>

      <FloatingPanel
        open={open}
        title="Panel"
        onClose={() => setOpen(false)}
        position={position}
        onPositionChange={setPosition}
      >
        <Box padding="md">
          <Stack gap="sm">
            <Text variant="caption">
              Panel content. Escape closes it, but only while focus is inside — Escape elsewhere on
              the page belongs to the page.
            </Text>
            {withLongBody
              ? Array.from({ length: 12 }, (_, i) => (
                  <Text key={i} variant="caption" color="muted">
                    Row {i + 1} — the body scrolls once the panel hits its height cap.
                  </Text>
                ))
              : null}
          </Stack>
        </Box>
      </FloatingPanel>
    </Box>
  );
}

export const Default: StoryObj = { render: () => <Demo /> };
export const ScrollingBody: StoryObj = { render: () => <Demo withLongBody /> };
