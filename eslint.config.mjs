import nx from '@nx/eslint-plugin';

const bannedNativeHtmlTags = [
  'div',
  'span',
  'p',
  'button',
  'input',
  'select',
  'textarea',
  'table',
  'form',
  'label',
  'a',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
];

const uiKitNativeHtmlBanGlobs = [
  'core/*/src/pages/**/*.{ts,tsx,js,jsx}',
  'core/*/src/ui/**/*.{ts,tsx,js,jsx}',
  'core/user/src/journey/**/*.{ts,tsx,js,jsx}',
  'platform/shell/src/**/*.{ts,tsx,js,jsx}',
  'platform/schema/src/lib/**/*.{ts,tsx,js,jsx}',
  'platform/routing/src/lib/**/*.{ts,tsx,js,jsx}',
  'plugins/*/src/pages/**/*.{ts,tsx,js,jsx}',
  'plugins/*/src/ui/**/*.{ts,tsx,js,jsx}',
];

const bannedNativeHtmlSyntaxRules = bannedNativeHtmlTags.map((tag) => ({
  selector: `JSXOpeningElement[name.name="${tag}"]`,
  message: `Use @inventory-platform/ui-kit primitives instead of native <${tag}>.`,
}));

/** Patterns relative to each package eslint.config.mjs (nx run <project>:lint). */
export const domainUiKitHtmlBan = {
  files: [
    'src/pages/**/*.{ts,tsx,js,jsx}',
    'src/ui/**/*.{ts,tsx,js,jsx}',
    'src/journey/**/*.{ts,tsx,js,jsx}',
    'src/lib/**/*.{ts,tsx,js,jsx}',
    'src/guards/**/*.{ts,tsx,js,jsx}',
  ],
  rules: {
    'no-restricted-syntax': ['error', ...bannedNativeHtmlSyntaxRules],
  },
};

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/build',
      '**/storybook-static',
      '**/coverage',
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
                'type:ui-kit',
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
  {
    files: uiKitNativeHtmlBanGlobs,
    rules: {
      'no-restricted-syntax': ['error', ...bannedNativeHtmlSyntaxRules],
    },
  },
];
