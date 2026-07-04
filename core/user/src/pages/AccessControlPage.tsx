import { useCallback, useEffect, useState } from 'react';
import { shopAccessApi } from '../api/shop-access.api';
import type {
  MemberModulePermissions,
  ProductSearchEditMode,
  ShopMemberAccess,
  ShopRbacAdmin,
} from '@inventory-platform/types';
import { CORE_PRODUCT_SEARCH_FIELDS } from '@inventory-platform/types';
import { useAuthStore, useNotify, useShopAccessStore } from '@inventory-platform/store';
import styles from './access-control.module.css';

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
    productSearchEdit:
      stored.productSearchEdit ?? effective.productSearchEdit,
  };
}

export function AccessControlPage() {
  const { user } = useAuthStore();
  const { success: notifySuccess, error: notifyError } = useNotify;
  const fetchAccess = useShopAccessStore((s) => s.fetchAccess);
  const shopAccess = useShopAccessStore((s) =>
    user?.shopId ? s.byShopId[user.shopId] : undefined
  );

  const shopId = user?.shopId;
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [admin, setAdmin] = useState<ShopRbacAdmin | null>(null);
  const [draftModules, setDraftModules] = useState<
    Record<string, MemberModulePermissions>
  >({});
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
        fieldDrafts[member.userId] = [
          ...(member.permissions?.productSearchEditableFields ?? []),
        ];
      }
      setDraftModules(drafts);
      setDraftFields(fieldDrafts);
      const firstEditableMember = data.members.find(
        (m) => m.relationship !== 'OWNER'
      );
      setFieldMemberId((prev) =>
        prev && fieldDrafts[prev] ? prev : firstEditableMember?.userId ?? ''
      );
    } catch (err) {
      notifyError(
        err instanceof Error ? err.message : 'Failed to load access settings'
      );
    } finally {
      setLoading(false);
    }
  }, [shopId, notifyError]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!shopId) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Select a shop to manage access.</div>
      </div>
    );
  }

  if (!shopAccess?.canManageAccess) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          Only the shop owner can manage access settings.
        </div>
      </div>
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

  const setModuleDraft = (
    userId: string,
    key: keyof MemberModulePermissions,
    value: boolean
  ) => {
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
        ...(editMode === 'PERMISSION_BASED'
          ? { productSearchEditableFields: fields }
          : {}),
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

  const editableMembers =
    admin?.members.filter((m) => m.relationship !== 'OWNER') ?? [];
  const selectedFieldMember = editableMembers.find(
    (m) => m.userId === fieldMemberId
  );
  const moduleColumns =
    editMode === 'PERMISSION_BASED'
      ? MODULE_COLUMNS.filter((col) => col.key !== 'productSearchEdit')
      : MODULE_COLUMNS;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Access control</h1>
        <p className={styles.subtitle}>
          Choose which modules each team member can open. Cashiers start with
          limited access; you can grant Accounting, Analytics, Taxes, and more
          as needed.
        </p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Product search editing</h2>
        <p className={styles.cardHint}>
          <strong>Full edit</strong> uses the <strong>Edit</strong> column in
          the module table below. <strong>Permission-based</strong> uses the
          field checkboxes above — no separate Edit toggle needed.
        </p>
        <div className={styles.policyRow}>
          <select
            className={styles.select}
            value={editMode}
            disabled={policySaving}
            onChange={(e) =>
              void handlePolicyChange(e.target.value as ProductSearchEditMode)
            }
          >
            <option value="FULL_EDIT">Full edit access</option>
            <option value="PERMISSION_BASED">Permission-based access</option>
          </select>
        </div>
      </div>

      {editMode === 'PERMISSION_BASED' && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Product search field access</h2>
          <p className={styles.cardHint}>
            Choose which fields each member can edit in product search. Checking
            any field enables edit for that member (only those fields are
            editable).
          </p>
          {loading ? (
            <p className={styles.loading}>Loading…</p>
          ) : editableMembers.length === 0 ? (
            <p className={styles.loading}>No team members to configure.</p>
          ) : (
            <>
              <div className={styles.policyRow}>
                <label className={styles.fieldMemberLabel} htmlFor="field-member">
                  Member
                </label>
                <select
                  id="field-member"
                  className={styles.select}
                  value={fieldMemberId}
                  onChange={(e) => setFieldMemberId(e.target.value)}
                >
                  {editableMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name || m.email} ({m.role})
                    </option>
                  ))}
                </select>
                {selectedFieldMember ? (
                  <button
                    type="button"
                    className={styles.saveBtn}
                    disabled={savingUserId === selectedFieldMember.userId}
                    onClick={() => void saveMember(selectedFieldMember)}
                  >
                    {savingUserId === selectedFieldMember.userId
                      ? 'Saving…'
                      : 'Save fields'}
                  </button>
                ) : null}
              </div>
              {selectedFieldMember ? (
                <div className={styles.fieldGrid}>
                  {CORE_PRODUCT_SEARCH_FIELDS.map((field) => (
                    <label key={field.key} className={styles.fieldChip}>
                      <input
                        type="checkbox"
                        checked={(draftFields[selectedFieldMember.userId] ?? []).includes(
                          field.key
                        )}
                        onChange={(e) =>
                          toggleFieldDraft(
                            selectedFieldMember.userId,
                            field.key,
                            e.target.checked
                          )
                        }
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Team module access</h2>
        <p className={styles.cardHint}>
          Toggle modules for each member, then click Save on their row. The shop
          owner always has full access. Stock corrections: any member can create
          pending corrections; only owner/manager can approve.
        </p>

        {loading ? (
          <p className={styles.loading}>Loading team access…</p>
        ) : !admin?.members.length ? (
          <p className={styles.loading}>No team members found.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Member</th>
                  {moduleColumns.map((col) => (
                    <th key={col.key} className={styles.toggleCell}>
                      <span title={col.label}>{col.short}</span>
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {admin.members.map((member) => {
                  const isOwner = member.relationship === 'OWNER';
                  const draft = draftModules[member.userId];
                  return (
                    <tr key={member.userId}>
                      <td className={styles.userCell}>
                        <div className={styles.userName}>
                          {member.name || member.email}
                        </div>
                        <div className={styles.userMeta}>
                          {member.role}
                          {isOwner ? (
                            <>
                              {' '}
                              · <span className={styles.ownerBadge}>Owner</span>
                            </>
                          ) : null}
                        </div>
                      </td>
                      {moduleColumns.map((col) => (
                        <td key={col.key} className={styles.toggleCell}>
                          <input
                            type="checkbox"
                            className={styles.toggle}
                            checked={Boolean(draft?.[col.key])}
                            disabled={isOwner || savingUserId === member.userId}
                            onChange={(e) =>
                              setModuleDraft(
                                member.userId,
                                col.key,
                                e.target.checked
                              )
                            }
                            aria-label={`${col.label} for ${member.name}`}
                          />
                        </td>
                      ))}
                      <td>
                        {isOwner ? (
                          <span className={styles.userMeta}>—</span>
                        ) : (
                          <button
                            type="button"
                            className={styles.saveBtn}
                            disabled={savingUserId === member.userId}
                            onClick={() => void saveMember(member)}
                          >
                            {savingUserId === member.userId ? 'Saving…' : 'Save'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className={styles.saveHint}>
          Invitations and shop user management remain owner/manager only.
          Cashiers cannot see Payment &amp; Plan unless you enable Plan here.
        </p>
      </div>
    </div>
  );
}
