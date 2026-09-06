import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CalculatorPanel } from './CalculatorPanel';
import type { FloatingPanelPosition } from '../overlay/FloatingPanel';
import { Box, Inline, Stack, Text } from '../layout';
import { Button, Input } from '../forms';

const meta: Meta = {
  title: 'Patterns/CalculatorPanel',
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
};

export default meta;

function Demo({ withTape = false }: { withTape?: boolean }) {
  const [open, setOpen] = useState(true);
  const [position, setPosition] = useState<FloatingPanelPosition | null>(null);

  return (
    <Box padding="lg" style={{ minHeight: '100vh' }}>
      <Stack gap="md" style={{ maxWidth: 460 }}>
        <Text variant="heading3">Page underneath</Text>
        <Text color="muted">
          The panel is not modal. This field stays focusable and typable while the calculator is
          open — digits typed here go to the field, not the calculator.
        </Text>
        <Input placeholder="Selling price" />
        <Inline gap="sm">
          <Button onClick={() => setOpen((value) => !value)}>
            {open ? 'Hide' : 'Show'} calculator
          </Button>
          <Button variant="ghost" onClick={() => setPosition(null)}>
            Reset position
          </Button>
        </Inline>
        <Text variant="caption" color="muted">
          Position: {position ? `${Math.round(position.x)}, ${Math.round(position.y)}` : 'default'}
        </Text>
      </Stack>

      <CalculatorPanel
        open={open}
        onClose={() => setOpen(false)}
        position={position}
        onPositionChange={setPosition}
        initialMemory={withTape ? 250 : 0}
        initialTape={
          withTape
            ? [
                { id: 't3', expression: '1,200 × 3', result: '3,600' },
                { id: 't2', expression: '450 + 75 =', result: '525' },
                { id: 't1', expression: '99 ÷ 4 =', result: '24.75' },
              ]
            : undefined
        }
      />
    </Box>
  );
}

export const Default: StoryObj = { render: () => <Demo /> };
export const WithTapeAndMemory: StoryObj = { render: () => <Demo withTape /> };
