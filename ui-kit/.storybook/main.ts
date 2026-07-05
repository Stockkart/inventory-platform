import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';
import react from '@vitejs/plugin-react';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  async viteFinal(config) {
    const existingReact = config.plugins?.some(
      (plugin) =>
        plugin &&
        typeof plugin === 'object' &&
        'name' in plugin &&
        plugin.name === 'vite:react-babel'
    );

    return mergeConfig(config, {
      esbuild: {
        ...config.esbuild,
        jsx: 'automatic',
      },
      plugins: existingReact ? [] : [react({ jsxRuntime: 'automatic' })],
    });
  },
};

export default config;
