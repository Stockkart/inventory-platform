export const ADMIN_ENDPOINTS = {
  LOGIN: '/admin/auth/login',
  LOGOUT: '/admin/auth/logout',
  ME: '/admin/auth/me',
  CHANGE_PASSWORD: '/admin/auth/change-password',
  ADMINS: '/admin/admins',
  ADMIN_ACTIVE: (id: string) => `/admin/admins/${id}/active`,
  ADMIN_RESET_PASSWORD: (id: string) => `/admin/admins/${id}/reset-password`,
} as const;
