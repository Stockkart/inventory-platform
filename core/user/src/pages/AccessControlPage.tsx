import { useCallback, useEffect, useMemo, useState } from 'react';
import { shopAccessApi } from '../api/shop-access.api';
import type {
  MemberModulePermissions,
  ProductSearchEditMode,
  ShopMemberAccess,
  ShopRbacAdmin,
} from '@inventory-platform/access';
import { CORE_PRODUCT_SEARCH_FIELDS } from '@inventory-platform/access';
import { useAuthStore, useNotify, useShopAccessStore } from '@inventory-platform/session';
import { RoleBadge } from '../ui/RoleBadge';
import type { UserRole } from '@inventory-platform/user/types';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  EmptyState,
  FormField,
  Inline,
  PageHeader,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  VisuallyHidden,
  cn,
  surfaceChrome,
} from '@inventory-platform/ui-kit';

const MODULE_COLUMNS: {
  key: keyof MemberModulePermissions;
  label: string;
  short: string;
}[] = [
  { key: 'productSearchEdit', label: 'Product search edit', short: 'Edit' },
  { key: 'accounting', label: 'Accounting', short: 'Accounting' },
  { key: 'analytics', label: 'Analytics', short: 'Analytics' },
  { key: 'mis', label: 'MIS', short: 'MIS' },
  { key: 'taxes', label: 'Taxes', short: 'Taxes' },
  { key: 'marketing', label: 'Marketing', short: 'Marketing' },
  { key: 'paymentPlan', label: 'Payment & plan', short: 'Plan' },
];

const FIELD_GROUPS: {
  id: string;
  title: string;
  keys: Array<(typeof CORE_PRODUCT_SEARCH_FIELDS)[number]['key']>;
}[] = [
  {
    id: 'identity',
    title: 'Product',
    keys: ['name', 'description', 'companyName', 'location', 'barcode'],
  },
  {
    id: 'inventory',
    title: 'Inventory',
    keys: ['batchNo', 'expiryDate', 'baseUnit', 'unitsPerPack'],
  },
  {
    id: 'pricing',
    title: 'Pricing',
    keys: ['costPrice', 'priceToRetail', 'maximumRetailPrice', 'sellingPrice'],
  },
  {
    id: 'tax',
    title: 'Tax',
    keys: ['hsn', 'cgst', 'sgst'],
  },
];

const FIELD_LABEL_BY_KEY = Object.fromEntries(
  CORE_PRODUCT_SEARCH_FIELDS.map((field) => [field.key, field.label]),
) as Record<(typeof CORE_PRODUCT_SEARCH_FIELDS)[number]['key'], string>;

function modulesFromMember(member: ShopMemberAccess): MemberModulePermissions {
  const effective = member.effectiveAccess.modules;
  const stored = member.permissions?.modules ?? {};
  return {
    accounting: stored.accounting ?? effective.accounting,
    analytics: stored.analytics ?? effective.analytics,
    mis: stored.mis ?? effective.mis,
    taxes: stored.taxes ?? effective.taxes,
    stockCorrection: stored.stockCorrection ?? effective.stockCorrection,
    marketing: stored.marketing ?? effective.marketing,
    paymentPlan: stored.paymentPlan ?? effective.paymentPlan,
    productSearchEdit: stored.productSearchEdit ?? effective.productSearchEdit,
  };
}

function modulesEqual(a: MemberModulePermissions, b: MemberModulePermissions) {
  return (Object.keys(a) as Array<keyof MemberModulePermissions>).every((key) => a[key] === b[key]);
}

