import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link as RouterLink } from 'react-router';
import { inventoryApi, resolveInventoryDocumentId } from '../api/inventory.api';
import { getShopAvailableDisplayCount } from '../lib/inventoryAvailability';
import { splitUpdateByAccess } from '../lib/productEditPermissions';
import { barcodesApi } from '../api/barcodes.api';
import { openLocalBarcodeLabelPrint } from '../lib/printBarcodeLabels';
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
import type { VerticalSchemaFieldDef } from '@inventory-platform/schema/types';
import {
  buildVerticalFieldsUpdate,
  initVerticalDraft,
  schemaOnlyFields,
  type VerticalDraft,
} from '../lib/verticalFieldsEdit';
import { useInventoryVerticalFields } from '../vertical/useInventoryVerticalFields';
import { DetailField, DetailValue, SectionHeader } from './productDetails/DetailPrimitives';
import { VerticalFieldsSection } from './productDetails/VerticalFieldsSection';
import {
  Alert,
  Box,
  Button,
  CenteredLoader,
  EmptyState,
  Grid,
  Icon,
  Inline,
  Input,
  Link,
  Modal,
  Select,
  Spinner,
  Stack,
  Text,
  Textarea,
  type SelectOptionDef,
  productChrome,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import {
  AlertTriangle,
  Banknote,
  Barcode,
  Building2,
  Calendar,
  ClipboardList,
  Factory,
  FileText,
  Gift,
  Hash,
  IndianRupee,
  Mail,
  MapPin,
  Package,
  PackageMinus,
  PackagePlus,
  Percent,
  Phone,
  Printer,
  Receipt,
  Ruler,
  ShoppingCart,
  Tag,
  Thermometer,
  User,
  Wand2,
  X,
} from 'lucide-react';
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
  const baseUnit = item.baseUnit?.trim() || item.uqc?.trim() || '';
  if (factor != null && factor > 0) {
    return `1 × ${factor} ${baseUnit || 'units'}`;
  }
  return baseUnit || '—';
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
  const [isGeneratingBarcode, setIsGeneratingBarcode] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string | number | null>>({});
  const [verticalDraft, setVerticalDraft] = useState<VerticalDraft>({});
  const { success: notifySuccess, error: notifyError } = useNotify;

  // Vertical-owned fields the shop's schema declares for this product's billing mode. The ones
  // this modal already renders by hand are left out; the rest get a generic schema-driven section.
  const { fields: allVerticalFields } = useInventoryVerticalFields(item?.billingMode);
  const extraVerticalFields = useMemo(
    () => schemaOnlyFields(allVerticalFields),
    [allVerticalFields],
  );

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
    setEditForm({
      name: d.name ?? '',
      barcode: d.barcode ?? '',
      description: d.description ?? '',
      companyName: d.companyName ?? '',
      location: d.location ?? '',
      hsn: d.hsn ?? '',
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
    });
    setVerticalDraft(initVerticalDraft(d, extraVerticalFields));
  }, [item, extraVerticalFields]);

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
    setVerticalDraft({});
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

      // Vertical fields come from the schema-driven section. Only the keys that changed are
      // sent: the server merges the bag with what it already holds, and per-field edit
      // permissions are checked against exactly these keys.
      const schemaUpdate = buildVerticalFieldsUpdate(
        currentItem,
        extraVerticalFields,
        verticalDraft,
      );
      Object.assign(payload as Record<string, unknown>, schemaUpdate.core);
      if (Object.keys(schemaUpdate.extension).length > 0) {
        payload.verticalFields = schemaUpdate.extension;
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

      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const { allowed, refused } = splitUpdateByAccess(payload, productSearchAccess);
      if (refused.length > 0) {
        notifyError(`You are not allowed to edit: ${refused.join(', ')}`);
        return;
      }

      const updated = await inventoryApi.update(inventoryDocumentId, allowed);
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

  const updateVerticalField = (field: VerticalSchemaFieldDef, value: string) => {
    setVerticalDraft((prev) => ({ ...prev, [field.key]: value }));
  };

  if (!open || !item) return null;

  return (
    <Modal open onClose={onClose} size="lg">
      <Box className={productChrome.detailModalHeader}>
        <Box className={productChrome.detailModalHeaderMain}>
          <Box className={productChrome.detailModalHeroIcon} aria-hidden>
            <Icon icon={Package} size="md" />
          </Box>
          <Stack gap="xs" minWidth="0">
            <Text variant="heading3">{item?.name ?? item?.barcode ?? 'Item Details'}</Text>
            {item?.companyName ? <Text color="secondary">{item.companyName}</Text> : null}
          </Stack>
        </Box>
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
            <Icon icon={X} size="sm" />
          </Button>
        </Inline>
      </Box>

      <Modal.Body>
        <Box padding="lg">
          <Box className={productChrome.detailSection}>
            <SectionHeader icon={ClipboardList} title="Product Information" />
            <Grid columns={2} gap="sm">
              <DetailField icon={Tag} label="Product Name">
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
              <DetailField icon={Receipt} label="Billing Mode">
                <DetailValue>{item?.billingMode === 'BASIC' ? 'Basic' : 'Regular'}</DetailValue>
              </DetailField>
              <DetailField icon={Building2} label="Company">
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
              <DetailField icon={Barcode} label="Barcode">
                {showEditor('barcode') ? (
                  <Inline gap="sm" align="center">
                    <Input
                      type="text"
                      value={String(editForm.barcode ?? '')}
                      onChange={(e) => updateEditField('barcode', e.target.value)}
                      placeholder="Barcode"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isGeneratingBarcode || isSaving}
                      aria-label="Generate barcode"
                      onClick={() => {
                        void (async () => {
                          setIsGeneratingBarcode(true);
                          try {
                            const code = await barcodesApi.generateOne();
                            updateEditField('barcode', code);
                          } catch (err) {
                            notifyError(
                              err instanceof Error ? err.message : 'Failed to generate barcode',
                            );
                          } finally {
                            setIsGeneratingBarcode(false);
                          }
                        })();
                      }}
                    >
                      {isGeneratingBarcode ? (
                        <Spinner size="sm" />
                      ) : (
                        <Icon icon={Wand2} size="sm" />
                      )}
                    </Button>
                  </Inline>
                ) : (
                  <Inline gap="sm" align="center">
                    <DetailValue>{item?.barcode ?? '—'}</DetailValue>
                    {item?.barcode ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Print barcode sticker"
                        onClick={() => {
                          try {
                            openLocalBarcodeLabelPrint([
                              {
                                code: item.barcode!,
                                name: item.name,
                                companyName: item.companyName,
                              },
                            ]);
                          } catch (err) {
                            notifyError(
                              err instanceof Error ? err.message : 'Failed to print barcode',
                            );
                          }
                        }}
                      >
                        <Icon icon={Printer} size="sm" />
                      </Button>
                    ) : null}
                  </Inline>
                )}
              </DetailField>
              <DetailField icon={MapPin} label="Location">
                {showEditor('location') ? (
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
              <DetailField icon={Hash} label="HSN">
                {showEditor('hsn') ? (
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
                <DetailField icon={Hash} label="SAC">
                  <DetailValue>{item.sac}</DetailValue>
                </DetailField>
              ) : null}
              {item?.createdAt ? (
                <DetailField icon={Calendar} label="Created At">
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
              <DetailField icon={FileText} label="Description" fullWidth>
                {showEditor('description') ? (
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

          <VerticalFieldsSection
            title="Additional fields"
            fields={extraVerticalFields}
            item={item}
            draft={verticalDraft}
            isEditing={isEditing}
            canEdit={canEditField}
            onChange={updateVerticalField}
          />

          <Box className={productChrome.detailSection}>
            <SectionHeader icon={Package} title="Stock & packaging" />
            <Grid columns={2} gap="sm">
              <DetailField icon={Hash} label="Current stock">
                <DetailValue>
                  {item.currentCount}
                  {isEditing ? (
                    <Text variant="caption" color="secondary" className={surfaceChrome.blockHint}>
                      Quantity changes via sales and purchases only
                    </Text>
                  ) : null}
                </DetailValue>
              </DetailField>
              {item.availableCount != null || item.availableBaseCount != null ? (
                <DetailField icon={Package} label="Available">
                  <DetailValue>{getShopAvailableDisplayCount(item)}</DetailValue>
                </DetailField>
              ) : null}
              <DetailField icon={PackagePlus} label="Received">
                <DetailValue>{item.receivedCount}</DetailValue>
              </DetailField>
              <DetailField icon={PackageMinus} label="Sold">
                <DetailValue>{item.soldCount}</DetailValue>
              </DetailField>
              <DetailField icon={Ruler} label="Packaging">
                {showEditor('conversionFactor') ? (
                  <Inline gap="sm" align="center">
                    <Text aria-hidden className={surfaceChrome.flexShrink0}>
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
              {/* Set at stock-in; the API rejects a changed purchase date. */}
              <DetailField icon={ShoppingCart} label="Purchase date">
                <DetailValue>
                  {item.purchaseDate
                    ? new Date(item.purchaseDate).toLocaleDateString('en-IN')
                    : '—'}
                </DetailValue>
              </DetailField>
              <DetailField icon={AlertTriangle} label="Low-stock threshold">
                {showEditor('thresholdCount') ? (
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

          <Box className={productChrome.detailSection}>
            <SectionHeader icon={Gift} title="Schemes & attributes" />
            <Grid columns={2} gap="sm">
              <DetailField icon={Gift} label="Sale deal type">
                {showEditor('schemeType') ? (
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
              <DetailField icon={Percent} label="Sale scheme">
                {showEditor('saleScheme') ? (
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
              <DetailField icon={ShoppingCart} label="Purchase deal type">
                {showEditor('purchaseSchemeType') ? (
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
              <DetailField icon={Percent} label="Purchase scheme">
                {showEditor('purchaseScheme') ? (
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
              <DetailField icon={Percent} label="Purchase add. discount (%)">
                {showEditor('purchaseAdditionalDiscount') ? (
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
              <DetailField icon={Tag} label="Item type">
                {showEditor('itemType') ? (
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
                <DetailField icon={Thermometer} label="Temperature (°)">
                  {showEditor('itemTypeDegree') ? (
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
              <DetailField icon={Percent} label="Discount applicable">
                {showEditor('discountApplicable') ? (
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

          <Box className={productChrome.detailSection}>
            <SectionHeader icon={IndianRupee} title="Pricing" />
            <Grid columns={2} gap="sm">
              <DetailField icon={Banknote} label="Selling Price (PTR)">
                {showEditor('priceToRetail') ? (
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
              <DetailField icon={Tag} label="MRP">
                {showEditor('maximumRetailPrice') ? (
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
              <DetailField icon={IndianRupee} label="Price to stockist (PTS)">
                {showEditor('costPrice') ? (
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
                <DetailField icon={Percent} label="SGST (%)">
                  {showEditor('sgst') ? (
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
                <DetailField icon={Percent} label="CGST (%)">
                  {showEditor('cgst') ? (
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
              <DetailField icon={Percent} label="Sale add. discount (%)">
                {showEditor('saleAdditionalDiscount') ? (
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
              <Box mt="md">
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
                  <Text className={surfaceChrome.linkStrong}>Edit price</Text>
                </RouterLink>
              </Box>
            ) : null}
          </Box>

          {item?.vendorId ? (
            <Box className={productChrome.detailSection}>
              <SectionHeader icon={User} title="Vendor Information" />
              {loadingVendor ? (
                <CenteredLoader label="Loading vendor details..." />
              ) : vendorError ? (
                <Alert variant="danger">{vendorError}</Alert>
              ) : vendor ? (
                <Grid columns={2} gap="sm">
                  <DetailField icon={User} label="Vendor Name">
                    <DetailValue>{vendor.name}</DetailValue>
                  </DetailField>
                  {vendor.companyName ? (
                    <DetailField icon={Building2} label="Company">
                      <DetailValue>{vendor.companyName}</DetailValue>
                    </DetailField>
                  ) : null}
                  {vendor.contactEmail ? (
                    <DetailField icon={Mail} label="Email">
                      <DetailValue>
                        <Link href={`mailto:${vendor.contactEmail}`}>{vendor.contactEmail}</Link>
                      </DetailValue>
                    </DetailField>
                  ) : null}
                  {vendor.contactPhone ? (
                    <DetailField icon={Phone} label="Phone">
                      <DetailValue>
                        <Link href={`tel:${vendor.contactPhone}`}>{vendor.contactPhone}</Link>
                      </DetailValue>
                    </DetailField>
                  ) : null}
                  {vendor.address ? (
                    <DetailField icon={MapPin} label="Address" fullWidth>
                      <DetailValue>{vendor.address}</DetailValue>
                    </DetailField>
                  ) : null}
                  {vendor.businessType ? (
                    <DetailField icon={Factory} label="Business Type">
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
