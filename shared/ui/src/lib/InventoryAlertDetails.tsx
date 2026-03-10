import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router';
import { vendorsApi, inventoryApi } from '@inventory-platform/api';
import type { VendorResponse, InventoryItem, UpdateInventoryRequest } from '@inventory-platform/types';
import { useNotify } from '@inventory-platform/store';
import styles from './InventoryAlertDetails.module.css';

export interface InventoryAlertDetailsProps {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  /** When true, shows Edit button and allows in-modal editing */
  editable?: boolean;
  /** Called after successful update so parent can refresh the item */
  onUpdated?: (updated: InventoryItem) => void;
}

export function InventoryAlertDetails({
  open,
  item,
  onClose,
  editable = false,
  onUpdated,
}: InventoryAlertDetailsProps) {
  const [vendor, setVendor] = useState<VendorResponse | null>(null);
  const [loadingVendor, setLoadingVendor] = useState(false);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string | number | null>>({});
  const { success: notifySuccess, error: notifyError } = useNotify;

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
    setEditForm({
      name: d.name ?? '',
      barcode: d.barcode ?? '',
      description: d.description ?? '',
      companyName: d.companyName ?? '',
      location: d.location ?? '',
      hsn: d.hsn ?? '',
      batchNo: d.batchNo ?? '',
      maximumRetailPrice: fmtNum(d.maximumRetailPrice),
      costPrice: fmtNum(d.costPrice),
      priceToRetail: fmtNum(d.priceToRetail),
      sgst: d.sgst ?? '',
      cgst: d.cgst ?? '',
      additionalDiscount: d.additionalDiscount != null ? String(d.additionalDiscount) : '',
      thresholdCount: d.thresholdCount ?? null,
      expiryDate: d.expiryDate ? d.expiryDate.slice(0, 10) : '',
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
    if (!item?.id) return;
    setIsSaving(true);
    try {
      const payload: UpdateInventoryRequest = {};
      if (editForm.name !== undefined && editForm.name !== item.name)
        payload.name = String(editForm.name) || undefined;
      if (editForm.barcode !== undefined && editForm.barcode !== item.barcode)
        payload.barcode = String(editForm.barcode) || undefined;
      if (editForm.description !== undefined && editForm.description !== item.description)
        payload.description = String(editForm.description) || undefined;
      if (editForm.companyName !== undefined && editForm.companyName !== item.companyName)
        payload.companyName = String(editForm.companyName) || undefined;
      if (editForm.location !== undefined && editForm.location !== item.location)
        payload.location = String(editForm.location) || undefined;
      if (editForm.hsn !== undefined && editForm.hsn !== item.hsn)
        payload.hsn = String(editForm.hsn) || undefined;
      if (editForm.batchNo !== undefined && editForm.batchNo !== item.batchNo)
        payload.batchNo = String(editForm.batchNo) || undefined;
      const mrp = editForm.maximumRetailPrice != null && String(editForm.maximumRetailPrice).trim() !== ''
        ? parseFloat(String(editForm.maximumRetailPrice)) : NaN;
      const cost = editForm.costPrice != null && String(editForm.costPrice).trim() !== ''
        ? parseFloat(String(editForm.costPrice)) : NaN;
      const ptr = editForm.priceToRetail != null && String(editForm.priceToRetail).trim() !== ''
        ? parseFloat(String(editForm.priceToRetail)) : NaN;
      if (!Number.isNaN(mrp) && mrp !== item.maximumRetailPrice)
        payload.maximumRetailPrice = mrp;
      if (!Number.isNaN(cost) && cost !== item.costPrice)
        payload.costPrice = cost;
      if (!Number.isNaN(ptr) && ptr !== item.priceToRetail)
        payload.priceToRetail = ptr;
      if (editForm.sgst !== undefined && String(editForm.sgst).trim() !== String(item.sgst ?? '').trim())
        payload.sgst = String(editForm.sgst).trim() || undefined;
      if (editForm.cgst !== undefined && String(editForm.cgst).trim() !== String(item.cgst ?? '').trim())
        payload.cgst = String(editForm.cgst).trim() || undefined;
      const addDiscStr = String(editForm.additionalDiscount ?? '').trim();
      const addDisc = addDiscStr !== '' ? parseFloat(addDiscStr) : null;
      const currentAddDisc = item.additionalDiscount ?? null;
      if (addDisc !== currentAddDisc && (addDisc != null || currentAddDisc != null))
        payload.additionalDiscount = addDisc;
      if (editForm.thresholdCount !== undefined && editForm.thresholdCount !== item.thresholdCount)
        payload.thresholdCount = editForm.thresholdCount != null ? Number(editForm.thresholdCount) : null;
      if (editForm.expiryDate) {
        const d = String(editForm.expiryDate).trim();
        payload.expiryDate = d ? `${d}T00:00:00Z` : undefined;
      }
      if (editForm.purchaseDate) {
        const d = String(editForm.purchaseDate).trim();
        payload.purchaseDate = d ? `${d}T00:00:00Z` : undefined;
      }

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }
      const updated = await inventoryApi.update(item.id, payload);
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
            {editable && !isEditing && (
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
                  {isEditing ? (
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
                  {isEditing ? (
                    <input
                      type="text"
                      className={styles.editInput}
                      value={String(editForm.companyName ?? '')}
                      onChange={(e) => updateEditField('companyName', e.target.value)}
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
                  {isEditing ? (
                    <input
                      type="text"
                      className={styles.editInput}
                      value={String(editForm.barcode ?? '')}
                      onChange={(e) => updateEditField('barcode', e.target.value)}
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
                      onChange={(e) => updateEditField('location', e.target.value)}
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
                      onChange={(e) => updateEditField('batchNo', e.target.value)}
                      placeholder="Batch No"
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {item?.batchNo ?? '—'}
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
              {(item?.itemType || item?.itemTypeDegree != null) && (
                <div className={styles.detailCard}>
                  <div className={styles.detailIcon}>📐</div>
                  <div className={styles.detailContent}>
                    <span className={styles.detailLabel}>Item Type</span>
                    <span className={styles.detailValue}>
                      {item.itemType === 'DEGREE' && item.itemTypeDegree != null
                        ? `Temperature for the item (${item.itemTypeDegree}°)`
                        : item.itemType === 'COSTLY'
                          ? 'Costly'
                          : item.itemType === 'NORMAL'
                            ? 'Normal'
                            : item.itemType ?? '—'}
                    </span>
                  </div>
                </div>
              )}
              {item?.discountApplicable && (
                <div className={styles.detailCard}>
                  <div className={styles.detailIcon}>🏷️</div>
                  <div className={styles.detailContent}>
                    <span className={styles.detailLabel}>Discount applicable</span>
                    <span className={styles.detailValue}>
                      {item.discountApplicable === 'DISCOUNT'
                        ? 'Discount applicable'
                        : item.discountApplicable === 'SCHEME'
                          ? 'Scheme applicable'
                          : 'Both discount and scheme applicable'}
                    </span>
                  </div>
                </div>
              )}
              {item?.purchaseDate && (
                <div className={styles.detailCard}>
                  <div className={styles.detailIcon}>🛒</div>
                  <div className={styles.detailContent}>
                    <span className={styles.detailLabel}>Purchase date</span>
                    <span className={styles.detailValue}>
                      {new Date(item.purchaseDate).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              )}
              {(() => {
                const schemeType = item?.schemeType ?? 'FIXED_UNITS';
                if (schemeType === 'PERCENTAGE' && item?.schemePercentage != null) {
                  return (
                    <div className={styles.detailCard}>
                      <div className={styles.detailIcon}>🎁</div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Scheme</span>
                        <span className={styles.detailValue}>
                          {item.schemePercentage}% extra free
                        </span>
                      </div>
                    </div>
                  );
                }
                if (
                  (schemeType === 'FIXED_UNITS' || !item?.schemeType) &&
                  item?.scheme != null &&
                  item.scheme > 0
                ) {
                  return (
                    <div className={styles.detailCard}>
                      <div className={styles.detailIcon}>🎁</div>
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Scheme</span>
                        <span className={styles.detailValue}>
                          {item.scheme} free
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              <div className={styles.detailCardFull}>
                <div className={styles.detailIcon}>📝</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Description</span>
                  {isEditing ? (
                    <textarea
                      className={styles.editInput}
                      rows={2}
                      value={String(editForm.description ?? '')}
                      onChange={(e) => updateEditField('description', e.target.value)}
                      placeholder="Description"
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {item?.description ?? '—'}
                    </span>
                  )}
                </div>
              </div>
              {isEditing && (
                <>
                  <div className={styles.detailCard}>
                    <div className={styles.detailIcon}>📅</div>
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>Expiry Date</span>
                      <input
                        type="date"
                        className={styles.editInput}
                        value={String(editForm.expiryDate ?? '')}
                        onChange={(e) => updateEditField('expiryDate', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className={styles.detailCard}>
                    <div className={styles.detailIcon}>🛒</div>
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>Purchase Date</span>
                      <input
                        type="date"
                        className={styles.editInput}
                        value={String(editForm.purchaseDate ?? '')}
                        onChange={(e) => updateEditField('purchaseDate', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className={styles.detailCard}>
                    <div className={styles.detailIcon}>⚠️</div>
                    <div className={styles.detailContent}>
                      <span className={styles.detailLabel}>Threshold Count</span>
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
                    </div>
                  </div>
                </>
              )}
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
                  <span className={styles.detailLabel}>Selling Price (PTR)</span>
                  {isEditing ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      className={styles.editInput}
                      value={editForm.priceToRetail ?? ''}
                      onChange={(e) =>
                        updateEditField('priceToRetail', stripLeadingZeros(e.target.value))
                      }
                      placeholder="0.00"
                    />
                  ) : (
                    <span className={`${styles.detailValue} ${styles.priceValue}`}>
                      ₹{(item?.sellingPrice ?? item?.priceToRetail) != null ? (item?.sellingPrice ?? item?.priceToRetail)!.toFixed(2) : '—'}
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
                        updateEditField('maximumRetailPrice', stripLeadingZeros(e.target.value))
                      }
                      placeholder="0.00"
                    />
                  ) : (
                    <span className={`${styles.detailValue} ${styles.mrpValue}`}>
                      ₹{item?.maximumRetailPrice?.toFixed(2) ?? '—'}
                    </span>
                  )}
                </div>
              </div>
              <div className={`${styles.detailCard} ${styles.pricingCard}`}>
                <div className={styles.detailIcon}>₹</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Price to stockist (PTS)</span>
                  {isEditing ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      className={styles.editInput}
                      value={editForm.costPrice ?? ''}
                      onChange={(e) =>
                        updateEditField('costPrice', stripLeadingZeros(e.target.value))
                      }
                      placeholder="0.00"
                    />
                  ) : (
                    <span className={`${styles.detailValue} ${styles.costValue}`}>
                      ₹{item?.costPrice?.toFixed(2) ?? '—'}
                    </span>
                  )}
                </div>
              </div>
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
                      onChange={(e) => updateEditField('sgst', stripLeadingZeros(e.target.value))}
                      placeholder="e.g. 2.5"
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {item?.sgst ? `${item.sgst}%` : '—'}
                    </span>
                  )}
                </div>
              </div>
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
                      onChange={(e) => updateEditField('cgst', stripLeadingZeros(e.target.value))}
                      placeholder="e.g. 2.5"
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {item?.cgst ? `${item.cgst}%` : '—'}
                    </span>
                  )}
                </div>
              </div>
              <div className={`${styles.detailCard} ${styles.pricingCard}`}>
                <div className={styles.detailIcon}>🎯</div>
                <div className={styles.detailContent}>
                  <span className={styles.detailLabel}>Additional Discount (%)</span>
                  {isEditing ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      className={styles.editInput}
                      value={editForm.additionalDiscount ?? ''}
                      onChange={(e) => {
                        const v = stripLeadingZeros(e.target.value);
                        updateEditField('additionalDiscount', v === '' ? '' : v);
                      }}
                      placeholder="0"
                    />
                  ) : (
                    <span className={styles.detailValue}>
                      {item?.additionalDiscount != null ? `${item.additionalDiscount}%` : '—'}
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
          {editable && isEditing && (
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
