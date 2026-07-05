import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/build',
      '**/.react-router',
      '**/vite.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [
            '^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$',
          ],
          depConstraints: [
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:app',
                'type:platform',
                'type:plugin',
              ],
            },
            {
              sourceTag: 'type:platform',
              onlyDependOnLibsWithTags: [
                'type:platform',
                'type:plugin',
                'type:core',
                'type:ui-kit',
              ],
            },
            {
              sourceTag: 'type:ui-kit',
              onlyDependOnLibsWithTags: ['type:ui-kit'],
            },
            {
              sourceTag: 'type:core',
              onlyDependOnLibsWithTags: [
                'type:platform',
                'type:core',
                'type:ui-kit',
              ],
            },
            {
              sourceTag: 'type:plugin',
              onlyDependOnLibsWithTags: [
                'type:platform',
                'type:core',
                'type:plugin',
              ],
            },
            {
              sourceTag: 'type:journey',
              onlyDependOnLibsWithTags: [
                'type:platform',
                'type:core',
                'type:journey',
                'type:ui-kit',
              ],
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/inventory/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@inventory-platform/*/api', '@inventory-platform/*/ui', '@inventory-platform/*/pages/*'],
              message:
                'App shell must compose routes only — import from @inventory-platform/plugin-registry/routes, @inventory-platform/shell, @inventory-platform/query, or @inventory-platform/session.',
            },
            {
              group: [
                '@inventory-platform/accounting',
                '@inventory-platform/analytics',
                '@inventory-platform/credit',
                '@inventory-platform/plan',
                '@inventory-platform/pricing',
                '@inventory-platform/product',
                '@inventory-platform/reminders',
                '@inventory-platform/taxation',
                '@inventory-platform/user',
                '@inventory-platform/plugin-cafe',
              ],
              message:
                'App shell must not import domain packages directly — use @inventory-platform/plugin-registry/routes.',
            },
          ],
        },
      ],
    },
  },
];
