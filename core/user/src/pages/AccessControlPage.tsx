import { useCallback, useEffect, useState } from 'react';
import { shopAccessApi } from '../api/shop-access.api';
import type {
  MemberModulePermissions,
  ProductSearchEditMode,
  ShopMemberAccess,
  ShopRbacAdmin,
} from '@inventory-platform/access';
import { CORE_PRODUCT_SEARCH_FIELDS } from '@inventory-platform/access';
import { useAuthStore, useNotify, useShopAccessStore } from '@inventory-platform/session';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  Checkbox,
  FormField,
  Grid,
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
  surfaceChrome,
} from '@inventory-platform/ui-kit';

const MODULE_COLUMNS: {
  key: keyof MemberModulePermissions;
  label: string;
  short: string;
}[] = [
  { key: 'productSearchEdit', label: 'Product search edit', short: 'Edit' },
  { key: 'accounting', label: 'Accounting', short: 'Acct' },
  { key: 'analytics', label: 'Analytics', short: 'Anly' },
  { key: 'taxes', label: 'Taxes', short: 'Tax' },
  { key: 'marketing', label: 'Marketing', short: 'Mkt' },
  { key: 'paymentPlan', label: 'Payment & plan', short: 'Plan' },
];

const EDIT_MODE_OPTIONS = [
  { value: 'FULL_EDIT', label: 'Full edit access' },
  { value: 'PERMISSION_BASED', label: 'Permission-based access' },
] as const;

export function meta() {
  return [
    { title: 'Access Control - StockKart' },
    {
      name: 'description',
      content: 'Manage team access to modules in your shop',
    },
  ];
}

