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
            '@inventory-platform/api',
            '@inventory-platform/types',
          ],
          depConstraints: [
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:app',
                'type:platform',
                'type:core',
                'type:plugin',
                'type:journey',
                'type:legacy',
              ],
            },
            {
              sourceTag: 'type:platform',
              onlyDependOnLibsWithTags: ['type:platform', 'type:legacy'],
            },
            {
              sourceTag: 'type:core',
              onlyDependOnLibsWithTags: [
                'type:platform',
                'type:core',
                'type:legacy',
              ],
            },
            {
              sourceTag: 'type:plugin',
              onlyDependOnLibsWithTags: [
                'type:platform',
                'type:core',
                'type:plugin',
                'type:legacy',
              ],
            },
            {
              sourceTag: 'type:legacy',
              onlyDependOnLibsWithTags: ['type:legacy', 'type:platform'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    rules: {},
  },
];
