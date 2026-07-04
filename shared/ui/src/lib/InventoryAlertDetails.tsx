import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router';
import {
  inventoryApi,
  resolveInventoryDocumentId,
} from '@inventory-platform/api';
import { vendorsClient } from './vendorsClient';
import type {
  VendorResponse,
  InventoryItem,
  UpdateInventoryRequest,
  SchemeType,
  ItemType,
  DiscountApplicable,
  ShopProductSearchAccess,
} from '@inventory-platform/types';
import {
  canEditProductSearchUiField,
  hasProductSearchEditAccess,
} from '@inventory-platform/types';
import { useNotify } from '@inventory-platform/store';
import {
  itemUsesExtensionBag,
  getInventoryBatchNo,
  formatInventoryExpiryDate,
} from './verticalSchemaUtils';
import styles from './InventoryAlertDetails.module.css';

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
  const [editForm, setEditForm] = useState<
    Record<string, string | number | null>
  >({});
  const { success: notifySuccess, error: notifyError } = useNotify;

  const canEditField = (uiKey: string) =>
    canEditProductSearchUiField(uiKey, productSearchAccess);
  const allowEditMode =
    editable && hasProductSearchEditAccess(productSearchAccess);
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
      batchNo:
        batchFromBag != null && batchFromBag !== ''
          ? String(batchFromBag)
          : d.batchNo ?? '',
      maximumRetailPrice: fmtNum(d.maximumRetailPrice),
      costPrice: fmtNum(d.costPrice),
      priceToRetail: fmtNum(d.priceToRetail),
      sgst: d.sgst ?? '',
      cgst: d.cgst ?? '',
      conversionFactor:
        packFactor != null && packFactor > 0 ? String(packFactor) : '',
      schemeType: d.schemeType ?? 'FIXED_UNITS',
      saleScheme: formatSaleSchemeDisplay(d),
      saleAdditionalDiscount:
        d.saleAdditionalDiscount != null
          ? String(d.saleAdditionalDiscount)
          : '',
      purchaseSchemeType: d.purchaseSchemeType ?? 'FIXED_UNITS',
      purchaseScheme: formatPurchaseSchemeDisplay(d),
      purchaseAdditionalDiscount:
        d.purchaseAdditionalDiscount != null
          ? String(d.purchaseAdditionalDiscount)
          : '',
      itemType: d.itemType ?? 'NORMAL',
      itemTypeDegree:
        d.itemTypeDegree != null ? String(d.itemTypeDegree) : '',
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
        vendorsClient
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
      if (
        editForm.description !== undefined &&
        editForm.description !== currentItem.description
      )
        payload.description = String(editForm.description) || undefined;
      if (
        editForm.companyName !== undefined &&
        editForm.companyName !== currentItem.companyName
      )
        payload.companyName = String(editForm.companyName) || undefined;
      if (
        editForm.location !== undefined &&
        editForm.location !== currentItem.location
      )
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
          (usesExtension
            ? String(currentItem.verticalFields?.batchNo ?? '')
            : currentItem.batchNo)
      ) {
        if (usesExtension) {
          verticalPatch.batchNo = String(editForm.batchNo) || null;
          verticalChanged = true;
        } else {
          payload.batchNo = String(editForm.batchNo) || undefined;
        }
      }
      const mrp =
        editForm.maximumRetailPrice != null &&
        String(editForm.maximumRetailPrice).trim() !== ''
          ? parseFloat(String(editForm.maximumRetailPrice))
          : NaN;
      const cost =
        editForm.costPrice != null && String(editForm.costPrice).trim() !== ''
          ? parseFloat(String(editForm.costPrice))
          : NaN;
      const ptr =
        editForm.priceToRetail != null &&
        String(editForm.priceToRetail).trim() !== ''
          ? parseFloat(String(editForm.priceToRetail))
          : NaN;
      if (!Number.isNaN(mrp) && mrp !== currentItem.maximumRetailPrice)
        payload.maximumRetailPrice = mrp;
      if (!Number.isNaN(cost) && cost !== currentItem.costPrice)
        payload.costPrice = cost;
      if (!Number.isNaN(ptr) && ptr !== currentItem.priceToRetail)
        payload.priceToRetail = ptr;
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
      if (
        addDisc !== currentAddDisc &&
        (addDisc != null || currentAddDisc != null)
      )
        payload.saleAdditionalDiscount = addDisc;
      if (
        editForm.thresholdCount !== undefined &&
        editForm.thresholdCount !== currentItem.thresholdCount
      )
        payload.thresholdCount =
          editForm.thresholdCount != null
            ? Number(editForm.thresholdCount)
            : null;
      if (editForm.purchaseDate) {
        const d = String(editForm.purchaseDate).trim();
        const currentPd = currentItem.purchaseDate
          ? currentItem.purchaseDate.slice(0, 10)
          : '';
        if (d !== currentPd) {
          payload.purchaseDate = d ? `${d}T00:00:00Z` : undefined;
        }
      }

      const packStr = String(editForm.conversionFactor ?? '').trim();
      const curPackFactor =
        currentItem.unitConversions?.factor ?? currentItem.unitsPerPack ?? null;
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
        editForm.schemeType ?? currentItem.schemeType ?? 'FIXED_UNITS'
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

      const purchaseDiscStr = String(
        editForm.purchaseAdditionalDiscount ?? ''
      ).trim();
      const purchaseDisc =
        purchaseDiscStr !== '' ? parseFloat(purchaseDiscStr) : null;
      const curPurchaseDisc = currentItem.purchaseAdditionalDiscount ?? null;
      if (
        purchaseDisc !== curPurchaseDisc &&
        (purchaseDisc != null || curPurchaseDisc != null)
      ) {
        payload.purchaseAdditionalDiscount = purchaseDisc;
      }

      const editPurchaseSchemeType = String(
        editForm.purchaseSchemeType ?? currentItem.purchaseSchemeType ?? 'FIXED_UNITS'
      ) as SchemeType;
      if (
        editPurchaseSchemeType !== (currentItem.purchaseSchemeType ?? 'FIXED_UNITS')
      ) {
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
            payload.purchaseSchemePercentage =
              parsed.purchaseSchemePercentage;
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
        payload.discountApplicable =
          editDisc === '' ? null : (editDisc as DiscountApplicable);
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
          return productSearchAccess.editableFields.includes('unitsPerPack')
            || productSearchAccess.editableFields.includes('baseUnit');
        }
        if (key === 'verticalFields' && payload.verticalFields) {
          return Object.keys(payload.verticalFields).every((k) =>
            productSearchAccess.editableFields.includes(k)
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
      notifyError(
        err instanceof Error ? err.message : 'Failed to update product'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const updateEditField = (key: string, value: string | number | null) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  if (!open || !item) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <div className={styles.productIcon}>📦</div>
            <div>
              <h3>{item?.name ?? item?.barcode ?? 'Item Details'}</h3>
              {item?.companyName && (
                <p className={styles.headerSubtitle}>{item.companyName}</p>
              )}
            </div>
          </div>
          <div className={styles.headerActions}>
            {allowEditMode && !isEditing && (
              <button
                type="button"
                className={styles.editBtn}
                onClick={handleEditClick}
                aria-label="Edit product"
              >
                Edit
              </button>
            )}
            <button
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className={styles.modalBody}>
          {/* Product Information Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>📋</span>
              <h4 className={styles.sectionTitle}>Product Information</h4>
            </div>
            <div className={styles.detailsGrid}>
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>🏷️</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Product Name</span>
                  {showEditor('name') ? (
                    <input
                      type="text"
                      className={styles.editInput}
                      value={String(editForm.name ?? '')}
                      onChange={(e) => updateEditField('name', e.target.value)}
                      placeholder="Product name"
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {item?.name ?? '—'}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>🧾</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Billing Mode</span>
                  <span className={styles.detailValue}>
                    {item?.billingMode === 'BASIC' ? 'BASIC' : 'REGULAR'}
                  </span>
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>🏢</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Company</span>
                  {showEditor('companyName') ? (
                    <input
                      type="text"
                      className={styles.editInput}
                      value={String(editForm.companyName ?? '')}
                      onChange={(e) =>
                        updateEditField('companyName', e.target.value)
                      }
                      placeholder="Company"
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {item?.companyName ?? '—'}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>🔖</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Barcode</span>
                  {showEditor('barcode') ? (
                    <input
                      type="text"
                      className={styles.editInput}
                      value={String(editForm.barcode ?? '')}
                      onChange={(e) =>
                        updateEditField('barcode', e.target.value)
                      }
                      placeholder="Barcode"
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {item?.barcode ?? '—'}
                    </span>
                  )}
                </div>
              </div>
              {item?.lotId && (
                <div className={styles.detailCard}>
                  <div className={styles.detailIcon}>📦</div>
                  <div className={styles.detailContent}>
                    <span className={styles.detailLabel}>Lot ID</span>
                    <span className={styles.detailValue}>{item.lotId}</span>
                  </div>
                </div>
              )}
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>📍</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Location</span>
                  {isEditing ? (
                    <input
                      type="text"
                      className={styles.editInput}
                      value={String(editForm.location ?? '')}
                      onChange={(e) =>
                        updateEditField('location', e.target.value)
                      }
                      placeholder="Location"
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {item?.location ?? '—'}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>🔢</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>HSN</span>
                  {isEditing ? (
                    <input
                      type="text"
                      className={styles.editInput}
                      value={String(editForm.hsn ?? '')}
                      onChange={(e) => updateEditField('hsn', e.target.value)}
                      placeholder="HSN"
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {item?.hsn ?? '—'}
                    </span>
                  )}
                </div>
              </div>
              {item?.sac && (
                <div className={styles.detailCard}>
                  <div className={styles.detailIcon}>🔢</div>
                  <div className={styles.detailContent}>
                    <span className={styles.detailLabel}>SAC</span>
                    <span className={styles.detailValue}>{item.sac}</span>
                  </div>
                </div>
              )}
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>🏭</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Batch No</span>
                  {isEditing ? (
                    <input
                      type="text"
                      className={styles.editInput}
                      value={String(editForm.batchNo ?? '')}
                      onChange={(e) =>
                        updateEditField('batchNo', e.target.value)
                      }
                      placeholder="Batch No"
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {getInventoryBatchNo(item)}
                    </span>
                  )}
                </div>
              </div>
              {item?.createdAt && (
                <div className={styles.detailCard}>
                  <div className={styles.detailIcon}>📅</div>
                  <div className={styles.detailContent}>
                    <span className={styles.detailLabel}>Created At</span>
                    <span className={styles.detailValue}>
                      {new Date(item.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              )}
              <div className={styles.detailCardFull}>
                <div className={styles.detailIcon}>📝</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Description</span>
                  {isEditing ? (
                    <textarea
                      className={styles.editInput}
                      rows={2}
                      value={String(editForm.description ?? '')}
                      onChange={(e) =>
                        updateEditField('description', e.target.value)
                      }
                      placeholder="Description"
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {item?.description ?? '—'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>📦</span>
              <h4 className={styles.sectionTitle}>Stock & packaging</h4>
            </div>
            <div className={styles.detailsGrid}>
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>🔢</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Current stock</span>
                  <span className={styles.detailValue}>
                    {item.currentCount}
                    {isEditing && (
                      <span className={styles.fieldHint}>
                        Quantity changes via sales and purchases only
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>📥</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Received</span>
                  <span className={styles.detailValue}>{item.receivedCount}</span>
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>📤</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Sold</span>
                  <span className={styles.detailValue}>{item.soldCount}</span>
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>📐</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Packaging</span>
                  {isEditing ? (
                    <div className={styles.packagingEditWrap}>
                      <span className={styles.packagingPrefix} aria-hidden>
                        1 ×
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={styles.editInput}
                        value={String(editForm.conversionFactor ?? '')}
                        onChange={(e) =>
                          updateEditField(
                            'conversionFactor',
                            stripLeadingZeros(e.target.value)
                          )
                        }
                        placeholder="e.g. 10"
                      />
                    </div>
                  ) : (
                    <span className={styles.detailValue}>
                      {packagingFactorDisplay(item)}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>📅</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Expiry date</span>
                  {isEditing ? (
                    <input
                      type="date"
                      className={styles.editInput}
                      value={String(editForm.expiryDate ?? '')}
                      onChange={(e) =>
                        updateEditField('expiryDate', e.target.value)
                      }
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {formatInventoryExpiryDate(item)}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>🛒</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Purchase date</span>
                  {isEditing ? (
                    <input
                      type="date"
                      className={styles.editInput}
                      value={String(editForm.purchaseDate ?? '')}
                      onChange={(e) =>
                        updateEditField('purchaseDate', e.target.value)
                      }
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {item.purchaseDate
                        ? new Date(item.purchaseDate).toLocaleDateString('en-IN')
                        : '—'}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailIcon}>⚠️</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Low-stock threshold</span>
                  {isEditing ? (
                    <input
                      type="number"
                      className={styles.editInput}
                      min={0}
                      value={editForm.thresholdCount ?? ''}
                      onChange={(e) =>
                        updateEditField(
                          'thresholdCount',
                          e.target.value === '' ? null : Number(e.target.value)
                        )
                      }
                      placeholder="Threshold"
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {item.thresholdCount ?? '—'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>🎁</span>
              <h4 className={styles.sectionTitle}>Schemes & attributes</h4>
            </div>
            <div className={styles.detailsGrid}>
              <div className={styles.detailCard}>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Sale deal type</span>
                  {isEditing ? (
                    <select
                      className={styles.editSelect}
                      value={String(editForm.schemeType ?? 'FIXED_UNITS')}
                      onChange={(e) =>
                        updateEditField('schemeType', e.target.value)
                      }
                    >
                      <option value="FIXED_UNITS">Free units</option>
                      <option value="PERCENTAGE">Percentage</option>
                    </select>
                  ) : (
                    <span className={styles.detailValue}>
                      {(item.schemeType ?? 'FIXED_UNITS') === 'PERCENTAGE'
                        ? 'Percentage'
                        : 'Free units'}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Sale scheme</span>
                  {isEditing ? (
                    <input
                      type="text"
                      className={styles.editInput}
                      value={String(editForm.saleScheme ?? '')}
                      onChange={(e) =>
                        updateEditField('saleScheme', e.target.value)
                      }
                      placeholder="e.g. 10+2 or 15%"
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {formatSaleSchemeDisplay(item) || '—'}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Purchase deal type</span>
                  {isEditing ? (
                    <select
                      className={styles.editSelect}
                      value={String(
                        editForm.purchaseSchemeType ?? 'FIXED_UNITS'
                      )}
                      onChange={(e) =>
                        updateEditField('purchaseSchemeType', e.target.value)
                      }
                    >
                      <option value="FIXED_UNITS">Free units</option>
                      <option value="PERCENTAGE">Percentage</option>
                    </select>
                  ) : (
                    <span className={styles.detailValue}>
                      {(item.purchaseSchemeType ?? 'FIXED_UNITS') ===
                      'PERCENTAGE'
                        ? 'Percentage'
                        : 'Free units'}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Purchase scheme</span>
                  {isEditing ? (
                    <input
                      type="text"
                      className={styles.editInput}
                      value={String(editForm.purchaseScheme ?? '')}
                      onChange={(e) =>
                        updateEditField('purchaseScheme', e.target.value)
                      }
                      placeholder="e.g. 10+2 or 15%"
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {formatPurchaseSchemeDisplay(item) || '—'}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>
                    Purchase add. discount (%)
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      className={styles.editInput}
                      value={editForm.purchaseAdditionalDiscount ?? ''}
                      onChange={(e) => {
                        const v = stripLeadingZeros(e.target.value);
                        updateEditField(
                          'purchaseAdditionalDiscount',
                          v === '' ? '' : v
                        );
                      }}
                      placeholder="0"
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {item.purchaseAdditionalDiscount != null
                        ? `${item.purchaseAdditionalDiscount}%`
                        : '—'}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Item type</span>
                  {isEditing ? (
                    <select
                      className={styles.editSelect}
                      value={String(editForm.itemType ?? 'NORMAL')}
                      onChange={(e) =>
                        updateEditField('itemType', e.target.value)
                      }
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="COSTLY">Costly</option>
                      <option value="DEGREE">Temperature / °</option>
                    </select>
                  ) : (
                    <span className={styles.detailValue}>
                      {item.itemType === 'DEGREE' && item.itemTypeDegree != null
                        ? `Temperature (${item.itemTypeDegree}°)`
                        : item.itemType ?? 'Normal'}
                    </span>
                  )}
                </div>
              </div>
              {(isEditing ||
                item.itemType === 'DEGREE' ||
                editForm.itemType === 'DEGREE') && (
                <div className={styles.detailCard}>
                  <div className={styles.detailContent}>
                    <span className={styles.detailLabel}>Temperature (°)</span>
                    {isEditing ? (
                      <input
                        type="number"
                        className={styles.editInput}
                        min={1}
                        step={1}
                        value={String(editForm.itemTypeDegree ?? '')}
                        onChange={(e) =>
                          updateEditField('itemTypeDegree', e.target.value)
                        }
                        disabled={
                          String(editForm.itemType ?? item.itemType) !==
                          'DEGREE'
                        }
                      />
                    ) : (
                      <span className={styles.detailValue}>
                        {item.itemTypeDegree ?? '—'}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className={styles.detailCard}>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Discount applicable</span>
                  {isEditing ? (
                    <select
                      className={styles.editSelect}
                      value={String(editForm.discountApplicable ?? '')}
                      onChange={(e) =>
                        updateEditField('discountApplicable', e.target.value)
                      }
                    >
                      <option value="">—</option>
                      <option value="DISCOUNT">Discount</option>
                      <option value="SCHEME">Scheme</option>
                      <option value="DISCOUNT_AND_SCHEME">Both</option>
                    </select>
                  ) : (
                    <span className={styles.detailValue}>
                      {item.discountApplicable ?? '—'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Information Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionIcon}>💰</span>
              <h4 className={styles.sectionTitle}>Pricing</h4>
            </div>
            <div className={styles.pricingGrid}>
              <div className={`${styles.detailCard} ${styles.pricingCard}`}>
                <div className={styles.detailIcon}>💵</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>
                    Selling Price (PTR)
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      className={styles.editInput}
                      value={editForm.priceToRetail ?? ''}
                      onChange={(e) =>
                        updateEditField(
                          'priceToRetail',
                          stripLeadingZeros(e.target.value)
                        )
                      }
                      placeholder="0.00"
                    />
                  ) : (
                    <span
                      className={`${styles.detailValue} ${styles.priceValue}`}
                    >
                      ₹
                      {(item?.sellingPrice ?? item?.priceToRetail) != null
                        ? (item?.sellingPrice ?? item?.priceToRetail)!.toFixed(
                            2
                          )
                        : '—'}
                    </span>
                  )}
                </div>
              </div>
              <div className={`${styles.detailCard} ${styles.pricingCard}`}>
                <div className={styles.detailIcon}>🏷️</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>MRP</span>
                  {isEditing ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      className={styles.editInput}
                      value={editForm.maximumRetailPrice ?? ''}
                      onChange={(e) =>
                        updateEditField(
                          'maximumRetailPrice',
                          stripLeadingZeros(e.target.value)
                        )
                      }
                      placeholder="0.00"
                    />
                  ) : (
                    <span
                      className={`${styles.detailValue} ${styles.mrpValue}`}
                    >
                      ₹{item?.maximumRetailPrice?.toFixed(2) ?? '—'}
                    </span>
                  )}
                </div>
              </div>
              <div className={`${styles.detailCard} ${styles.pricingCard}`}>
                <div className={styles.detailIcon}>₹</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>
                    Price to stockist (PTS)
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      className={styles.editInput}
                      value={editForm.costPrice ?? ''}
                      onChange={(e) =>
                        updateEditField(
                          'costPrice',
                          stripLeadingZeros(e.target.value)
                        )
                      }
                      placeholder="0.00"
                    />
                  ) : (
                    <span
                      className={`${styles.detailValue} ${styles.costValue}`}
                    >
                      ₹{item?.costPrice?.toFixed(2) ?? '—'}
                    </span>
                  )}
                </div>
              </div>
              {item?.billingMode !== 'BASIC' && (
                <div className={`${styles.detailCard} ${styles.pricingCard}`}>
                  <div className={styles.detailIcon}>📊</div>
                  <div className={styles.detailContent}>
                    <span className={styles.detailLabel}>SGST (%)</span>
                    {isEditing ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        className={styles.editInput}
                        value={String(editForm.sgst ?? '')}
                        onChange={(e) =>
                          updateEditField(
                            'sgst',
                            stripLeadingZeros(e.target.value)
                          )
                        }
                        placeholder="e.g. 2.5"
                      />
                    ) : (
                      <span className={styles.detailValue}>
                        {item?.sgst ? `${item.sgst}%` : '—'}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {item?.billingMode !== 'BASIC' && (
                <div className={`${styles.detailCard} ${styles.pricingCard}`}>
                  <div className={styles.detailIcon}>📊</div>
                  <div className={styles.detailContent}>
                    <span className={styles.detailLabel}>CGST (%)</span>
                    {isEditing ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        className={styles.editInput}
                        value={String(editForm.cgst ?? '')}
                        onChange={(e) =>
                          updateEditField(
                            'cgst',
                            stripLeadingZeros(e.target.value)
                          )
                        }
                        placeholder="e.g. 2.5"
                      />
                    ) : (
                      <span className={styles.detailValue}>
                        {item?.cgst ? `${item.cgst}%` : '—'}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className={`${styles.detailCard} ${styles.pricingCard}`}>
                <div className={styles.detailIcon}>🎯</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>
                    Sale add. discount (%)
                  </span>
                  {isEditing ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      className={styles.editInput}
                      value={editForm.saleAdditionalDiscount ?? ''}
                      onChange={(e) => {
                        const v = stripLeadingZeros(e.target.value);
                        updateEditField(
                          'saleAdditionalDiscount',
                          v === '' ? '' : v
                        );
                      }}
                      placeholder="0"
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {item?.saleAdditionalDiscount != null
                        ? `${item.saleAdditionalDiscount}%`
                        : '—'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {item?.pricingId && (
              <div className={styles.pricingActions}>
                <Link
                  to={`/dashboard/price-edit/${item.pricingId}`}
                  state={{
                    priceToRetail: item.priceToRetail,
                    maximumRetailPrice: item.maximumRetailPrice,
                    productName: item.name,
                    rates: item.rates ?? undefined,
                    defaultRate: item.defaultRate ?? undefined,
                  }}
                  className={styles.editPriceLink}
                >
                  Edit price
                </Link>
              </div>
            )}
          </div>

          {/* Vendor Information Section */}
          {item?.vendorId && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>👤</span>
                <h4 className={styles.sectionTitle}>Vendor Information</h4>
              </div>
              {loadingVendor ? (
                <div className={styles.loading}>
                  <span className={styles.loadingSpinner}>⏳</span>
                  Loading vendor details...
                </div>
              ) : vendorError ? (
                <div className={styles.error}>
                  <span className={styles.errorIcon}>⚠️</span>
                  {vendorError}
                </div>
              ) : vendor ? (
                <div className={styles.detailsGrid}>
                  <div className={styles.detailCard}>
                    <div className={styles.detailIcon}>👤</div>
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>Vendor Name</span>
                      <span className={styles.detailValue}>{vendor.name}</span>
                    </div>
                  </div>
                  {vendor.companyName && (
                    <div className={styles.detailCard}>
                      <div className={styles.detailIcon}>🏢</div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Company</span>
                        <span className={styles.detailValue}>
                          {vendor.companyName}
                        </span>
                      </div>
                    </div>
                  )}
                  {vendor.contactEmail && (
                    <div className={styles.detailCard}>
                      <div className={styles.detailIcon}>📧</div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Email</span>
                        <span className={styles.detailValue}>
                          <a
                            href={`mailto:${vendor.contactEmail}`}
                            className={styles.link}
                          >
                            {vendor.contactEmail}
                          </a>
                        </span>
                      </div>
                    </div>
                  )}
                  {vendor.contactPhone && (
                    <div className={styles.detailCard}>
                      <div className={styles.detailIcon}>📞</div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Phone</span>
                        <span className={styles.detailValue}>
                          <a
                            href={`tel:${vendor.contactPhone}`}
                            className={styles.link}
                          >
                            {vendor.contactPhone}
                          </a>
                        </span>
                      </div>
                    </div>
                  )}
                  {vendor.address && (
                    <div className={styles.detailCardFull}>
                      <div className={styles.detailIcon}>📍</div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Address</span>
                        <span className={styles.detailValue}>
                          {vendor.address}
                        </span>
                      </div>
                    </div>
                  )}
                  {vendor.businessType && (
                    <div className={styles.detailCard}>
                      <div className={styles.detailIcon}>🏭</div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>
                          Business Type
                        </span>
                        <span className={styles.detailValue}>
                          {vendor.businessType}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>ℹ️</span>
                  No vendor information available
                </div>
              )}
            </div>
          )}
          {allowEditMode && isEditing && (
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