function modulesFromMember(member: ShopMemberAccess): MemberModulePermissions {
  const effective = member.effectiveAccess.modules;
  const stored = member.permissions?.modules ?? {};
  return {
    accounting: stored.accounting ?? effective.accounting,
    analytics: stored.analytics ?? effective.analytics,
    taxes: stored.taxes ?? effective.taxes,
    stockCorrection: stored.stockCorrection ?? effective.stockCorrection,
    marketing: stored.marketing ?? effective.marketing,
    paymentPlan: stored.paymentPlan ?? effective.paymentPlan,
    productSearchEdit: stored.productSearchEdit ?? effective.productSearchEdit,
  };
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
    setEditMode(mode);
    setPolicySaving(true);
    try {
      await shopAccessApi.updatePolicy(shopId, { productSearchEditMode: mode });
      notifySuccess('Product search edit policy updated.');
      await load();
      await fetchAccess({ force: true });
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to update policy');
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

  const editableMembers = admin?.members.filter((m) => m.relationship !== 'OWNER') ?? [];
  const selectedFieldMember = editableMembers.find((m) => m.userId === fieldMemberId);
  const moduleColumns =
    editMode === 'PERMISSION_BASED'
      ? MODULE_COLUMNS.filter((col) => col.key !== 'productSearchEdit')
      : MODULE_COLUMNS;

  return (
    <Stack gap="md" width="full" maxWidth="xl" mx="auto">
      <PageHeader
        title="Access control"
        description="Choose which modules each team member can open. Cashiers start with limited access; you can grant Accounting, Analytics, Taxes, and more as needed."
      />

      <Card>
        <CardBody>
          <Stack gap="md">
            <Text variant="title" weight="semibold">
              Product search editing
            </Text>
            <Text color="secondary">
              <Text as="span" weight="semibold">
                Full edit
              </Text>{' '}
              uses the{' '}
              <Text as="span" weight="semibold">
                Edit
              </Text>{' '}
              column in the module table below.{' '}
              <Text as="span" weight="semibold">
                Permission-based
              </Text>{' '}
              uses the field checkboxes above — no separate Edit toggle needed.
            </Text>
            <Inline gap="sm" flexWrap>
              <Select
                value={editMode}
                disabled={policySaving}
                onChange={(e) => void handlePolicyChange(e.target.value as ProductSearchEditMode)}
                options={EDIT_MODE_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />
            </Inline>
          </Stack>
        </CardBody>
      </Card>

      {editMode === 'PERMISSION_BASED' ? (
        <Card>
          <CardBody>
            <Stack gap="md">
              <Text variant="title" weight="semibold">
                Product search field access
              </Text>
              <Text color="secondary">
                Choose which fields each member can edit in product search. Checking any field
                enables edit for that member (only those fields are editable).
              </Text>
              {loading ? (
                <CenteredLoader label="Loading…" />
              ) : editableMembers.length === 0 ? (
                <Text color="secondary">No team members to configure.</Text>
              ) : (
                <Stack gap="md">
                  <Inline gap="sm" flexWrap align="end">
                    <FormField label="Member" id="field-member">
                      <Select
                        id="field-member"
                        value={fieldMemberId}
                        onChange={(e) => setFieldMemberId(e.target.value)}
                        options={editableMembers.map((m) => ({
                          value: m.userId,
                          label: `${m.name || m.email} (${m.role})`,
                        }))}
                      />
                    </FormField>
                    {selectedFieldMember ? (
                      <Button
                        type="button"
                        variant="solid"
                        size="sm"
                        disabled={savingUserId === selectedFieldMember.userId}
                        onClick={() => void saveMember(selectedFieldMember)}
                      >
                        {savingUserId === selectedFieldMember.userId ? 'Saving…' : 'Save fields'}
                      </Button>
                    ) : null}
                  </Inline>
                  {selectedFieldMember ? (
                    <Grid columns={3} gap="sm" width="full">
                      {CORE_PRODUCT_SEARCH_FIELDS.map((field) => (
                        <Checkbox
                          key={field.key}
                          label={field.label}
                          checked={(draftFields[selectedFieldMember.userId] ?? []).includes(
                            field.key,
                          )}
                          onChange={(e) =>
                            toggleFieldDraft(
                              selectedFieldMember.userId,
                              field.key,
                              e.target.checked,
                            )
                          }
                        />
                      ))}
                    </Grid>
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
            <Text variant="title" weight="semibold">
              Team module access
            </Text>
            <Text color="secondary">
              Toggle modules for each member, then click Save on their row. The shop owner always
              has full access. Stock corrections: any member can create pending corrections; only
              owner/manager can approve.
            </Text>

            {loading ? (
              <CenteredLoader label="Loading team access…" />
            ) : !admin?.members.length ? (
              <Text color="secondary">No team members found.</Text>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Member</TableHeaderCell>
                    {moduleColumns.map((col) => (
                      <TableHeaderCell key={col.key} className={surfaceChrome.textCenter}>
                        <Text title={col.label}>{col.short}</Text>
                      </TableHeaderCell>
                    ))}
                    <TableHeaderCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {admin.members.map((member) => {
                    const isOwner = member.relationship === 'OWNER';
                    const draft = draftModules[member.userId];
                    return (
                      <TableRow key={member.userId}>
                        <TableCell className={surfaceChrome.minW11_25}>
                          <Stack gap="xs">
                            <Text weight="semibold">{member.name || member.email}</Text>
                            <Inline gap="xs" align="center">
                              <Text color="secondary" variant="caption">
                                {member.role}
                              </Text>
                              {isOwner ? (
                                <>
                                  <Text color="secondary" variant="caption">
                                    ·
                                  </Text>
                                  <Badge variant="info">Owner</Badge>
                                </>
                              ) : null}
                            </Inline>
                          </Stack>
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
                        <TableCell>
                          {isOwner ? (
                            <Text color="secondary" variant="caption">
                              —
                            </Text>
                          ) : (
                            <Button
                              type="button"
                              variant="solid"
                              size="sm"
                              disabled={savingUserId === member.userId}
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
              Invitations and shop user management remain owner/manager only. Cashiers cannot see
              Payment &amp; Plan unless you enable Plan here.
            </Text>
          </Stack>
        </CardBody>
      </Card>
    </Stack>
  );
}
