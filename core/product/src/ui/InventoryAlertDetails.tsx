import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { inventoryApi, resolveInventoryDocumentId } from '../api/inventory.api';
import { vendorsApi } from '@inventory-platform/user/vendors';
import type { VendorResponse } from '@inventory-platform/user/types';
import type {
  InventoryItem,
  UpdateInventoryRequest,
  SchemeType,
  ItemType,
  DiscountApplicable,
} from '@inventory-platform/product/types';
import type { ShopProductSearchAccess } from '@inventory-platform/access';
import {
  canEditProductSearchUiField,
  hasProductSearchEditAccess,
} from '@inventory-platform/access';
import { useNotify } from '@inventory-platform/session';
import {
  itemUsesExtensionBag,
  getInventoryBatchNo,
  formatInventoryExpiryDate,
} from '@inventory-platform/schema';
import {
  Alert,
  Box,
  Button,
  CenteredLoader,
  EmptyState,
  Grid,
  Inline,
  Input,
  Link,
  Modal,
  Select,
  Stack,
  Text,
  Textarea,
  type SelectOptionDef,
} from '@inventory-platform/ui-kit';
const SCHEME_TYPE_OPTIONS: readonly SelectOptionDef[] = [
  { value: 'FIXED_UNITS', label: 'Free units' },
  { value: 'PERCENTAGE', label: 'Percentage' },
];

const ITEM_TYPE_OPTIONS: readonly SelectOptionDef[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'COSTLY', label: 'Costly' },
  { value: 'DEGREE', label: 'Temperature / °' },
];

const DISCOUNT_OPTIONS: readonly SelectOptionDef[] = [
  { value: '', label: '—' },
  { value: 'DISCOUNT', label: 'Discount' },
  { value: 'SCHEME', label: 'Scheme' },
  { value: 'DISCOUNT_AND_SCHEME', label: 'Both' },
];

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <Inline gap="sm" align="center" style={{ marginBottom: '1rem' }}>
      <Text>{icon}</Text>
      <Text variant="heading4">{title}</Text>
    </Inline>
  );
}

function DetailField({
  icon,
  label,
  fullWidth,
  children,
}: {
  icon?: string;
  label: string;
  fullWidth?: boolean;
  children: ReactNode;
}) {
  return (
    <Inline gap="sm" align="start" style={fullWidth ? { gridColumn: '1 / -1' } : undefined}>
      {icon ? <Text style={{ flexShrink: 0 }}>{icon}</Text> : null}
      <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
        <Text variant="caption" color="secondary">
          {label}
        </Text>
        {children}
      </Stack>
    </Inline>
  );
}

function DetailValue({
  children,
  weight,
}: {
  children: ReactNode;
  weight?: 'medium' | 'semibold' | 'bold';
}) {
  return <Text weight={weight}>{children}</Text>;
}

function formatSaleSchemeDisplay(item: InventoryItem): string {
  const st = item.schemeType ?? 'FIXED_UNITS';
  if (st === 'PERCENTAGE' && item.schemePercentage != null) {
    return `${item.schemePercentage}%`;
  }
  if (item.schemePayFor != null || item.schemeFree != null) {
    return `${item.schemePayFor ?? 0}+${item.schemeFree ?? 0}`;
  }
  if (item.scheme != null && item.scheme > 0) {
    return `1+${item.scheme}`;
  }
  return '';
}

function formatPurchaseSchemeDisplay(item: InventoryItem): string {
  const st = item.purchaseSchemeType ?? 'FIXED_UNITS';
  if (st === 'PERCENTAGE' && item.purchaseSchemePercentage != null) {
    return `${item.purchaseSchemePercentage}%`;
  }
  if (item.purchaseSchemePayFor != null || item.purchaseSchemeFree != null) {
    return `${item.purchaseSchemePayFor ?? 0}+${item.purchaseSchemeFree ?? 0}`;
  }
  return '';
}

function parseSaleSchemeDraft(raw: string): {
  schemeType: SchemeType;
  schemePayFor: number | null;
  schemeFree: number | null;
  schemePercentage: number | null;
} | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.endsWith('%')) {
    const num = parseFloat(t.slice(0, -1));
    if (!isNaN(num) && num >= 0 && num <= 100) {
      return {
        schemeType: 'PERCENTAGE',
        schemePercentage: num,
        schemePayFor: null,
        schemeFree: null,
      };
    }
    return null;
  }
  const plusIdx = t.indexOf('+');
  if (plusIdx >= 0) {
    const left = parseInt(t.slice(0, plusIdx).trim(), 10);
    const right = parseInt(t.slice(plusIdx + 1).trim(), 10);
    if (!isNaN(left) && !isNaN(right) && left >= 0 && right >= 0) {
      return {
        schemeType: 'FIXED_UNITS',
        schemePayFor: left,
        schemeFree: right,
        schemePercentage: null,
      };
    }
  }
  return null;
}

