import nx from '@nx/eslint-plugin';
import baseConfig, { domainUiKitHtmlBan } from '../../eslint.config.mjs';

export default [
  // Tooling configs (not source): they import the shared alias helper by relative path,
  // which @nx/enforce-module-boundaries would otherwise flag, same as vite.config.mts in apps.
  { ignores: ['vitest.config.ts', 'vitest.setup.ts'] },
  ...baseConfig,
  ...nx.configs['flat/react'],
  domainUiKitHtmlBan,
];
