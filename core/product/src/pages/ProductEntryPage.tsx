import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import { uploadApi } from '@inventory-platform/product/api';
import { apiClient } from '@inventory-platform/api-client';
import { userLookupApi } from '@inventory-platform/user/users';
import { inventoryApi } from '../api/inventory.api';
import { productApi } from '../api/product.api';
import { barcodesApi } from '../api/barcodes.api';
import { mapLastInventoryToRegistrationPatch } from '../lib/registrationPrefill';
import { PrintBarcodeLabelsModal } from '../ui/PrintBarcodeLabelsModal';
import { openLocalBarcodeLabelPrint } from '../lib/printBarcodeLabels';
import { vendorsApi } from '@inventory-platform/user/vendors';
import type {
  CreateInventoryDto,
  BulkCreateInventoryDto,
  ParseInvoiceItem,
  ParsedVendorInvoiceDto,
  VendorPurchaseInvoicePayload,
  UploadStatus,
  ItemType,
  DiscountApplicable,
  SchemeType,
  PurchaseSchemeInputType,
  PackagingUnit,
  BillingMode,
  ProductSuggestion,
} from '@inventory-platform/product/types';
import type { CustomReminderInput } from '@inventory-platform/contracts';
import type {
  LinkableUser,
  Vendor,
  VendorResponse,
  CreateVendorDto,
  VendorBusinessType,
} from '@inventory-platform/user/types';
import type { PricingRate } from '@inventory-platform/contracts';
import type { PaymentMethod, PaymentSplit } from '@inventory-platform/contracts';
import {
  PaymentMethodSplit,
  emptyPaymentSplit,
  isCreditMethod,
  validatePaymentSplit,
  CustomRemindersSection,
} from '../ui';
import {
  VerticalInventoryFields,
  VerticalSchemaFieldInput,
  attachVerticalFieldsToBulkItem,
  fieldLabel,
  formatCoreExpiryDateForApi,
  getVerticalFieldValue,
  hydrateExtensionFieldsOnProduct,
  partitionRegistrationFields,
  registrationFieldsForBilling,
  filterRegistrationFieldsForSimplePricing,
  isRegistrationSchemaReady,
  schemaModeForBilling,
  setVerticalFieldPatch,
  validateProductVerticalFields,
} from '@inventory-platform/schema';
import {
  KEYBOARD_NAV_GRID,
  runFormKeyboardNavigation,
  shouldSkipNestedFormKeyboardNav,
} from '@inventory-platform/routing';
import {
  useNotify,
  useAuthStore,
  useVerticalSchemaStore,
  useShopCapabilitiesStore,
  shopSchemaCacheKey,
} from '@inventory-platform/session';
import type { VerticalSchemaFieldDef } from '@inventory-platform/schema/types';
import {
  VerticalRegistrationGridCells,
  VerticalRegistrationGridCompanyCell,
  VerticalRegistrationGridCompanyHeader,
  VerticalRegistrationGridHeaders,
} from '../vertical/VerticalRegistrationGridCells';
import {
  PackagingUnitInput,
  packagingFactorForDisplay,
  packagingFactorToUnitsPerPack,
  resolvePackagingUqc,
} from '../ui/PackagingFactorInput';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  FormField,
  Inline,
  Input,
  Label,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  Textarea,
  denseDataGrid,
  fileDropzone,
  productChrome,
  cn,
  Icon,
  ViewModeToggle,
} from '@inventory-platform/ui-kit';
import {
  ClipboardList,
  FileText,
  Mail,
  MapPin,
  Phone,
  Plus,
  Printer,
  QrCode,
  Receipt,
  Upload,
  Wand2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  accordionStyles,
  pageStyles,
  uploadLayoutStyles,
  vendorStyles,
} from '../ui/registration-layout-styles';

function VendorDetailField({
  icon,
  label,
  value,
  wide,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <Box className={cn(vendorStyles.detailItem, wide && vendorStyles.detailItemWide)}>
      <Box className={vendorStyles.detailIcon} aria-hidden>
        <Icon icon={icon} size="sm" />
      </Box>
      <Box className={vendorStyles.detailBody}>
        <Text as="span" className={vendorStyles.detailLabel}>
          {label}
        </Text>
        <Text as="span" className={vendorStyles.detailValue}>
          {value}
        </Text>
      </Box>
    </Box>
  );
}

function optionalNumFromString(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatComputedAmount(n: number): string {
  if (!Number.isFinite(n)) return '';
  return String(roundMoney(n));
}

function toReminderIso(value: string): string {
  if (!value.trim()) return '';
  return value.includes('T')
    ? new Date(value).toISOString()
    : new Date(`${value}T00:00:00`).toISOString();
}

/** Maps registration form reminders to API shape (reminderAt + endDate required server-side). */
function mapCustomRemindersForBulkApi(
  reminders: CustomReminderInput[] | undefined,
  productExpiryRaw: string,
): CustomReminderInput[] | null {
  if (!reminders?.length) return null;
  const mapped = reminders
    .filter((r) => r.reminderAt?.trim())
    .map((reminder) => {
      const reminderAt = toReminderIso(reminder.reminderAt);
      let endDate = reminder.endDate?.trim() ? toReminderIso(reminder.endDate) : '';
      if (!endDate && productExpiryRaw.trim()) {
        endDate = toReminderIso(productExpiryRaw);
      }
      if (!endDate) {
        endDate = reminderAt;
      }
      return {
        reminderAt,
        endDate,
        notes: reminder.notes?.trim() || undefined,
      };
    });
  return mapped.length > 0 ? mapped : null;
}

/** Parse GST rate from OCR strings like "9", "9%", " 9 ". */
function parseGstPercent(rate: string | null | undefined): number {
  if (rate == null) return 0;
  const s = String(rate).trim().replace(/%/g, '');
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function numOr0(v: number | null | undefined): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Line subtotal = sum of tax-exclusive line values (PTS/PTR × qty before GST).
 * Tax total = SGST + CGST computed on top of that taxable (not reverse-calculated
 * from a tax-inclusive lump). Matches typical purchase bills: line amount ex-GST + tax.
 */
function computeVendorInvoiceTotalsFromParseItems(items: ParseInvoiceItem[]): {
  lineSubTotal: number;
  taxTotal: number;
} {
  let lineSubTotal = 0;
  let taxTotal = 0;
  for (const item of items) {
    const qtyRaw = item.count;
    const q = qtyRaw != null && Number.isFinite(Number(qtyRaw)) ? Math.max(0, Number(qtyRaw)) : 0;
    // Purchase valuation: PTS (costPrice / stockist) when present — including 0.
    // Do not fall through to PTR (retailer transfer) when PTS is intentionally 0;
    // use PTR only if stockist price was omitted (matches OCR-only-PTR lines).
    const pts = item.costPrice != null ? Number(item.costPrice) : Number.NaN;
    const ptr = Number(item.priceToRetail);
    let unit = 0;
    if (item.costPrice != null && Number.isFinite(pts) && pts >= 0) {
      unit = pts;
    } else if (Number.isFinite(ptr) && ptr > 0) {
      unit = ptr;
    }
    const lineTaxableExclusive = roundMoney(q * unit);
    const sgst = parseGstPercent(item.sgst ?? undefined);
    const cgst = parseGstPercent(item.cgst ?? undefined);
    const pct = sgst + cgst;
    if (pct > 0 && lineTaxableExclusive > 0) {
      const cgstAmt = roundMoney((lineTaxableExclusive * cgst) / 100);
      const sgstAmt = roundMoney((lineTaxableExclusive * sgst) / 100);
      const lineTax = roundMoney(cgstAmt + sgstAmt);
      lineSubTotal += lineTaxableExclusive;
      taxTotal += lineTax;
    } else {
      lineSubTotal += lineTaxableExclusive;
    }
  }
  return {
    lineSubTotal: roundMoney(lineSubTotal),
    taxTotal: roundMoney(taxTotal),
  };
}

function computeVendorInvoiceTotalFromFields(
  lineSubTotal: string,
  taxTotal: string,
  shippingCharge: string,
  otherCharges: string,
  overallDiscount: string,
  roundOff: string,
): string {
  const values = [lineSubTotal, taxTotal, shippingCharge, otherCharges, overallDiscount, roundOff];
  const hasAnyValue = values.some((v) => v.trim() !== '');
  if (!hasAnyValue) return '';

  const total = roundMoney(
    numOr0(optionalNumFromString(lineSubTotal)) +
      numOr0(optionalNumFromString(taxTotal)) +
      numOr0(optionalNumFromString(shippingCharge)) +
      numOr0(optionalNumFromString(otherCharges)) +
      numOr0(optionalNumFromString(roundOff)) -
      numOr0(optionalNumFromString(overallDiscount)),
  );
  return formatComputedAmount(Math.max(0, total));
}

export function meta() {
  return [
    { title: 'Product Entry - StockKart' },
    {
      name: 'description',
      content: 'Entry and manage your product inventory',
    },
  ];
}

interface ProductFormData
  extends Omit<
    CreateInventoryDto,
    'vendorId' | 'lotId' | 'priceToRetail' | 'costPrice' | 'maximumRetailPrice' | 'sellingPrice'
  > {
  id: string; // Unique ID for each product form
  isExpanded: boolean;
  priceToRetail: number | string;
  costPrice: number | string;
  maximumRetailPrice: number | string;
  sellingPrice?: number | string;
  sgst?: string;
  cgst?: string;
  saleAdditionalDiscount?: number | null;
  purchaseSchemeType?: PurchaseSchemeInputType;
  purchaseSchemePayFor?: number | null;
  purchaseSchemeFree?: number | null;
  purchaseSchemePercentage?: number | null;
  /** Free units from vendor (e.g. 60 on 540 paid). Count becomes total received; invoice uses billable + ratio. */
  purchaseSchemeFreeQty?: number | null;
  purchaseAdditionalDiscount?: number | null;
  /** GST UQC base unit (from packaging-units catalog). */
  unitsPerPack?: number;
  /** @deprecated Use unitsPerPack — kept for grid/OCR row mapping. */
  conversionFactor?: number;
  rates?: PricingRate[];
  defaultRate?: string;
  verticalFields?: Record<string, unknown>;
}

/** Parse numeric-ish form fields used for GST valuation (same precedence as OCR lines). */
function numericProductMoney(v: number | string | undefined): number | null {
  if (v === '' || v == null) return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

type PurchaseSchemeFields = Pick<
  ProductFormData,
  | 'purchaseSchemeType'
  | 'purchaseSchemePayFor'
  | 'purchaseSchemeFree'
  | 'purchaseSchemePercentage'
  | 'purchaseSchemeFreeQty'
  | 'purchaseAdditionalDiscount'
>;

function gcdInt(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y > 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/** e.g. paid 540 + free 60 → 9 + 1 */
function schemeRatioFromPaidAndFree(
  paid: number,
  freeQty: number,
): { payFor: number; free: number } {
  const g = gcdInt(paid, freeQty);
  return { payFor: Math.max(1, paid / g), free: freeQty / g };
}

/** Billable qty before applying a new free-quantity scheme (count may already be total). */
function billableCountForPurchaseFreeQty(product: {
  count?: number;
  purchaseSchemeFreeQty?: number | null;
}): number {
  const count = Math.max(0, Number(product.count) || 0);
  const prevFree = product.purchaseSchemeFreeQty;
  if (prevFree != null && prevFree > 0 && count >= prevFree) {
    return Math.max(0, count - prevFree);
  }
  return count;
}

function buildPurchaseFreeQuantityPatch(
  product: ProductFormData,
  freeQty: number,
): Partial<ProductFormData> | null {
  if (freeQty <= 0 || !Number.isFinite(freeQty)) return null;
  const billable = billableCountForPurchaseFreeQty(product);
  if (billable > 0) {
    const { payFor, free } = schemeRatioFromPaidAndFree(billable, freeQty);
    return {
      count: billable + freeQty,
      purchaseSchemeFreeQty: freeQty,
      purchaseSchemeType: 'FIXED_UNITS',
      purchaseSchemePayFor: payFor,
      purchaseSchemeFree: free,
      purchaseSchemePercentage: null,
    };
  }
  // count was 0: entire stock is free → 0 + x (e.g. 0 + 60)
  return {
    count: freeQty,
    purchaseSchemeFreeQty: freeQty,
    purchaseSchemeType: 'FIXED_UNITS',
    purchaseSchemePayFor: 0,
    purchaseSchemeFree: freeQty,
    purchaseSchemePercentage: null,
  };
}

/** Apply Free quantity input: plain "60" or explicit "0+60" / "0 + 60". */
function applyPurchaseFreeQuantityFromRaw(
  product: ProductFormData,
  raw: string,
): Partial<ProductFormData> | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.includes('+')) {
    const parsed = parsePurchaseSchemeDraft(t);
    if (parsed?.purchaseSchemeType !== 'FIXED_UNITS') return null;
    const pay = parsed.purchaseSchemePayFor ?? 0;
    const free = parsed.purchaseSchemeFree ?? 0;
    if (pay < 0 || free < 0 || (pay === 0 && free === 0)) return null;
    const billable = billableCountForPurchaseFreeQty(product);
    return {
      count: billable + pay + free,
      purchaseSchemeFreeQty: free,
      purchaseSchemeType: 'FIXED_UNITS',
      purchaseSchemePayFor: pay,
      purchaseSchemeFree: free,
      purchaseSchemePercentage: null,
    };
  }
  const freeQty = parseInt(t, 10);
  if (isNaN(freeQty) || freeQty < 0) return null;
  return buildPurchaseFreeQuantityPatch(product, freeQty);
}

/** Display pay + free ratio (e.g. 4 + 1) for purchase scheme inputs. */
function formatPurchaseSchemeRatioDisplay(
  payFor: number | null | undefined,
  free: number | null | undefined,
): string {
  if (payFor == null && free == null) return '';
  return `${payFor ?? 0} + ${free ?? 0}`;
}

function formatPurchaseSchemeDealForDisplay(
  product: Pick<
    ProductFormData,
    | 'purchaseSchemeType'
    | 'purchaseSchemePercentage'
    | 'purchaseSchemePayFor'
    | 'purchaseSchemeFree'
  >,
): string {
  if ((product.purchaseSchemeType ?? 'FIXED_UNITS') === 'PERCENTAGE') {
    return product.purchaseSchemePercentage != null ? `${product.purchaseSchemePercentage}%` : '';
  }
  return formatPurchaseSchemeRatioDisplay(product.purchaseSchemePayFor, product.purchaseSchemeFree);
}

function clearPurchaseSchemePatch(product: ProductFormData): Partial<ProductFormData> {
  const patch: Partial<ProductFormData> = {
    purchaseSchemePayFor: null,
    purchaseSchemeFree: null,
    purchaseSchemePercentage: null,
    purchaseSchemeFreeQty: null,
  };
  const prevFree = product.purchaseSchemeFreeQty;
  if (prevFree != null && prevFree > 0) {
    const count = Math.max(0, Number(product.count) || 0);
    const billable = count - prevFree;
    if (billable >= 0) patch.count = billable;
  }
  return patch;
}

/** Parse grid/list draft: "10+2", "8 + 2", "15%". */
function parsePurchaseSchemeDraft(raw: string): PurchaseSchemeFields | null {
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
        purchaseAdditionalDiscount: null,
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
        purchaseAdditionalDiscount: null,
      };
    }
  }
  return null;
}

type SaleSchemeFields = Pick<
  ProductFormData,
  'schemeType' | 'schemePayFor' | 'schemeFree' | 'schemePercentage'
>;

