import React from 'react';
import type { Preview } from '@storybook/react';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import '../src/theme/tokens.css';

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider defaultMode="light">
        <div style={{ padding: '1.5rem', minHeight: '100vh' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
  },
  tags: ['autodocs'],
};

export default preview;
