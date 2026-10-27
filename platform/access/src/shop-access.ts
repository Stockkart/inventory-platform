export type ProductSearchEditMode = 'FULL_EDIT' | 'PERMISSION_BASED';

export interface ShopAccessModules {
  accounting: boolean;
  analytics: boolean;
  mis: boolean;
  taxes: boolean;
  stockCorrection: boolean;
  marketing: boolean;
  paymentPlan: boolean;
  productSearchEdit: boolean;
  /** Module switch for the HR area (employees, attendance, leave, payroll). */
  hr: boolean;
}

/**
 * HR permissions, mirroring the backend `HrPermission` enum names exactly.
 * Kept as a runtime list too so UI (e.g. the permission grid) can iterate them in a stable order.
 */
export const HR_PERMISSIONS = [
  'VIEW_ATTENDANCE',
  'MARK_ATTENDANCE',
  'APPROVE_LEAVE',
  'VIEW_EMPLOYEES',
  'ADD_EDIT_EMPLOYEES',
  'VIEW_SALARIES',
  'RUN_PAYROLL',
  'RECORD_PAYMENTS',
  'MANAGE_ADVANCES',
  'MANAGE_SETTINGS',
  /** Self-service: "Check in" / "Check out" on My HR. Opens no HR staff screen. */
  'SELF_CHECK_IN',
] as const;

export type HrPermission = (typeof HR_PERMISSIONS)[number];

/** Effective HR access for the signed-in user in the active shop. */
export interface HrAccess {
  permissions: HrPermission[];
  /** Employee record linked to this login; `null` when the user is not an employee (no "My HR"). */
  employeeId: string | null;
}

export interface ShopStockCorrectionAccess {
  canCreate: boolean;
  canApprove: boolean;
}

export interface ShopProductSearchAccess {
  canView: boolean;
  canEdit: boolean;
  editMode: ProductSearchEditMode;
  canEditAll: boolean;
  editableFields: string[];
}

export interface ShopAccess {
  role: string;
  relationship: string | null;
  owner: boolean;
  canManageAccess: boolean;
  productSearch: ShopProductSearchAccess;
  stockCorrection: ShopStockCorrectionAccess;
  modules: ShopAccessModules;
  team: ShopAccessTeam;
  /** `null` when the HR module is off for this member. */
  hr: HrAccess | null;
}

export interface ShopAccessTeam {
  manageInvitations: boolean;
  manageJoinRequests: boolean;
  manageShopUsers: boolean;
  viewMyInvitations: boolean;
}

export interface MemberModulePermissions {
  accounting?: boolean;
  analytics?: boolean;
  mis?: boolean;
  taxes?: boolean;
  stockCorrection?: boolean;
  marketing?: boolean;
  paymentPlan?: boolean;
  productSearchEdit?: boolean;
  hr?: boolean;
}

export interface MemberPermissions {
  modules?: MemberModulePermissions;
  productSearchEditableFields?: string[];
}

export interface ShopMemberAccess {
  userId: string;
  name: string;
  email: string;
  role: string;
  relationship: string;
  active: boolean;
  joinedAt?: string;
  permissions?: MemberPermissions;
  effectiveAccess: ShopAccess;
}

export interface ShopRbacAdmin {
  productSearchEditMode: ProductSearchEditMode;
  members: ShopMemberAccess[];
}

export interface UpdateShopRbacPolicyRequest {
  productSearchEditMode: ProductSearchEditMode;
}

export interface UpdateMemberPermissionsRequest {
  modules?: MemberModulePermissions;
  productSearchEditableFields?: string[];
}