/** Parse grid/list draft: "10+2", "8 + 2", "15%". */
function parseSaleSchemeDraft(raw: string): SaleSchemeFields | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.endsWith('%')) {
    const num = parseFloat(t.slice(0, -1));
    if (!isNaN(num) && num >= -100 && num <= 100) {
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

/** Draft values for grid "fill all rows" row (only non-empty fields are applied). */
interface GridBulkFillDraft {
  barcode?: string;
  name?: string;
  companyName?: string;
  count?: string;
  conversionFactor?: string;
  expiryDate?: string;
  location?: string;
  hsn?: string;
  batchNo?: string;
  costPrice?: string;
  priceToRetail?: string;
  maximumRetailPrice?: string;
  sellingPrice?: string;
  schemeType?: SchemeType | '';
  saleScheme?: string;
  saleAdditionalDiscount?: string;
  purchaseSchemeType?: SchemeType | '';
  purchaseScheme?: string;
  purchaseAdditionalDiscount?: string;
  itemType?: ItemType | '';
  itemTypeDegree?: string;
  discountApplicable?: DiscountApplicable | '';
  cgst?: string;
  sgst?: string;
  verticalBulk?: Record<string, string>;
}

/**
 * Apply vendor purchase scheme + additional discount to a tax-exclusive line.
 * FIXED_UNITS "8+2" → pay 8/10 of line (20% off). PERCENTAGE → price × (1 − pct/100).
 */
function applyPurchaseDiscountsToLine(
  lineTaxableExclusive: number,
  scheme: PurchaseSchemeFields,
): number {
  if (lineTaxableExclusive <= 0) return 0;
  let line = lineTaxableExclusive;
  const schemeType = scheme.purchaseSchemeType ?? 'FIXED_UNITS';

  if (schemeType === 'PERCENTAGE') {
    const pct = scheme.purchaseSchemePercentage;
    if (pct != null && pct > 0) {
      line = roundMoney(line * (1 - pct / 100));
    }
  } else {
    const payFor = scheme.purchaseSchemePayFor;
    const free = scheme.purchaseSchemeFree;
    if (payFor != null && payFor > 0 && free != null && free >= 0) {
      const sum = payFor + free;
      if (sum > 0) {
        line = roundMoney((line * payFor) / sum);
      }
    }
  }

  const addDisc = scheme.purchaseAdditionalDiscount;
  if (addDisc != null && addDisc !== 0) {
    line = roundMoney(line * (1 - addDisc / 100));
  }
  return line;
}

/**
 * Tax-exclusive purchase line.
 * Free-quantity flow: count is total received (e.g. 100); billable = count − freeQty (80);
 * line = billable × unit only — free units are the scheme, not an extra % off billable.
 * Deal-ratio / % flows: discount via applyPurchaseDiscountsToLine on gross or billable.
 */
function purchaseLineTaxableExclusive(
  count: number,
  unit: number,
  scheme: PurchaseSchemeFields,
): number {
  const gross = roundMoney(count * unit);
  if (gross <= 0) return 0;

  const freeQty = scheme.purchaseSchemeFreeQty;
  const schemeType = scheme.purchaseSchemeType ?? 'FIXED_UNITS';

  if (
    freeQty != null &&
    freeQty > 0 &&
    schemeType !== 'PERCENTAGE' &&
    schemeType !== 'FREE_QUANTITY'
  ) {
    const billable =
      count >= freeQty
        ? count - freeQty
        : Math.max(
            0,
            Math.round(
              (count * (scheme.purchaseSchemePayFor ?? 0)) /
                ((scheme.purchaseSchemePayFor ?? 0) + (scheme.purchaseSchemeFree ?? 0)),
            ),
          );
    return roundMoney(Math.max(0, billable) * unit);
  }

  return applyPurchaseDiscountsToLine(gross, scheme);
}

function resolvePurchaseSchemeForTotals(
  product: ProductFormData,
  purchaseDraft?: string,
): PurchaseSchemeFields {
  const parsed = purchaseDraft ? parsePurchaseSchemeDraft(purchaseDraft) : null;
  if (parsed) {
    return {
      ...parsed,
      purchaseAdditionalDiscount: product.purchaseAdditionalDiscount,
    };
  }
  return {
    purchaseSchemeType: product.purchaseSchemeType,
    purchaseSchemePayFor: product.purchaseSchemePayFor,
    purchaseSchemeFree: product.purchaseSchemeFree,
    purchaseSchemePercentage: product.purchaseSchemePercentage,
    purchaseSchemeFreeQty: product.purchaseSchemeFreeQty,
    purchaseAdditionalDiscount: product.purchaseAdditionalDiscount,
  };
}

/** Recompute supplier bill line subtotal + tax total from live product rows. */
function computeVendorInvoiceTotalsFromProducts(
  productRows: ProductFormData[],
  billingModeForGst: BillingMode,
  schemeDrafts?: Record<string, { sale?: string; purchase?: string }>,
): { lineSubTotal: number; taxTotal: number } {
  let lineSubTotal = 0;
  let taxTotal = 0;

  for (const p of productRows) {
    const qtyRaw = p.count;
    const q = qtyRaw != null && Number.isFinite(Number(qtyRaw)) ? Math.max(0, Number(qtyRaw)) : 0;
    const pts = numericProductMoney(p.costPrice);
    const ptr = numericProductMoney(p.priceToRetail);
    let unit = 0;
    if (pts != null && pts >= 0) {
      unit = pts;
    } else if (ptr != null && ptr > 0) {
      unit = ptr;
    }

    const scheme = resolvePurchaseSchemeForTotals(p, schemeDrafts?.[p.id]?.purchase);
    const lineTaxableExclusive = purchaseLineTaxableExclusive(q, unit, scheme);

    const sgst =
      billingModeForGst === 'BASIC'
        ? 0
        : parseGstPercent(typeof p.sgst === 'string' ? p.sgst : undefined);
    const cgst =
      billingModeForGst === 'BASIC'
        ? 0
        : parseGstPercent(typeof p.cgst === 'string' ? p.cgst : undefined);
    const pct = sgst + cgst;

    if (pct > 0 && lineTaxableExclusive > 0) {
      const cgstAmt = roundMoney((lineTaxableExclusive * cgst) / 100);
      const sgstAmt = roundMoney((lineTaxableExclusive * sgst) / 100);
      lineSubTotal += lineTaxableExclusive;
      taxTotal += roundMoney(cgstAmt + sgstAmt);
    } else {
      lineSubTotal += lineTaxableExclusive;
    }
  }

  return {
    lineSubTotal: roundMoney(lineSubTotal),
    taxTotal: roundMoney(taxTotal),
  };
}

export function ProductEntryPage() {
  const fetchShopSchema = useVerticalSchemaStore((s) => s.fetchShopSchema);
  const activeShopId = useAuthStore((s) => s.user?.shopId ?? null) ?? apiClient.getShopId();
  const fetchCapabilities = useShopCapabilitiesStore((s) => s.fetchCapabilities);
  const shopCapabilities = useShopCapabilitiesStore((s) =>
    activeShopId ? s.byShopId[activeShopId] ?? null : null,
  );
  const isSimplePricing = shopCapabilities?.features?.simplePricing === true;
  const isRetailPricing = shopCapabilities?.features?.retailPricing === true;
  // Cafe + retailer: cost + selling instead of PTS/PTR/MRP.
  const isCompactPriceUi = isSimplePricing || isRetailPricing;
  // Cafe-only: hide schemes, item type, discount-applicable, rate tiers.
  const showCommercialTerms = !isSimplePricing;
  const showRateTiers = !isSimplePricing && !isRetailPricing;
  const navigate = useNavigate();
  const location = useLocation();
  const vendorPrefillConsumedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatingBarcodeId, setGeneratingBarcodeId] = useState<string | null>(null);
  const [printLabelCodes, setPrintLabelCodes] = useState<string[] | null>(null);
  const { success: notifySuccess, error: notifyError } = useNotify;

  // QR Code Upload state
  const [showQrModal, setShowQrModal] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(
    null,
  );
  const productsSectionRef = useRef<HTMLDivElement>(null);
  const [showReviewBanner, setShowReviewBanner] = useState(false);
  const [reviewBannerItemsCount, setReviewBannerItemsCount] = useState(0);

  // Shared vendor and lot ID (applied to all products)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [vendorSearchResults, setVendorSearchResults] = useState<Vendor[]>([]);
  const [isSearchingVendor, setIsSearchingVendor] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [isCreatingVendor, setIsCreatingVendor] = useState(false);
  const [billingMode, setBillingMode] = useState<BillingMode>('REGULAR');
  const billingSchemaMode = schemaModeForBilling(billingMode);
  const shopSchema = useVerticalSchemaStore((s) =>
    activeShopId
      ? s.shopSchemaByKey[shopSchemaCacheKey(activeShopId, billingSchemaMode)] ?? null
      : null,
  );
  const schemaLoadError = useVerticalSchemaStore((s) =>
    activeShopId ? s.errors[shopSchemaCacheKey(activeShopId, billingSchemaMode)] ?? '' : '',
  );
  const [vendorFormData, setVendorFormData] = useState<CreateVendorDto>({
    name: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    businessType: 'WHOLESALE',
    gstinUin: '',
  });
  const [customBusinessType, setCustomBusinessType] = useState('');
  const [showCustomBusinessType, setShowCustomBusinessType] = useState(false);
  // Link vendor to registered user
  const [linkedUser, setLinkedUser] = useState<LinkableUser | null>(null);
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [userSearchMessage, setUserSearchMessage] = useState<string | null>(null);

  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('');
  const [vendorInvoiceDate, setVendorInvoiceDate] = useState('');
  const [vendorLineSubTotal, setVendorLineSubTotal] = useState('');
  const [vendorTaxTotal, setVendorTaxTotal] = useState('');
  const [vendorShippingCharge, setVendorShippingCharge] = useState('');
  const [vendorOtherCharges, setVendorOtherCharges] = useState('');
  const [vendorOverallDiscount, setVendorOverallDiscount] = useState('');
  const [vendorRoundOff, setVendorRoundOff] = useState('');
  const [vendorInvoiceTotal, setVendorInvoiceTotal] = useState('');
  const [vendorPaymentMethod, setVendorPaymentMethod] = useState<PaymentMethod | null>(null);
  const [vendorPaymentSplit, setVendorPaymentSplit] = useState<PaymentSplit>(() =>
    emptyPaymentSplit(),
  );

  /**
   * Apply OCR header + optional line-derived totals. When `parsedItems` has
   * rows, line subtotal, tax total, and invoice total are computed from items
   * (and header shipping / other / round-off); header line/tax/invoice amounts
   * are ignored in that case.
   */
  const applyParsedVendorInvoice = (
    v: ParsedVendorInvoiceDto | null | undefined,
    parsedItems?: ParseInvoiceItem[] | null,
  ) => {
    const hasItems = parsedItems != null && parsedItems.length > 0;

    if (v) {
      if (v.invoiceNo) setVendorInvoiceNo(String(v.invoiceNo).trim());
      if (v.invoiceDate) {
        const raw = String(v.invoiceDate).trim();
        setVendorInvoiceDate(raw.length >= 10 ? raw.slice(0, 10) : raw);
      }
      if (v.shippingCharge != null) setVendorShippingCharge(String(v.shippingCharge));
      if (v.otherCharges != null) setVendorOtherCharges(String(v.otherCharges));
      if (v.roundOff != null) setVendorRoundOff(String(v.roundOff));
      if (!hasItems) {
        if (v.lineSubTotal != null) setVendorLineSubTotal(String(v.lineSubTotal));
        if (v.taxTotal != null) setVendorTaxTotal(String(v.taxTotal));
        if (v.invoiceTotal != null) setVendorInvoiceTotal(String(v.invoiceTotal));
      }
    }

    if (hasItems) {
      const { lineSubTotal, taxTotal } = computeVendorInvoiceTotalsFromParseItems(parsedItems);
      setVendorLineSubTotal(formatComputedAmount(lineSubTotal));
      setVendorTaxTotal(formatComputedAmount(taxTotal));
    }
  };

  useEffect(() => {
    setVendorInvoiceTotal(
      computeVendorInvoiceTotalFromFields(
        vendorLineSubTotal,
        vendorTaxTotal,
        vendorShippingCharge,
        vendorOtherCharges,
        vendorOverallDiscount,
        vendorRoundOff,
      ),
    );
  }, [
    vendorLineSubTotal,
    vendorTaxTotal,
    vendorShippingCharge,
    vendorOtherCharges,
    vendorOverallDiscount,
    vendorRoundOff,
  ]);

  const vendorInvoiceTotalNum = optionalNumFromString(vendorInvoiceTotal) ?? 0;
  const vendorCreditLedgerOutstandingNum = roundMoney(Math.max(vendorPaymentSplit.creditAmount, 0));
  const vendorPaymentSplitValidation = validatePaymentSplit(
    vendorPaymentMethod,
    vendorPaymentSplit,
    vendorInvoiceTotalNum,
  );

  // Multiple products state
  const [products, setProducts] = useState<ProductFormData[]>([]);
  const [packagingUnits, setPackagingUnits] = useState<PackagingUnit[]>([]);

  useEffect(() => {
    inventoryApi
      .listPackagingUnits()
      .then(setPackagingUnits)
      .catch(() => setPackagingUnits([]));
  }, []);

  useEffect(() => {
    if (activeShopId) {
      void fetchCapabilities();
    }
  }, [activeShopId, fetchCapabilities]);

  // Grid view: column values to apply to every product row
  const [gridBulkFill, setGridBulkFill] = useState<GridBulkFillDraft>({});

  // Grid view: draft values for scheme fields (user can type "10+2" or "15%")
  const [gridSchemeDrafts, setGridSchemeDrafts] = useState<
    Record<string, { sale?: string; purchase?: string }>
  >({});

  const prevRegisteredProductCountRef = useRef(0);

  // Keep invoice line subtotal / tax in sync whenever product rows or GST mode change.
  useEffect(() => {
    const n = products.length;
    if (n === 0) {
      if (prevRegisteredProductCountRef.current > 0) {
        setVendorLineSubTotal('');
        setVendorTaxTotal('');
      }
      prevRegisteredProductCountRef.current = 0;
      return;
    }
    prevRegisteredProductCountRef.current = n;
    const { lineSubTotal, taxTotal } = computeVendorInvoiceTotalsFromProducts(
      products,
      billingMode,
      gridSchemeDrafts,
    );
    setVendorLineSubTotal(formatComputedAmount(lineSubTotal));
    setVendorTaxTotal(formatComputedAmount(taxTotal));
  }, [products, billingMode, gridSchemeDrafts]);

  // Product view mode: list (accordion) or grid (Excel-style)
  const [productViewMode, setProductViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('product-registration-view-mode');
      if (stored === 'list' || stored === 'grid') return stored;
    }
    return 'list';
  });

  // Image upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const MAX_INVOICE_IMAGES = 20;
  const MAX_INVOICE_IMAGE_BYTES = 10 * 1024 * 1024;
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createEmptyProduct = (): ProductFormData => ({
    id: `product-${Date.now()}-${Math.random()}`,
    isExpanded: true,
    barcode: '',
    name: '',
    companyName: '',
    price: 0,
    maximumRetailPrice: 0,
    costPrice: 0,
    priceToRetail: 0,
    sellingPrice: 0,
    businessType: shopSchema?.verticalId ?? 'medical',
    location: '',
    count: 0,
    expiryDate: '',
    description: '',
    reminderAt: undefined,
    customReminders: [],
    hsn: '',
    batchNo: '',
    scheme: null,
    schemePayFor: null,
    schemeFree: null,
    schemeType: 'FIXED_UNITS',
    schemePercentage: null,
    sgst: '',
    cgst: '',
    saleAdditionalDiscount: null,
    purchaseSchemeType: 'FIXED_UNITS',
    purchaseSchemePayFor: null,
    purchaseSchemeFree: null,
    purchaseSchemePercentage: null,
    purchaseSchemeFreeQty: null,
    purchaseAdditionalDiscount: null,
    billingMode,
    itemType: 'NORMAL',
    itemTypeDegree: undefined,
    discountApplicable: undefined,
    baseUnit: '',
    unitsPerPack: 0,
    conversionFactor: 0,
    rates: [],
    defaultRate: '',
    verticalFields: shopSchema?.verticalId === 'cafe' ? { sellDirect: 'no' } : {},
  });

  const registrationFields = useMemo(
    () =>
      filterRegistrationFieldsForSimplePricing(
        registrationFieldsForBilling(shopSchema, billingMode, activeShopId),
        isSimplePricing,
      ),
    [shopSchema, billingMode, activeShopId, isSimplePricing],
  );

  const {
    companyField,
    sellDirectField,
    otherFields: verticalRegistrationFields,
  } = useMemo(() => partitionRegistrationFields(registrationFields), [registrationFields]);

  const registrationSchemaReady = useMemo(
    () =>
      isRegistrationSchemaReady(shopSchema, billingMode, {
        shopId: activeShopId,
      }),
    [shopSchema, billingMode, activeShopId],
  );

  useEffect(() => {
    if (!activeShopId) {
      return;
    }
    void fetchShopSchema(billingSchemaMode);
  }, [activeShopId, billingSchemaMode, fetchShopSchema]);

  const applyVerticalFieldChange = useCallback(
    (productId: string, field: VerticalSchemaFieldDef, value: string) => {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== productId) {
            return p;
          }
          const patch = setVerticalFieldPatch(field, value);
          if (field.key === 'itemType' && value !== 'DEGREE') {
            Object.assign(patch, { itemTypeDegree: undefined });
          }
          const nextVerticalFields = {
            ...(p.verticalFields ?? {}),
            ...((patch.verticalFields as Record<string, unknown> | undefined) ?? {}),
          };
          const { verticalFields: _vf, ...restPatch } = patch;
          return {
            ...p,
            ...restPatch,
            verticalFields:
              Object.keys(nextVerticalFields).length > 0 ? nextVerticalFields : p.verticalFields,
          };
        }),
      );
    },
    [],
  );

  const handleAddProduct = () => {
    if (!registrationSchemaReady) {
      return;
    }
    setProducts([...products, createEmptyProduct()]);
    setError(null);
  };

  const handleBillingModeChange = (mode: BillingMode) => {
    setBillingMode(mode);
    setProducts((prev) =>
      prev.map((product) => ({
        ...product,
        billingMode: mode,
        ...(mode === 'BASIC' ? { sgst: '', cgst: '' } : {}),
      })),
    );
  };

  const transformParsedItemToProduct = (item: ParseInvoiceItem): ProductFormData => {
    // Transform customReminders from API format to form format
    const customReminders: CustomReminderInput[] =
      item.customReminders && item.customReminders.length > 0
        ? item.customReminders
            .filter((reminder) => reminder && reminder.reminderAt)
            .map((reminder) => ({
              reminderAt: reminder.reminderAt || '',
              endDate: reminder.endDate || '',
              notes: reminder.notes || '',
            }))
        : [];

    return hydrateExtensionFieldsOnProduct(
      {
        id: `product-${Date.now()}-${Math.random()}`,
        isExpanded: true,
        barcode: item.barcode || '',
        name: item.name || '',
        companyName: item.companyName || '',
        price: item.priceToRetail || 0,
        maximumRetailPrice: item.maximumRetailPrice || 0,
        costPrice: item.costPrice || 0,
        priceToRetail: item.priceToRetail || 0,
        businessType: item.businessType?.toLowerCase() || shopSchema?.verticalId || 'medical',
        location: item.location || '',
        count: item.count || 0,
        expiryDate: item.expiryDate || '',
        description: item.description || '',
        reminderAt: item.reminderAt || undefined,
        customReminders,
        hsn: item.hsn || '',
        batchNo: item.batchNo || '',
        ...(() => {
          const fromApi =
            item.schemePayFor != null ||
            item.schemeFree != null ||
            item.purchaseSchemePayFor != null ||
            item.purchaseSchemeFree != null;
          if (fromApi) {
            return {
              scheme: null,
              schemePayFor: item.schemePayFor ?? item.purchaseSchemePayFor ?? null,
              schemeFree: item.schemeFree ?? item.purchaseSchemeFree ?? null,
              schemeType: (item.schemeType ?? 'FIXED_UNITS') as SchemeType,
              purchaseSchemeType: (item.purchaseSchemeType ??
                'FIXED_UNITS') as PurchaseSchemeInputType,
              purchaseSchemePayFor: item.purchaseSchemePayFor ?? item.schemePayFor ?? null,
              purchaseSchemeFree: item.purchaseSchemeFree ?? item.schemeFree ?? null,
            };
          }
          const draft = typeof item.scheme === 'string' ? item.scheme : null;
          const parsed = draft ? parsePurchaseSchemeDraft(draft) : null;
          if (parsed) {
            return {
              scheme: null,
              schemePayFor: parsed.purchaseSchemePayFor,
              schemeFree: parsed.purchaseSchemeFree,
              schemeType: 'FIXED_UNITS' as SchemeType,
              purchaseSchemeType: parsed.purchaseSchemeType,
              purchaseSchemePayFor: parsed.purchaseSchemePayFor,
              purchaseSchemeFree: parsed.purchaseSchemeFree,
            };
          }
          return {
            scheme:
              item.scheme != null
                ? typeof item.scheme === 'number'
                  ? item.scheme
                  : parseInt(String(item.scheme), 10) || null
                : null,
            schemePayFor: null,
            schemeFree: null,
            schemeType: (item.schemeType ?? 'FIXED_UNITS') as SchemeType,
            purchaseSchemeType: (item.purchaseSchemeType ??
              'FIXED_UNITS') as PurchaseSchemeInputType,
            purchaseSchemePayFor: item.purchaseSchemePayFor ?? null,
            purchaseSchemeFree: item.purchaseSchemeFree ?? null,
          };
        })(),
        schemePercentage:
          item.schemePercentage != null
            ? (typeof item.schemePercentage === 'number'
                ? item.schemePercentage
                : parseFloat(String(item.schemePercentage))) || null
            : null,
        sgst: billingMode === 'BASIC' ? '' : item.sgst || '',
        cgst: billingMode === 'BASIC' ? '' : item.cgst || '',
        saleAdditionalDiscount: item.saleAdditionalDiscount ?? null,
        purchaseSchemePercentage: item.purchaseSchemePercentage ?? null,
        purchaseSchemeFreeQty: null,
        purchaseAdditionalDiscount: item.purchaseAdditionalDiscount ?? null,
        billingMode,
        itemType: item.itemType ?? 'NORMAL',
        itemTypeDegree: item.itemTypeDegree,
        discountApplicable: item.discountApplicable,
        baseUnit: item.baseUnit?.trim() ? item.baseUnit.trim().toUpperCase() : '',
        unitsPerPack: item.unitsPerPack ?? item.unitConversions?.factor ?? 0,
        conversionFactor: item.unitsPerPack ?? item.unitConversions?.factor ?? 0,
        rates: item.rates ?? [],
        defaultRate: item.defaultRate ?? '',
        verticalFields: shopSchema?.verticalId === 'cafe' ? { sellDirect: 'no' } : {},
      },
      registrationFields,
    );
  };

  /**
   * Compresses and resizes an image file to reduce its size before upload
   * @param file - The original image file
   * @param maxWidth - Maximum width in pixels (default: 1600)
   * @param maxHeight - Maximum height in pixels (default: 1600)
   * @param quality - Compression quality 0-1 (default: 0.7)
   * @param maxFileSizeMB - Target max file size in MB; quality is reduced if larger (default: 2)
   * @returns Promise<File> - The compressed image file
   */
  const compressImage = async (
    file: File,
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.7,
    maxFileSizeMB = 2,
  ): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressWithQuality = (currentQuality: number): void => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Failed to compress image'));
                  return;
                }
                const fileSizeMB = blob.size / (1024 * 1024);
                if (fileSizeMB > maxFileSizeMB && currentQuality > 0.3) {
                  compressWithQuality(Math.max(0.3, currentQuality - 0.1));
                  return;
                }
                resolve(
                  new File([blob], file.name, {
                    type: file.type,
                    lastModified: Date.now(),
                  }),
                );
              },
              file.type,
              currentQuality,
            );
          };
          compressWithQuality(quality);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const validateInvoiceImageFile = (file: File, label: string): boolean => {
    if (!file.type.startsWith('image/')) {
      notifyError(`${label}: must be an image file`);
      return false;
    }
    if (file.size > MAX_INVOICE_IMAGE_BYTES) {
      notifyError(`${label}: must be less than 10 MB`);
      return false;
    }
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files ? Array.from(e.target.files) : [];
    if (picked.length === 0) return;

    const valid: File[] = [];
    for (let i = 0; i < picked.length; i++) {
      const file = picked[i];
      if (!validateInvoiceImageFile(file, file.name || `Image ${i + 1}`)) {
        continue;
      }
      valid.push(file);
    }
    if (valid.length === 0) return;

    setSelectedFiles((prev) => {
      const merged = [...prev, ...valid];
      if (merged.length > MAX_INVOICE_IMAGES) {
        notifyError(`You can upload at most ${MAX_INVOICE_IMAGES} images`);
        return prev;
      }
      return merged;
    });
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadInvoice = async () => {
    if (selectedFiles.length === 0) {
      notifyError('Please select at least one image');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const compressedFiles: File[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        setUploadProgress(
          selectedFiles.length === 1
            ? 'Compressing image...'
            : `Compressing image ${i + 1} of ${selectedFiles.length}...`,
        );
        compressedFiles.push(await compressImage(selectedFiles[i]));
      }

      setUploadProgress(
        selectedFiles.length === 1
          ? 'Uploading and parsing invoice...'
          : `Parsing ${selectedFiles.length} images...`,
      );
      const response = await inventoryApi.parseInvoices(compressedFiles);

      if (response && response.items && response.items.length > 0) {
        const parsedProducts = response.items.map(transformParsedItemToProduct);
        setProducts(parsedProducts);
        applyParsedVendorInvoice(response.vendorPurchaseInvoice, response.items);
        const pageNote = selectedFiles.length > 1 ? ` from ${selectedFiles.length} images` : '';
        notifySuccess(
          `Successfully parsed invoice${pageNote}! Found ${response.totalItems} item(s).`,
        );
        scrollToProducts(response.totalItems);
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        notifyError('No items found in the invoice image(s). Please try different photos.');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to parse invoice. Please try again.';
      notifyError(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleClearUpload = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
    setUploadProgress('');
  };

  const scrollToProducts = (itemsCount?: number) => {
    if (productsSectionRef.current) {
      setTimeout(() => {
        productsSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        // Show review banner
        if (itemsCount) {
          setReviewBannerItemsCount(itemsCount);
          setShowReviewBanner(true);
          // Auto-hide after 10 seconds
          setTimeout(() => {
            setShowReviewBanner(false);
          }, 10000);
        }
      }, 300);
    }
  };

  // QR Code Upload Functions
  const handleCreateQrCode = async () => {
    try {
      setIsUploading(true);
      setError(null);
      const response = await uploadApi.createUploadToken();
      setUploadUrl(response.uploadUrl);
      setUploadStatus('PENDING');
      setShowQrModal(true);
      setIsUploading(false);

      // Start polling for status
      startPolling(response.token);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create upload token. Please try again.';
      notifyError(errorMessage);
      setIsUploading(false);
    }
  };

  const startPolling = (token: string) => {
    setIsPolling(true);
    const interval = setInterval(async () => {
      try {
        const statusResponse = await uploadApi.getUploadStatus(token);
        setUploadStatus(statusResponse.status);

        if (statusResponse.status === 'COMPLETED') {
          clearInterval(interval);
          setIsPolling(false);
          setPollingInterval(null);

          // Fetch parsed items
          try {
            const parsedResponse = await uploadApi.getParsedItems(token);
            if (parsedResponse && parsedResponse.items && parsedResponse.items.length > 0) {
              const parsedProducts = parsedResponse.items.map(transformParsedItemToProduct);
              setProducts(parsedProducts);
              applyParsedVendorInvoice(parsedResponse.vendorPurchaseInvoice, parsedResponse.items);
              notifySuccess(
                `✅ Successfully parsed invoice! Found ${parsedResponse.totalItems} item(s).`,
              );
              handleCloseQrModal();
              // Scroll to products section
              scrollToProducts(parsedResponse.totalItems);
            } else {
              notifyError('No items found in the parsed invoice.');
            }
          } catch (parseErr) {
            const errorMessage =
              parseErr instanceof Error ? parseErr.message : 'Failed to retrieve parsed items.';
            notifyError(errorMessage);
          }
        } else if (statusResponse.status === 'FAILED' || statusResponse.status === 'EXPIRED') {
          clearInterval(interval);
          setIsPolling(false);
          setPollingInterval(null);
          notifyError(statusResponse.errorMessage || 'Upload failed or token expired.');
        }
      } catch (err) {
        // Continue polling on error (might be temporary)
        console.error('Error polling upload status:', err);
      }
    }, 2500); // Poll every 2.5 seconds

    setPollingInterval(interval);
  };

  const handleCloseQrModal = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setIsPolling(false);
    setShowQrModal(false);
    setUploadUrl(null);
    setUploadStatus(null);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleRemoveProduct = (productId: string) => {
    setProducts(products.filter((p) => p.id !== productId));
    setGridSchemeDrafts((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const handleToggleProduct = (productId: string) => {
    setProducts(
      products.map((p) => (p.id === productId ? { ...p, isExpanded: !p.isExpanded } : p)),
    );
  };

  const handleProductChange = (
    productId: string,
    field: keyof ProductFormData,
    value: ProductFormData[keyof ProductFormData],
  ) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, [field]: value } : p)));
    setError(null);
    setSuccess(null);
  };

  const handleApplyPurchasePatch = (productId: string, patch: Partial<ProductFormData>) => {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, ...patch } : p)));
    setError(null);
    setSuccess(null);
  };

  const handleGenerateBarcode = async (productId: string) => {
    setGeneratingBarcodeId(productId);
    setError(null);
    try {
      const code = await barcodesApi.generateOne();
      handleProductChange(productId, 'barcode', code);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate barcode';
      notifyError(message);
    } finally {
      setGeneratingBarcodeId(null);
    }
  };

  const handlePrintRowBarcode = (product: ProductFormData) => {
    const code = product.barcode?.trim();
    if (!code) return;
    try {
      openLocalBarcodeLabelPrint([
        {
          code,
          name: product.name,
          companyName: product.companyName,
        },
      ]);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to print barcode');
    }
  };

  // --- Catalog product typeahead (prefill identity from an existing product) ---
  const [productSuggestions, setProductSuggestions] = useState<ProductSuggestion[]>([]);
  const [suggestionRowId, setSuggestionRowId] = useState<string | null>(null);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearProductSuggestions = useCallback(() => {
    if (suggestTimerRef.current) {
      clearTimeout(suggestTimerRef.current);
      suggestTimerRef.current = null;
    }
    setProductSuggestions([]);
    setSuggestionRowId(null);
  }, []);

  const handleNameChange = (rowId: string, value: string) => {
    // Editing the name breaks the link to a previously selected product; the
    // server will fork a new product if identity fields differ on submit.
    handleProductChange(rowId, 'name', value);
    handleProductChange(rowId, 'productId', undefined);
    setSuggestionRowId(rowId);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    const q = value.trim();
    if (q.length < 2) {
      setProductSuggestions([]);
      return;
    }
    suggestTimerRef.current = setTimeout(() => {
      void productApi
        .suggest(q)
        .then((rows) => {
          setSuggestionRowId((current) => {
            if (current === rowId) setProductSuggestions(rows);
            return current;
          });
        })
        .catch(() => setProductSuggestions([]));
    }, 250);
  };

  const applyProductPrefill = async (rowId: string, suggestion: ProductSuggestion) => {
    // Catalog identity first; then load the most recent lot for pricing + extension defaults.
    handleApplyPurchasePatch(rowId, {
      productId: suggestion.id,
      name: suggestion.name,
      barcode: suggestion.barcode ?? '',
      description: suggestion.description ?? '',
      companyName: suggestion.companyName ?? '',
      businessType: suggestion.businessType ?? shopSchema?.verticalId ?? 'medical',
      hsn: suggestion.hsn ?? '',
      baseUnit: suggestion.baseUnit ?? '',
      ...(suggestion.unitConversions?.factor
        ? {
            unitsPerPack: suggestion.unitConversions.factor,
            conversionFactor: suggestion.unitConversions.factor,
          }
        : {}),
      ...(suggestion.itemType ? { itemType: suggestion.itemType } : {}),
      ...(suggestion.itemTypeDegree != null ? { itemTypeDegree: suggestion.itemTypeDegree } : {}),
    });
    clearProductSuggestions();

    try {
      const lastLot = await productApi.getLastInventory(suggestion.id);
      if (lastLot) {
        handleApplyPurchasePatch(
          rowId,
          mapLastInventoryToRegistrationPatch(
            lastLot,
            registrationFields,
          ) as Partial<ProductFormData>,
        );
      }
    } catch {
      // Identity prefill already applied; ignore missing/failed last-lot lookup.
    }
  };

  const handleNameBlur = (rowId: string) => {
    // Delay so a suggestion's onMouseDown can fire before the list unmounts.
    setTimeout(() => {
      setSuggestionRowId((current) => (current === rowId ? null : current));
    }, 150);
  };

  useEffect(() => () => clearProductSuggestions(), [clearProductSuggestions]);

  const handleIntegerChange = (productId: string, field: string, value: string) => {
    if (value === '') {
      handleProductChange(productId, field as keyof ProductFormData, 0);
      return;
    }
    if (!/^\d+$/.test(value)) return;
    handleProductChange(productId, field as keyof ProductFormData, parseInt(value, 10));
  };

  const handleDecimalChange = (productId: string, field: string, value: string) => {
    if (value === '') {
      handleProductChange(productId, field as keyof ProductFormData, 0);
      return;
    }
    if (!/^\d*\.?\d*$/.test(value)) return;
    // Keep raw string so decimal point is preserved while typing (e.g. "10.")
    handleProductChange(productId, field as keyof ProductFormData, value);
  };

  const handleGridBulkFillChange = (
    field: keyof GridBulkFillDraft,
    value: GridBulkFillDraft[keyof GridBulkFillDraft],
  ) => {
    setGridBulkFill((prev) => ({ ...prev, [field]: value }));
  };

  const handleVerticalBulkChange = (key: string, value: string) => {
    setGridBulkFill((prev) => ({
      ...prev,
      verticalBulk: { ...(prev.verticalBulk ?? {}), [key]: value },
    }));
  };

  const handleApplyGridBulkFill = () => {
    const b = gridBulkFill;
    const trim = (s?: string) => (s ?? '').trim();
    const hasText = (s?: string) => trim(s).length > 0;

    const appliedSaleScheme = hasText(b.saleScheme);
    const appliedPurchaseScheme = hasText(b.purchaseScheme);

    setProducts((prev) =>
      prev.map((product) => {
        let next: ProductFormData = { ...product };

        if (hasText(b.name)) next = { ...next, name: trim(b.name) };
        if (hasText(b.companyName)) {
          next = { ...next, companyName: trim(b.companyName) };
        }
        if (hasText(b.count)) {
          const n = parseInt(trim(b.count), 10);
          if (!isNaN(n) && n > 0) next = { ...next, count: n };
        }
        if (hasText(b.conversionFactor)) {
          const f = parseFloat(trim(b.conversionFactor));
          if (!isNaN(f) && f > 0) next = { ...next, conversionFactor: f };
        }
        if (hasText(b.expiryDate)) {
          const expiryField = registrationFields.find((f) => f.key === 'expiryDate');
          const expiryIso = `${trim(b.expiryDate)}T00:00:00Z`;
          if (expiryField) {
            const patch = setVerticalFieldPatch(expiryField, expiryIso);
            next = {
              ...next,
              ...patch,
              verticalFields: {
                ...(next.verticalFields ?? {}),
                ...(patch.verticalFields ?? {}),
              },
            };
          } else {
            next = { ...next, expiryDate: expiryIso };
          }
        }
        if (hasText(b.location)) next = { ...next, location: trim(b.location) };

        if (hasText(b.costPrice)) {
          const n = parseFloat(trim(b.costPrice));
          if (!isNaN(n) && n > 0) next = { ...next, costPrice: n };
        }
        if (hasText(b.sellingPrice)) {
          const n = parseFloat(trim(b.sellingPrice));
          if (!isNaN(n) && n >= 0) next = { ...next, sellingPrice: n };
        }
        if (!isCompactPriceUi && hasText(b.priceToRetail)) {
          const n = parseFloat(trim(b.priceToRetail));
          if (!isNaN(n) && n > 0) next = { ...next, priceToRetail: n };
        }
        if (!isCompactPriceUi && hasText(b.maximumRetailPrice)) {
          const n = parseFloat(trim(b.maximumRetailPrice));
          if (!isNaN(n) && n > 0) {
            next = { ...next, maximumRetailPrice: n };
          }
        }

        if (showCommercialTerms && b.schemeType) {
          next = {
            ...next,
            schemeType: b.schemeType,
            ...(b.schemeType === 'PERCENTAGE'
              ? { schemePayFor: null, schemeFree: null }
              : { schemePercentage: null }),
          };
        }
        if (showCommercialTerms && appliedSaleScheme) {
          const parsed = parseSaleSchemeDraft(trim(b.saleScheme));
          if (parsed) next = { ...next, ...parsed };
        }

        if (
          showCommercialTerms &&
          b.saleAdditionalDiscount !== undefined &&
          b.saleAdditionalDiscount !== ''
        ) {
          const n = parseFloat(trim(b.saleAdditionalDiscount));
          if (!isNaN(n) && n >= -100 && n <= 100) {
            next = { ...next, saleAdditionalDiscount: n };
          }
        }

        if (showCommercialTerms && b.purchaseSchemeType) {
          next = {
            ...next,
            purchaseSchemeType: b.purchaseSchemeType,
            ...(b.purchaseSchemeType === 'PERCENTAGE'
              ? { purchaseSchemePayFor: null, purchaseSchemeFree: null }
              : { purchaseSchemePercentage: null }),
          };
        }
        if (showCommercialTerms && appliedPurchaseScheme) {
          const parsed = parsePurchaseSchemeDraft(trim(b.purchaseScheme));
          if (parsed) {
            next = {
              ...next,
              purchaseSchemeType: parsed.purchaseSchemeType ?? 'FIXED_UNITS',
              purchaseSchemePercentage: parsed.purchaseSchemePercentage,
              purchaseSchemePayFor: parsed.purchaseSchemePayFor,
              purchaseSchemeFree: parsed.purchaseSchemeFree,
            };
          }
        }

        if (
          showCommercialTerms &&
          b.purchaseAdditionalDiscount !== undefined &&
          b.purchaseAdditionalDiscount !== ''
        ) {
          const n = parseFloat(trim(b.purchaseAdditionalDiscount));
          if (!isNaN(n) && n >= 0 && n <= 100) {
            next = { ...next, purchaseAdditionalDiscount: n };
          }
        }

        if (showCommercialTerms && b.itemType) {
          next = { ...next, itemType: b.itemType };
          if (b.itemType !== 'DEGREE') {
            next = { ...next, itemTypeDegree: undefined };
          }
        }
        if (showCommercialTerms && hasText(b.itemTypeDegree)) {
          const deg = parseInt(trim(b.itemTypeDegree), 10);
          if (!isNaN(deg) && deg > 0 && Number.isInteger(deg)) {
            next = { ...next, itemType: 'DEGREE', itemTypeDegree: deg };
          }
        }

        if (showCommercialTerms && b.discountApplicable) {
          next = { ...next, discountApplicable: b.discountApplicable };
        }

        if (hasText(b.cgst)) next = { ...next, cgst: trim(b.cgst) };
        if (hasText(b.sgst)) next = { ...next, sgst: trim(b.sgst) };

        for (const field of registrationFields) {
          const raw =
            b.verticalBulk?.[field.key] ??
            (field.key in b ? String(b[field.key as keyof GridBulkFillDraft] ?? '') : '');
          if (!hasText(raw)) {
            continue;
          }
          const patch = setVerticalFieldPatch(field, trim(raw));
          const nextVerticalFields = {
            ...(next.verticalFields ?? {}),
            ...((patch.verticalFields as Record<string, unknown> | undefined) ?? {}),
          };
          const { verticalFields: _vf, ...restPatch } = patch;
          next = {
            ...next,
            ...restPatch,
            verticalFields:
              Object.keys(nextVerticalFields).length > 0 ? nextVerticalFields : next.verticalFields,
          };
        }

        return next;
      }),
    );

    if (appliedSaleScheme || appliedPurchaseScheme) {
      setGridSchemeDrafts((prev) => {
        const next = { ...prev };
        for (const id of Object.keys(next)) {
          const cur = next[id];
          if (!cur) continue;
          const updated = { ...cur };
          if (appliedSaleScheme) delete updated.sale;
          if (appliedPurchaseScheme) delete updated.purchase;
          if (Object.keys(updated).length === 0) delete next[id];
          else next[id] = updated;
        }
        return next;
      });
    }

    notifySuccess('Updated all rows with the values you entered above.');
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!registrationSchemaReady) {
      notifyError('Product fields are still loading. Please wait and try again.');
      return;
    }

    setIsLoading(true);

    try {
      // Validate vendor is selected
      if (!selectedVendor || !selectedVendor.vendorId) {
        notifyError('Vendor information is required. Please search and select a vendor.');
        setIsLoading(false);
        return;
      }

      const trimmedInvNo = vendorInvoiceNo.trim();
      const hasInvoiceExtra =
        vendorInvoiceDate.trim() !== '' ||
        optionalNumFromString(vendorLineSubTotal) !== undefined ||
        optionalNumFromString(vendorTaxTotal) !== undefined ||
        optionalNumFromString(vendorShippingCharge) !== undefined ||
        optionalNumFromString(vendorOtherCharges) !== undefined ||
        optionalNumFromString(vendorOverallDiscount) !== undefined ||
        optionalNumFromString(vendorRoundOff) !== undefined ||
        optionalNumFromString(vendorInvoiceTotal) !== undefined;
      if (hasInvoiceExtra && !trimmedInvNo) {
        notifyError('Enter the vendor invoice number, or clear all vendor invoice fields.');
        setIsLoading(false);
        return;
      }

      const overallDisc = optionalNumFromString(vendorOverallDiscount);
      if (overallDisc !== undefined && overallDisc < 0) {
        notifyError('Overall discount cannot be negative.');
        setIsLoading(false);
        return;
      }
      if (overallDisc !== undefined && overallDisc > 0) {
        const preDiscountTotal = roundMoney(
          numOr0(optionalNumFromString(vendorLineSubTotal)) +
            numOr0(optionalNumFromString(vendorTaxTotal)) +
            numOr0(optionalNumFromString(vendorShippingCharge)) +
            numOr0(optionalNumFromString(vendorOtherCharges)) +
            numOr0(optionalNumFromString(vendorRoundOff)),
        );
        if (overallDisc > preDiscountTotal) {
          notifyError(
            'Overall discount cannot exceed line subtotal + tax + shipping + other charges + round off.',
          );
          setIsLoading(false);
          return;
        }
      }

      // Validate at least one product exists
      if (products.length === 0) {
        notifyError('Please add at least one product to register.');
        setIsLoading(false);
        return;
      }

      const purchaseDateFromInvoice = vendorInvoiceDate.trim()
        ? `${vendorInvoiceDate.trim().slice(0, 10)}T00:00:00.000Z`
        : undefined;
      if (purchaseDateFromInvoice) {
        const purchase = new Date(purchaseDateFromInvoice);
        const now = new Date();
        const daysPast = (now.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24);
        const daysFuture = (purchase.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysPast > 30) {
          notifyError('Invoice date must not be older than 30 days');
          setIsLoading(false);
          return;
        }
        if (daysFuture > 30) {
          notifyError('Invoice date must not be more than 30 days in the future');
          setIsLoading(false);
          return;
        }
      }

      // Validate all products
      for (const product of products) {
        const label = product.name || 'Unnamed';
        if (!product.name?.trim() || !product.location?.trim()) {
          notifyError(`Product "${label}" is missing required fields`);
          setIsLoading(false);
          return;
        }
        const verticalError = validateProductVerticalFields(product, registrationFields, label);
        if (verticalError) {
          notifyError(verticalError);
          setIsLoading(false);
          return;
        }

        if (product.count <= 0) {
          notifyError(`Product "${product.name || 'Unnamed'}" count must be greater than 0`);
          setIsLoading(false);
          return;
        }

        if (productViewMode !== 'grid') {
          if (!product.baseUnit?.trim()) {
            notifyError(
              `Product "${
                product.name || 'Unnamed'
              }": packaging unit is required (e.g. 1 × 50 TBS)`,
            );
            setIsLoading(false);
            return;
          }
          const baseUqcForValidation = resolvePackagingUqc(product.baseUnit, packagingUnits);
          if (!baseUqcForValidation) {
            notifyError(
              `Product "${product.name || 'Unnamed'}": select a valid packaging unit from the list`,
            );
            setIsLoading(false);
            return;
          }
          const unitDef = packagingUnits.find((u) => u.uqc === baseUqcForValidation);
          const displayFactor = packagingFactorForDisplay(
            product.unitsPerPack ?? product.conversionFactor,
          );
          const normalizedUnitsPerPack = packagingFactorToUnitsPerPack(displayFactor, unitDef);
          if (
            unitDef?.allowsUnitsPerPack &&
            unitDef.sellUnitRule === 'PACK_ONLY' &&
            normalizedUnitsPerPack <= 0
          ) {
            notifyError(
              `Product "${product.name || 'Unnamed'}": enter pack size after 1 × (e.g. 1 × 100 ${
                unitDef.uqc
              })`,
            );
            setIsLoading(false);
            return;
          }
        }

        const ptr = Number(product.priceToRetail);
        const cost = Number(product.costPrice);
        const mrp = Number(product.maximumRetailPrice);
        if (isRetailPricing) {
          if (!Number.isFinite(cost) || cost <= 0) {
            notifyError(
              `Product "${product.name || 'Unnamed'}": Rate is required and must be greater than 0`,
            );
            setIsLoading(false);
            return;
          }
          const sell = Number(product.sellingPrice);
          if (!Number.isFinite(sell) || sell <= 0) {
            notifyError(
              `Product "${
                product.name || 'Unnamed'
              }": Selling Price is required and must be greater than 0`,
            );
            setIsLoading(false);
            return;
          }
        } else if (isSimplePricing) {
          if (!Number.isFinite(cost) || cost <= 0) {
            notifyError(
              `Product "${
                product.name || 'Unnamed'
              }": cost (rate) is required and must be greater than 0`,
            );
            setIsLoading(false);
            return;
          }
          const sellRaw = product.sellingPrice;
          const sell = sellRaw === '' || sellRaw == null ? null : Number(sellRaw);
          if (sell != null && (!Number.isFinite(sell) || sell < 0)) {
            notifyError(
              `Product "${
                product.name || 'Unnamed'
              }": selling price must be zero or greater when provided`,
            );
            setIsLoading(false);
            return;
          }
        } else if (!Number.isFinite(ptr) || ptr <= 0) {
          notifyError(
            `Product "${
              product.name || 'Unnamed'
            }": PTR (price to retail) is required and must be greater than 0`,
          );
          setIsLoading(false);
          return;
        } else if (!Number.isFinite(cost) || cost <= 0) {
          notifyError(
            `Product "${
              product.name || 'Unnamed'
            }": cost (PTS) is required and must be greater than 0`,
          );
          setIsLoading(false);
          return;
        } else if (!Number.isFinite(mrp) || mrp <= 0) {
          notifyError(
            `Product "${product.name || 'Unnamed'}": MRP is required and must be greater than 0`,
          );
          setIsLoading(false);
          return;
        }

        if (
          product.itemType === 'DEGREE' &&
          (product.itemTypeDegree == null ||
            Number(product.itemTypeDegree) <= 0 ||
            !Number.isInteger(Number(product.itemTypeDegree)))
        ) {
          notifyError(
            `Product "${
              product.name || 'Unnamed'
            }": when itemType is DEGREE, itemTypeDegree must be present and greater than zero`,
          );
          setIsLoading(false);
          return;
        }

        if (
          billingMode === 'BASIC' &&
          ((product.sgst && product.sgst.trim()) || (product.cgst && product.cgst.trim()))
        ) {
          notifyError(
            `Product "${
              product.name || 'Unnamed'
            }": SGST/CGST must not be provided when billingMode is BASIC`,
          );
          setIsLoading(false);
          return;
        }

        const schemeType = product.schemeType ?? 'FIXED_UNITS';
        if (showCommercialTerms) {
          if (schemeType === 'PERCENTAGE') {
            if (
              product.schemePercentage == null ||
              product.schemePercentage === undefined ||
              product.schemePercentage < -100 ||
              product.schemePercentage > 100
            ) {
              notifyError(
                `Product "${
                  product.name || 'Unnamed'
                }": when schemeType is PERCENTAGE, schemePercentage is required and must be between -100 and 100`,
              );
              setIsLoading(false);
              return;
            }
          } else {
            const useNewStyle = product.schemePayFor != null || product.schemeFree != null;
            if (useNewStyle) {
              const payFor = product.schemePayFor ?? 0;
              const free = product.schemeFree ?? 0;
              if (payFor < 0 || free < 0) {
                notifyError(
                  `Product "${
                    product.name || 'Unnamed'
                  }": schemePayFor and schemeFree must be zero or greater (e.g. 10 + 2)`,
                );
                setIsLoading(false);
                return;
              }
            } else if (
              product.scheme != null &&
              product.scheme !== undefined &&
              product.scheme < 0
            ) {
              notifyError(
                `Product "${
                  product.name || 'Unnamed'
                }": Scheme (free units) must be zero or greater`,
              );
              setIsLoading(false);
              return;
            }
          }
        }
      }

      // Transform products to bulk API format
      const items = products.map((product) => {
        const validRates = (product.rates ?? []).filter(
          (r) => r.name.trim() && !isNaN(r.price) && r.price >= 0,
        );
        const hasValidDefaultRate =
          product.defaultRate &&
          product.defaultRate.trim() &&
          (['priceToRetail', 'maximumRetailPrice', 'costPrice'].includes(
            product.defaultRate.trim(),
          ) ||
            (product.rates ?? []).some((r) => r.name.trim() === product.defaultRate?.trim()));

        // Format reminderAt if provided
        let reminderAtISO: string | undefined;
        if (product.reminderAt) {
          if (product.reminderAt.includes('T')) {
            reminderAtISO = new Date(product.reminderAt).toISOString();
          } else {
            reminderAtISO = new Date(product.reminderAt).toISOString();
          }
        }

        const expiryField = registrationFields.find((f) => f.key === 'expiryDate');
        const productExpiryRaw = expiryField
          ? getVerticalFieldValue(product, expiryField)
          : product.expiryDate?.trim() || '';

        // Custom reminders: send reminderAt/endDate/notes (works for all verticals)
        const customReminders = mapCustomRemindersForBulkApi(
          product.customReminders,
          productExpiryRaw,
        );

        const unitsPerPackForApi = Number(product.unitsPerPack ?? product.conversionFactor) || 0;

        const batchField = registrationFields.find((f) => f.key === 'batchNo');
        const resolvedExpiryRaw = expiryField
          ? getVerticalFieldValue(product, expiryField)
          : product.expiryDate?.trim() || '';
        const resolvedBatchNo = batchField
          ? getVerticalFieldValue(product, batchField)
          : product.batchNo?.trim() || '';
        const expiryOnExtension = expiryField?.storage === 'extension';
        const batchOnExtension = batchField?.storage === 'extension';

        const coreItem = {
          ...(product.productId ? { productId: product.productId } : {}),
          ...(product.barcode?.trim() ? { barcode: product.barcode.trim() } : {}),
          name: product.name,
          description: product.description || undefined,
          companyName: product.companyName,
          ...(isCompactPriceUi
            ? {
                maximumRetailPrice: 0,
                costPrice: Number(product.costPrice) || 0,
                priceToRetail: 0,
                ...(product.sellingPrice != null &&
                product.sellingPrice !== '' &&
                Number(product.sellingPrice) > 0
                  ? { sellingPrice: Number(product.sellingPrice) }
                  : {}),
              }
            : {
                maximumRetailPrice: Number(product.maximumRetailPrice) || 0,
                costPrice: Number(product.costPrice) || 0,
                priceToRetail: Number(product.priceToRetail) || 0,
              }),
          businessType: (shopSchema?.verticalId ?? product.businessType).toUpperCase(),
          location: product.location,
          count: product.count,
          baseUnit: resolvePackagingUqc(product.baseUnit ?? '', packagingUnits),
          ...(unitsPerPackForApi > 0 ? { unitsPerPack: unitsPerPackForApi } : {}),
          ...(resolvedExpiryRaw && !expiryOnExtension
            ? { expiryDate: formatCoreExpiryDateForApi(resolvedExpiryRaw) }
            : {}),
          reminderAt: reminderAtISO,
          customReminders: customReminders,
          hsn: product.hsn || null,
          ...(resolvedBatchNo && !batchOnExtension ? { batchNo: resolvedBatchNo } : {}),
          ...(showCommercialTerms
            ? (product.schemeType ?? 'FIXED_UNITS') === 'PERCENTAGE'
              ? {
                  schemeType: 'PERCENTAGE' as const,
                  schemePercentage: product.schemePercentage ?? null,
                }
              : product.schemePayFor != null || product.schemeFree != null
              ? {
                  schemeType: 'FIXED_UNITS' as const,
                  schemePayFor: product.schemePayFor ?? null,
                  schemeFree: product.schemeFree ?? null,
                  scheme: null,
                }
              : {
                  schemeType: (product.schemeType ?? 'FIXED_UNITS') as 'FIXED_UNITS',
                  scheme: product.scheme ?? null,
                }
            : {}),
          billingMode: billingMode as BillingMode,
          ...(billingMode !== 'BASIC' && product.sgst && product.sgst.trim()
            ? { sgst: product.sgst.trim() }
            : {}),
          ...(billingMode !== 'BASIC' && product.cgst && product.cgst.trim()
            ? { cgst: product.cgst.trim() }
            : {}),
          ...(showCommercialTerms &&
          product.saleAdditionalDiscount !== null &&
          product.saleAdditionalDiscount !== undefined
            ? { saleAdditionalDiscount: product.saleAdditionalDiscount }
            : {}),
          ...(showCommercialTerms &&
          (product.purchaseSchemeType != null ||
            product.purchaseSchemePayFor != null ||
            product.purchaseSchemeFree != null ||
            product.purchaseSchemePercentage != null ||
            product.purchaseSchemeFreeQty != null)
            ? (product.purchaseSchemeType ?? 'FIXED_UNITS') === 'PERCENTAGE'
              ? {
                  purchaseSchemeType: 'PERCENTAGE' as const,
                  purchaseSchemePercentage: product.purchaseSchemePercentage ?? null,
                  purchaseSchemePayFor: null,
                  purchaseSchemeFree: null,
                }
              : {
                  purchaseSchemeType: 'FIXED_UNITS' as const,
                  purchaseSchemePayFor: product.purchaseSchemePayFor ?? null,
                  purchaseSchemeFree: product.purchaseSchemeFree ?? null,
                  purchaseSchemePercentage: null,
                }
            : {}),
          ...(showCommercialTerms &&
          product.purchaseAdditionalDiscount !== null &&
          product.purchaseAdditionalDiscount !== undefined
            ? {
                purchaseAdditionalDiscount: product.purchaseAdditionalDiscount,
              }
            : {}),
          ...(product.itemType ? { itemType: product.itemType as ItemType } : {}),
          ...(product.itemType === 'DEGREE' &&
          product.itemTypeDegree != null &&
          Number(product.itemTypeDegree) > 0
            ? { itemTypeDegree: Number(product.itemTypeDegree) }
            : {}),
          ...(product.discountApplicable != null && showCommercialTerms
            ? { discountApplicable: product.discountApplicable }
            : {}),
          ...(purchaseDateFromInvoice ? { purchaseDate: purchaseDateFromInvoice } : {}),
          ...(showRateTiers && validRates.length > 0
            ? {
                rates: validRates.map((r) => ({
                  name: r.name.trim(),
                  price: Number(r.price),
                })),
              }
            : {}),
          ...(showRateTiers && hasValidDefaultRate && product.defaultRate
            ? { defaultRate: product.defaultRate.trim() }
            : {}),
        };

        return attachVerticalFieldsToBulkItem(coreItem, product, registrationFields);
      });

      if (!vendorPaymentMethod) {
        throw new Error('Select a payment method for the vendor invoice.');
      }
      if (!vendorPaymentSplitValidation.ok && vendorInvoiceTotalNum > 0) {
        throw new Error(vendorPaymentSplitValidation.message || 'Vendor payment split is invalid.');
      }

      const vendorPurchaseInvoice: VendorPurchaseInvoicePayload = {
        invoiceNo: trimmedInvNo,
      };
      if (vendorInvoiceDate.trim()) {
        vendorPurchaseInvoice.invoiceDate = `${vendorInvoiceDate.trim()}T00:00:00.000Z`;
      }
      const ls = optionalNumFromString(vendorLineSubTotal);
      if (ls !== undefined) vendorPurchaseInvoice.lineSubTotal = ls;
      const tt = optionalNumFromString(vendorTaxTotal);
      if (tt !== undefined) vendorPurchaseInvoice.taxTotal = tt;
      const sh = optionalNumFromString(vendorShippingCharge);
      if (sh !== undefined) vendorPurchaseInvoice.shippingCharge = sh;
      const oc = optionalNumFromString(vendorOtherCharges);
      if (oc !== undefined) vendorPurchaseInvoice.otherCharges = oc;
      const od = optionalNumFromString(vendorOverallDiscount);
      if (od !== undefined) vendorPurchaseInvoice.overallDiscount = od;
      const ro = optionalNumFromString(vendorRoundOff);
      if (ro !== undefined) vendorPurchaseInvoice.roundOff = ro;
      const it = optionalNumFromString(vendorInvoiceTotal);
      if (it !== undefined) vendorPurchaseInvoice.invoiceTotal = it;
      vendorPurchaseInvoice.paymentMethod = vendorPaymentMethod;
      vendorPurchaseInvoice.cashAmount = vendorPaymentSplit.cashAmount;
      vendorPurchaseInvoice.onlineAmount = vendorPaymentSplit.onlineAmount;
      vendorPurchaseInvoice.creditAmount = vendorPaymentSplit.creditAmount;
      // Legacy `paidAmount` = cash + online; kept so older servers still
      // record the correct vendor receipt amount until they pick up the
      // new split fields.
      vendorPurchaseInvoice.paidAmount = roundMoney(
        vendorPaymentSplit.cashAmount + vendorPaymentSplit.onlineAmount,
      );

      // Create bulk request
      const bulkData: BulkCreateInventoryDto = {
        vendorId: selectedVendor.vendorId,
        ...(vendorPurchaseInvoice && { vendorPurchaseInvoice }),
        items,
      };

      // Call bulk API
      try {
        const response = await inventoryApi.createBulk(bulkData);

        // The response should be BulkCreateInventoryResponse
        // Handle cases where the response structure might vary
        const createdCount =
          response?.createdCount ?? response?.totalCreated ?? response?.items?.length ?? 0;
        const failedCount = response?.totalFailed ?? 0;
        const itemErrors = response?.itemErrors ?? [];
        const items = response?.items ?? [];

        // If we have items or a positive createdCount, consider it successful
        if (createdCount > 0 || items.length > 0) {
          const count = createdCount || items.length;
          notifySuccess(
            count === 1
              ? 'Product registered successfully'
              : `Successfully registered ${count} products`,
          );

          const createdBarcodes = items
            .map((item) => item.barcode)
            .filter((code): code is string => Boolean(code?.trim()));
          if (createdBarcodes.length > 0) {
            setPrintLabelCodes(createdBarcodes);
          }

          // Clear form after 5 seconds
          setTimeout(() => {
            setProducts([]);
            handleClearVendor();
            setVendorInvoiceNo('');
            setVendorInvoiceDate('');
            setVendorLineSubTotal('');
            setVendorTaxTotal('');
            setVendorShippingCharge('');
            setVendorOtherCharges('');
            setVendorOverallDiscount('');
            setVendorRoundOff('');
            setVendorInvoiceTotal('');
            setVendorPaymentMethod(null);
            setVendorPaymentSplit(emptyPaymentSplit());
            setSuccess(null);
          }, 5000);
        } else if (failedCount > 0) {
          const detail =
            itemErrors.length > 0
              ? itemErrors.slice(0, 3).join('; ')
              : `${failedCount} product(s) failed validation or save.`;
          notifyError(`No products were saved. ${detail}${itemErrors.length > 3 ? ' …' : ''}`);
        } else if (response) {
          const count = products.length;
          notifySuccess(
            count === 1
              ? 'Product registered successfully'
              : `Successfully registered ${count} products`,
          );
          setTimeout(() => {
            setProducts([]);
            handleClearVendor();
            setVendorInvoiceNo('');
            setVendorInvoiceDate('');
            setVendorLineSubTotal('');
            setVendorTaxTotal('');
            setVendorShippingCharge('');
            setVendorOtherCharges('');
            setVendorOverallDiscount('');
            setVendorRoundOff('');
            setVendorInvoiceTotal('');
            setVendorPaymentMethod(null);
            setVendorPaymentSplit(emptyPaymentSplit());
            setSuccess(null);
          }, 5000);
        } else {
          notifyError('Failed to register products. No items were created.');
        }
      } catch (bulkError) {
        const errorMessage =
          bulkError instanceof Error
            ? bulkError.message
            : 'Failed to register products. Please try again.';
        notifyError(errorMessage);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to register products. Please try again.';
      notifyError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  const handleVendorSearch = async () => {
    if (!vendorSearchQuery.trim()) {
      notifyError('Please enter a search query');
      return;
    }

    setIsSearchingVendor(true);
    setError(null);
    try {
      const vendors = await vendorsApi.search(vendorSearchQuery.trim());
      setVendorSearchResults(vendors || []);
      setShowVendorDropdown(true);
      if (vendors.length === 1) {
        handleSelectVendor(vendors[0]);
      } else {
        setSelectedVendor(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search vendor';
      notifyError(errorMessage);
      setVendorSearchResults([]);
      setSelectedVendor(null);
    } finally {
      setIsSearchingVendor(false);
    }
  };

  const handleSelectVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setVendorSearchQuery(vendor.name);
    setShowVendorDropdown(false);
    setVendorSearchResults([]);
  };

  useEffect(() => {
    vendorPrefillConsumedRef.current = false;
  }, [location.key]);

  useLayoutEffect(() => {
    if (vendorPrefillConsumedRef.current) return;
    const raw = (location.state as { prefillVendor?: VendorResponse } | null | undefined)
      ?.prefillVendor;
    if (!raw?.vendorId) return;
    vendorPrefillConsumedRef.current = true;
    const vendor: Vendor = {
      vendorId: raw.vendorId,
      name: raw.name,
      contactEmail: raw.contactEmail ?? '',
      contactPhone: raw.contactPhone ?? '',
      address: raw.address ?? '',
      companyName: raw.companyName ?? '',
      businessType: raw.businessType,
      gstinUin: raw.gstinUin,
      userId: raw.userId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
    handleSelectVendor(vendor);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate]);

  const handleCloseVendorModal = () => {
    setShowVendorModal(false);
    setShowCustomBusinessType(false);
    setCustomBusinessType('');
    setLinkedUser(null);
    setUserSearchMessage(null);
    setVendorFormData({
      name: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      businessType: 'WHOLESALE',
      gstinUin: '',
    });
  };

  const handleSearchUserForLink = async () => {
    const email = vendorFormData.contactEmail?.trim();
    if (!email) {
      notifyError('Enter vendor email first to check for registered user');
      return;
    }
    setIsSearchingUser(true);
    setUserSearchMessage(null);
    setLinkedUser(null);
    try {
      const user = await userLookupApi.searchByEmail(email);
      if (user) {
        setLinkedUser(user);
        setUserSearchMessage(`Found: ${user.name} (${user.email})`);
        setVendorFormData((prev) => ({ ...prev, name: user.name }));
      } else {
        setUserSearchMessage('No registered user found with this email');
      }
    } catch {
      setUserSearchMessage('Failed to search. Please try again.');
    } finally {
      setIsSearchingUser(false);
    }
  };

  const handleUnlinkUser = () => {
    setLinkedUser(null);
    setUserSearchMessage(null);
  };

  const handleCreateVendor = async () => {
    setIsCreatingVendor(true);
    setError(null);
    try {
      if (!vendorFormData.name || !vendorFormData.contactPhone) {
        notifyError('Please fill in all required vendor fields (Name and Phone)');
        setIsCreatingVendor(false);
        return;
      }

      if (showCustomBusinessType && !customBusinessType.trim()) {
        notifyError('Please enter a custom business type');
        setIsCreatingVendor(false);
        return;
      }

      const vendorPayload: CreateVendorDto = {
        name: vendorFormData.name,
        contactPhone: vendorFormData.contactPhone,
        businessType: showCustomBusinessType
          ? (customBusinessType.trim().toUpperCase() as VendorBusinessType)
          : vendorFormData.businessType,
        ...(vendorFormData.contactEmail && {
          contactEmail: vendorFormData.contactEmail,
        }),
        ...(vendorFormData.address && { address: vendorFormData.address }),
        ...(vendorFormData.gstinUin?.trim() && {
          gstinUin: vendorFormData.gstinUin.trim(),
        }),
        ...(linkedUser && { userId: linkedUser.userId }),
      };
      const vendor = await vendorsApi.create(vendorPayload);
      setSelectedVendor(vendor);
      setVendorSearchQuery(vendor.contactPhone);
      handleCloseVendorModal();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create vendor';
      notifyError(errorMessage);
    } finally {
      setIsCreatingVendor(false);
    }
  };

  const handleClearVendor = () => {
    setSelectedVendor(null);
    setVendorSearchQuery('');
    setVendorSearchResults([]);
    setShowVendorDropdown(false);
    setVendorInvoiceNo('');
    setVendorInvoiceDate('');
    setVendorLineSubTotal('');
    setVendorTaxTotal('');
    setVendorShippingCharge('');
    setVendorOtherCharges('');
    setVendorOverallDiscount('');
    setVendorRoundOff('');
    setVendorInvoiceTotal('');
    setVendorPaymentMethod(null);
    setVendorPaymentSplit(emptyPaymentSplit());
    setVendorFormData({
      name: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      businessType: 'WHOLESALE',
      gstinUin: '',
    });
    setShowCustomBusinessType(false);
    setCustomBusinessType('');
  };

  // Convert ISO (UTC) → datetime-local (local time)
  const isoToLocalDateTime = (iso: string) => {
    const date = new Date(iso);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  // Convert datetime-local → ISO (UTC)
  const localDateTimeToIso = (local: string) => {
    return new Date(local).toISOString();
  };

  return (
    <Stack gap="md" maxWidth="xl" mx="auto">
      <PageHeader description="Register multiple products at once with shared vendor and stock-in (invoice) information" />

      <Card>
        <CardBody>
          <Stack gap="md">
            {error ? <Alert variant="danger">{error}</Alert> : null}
            {success ? <Alert variant="success">{success}</Alert> : null}

            <Stack gap="md">
              <Box className={uploadLayoutStyles.uploadSection}>
                <Box className={uploadLayoutStyles.uploadHeader}>
                  <Text variant="heading4" weight="semibold">
                    Upload invoice image
                  </Text>
                  <Text variant="caption" color="secondary">
                    Optional — parse product details from a photo, then review before saving.
                  </Text>
                </Box>
                <Box className={uploadLayoutStyles.uploadOptionsGrid}>
                  <Button
                    type="button"
                    variant="ghost"
                    className={uploadLayoutStyles.qrUploadBtn}
                    onClick={handleCreateQrCode}
                    disabled={isUploading || isLoading || isPolling}
                  >
                    <Box className={uploadLayoutStyles.qrBtnIcon} aria-hidden>
                      <Icon icon={QrCode} size="md" />
                    </Box>
                    <Box className={uploadLayoutStyles.qrBtnContent}>
                      <Text as="span" className={uploadLayoutStyles.qrBtnTitle}>
                        Upload via QR Code
                      </Text>
                      <Text as="span" className={uploadLayoutStyles.qrBtnSubtitle}>
                        Scan with your phone to upload
                      </Text>
                    </Box>
                  </Button>
                  <Box className={uploadLayoutStyles.uploadOptionsOr}>
                    <Box className={uploadLayoutStyles.uploadOptionsOrLine} />
                    <Text as="span" className={uploadLayoutStyles.uploadOptionsOrText}>
                      OR
                    </Text>
                    <Box className={uploadLayoutStyles.uploadOptionsOrLine} />
                  </Box>
                  <Box className={fileDropzone.container}>
                    <Box className={fileDropzone.optionLabel}>
                      <Text as="span" className={fileDropzone.optionTitle}>
                        Upload from this device
                      </Text>
                      <Text as="span" className={fileDropzone.optionSubtitle}>
                        One or more photos (multi-page invoice)
                      </Text>
                    </Box>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileSelect}
                      className={fileDropzone.fileInput}
                      id="invoice-upload"
                      disabled={isUploading || isLoading}
                    />
                    <Box className={fileDropzone.controls}>
                      <Label htmlFor="invoice-upload" className={fileDropzone.fileInputLabel}>
                        {selectedFiles.length > 0 ? (
                          <Box className={fileDropzone.fileListSummary}>
                            <Box className={fileDropzone.fileIcon} aria-hidden>
                              <Icon icon={FileText} size="md" />
                            </Box>
                            <Text as="span" className={fileDropzone.fileListCount}>
                              {selectedFiles.length} image
                              {selectedFiles.length === 1 ? '' : 's'} selected
                            </Text>
                            <Text as="span" className={fileDropzone.fileListHint}>
                              Click to add more
                            </Text>
                          </Box>
                        ) : (
                          <Box className={fileDropzone.placeholder}>
                            <Box className={fileDropzone.placeholderIcon} aria-hidden>
                              <Icon icon={Upload} size="md" />
                            </Box>
                            <Text as="span">Click to browse images</Text>
                          </Box>
                        )}
                      </Label>

                      {selectedFiles.length > 0 && (
                        <Box as="ul" className={fileDropzone.fileList}>
                          {selectedFiles.map((file, index) => (
                            <Box
                              as="li"
                              key={`${file.name}-${index}`}
                              className={fileDropzone.fileListItem}
                            >
                              <Text as="span" className={fileDropzone.fileName} title={file.name}>
                                {index + 1}. {file.name}
                              </Text>
                              <Text as="span" className={fileDropzone.fileSize}>
                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                              </Text>
                              {!isUploading && (
                                <Button
                                  type="button"
                                  className={fileDropzone.fileRemoveBtn}
                                  onClick={() => handleRemoveSelectedFile(index)}
                                  aria-label={`Remove ${file.name}`}
                                >
                                  ×
                                </Button>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}

                      {isUploading && (
                        <Box className={fileDropzone.progress}>
                          <Spinner size="sm" />
                          <Box className={fileDropzone.progressText}>{uploadProgress}</Box>
                        </Box>
                      )}

                      {selectedFiles.length > 0 && !isUploading && (
                        <Box className={fileDropzone.actions}>
                          <Button
                            type="button"
                            className={fileDropzone.uploadBtn}
                            onClick={handleUploadInvoice}
                            disabled={isLoading}
                          >
                            <Text
                              as="span"
                              className={fileDropzone.btnIcon}
                              role="img"
                              aria-label="Rocket icon"
                            >
                              🚀
                            </Text>
                            Parse {selectedFiles.length > 1 ? 'Invoices' : 'Invoice'}
                          </Button>
                          <Button
                            type="button"
                            className={fileDropzone.clearBtn}
                            onClick={handleClearUpload}
                            disabled={isLoading}
                          >
                            Clear
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Shared vendor & billing */}
              <Box className={vendorStyles.sharedSection}>
                <Text variant="heading3">Shared Information</Text>
                <Box className={vendorStyles.sharedTopRow}>
                  <Text as="span" className={vendorStyles.sharedHint}>
                    Applies to all products.
                  </Text>
                  <Select
                    className={vendorStyles.sharedModeSelect}
                    value={billingMode}
                    onChange={(e) => handleBillingModeChange(e.target.value as BillingMode)}
                    disabled={isLoading}
                    aria-label="Billing mode"
                  >
                    <option value="REGULAR">REGULAR</option>
                    <option value="BASIC">BASIC</option>
                  </Select>
                </Box>

                {/* Vendor Section */}
                <Box className={vendorStyles.vendorSection}>
                  <Text variant="heading4">Vendor Information *</Text>
                  <Box className={pageStyles.formGroup}>
                    <Label htmlFor="vendorSearch">Vendor Search *</Label>
                    <Box position="relative">
                      <Box className={vendorStyles.searchRow}>
                        <Input
                          type="text"
                          id="vendorSearch"
                          placeholder="Search by name, phone, email, or any keyword"
                          value={vendorSearchQuery}
                          onChange={(e) => {
                            setVendorSearchQuery(e.target.value);
                            setSelectedVendor(null);
                            setShowVendorDropdown(false);
                          }}
                          disabled={isLoading || isSearchingVendor}
                          className={productChrome.searchGrow}
                        />
                        <Box className={vendorStyles.searchActions}>
                          <Button
                            type="button"
                            variant="solid"
                            onClick={handleVendorSearch}
                            disabled={isLoading || isSearchingVendor || !vendorSearchQuery.trim()}
                          >
                            {isSearchingVendor ? 'Searching...' : 'Search'}
                          </Button>
                          <Button
                            type="button"
                            variant="solid"
                            onClick={() => setShowVendorModal(true)}
                            disabled={isLoading || isCreatingVendor}
                          >
                            Create New
                          </Button>
                          {selectedVendor ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleClearVendor}
                              disabled={isLoading}
                            >
                              Clear
                            </Button>
                          ) : null}
                        </Box>
                      </Box>
                      {showVendorDropdown && vendorSearchResults.length > 0 && (
                        <Box className={vendorStyles.dropdown}>
                          {vendorSearchResults.map((vendor) => (
                            <Box
                              key={vendor.vendorId}
                              className={vendorStyles.dropdownItem}
                              onClick={() => handleSelectVendor(vendor)}
                            >
                              <Box className={productChrome.fontMedium}>{vendor.name}</Box>
                              {vendor.contactPhone && (
                                <Box className={vendorStyles.dropdownMeta}>
                                  {vendor.contactPhone}
                                </Box>
                              )}
                              {vendor.gstinUin && (
                                <Box className={vendorStyles.dropdownMetaMuted}>
                                  GSTIN: {vendor.gstinUin}
                                </Box>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                      {showVendorDropdown &&
                        vendorSearchResults.length === 0 &&
                        !isSearchingVendor && (
                          <Box className={vendorStyles.vendorNotFound}>
                            <Text>No vendors found. Would you like to create a new vendor?</Text>
                            <Button
                              type="button"
                              variant="solid"
                              size="sm"
                              onClick={() => {
                                setShowVendorModal(true);
                                setShowVendorDropdown(false);
                              }}
                              disabled={isLoading}
                            >
                              Create New Vendor
                            </Button>
                          </Box>
                        )}
                    </Box>
                  </Box>
                  {selectedVendor ? (
                    <Box className={vendorStyles.vendorInfo}>
                      <Box className={vendorStyles.vendorCard}>
                        <Box className={vendorStyles.cardHeader}>
                          <Box className={vendorStyles.avatar} aria-hidden>
                            {(selectedVendor.name?.trim().charAt(0) || 'V').toUpperCase()}
                          </Box>
                          <Box className={vendorStyles.cardTitleBlock}>
                            <Inline gap="sm" align="center" flexWrap>
                              <Text variant="heading4" weight="semibold">
                                {selectedVendor.name}
                              </Text>
                              {selectedVendor.userId ? (
                                <Badge variant="success">StockKart user</Badge>
                              ) : null}
                            </Inline>
                            {selectedVendor.businessType ? (
                              <Text variant="caption" color="secondary">
                                {selectedVendor.businessType}
                              </Text>
                            ) : null}
                          </Box>
                        </Box>

                        <Box className={vendorStyles.detailGrid}>
                          {selectedVendor.contactPhone ? (
                            <VendorDetailField
                              icon={Phone}
                              label="Phone"
                              value={selectedVendor.contactPhone}
                            />
                          ) : null}
                          {selectedVendor.contactEmail ? (
                            <VendorDetailField
                              icon={Mail}
                              label="Email"
                              value={selectedVendor.contactEmail}
                            />
                          ) : null}
                          {selectedVendor.gstinUin ? (
                            <VendorDetailField
                              icon={Receipt}
                              label="GSTIN / UIN"
                              value={selectedVendor.gstinUin}
                            />
                          ) : null}
                          {selectedVendor.address ? (
                            <VendorDetailField
                              icon={MapPin}
                              label="Address"
                              value={selectedVendor.address}
                              wide
                            />
                          ) : null}
                        </Box>
                      </Box>
                    </Box>
                  ) : null}

                  <Box className={vendorStyles.vendorSection}>
                    <Text variant="heading4">Vendor purchase invoice (optional)</Text>
                    <Text className={`${pageStyles.helperText} ${pageStyles.helperTextSpaced}`}>
                      Add the supplier&apos;s invoice number and amounts to keep a history of what
                      was bought on each bill. Leave blank to register stock without an invoice
                      record.
                    </Text>
                    {products.length > 0 ? (
                      <Text className={`${pageStyles.helperText} ${pageStyles.helperTextCompact}`}>
                        Amounts tracked here follow each row&apos;s{' '}
                        <Text as="span" weight="bold">
                          PTS (price from stockist)
                        </Text>{' '}
                        × quantity when PTS is set;{' '}
                        <Text as="span" weight="bold">
                          PTR
                        </Text>{' '}
                        is only used when PTS is empty.{' '}
                        {billingMode !== 'BASIC'
                          ? 'With CGST/SGST on the row, PTS × qty is taxable value (ex‑GST); tax is added on top for line subtotal + tax totals.'
                          : null}
                      </Text>
                    ) : null}
                    <Box className={vendorStyles.sharedInfoGrid}>
                      <Box className={pageStyles.formGroup}>
                        <Label htmlFor="vendorInvoiceNo">Invoice number</Label>
                        <Input
                          id="vendorInvoiceNo"
                          type="text"
                          value={vendorInvoiceNo}
                          onChange={(e) => setVendorInvoiceNo(e.target.value)}
                          placeholder="e.g. INV-2024-001"
                          disabled={isLoading}
                        />
                      </Box>
                      <Box className={pageStyles.formGroup}>
                        <Label htmlFor="vendorInvoiceDate">Invoice date</Label>
                        <Input
                          id="vendorInvoiceDate"
                          type="date"
                          value={vendorInvoiceDate}
                          onChange={(e) => setVendorInvoiceDate(e.target.value)}
                          disabled={isLoading}
                        />
                      </Box>
                      <Box className={pageStyles.formGroup}>
                        <Label htmlFor="vendorLineSubTotal">Line subtotal</Label>
                        <Input
                          id="vendorLineSubTotal"
                          type="text"
                          inputMode="decimal"
                          value={vendorLineSubTotal}
                          onChange={(e) => setVendorLineSubTotal(e.target.value)}
                          placeholder="0"
                          disabled={isLoading}
                        />
                      </Box>
                      <Box className={pageStyles.formGroup}>
                        <Label htmlFor="vendorTaxTotal">Tax total</Label>
                        <Input
                          id="vendorTaxTotal"
                          type="text"
                          inputMode="decimal"
                          value={vendorTaxTotal}
                          onChange={(e) => setVendorTaxTotal(e.target.value)}
                          placeholder="0"
                          disabled={isLoading}
                        />
                      </Box>
                      <Box className={pageStyles.formGroup}>
                        <Label htmlFor="vendorShippingCharge">Shipping / delivery</Label>
                        <Input
                          id="vendorShippingCharge"
                          type="text"
                          inputMode="decimal"
                          value={vendorShippingCharge}
                          onChange={(e) => setVendorShippingCharge(e.target.value)}
                          placeholder="0"
                          disabled={isLoading}
                        />
                      </Box>
                      <Box className={pageStyles.formGroup}>
                        <Label htmlFor="vendorOtherCharges">Other charges</Label>
                        <Input
                          id="vendorOtherCharges"
                          type="text"
                          inputMode="decimal"
                          value={vendorOtherCharges}
                          onChange={(e) => setVendorOtherCharges(e.target.value)}
                          placeholder="0"
                          disabled={isLoading}
                        />
                      </Box>
                      <Box className={pageStyles.formGroup}>
                        <Label htmlFor="vendorOverallDiscount">Overall discount</Label>
                        <Input
                          id="vendorOverallDiscount"
                          type="text"
                          inputMode="decimal"
                          value={vendorOverallDiscount}
                          onChange={(e) => setVendorOverallDiscount(e.target.value)}
                          placeholder="0"
                          disabled={isLoading}
                        />
                      </Box>
                      <Box className={pageStyles.formGroup}>
                        <Label htmlFor="vendorRoundOff">Round off</Label>
                        <Input
                          id="vendorRoundOff"
                          type="text"
                          inputMode="decimal"
                          value={vendorRoundOff}
                          onChange={(e) => setVendorRoundOff(e.target.value)}
                          placeholder="0"
                          disabled={isLoading}
                        />
                      </Box>
                      <Box
                        className={cn(pageStyles.formGroup, vendorStyles.sharedInfoGridSpanFull)}
                      >
                        <Label htmlFor="vendorInvoiceTotal">Invoice total</Label>
                        <Input
                          id="vendorInvoiceTotal"
                          type="text"
                          inputMode="decimal"
                          value={vendorInvoiceTotal}
                          placeholder="0"
                          disabled={isLoading}
                          readOnly
                        />
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Box className={pageStyles.separator}>
                <Box className={pageStyles.separatorLine}></Box>
                <Box className={pageStyles.separatorContent}>
                  <Text
                    as="span"
                    className={pageStyles.separatorIcon}
                    role="img"
                    aria-label="Sparkle icon"
                  >
                    ✨
                  </Text>
                  <Text as="span" className={pageStyles.separatorText}>
                    Or manually add products below
                  </Text>
                </Box>
                <Box className={pageStyles.separatorLine}></Box>
              </Box>

              {/* Products Section */}
              <Box className={pageStyles.productsSection} ref={productsSectionRef}>
                {showReviewBanner && (
                  <Box className={pageStyles.reviewBanner}>
                    <Box className={pageStyles.reviewBannerContent}>
                      <Box as="span" className={pageStyles.reviewBannerIcon} aria-hidden>
                        <Icon icon={ClipboardList} size="sm" />
                      </Box>
                      <Box className={pageStyles.reviewBannerText}>
                        <Text as="span" weight="bold">
                          Review Required:
                        </Text>{' '}
                        Please review the {reviewBannerItemsCount} item(s) below and fill in any
                        missing information before submitting.
                      </Box>
                      <Button
                        type="button"
                        className={pageStyles.reviewBannerClose}
                        onClick={() => setShowReviewBanner(false)}
                        aria-label="Close review banner"
                      >
                        ×
                      </Button>
                    </Box>
                  </Box>
                )}
                <Inline
                  justify="between"
                  align="center"
                  width="full"
                  className={pageStyles.productsHeader}
                >
                  <Text variant="heading3">Products</Text>
                  <Inline gap="md" align="center">
                    {products.length > 0 ? (
                      <ViewModeToggle
                        value={productViewMode}
                        aria-label="Product view mode"
                        onChange={(mode) => {
                          setProductViewMode(mode);
                          localStorage.setItem('product-registration-view-mode', mode);
                        }}
                      />
                    ) : null}
                    <Button
                      type="button"
                      variant="solid"
                      size="sm"
                      leftIcon={<Icon icon={Plus} size="sm" />}
                      onClick={handleAddProduct}
                      disabled={isLoading || !registrationSchemaReady}
                      title={
                        registrationSchemaReady
                          ? undefined
                          : 'Waiting for shop product schema to load'
                      }
                    >
                      Add Product
                    </Button>
                  </Inline>
                </Inline>

                {!registrationSchemaReady ? (
                  <Box className={pageStyles.schemaLoadingState} role="status" aria-live="polite">
                    {schemaLoadError ? (
                      <>
                        <Text variant="body" weight="semibold">
                          Could not load product fields
                        </Text>
                        <Text variant="caption" color="secondary">
                          {schemaLoadError}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Spinner size="md" aria-hidden />
                        <Text variant="body" weight="semibold">
                          Loading product fields…
                        </Text>
                        <Text variant="caption" color="secondary">
                          Vertical columns come from your shop schema only — no fields are shown
                          until loading finishes.
                        </Text>
                      </>
                    )}
                  </Box>
                ) : (
                  <>
                    {products.length > 0 && (
                      <Text className={pageStyles.keyboardNavHint}>
                        <Text as="span" className={pageStyles.keyboardNavHintLabel}>
                          Keyboard:
                        </Text>{' '}
                        <Text as="kbd" color="primary" className={pageStyles.kbdInline}>
                          Enter
                        </Text>{' '}
                        next field ·{' '}
                        <Text as="kbd" color="primary" className={pageStyles.kbdInline}>
                          ↑
                        </Text>
                        <Text as="kbd" color="primary" className={pageStyles.kbdInline}>
                          ↓
                        </Text>{' '}
                        {productViewMode === 'grid' ? 'same column' : 'previous / next'}
                        {' · '}
                        <Text as="kbd" color="primary" className={pageStyles.kbdInline}>
                          Shift
                        </Text>
                        +
                        <Text as="kbd" color="primary" className={pageStyles.kbdInline}>
                          Enter
                        </Text>{' '}
                        back
                      </Text>
                    )}

                    {products.length === 0 ? (
                      <Box className={pageStyles.emptyState}>
                        <Text>
                          No products added yet. Click &quot;Add Product&quot; to get started.
                        </Text>
                      </Box>
                    ) : productViewMode === 'grid' ? (
                      <Box
                        className={denseDataGrid.wrap}
                        {...{ 'data-keyboard-nav': KEYBOARD_NAV_GRID }}
                        onKeyDownCapture={(e: React.KeyboardEvent<HTMLElement>) => {
                          if (shouldSkipNestedFormKeyboardNav(document.activeElement)) {
                            return;
                          }
                          runFormKeyboardNavigation(e, e.currentTarget, 'grid');
                        }}
                      >
                        <Table
                          key={schemaModeForBilling(billingMode)}
                          className={denseDataGrid.table}
                        >
                          <TableHead>
                            <TableRow>
                              <TableHeaderCell className={denseDataGrid.th}>#</TableHeaderCell>
                              <TableHeaderCell className={denseDataGrid.th}>
                                Barcode
                              </TableHeaderCell>
                              <VerticalRegistrationGridCompanyHeader field={companyField} />
                              <TableHeaderCell className={denseDataGrid.th}>
                                Product *
                              </TableHeaderCell>
                              <VerticalRegistrationGridHeaders
                                fields={verticalRegistrationFields}
                              />
                              <TableHeaderCell className={denseDataGrid.th}>Qty *</TableHeaderCell>
                              <TableHeaderCell className={denseDataGrid.th}>
                                Packaging
                              </TableHeaderCell>
                              <TableHeaderCell className={denseDataGrid.th}>
                                Location *
                              </TableHeaderCell>
                              {sellDirectField && (
                                <TableHeaderCell className={denseDataGrid.th}>
                                  {fieldLabel(sellDirectField)} *
                                </TableHeaderCell>
                              )}
                              {billingMode !== 'BASIC' && (
                                <TableHeaderCell className={denseDataGrid.th}>HSN</TableHeaderCell>
                              )}
                              {isCompactPriceUi ? (
                                <>
                                  <TableHeaderCell className={denseDataGrid.th}>
                                    Rate *
                                  </TableHeaderCell>
                                  <TableHeaderCell className={denseDataGrid.th}>
                                    {isRetailPricing ? 'Selling Price *' : 'Sell price'}
                                  </TableHeaderCell>
                                </>
                              ) : (
                                <>
                                  <TableHeaderCell className={denseDataGrid.th}>
                                    PTS *
                                  </TableHeaderCell>
                                  <TableHeaderCell className={denseDataGrid.th}>
                                    PTR *
                                  </TableHeaderCell>
                                  <TableHeaderCell className={denseDataGrid.th}>
                                    MRP *
                                  </TableHeaderCell>
                                </>
                              )}
                              {showCommercialTerms ? (
                                <>
                                  <TableHeaderCell className={denseDataGrid.th}>
                                    Sale deal type
                                  </TableHeaderCell>
                                  <TableHeaderCell
                                    className={denseDataGrid.th}
                                    title="When deal type is Percentage, scheme % is required."
                                  >
                                    Sale scheme
                                  </TableHeaderCell>
                                  <TableHeaderCell className={denseDataGrid.th}>
                                    Sale disc %
                                  </TableHeaderCell>
                                  <TableHeaderCell className={denseDataGrid.th}>
                                    Purchase deal type
                                  </TableHeaderCell>
                                  <TableHeaderCell className={denseDataGrid.th}>
                                    Purchase scheme
                                  </TableHeaderCell>
                                  <TableHeaderCell className={denseDataGrid.th}>
                                    Purchase disc %
                                  </TableHeaderCell>
                                  <TableHeaderCell className={denseDataGrid.th}>
                                    Disc appl.
                                  </TableHeaderCell>
                                </>
                              ) : null}
                              {billingMode === 'REGULAR' && (
                                <>
                                  <TableHeaderCell className={denseDataGrid.th}>
                                    CGST %
                                  </TableHeaderCell>
                                  <TableHeaderCell className={denseDataGrid.th}>
                                    SGST %
                                  </TableHeaderCell>
                                </>
                              )}
                              <TableHeaderCell className={denseDataGrid.th}>
                                Actions
                              </TableHeaderCell>
                            </TableRow>
                            <GridBulkFillRow
                              bulk={gridBulkFill}
                              billingMode={billingMode}
                              compactPriceUi={isCompactPriceUi}
                              showCommercialTerms={showCommercialTerms}
                              companyField={companyField}
                              sellDirectField={sellDirectField}
                              schemaFields={verticalRegistrationFields}
                              isLoading={isLoading}
                              onBulkChange={handleGridBulkFillChange}
                              onVerticalBulkChange={handleVerticalBulkChange}
                              onApply={handleApplyGridBulkFill}
                            />
                          </TableHead>
                          <TableBody>
                            {products.map((product, idx) => (
                              <TableRow key={product.id} className={denseDataGrid.tr}>
                                <TableCell className={denseDataGrid.td}>{idx + 1}</TableCell>
                                <TableCell className={denseDataGrid.td}>
                                  <Inline gap="xs" align="center">
                                    <Input
                                      type="text"
                                      className={denseDataGrid.input}
                                      placeholder="Barcode"
                                      value={product.barcode}
                                      onChange={(e) =>
                                        handleProductChange(product.id, 'barcode', e.target.value)
                                      }
                                      disabled={isLoading}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      aria-label="Generate barcode"
                                      title="Generate barcode"
                                      disabled={isLoading || generatingBarcodeId === product.id}
                                      onClick={() => void handleGenerateBarcode(product.id)}
                                    >
                                      {generatingBarcodeId === product.id ? (
                                        <Spinner size="sm" />
                                      ) : (
                                        <Icon icon={Wand2} size="sm" />
                                      )}
                                    </Button>
                                    {product.barcode?.trim() ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        aria-label="Print barcode sticker"
                                        title="Print sticker"
                                        disabled={isLoading}
                                        onClick={() => handlePrintRowBarcode(product)}
                                      >
                                        <Icon icon={Printer} size="sm" />
                                      </Button>
                                    ) : null}
                                  </Inline>
                                </TableCell>
                                <VerticalRegistrationGridCompanyCell
                                  field={companyField}
                                  product={product}
                                  productId={product.id}
                                  disabled={isLoading}
                                  onFieldChange={(field, value) =>
                                    applyVerticalFieldChange(product.id, field, value)
                                  }
                                />
                                <TableCell className={denseDataGrid.td}>
                                  <Box className={productChrome.typeaheadWrap}>
                                    <Input
                                      type="text"
                                      className={denseDataGrid.input}
                                      placeholder="Product name"
                                      value={product.name}
                                      autoComplete="off"
                                      onChange={(e) => handleNameChange(product.id, e.target.value)}
                                      onBlur={() => handleNameBlur(product.id)}
                                      disabled={isLoading}
                                      required
                                    />
                                    {suggestionRowId === product.id &&
                                    productSuggestions.length > 0 ? (
                                      <Box as="ul" className={productChrome.typeaheadMenu}>
                                        {productSuggestions.map((s) => (
                                          <Box as="li" key={s.id}>
                                            <ProductSuggestionOption
                                              suggestion={s}
                                              onSelect={() =>
                                                void applyProductPrefill(product.id, s)
                                              }
                                            />
                                          </Box>
                                        ))}
                                      </Box>
                                    ) : null}
                                  </Box>
                                </TableCell>
                                <VerticalRegistrationGridCells
                                  fields={verticalRegistrationFields}
                                  product={product}
                                  productId={product.id}
                                  disabled={isLoading}
                                  onFieldChange={(field, value) =>
                                    applyVerticalFieldChange(product.id, field, value)
                                  }
                                />
                                <TableCell className={denseDataGrid.td}>
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className={denseDataGrid.inputNarrow}
                                    placeholder="0"
                                    value={product.count === 0 ? '' : product.count}
                                    onChange={(e) =>
                                      handleIntegerChange(product.id, 'count', e.target.value)
                                    }
                                    disabled={isLoading}
                                    required
                                  />
                                </TableCell>
                                <TableCell className={denseDataGrid.td}>
                                  <PackagingUnitInput
                                    label=""
                                    compact
                                    baseUnit={product.baseUnit ?? ''}
                                    factor={packagingFactorForDisplay(
                                      product.unitsPerPack ?? product.conversionFactor,
                                    )}
                                    packagingUnits={packagingUnits}
                                    onChange={(uqc, f) => {
                                      const def = packagingUnits.find((u) => u.uqc === uqc);
                                      const upp = packagingFactorToUnitsPerPack(f, def);
                                      handleProductChange(product.id, 'baseUnit', uqc);
                                      handleProductChange(product.id, 'unitsPerPack', upp);
                                      handleProductChange(product.id, 'conversionFactor', upp);
                                    }}
                                    disabled={isLoading}
                                  />
                                </TableCell>
                                <TableCell className={denseDataGrid.td}>
                                  <Input
                                    type="text"
                                    className={denseDataGrid.input}
                                    placeholder="Location"
                                    value={product.location}
                                    onChange={(e) =>
                                      handleProductChange(product.id, 'location', e.target.value)
                                    }
                                    disabled={isLoading}
                                    required
                                  />
                                </TableCell>
                                {sellDirectField && (
                                  <TableCell className={denseDataGrid.td}>
                                    <Select
                                      className={denseDataGrid.input}
                                      value={
                                        getVerticalFieldValue(product, sellDirectField) || 'no'
                                      }
                                      onChange={(e) =>
                                        applyVerticalFieldChange(
                                          product.id,
                                          sellDirectField,
                                          e.target.value,
                                        )
                                      }
                                      disabled={isLoading}
                                      required
                                    >
                                      <option value="no">No</option>
                                      <option value="yes">Yes</option>
                                    </Select>
                                  </TableCell>
                                )}
                                {billingMode !== 'BASIC' && (
                                  <>
                                    <TableCell className={denseDataGrid.td}>
                                      <Input
                                        type="text"
                                        className={denseDataGrid.input}
                                        placeholder="HSN"
                                        value={product.hsn || ''}
                                        onChange={(e) =>
                                          handleProductChange(product.id, 'hsn', e.target.value)
                                        }
                                        disabled={isLoading}
                                      />
                                    </TableCell>
                                  </>
                                )}
                                {isCompactPriceUi ? (
                                  <>
                                    <TableCell className={denseDataGrid.td}>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        pattern="[0-9]*\.?[0-9]*"
                                        className={denseDataGrid.inputNarrow}
                                        placeholder="Rate"
                                        value={product.costPrice === 0 ? '' : product.costPrice}
                                        onChange={(e) =>
                                          handleDecimalChange(
                                            product.id,
                                            'costPrice',
                                            e.target.value,
                                          )
                                        }
                                        disabled={isLoading}
                                        required
                                      />
                                    </TableCell>
                                    <TableCell className={denseDataGrid.td}>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        pattern="[0-9]*\.?[0-9]*"
                                        className={denseDataGrid.inputNarrow}
                                        placeholder={isRetailPricing ? 'Selling Price' : 'Optional'}
                                        value={
                                          product.sellingPrice === 0 || product.sellingPrice == null
                                            ? ''
                                            : product.sellingPrice
                                        }
                                        onChange={(e) =>
                                          handleDecimalChange(
                                            product.id,
                                            'sellingPrice',
                                            e.target.value,
                                          )
                                        }
                                        disabled={isLoading}
                                        required={isRetailPricing}
                                      />
                                    </TableCell>
                                  </>
                                ) : (
                                  <>
                                    <TableCell className={denseDataGrid.td}>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        pattern="[0-9]*\.?[0-9]*"
                                        className={denseDataGrid.inputNarrow}
                                        placeholder="PTS"
                                        value={product.costPrice === 0 ? '' : product.costPrice}
                                        onChange={(e) =>
                                          handleDecimalChange(
                                            product.id,
                                            'costPrice',
                                            e.target.value,
                                          )
                                        }
                                        disabled={isLoading}
                                        required
                                      />
                                    </TableCell>
                                    <TableCell className={denseDataGrid.td}>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        pattern="[0-9]*\.?[0-9]*"
                                        className={denseDataGrid.inputNarrow}
                                        placeholder="PTR"
                                        value={
                                          product.priceToRetail === 0 ? '' : product.priceToRetail
                                        }
                                        onChange={(e) =>
                                          handleDecimalChange(
                                            product.id,
                                            'priceToRetail',
                                            e.target.value,
                                          )
                                        }
                                        disabled={isLoading}
                                        required
                                      />
                                    </TableCell>
                                    <TableCell className={denseDataGrid.td}>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        pattern="[0-9]*\.?[0-9]*"
                                        className={denseDataGrid.inputNarrow}
                                        placeholder="MRP"
                                        value={
                                          product.maximumRetailPrice === 0
                                            ? ''
                                            : product.maximumRetailPrice
                                        }
                                        onChange={(e) =>
                                          handleDecimalChange(
                                            product.id,
                                            'maximumRetailPrice',
                                            e.target.value,
                                          )
                                        }
                                        disabled={isLoading}
                                        required
                                      />
                                    </TableCell>
                                  </>
                                )}
                                {showCommercialTerms ? (
                                  <>
                                    <TableCell className={denseDataGrid.td}>
                                      <Label
                                        className={denseDataGrid.srOnly}
                                        htmlFor={`grid-scheme-type-${product.id}`}
                                      >
                                        Sale scheme deal type
                                      </Label>
                                      <Select
                                        id={`grid-scheme-type-${product.id}`}
                                        className={denseDataGrid.select}
                                        value={product.schemeType ?? 'FIXED_UNITS'}
                                        onChange={(e) => {
                                          const val = e.target.value as SchemeType;
                                          handleProductChange(product.id, 'schemeType', val);
                                          if (val === 'PERCENTAGE') {
                                            handleProductChange(product.id, 'scheme', null);
                                          } else {
                                            handleProductChange(
                                              product.id,
                                              'schemePercentage',
                                              null,
                                            );
                                          }
                                        }}
                                        disabled={isLoading}
                                      >
                                        <option value="FIXED_UNITS">Free units</option>
                                        <option value="PERCENTAGE">Percentage</option>
                                      </Select>
                                    </TableCell>
                                    <TableCell className={denseDataGrid.td}>
                                      <Label
                                        className={denseDataGrid.srOnly}
                                        htmlFor={`grid-sale-scheme-${product.id}`}
                                      >
                                        Sale scheme (e.g. 10+2 or 10%; required when deal type is
                                        Percentage)
                                      </Label>
                                      <Input
                                        id={`grid-sale-scheme-${product.id}`}
                                        type="text"
                                        className={denseDataGrid.inputNarrow}
                                        placeholder="e.g. 10+2"
                                        value={
                                          gridSchemeDrafts[product.id]?.sale ??
                                          ((product.schemeType ?? 'FIXED_UNITS') === 'PERCENTAGE'
                                            ? product.schemePercentage != null
                                              ? `${product.schemePercentage}%`
                                              : ''
                                            : product.schemePayFor != null ||
                                              product.schemeFree != null
                                            ? `${product.schemePayFor ?? 0}+${
                                                product.schemeFree ?? 0
                                              }`
                                            : '')
                                        }
                                        required={
                                          (product.schemeType ?? 'FIXED_UNITS') === 'PERCENTAGE'
                                        }
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setGridSchemeDrafts((prev) => ({
                                            ...prev,
                                            [product.id]: {
                                              ...prev[product.id],
                                              sale: v,
                                            },
                                          }));
                                        }}
                                        onBlur={() => {
                                          const raw = (
                                            gridSchemeDrafts[product.id]?.sale ?? ''
                                          ).trim();
                                          setGridSchemeDrafts((prev) => {
                                            const next = { ...prev };
                                            const cur = next[product.id];
                                            if (cur) {
                                              const { sale: _, ...rest } = cur;
                                              if (Object.keys(rest).length) {
                                                next[product.id] = rest;
                                              } else {
                                                delete next[product.id];
                                              }
                                            }
                                            return next;
                                          });
                                          if (raw === '') {
                                            handleProductChange(product.id, 'schemePayFor', null);
                                            handleProductChange(product.id, 'schemeFree', null);
                                            handleProductChange(
                                              product.id,
                                              'schemePercentage',
                                              null,
                                            );
                                            return;
                                          }
                                          if (raw.endsWith('%')) {
                                            const num = parseFloat(raw.slice(0, -1));
                                            if (!isNaN(num) && num >= -100 && num <= 100) {
                                              handleProductChange(
                                                product.id,
                                                'schemeType',
                                                'PERCENTAGE',
                                              );
                                              handleProductChange(
                                                product.id,
                                                'schemePercentage',
                                                num,
                                              );
                                              handleProductChange(product.id, 'schemePayFor', null);
                                              handleProductChange(product.id, 'schemeFree', null);
                                            }
                                            return;
                                          }
                                          const plusIdx = raw.indexOf('+');
                                          if (plusIdx >= 0) {
                                            const left = parseInt(raw.slice(0, plusIdx).trim(), 10);
                                            const right = parseInt(
                                              raw.slice(plusIdx + 1).trim(),
                                              10,
                                            );
                                            if (
                                              !isNaN(left) &&
                                              !isNaN(right) &&
                                              left >= 0 &&
                                              right >= 0
                                            ) {
                                              handleProductChange(
                                                product.id,
                                                'schemeType',
                                                'FIXED_UNITS',
                                              );
                                              handleProductChange(product.id, 'schemePayFor', left);
                                              handleProductChange(product.id, 'schemeFree', right);
                                              handleProductChange(
                                                product.id,
                                                'schemePercentage',
                                                null,
                                              );
                                            }
                                          }
                                        }}
                                        disabled={isLoading}
                                      />
                                    </TableCell>
                                    <TableCell className={denseDataGrid.td}>
                                      <Input
                                        type="number"
                                        className={denseDataGrid.inputNarrow}
                                        placeholder="—"
                                        step="0.01"
                                        min={-100}
                                        max={100}
                                        value={
                                          product.saleAdditionalDiscount === null ||
                                          product.saleAdditionalDiscount === undefined
                                            ? ''
                                            : product.saleAdditionalDiscount
                                        }
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          if (v === '') {
                                            handleProductChange(
                                              product.id,
                                              'saleAdditionalDiscount',
                                              null,
                                            );
                                          } else {
                                            const n = parseFloat(v);
                                            if (!isNaN(n) && n >= -100 && n <= 100) {
                                              handleProductChange(
                                                product.id,
                                                'saleAdditionalDiscount',
                                                n,
                                              );
                                            }
                                          }
                                        }}
                                        disabled={isLoading}
                                      />
                                    </TableCell>
                                    <TableCell className={denseDataGrid.td}>
                                      <Label
                                        className={denseDataGrid.srOnly}
                                        htmlFor={`grid-purchase-scheme-type-${product.id}`}
                                      >
                                        Purchase scheme deal type
                                      </Label>
                                      <Select
                                        id={`grid-purchase-scheme-type-${product.id}`}
                                        className={denseDataGrid.select}
                                        value={product.purchaseSchemeType ?? 'FIXED_UNITS'}
                                        onChange={(e) => {
                                          const val = e.target.value as PurchaseSchemeInputType;
                                          if (val === 'PERCENTAGE') {
                                            handleApplyPurchasePatch(product.id, {
                                              purchaseSchemeType: 'PERCENTAGE',
                                              purchaseSchemePercentage:
                                                product.purchaseSchemePercentage ?? null,
                                              ...clearPurchaseSchemePatch(product),
                                            });
                                          } else if (val === 'FREE_QUANTITY') {
                                            const billable =
                                              billableCountForPurchaseFreeQty(product);
                                            handleApplyPurchasePatch(product.id, {
                                              purchaseSchemeType: 'FREE_QUANTITY',
                                              purchaseSchemePayFor: null,
                                              purchaseSchemeFree: null,
                                              purchaseSchemePercentage: null,
                                              purchaseSchemeFreeQty: null,
                                              ...(product.purchaseSchemeFreeQty != null
                                                ? { count: billable }
                                                : {}),
                                            });
                                          } else {
                                            const billable =
                                              billableCountForPurchaseFreeQty(product);
                                            handleApplyPurchasePatch(product.id, {
                                              purchaseSchemeType: 'FIXED_UNITS',
                                              purchaseSchemePercentage: null,
                                              purchaseSchemeFreeQty: null,
                                              ...(product.purchaseSchemeFreeQty != null
                                                ? { count: billable }
                                                : {}),
                                            });
                                          }
                                        }}
                                        disabled={isLoading}
                                      >
                                        <option value="FIXED_UNITS">Deal ratio</option>
                                        <option value="FREE_QUANTITY">Free quantity</option>
                                        <option value="PERCENTAGE">Percentage</option>
                                      </Select>
                                    </TableCell>
                                    <TableCell className={denseDataGrid.td}>
                                      <Input
                                        type="text"
                                        className={denseDataGrid.inputNarrow}
                                        placeholder={
                                          (product.purchaseSchemeType ?? 'FIXED_UNITS') ===
                                          'FREE_QUANTITY'
                                            ? (Number(product.count) || 0) > 0
                                              ? 'e.g. 60'
                                              : 'e.g. 60 or 0 + 60'
                                            : 'e.g. 10 + 2 or 4 + 1'
                                        }
                                        value={
                                          gridSchemeDrafts[product.id]?.purchase ??
                                          ((product.purchaseSchemeType ?? 'FIXED_UNITS') ===
                                          'PERCENTAGE'
                                            ? product.purchaseSchemePercentage != null
                                              ? `${product.purchaseSchemePercentage}%`
                                              : ''
                                            : formatPurchaseSchemeDealForDisplay(product))
                                        }
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setGridSchemeDrafts((prev) => ({
                                            ...prev,
                                            [product.id]: {
                                              ...prev[product.id],
                                              purchase: v,
                                            },
                                          }));
                                        }}
                                        onBlur={() => {
                                          const raw = (
                                            gridSchemeDrafts[product.id]?.purchase ?? ''
                                          ).trim();
                                          setGridSchemeDrafts((prev) => {
                                            const next = { ...prev };
                                            const cur = next[product.id];
                                            if (cur) {
                                              const { purchase: _, ...rest } = cur;
                                              if (Object.keys(rest).length) {
                                                next[product.id] = rest;
                                              } else {
                                                delete next[product.id];
                                              }
                                            }
                                            return next;
                                          });
                                          if (raw === '') {
                                            handleApplyPurchasePatch(
                                              product.id,
                                              clearPurchaseSchemePatch(product),
                                            );
                                            return;
                                          }
                                          if (
                                            (product.purchaseSchemeType ?? 'FIXED_UNITS') ===
                                            'FREE_QUANTITY'
                                          ) {
                                            const patch = applyPurchaseFreeQuantityFromRaw(
                                              product,
                                              raw,
                                            );
                                            if (patch) {
                                              handleApplyPurchasePatch(product.id, patch);
                                            }
                                            return;
                                          }
                                          const parsed = parsePurchaseSchemeDraft(raw);
                                          if (!parsed) return;
                                          handleApplyPurchasePatch(product.id, {
                                            ...parsed,
                                            purchaseSchemeFreeQty: null,
                                          });
                                        }}
                                        disabled={isLoading}
                                      />
                                    </TableCell>
                                    <TableCell className={denseDataGrid.td}>
                                      <Input
                                        type="number"
                                        className={denseDataGrid.inputNarrow}
                                        placeholder="—"
                                        step="0.01"
                                        min={0}
                                        max={100}
                                        value={
                                          product.purchaseAdditionalDiscount === null ||
                                          product.purchaseAdditionalDiscount === undefined
                                            ? ''
                                            : product.purchaseAdditionalDiscount
                                        }
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          if (v === '') {
                                            handleProductChange(
                                              product.id,
                                              'purchaseAdditionalDiscount',
                                              null,
                                            );
                                          } else {
                                            const n = parseFloat(v);
                                            if (!isNaN(n) && n >= 0 && n <= 100) {
                                              handleProductChange(
                                                product.id,
                                                'purchaseAdditionalDiscount',
                                                n,
                                              );
                                            }
                                          }
                                        }}
                                        disabled={isLoading}
                                      />
                                    </TableCell>
                                    <TableCell className={denseDataGrid.td}>
                                      <Label
                                        className={denseDataGrid.srOnly}
                                        htmlFor={`grid-discount-applicable-${product.id}`}
                                      >
                                        Discount applicable
                                      </Label>
                                      <Select
                                        id={`grid-discount-applicable-${product.id}`}
                                        className={denseDataGrid.select}
                                        value={product.discountApplicable ?? ''}
                                        onChange={(e) => {
                                          const val = e.target.value as DiscountApplicable | '';
                                          handleProductChange(
                                            product.id,
                                            'discountApplicable',
                                            val === '' ? undefined : (val as DiscountApplicable),
                                          );
                                        }}
                                        disabled={isLoading}
                                      >
                                        <option value="">—</option>
                                        <option value="DISCOUNT">Discount</option>
                                        <option value="SCHEME">Scheme</option>
                                        <option value="DISCOUNT_AND_SCHEME">Both</option>
                                      </Select>
                                    </TableCell>
                                  </>
                                ) : null}
                                {billingMode === 'REGULAR' && (
                                  <>
                                    <TableCell className={denseDataGrid.td}>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        className={denseDataGrid.inputNarrow}
                                        placeholder="CGST"
                                        value={product.cgst || ''}
                                        onChange={(e) =>
                                          handleProductChange(product.id, 'cgst', e.target.value)
                                        }
                                        disabled={isLoading}
                                      />
                                    </TableCell>
                                    <TableCell className={denseDataGrid.td}>
                                      <Input
                                        type="text"
                                        inputMode="decimal"
                                        className={denseDataGrid.inputNarrow}
                                        placeholder="SGST"
                                        value={product.sgst || ''}
                                        onChange={(e) =>
                                          handleProductChange(product.id, 'sgst', e.target.value)
                                        }
                                        disabled={isLoading}
                                      />
                                    </TableCell>
                                  </>
                                )}
                                <TableCell className={denseDataGrid.td}>
                                  <Button
                                    type="button"
                                    className={denseDataGrid.removeBtn}
                                    onClick={() => handleRemoveProduct(product.id)}
                                    disabled={isLoading}
                                    aria-label="Remove product"
                                  >
                                    ×
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <Text className={denseDataGrid.footnote}>
                          Use the fill row above to copy the same value into every row (only columns
                          you type in are updated). Packaging is optional in grid view (defaults to
                          1× on save). Columns marked * match required fields.
                          {isRetailPricing
                            ? ' Enter Rate and Selling Price (MRP/PTR set automatically). Schemes, item type, and discount-applicable are available. Use list view for reminders.'
                            : isSimplePricing
                            ? ' Customer price is set on the Menu; sell price here is optional reference only. Use list view for custom reminders.'
                            : ' Use list view for rate tiers, description, and reminders.'}
                        </Text>
                      </Box>
                    ) : (
                      <Box className={accordionStyles.productsList}>
                        {products.map((product, index) => (
                          <ProductAccordion
                            key={product.id}
                            product={product}
                            companyField={companyField}
                            sellDirectField={sellDirectField}
                            schemaFields={verticalRegistrationFields}
                            packagingUnits={packagingUnits}
                            billingMode={billingMode}
                            simplePricing={isSimplePricing}
                            retailPricing={isRetailPricing}
                            showCommercialTerms={showCommercialTerms}
                            showRateTiers={showRateTiers}
                            index={index}
                            onToggle={() => handleToggleProduct(product.id)}
                            onRemove={() => handleRemoveProduct(product.id)}
                            onChange={handleProductChange}
                            onVerticalFieldChange={applyVerticalFieldChange}
                            onApplyPurchasePatch={handleApplyPurchasePatch}
                            onIntegerChange={handleIntegerChange}
                            onDecimalChange={handleDecimalChange}
                            onCustomRemindersChange={(reminders) =>
                              handleProductChange(product.id, 'customReminders', reminders)
                            }
                            productSuggestions={productSuggestions}
                            suggestionRowId={suggestionRowId}
                            onNameChange={handleNameChange}
                            onApplyProductPrefill={applyProductPrefill}
                            onNameBlur={handleNameBlur}
                            isLoading={isLoading}
                            generatingBarcode={generatingBarcodeId === product.id}
                            onGenerateBarcode={() => void handleGenerateBarcode(product.id)}
                            onPrintBarcode={() => handlePrintRowBarcode(product)}
                            isoToLocalDateTime={isoToLocalDateTime}
                            localDateTimeToIso={localDateTimeToIso}
                          />
                        ))}
                      </Box>
                    )}
                  </>
                )}
              </Box>

              {products.length > 0 && (
                <>
                  <Stack gap="sm" className={pageStyles.actionsDividerLg}>
                    <PaymentMethodSplit
                      context="purchase"
                      title="Payment to vendor"
                      intro="Pick how this invoice was settled. Any amount left on credit posts to Credit balances under what you owe this vendor."
                      total={vendorInvoiceTotalNum}
                      value={{
                        method: vendorPaymentMethod,
                        split: vendorPaymentSplit,
                      }}
                      onChange={(next) => {
                        setVendorPaymentMethod(next.method);
                        setVendorPaymentSplit(next.split);
                      }}
                      disabled={isLoading}
                    />
                    {vendorPaymentMethod &&
                    vendorInvoiceTotalNum > 0 &&
                    isCreditMethod(vendorPaymentMethod) ? (
                      <Text variant="caption" color="secondary" aria-live="polite">
                        ₹{vendorCreditLedgerOutstandingNum.toFixed(2)} will be tracked in{' '}
                        <Text as="span" weight="bold">
                          Credit balances
                        </Text>{' '}
                        (settle later in partial payments).
                      </Text>
                    ) : null}
                  </Stack>
                  <Inline gap="md" justify="end" className={pageStyles.actionsDivider}>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="solid"
                      onClick={() => void handleSubmit()}
                      disabled={isLoading || !vendorPaymentMethod}
                      title={
                        !vendorPaymentMethod ? 'Select a payment method to continue' : undefined
                      }
                    >
                      {isLoading
                        ? `Registering ${products.length} Product(s)...`
                        : `Register ${products.length} Product(s)`}
                    </Button>
                  </Inline>
                </>
              )}
            </Stack>
          </Stack>
        </CardBody>
      </Card>

      {/* Vendor Creation Modal */}
      <Modal
        open={showVendorModal}
        onClose={() => !isCreatingVendor && handleCloseVendorModal()}
        size="lg"
      >
        <Modal.Header
          title="Create New Vendor"
          onClose={isCreatingVendor ? undefined : handleCloseVendorModal}
        />
        <Modal.Body>
          <Stack gap="md">
            <FormField label="Vendor Name" htmlFor="vendorName" required>
              <Input
                type="text"
                id="vendorName"
                placeholder="Enter vendor name"
                value={vendorFormData.name}
                onChange={(e) =>
                  setVendorFormData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                disabled={isCreatingVendor}
                required
              />
            </FormField>

            <Box className={vendorStyles.modalFormGrid}>
              <FormField label="Contact Phone" htmlFor="vendorContactPhone" required>
                <Input
                  type="tel"
                  id="vendorContactPhone"
                  placeholder="Enter contact phone"
                  value={vendorFormData.contactPhone}
                  onChange={(e) =>
                    setVendorFormData((prev) => ({
                      ...prev,
                      contactPhone: e.target.value,
                    }))
                  }
                  disabled={isCreatingVendor}
                  required
                />
              </FormField>
              <FormField label="Business Type" htmlFor="vendorBusinessType" required>
                <Select
                  id="vendorBusinessType"
                  value={showCustomBusinessType ? 'OTHER' : vendorFormData.businessType}
                  onChange={(e) => {
                    if (e.target.value === 'OTHER') {
                      setShowCustomBusinessType(true);
                      setCustomBusinessType('');
                    } else {
                      setShowCustomBusinessType(false);
                      setCustomBusinessType('');
                      setVendorFormData((prev) => ({
                        ...prev,
                        businessType: e.target.value as VendorBusinessType,
                      }));
                    }
                  }}
                  disabled={isCreatingVendor}
                  required
                >
                  <option value="WHOLESALE">Wholesale</option>
                  <option value="RETAIL">Retail</option>
                  <option value="MANUFACTURER">Manufacturer</option>
                  <option value="DISTRIBUTOR">Distributor</option>
                  <option value="C&F">C&F</option>
                  <option value="OTHER">Other</option>
                </Select>
              </FormField>
            </Box>

            {showCustomBusinessType ? (
              <FormField label="Custom Business Type" htmlFor="customBusinessType" required>
                <Input
                  type="text"
                  id="customBusinessType"
                  placeholder="Enter custom business type"
                  value={customBusinessType}
                  onChange={(e) => setCustomBusinessType(e.target.value)}
                  disabled={isCreatingVendor}
                  required
                />
              </FormField>
            ) : null}

            <FormField
              label="Contact Email"
              htmlFor="vendorContactEmail"
              hint="If this vendor is a registered user, check their email to link the account."
            >
              <Box className={vendorStyles.searchRow}>
                <Input
                  type="email"
                  id="vendorContactEmail"
                  placeholder="Enter contact email"
                  value={vendorFormData.contactEmail}
                  onChange={(e) => {
                    setVendorFormData((prev) => ({
                      ...prev,
                      contactEmail: e.target.value,
                    }));
                    if (linkedUser || userSearchMessage) {
                      setLinkedUser(null);
                      setUserSearchMessage(null);
                    }
                  }}
                  disabled={isCreatingVendor}
                  className={productChrome.searchGrow}
                />
                <Box className={vendorStyles.searchActions}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSearchUserForLink}
                    disabled={
                      isCreatingVendor || isSearchingUser || !vendorFormData.contactEmail?.trim()
                    }
                    loading={isSearchingUser}
                  >
                    {isSearchingUser ? 'Checking…' : 'Check'}
                  </Button>
                  {linkedUser ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleUnlinkUser}
                      disabled={isCreatingVendor}
                    >
                      Unlink
                    </Button>
                  ) : null}
                </Box>
              </Box>
            </FormField>

            {userSearchMessage ? (
              <Box className={vendorStyles.linkStatus}>
                {linkedUser ? <Badge variant="success">Linked</Badge> : null}
                <Text variant="caption" color={linkedUser ? 'success' : 'secondary'}>
                  {userSearchMessage}
                </Text>
              </Box>
            ) : null}

            <FormField label="Address" htmlFor="vendorAddress">
              <Textarea
                id="vendorAddress"
                placeholder="Enter address"
                value={vendorFormData.address}
                onChange={(e) =>
                  setVendorFormData((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
                disabled={isCreatingVendor}
                rows={2}
              />
            </FormField>

            <FormField label="GSTIN / UIN" htmlFor="vendorGstinUin">
              <Input
                type="text"
                id="vendorGstinUin"
                placeholder="Enter GSTIN / UIN number"
                value={vendorFormData.gstinUin ?? ''}
                onChange={(e) =>
                  setVendorFormData((prev) => ({
                    ...prev,
                    gstinUin: e.target.value,
                  }))
                }
                disabled={isCreatingVendor}
              />
            </FormField>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Button
            type="button"
            variant="outline"
            onClick={handleCloseVendorModal}
            disabled={isCreatingVendor}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="solid"
            onClick={handleCreateVendor}
            disabled={isCreatingVendor}
            loading={isCreatingVendor}
          >
            {isCreatingVendor ? 'Creating...' : 'Create Vendor'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* QR Code Upload Modal */}
      <Modal open={showQrModal} onClose={handleCloseQrModal} size="sm">
        <Modal.Header title="Scan QR Code to Upload Invoice" />
        <Modal.Body>
          <Box className={pageStyles.qrModalBody}>
            {uploadUrl && (
              <Box className={pageStyles.qrCodeFrame}>
                <QRCodeSVG value={uploadUrl} size={256} />
              </Box>
            )}
            <Box textAlign="center">
              <Text className={pageStyles.qrLead}>
                Scan this QR code with your mobile device to upload one or more invoice photos
                (multi-page bills).
              </Text>
              <Text className={pageStyles.qrStatus}>
                Status:{' '}
                <Text as="span" weight="bold">
                  {uploadStatus || 'PENDING'}
                </Text>
              </Text>
              {isPolling && (
                <Box className={pageStyles.qrPollingRow}>
                  <Spinner size="sm" />
                  <Text as="span" className={pageStyles.qrPollingLabel}>
                    Waiting for upload...
                  </Text>
                </Box>
              )}
              {uploadStatus === 'UPLOADING' && (
                <Text className={pageStyles.qrStatusHint}>
                  Invoice photo(s) are being uploaded...
                </Text>
              )}
              {uploadStatus === 'PROCESSING' && (
                <Text className={pageStyles.qrStatusHint}>Processing invoice...</Text>
              )}
            </Box>
          </Box>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline" onClick={handleCloseQrModal}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      <PrintBarcodeLabelsModal
        isOpen={printLabelCodes != null && printLabelCodes.length > 0}
        onClose={() => setPrintLabelCodes(null)}
        codes={printLabelCodes ?? undefined}
        onError={(message) => notifyError(message)}
      />
    </Stack>
  );
}

interface GridBulkFillRowProps {
  bulk: GridBulkFillDraft;
  billingMode: BillingMode;
  compactPriceUi: boolean;
  showCommercialTerms: boolean;
  companyField: VerticalSchemaFieldDef | null;
  sellDirectField: VerticalSchemaFieldDef | null;
  schemaFields: VerticalSchemaFieldDef[];
  isLoading: boolean;
  onBulkChange: (
    field: keyof GridBulkFillDraft,
    value: GridBulkFillDraft[keyof GridBulkFillDraft],
  ) => void;
  onVerticalBulkChange: (key: string, value: string) => void;
  onApply: () => void;
}

function GridBulkFillRow({
  bulk,
  billingMode,
  compactPriceUi,
  showCommercialTerms,
  companyField,
  sellDirectField,
  schemaFields,
  isLoading,
  onBulkChange,
  onVerticalBulkChange,
  onApply,
}: GridBulkFillRowProps) {
  return (
    <TableRow className={denseDataGrid.bulkRow}>
      <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
        <Text as="span" className={denseDataGrid.bulkLabel}>
          Fill all
        </Text>
        <Button
          type="button"
          className={denseDataGrid.bulkApplyBtn}
          onClick={onApply}
          disabled={isLoading}
          title="Apply filled values to every product row"
        >
          Apply to all
        </Button>
      </TableHeaderCell>
      <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
        <Text as="span" className={denseDataGrid.bulkDisabled} title="Barcode must be set per row">
          —
        </Text>
      </TableHeaderCell>
      {companyField && (
        <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
          <Input
            type="text"
            className={denseDataGrid.input}
            placeholder="Company"
            value={bulk.verticalBulk?.[companyField.key] ?? bulk.companyName ?? ''}
            onChange={(e) => onVerticalBulkChange(companyField.key, e.target.value)}
            disabled={isLoading}
          />
        </TableHeaderCell>
      )}
      <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
        <Input
          type="text"
          className={denseDataGrid.input}
          placeholder="Product"
          value={bulk.name ?? ''}
          onChange={(e) => onBulkChange('name', e.target.value)}
          disabled={isLoading}
        />
      </TableHeaderCell>
      {schemaFields.map((field) => (
        <TableHeaderCell key={field.key} className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
          <Input
            type={field.type === 'date' ? 'date' : 'text'}
            className={field.type === 'date' ? denseDataGrid.inputDate : denseDataGrid.input}
            placeholder={field.label ?? field.key}
            value={bulk.verticalBulk?.[field.key] ?? ''}
            onChange={(e) => onVerticalBulkChange(field.key, e.target.value)}
            disabled={isLoading}
          />
        </TableHeaderCell>
      ))}
      <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
        <Input
          type="text"
          inputMode="numeric"
          className={denseDataGrid.inputNarrow}
          placeholder="Qty"
          value={bulk.count ?? ''}
          onChange={(e) => onBulkChange('count', e.target.value)}
          disabled={isLoading}
        />
      </TableHeaderCell>
      <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
        <Input
          type="text"
          inputMode="decimal"
          className={denseDataGrid.inputNarrow}
          placeholder="1 x _"
          value={bulk.conversionFactor ?? ''}
          onChange={(e) => onBulkChange('conversionFactor', e.target.value)}
          disabled={isLoading}
        />
      </TableHeaderCell>
      <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
        <Input
          type="text"
          className={denseDataGrid.input}
          placeholder="Location"
          value={bulk.location ?? ''}
          onChange={(e) => onBulkChange('location', e.target.value)}
          disabled={isLoading}
        />
      </TableHeaderCell>
      {sellDirectField && (
        <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
          <Select
            className={denseDataGrid.input}
            value={bulk.verticalBulk?.[sellDirectField.key] ?? ''}
            onChange={(e) => onVerticalBulkChange(sellDirectField.key, e.target.value)}
            disabled={isLoading}
          >
            <option value="">—</option>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </Select>
        </TableHeaderCell>
      )}
      {billingMode !== 'BASIC' && (
        <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
          <Text as="span" className={denseDataGrid.bulkDisabled} title="HSN must be set per row">
            —
          </Text>
        </TableHeaderCell>
      )}
      {compactPriceUi ? (
        <>
          <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
            <Input
              type="text"
              inputMode="decimal"
              className={denseDataGrid.inputNarrow}
              placeholder="Rate"
              value={bulk.costPrice ?? ''}
              onChange={(e) => onBulkChange('costPrice', e.target.value)}
              disabled={isLoading}
            />
          </TableHeaderCell>
          <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
            <Input
              type="text"
              inputMode="decimal"
              className={denseDataGrid.inputNarrow}
              placeholder="Sell"
              value={bulk.sellingPrice ?? ''}
              onChange={(e) => onBulkChange('sellingPrice', e.target.value)}
              disabled={isLoading}
            />
          </TableHeaderCell>
        </>
      ) : (
        <>
          <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
            <Text as="span" className={denseDataGrid.bulkDisabled} title="PTS must be set per row">
              —
            </Text>
          </TableHeaderCell>
          <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
            <Text as="span" className={denseDataGrid.bulkDisabled} title="PTR must be set per row">
              —
            </Text>
          </TableHeaderCell>
          <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
            <Text as="span" className={denseDataGrid.bulkDisabled} title="MRP must be set per row">
              —
            </Text>
          </TableHeaderCell>
        </>
      )}
      {showCommercialTerms ? (
        <>
          <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
            <Select
              className={denseDataGrid.select}
              value={bulk.schemeType ?? ''}
              onChange={(e) => onBulkChange('schemeType', e.target.value as SchemeType | '')}
              disabled={isLoading}
            >
              <option value="">—</option>
              <option value="FIXED_UNITS">Free units</option>
              <option value="PERCENTAGE">Percentage</option>
            </Select>
          </TableHeaderCell>
          <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
            <Input
              type="text"
              className={denseDataGrid.inputNarrow}
              placeholder="e.g. 10+2"
              value={bulk.saleScheme ?? ''}
              onChange={(e) => onBulkChange('saleScheme', e.target.value)}
              disabled={isLoading}
            />
          </TableHeaderCell>
          <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
            <Input
              type="number"
              className={denseDataGrid.inputNarrow}
              placeholder="—"
              step="0.01"
              min={-100}
              max={100}
              value={bulk.saleAdditionalDiscount ?? ''}
              onChange={(e) => onBulkChange('saleAdditionalDiscount', e.target.value)}
              disabled={isLoading}
            />
          </TableHeaderCell>
          <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
            <Select
              className={denseDataGrid.select}
              value={bulk.purchaseSchemeType ?? ''}
              onChange={(e) =>
                onBulkChange('purchaseSchemeType', e.target.value as SchemeType | '')
              }
              disabled={isLoading}
            >
              <option value="">—</option>
              <option value="FIXED_UNITS">Free units</option>
              <option value="PERCENTAGE">Percentage</option>
            </Select>
          </TableHeaderCell>
          <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
            <Input
              type="text"
              className={denseDataGrid.inputNarrow}
              placeholder="e.g. 10+2"
              value={bulk.purchaseScheme ?? ''}
              onChange={(e) => onBulkChange('purchaseScheme', e.target.value)}
              disabled={isLoading}
            />
          </TableHeaderCell>
          <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
            <Input
              type="number"
              className={denseDataGrid.inputNarrow}
              placeholder="—"
              step="0.01"
              min={0}
              max={100}
              value={bulk.purchaseAdditionalDiscount ?? ''}
              onChange={(e) => onBulkChange('purchaseAdditionalDiscount', e.target.value)}
              disabled={isLoading}
            />
          </TableHeaderCell>
          <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
            <Select
              className={denseDataGrid.select}
              value={bulk.discountApplicable ?? ''}
              onChange={(e) =>
                onBulkChange('discountApplicable', e.target.value as DiscountApplicable | '')
              }
              disabled={isLoading}
            >
              <option value="">—</option>
              <option value="DISCOUNT">Discount</option>
              <option value="SCHEME">Scheme</option>
              <option value="DISCOUNT_AND_SCHEME">Both</option>
            </Select>
          </TableHeaderCell>
        </>
      ) : null}
      {billingMode === 'REGULAR' && (
        <>
          <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
            <Input
              type="text"
              inputMode="decimal"
              className={denseDataGrid.inputNarrow}
              placeholder="CGST"
              value={bulk.cgst ?? ''}
              onChange={(e) => onBulkChange('cgst', e.target.value)}
              disabled={isLoading}
            />
          </TableHeaderCell>
          <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`}>
            <Input
              type="text"
              inputMode="decimal"
              className={denseDataGrid.inputNarrow}
              placeholder="SGST"
              value={bulk.sgst ?? ''}
              onChange={(e) => onBulkChange('sgst', e.target.value)}
              disabled={isLoading}
            />
          </TableHeaderCell>
        </>
      )}
      <TableHeaderCell className={`${denseDataGrid.th} ${denseDataGrid.bulkTh}`} />
    </TableRow>
  );
}

/** Empty grid cell that still reserves label+control height (pair with a real field). */
function FormRowSpacer() {
  return (
    <Box className={pageStyles.formGroup} aria-hidden="true">
      <Text as="span" className={productChrome.visuallyReserve}>
        .
      </Text>
      <Text as="span" className={productChrome.visuallyReserveBlock}>
        .
      </Text>
    </Box>
  );
}

/** Empty grid cell with no reserved height — keeps a lone field in its column. */
function FormRowEmpty() {
  return <Box aria-hidden="true" />;
}

// Product Accordion Component
function ProductSuggestionOption({
  suggestion,
  onSelect,
}: {
  suggestion: ProductSuggestion;
  onSelect: () => void;
}) {
  const company = suggestion.companyName?.trim() || '';
  const hsn = suggestion.hsn?.trim() || '';
  const metaParts = [company, hsn ? `HSN ${hsn}` : ''].filter(Boolean);
  const unitLabel = suggestion.baseUnit
    ? `${suggestion.baseUnit}${
        suggestion.unitConversions?.factor ? ` ×${suggestion.unitConversions.factor}` : ''
      }`
    : '';
  return (
    <Box
      as="button"
      className={productChrome.typeaheadItem}
      onMouseDown={(e) => {
        e.preventDefault();
        onSelect();
      }}
    >
      <Text as="span" className={productChrome.typeaheadItemName}>
        {suggestion.name}
      </Text>
      {metaParts.length > 0 ? (
        <Box className={productChrome.typeaheadItemMeta}>
          <Text as="span" className={productChrome.typeaheadItemMetaText}>
            {metaParts.join(' · ')}
          </Text>
        </Box>
      ) : null}
      {unitLabel ? (
        <Text as="span" className={productChrome.typeaheadUnitChip}>
          {unitLabel}
        </Text>
      ) : null}
    </Box>
  );
}

interface ProductAccordionProps {
  product: ProductFormData;
  companyField: VerticalSchemaFieldDef | null;
  sellDirectField: VerticalSchemaFieldDef | null;
  schemaFields: VerticalSchemaFieldDef[];
  packagingUnits: PackagingUnit[];
  billingMode: BillingMode;
  /** Cafe: hide commercial terms and use compact price fields. */
  simplePricing: boolean;
  retailPricing: boolean;
  /** Sale/purchase schemes, item type, discount-applicable (retail + distributor). */
  showCommercialTerms: boolean;
  /** Named rate tiers (distributor only). */
  showRateTiers: boolean;
  index: number;
  onToggle: () => void;
  onRemove: () => void;
  onChange: (
    productId: string,
    field: keyof ProductFormData,
    value: ProductFormData[keyof ProductFormData],
  ) => void;
  onVerticalFieldChange: (productId: string, field: VerticalSchemaFieldDef, value: string) => void;
  onApplyPurchasePatch: (productId: string, patch: Partial<ProductFormData>) => void;
  onIntegerChange: (productId: string, field: string, value: string) => void;
  onDecimalChange: (productId: string, field: string, value: string) => void;
  onCustomRemindersChange: (reminders: CustomReminderInput[]) => void;
  productSuggestions: ProductSuggestion[];
  suggestionRowId: string | null;
  onNameChange: (rowId: string, value: string) => void;
  onApplyProductPrefill: (rowId: string, suggestion: ProductSuggestion) => void | Promise<void>;
  onNameBlur: (rowId: string) => void;
  isLoading: boolean;
  generatingBarcode: boolean;
  onGenerateBarcode: () => void;
  onPrintBarcode: () => void;
  isoToLocalDateTime: (iso: string) => string;
  localDateTimeToIso: (local: string) => string;
}

function ProductAccordion({
  product,
  companyField,
  sellDirectField,
  schemaFields,
  packagingUnits,
  billingMode,
  simplePricing,
  retailPricing,
  showCommercialTerms,
  showRateTiers,
  index,
  onToggle,
  onRemove,
  onChange,
  onVerticalFieldChange,
  onApplyPurchasePatch,
  onIntegerChange,
  onDecimalChange,
  onCustomRemindersChange,
  productSuggestions,
  suggestionRowId,
  onNameChange,
  onApplyProductPrefill,
  onNameBlur,
  isLoading,
  generatingBarcode,
  onGenerateBarcode,
  onPrintBarcode,
  isoToLocalDateTime,
  localDateTimeToIso,
}: ProductAccordionProps) {
  const productTitle = product.name || `Product ${index + 1}`;
  const showExpiryReminder = schemaFields.some((field) => field.key === 'expiryDate');

  const formatSchemeFixed = (p: ProductFormData): string => {
    if (p.schemePayFor != null || p.schemeFree != null) {
      return `${p.schemePayFor ?? 0} + ${p.schemeFree ?? 0}`;
    }
    if (p.scheme != null && p.scheme !== undefined) return `1 + ${p.scheme}`;
    return '';
  };
  const formatPurchaseSchemeFixed = (p: ProductFormData): string =>
    formatPurchaseSchemeDealForDisplay(p);

  const [schemeFixedDraft, setSchemeFixedDraft] = useState('');
  const [schemeFixedFocused, setSchemeFixedFocused] = useState(false);
  const [purchaseSchemeFixedDraft, setPurchaseSchemeFixedDraft] = useState('');
  const [purchaseSchemeFixedFocused, setPurchaseSchemeFixedFocused] = useState(false);

  useEffect(() => {
    if (!schemeFixedFocused) setSchemeFixedDraft(formatSchemeFixed(product));
  }, [product.id, product.schemePayFor, product.schemeFree, product.scheme, schemeFixedFocused]);

  useEffect(() => {
    if (!purchaseSchemeFixedFocused)
      setPurchaseSchemeFixedDraft(formatPurchaseSchemeFixed(product));
  }, [
    product.id,
    product.purchaseSchemePayFor,
    product.purchaseSchemeFree,
    product.purchaseSchemeFreeQty,
    product.purchaseSchemeType,
    purchaseSchemeFixedFocused,
  ]);

  const commitSchemeFixed = () => {
    const raw = schemeFixedDraft.trim();
    if (raw === '') {
      onChange(product.id, 'schemePayFor', null);
      onChange(product.id, 'schemeFree', null);
      onChange(product.id, 'scheme', null);
      return;
    }
    const plusIdx = raw.indexOf('+');
    if (plusIdx === -1) {
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num >= 0) {
        onChange(product.id, 'schemePayFor', num);
        onChange(product.id, 'schemeFree', 0);
        onChange(product.id, 'scheme', null);
      }
      return;
    }
    const leftStr = raw.slice(0, plusIdx).trim();
    const rightStr = raw.slice(plusIdx + 1).trim();
    const left = leftStr === '' ? 0 : parseInt(leftStr, 10);
    const right = rightStr === '' ? 0 : parseInt(rightStr, 10);
    if (!isNaN(left) && !isNaN(right) && left >= 0 && right >= 0) {
      onChange(product.id, 'schemePayFor', left);
      onChange(product.id, 'schemeFree', right);
      onChange(product.id, 'scheme', null);
    }
  };
  const commitPurchaseSchemeFixed = () => {
    const raw = purchaseSchemeFixedDraft.trim();
    if (raw === '') {
      onApplyPurchasePatch(product.id, clearPurchaseSchemePatch(product));
      return;
    }
    if ((product.purchaseSchemeType ?? 'FIXED_UNITS') === 'FREE_QUANTITY') {
      const patch = applyPurchaseFreeQuantityFromRaw(product, raw);
      if (patch) onApplyPurchasePatch(product.id, patch);
      return;
    }
    const plusIdx = raw.indexOf('+');
    if (plusIdx === -1) {
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num >= 0) {
        onApplyPurchasePatch(product.id, {
          purchaseSchemePayFor: num,
          purchaseSchemeFree: 0,
          purchaseSchemeFreeQty: null,
          purchaseSchemeType: 'FIXED_UNITS',
          purchaseSchemePercentage: null,
        });
      }
      return;
    }
    const leftStr = raw.slice(0, plusIdx).trim();
    const rightStr = raw.slice(plusIdx + 1).trim();
    const left = leftStr === '' ? 0 : parseInt(leftStr, 10);
    const right = rightStr === '' ? 0 : parseInt(rightStr, 10);
    if (!isNaN(left) && !isNaN(right) && left >= 0 && right >= 0) {
      onApplyPurchasePatch(product.id, {
        purchaseSchemePayFor: left,
        purchaseSchemeFree: right,
        purchaseSchemeFreeQty: null,
        purchaseSchemeType: 'FIXED_UNITS',
        purchaseSchemePercentage: null,
      });
    }
  };

  const purchaseSchemeType = product.purchaseSchemeType ?? 'FIXED_UNITS';

  const baseUqc = product.baseUnit?.trim()
    ? resolvePackagingUqc(product.baseUnit, packagingUnits)
    : '';
  const packagingUnitDef = packagingUnits.find((u) => u.uqc === baseUqc);
  const packagingFactor = packagingFactorForDisplay(
    product.unitsPerPack ?? product.conversionFactor,
  );
  const packagingHint = packagingUnitDef
    ? `${packagingUnitDef.registrationHint}${
        packagingUnitDef.sellUnitRule === 'PACK_ONLY'
          ? ` · Sold in full ${packagingUnitDef.defaultPackUqc ?? 'pack'} only.`
          : ''
      } · e.g. 1 × 50 tablets, 1 × 100 ml`
    : 'e.g. 1 × 50 tablets — GST UQC unit after the number';
  const applyPackaging = (uqc: string, f: number) => {
    const nextDef = packagingUnits.find((u) => u.uqc === uqc);
    const upp = packagingFactorToUnitsPerPack(f, nextDef);
    onChange(product.id, 'baseUnit', uqc);
    onChange(product.id, 'unitsPerPack', upp);
    onChange(product.id, 'conversionFactor', upp);
  };
  const packagingInput = (
    <PackagingUnitInput
      id={`packaging-${product.id}`}
      label="Packaging"
      baseUnit={baseUqc}
      factor={packagingFactor}
      packagingUnits={packagingUnits}
      onChange={applyPackaging}
      disabled={isLoading}
      required
      hint={packagingHint}
    />
  );

  const purchaseSchemePaidFreeHint = (() => {
    const billable = billableCountForPurchaseFreeQty(product);
    if (product.purchaseSchemeFreeQty != null) {
      return billable > 0
        ? `${billable} paid + ${product.purchaseSchemeFreeQty} free`
        : `0 paid + ${product.purchaseSchemeFreeQty} free`;
    }
    if (product.purchaseSchemePayFor != null || product.purchaseSchemeFree != null) {
      return formatPurchaseSchemeRatioDisplay(
        product.purchaseSchemePayFor,
        product.purchaseSchemeFree,
      );
    }
    return null;
  })();

  return (
    <Box className={accordionStyles.productAccordion}>
      <Box className={accordionStyles.accordionHeader} onClick={onToggle}>
        <Box className={accordionStyles.accordionTitle}>
          <Text as="span" className={accordionStyles.accordionIcon}>
            {product.isExpanded ? '▼' : '▶'}
          </Text>
          <Text as="span">{productTitle}</Text>
          {product.barcode && (
            <Text as="span" className={accordionStyles.accordionSubtitle}>
              (Barcode: {product.barcode})
            </Text>
          )}
        </Box>
        <Button
          type="button"
          className={accordionStyles.removeProductBtn}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={isLoading}
          aria-label="Remove product"
        >
          ×
        </Button>
      </Box>

      {product.isExpanded && (
        <Box className={accordionStyles.accordionContent}>
          <Box className={accordionStyles.formRow}>
            <Box className={pageStyles.formGroup}>
              <Label htmlFor={`name-${product.id}`} required>
                Product Name
              </Label>
              <Box className={productChrome.typeaheadWrap}>
                <Input
                  type="text"
                  id={`name-${product.id}`}
                  placeholder="Enter product name"
                  value={product.name}
                  autoComplete="off"
                  onChange={(e) => onNameChange(product.id, e.target.value)}
                  onBlur={() => onNameBlur(product.id)}
                  required
                  disabled={isLoading}
                />
                {suggestionRowId === product.id && productSuggestions.length > 0 ? (
                  <Box as="ul" className={productChrome.typeaheadMenu}>
                    {productSuggestions.map((s) => (
                      <Box as="li" key={s.id}>
                        <ProductSuggestionOption
                          suggestion={s}
                          onSelect={() => void onApplyProductPrefill(product.id, s)}
                        />
                      </Box>
                    ))}
                  </Box>
                ) : null}
              </Box>
            </Box>
            <Box className={pageStyles.formGroup}>
              <Label htmlFor={`count-${product.id}`} required>
                Qty
              </Label>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                id={`count-${product.id}`}
                placeholder="0"
                value={product.count === 0 ? '' : product.count}
                onChange={(e) => onIntegerChange(product.id, 'count', e.target.value)}
                required
                disabled={isLoading}
              />
            </Box>
          </Box>

          <Box className={accordionStyles.formRow}>
            <Box className={pageStyles.formGroup}>
              <Label htmlFor={`barcode-${product.id}`}>Barcode</Label>
              <Inline gap="sm" align="center" width="full">
                <Input
                  type="text"
                  id={`barcode-${product.id}`}
                  placeholder="Enter barcode (optional)"
                  value={product.barcode}
                  onChange={(e) => onChange(product.id, 'barcode', e.target.value)}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading || generatingBarcode}
                  onClick={onGenerateBarcode}
                >
                  {generatingBarcode ? <Spinner size="sm" /> : 'Generate'}
                </Button>
                {product.barcode?.trim() ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isLoading}
                    onClick={onPrintBarcode}
                    aria-label="Print barcode sticker"
                  >
                    <Icon icon={Printer} size="sm" />
                  </Button>
                ) : null}
              </Inline>
            </Box>
            {companyField ? (
              <VerticalSchemaFieldInput
                field={companyField}
                value={getVerticalFieldValue(product, companyField)}
                onChange={(value) => onVerticalFieldChange(product.id, companyField, value)}
                disabled={isLoading}
                idPrefix={`acc-${product.id}`}
              />
            ) : (
              packagingInput
            )}
          </Box>

          {companyField ? (
            <Box className={accordionStyles.formRow}>
              {packagingInput}
              <Box className={pageStyles.formGroup}>
                <Label htmlFor={`location-${product.id}`} required>
                  Inventory Location
                </Label>
                <Input
                  type="text"
                  id={`location-${product.id}`}
                  placeholder="Enter inventory location"
                  value={product.location}
                  onChange={(e) => onChange(product.id, 'location', e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Box>
            </Box>
          ) : null}

          {schemaFields.length > 0 && (
            <VerticalInventoryFields
              fields={schemaFields}
              product={product}
              onFieldChange={(field, value) => onVerticalFieldChange(product.id, field, value)}
              disabled={isLoading}
              idPrefix={`acc-${product.id}`}
              rowClassName={accordionStyles.formRow}
            />
          )}

          {!companyField ? (
            <Box className={accordionStyles.formRow}>
              <Box className={pageStyles.formGroup}>
                <Label htmlFor={`location-${product.id}`} required>
                  Inventory Location
                </Label>
                <Input
                  type="text"
                  id={`location-${product.id}`}
                  placeholder="Enter inventory location"
                  value={product.location}
                  onChange={(e) => onChange(product.id, 'location', e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Box>
              {billingMode !== 'BASIC' ? (
                <Box className={pageStyles.formGroup}>
                  <Label htmlFor={`hsn-${product.id}`}>HSN Code</Label>
                  <Input
                    type="text"
                    id={`hsn-${product.id}`}
                    placeholder="Enter the HSN code"
                    value={product.hsn || ''}
                    onChange={(e) => onChange(product.id, 'hsn', e.target.value)}
                    disabled={isLoading}
                  />
                </Box>
              ) : (
                <FormRowEmpty />
              )}
            </Box>
          ) : null}

          {companyField && billingMode !== 'BASIC' && simplePricing && !showCommercialTerms ? (
            <Box className={accordionStyles.formRow}>
              <Box className={pageStyles.formGroup}>
                <Label htmlFor={`hsn-${product.id}`}>HSN Code</Label>
                <Input
                  type="text"
                  id={`hsn-${product.id}`}
                  placeholder="Enter the HSN code"
                  value={product.hsn || ''}
                  onChange={(e) => onChange(product.id, 'hsn', e.target.value)}
                  disabled={isLoading}
                />
              </Box>
              <FormRowEmpty />
            </Box>
          ) : null}

          {showCommercialTerms && (
            <>
              <Box className={accordionStyles.formRow}>
                {companyField && billingMode !== 'BASIC' ? (
                  <Box className={pageStyles.formGroup}>
                    <Label htmlFor={`hsn-${product.id}`}>HSN Code</Label>
                    <Input
                      type="text"
                      id={`hsn-${product.id}`}
                      placeholder="Enter the HSN code"
                      value={product.hsn || ''}
                      onChange={(e) => onChange(product.id, 'hsn', e.target.value)}
                      disabled={isLoading}
                    />
                  </Box>
                ) : (
                  <Box className={pageStyles.formGroup}>
                    <Label htmlFor={`schemeType-${product.id}`}>Sale scheme/deal type</Label>
                    <Select
                      id={`schemeType-${product.id}`}
                      value={product.schemeType ?? 'FIXED_UNITS'}
                      onChange={(e) => {
                        const val = e.target.value as SchemeType;
                        onChange(product.id, 'schemeType', val);
                        if (val === 'PERCENTAGE') {
                          onChange(product.id, 'scheme', null);
                        } else {
                          onChange(product.id, 'schemePercentage', null);
                        }
                      }}
                      disabled={isLoading}
                    >
                      <option value="FIXED_UNITS">Free units</option>
                      <option value="PERCENTAGE">Percentage</option>
                    </Select>
                  </Box>
                )}
                {companyField && billingMode !== 'BASIC' ? (
                  <Box className={pageStyles.formGroup}>
                    <Label htmlFor={`schemeType-${product.id}`}>Sale scheme/deal type</Label>
                    <Select
                      id={`schemeType-${product.id}`}
                      value={product.schemeType ?? 'FIXED_UNITS'}
                      onChange={(e) => {
                        const val = e.target.value as SchemeType;
                        onChange(product.id, 'schemeType', val);
                        if (val === 'PERCENTAGE') {
                          onChange(product.id, 'scheme', null);
                        } else {
                          onChange(product.id, 'schemePercentage', null);
                        }
                      }}
                      disabled={isLoading}
                    >
                      <option value="FIXED_UNITS">Free units</option>
                      <option value="PERCENTAGE">Percentage</option>
                    </Select>
                  </Box>
                ) : (product.schemeType ?? 'FIXED_UNITS') === 'FIXED_UNITS' ? (
                  <Box className={pageStyles.formGroup}>
                    <Label htmlFor={`scheme-fixed-${product.id}`}>Pay + free (e.g. 10 + 2)</Label>
                    <Input
                      type="text"
                      id={`scheme-fixed-${product.id}`}
                      placeholder="Optional, e.g. 10 + 2"
                      value={schemeFixedDraft}
                      onChange={(e) => setSchemeFixedDraft(e.target.value)}
                      onFocus={() => setSchemeFixedFocused(true)}
                      onBlur={() => {
                        setSchemeFixedFocused(false);
                        commitSchemeFixed();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      disabled={isLoading}
                    />
                  </Box>
                ) : (
                  <Box className={pageStyles.formGroup}>
                    <Label htmlFor={`schemePercentage-${product.id}`} required>
                      Sale Scheme/Deal %
                    </Label>
                    <Input
                      type="number"
                      id={`schemePercentage-${product.id}`}
                      placeholder="e.g. 10 or -5 for markup"
                      min={-100}
                      max={100}
                      step={0.01}
                      value={product.schemePercentage != null ? product.schemePercentage : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          onChange(product.id, 'schemePercentage', null);
                        } else {
                          const num = parseFloat(val);
                          if (!isNaN(num) && num >= -100 && num <= 100) {
                            onChange(product.id, 'schemePercentage', num);
                          }
                        }
                      }}
                      disabled={isLoading}
                    />
                  </Box>
                )}
              </Box>

              <Box className={accordionStyles.formRow}>
                {companyField && billingMode !== 'BASIC' ? (
                  (product.schemeType ?? 'FIXED_UNITS') === 'FIXED_UNITS' ? (
                    <Box className={pageStyles.formGroup}>
                      <Label htmlFor={`scheme-fixed-${product.id}`}>Pay + free (e.g. 10 + 2)</Label>
                      <Input
                        type="text"
                        id={`scheme-fixed-${product.id}`}
                        placeholder="Optional, e.g. 10 + 2"
                        value={schemeFixedDraft}
                        onChange={(e) => setSchemeFixedDraft(e.target.value)}
                        onFocus={() => setSchemeFixedFocused(true)}
                        onBlur={() => {
                          setSchemeFixedFocused(false);
                          commitSchemeFixed();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        disabled={isLoading}
                      />
                    </Box>
                  ) : (
                    <Box className={pageStyles.formGroup}>
                      <Label htmlFor={`schemePercentage-${product.id}`} required>
                        Sale Scheme/Deal %
                      </Label>
                      <Input
                        type="number"
                        id={`schemePercentage-${product.id}`}
                        placeholder="e.g. 10 or -5 for markup"
                        min={-100}
                        max={100}
                        step={0.01}
                        value={product.schemePercentage != null ? product.schemePercentage : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            onChange(product.id, 'schemePercentage', null);
                          } else {
                            const num = parseFloat(val);
                            if (!isNaN(num) && num >= -100 && num <= 100) {
                              onChange(product.id, 'schemePercentage', num);
                            }
                          }
                        }}
                        disabled={isLoading}
                      />
                    </Box>
                  )
                ) : (
                  <Box className={pageStyles.formGroup}>
                    <Label htmlFor={`saleAdditionalDiscount-${product.id}`}>
                      Sale add. discount (%)
                    </Label>
                    <Input
                      type="number"
                      id={`saleAdditionalDiscount-${product.id}`}
                      placeholder="Discount or negative markup"
                      step="0.01"
                      min={-100}
                      max={100}
                      value={
                        product.saleAdditionalDiscount === null ||
                        product.saleAdditionalDiscount === undefined
                          ? ''
                          : product.saleAdditionalDiscount
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          onChange(product.id, 'saleAdditionalDiscount', null);
                        } else {
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue) && numValue >= -100 && numValue <= 100) {
                            onChange(product.id, 'saleAdditionalDiscount', numValue);
                          }
                        }
                      }}
                      disabled={isLoading}
                    />
                  </Box>
                )}
                {companyField && billingMode !== 'BASIC' ? (
                  <Box className={pageStyles.formGroup}>
                    <Label htmlFor={`saleAdditionalDiscount-${product.id}`}>
                      Sale add. discount (%)
                    </Label>
                    <Input
                      type="number"
                      id={`saleAdditionalDiscount-${product.id}`}
                      placeholder="Discount or negative markup"
                      step="0.01"
                      min={-100}
                      max={100}
                      value={
                        product.saleAdditionalDiscount === null ||
                        product.saleAdditionalDiscount === undefined
                          ? ''
                          : product.saleAdditionalDiscount
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          onChange(product.id, 'saleAdditionalDiscount', null);
                        } else {
                          const numValue = parseFloat(value);
                          if (!isNaN(numValue) && numValue >= -100 && numValue <= 100) {
                            onChange(product.id, 'saleAdditionalDiscount', numValue);
                          }
                        }
                      }}
                      disabled={isLoading}
                    />
                  </Box>
                ) : (
                  <FormRowEmpty />
                )}
              </Box>

              {/* Purchase (from vendor) - for comparison at sale */}
              <Box className={accordionStyles.formRow}>
                <Box className={pageStyles.formGroup}>
                  <Label htmlFor={`purchaseSchemeType-${product.id}`}>
                    Purchase scheme/deal type
                  </Label>
                  <Select
                    id={`purchaseSchemeType-${product.id}`}
                    value={product.purchaseSchemeType ?? 'FIXED_UNITS'}
                    onChange={(e) => {
                      const val = e.target.value as PurchaseSchemeInputType;
                      if (val === 'PERCENTAGE') {
                        onApplyPurchasePatch(product.id, {
                          purchaseSchemeType: 'PERCENTAGE',
                          purchaseSchemePercentage: product.purchaseSchemePercentage ?? null,
                          ...clearPurchaseSchemePatch(product),
                        });
                      } else if (val === 'FREE_QUANTITY') {
                        const billable = billableCountForPurchaseFreeQty(product);
                        onApplyPurchasePatch(product.id, {
                          purchaseSchemeType: 'FREE_QUANTITY',
                          purchaseSchemePayFor: null,
                          purchaseSchemeFree: null,
                          purchaseSchemePercentage: null,
                          purchaseSchemeFreeQty: null,
                          ...(product.purchaseSchemeFreeQty != null ? { count: billable } : {}),
                        });
                      } else {
                        const billable = billableCountForPurchaseFreeQty(product);
                        onApplyPurchasePatch(product.id, {
                          purchaseSchemeType: 'FIXED_UNITS',
                          purchaseSchemePercentage: null,
                          purchaseSchemeFreeQty: null,
                          ...(product.purchaseSchemeFreeQty != null ? { count: billable } : {}),
                        });
                      }
                    }}
                    disabled={isLoading}
                  >
                    <option value="FIXED_UNITS">Deal ratio</option>
                    <option value="FREE_QUANTITY">Free quantity</option>
                    <option value="PERCENTAGE">Percentage</option>
                  </Select>
                </Box>
                {purchaseSchemeType === 'PERCENTAGE' ? (
                  <Box className={pageStyles.formGroup}>
                    <Label htmlFor={`purchaseSchemePercentage-${product.id}`}>
                      Purchase scheme %
                    </Label>
                    <Input
                      type="number"
                      id={`purchaseSchemePercentage-${product.id}`}
                      placeholder="From vendor"
                      min={0}
                      max={100}
                      step={0.01}
                      value={
                        product.purchaseSchemePercentage != null
                          ? product.purchaseSchemePercentage
                          : ''
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          onChange(product.id, 'purchaseSchemePercentage', null);
                        } else {
                          const num = parseFloat(val);
                          if (!isNaN(num) && num >= 0 && num <= 100) {
                            onChange(product.id, 'purchaseSchemePercentage', num);
                          }
                        }
                      }}
                      disabled={isLoading}
                    />
                  </Box>
                ) : (
                  <Box className={pageStyles.formGroup}>
                    <Label htmlFor={`purchase-scheme-fixed-${product.id}`}>
                      {purchaseSchemeType === 'FREE_QUANTITY'
                        ? 'Free quantity (e.g. 60 on 540 paid)'
                        : 'Purchase scheme/deal'}
                    </Label>
                    <Input
                      type="text"
                      id={`purchase-scheme-fixed-${product.id}`}
                      placeholder={
                        purchaseSchemeType === 'FREE_QUANTITY'
                          ? (Number(product.count) || 0) > 0
                            ? 'e.g. 60'
                            : 'e.g. 60 or 0 + 60'
                          : 'e.g. 10 + 2 or 4 + 1'
                      }
                      value={purchaseSchemeFixedDraft}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPurchaseSchemeFixedDraft(v);
                        if (purchaseSchemeType !== 'FREE_QUANTITY') {
                          const parsed = parsePurchaseSchemeDraft(v);
                          if (parsed?.purchaseSchemeType === 'FIXED_UNITS' && v.includes('+')) {
                            onApplyPurchasePatch(product.id, {
                              ...parsed,
                              purchaseSchemeFreeQty: null,
                            });
                          }
                        }
                      }}
                      onFocus={() => setPurchaseSchemeFixedFocused(true)}
                      onBlur={() => {
                        setPurchaseSchemeFixedFocused(false);
                        commitPurchaseSchemeFixed();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      disabled={isLoading}
                    />
                    {purchaseSchemePaidFreeHint ? (
                      <Text as="span" className={pageStyles.schemeHint}>
                        {purchaseSchemePaidFreeHint}
                      </Text>
                    ) : null}
                  </Box>
                )}
              </Box>

              <Box className={accordionStyles.formRow}>
                <Box className={pageStyles.formGroup}>
                  <Label htmlFor={`purchaseAdditionalDiscount-${product.id}`}>
                    Purchase add. discount (%)
                  </Label>
                  <Input
                    type="number"
                    id={`purchaseAdditionalDiscount-${product.id}`}
                    placeholder="From vendor"
                    step="0.01"
                    min="0"
                    max="100"
                    value={
                      product.purchaseAdditionalDiscount === null ||
                      product.purchaseAdditionalDiscount === undefined
                        ? ''
                        : product.purchaseAdditionalDiscount
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        onChange(product.id, 'purchaseAdditionalDiscount', null);
                      } else {
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                          onChange(product.id, 'purchaseAdditionalDiscount', numValue);
                        }
                      }
                    }}
                    disabled={isLoading}
                  />
                </Box>
                <Box className={pageStyles.formGroup}>
                  <Label htmlFor={`discountApplicable-${product.id}`}>Discount applicable</Label>
                  <Select
                    id={`discountApplicable-${product.id}`}
                    value={product.discountApplicable ?? ''}
                    onChange={(e) => {
                      const val = e.target.value as DiscountApplicable | '';
                      onChange(
                        product.id,
                        'discountApplicable',
                        val === '' ? undefined : (val as DiscountApplicable),
                      );
                    }}
                    disabled={isLoading}
                  >
                    <option value="">— Select —</option>
                    <option value="DISCOUNT">Discount applicable</option>
                    <option value="SCHEME">Scheme/Deal applicable</option>
                    <option value="DISCOUNT_AND_SCHEME">
                      Both discount and scheme/deal applicable
                    </option>
                  </Select>
                </Box>
              </Box>
            </>
          )}

          {simplePricing || retailPricing ? (
            <Box className={accordionStyles.formRow}>
              <Box className={pageStyles.formGroup}>
                <Label htmlFor={`costPrice-${product.id}`}>
                  {retailPricing ? 'Rate *' : 'Rate (cost) *'}
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  id={`costPrice-${product.id}`}
                  placeholder="0.00"
                  value={product.costPrice === 0 ? '' : product.costPrice}
                  onChange={(e) => onDecimalChange(product.id, 'costPrice', e.target.value)}
                  required
                  disabled={isLoading}
                />
              </Box>
              <Box className={pageStyles.formGroup}>
                <Label htmlFor={`sellingPrice-${product.id}`}>
                  {retailPricing ? 'Selling Price *' : 'Sell price (optional)'}
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  id={`sellingPrice-${product.id}`}
                  placeholder={retailPricing ? '0.00' : 'Menu sets customer price'}
                  value={
                    product.sellingPrice === 0 || product.sellingPrice == null
                      ? ''
                      : product.sellingPrice
                  }
                  onChange={(e) => onDecimalChange(product.id, 'sellingPrice', e.target.value)}
                  required={retailPricing}
                  disabled={isLoading}
                />
              </Box>
            </Box>
          ) : (
            <>
              <Box className={accordionStyles.formRow}>
                <Box className={pageStyles.formGroup}>
                  <Label htmlFor={`priceToRetail-${product.id}`}>Price to Retailer (PTR) *</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    id={`priceToRetail-${product.id}`}
                    placeholder="0.00"
                    value={product.priceToRetail === 0 ? '' : product.priceToRetail}
                    onChange={(e) => onDecimalChange(product.id, 'priceToRetail', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </Box>
                <Box className={pageStyles.formGroup}>
                  <Label htmlFor={`costPrice-${product.id}`}>Price from stockist (PTS) *</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    id={`costPrice-${product.id}`}
                    placeholder="0.00"
                    value={product.costPrice === 0 ? '' : product.costPrice}
                    onChange={(e) => onDecimalChange(product.id, 'costPrice', e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </Box>
              </Box>

              <Box className={accordionStyles.formRow}>
                <Box className={pageStyles.formGroup}>
                  <Label htmlFor={`maximumRetailPrice-${product.id}`}>MRP *</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    id={`maximumRetailPrice-${product.id}`}
                    placeholder="0.00"
                    value={product.maximumRetailPrice === 0 ? '' : product.maximumRetailPrice}
                    onChange={(e) =>
                      onDecimalChange(product.id, 'maximumRetailPrice', e.target.value)
                    }
                    required
                    disabled={isLoading}
                  />
                </Box>
                <FormRowSpacer />
              </Box>
            </>
          )}

          {billingMode === 'REGULAR' && (
            <Box className={accordionStyles.formRow}>
              <Box className={pageStyles.formGroup}>
                <Label htmlFor={`cgst-${product.id}`}>CGST (%)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  id={`cgst-${product.id}`}
                  placeholder="Leave empty for shop default"
                  value={product.cgst || ''}
                  onChange={(e) => onChange(product.id, 'cgst', e.target.value)}
                  disabled={isLoading}
                />
              </Box>
              <Box className={pageStyles.formGroup}>
                <Label htmlFor={`sgst-${product.id}`}>SGST (%)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  id={`sgst-${product.id}`}
                  placeholder="Leave empty for shop default"
                  value={product.sgst || ''}
                  onChange={(e) => onChange(product.id, 'sgst', e.target.value)}
                  disabled={isLoading}
                />
              </Box>
            </Box>
          )}

          {/* Rates (optional) - custom pricing tiers */}
          {showRateTiers && (
            <>
              <Box className={accordionStyles.ratesSection}>
                <Box className={accordionStyles.ratesHeader}>
                  <Text as="span" className={accordionStyles.ratesTitle}>
                    Rates (optional)
                  </Text>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onChange(product.id, 'rates', [
                        ...(product.rates ?? []),
                        { name: '', price: 0 },
                      ])
                    }
                    className={accordionStyles.addRateBtn}
                    disabled={isLoading}
                  >
                    + Add rate
                  </Button>
                </Box>
                <Text as="span" className={accordionStyles.unitHint}>
                  Custom rate tiers (e.g. Rate-A, Rate-B). Default rate selects which price to use
                  for sales.
                </Text>
                {(product.rates ?? []).map((rate, i) => (
                  <Box key={i} className={accordionStyles.rateRow}>
                    <Input
                      type="text"
                      value={rate.name}
                      onChange={(e) => {
                        const next = [...(product.rates ?? [])];
                        next[i] = { ...next[i], name: e.target.value };
                        onChange(product.id, 'rates', next);
                      }}
                      className={accordionStyles.rateNameInput}
                      placeholder="Rate name"
                      disabled={isLoading}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={rate.price || ''}
                      onChange={(e) => {
                        const next = [...(product.rates ?? [])];
                        next[i] = {
                          ...next[i],
                          price: parseFloat(e.target.value) || 0,
                        };
                        onChange(product.id, 'rates', next);
                      }}
                      className={accordionStyles.ratePriceInput}
                      placeholder="Price"
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        const next = (product.rates ?? []).filter((_, j) => j !== i);
                        onChange(product.id, 'rates', next);
                      }}
                      className={accordionStyles.removeRateBtn}
                      aria-label="Remove rate"
                      disabled={isLoading}
                    >
                      ×
                    </Button>
                  </Box>
                ))}
              </Box>
              <Box className={pageStyles.formGroup}>
                <Label htmlFor={`defaultRate-${product.id}`}>Default rate (optional)</Label>
                <Select
                  id={`defaultRate-${product.id}`}
                  value={product.defaultRate ?? ''}
                  onChange={(e) => onChange(product.id, 'defaultRate', e.target.value)}
                  disabled={isLoading}
                >
                  <option value="">— None —</option>
                  <option value="priceToRetail">priceToRetail (PTR)</option>
                  <option value="maximumRetailPrice">maximumRetailPrice (MRP)</option>
                  <option value="costPrice">costPrice (PTS)</option>
                  {(product.rates ?? [])
                    .filter((r) => r.name.trim())
                    .map((r) => (
                      <option key={r.name} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                </Select>
              </Box>
            </>
          )}

          <Box className={pageStyles.formGroup}>
            <Label htmlFor={`description-${product.id}`}>Description</Label>
            <Textarea
              id={`description-${product.id}`}
              placeholder="Enter product description (optional)"
              value={product.description || ''}
              onChange={(e) => onChange(product.id, 'description', e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </Box>

          {/* Reminders — custom for all verticals; expiry-linked when schema has expiryDate */}
          <Box className={accordionStyles.reminderSection}>
            <Text variant="heading4">Reminders</Text>
            {showExpiryReminder && (
              <>
                <Box className={accordionStyles.formRow}>
                  <Box className={pageStyles.formGroup}>
                    <Label htmlFor={`reminderAt-${product.id}`}>
                      Expiry Reminder Date & Time (Optional)
                    </Label>
                    <Input
                      type="datetime-local"
                      id={`reminderAt-${product.id}`}
                      value={product.reminderAt ? isoToLocalDateTime(product.reminderAt) : ''}
                      onChange={(e) => {
                        const dateValue = e.target.value;
                        if (dateValue) {
                          const isoDate = localDateTimeToIso(dateValue);
                          onChange(product.id, 'reminderAt', isoDate);
                        } else {
                          onChange(product.id, 'reminderAt', undefined);
                        }
                      }}
                      disabled={isLoading}
                    />
                    <Text className={pageStyles.helperText}>
                      Set a reminder date to be notified before this inventory item expires
                    </Text>
                  </Box>
                </Box>
              </>
            )}

            <CustomRemindersSection
              reminders={product.customReminders || []}
              onChange={onCustomRemindersChange}
              disabled={isLoading}
            />
          </Box>

          {sellDirectField && (
            <VerticalSchemaFieldInput
              field={sellDirectField}
              value={getVerticalFieldValue(product, sellDirectField) || 'no'}
              onChange={(value) => onVerticalFieldChange(product.id, sellDirectField, value)}
              disabled={isLoading}
              idPrefix={`acc-${product.id}`}
            />
          )}
        </Box>
      )}
    </Box>
  );
}
