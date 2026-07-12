import React, { useEffect } from 'react';
import type { Preview, Decorator } from '@storybook/react';
import { Box } from '../src/layout/Box';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import type { ThemeMode } from '../src/theme/types';
import '../src/theme/tokens.css';
import styles from './preview.module.css';

function ThemeSync({ mode }: { mode: 'light' | 'dark' }) {
  const { setMode } = useTheme();
  useEffect(() => {
    setMode(mode);
  }, [mode, setMode]);
  return null;
}

const withTheme: Decorator = (Story, context) => {
  const mode = (context.globals.theme as ThemeMode) || 'light';
  const resolved = mode === 'dark' ? 'dark' : 'light';

  return (
    <ThemeProvider defaultMode={resolved}>
      <ThemeSync mode={resolved} />
      <Box padding="lg" minHeight="screen" bg="canvas" className={styles.frame}>
        <Story />
      </Box>
    </ThemeProvider>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Light / dark design tokens',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  parameters: {
    layout: 'padded',
    backgrounds: { disable: true },
    controls: {
      expanded: true,
      sort: 'requiredFirst',
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      toc: true,
      codePanel: {
        type: 'auto',
      },
    },
    options: {
      storySort: {
        order: [
          'Introduction',
          'Theme',
          'Layout',
          'Forms',
          'Feedback',
          'Overlay',
          'Data display',
          'Patterns',
          'Icons',
        ],
      },
    },
    a11y: {
      test: 'todo',
    },
  },
  tags: ['autodocs'],
};

export default preview;
