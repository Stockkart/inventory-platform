export type ProductSearchEditMode = 'FULL_EDIT' | 'PERMISSION_BASED';

export interface ShopAccessModules {
  accounting: boolean;
  analytics: boolean;
  taxes: boolean;
  stockCorrection: boolean;
  marketing: boolean;
  paymentPlan: boolean;
  productSearchEdit: boolean;
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
  taxes?: boolean;
  stockCorrection?: boolean;
  marketing?: boolean;
  paymentPlan?: boolean;
  productSearchEdit?: boolean;
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