function parsePurchaseSchemeDraft(raw: string): {
  purchaseSchemeType: SchemeType;
  purchaseSchemePayFor: number | null;
  purchaseSchemeFree: number | null;
  purchaseSchemePercentage: number | null;
} | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.endsWith('%')) {
    const num = parseFloat(t.slice(0, -1));
    if (!isNaN(num) && num >= 0 && num <= 100) {
      return {
        purchaseSchemeType: 'PERCENTAGE',
        purchaseSchemePercentage: num,
        purchaseSchemePayFor: null,
        purchaseSchemeFree: null,
      };
    }
    return null;
  }
  const plusIdx = t.indexOf('+');
  if (plusIdx >= 0) {
    const left = parseInt(t.slice(0, plusIdx).trim(), 10);
    const right = parseInt(t.slice(plusIdx + 1).trim(), 10);
    if (!isNaN(left) && !isNaN(right) && left >= 0 && right >= 0) {
      return {
        purchaseSchemeType: 'FIXED_UNITS',
        purchaseSchemePayFor: left,
        purchaseSchemeFree: right,
        purchaseSchemePercentage: null,
      };
    }
  }
  return null;
}

function packagingFactorDisplay(item: InventoryItem): string {
  const factor = item.unitConversions?.factor ?? item.unitsPerPack ?? null;
  if (factor != null && factor > 0) {
    const unit = item.unitConversions?.unit?.trim() || 'sale unit';
    return `1 × ${factor} (${unit})`;
  }
  return '—';
}

export interface InventoryAlertDetailsProps {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  /** When true, shows Edit button when product-search access allows edits */
  editable?: boolean;
  /** Effective product-search access from GET /shops/me/access */
  productSearchAccess?: ShopProductSearchAccess | null;
  /** Called after successful update so parent can refresh the item */
  onUpdated?: (updated: InventoryItem) => void;
}

