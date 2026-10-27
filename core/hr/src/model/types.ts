/**
 * HR DTO types. The permission model is owned by `@inventory-platform/access` (it is part of
 * `/shops/me/access`); it is re-exported here so HR code has a single `/types` entry point.
 * Endpoint DTOs are added by task 13.2 (`settings.types.ts`, `employee.types.ts`; attendance, leave,
 * advances, payroll and self-service DTOs follow with their runs).
 */
export type { HrAccess, HrPermission } from '@inventory-platform/access';
export { HR_PERMISSIONS } from '@inventory-platform/access';