function formatRoleLabel(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export function meta() {
  return [
    { title: 'Access Control - StockKart' },
    {
      name: 'description',
      content: 'Manage team access to modules in your shop',
    },
  ];
}

export function AccessControlPage() {
  const { user } = useAuthStore();
  const { success: notifySuccess, error: notifyError } = useNotify;
  const fetchAccess = useShopAccessStore((s) => s.fetchAccess);
  const shopAccess = useShopAccessStore((s) =>
    user?.shopId ? s.byShopId[user.shopId] : undefined,
  );

  const shopId = user?.shopId;
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [admin, setAdmin] = useState<ShopRbacAdmin | null>(null);
  const [draftModules, setDraftModules] = useState<Record<string, MemberModulePermissions>>({});
  const [editMode, setEditMode] = useState<ProductSearchEditMode>('FULL_EDIT');
  const [policySaving, setPolicySaving] = useState(false);
  const [draftFields, setDraftFields] = useState<Record<string, string[]>>({});
  const [fieldMemberId, setFieldMemberId] = useState<string>('');

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const data = await shopAccessApi.getAdmin(shopId);
      setAdmin(data);
      setEditMode(data.productSearchEditMode);
      const drafts: Record<string, MemberModulePermissions> = {};
      const fieldDrafts: Record<string, string[]> = {};
      for (const member of data.members) {
        drafts[member.userId] = modulesFromMember(member);
        fieldDrafts[member.userId] = [...(member.permissions?.productSearchEditableFields ?? [])];
      }
      setDraftModules(drafts);
      setDraftFields(fieldDrafts);
      const firstEditableMember = data.members.find((m) => m.relationship !== 'OWNER');
      setFieldMemberId((prev) =>
        prev && fieldDrafts[prev] ? prev : firstEditableMember?.userId ?? '',
      );
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to load access settings');
    } finally {
      setLoading(false);
    }
  }, [shopId, notifyError]);

  useEffect(() => {
    void load();
  }, [load]);

  const members = useMemo(() => admin?.members ?? [], [admin]);
  const editableMembers = useMemo(
    () => members.filter((m) => m.relationship !== 'OWNER'),
    [members],
  );
  const selectedFieldMember = editableMembers.find((m) => m.userId === fieldMemberId);
  const moduleColumns =
    editMode === 'PERMISSION_BASED'
      ? MODULE_COLUMNS.filter((col) => col.key !== 'productSearchEdit')
      : MODULE_COLUMNS;

  if (!shopId) {
    return (
      <Stack gap="md" width="full" maxWidth="xl" mx="auto">
        <Alert variant="danger">Select a shop to manage access.</Alert>
      </Stack>
    );
  }

  if (!shopAccess?.canManageAccess) {
    return (
      <Stack gap="md" width="full" maxWidth="xl" mx="auto">
        <Alert variant="danger">Only the shop owner can manage access settings.</Alert>
      </Stack>
    );
  }

  const handlePolicyChange = async (mode: ProductSearchEditMode) => {
    if (mode === editMode) return;
    setEditMode(mode);
    setPolicySaving(true);
    try {
      await shopAccessApi.updatePolicy(shopId, { productSearchEditMode: mode });
      notifySuccess('Product search edit policy updated.');
      await load();
      await fetchAccess({ force: true });
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to update policy');
      await load();
    } finally {
      setPolicySaving(false);
    }
  };

  const setModuleDraft = (userId: string, key: keyof MemberModulePermissions, value: boolean) => {
    setDraftModules((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [key]: value },
    }));
  };

  const isMemberDirty = (member: ShopMemberAccess) => {
    const draft = draftModules[member.userId];
    if (!draft) return false;
    const saved = modulesFromMember(member);
    const moduleDirty = !modulesEqual(draft, saved);
    if (editMode !== 'PERMISSION_BASED') return moduleDirty;
    const savedFields = [...(member.permissions?.productSearchEditableFields ?? [])].sort();
    const draftSorted = [...(draftFields[member.userId] ?? [])].sort();
    const fieldsDirty =
      savedFields.length !== draftSorted.length ||
      savedFields.some((field, index) => field !== draftSorted[index]);
    return moduleDirty || fieldsDirty;
  };

  const saveMember = async (member: ShopMemberAccess) => {
    const modules = draftModules[member.userId];
    if (!modules) return;
    const fields = draftFields[member.userId] ?? [];
    const modulesToSave: MemberModulePermissions = { ...modules };
    if (editMode === 'PERMISSION_BASED') {
      modulesToSave.productSearchEdit = fields.length > 0;
    }
    setSavingUserId(member.userId);
    try {
      await shopAccessApi.updateMember(shopId, member.userId, {
        modules: modulesToSave,
        ...(editMode === 'PERMISSION_BASED' ? { productSearchEditableFields: fields } : {}),
      });
      notifySuccess(`Access updated for ${member.name || member.email}.`);
      await load();
      if (member.userId === user?.userId) {
        await fetchAccess({ force: true });
      }
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to save access');
    } finally {
      setSavingUserId(null);
    }
  };

  const applyFieldDraft = (userId: string, nextFields: string[]) => {
    setDraftFields((prev) => ({ ...prev, [userId]: nextFields }));
    setDraftModules((mods) => ({
      ...mods,
      [userId]: {
        ...mods[userId],
        productSearchEdit: nextFields.length > 0,
      },
    }));
  };

  const toggleFieldDraft = (userId: string, fieldKey: string, checked: boolean) => {
    setDraftFields((prev) => {
      const current = new Set(prev[userId] ?? []);
      if (checked) current.add(fieldKey);
      else current.delete(fieldKey);
      const nextFields = Array.from(current);
      setDraftModules((mods) => ({
        ...mods,
        [userId]: {
          ...mods[userId],
          productSearchEdit: nextFields.length > 0,
        },
      }));
      return { ...prev, [userId]: nextFields };
    });
  };

  const setGroupFields = (userId: string, keys: string[], checked: boolean) => {
    setDraftFields((prev) => {
      const current = new Set(prev[userId] ?? []);
      for (const key of keys) {
        if (checked) current.add(key);
        else current.delete(key);
      }
      const nextFields = Array.from(current);
      setDraftModules((mods) => ({
        ...mods,
        [userId]: {
          ...mods[userId],
          productSearchEdit: nextFields.length > 0,
        },
      }));
      return { ...prev, [userId]: nextFields };
    });
  };

  const selectedFieldKeys = selectedFieldMember
    ? draftFields[selectedFieldMember.userId] ?? []
    : [];
  const selectedFieldCount = selectedFieldKeys.length;
  const totalFieldCount = CORE_PRODUCT_SEARCH_FIELDS.length;
  const fieldsDirty = selectedFieldMember ? isMemberDirty(selectedFieldMember) : false;

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader description="Decide who can open each module, and which product fields they can edit. Owners always keep full access." />

      <Box className={surfaceChrome.accessPolicyBar}>
        <Box className={surfaceChrome.accessPolicyCopy}>
          <Text as="h3" className={surfaceChrome.inviteSectionTitle}>
            Product search editing
          </Text>
          <Text variant="caption" color="secondary">
            {editMode === 'FULL_EDIT'
              ? 'Anyone with Edit enabled can change every product-search field.'
              : 'Grant fields per person below. Edit is derived from those selections.'}
          </Text>
        </Box>
        <Box className={surfaceChrome.reminderSegment} role="group" aria-label="Edit policy">
          {(
            [
              { value: 'FULL_EDIT', label: 'Full edit' },
              { value: 'PERMISSION_BASED', label: 'Permission-based' },
            ] as const
          ).map((opt) => (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant="ghost"
              disabled={policySaving}
              aria-pressed={editMode === opt.value}
              className={cn(
                surfaceChrome.reminderSegmentBtn,
                editMode === opt.value && surfaceChrome.reminderSegmentBtnActive,
              )}
              onClick={() => void handlePolicyChange(opt.value)}
            >
              {policySaving && editMode === opt.value ? 'Saving…' : opt.label}
            </Button>
          ))}
        </Box>
      </Box>

      {editMode === 'PERMISSION_BASED' ? (
        <Card>
          <CardBody>
            <Stack gap="md">
              <Box>
                <Text as="h3" className={surfaceChrome.inviteSectionTitle}>
                  Field access
                </Text>
                <Text variant="caption" color="secondary">
                  Choose a teammate, then enable the product-search fields they may edit.
                </Text>
              </Box>
              {loading ? (
                <CenteredLoader label="Loading…" />
              ) : editableMembers.length === 0 ? (
                <EmptyState title="No teammates to configure" />
              ) : (
                <Stack gap="md">
                  <Box className={surfaceChrome.accessFieldToolbar}>
                    <Box className={surfaceChrome.accessFieldToolbarMain}>
                      <Box className={surfaceChrome.accessFieldMemberSelect}>
                        <FormField label="Member" htmlFor="field-member">
                          <Select
                            id="field-member"
                            value={fieldMemberId}
                            onChange={(e) => setFieldMemberId(e.target.value)}
                            options={editableMembers.map((m) => ({
                              value: m.userId,
                              label: `${m.name || m.email} (${formatRoleLabel(m.role)})`,
                            }))}
                          />
                        </FormField>
                      </Box>
                      {selectedFieldMember ? (
                        <Text as="p" className={surfaceChrome.accessFieldSummary}>
                          {selectedFieldCount} of {totalFieldCount} fields enabled
                          {fieldsDirty ? ' · Unsaved changes' : ''}
                        </Text>
                      ) : null}
                    </Box>
                    {selectedFieldMember ? (
                      <Inline gap="sm" flexWrap>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            applyFieldDraft(
                              selectedFieldMember.userId,
                              CORE_PRODUCT_SEARCH_FIELDS.map((f) => f.key),
                            )
                          }
                        >
                          Select all
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => applyFieldDraft(selectedFieldMember.userId, [])}
                        >
                          Clear
                        </Button>
                        <Button
                          type="button"
                          variant="solid"
                          size="sm"
                          disabled={savingUserId === selectedFieldMember.userId || !fieldsDirty}
                          onClick={() => void saveMember(selectedFieldMember)}
                        >
                          {savingUserId === selectedFieldMember.userId ? 'Saving…' : 'Save fields'}
                        </Button>
                      </Inline>
                    ) : null}
                  </Box>
                  {selectedFieldMember ? (
                    <Box className={surfaceChrome.accessFieldGroups}>
                      {FIELD_GROUPS.map((group) => {
                        const enabledInGroup = group.keys.filter((key) =>
                          selectedFieldKeys.includes(key),
                        ).length;
                        const allOn = enabledInGroup === group.keys.length;
                        return (
                          <Box key={group.id} className={surfaceChrome.accessFieldGroup}>
                            <Box className={surfaceChrome.accessFieldGroupHeader}>
                              <Inline gap="sm" flexWrap align="center">
                                <Text as="h4" className={surfaceChrome.accessFieldGroupTitle}>
                                  {group.title}
                                </Text>
                                <Text as="span" className={surfaceChrome.accessFieldGroupMeta}>
                                  {enabledInGroup}/{group.keys.length}
                                </Text>
                              </Inline>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={surfaceChrome.accessFieldGroupAction}
                                onClick={() =>
                                  setGroupFields(selectedFieldMember.userId, group.keys, !allOn)
                                }
                              >
                                {allOn ? 'Clear' : 'All'}
                              </Button>
                            </Box>
                            <Box
                              className={surfaceChrome.accessFieldGrid}
                              role="group"
                              aria-label={`${group.title} fields`}
                            >
                              {group.keys.map((key) => {
                                const active = selectedFieldKeys.includes(key);
                                return (
                                  <Button
                                    key={key}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    aria-pressed={active}
                                    className={cn(
                                      surfaceChrome.accessFieldChip,
                                      active && surfaceChrome.accessFieldChipActive,
                                    )}
                                    onClick={() =>
                                      toggleFieldDraft(selectedFieldMember.userId, key, !active)
                                    }
                                  >
                                    {FIELD_LABEL_BY_KEY[key]}
                                  </Button>
                                );
                              })}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  ) : null}
                </Stack>
              )}
            </Stack>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardBody>
          <Stack gap="md">
            <Box>
              <Text as="h3" className={surfaceChrome.inviteSectionTitle}>
                Team module access
              </Text>
              <Text variant="caption" color="secondary">
                Toggle modules for each person, then save that row. Anyone can submit stock
                corrections; only owners and managers approve them.
              </Text>
            </Box>

            {loading ? (
              <CenteredLoader label="Loading team access…" />
            ) : !members.length ? (
              <EmptyState title="No team members found" />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Member</TableHeaderCell>
                    {moduleColumns.map((col) => (
                      <TableHeaderCell
                        key={col.key}
                        className={surfaceChrome.textCenter}
                        title={col.label}
                      >
                        <Text as="span" className={surfaceChrome.accessModuleHeadShort}>
                          {col.short}
                        </Text>
                      </TableHeaderCell>
                    ))}
                    <TableHeaderCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map((member) => {
                    const isOwner = member.relationship === 'OWNER';
                    const draft = draftModules[member.userId];
                    const dirty = !isOwner && isMemberDirty(member);
                    const role = member.role as UserRole;
                    return (
                      <TableRow key={member.userId}>
                        <TableCell>
                          <Box className={surfaceChrome.invitePrimaryCell}>
                            <Text as="p" className={surfaceChrome.invitePrimaryName}>
                              {member.name || member.email}
                            </Text>
                            <Inline gap="sm" flexWrap>
                              {isOwner ? (
                                <Badge variant="info">Owner</Badge>
                              ) : ['ADMIN', 'MANAGER', 'CASHIER'].includes(member.role) ? (
                                <RoleBadge role={role} />
                              ) : (
                                <Badge variant="neutral">{formatRoleLabel(member.role)}</Badge>
                              )}
                            </Inline>
                          </Box>
                        </TableCell>
                        {moduleColumns.map((col) => (
                          <TableCell key={col.key} className={surfaceChrome.textCenter}>
                            <Switch
                              label={
                                <VisuallyHidden>
                                  {`${col.label} for ${member.name || member.email}`}
                                </VisuallyHidden>
                              }
                              checked={Boolean(draft?.[col.key])}
                              disabled={isOwner || savingUserId === member.userId}
                              onChange={(e) =>
                                setModuleDraft(member.userId, col.key, e.target.checked)
                              }
                            />
                          </TableCell>
                        ))}
                        <TableCell className={surfaceChrome.inviteActionsCell}>
                          {isOwner ? (
                            <Text color="secondary" variant="caption">
                              Full access
                            </Text>
                          ) : (
                            <Button
                              type="button"
                              variant={dirty ? 'solid' : 'outline'}
                              size="sm"
                              disabled={savingUserId === member.userId || !dirty}
                              onClick={() => void saveMember(member)}
                            >
                              {savingUserId === member.userId ? 'Saving…' : 'Save'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            <Text color="secondary" variant="caption">
              Invitations and shop user management stay owner/manager only. Cashiers only see
              Payment &amp; Plan when Plan is enabled here.
            </Text>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