export function InventoryAlertDetails({
  open,
  item,
  onClose,
  editable = false,
  productSearchAccess = null,
  onUpdated,
}: InventoryAlertDetailsProps) {
  const [vendor, setVendor] = useState<VendorResponse | null>(null);
  const [loadingVendor, setLoadingVendor] = useState(false);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string | number | null>>({});
  const { success: notifySuccess, error: notifyError } = useNotify;

  const canEditField = (uiKey: string) => canEditProductSearchUiField(uiKey, productSearchAccess);
  const allowEditMode = editable && hasProductSearchEditAccess(productSearchAccess);
  const showEditor = (uiKey: string) => isEditing && canEditField(uiKey);

  const stripLeadingZeros = (val: string): string => {
    if (val === '' || val === '.') return val;
    let s = val.replace(/^0+(?=[1-9])/, '').replace(/^0+(?=\.)/, '0');
    if (/^0+$/.test(s)) s = s.length > 0 ? '0' : s;
    return s === '' ? val : s;
  };

  const initEditForm = useCallback(() => {
    if (!item) return;
    const d = item;
    const fmtNum = (n: number | null | undefined) =>
      n != null && !Number.isNaN(n) ? String(n) : '';
    const packFactor = d.unitConversions?.factor ?? d.unitsPerPack ?? null;
    const batchFromBag = d.verticalFields?.batchNo;
    const expiryFromBag = d.verticalFields?.expiryDate;
    setEditForm({
      name: d.name ?? '',
      barcode: d.barcode ?? '',
      description: d.description ?? '',
      companyName: d.companyName ?? '',
      location: d.location ?? '',
      hsn: d.hsn ?? '',
      batchNo: batchFromBag != null && batchFromBag !== '' ? String(batchFromBag) : d.batchNo ?? '',
      maximumRetailPrice: fmtNum(d.maximumRetailPrice),
      costPrice: fmtNum(d.costPrice),
      priceToRetail: fmtNum(d.priceToRetail),
      sgst: d.sgst ?? '',
      cgst: d.cgst ?? '',
      conversionFactor: packFactor != null && packFactor > 0 ? String(packFactor) : '',
      schemeType: d.schemeType ?? 'FIXED_UNITS',
      saleScheme: formatSaleSchemeDisplay(d),
      saleAdditionalDiscount:
        d.saleAdditionalDiscount != null ? String(d.saleAdditionalDiscount) : '',
      purchaseSchemeType: d.purchaseSchemeType ?? 'FIXED_UNITS',
      purchaseScheme: formatPurchaseSchemeDisplay(d),
      purchaseAdditionalDiscount:
        d.purchaseAdditionalDiscount != null ? String(d.purchaseAdditionalDiscount) : '',
      itemType: d.itemType ?? 'NORMAL',
      itemTypeDegree: d.itemTypeDegree != null ? String(d.itemTypeDegree) : '',
      discountApplicable: d.discountApplicable ?? '',
      thresholdCount: d.thresholdCount ?? null,
      expiryDate:
        expiryFromBag != null && expiryFromBag !== ''
          ? String(expiryFromBag).slice(0, 10)
          : d.expiryDate
          ? d.expiryDate.slice(0, 10)
          : '',
      purchaseDate: d.purchaseDate ? d.purchaseDate.slice(0, 10) : '',
    });
  }, [item]);

  useEffect(() => {
    if (open && item) {
      if (isEditing) initEditForm();
      const vendorId = item.vendorId;

      if (vendorId) {
        setLoadingVendor(true);
        setVendorError(null);
        vendorsApi
          .getById(vendorId)
          .then((vendorData) => setVendor(vendorData))
          .catch((err) => {
            setVendorError(err?.message || 'Failed to load vendor details');
          })
          .finally(() => setLoadingVendor(false));
      } else {
        setVendor(null);
        setVendorError(null);
      }
    } else {
      setVendor(null);
      setVendorError(null);
      setIsEditing(false);
    }
  }, [open, item, isEditing]);

  const handleEditClick = () => {
    initEditForm();
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!item) return;
    const currentItem = item;
    const inventoryDocumentId = resolveInventoryDocumentId(currentItem);
    if (!inventoryDocumentId) {
      notifyError('Cannot save: missing inventory id');
      return;
    }
    setIsSaving(true);
    try {
      const payload: UpdateInventoryRequest = {};
      if (editForm.name !== undefined && editForm.name !== currentItem.name)
        payload.name = String(editForm.name) || undefined;
      if (editForm.barcode !== undefined && editForm.barcode !== currentItem.barcode)
        payload.barcode = String(editForm.barcode) || undefined;
      if (editForm.description !== undefined && editForm.description !== currentItem.description)
        payload.description = String(editForm.description) || undefined;
      if (editForm.companyName !== undefined && editForm.companyName !== currentItem.companyName)
        payload.companyName = String(editForm.companyName) || undefined;
      if (editForm.location !== undefined && editForm.location !== currentItem.location)
        payload.location = String(editForm.location) || undefined;
      if (editForm.hsn !== undefined && editForm.hsn !== currentItem.hsn)
        payload.hsn = String(editForm.hsn) || undefined;

      const usesExtension = itemUsesExtensionBag(currentItem);
      const verticalPatch: Record<string, unknown> = usesExtension
        ? { ...(currentItem.verticalFields ?? {}) }
        : {};
      let verticalChanged = false;

      if (
        editForm.batchNo !== undefined &&
        editForm.batchNo !==
          (usesExtension ? String(currentItem.verticalFields?.batchNo ?? '') : currentItem.batchNo)
      ) {
        if (usesExtension) {
          verticalPatch.batchNo = String(editForm.batchNo) || null;
          verticalChanged = true;
        } else {
          payload.batchNo = String(editForm.batchNo) || undefined;
        }
      }
      const mrp =
        editForm.maximumRetailPrice != null && String(editForm.maximumRetailPrice).trim() !== ''
          ? parseFloat(String(editForm.maximumRetailPrice))
          : NaN;
      const cost =
        editForm.costPrice != null && String(editForm.costPrice).trim() !== ''
          ? parseFloat(String(editForm.costPrice))
          : NaN;
      const ptr =
        editForm.priceToRetail != null && String(editForm.priceToRetail).trim() !== ''
          ? parseFloat(String(editForm.priceToRetail))
          : NaN;
      if (!Number.isNaN(mrp) && mrp !== currentItem.maximumRetailPrice)
        payload.maximumRetailPrice = mrp;
      if (!Number.isNaN(cost) && cost !== currentItem.costPrice) payload.costPrice = cost;
      if (!Number.isNaN(ptr) && ptr !== currentItem.priceToRetail) payload.priceToRetail = ptr;
      if (
        editForm.sgst !== undefined &&
        String(editForm.sgst).trim() !== String(currentItem.sgst ?? '').trim()
      )
        payload.sgst = String(editForm.sgst).trim() || undefined;
      if (
        editForm.cgst !== undefined &&
        String(editForm.cgst).trim() !== String(currentItem.cgst ?? '').trim()
      )
        payload.cgst = String(editForm.cgst).trim() || undefined;
      const addDiscStr = String(editForm.saleAdditionalDiscount ?? '').trim();
      const addDisc = addDiscStr !== '' ? parseFloat(addDiscStr) : null;
      const currentAddDisc = currentItem.saleAdditionalDiscount ?? null;
      if (addDisc !== currentAddDisc && (addDisc != null || currentAddDisc != null))
        payload.saleAdditionalDiscount = addDisc;
      if (
        editForm.thresholdCount !== undefined &&
        editForm.thresholdCount !== currentItem.thresholdCount
      )
        payload.thresholdCount =
          editForm.thresholdCount != null ? Number(editForm.thresholdCount) : null;
      if (editForm.purchaseDate) {
        const d = String(editForm.purchaseDate).trim();
        const currentPd = currentItem.purchaseDate ? currentItem.purchaseDate.slice(0, 10) : '';
        if (d !== currentPd) {
          payload.purchaseDate = d ? `${d}T00:00:00Z` : undefined;
        }
      }

      const packStr = String(editForm.conversionFactor ?? '').trim();
      const curPackFactor = currentItem.unitConversions?.factor ?? currentItem.unitsPerPack ?? null;
      if (packStr !== '') {
        const f = parseFloat(packStr);
        if (!isNaN(f) && f > 0 && f !== curPackFactor) {
          payload.unitConversions = {
            unit: currentItem.unitConversions?.unit?.trim() || 'SALE UNIT',
            factor: f,
          };
          payload.baseUnit = currentItem.baseUnit?.trim() || 'BASE UNIT';
        }
      }

      const editSchemeType = String(
        editForm.schemeType ?? currentItem.schemeType ?? 'FIXED_UNITS',
      ) as SchemeType;
      if (editSchemeType !== (currentItem.schemeType ?? 'FIXED_UNITS')) {
        payload.schemeType = editSchemeType;
      }

      const saleSchemeRaw = String(editForm.saleScheme ?? '').trim();
      const currentSaleScheme = formatSaleSchemeDisplay(currentItem);
      if (saleSchemeRaw !== currentSaleScheme) {
        if (saleSchemeRaw === '') {
          payload.schemeType = 'FIXED_UNITS';
          payload.schemePayFor = null;
          payload.schemeFree = null;
          payload.schemePercentage = null;
          payload.scheme = null;
        } else {
          const parsed = parseSaleSchemeDraft(saleSchemeRaw);
          if (parsed) {
            payload.schemeType = parsed.schemeType;
            payload.schemePayFor = parsed.schemePayFor;
            payload.schemeFree = parsed.schemeFree;
            payload.schemePercentage = parsed.schemePercentage;
            payload.scheme = null;
          }
        }
      }

      const purchaseDiscStr = String(editForm.purchaseAdditionalDiscount ?? '').trim();
      const purchaseDisc = purchaseDiscStr !== '' ? parseFloat(purchaseDiscStr) : null;
      const curPurchaseDisc = currentItem.purchaseAdditionalDiscount ?? null;
      if (purchaseDisc !== curPurchaseDisc && (purchaseDisc != null || curPurchaseDisc != null)) {
        payload.purchaseAdditionalDiscount = purchaseDisc;
      }

      const editPurchaseSchemeType = String(
        editForm.purchaseSchemeType ?? currentItem.purchaseSchemeType ?? 'FIXED_UNITS',
      ) as SchemeType;
      if (editPurchaseSchemeType !== (currentItem.purchaseSchemeType ?? 'FIXED_UNITS')) {
        payload.purchaseSchemeType = editPurchaseSchemeType;
      }

      const purchaseSchemeRaw = String(editForm.purchaseScheme ?? '').trim();
      const currentPurchaseScheme = formatPurchaseSchemeDisplay(currentItem);
      if (purchaseSchemeRaw !== currentPurchaseScheme) {
        if (purchaseSchemeRaw === '') {
          payload.purchaseSchemePayFor = null;
          payload.purchaseSchemeFree = null;
          payload.purchaseSchemePercentage = null;
        } else {
          const parsed = parsePurchaseSchemeDraft(purchaseSchemeRaw);
          if (parsed) {
            payload.purchaseSchemeType = parsed.purchaseSchemeType;
            payload.purchaseSchemePayFor = parsed.purchaseSchemePayFor;
            payload.purchaseSchemeFree = parsed.purchaseSchemeFree;
            payload.purchaseSchemePercentage = parsed.purchaseSchemePercentage;
          }
        }
      }

      const editItemType = String(editForm.itemType ?? 'NORMAL') as ItemType;
      if (editItemType !== (currentItem.itemType ?? 'NORMAL')) {
        payload.itemType = editItemType;
        if (editItemType !== 'DEGREE') {
          payload.itemTypeDegree = null;
        }
      }
      const degreeStr = String(editForm.itemTypeDegree ?? '').trim();
      if (editItemType === 'DEGREE' || currentItem.itemType === 'DEGREE') {
        const deg = degreeStr !== '' ? parseInt(degreeStr, 10) : NaN;
        if (!isNaN(deg) && deg > 0 && deg !== currentItem.itemTypeDegree) {
          payload.itemType = 'DEGREE';
          payload.itemTypeDegree = deg;
        }
      }

      const editDisc = String(editForm.discountApplicable ?? '').trim();
      const curDisc = currentItem.discountApplicable ?? '';
      if (editDisc !== curDisc) {
        payload.discountApplicable = editDisc === '' ? null : (editDisc as DiscountApplicable);
      }

      if (editForm.expiryDate) {
        const d = String(editForm.expiryDate).trim();
        const currentExp = usesExtension
          ? currentItem.verticalFields?.expiryDate
            ? String(currentItem.verticalFields.expiryDate).slice(0, 10)
            : ''
          : currentItem.expiryDate
          ? currentItem.expiryDate.slice(0, 10)
          : '';
        if (d !== currentExp) {
          const iso = d ? `${d}T00:00:00Z` : undefined;
          if (usesExtension) {
            verticalPatch.expiryDate = iso ?? null;
            verticalChanged = true;
          } else {
            payload.expiryDate = iso;
          }
        }
      }

      if (verticalChanged) {
        payload.verticalFields = verticalPatch;
      }

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const filtered: UpdateInventoryRequest = {};
      const allowPayloadKey = (key: keyof UpdateInventoryRequest) => {
        if (!productSearchAccess?.canEdit && productSearchAccess) {
          return false;
        }
        if (productSearchAccess?.editMode === 'FULL_EDIT' || !productSearchAccess) {
          return true;
        }
        if (key === 'unitConversions' || key === 'baseUnit') {
          return (
            productSearchAccess.editableFields.includes('unitsPerPack') ||
            productSearchAccess.editableFields.includes('baseUnit')
          );
        }
        if (key === 'verticalFields' && payload.verticalFields) {
          return Object.keys(payload.verticalFields).every((k) =>
            productSearchAccess.editableFields.includes(k),
          );
        }
        return productSearchAccess.editableFields.includes(String(key));
      };
      for (const [key, value] of Object.entries(payload)) {
        if (allowPayloadKey(key as keyof UpdateInventoryRequest)) {
          (filtered as Record<string, unknown>)[key] = value;
        }
      }
      if (Object.keys(filtered).length === 0) {
        notifyError('No changes allowed with your current product edit permissions');
        return;
      }

      const updated = await inventoryApi.update(inventoryDocumentId, filtered);
      notifySuccess('Product updated successfully');
      onUpdated?.(updated);
      setIsEditing(false);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setIsSaving(false);
    }
  };

  const updateEditField = (key: string, value: string | number | null) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  if (!open || !item) return null;

  return (
    <Modal open onClose={onClose} size="lg">
      <Inline
        justify="between"
        align="center"
        gap="md"
        padding="lg"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <Inline gap="md" align="center" style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: '2rem', lineHeight: 1 }}>📦</Text>
          <Stack gap="xs">
            <Text variant="heading3">{item?.name ?? item?.barcode ?? 'Item Details'}</Text>
            {item?.companyName ? <Text color="secondary">{item.companyName}</Text> : null}
          </Stack>
        </Inline>
        <Inline gap="sm" align="center">
          {allowEditMode && !isEditing ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleEditClick}
              aria-label="Edit product"
            >
              Edit
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </Inline>
      </Inline>

      <Modal.Body>
        <Box padding="lg" overflow="auto" style={{ maxHeight: '70vh' }}>
          <Box style={{ marginBottom: '1.5rem' }}>
            <SectionHeader icon="📋" title="Product Information" />
            <Grid columns={2} gap="sm">
              <DetailField icon="🏷️" label="Product Name">
                {showEditor('name') ? (
                  <Input
                    type="text"
                    value={String(editForm.name ?? '')}
                    onChange={(e) => updateEditField('name', e.target.value)}
                    placeholder="Product name"
                  />
                ) : (
                  <DetailValue>{item?.name ?? '—'}</DetailValue>
                )}
              </DetailField>
              <DetailField icon="🧾" label="Billing Mode">
                <DetailValue>{item?.billingMode === 'BASIC' ? 'BASIC' : 'REGULAR'}</DetailValue>
              </DetailField>
              <DetailField icon="🏢" label="Company">
                {showEditor('companyName') ? (
                  <Input
                    type="text"
                    value={String(editForm.companyName ?? '')}
                    onChange={(e) => updateEditField('companyName', e.target.value)}
                    placeholder="Company"
                  />
                ) : (
                  <DetailValue>{item?.companyName ?? '—'}</DetailValue>
                )}
              </DetailField>
              <DetailField icon="🔖" label="Barcode">
                {showEditor('barcode') ? (
                  <Input
                    type="text"
                    value={String(editForm.barcode ?? '')}
                    onChange={(e) => updateEditField('barcode', e.target.value)}
                    placeholder="Barcode"
                  />
                ) : (
                  <DetailValue>{item?.barcode ?? '—'}</DetailValue>
                )}
              </DetailField>
              {item?.lotId ? (
                <DetailField icon="📦" label="Lot ID">
                  <DetailValue>{item.lotId}</DetailValue>
                </DetailField>
              ) : null}
              <DetailField icon="📍" label="Location">
                {isEditing ? (
                  <Input
                    type="text"
                    value={String(editForm.location ?? '')}
                    onChange={(e) => updateEditField('location', e.target.value)}
                    placeholder="Location"
                  />
                ) : (
                  <DetailValue>{item?.location ?? '—'}</DetailValue>
                )}
              </DetailField>
              <DetailField icon="🔢" label="HSN">
                {isEditing ? (
                  <Input
                    type="text"
                    value={String(editForm.hsn ?? '')}
                    onChange={(e) => updateEditField('hsn', e.target.value)}
                    placeholder="HSN"
                  />
                ) : (
                  <DetailValue>{item?.hsn ?? '—'}</DetailValue>
                )}
              </DetailField>
              {item?.sac ? (
                <DetailField icon="🔢" label="SAC">
                  <DetailValue>{item.sac}</DetailValue>
                </DetailField>
              ) : null}
              <DetailField icon="🏭" label="Batch No">
                {isEditing ? (
                  <Input
                    type="text"
                    value={String(editForm.batchNo ?? '')}
                    onChange={(e) => updateEditField('batchNo', e.target.value)}
                    placeholder="Batch No"
                  />
                ) : (
                  <DetailValue>{getInventoryBatchNo(item)}</DetailValue>
                )}
              </DetailField>
              {item?.createdAt ? (
                <DetailField icon="📅" label="Created At">
                  <DetailValue>
                    {new Date(item.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </DetailValue>
                </DetailField>
              ) : null}
              <DetailField icon="📝" label="Description" fullWidth>
                {isEditing ? (
                  <Textarea
                    rows={2}
                    value={String(editForm.description ?? '')}
                    onChange={(e) => updateEditField('description', e.target.value)}
                    placeholder="Description"
                  />
                ) : (
                  <DetailValue>{item?.description ?? '—'}</DetailValue>
                )}
              </DetailField>
            </Grid>
          </Box>

          <Box style={{ marginBottom: '1.5rem' }}>
            <SectionHeader icon="📦" title="Stock & packaging" />
            <Grid columns={2} gap="sm">
              <DetailField icon="🔢" label="Current stock">
                <DetailValue>
                  {item.currentCount}
                  {isEditing ? (
                    <Text
                      variant="caption"
                      color="secondary"
                      style={{ display: 'block', marginTop: '0.35rem' }}
                    >
                      Quantity changes via sales and purchases only
                    </Text>
                  ) : null}
                </DetailValue>
              </DetailField>
              <DetailField icon="📥" label="Received">
                <DetailValue>{item.receivedCount}</DetailValue>
              </DetailField>
              <DetailField icon="📤" label="Sold">
                <DetailValue>{item.soldCount}</DetailValue>
              </DetailField>
              <DetailField icon="📐" label="Packaging">
                {isEditing ? (
                  <Inline gap="sm" align="center">
                    <Text aria-hidden style={{ flexShrink: 0 }}>
                      1 ×
                    </Text>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={String(editForm.conversionFactor ?? '')}
                      onChange={(e) =>
                        updateEditField('conversionFactor', stripLeadingZeros(e.target.value))
                      }
                      placeholder="e.g. 10"
                    />
                  </Inline>
                ) : (
                  <DetailValue>{packagingFactorDisplay(item)}</DetailValue>
                )}
              </DetailField>
              <DetailField icon="📅" label="Expiry date">
                {isEditing ? (
                  <Input
                    type="date"
                    value={String(editForm.expiryDate ?? '')}
                    onChange={(e) => updateEditField('expiryDate', e.target.value)}
                  />
                ) : (
                  <DetailValue>{formatInventoryExpiryDate(item)}</DetailValue>
                )}
              </DetailField>
              <DetailField icon="🛒" label="Purchase date">
                {isEditing ? (
                  <Input
                    type="date"
                    value={String(editForm.purchaseDate ?? '')}
                    onChange={(e) => updateEditField('purchaseDate', e.target.value)}
                  />
                ) : (
                  <DetailValue>
                    {item.purchaseDate
                      ? new Date(item.purchaseDate).toLocaleDateString('en-IN')
                      : '—'}
                  </DetailValue>
                )}
              </DetailField>
              <DetailField icon="⚠️" label="Low-stock threshold">
                {isEditing ? (
                  <Input
                    type="number"
                    min={0}
                    value={editForm.thresholdCount ?? ''}
                    onChange={(e) =>
                      updateEditField(
                        'thresholdCount',
                        e.target.value === '' ? null : Number(e.target.value),
                      )
                    }
                    placeholder="Threshold"
                  />
                ) : (
                  <DetailValue>{item.thresholdCount ?? '—'}</DetailValue>
                )}
              </DetailField>
            </Grid>
          </Box>

          <Box style={{ marginBottom: '1.5rem' }}>
            <SectionHeader icon="🎁" title="Schemes & attributes" />
            <Grid columns={2} gap="sm">
              <DetailField label="Sale deal type">
                {isEditing ? (
                  <Select
                    options={SCHEME_TYPE_OPTIONS}
                    value={String(editForm.schemeType ?? 'FIXED_UNITS')}
                    onChange={(e) => updateEditField('schemeType', e.target.value)}
                  />
                ) : (
                  <DetailValue>
                    {(item.schemeType ?? 'FIXED_UNITS') === 'PERCENTAGE'
                      ? 'Percentage'
                      : 'Free units'}
                  </DetailValue>
                )}
              </DetailField>
              <DetailField label="Sale scheme">
                {isEditing ? (
                  <Input
                    type="text"
                    value={String(editForm.saleScheme ?? '')}
                    onChange={(e) => updateEditField('saleScheme', e.target.value)}
                    placeholder="e.g. 10+2 or 15%"
                  />
                ) : (
                  <DetailValue>{formatSaleSchemeDisplay(item) || '—'}</DetailValue>
                )}
              </DetailField>
              <DetailField label="Purchase deal type">
                {isEditing ? (
                  <Select
                    options={SCHEME_TYPE_OPTIONS}
                    value={String(editForm.purchaseSchemeType ?? 'FIXED_UNITS')}
                    onChange={(e) => updateEditField('purchaseSchemeType', e.target.value)}
                  />
                ) : (
                  <DetailValue>
                    {(item.purchaseSchemeType ?? 'FIXED_UNITS') === 'PERCENTAGE'
                      ? 'Percentage'
                      : 'Free units'}
                  </DetailValue>
                )}
              </DetailField>
              <DetailField label="Purchase scheme">
                {isEditing ? (
                  <Input
                    type="text"
                    value={String(editForm.purchaseScheme ?? '')}
                    onChange={(e) => updateEditField('purchaseScheme', e.target.value)}
                    placeholder="e.g. 10+2 or 15%"
                  />
                ) : (
                  <DetailValue>{formatPurchaseSchemeDisplay(item) || '—'}</DetailValue>
                )}
              </DetailField>
              <DetailField label="Purchase add. discount (%)">
                {isEditing ? (
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editForm.purchaseAdditionalDiscount ?? ''}
                    onChange={(e) => {
                      const v = stripLeadingZeros(e.target.value);
                      updateEditField('purchaseAdditionalDiscount', v === '' ? '' : v);
                    }}
                    placeholder="0"
                  />
                ) : (
                  <DetailValue>
                    {item.purchaseAdditionalDiscount != null
                      ? `${item.purchaseAdditionalDiscount}%`
                      : '—'}
                  </DetailValue>
                )}
              </DetailField>
              <DetailField label="Item type">
                {isEditing ? (
                  <Select
                    options={ITEM_TYPE_OPTIONS}
                    value={String(editForm.itemType ?? 'NORMAL')}
                    onChange={(e) => updateEditField('itemType', e.target.value)}
                  />
                ) : (
                  <DetailValue>
                    {item.itemType === 'DEGREE' && item.itemTypeDegree != null
                      ? `Temperature (${item.itemTypeDegree}°)`
                      : item.itemType ?? 'Normal'}
                  </DetailValue>
                )}
              </DetailField>
              {isEditing || item.itemType === 'DEGREE' || editForm.itemType === 'DEGREE' ? (
                <DetailField label="Temperature (°)">
                  {isEditing ? (
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={String(editForm.itemTypeDegree ?? '')}
                      onChange={(e) => updateEditField('itemTypeDegree', e.target.value)}
                      disabled={String(editForm.itemType ?? item.itemType) !== 'DEGREE'}
                    />
                  ) : (
                    <DetailValue>{item.itemTypeDegree ?? '—'}</DetailValue>
                  )}
                </DetailField>
              ) : null}
              <DetailField label="Discount applicable">
                {isEditing ? (
                  <Select
                    options={DISCOUNT_OPTIONS}
                    value={String(editForm.discountApplicable ?? '')}
                    onChange={(e) => updateEditField('discountApplicable', e.target.value)}
                  />
                ) : (
                  <DetailValue>{item.discountApplicable ?? '—'}</DetailValue>
                )}
              </DetailField>
            </Grid>
          </Box>

          <Box style={{ marginBottom: '1.5rem' }}>
            <SectionHeader icon="💰" title="Pricing" />
            <Grid columns={2} gap="sm">
              <DetailField icon="💵" label="Selling Price (PTR)">
                {isEditing ? (
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editForm.priceToRetail ?? ''}
                    onChange={(e) =>
                      updateEditField('priceToRetail', stripLeadingZeros(e.target.value))
                    }
                    placeholder="0.00"
                  />
                ) : (
                  <DetailValue weight="semibold">
                    ₹
                    {(item?.sellingPrice ?? item?.priceToRetail) != null
                      ? (item?.sellingPrice ?? item?.priceToRetail)!.toFixed(2)
                      : '—'}
                  </DetailValue>
                )}
              </DetailField>
              <DetailField icon="🏷️" label="MRP">
                {isEditing ? (
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editForm.maximumRetailPrice ?? ''}
                    onChange={(e) =>
                      updateEditField('maximumRetailPrice', stripLeadingZeros(e.target.value))
                    }
                    placeholder="0.00"
                  />
                ) : (
                  <DetailValue weight="semibold">
                    ₹{item?.maximumRetailPrice?.toFixed(2) ?? '—'}
                  </DetailValue>
                )}
              </DetailField>
              <DetailField icon="₹" label="Price to stockist (PTS)">
                {isEditing ? (
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editForm.costPrice ?? ''}
                    onChange={(e) =>
                      updateEditField('costPrice', stripLeadingZeros(e.target.value))
                    }
                    placeholder="0.00"
                  />
                ) : (
                  <DetailValue weight="semibold">₹{item?.costPrice?.toFixed(2) ?? '—'}</DetailValue>
                )}
              </DetailField>
              {item?.billingMode !== 'BASIC' ? (
                <DetailField icon="📊" label="SGST (%)">
                  {isEditing ? (
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={String(editForm.sgst ?? '')}
                      onChange={(e) => updateEditField('sgst', stripLeadingZeros(e.target.value))}
                      placeholder="e.g. 2.5"
                    />
                  ) : (
                    <DetailValue>{item?.sgst ? `${item.sgst}%` : '—'}</DetailValue>
                  )}
                </DetailField>
              ) : null}
              {item?.billingMode !== 'BASIC' ? (
                <DetailField icon="📊" label="CGST (%)">
                  {isEditing ? (
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={String(editForm.cgst ?? '')}
                      onChange={(e) => updateEditField('cgst', stripLeadingZeros(e.target.value))}
                      placeholder="e.g. 2.5"
                    />
                  ) : (
                    <DetailValue>{item?.cgst ? `${item.cgst}%` : '—'}</DetailValue>
                  )}
                </DetailField>
              ) : null}
              <DetailField icon="🎯" label="Sale add. discount (%)">
                {isEditing ? (
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editForm.saleAdditionalDiscount ?? ''}
                    onChange={(e) => {
                      const v = stripLeadingZeros(e.target.value);
                      updateEditField('saleAdditionalDiscount', v === '' ? '' : v);
                    }}
                    placeholder="0"
                  />
                ) : (
                  <DetailValue>
                    {item?.saleAdditionalDiscount != null ? `${item.saleAdditionalDiscount}%` : '—'}
                  </DetailValue>
                )}
              </DetailField>
            </Grid>
            {item?.pricingId ? (
              <Box style={{ marginTop: '1rem' }}>
                <RouterLink
                  to={`/dashboard/price-edit/${item.pricingId}`}
                  state={{
                    priceToRetail: item.priceToRetail,
                    maximumRetailPrice: item.maximumRetailPrice,
                    productName: item.name,
                    rates: item.rates ?? undefined,
                    defaultRate: item.defaultRate ?? undefined,
                  }}
                >
                  <Text style={{ color: 'var(--link-color, #2563eb)', fontWeight: 600 }}>
                    Edit price
                  </Text>
                </RouterLink>
              </Box>
            ) : null}
          </Box>

          {item?.vendorId ? (
            <Box style={{ marginBottom: '1.5rem' }}>
              <SectionHeader icon="👤" title="Vendor Information" />
              {loadingVendor ? (
                <CenteredLoader label="Loading vendor details..." />
              ) : vendorError ? (
                <Alert variant="danger">{vendorError}</Alert>
              ) : vendor ? (
                <Grid columns={2} gap="sm">
                  <DetailField icon="👤" label="Vendor Name">
                    <DetailValue>{vendor.name}</DetailValue>
                  </DetailField>
                  {vendor.companyName ? (
                    <DetailField icon="🏢" label="Company">
                      <DetailValue>{vendor.companyName}</DetailValue>
                    </DetailField>
                  ) : null}
                  {vendor.contactEmail ? (
                    <DetailField icon="📧" label="Email">
                      <DetailValue>
                        <Link href={`mailto:${vendor.contactEmail}`}>{vendor.contactEmail}</Link>
                      </DetailValue>
                    </DetailField>
                  ) : null}
                  {vendor.contactPhone ? (
                    <DetailField icon="📞" label="Phone">
                      <DetailValue>
                        <Link href={`tel:${vendor.contactPhone}`}>{vendor.contactPhone}</Link>
                      </DetailValue>
                    </DetailField>
                  ) : null}
                  {vendor.address ? (
                    <DetailField icon="📍" label="Address" fullWidth>
                      <DetailValue>{vendor.address}</DetailValue>
                    </DetailField>
                  ) : null}
                  {vendor.businessType ? (
                    <DetailField icon="🏭" label="Business Type">
                      <DetailValue>{vendor.businessType}</DetailValue>
                    </DetailField>
                  ) : null}
                </Grid>
              ) : (
                <EmptyState title="No vendor information available" />
              )}
            </Box>
          ) : null}
        </Box>
      </Modal.Body>

      {allowEditMode && isEditing ? (
        <Modal.Footer>
          <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" variant="solid" onClick={handleSave} loading={isSaving}>
            {isSaving ? 'Saving...' : 'Save changes'}
          </Button>
        </Modal.Footer>
      ) : null}
    </Modal>
  );
}
