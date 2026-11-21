import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CalculatorPanel, type CalculatorKey, type CalculatorTapeRow } from './CalculatorPanel';
import type { FloatingPanelPosition } from '../overlay/FloatingPanel';
import { Box, Inline, Stack, Text } from '../layout';
import { Button, Input } from '../forms';

const meta: Meta = {
  title: 'Patterns/CalculatorPanel',
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
};

export default meta;

const SAMPLE_TAPE: CalculatorTapeRow[] = [
  { id: 't3', expression: '1,200 × 3', result: '3,600' },
  { id: 't2', expression: '450 + 75 =', result: '525' },
  { id: 't1', expression: '99 ÷ 4 =', result: '24.75' },
];

interface DemoProps {
  withTape?: boolean;
  error?: boolean;
}

/**
 * The panel is presentation only: the arithmetic lives in the app shell. This demo
 * just echoes the keys it receives, to show the layout and the key events.
 */
function Demo({ withTape = false, error = false }: DemoProps) {
  const [open, setOpen] = useState(true);
  const [position, setPosition] = useState<FloatingPanelPosition | null>(null);
  const [keys, setKeys] = useState<CalculatorKey[]>([]);
  const [tape, setTape] = useState<CalculatorTapeRow[]>(withTape ? SAMPLE_TAPE : []);

  const onKey = (key: CalculatorKey) =>
    setKeys((current) => (key === 'AC' ? [] : [...current, key].slice(-12)));

  return (
    <Box padding="lg" minHeight="screen">
      <Stack gap="md" maxWidth="sm">
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
          Keys received: {keys.length ? keys.join(' ') : 'none'}
        </Text>
      </Stack>

      <CalculatorPanel
        open={open}
        onClose={() => setOpen(false)}
        position={position}
        onPositionChange={setPosition}
        display={error ? 'Cannot divide by zero' : keys.join('') || '0'}
        error={error}
        pending={withTape ? '1,200 ×' : ''}
        memory={withTape ? '250' : null}
        tape={tape}
        onKey={onKey}
        onRecallTape={(row) => setKeys([...row.result.replace(/,/g, '')] as CalculatorKey[])}
        onClearTape={() => setTape([])}
      />
    </Box>
  );
}

export const Default: StoryObj = { render: () => <Demo /> };
export const WithTapeAndMemory: StoryObj = { render: () => <Demo withTape /> };
export const DivideByZero: StoryObj = { render: () => <Demo error /> };
