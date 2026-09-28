/** Route files under `src/`, composed into the admin app by the plugin registry. */
export const ADMIN_ROUTE_FILES = {
  login: 'routes/login.tsx',
  changePassword: 'routes/change-password.tsx',
  layout: 'routes/layout.tsx',
  home: 'routes/home.tsx',
  admins: 'routes/admins.tsx',
} as const;
