import { useState, FormEvent, useRef, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import {
  inventoryApi,
  vendorsApi,
  uploadApi,
  usersApi,
} from '@inventory-platform/api';
import type {
  CreateInventoryDto,
  CustomReminderInput,
  LinkableUser,
  Vendor,
  VendorResponse,
  CreateVendorDto,
  VendorBusinessType,
  BulkCreateInventoryDto,
  ParseInvoiceItem,
  ParsedVendorInvoiceDto,
  VendorPurchaseInvoicePayload,
  PricingRate,
  UploadStatus,
  ItemType,
  DiscountApplicable,
  SchemeType,
  BillingMode,
  ShopMembership,
} from '@inventory-platform/types';
import {
  CustomRemindersSection,
  KEYBOARD_NAV_GRID,
  runFormKeyboardNavigation,
  shouldSkipNestedFormKeyboardNav,
} from '@inventory-platform/ui';
import { useNotify } from '@inventory-platform/store';
import styles from './dashboard.product-registration.module.css';

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
 * Line subtotal = sum of qty × unit cost (costPrice, else priceToRetail).
 * Tax total = sum over lines of (line base × (SGST% + CGST%) / 100), when rates are present.
 * Assumes unit cost is pre-tax (typical B2B purchase); if OCR only gives inclusive amounts, totals are approximate.
 */
function computeVendorInvoiceTotalsFromParseItems(
  items: ParseInvoiceItem[]
): { lineSubTotal: number; taxTotal: number } {
  let lineSubTotal = 0;
  let taxTotal = 0;
  for (const item of items) {
    const qtyRaw = item.count;
    const q =
      qtyRaw != null && Number.isFinite(Number(qtyRaw))
        ? Math.max(0, Number(qtyRaw))
        : 0;
    const cost =
      item.costPrice != null ? Number(item.costPrice) : Number.NaN;
    const ptr = Number(item.priceToRetail);
    const unit =
      Number.isFinite(cost) && cost > 0
        ? cost
        : Number.isFinite(ptr) && ptr > 0
          ? ptr
          : 0;
    const lineBase = roundMoney(q * unit);
    lineSubTotal += lineBase;
    const sgst = parseGstPercent(item.sgst ?? undefined);
    const cgst = parseGstPercent(item.cgst ?? undefined);
    const pct = sgst + cgst;
    if (pct > 0 && lineBase > 0) {
      taxTotal += roundMoney(lineBase * (pct / 100));
    }
  }
  return {
    lineSubTotal: roundMoney(lineSubTotal),
    taxTotal: roundMoney(taxTotal),
  };
}

export function meta() {
  return [
    { title: 'Product Registration - StockKart' },
    {
      name: 'description',
      content: 'Register and manage your product inventory',
    },
  ];
}

interface ProductFormData
  extends Omit<
    CreateInventoryDto,
    'vendorId' | 'lotId' | 'priceToRetail' | 'costPrice' | 'maximumRetailPrice'
  > {
  id: string; // Unique ID for each product form
  isExpanded: boolean;
  priceToRetail: number | string;
  costPrice: number | string;
  maximumRetailPrice: number | string;
  sgst?: string;
  cgst?: string;
  saleAdditionalDiscount?: number | null;
  purchaseSchemeType?: SchemeType;
  purchaseSchemePayFor?: number | null;
  purchaseSchemeFree?: number | null;
  purchaseSchemePercentage?: number | null;
  purchaseAdditionalDiscount?: number | null;
  conversionUnit?: string;
  conversionFactor?: number;
  enableAdditionalSaleUnit?: boolean;
  rates?: PricingRate[];
  defaultRate?: string;
}

export default function ProductRegistrationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const vendorPrefillConsumedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { success: notifySuccess, error: notifyError } = useNotify;

  // QR Code Upload state
  const [showQrModal, setShowQrModal] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<
    typeof setInterval
  > | null>(null);
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
  const [userSearchMessage, setUserSearchMessage] = useState<string | null>(
    null
  );

  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('');
  const [vendorInvoiceDate, setVendorInvoiceDate] = useState('');
  const [vendorLineSubTotal, setVendorLineSubTotal] = useState('');
  const [vendorTaxTotal, setVendorTaxTotal] = useState('');
  const [vendorShippingCharge, setVendorShippingCharge] = useState('');
  const [vendorOtherCharges, setVendorOtherCharges] = useState('');
  const [vendorRoundOff, setVendorRoundOff] = useState('');
  const [vendorInvoiceTotal, setVendorInvoiceTotal] = useState('');

  /**
   * Apply OCR header + optional line-derived totals. When `parsedItems` has
   * rows, line subtotal, tax total, and invoice total are computed from items
   * (and header shipping / other / round-off); header line/tax/invoice amounts
   * are ignored in that case.
   */
  const applyParsedVendorInvoice = (
    v: ParsedVendorInvoiceDto | null | undefined,
    parsedItems?: ParseInvoiceItem[] | null
  ) => {
    const hasItems = parsedItems != null && parsedItems.length > 0;

    if (v) {
      if (v.invoiceNo) setVendorInvoiceNo(String(v.invoiceNo).trim());
      if (v.invoiceDate) {
        const raw = String(v.invoiceDate).trim();
        setVendorInvoiceDate(raw.length >= 10 ? raw.slice(0, 10) : raw);
      }
      if (v.shippingCharge != null)
        setVendorShippingCharge(String(v.shippingCharge));
      if (v.otherCharges != null) setVendorOtherCharges(String(v.otherCharges));
      if (v.roundOff != null) setVendorRoundOff(String(v.roundOff));
      if (!hasItems) {
        if (v.lineSubTotal != null) setVendorLineSubTotal(String(v.lineSubTotal));
        if (v.taxTotal != null) setVendorTaxTotal(String(v.taxTotal));
        if (v.invoiceTotal != null) setVendorInvoiceTotal(String(v.invoiceTotal));
      }
    }

    if (hasItems) {
      const { lineSubTotal, taxTotal } =
        computeVendorInvoiceTotalsFromParseItems(parsedItems);
      const shipping = numOr0(v?.shippingCharge);
      const other = numOr0(v?.otherCharges);
      const roundOff = numOr0(v?.roundOff);
      const invoiceTotal = roundMoney(
        lineSubTotal + taxTotal + shipping + other + roundOff
      );
      setVendorLineSubTotal(formatComputedAmount(lineSubTotal));
      setVendorTaxTotal(formatComputedAmount(taxTotal));
      setVendorInvoiceTotal(formatComputedAmount(invoiceTotal));
    }
  };

  // Take on credit (buyer owes vendor) - when true, ledger entry is created
  const [onCredit, setOnCredit] = useState<boolean>(false);
  // When vendor is StockKart user: assign credit to their shop so they can see it
  const [vendorShops, setVendorShops] = useState<ShopMembership[]>([]);
  const [selectedVendorShopId, setSelectedVendorShopId] = useState<string>('');
  const [isLoadingVendorShops, setIsLoadingVendorShops] = useState(false);

  // Multiple products state
  const [products, setProducts] = useState<ProductFormData[]>([]);

  // Product view mode: list (accordion) or grid (Excel-style)
  const [productViewMode, setProductViewMode] = useState<'list' | 'grid'>(
    () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('product-registration-view-mode');
        if (stored === 'list' || stored === 'grid') return stored;
      }
      return 'list';
    }
  );

  // Grid view: draft values for scheme fields (user can type "10+2" or "15%")
  const [gridSchemeDrafts, setGridSchemeDrafts] = useState<
    Record<string, { sale?: string; purchase?: string }>
  >({});

  const purchaseDateFieldMin = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  })();
  const purchaseDateFieldMax = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  })();

  // Image upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
    businessType: 'pharmacy',
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
    purchaseAdditionalDiscount: null,
    billingMode,
    itemType: 'NORMAL',
    itemTypeDegree: undefined,
    discountApplicable: undefined,
    purchaseDate: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
    baseUnit: 'BASE UNIT',
    conversionUnit: 'SALE UNIT',
    conversionFactor: 0,
    enableAdditionalSaleUnit: true,
    rates: [],
    defaultRate: '',
  });

  const handleAddProduct = () => {
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
      }))
    );
  };

  const transformParsedItemToProduct = (
    item: ParseInvoiceItem
  ): ProductFormData => {
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

    return {
      id: `product-${Date.now()}-${Math.random()}`,
      isExpanded: true,
      barcode: item.barcode || '',
      name: item.name || '',
      companyName: item.companyName || '',
      price: item.priceToRetail || 0,
      maximumRetailPrice: item.maximumRetailPrice || 0,
      costPrice: item.costPrice || 0,
      priceToRetail: item.priceToRetail || 0,
      businessType: item.businessType?.toLowerCase() || 'pharmacy',
      location: item.location || '',
      count: item.count || 0,
      expiryDate: item.expiryDate || '',
      description: item.description || '',
      reminderAt: item.reminderAt || undefined,
      customReminders,
      hsn: item.hsn || '',
      batchNo: item.batchNo || '',
      scheme:
        item.scheme != null
          ? (typeof item.scheme === 'number'
              ? item.scheme
              : parseInt(String(item.scheme), 10)) || null
          : null,
      schemePayFor:
        item.schemePayFor != null
          ? (typeof item.schemePayFor === 'number'
              ? item.schemePayFor
              : parseInt(String(item.schemePayFor), 10)) || null
          : null,
      schemeFree:
        item.schemeFree != null
          ? (typeof item.schemeFree === 'number'
              ? item.schemeFree
              : parseInt(String(item.schemeFree), 10)) || null
          : null,
      schemeType: item.schemeType ?? 'FIXED_UNITS',
      schemePercentage:
        item.schemePercentage != null
          ? (typeof item.schemePercentage === 'number'
              ? item.schemePercentage
              : parseFloat(String(item.schemePercentage))) || null
          : null,
      sgst: billingMode === 'BASIC' ? '' : item.sgst || '',
      cgst: billingMode === 'BASIC' ? '' : item.cgst || '',
      saleAdditionalDiscount: item.saleAdditionalDiscount ?? null,
      purchaseSchemeType:
        (item as { purchaseSchemeType?: SchemeType }).purchaseSchemeType ??
        'FIXED_UNITS',
      purchaseSchemePayFor:
        (item as { purchaseSchemePayFor?: number | null })
          .purchaseSchemePayFor ?? null,
      purchaseSchemeFree:
        (item as { purchaseSchemeFree?: number | null }).purchaseSchemeFree ??
        null,
      purchaseSchemePercentage:
        (item as { purchaseSchemePercentage?: number | null })
          .purchaseSchemePercentage ?? null,
      purchaseAdditionalDiscount:
        (item as { purchaseAdditionalDiscount?: number | null })
          .purchaseAdditionalDiscount ?? null,
      billingMode,
      itemType: item.itemType ?? 'NORMAL',
      itemTypeDegree: item.itemTypeDegree,
      discountApplicable: item.discountApplicable,
      purchaseDate: item.purchaseDate || undefined,
      baseUnit: item.baseUnit?.trim()
        ? item.baseUnit.trim().toUpperCase()
        : 'BASE UNIT',
      conversionUnit: item.unitConversions?.unit?.trim()
        ? item.unitConversions.unit.trim().toUpperCase()
        : 'SALE UNIT',
      conversionFactor: item.unitConversions?.factor ?? 0,
      enableAdditionalSaleUnit: true,
      rates: item.rates ?? [],
      defaultRate: item.defaultRate ?? '',
    };
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
    maxFileSizeMB = 2
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
                  })
                );
              },
              file.type,
              currentQuality
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        notifyError('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        notifyError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUploadInvoice = async () => {
    if (!selectedFile) {
      notifyError('Please select an image file');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);
    setUploadProgress('Compressing image...');

    try {
      const compressedFile = await compressImage(selectedFile);
      setUploadProgress('Uploading and parsing invoice...');
      const response = await inventoryApi.parseInvoice(compressedFile);

      if (response && response.items && response.items.length > 0) {
        const parsedProducts = response.items.map(transformParsedItemToProduct);
        setProducts(parsedProducts);
        applyParsedVendorInvoice(
          response.vendorPurchaseInvoice,
          response.items
        );
        notifySuccess(
          `✅ Successfully parsed invoice! Found ${response.totalItems} item(s).`
        );
        scrollToProducts(response.totalItems);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        notifyError(
          'No items found in the invoice image. Please try a different image.'
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to parse invoice. Please try again.';
      notifyError(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleClearUpload = () => {
    setSelectedFile(null);
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
        err instanceof Error
          ? err.message
          : 'Failed to create upload token. Please try again.';
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
            if (
              parsedResponse &&
              parsedResponse.items &&
              parsedResponse.items.length > 0
            ) {
              const parsedProducts = parsedResponse.items.map(
                transformParsedItemToProduct
              );
              setProducts(parsedProducts);
              applyParsedVendorInvoice(
                parsedResponse.vendorPurchaseInvoice,
                parsedResponse.items
              );
              notifySuccess(
                `✅ Successfully parsed invoice! Found ${parsedResponse.totalItems} item(s).`
              );
              handleCloseQrModal();
              // Scroll to products section
              scrollToProducts(parsedResponse.totalItems);
            } else {
              notifyError('No items found in the parsed invoice.');
            }
          } catch (parseErr) {
            const errorMessage =
              parseErr instanceof Error
                ? parseErr.message
                : 'Failed to retrieve parsed items.';
            notifyError(errorMessage);
          }
        } else if (
          statusResponse.status === 'FAILED' ||
          statusResponse.status === 'EXPIRED'
        ) {
          clearInterval(interval);
          setIsPolling(false);
          setPollingInterval(null);
          notifyError(
            statusResponse.errorMessage || 'Upload failed or token expired.'
          );
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
      products.map((p) =>
        p.id === productId ? { ...p, isExpanded: !p.isExpanded } : p
      )
    );
  };

  const handleProductChange = (
    productId: string,
    field: keyof ProductFormData,
    value: ProductFormData[keyof ProductFormData]
  ) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, [field]: value } : p))
    );
    setError(null);
    setSuccess(null);
  };

  const handleIntegerChange = (
    productId: string,
    field: string,
    value: string
  ) => {
    if (value === '') {
      handleProductChange(productId, field as keyof ProductFormData, 0);
      return;
    }
    if (!/^\d+$/.test(value)) return;
    handleProductChange(
      productId,
      field as keyof ProductFormData,
      parseInt(value, 10)
    );
  };

  const handleDecimalChange = (
    productId: string,
    field: string,
    value: string
  ) => {
    if (value === '') {
      handleProductChange(productId, field as keyof ProductFormData, 0);
      return;
    }
    if (!/^\d*\.?\d*$/.test(value)) return;
    // Keep raw string so decimal point is preserved while typing (e.g. "10.")
    handleProductChange(productId, field as keyof ProductFormData, value);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // Validate vendor is selected
      if (!selectedVendor || !selectedVendor.vendorId) {
        notifyError(
          'Vendor information is required. Please search and select a vendor.'
        );
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
        optionalNumFromString(vendorRoundOff) !== undefined ||
        optionalNumFromString(vendorInvoiceTotal) !== undefined;
      if (hasInvoiceExtra && !trimmedInvNo) {
        notifyError(
          'Enter the vendor invoice number, or clear all vendor invoice fields.'
        );
        setIsLoading(false);
        return;
      }

      // Validate at least one product exists
      if (products.length === 0) {
        notifyError('Please add at least one product to register.');
        setIsLoading(false);
        return;
      }

      // Validate all products
      for (const product of products) {
        if (
          !product.name ||
          !product.companyName ||
          !product.location ||
          !product.expiryDate
        ) {
          notifyError(
            `Product "${product.name || 'Unnamed'}" is missing required fields`
          );
          setIsLoading(false);
          return;
        }

        if (product.count <= 0) {
          notifyError(
            `Product "${
              product.name || 'Unnamed'
            }" count must be greater than 0`
          );
          setIsLoading(false);
          return;
        }

        const normalizedConversionFactor =
          Number(product.conversionFactor) || 0;
        if (
          !Number.isFinite(normalizedConversionFactor) ||
          normalizedConversionFactor <= 0
        ) {
          notifyError(
            `Product "${
              product.name || 'Unnamed'
            }": packaging factor is required and must be greater than 0`
          );
          setIsLoading(false);
          return;
        }

        const ptr = Number(product.priceToRetail);
        const cost = Number(product.costPrice);
        const mrp = Number(product.maximumRetailPrice);
        if (!Number.isFinite(ptr) || ptr <= 0) {
          notifyError(
            `Product "${
              product.name || 'Unnamed'
            }": PTR (price to retail) is required and must be greater than 0`
          );
          setIsLoading(false);
          return;
        }
        if (!Number.isFinite(cost) || cost <= 0) {
          notifyError(
            `Product "${
              product.name || 'Unnamed'
            }": cost (PTS) is required and must be greater than 0`
          );
          setIsLoading(false);
          return;
        }
        if (!Number.isFinite(mrp) || mrp <= 0) {
          notifyError(
            `Product "${
              product.name || 'Unnamed'
            }": MRP is required and must be greater than 0`
          );
          setIsLoading(false);
          return;
        }

        if (
          product.itemType === 'DEGREE' &&
          (product.itemTypeDegree == null ||
            product.itemTypeDegree <= 0 ||
            !Number.isInteger(product.itemTypeDegree))
        ) {
          notifyError(
            `Product "${
              product.name || 'Unnamed'
            }": when itemType is DEGREE, itemTypeDegree must be present and greater than zero`
          );
          setIsLoading(false);
          return;
        }

        if (
          billingMode === 'BASIC' &&
          ((product.sgst && product.sgst.trim()) ||
            (product.cgst && product.cgst.trim()))
        ) {
          notifyError(
            `Product "${
              product.name || 'Unnamed'
            }": SGST/CGST must not be provided when billingMode is BASIC`
          );
          setIsLoading(false);
          return;
        }

        if (product.purchaseDate) {
          const purchase = new Date(product.purchaseDate);
          const now = new Date();
          const daysPast =
            (now.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24);
          const daysFuture =
            (purchase.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          if (daysPast > 30) {
            notifyError(
              `Product "${
                product.name || 'Unnamed'
              }": Purchase date must not be older than 30 days`
            );
            setIsLoading(false);
            return;
          }
          if (daysFuture > 30) {
            notifyError(
              `Product "${
                product.name || 'Unnamed'
              }": Purchase date must not be more than 30 days in the future`
            );
            setIsLoading(false);
            return;
          }
        }

        const schemeType = product.schemeType ?? 'FIXED_UNITS';
        if (schemeType === 'PERCENTAGE') {
          if (
            product.schemePercentage == null ||
            product.schemePercentage === undefined ||
            product.schemePercentage <= 0 ||
            product.schemePercentage > 100
          ) {
            notifyError(
              `Product "${
                product.name || 'Unnamed'
              }": when schemeType is PERCENTAGE, schemePercentage is required and must be greater than 0 and not more than 100`
            );
            setIsLoading(false);
            return;
          }
        } else {
          const useNewStyle =
            product.schemePayFor != null || product.schemeFree != null;
          if (useNewStyle) {
            const payFor = product.schemePayFor ?? 0;
            const free = product.schemeFree ?? 0;
            if (payFor < 0 || free < 0) {
              notifyError(
                `Product "${
                  product.name || 'Unnamed'
                }": schemePayFor and schemeFree must be zero or greater (e.g. 10 + 2)`
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
              }": Scheme (free units) must be zero or greater`
            );
            setIsLoading(false);
            return;
          }
        }
      }

      // Transform products to bulk API format
      const items = products.map((product) => {
        const validRates = (product.rates ?? []).filter(
          (r) => r.name.trim() && !isNaN(r.price) && r.price >= 0
        );
        const hasValidDefaultRate =
          product.defaultRate &&
          product.defaultRate.trim() &&
          (['priceToRetail', 'maximumRetailPrice', 'costPrice'].includes(
            product.defaultRate.trim()
          ) ||
            (product.rates ?? []).some(
              (r) => r.name.trim() === product.defaultRate?.trim()
            ));

        // Format reminderAt if provided
        let reminderAtISO: string | undefined;
        if (product.reminderAt) {
          if (product.reminderAt.includes('T')) {
            reminderAtISO = new Date(product.reminderAt).toISOString();
          } else {
            reminderAtISO = new Date(product.reminderAt).toISOString();
          }
        }

        // Transform customReminders to the format expected by bulk API
        const customReminders =
          product.customReminders && product.customReminders.length > 0
            ? product.customReminders.map((reminder) => {
                // Calculate daysBefore from reminderAt and expiryDate
                let daysBefore = 30; // default
                if (reminder.reminderAt && product.expiryDate) {
                  const reminderDate = new Date(reminder.reminderAt);
                  const expiryDate = new Date(product.expiryDate);
                  const diffTime =
                    expiryDate.getTime() - reminderDate.getTime();
                  daysBefore = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                } else if (reminder.endDate && product.expiryDate) {
                  // Fallback: calculate from endDate if reminderAt is not available
                  const endDate = new Date(reminder.endDate);
                  const expiryDate = new Date(product.expiryDate);
                  const diffTime = expiryDate.getTime() - endDate.getTime();
                  daysBefore = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }

                return {
                  daysBefore: daysBefore > 0 ? daysBefore : 30,
                  message: reminder.notes || 'Expiry reminder',
                };
              })
            : null;

        return {
          ...(product.barcode?.trim()
            ? { barcode: product.barcode.trim() }
            : {}),
          name: product.name,
          description: product.description || undefined,
          companyName: product.companyName,
          maximumRetailPrice: Number(product.maximumRetailPrice) || 0,
          costPrice: Number(product.costPrice) || 0,
          priceToRetail: Number(product.priceToRetail) || 0,
          businessType: product.businessType.toUpperCase(),
          location: product.location,
          count: product.count,
          baseUnit: 'BASE UNIT',
          unitConversions: {
            unit: 'SALE UNIT',
            factor: Number(product.conversionFactor) || 1,
          },
          expiryDate: product.expiryDate
            ? product.expiryDate.includes('T') &&
              product.expiryDate.includes('Z')
              ? product.expiryDate
              : `${String(product.expiryDate).trim().slice(0, 10)}T00:00:00Z`
            : '',
          reminderAt: reminderAtISO,
          customReminders: customReminders,
          hsn: product.hsn || null,
          batchNo: product.batchNo || null,
          ...((product.schemeType ?? 'FIXED_UNITS') === 'PERCENTAGE'
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
                schemeType: (product.schemeType ??
                  'FIXED_UNITS') as 'FIXED_UNITS',
                scheme: product.scheme ?? null,
              }),
          billingMode: billingMode as BillingMode,
          ...(billingMode !== 'BASIC' && product.sgst && product.sgst.trim()
            ? { sgst: product.sgst.trim() }
            : {}),
          ...(billingMode !== 'BASIC' && product.cgst && product.cgst.trim()
            ? { cgst: product.cgst.trim() }
            : {}),
          ...(product.saleAdditionalDiscount !== null &&
          product.saleAdditionalDiscount !== undefined
            ? { saleAdditionalDiscount: product.saleAdditionalDiscount }
            : {}),
          ...(product.purchaseSchemeType != null ||
          product.purchaseSchemePayFor != null ||
          product.purchaseSchemeFree != null ||
          product.purchaseSchemePercentage != null
            ? (product.purchaseSchemeType ?? 'FIXED_UNITS') === 'PERCENTAGE'
              ? {
                  purchaseSchemeType: 'PERCENTAGE' as const,
                  purchaseSchemePercentage:
                    product.purchaseSchemePercentage ?? null,
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
          ...(product.purchaseAdditionalDiscount !== null &&
          product.purchaseAdditionalDiscount !== undefined
            ? {
                purchaseAdditionalDiscount: product.purchaseAdditionalDiscount,
              }
            : {}),
          ...(product.itemType != null ? { itemType: product.itemType } : {}),
          ...(product.itemType === 'DEGREE' &&
          product.itemTypeDegree != null &&
          product.itemTypeDegree > 0
            ? { itemTypeDegree: product.itemTypeDegree }
            : {}),
          ...(product.discountApplicable != null
            ? { discountApplicable: product.discountApplicable }
            : {}),
          ...(product.purchaseDate
            ? {
                purchaseDate:
                  product.purchaseDate.includes('T') &&
                  product.purchaseDate.includes('Z')
                    ? product.purchaseDate
                    : `${String(product.purchaseDate)
                        .trim()
                        .slice(0, 10)}T00:00:00Z`,
              }
            : {}),
          ...(validRates.length > 0
            ? {
                rates: validRates.map((r) => ({
                  name: r.name.trim(),
                  price: Number(r.price),
                })),
              }
            : {}),
          ...(hasValidDefaultRate && product.defaultRate
            ? { defaultRate: product.defaultRate.trim() }
            : {}),
        };
      });

      let vendorPurchaseInvoice: VendorPurchaseInvoicePayload | undefined;
      if (trimmedInvNo) {
        vendorPurchaseInvoice = { invoiceNo: trimmedInvNo };
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
        const ro = optionalNumFromString(vendorRoundOff);
        if (ro !== undefined) vendorPurchaseInvoice.roundOff = ro;
        const it = optionalNumFromString(vendorInvoiceTotal);
        if (it !== undefined) vendorPurchaseInvoice.invoiceTotal = it;
      }

      // Create bulk request
      const bulkData: BulkCreateInventoryDto = {
        vendorId: selectedVendor.vendorId,
        onCredit,
        ...(onCredit &&
          selectedVendor.userId &&
          selectedVendorShopId && { vendorShopId: selectedVendorShopId }),
        ...(vendorPurchaseInvoice && { vendorPurchaseInvoice }),
        items,
      };

      // Call bulk API
      try {
        const response = await inventoryApi.createBulk(bulkData);

        // The response should be BulkCreateInventoryResponse
        // Handle cases where the response structure might vary
        const createdCount =
          response?.createdCount ??
          response?.totalCreated ??
          response?.items?.length ??
          0;
        const items = response?.items ?? [];
        const savedVendorInvoiceId =
          response?.vendorPurchaseInvoiceId ?? response?.lotId;

        // If we have items or a positive createdCount, consider it successful
        if (createdCount > 0 || items.length > 0) {
          const itemDetails =
            items.length > 0
              ? items
                  .map(
                    (item, index) =>
                      `${products[index]?.name || 'Product'}: ${
                        item.id || 'Created'
                      }`
                  )
                  .join('; ')
              : '';
          notifySuccess(
            `Successfully registered ${
              createdCount || items.length
            } product(s)! ${
              savedVendorInvoiceId
                ? `Stock-in ID: ${savedVendorInvoiceId}. `
                : ''
            }${itemDetails ? `Details: ${itemDetails}` : ''}`
          );

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
            setVendorRoundOff('');
            setVendorInvoiceTotal('');
            setSuccess(null);
          }, 5000);
        } else if (response) {
          // If response exists but no createdCount/items, still consider it success
          // (API might return success without detailed counts)
          notifySuccess(
            `Successfully registered ${products.length} product(s)! ${
              (response?.vendorPurchaseInvoiceId ?? response?.lotId)
                ? `Stock-in ID: ${
                    response.vendorPurchaseInvoiceId ?? response.lotId
                  }. `
                : ''
            }`
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
            setVendorRoundOff('');
            setVendorInvoiceTotal('');
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
        err instanceof Error
          ? err.message
          : 'Failed to register products. Please try again.';
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
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to search vendor';
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
    setSelectedVendorShopId('');
    setVendorShops([]);
    if (vendor.userId) {
      setIsLoadingVendorShops(true);
      vendorsApi
        .getVendorShops(vendor.vendorId)
        .then((shops) => {
          setVendorShops(shops ?? []);
          if (shops?.length === 1) setSelectedVendorShopId(shops[0].shopId);
        })
        .catch(() => setVendorShops([]))
        .finally(() => setIsLoadingVendorShops(false));
    }
  };

  useEffect(() => {
    vendorPrefillConsumedRef.current = false;
  }, [location.key]);

  useLayoutEffect(() => {
    if (vendorPrefillConsumedRef.current) return;
    const raw = (
      location.state as { prefillVendor?: VendorResponse } | null | undefined
    )?.prefillVendor;
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
      const user = await usersApi.searchByEmail(email);
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
        notifyError(
          'Please fill in all required vendor fields (Name and Phone)'
        );
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
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create vendor';
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
    setVendorShops([]);
    setSelectedVendorShopId('');
    setOnCredit(false);
    setVendorInvoiceNo('');
    setVendorInvoiceDate('');
    setVendorLineSubTotal('');
    setVendorTaxTotal('');
    setVendorShippingCharge('');
    setVendorOtherCharges('');
    setVendorRoundOff('');
    setVendorInvoiceTotal('');
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
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Product Registration</h2>
        <p className={styles.subtitle}>
          Register multiple products at once with shared vendor and stock-in
          (invoice) information
        </p>
      </div>

      <div className={styles.formContainer}>
        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.uploadSection}>
            <div className={styles.uploadHeader}>
              <h3 className={styles.sectionTitle}>
                Upload Invoice Image (Optional)
              </h3>
              <ul className={styles.helperText}>
                <li>Upload invoice image to auto-parse product details</li>
                <li>Review and edit parsed products before bulk save</li>
              </ul>
            </div>
            <div className={styles.uploadOptionsHeader}>
              <span className={styles.uploadOptionsLabel}>
                Choose upload method:
              </span>
            </div>
            <div className={styles.uploadOptionsGrid}>
              <button
                type="button"
                className={styles.qrUploadBtn}
                onClick={handleCreateQrCode}
                disabled={isUploading || isLoading || isPolling}
              >
                <div className={styles.qrBtnIcon}>
                  <span role="img" aria-label="QR Code icon">
                    📱
                  </span>
                </div>
                <div className={styles.qrBtnContent}>
                  <span className={styles.qrBtnTitle}>Upload via QR Code</span>
                  <span className={styles.qrBtnSubtitle}>
                    Use mobile device to scan & upload
                  </span>
                </div>
              </button>
              <div className={styles.uploadOptionsOr}>
                <div className={styles.uploadOptionsOrLine}></div>
                <span className={styles.uploadOptionsOrText}>OR</span>
                <div className={styles.uploadOptionsOrLine}></div>
              </div>
              <div className={styles.uploadContainer}>
                <div className={styles.uploadOptionLabel}>
                  <span className={styles.uploadOptionTitle}>
                    Upload from this device
                  </span>
                  <span className={styles.uploadOptionSubtitle}>
                    Choose image file from computer
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className={styles.fileInput}
                  id="invoice-upload"
                  disabled={isUploading || isLoading}
                />
                <div className={styles.uploadControls}>
                  <label
                    htmlFor="invoice-upload"
                    className={styles.fileInputLabel}
                  >
                    {selectedFile ? (
                      <div className={styles.fileInfo}>
                        <span
                          className={styles.fileIcon}
                          role="img"
                          aria-label="File icon"
                        >
                          📄
                        </span>
                        <span className={styles.fileName}>
                          {selectedFile.name}
                        </span>
                        <span className={styles.fileSize}>
                          ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    ) : (
                      <div className={styles.uploadPlaceholder}>
                        <span
                          className={styles.uploadIcon}
                          role="img"
                          aria-label="Upload icon"
                        >
                          📤
                        </span>
                        <span>Click to browse files</span>
                      </div>
                    )}
                  </label>

                  {isUploading && (
                    <div className={styles.uploadProgress}>
                      <div className={styles.progressSpinner}></div>
                      <div className={styles.progressText}>
                        {uploadProgress}
                      </div>
                    </div>
                  )}

                  {selectedFile && !isUploading && (
                    <div className={styles.uploadActions}>
                      <button
                        type="button"
                        className={styles.uploadBtn}
                        onClick={handleUploadInvoice}
                        disabled={isLoading}
                      >
                        <span
                          className={styles.btnIcon}
                          role="img"
                          aria-label="Rocket icon"
                        >
                          🚀
                        </span>
                        Parse Invoice
                      </button>
                      <button
                        type="button"
                        className={styles.clearUploadBtn}
                        onClick={handleClearUpload}
                        disabled={isLoading}
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Shared vendor & billing */}
          <div className={styles.sharedSection}>
            <h3 className={styles.sectionTitle}>Shared Information</h3>
            <div className={styles.sharedTopRow}>
              <span className={styles.sharedHint}>
                Applies to all products.
              </span>
              <select
                className={`${styles.input} ${styles.sharedModeSelect}`}
                value={billingMode}
                onChange={(e) =>
                  handleBillingModeChange(e.target.value as BillingMode)
                }
                disabled={isLoading}
                aria-label="Billing mode"
              >
                <option value="REGULAR">REGULAR</option>
                <option value="BASIC">BASIC</option>
              </select>
            </div>

            {/* Vendor Section */}
            <div className={styles.vendorSection}>
              <h4 className={styles.subsectionTitle}>Vendor Information *</h4>
              <div className={styles.formGroup}>
                <label htmlFor="vendorSearch" className={styles.label}>
                  Vendor Search *
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      id="vendorSearch"
                      className={styles.input}
                      placeholder="Search by name, phone, email, or any keyword"
                      value={vendorSearchQuery}
                      onChange={(e) => {
                        setVendorSearchQuery(e.target.value);
                        setSelectedVendor(null);
                        setShowVendorDropdown(false);
                      }}
                      disabled={isLoading || isSearchingVendor}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className={styles.searchBtn}
                      onClick={handleVendorSearch}
                      disabled={
                        isLoading ||
                        isSearchingVendor ||
                        !vendorSearchQuery.trim()
                      }
                    >
                      {isSearchingVendor ? 'Searching...' : 'Search'}
                    </button>
                    <button
                      type="button"
                      className={styles.createVendorBtn}
                      onClick={() => setShowVendorModal(true)}
                      disabled={isLoading || isCreatingVendor}
                    >
                      Create New
                    </button>
                    {selectedVendor && (
                      <button
                        type="button"
                        className={styles.clearBtn}
                        onClick={handleClearVendor}
                        disabled={isLoading}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {showVendorDropdown && vendorSearchResults.length > 0 && (
                    <div className={styles.dropdown}>
                      {vendorSearchResults.map((vendor) => (
                        <div
                          key={vendor.vendorId}
                          className={styles.dropdownItem}
                          onClick={() => handleSelectVendor(vendor)}
                        >
                          <div style={{ fontWeight: 500 }}>{vendor.name}</div>
                          {vendor.contactPhone && (
                            <div
                              style={{
                                fontSize: '0.85rem',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {vendor.contactPhone}
                            </div>
                          )}
                          {vendor.gstinUin && (
                            <div
                              style={{
                                fontSize: '0.8rem',
                                color: 'var(--text-tertiary)',
                              }}
                            >
                              GSTIN: {vendor.gstinUin}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {showVendorDropdown &&
                    vendorSearchResults.length === 0 &&
                    !isSearchingVendor && (
                      <div className={styles.vendorNotFound}>
                        <p>
                          No vendors found. Would you like to create a new
                          vendor?
                        </p>
                        <button
                          type="button"
                          className={styles.createVendorBtn}
                          onClick={() => {
                            setShowVendorModal(true);
                            setShowVendorDropdown(false);
                          }}
                          disabled={isLoading}
                        >
                          Create New Vendor
                        </button>
                      </div>
                    )}
                </div>
              </div>
              {selectedVendor && (
                <div className={styles.vendorInfo}>
                  <div className={styles.vendorCard}>
                    {selectedVendor.userId && (
                      <span className={styles.stockkartUserBadge}>
                        StockKart user
                      </span>
                    )}
                    <h4>{selectedVendor.name}</h4>
                    <div className={styles.formGroup} style={{ marginTop: 12 }}>
                      <label
                        className={styles.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={onCredit}
                          onChange={(e) => {
                            setOnCredit(e.target.checked);
                            if (!e.target.checked) setSelectedVendorShopId('');
                          }}
                          disabled={isLoading}
                        />
                        Take this purchase on credit (amount owed to vendor)
                      </label>
                    </div>
                    {onCredit && selectedVendor.userId && (
                      <div
                        className={styles.formGroup}
                        style={{ marginTop: 12 }}
                      >
                        <label className={styles.label}>
                          Assign credit to vendor&apos;s shop
                        </label>
                        <select
                          className={styles.input}
                          value={selectedVendorShopId}
                          onChange={(e) =>
                            setSelectedVendorShopId(e.target.value)
                          }
                          disabled={isLoadingVendorShops || isLoading}
                        >
                          <option value="">
                            — Not assigned (vendor won&apos;t see in their shop)
                            —
                          </option>
                          {vendorShops.map((s) => (
                            <option key={s.shopId} value={s.shopId}>
                              {s.shopName}
                            </option>
                          ))}
                        </select>
                        <small
                          style={{
                            color: 'var(--text-secondary)',
                            marginTop: 4,
                            display: 'block',
                          }}
                        >
                          When assigned, the vendor can see this pending amount
                          when they log into that shop.
                        </small>
                      </div>
                    )}
                    <p>
                      <strong>Phone:</strong> {selectedVendor.contactPhone}
                    </p>
                    {selectedVendor.contactEmail && (
                      <p>
                        <strong>Email:</strong> {selectedVendor.contactEmail}
                      </p>
                    )}
                    {selectedVendor.address && (
                      <p>
                        <strong>Address:</strong> {selectedVendor.address}
                      </p>
                    )}
                    {selectedVendor.gstinUin && (
                      <p>
                        <strong>GSTIN / UIN:</strong> {selectedVendor.gstinUin}
                      </p>
                    )}
                    <p>
                      <strong>Business Type:</strong>{' '}
                      {selectedVendor.businessType}
                    </p>
                  </div>
                </div>
              )}

              <div
                className={styles.vendorSection}
                style={{ marginTop: '1.25rem' }}
              >
                <h4 className={styles.subsectionTitle}>
                  Vendor purchase invoice (optional)
                </h4>
                <p
                  className={styles.helperText}
                  style={{ marginBottom: '0.75rem' }}
                >
                  Add the supplier&apos;s invoice number and amounts to keep a
                  history of what was bought on each bill. Leave blank to
                  register stock without an invoice record.
                </p>
                <div className={styles.sharedInfoGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="vendorInvoiceNo" className={styles.label}>
                      Invoice number
                    </label>
                    <input
                      id="vendorInvoiceNo"
                      type="text"
                      className={styles.input}
                      value={vendorInvoiceNo}
                      onChange={(e) => setVendorInvoiceNo(e.target.value)}
                      placeholder="e.g. INV-2024-001"
                      disabled={isLoading}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label
                      htmlFor="vendorInvoiceDate"
                      className={styles.label}
                    >
                      Invoice date
                    </label>
                    <input
                      id="vendorInvoiceDate"
                      type="date"
                      className={styles.input}
                      value={vendorInvoiceDate}
                      onChange={(e) => setVendorInvoiceDate(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label
                      htmlFor="vendorLineSubTotal"
                      className={styles.label}
                    >
                      Line subtotal
                    </label>
                    <input
                      id="vendorLineSubTotal"
                      type="text"
                      inputMode="decimal"
                      className={styles.input}
                      value={vendorLineSubTotal}
                      onChange={(e) => setVendorLineSubTotal(e.target.value)}
                      placeholder="0"
                      disabled={isLoading}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="vendorTaxTotal" className={styles.label}>
                      Tax total
                    </label>
                    <input
                      id="vendorTaxTotal"
                      type="text"
                      inputMode="decimal"
                      className={styles.input}
                      value={vendorTaxTotal}
                      onChange={(e) => setVendorTaxTotal(e.target.value)}
                      placeholder="0"
                      disabled={isLoading}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label
                      htmlFor="vendorShippingCharge"
                      className={styles.label}
                    >
                      Shipping / delivery
                    </label>
                    <input
                      id="vendorShippingCharge"
                      type="text"
                      inputMode="decimal"
                      className={styles.input}
                      value={vendorShippingCharge}
                      onChange={(e) =>
                        setVendorShippingCharge(e.target.value)
                      }
                      placeholder="0"
                      disabled={isLoading}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label
                      htmlFor="vendorOtherCharges"
                      className={styles.label}
                    >
                      Other charges
                    </label>
                    <input
                      id="vendorOtherCharges"
                      type="text"
                      inputMode="decimal"
                      className={styles.input}
                      value={vendorOtherCharges}
                      onChange={(e) => setVendorOtherCharges(e.target.value)}
                      placeholder="0"
                      disabled={isLoading}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="vendorRoundOff" className={styles.label}>
                      Round off
                    </label>
                    <input
                      id="vendorRoundOff"
                      type="text"
                      inputMode="decimal"
                      className={styles.input}
                      value={vendorRoundOff}
                      onChange={(e) => setVendorRoundOff(e.target.value)}
                      placeholder="0"
                      disabled={isLoading}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label
                      htmlFor="vendorInvoiceTotal"
                      className={styles.label}
                    >
                      Invoice total
                    </label>
                    <input
                      id="vendorInvoiceTotal"
                      type="text"
                      inputMode="decimal"
                      className={styles.input}
                      value={vendorInvoiceTotal}
                      onChange={(e) => setVendorInvoiceTotal(e.target.value)}
                      placeholder="0"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.separator}>
            <div className={styles.separatorLine}></div>
            <div className={styles.separatorContent}>
              <span
                className={styles.separatorIcon}
                role="img"
                aria-label="Sparkle icon"
              >
                ✨
              </span>
              <span className={styles.separatorText}>
                Or manually add products below
              </span>
            </div>
            <div className={styles.separatorLine}></div>
          </div>

          {/* Products Section */}
          <div className={styles.productsSection} ref={productsSectionRef}>
            {showReviewBanner && (
              <div className={styles.reviewBanner}>
                <div className={styles.reviewBannerContent}>
                  <span
                    className={styles.reviewBannerIcon}
                    role="img"
                    aria-label="Clipboard icon"
                  >
                    📋
                  </span>
                  <div className={styles.reviewBannerText}>
                    <strong>Review Required:</strong> Please review the{' '}
                    {reviewBannerItemsCount} item(s) below and fill in any
                    missing information before submitting.
                  </div>
                  <button
                    type="button"
                    className={styles.reviewBannerClose}
                    onClick={() => setShowReviewBanner(false)}
                    aria-label="Close review banner"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
            <div className={styles.productsHeader}>
              <h3 className={styles.sectionTitle}>Products</h3>
              <div className={styles.productsHeaderRight}>
                {products.length > 0 && (
                  <div className={styles.viewToggleWrap}>
                    <span className={styles.viewToggleLabel}>View:</span>
                    <div
                      className={styles.viewToggleButtons}
                      role="group"
                      aria-label="Product view mode"
                    >
                      <button
                        type="button"
                        className={`${styles.viewToggleBtn} ${
                          productViewMode === 'list'
                            ? styles.viewToggleBtnActive
                            : ''
                        }`}
                        onClick={() => {
                          setProductViewMode('list');
                          localStorage.setItem(
                            'product-registration-view-mode',
                            'list'
                          );
                        }}
                        title="List view"
                        aria-pressed={productViewMode === 'list'}
                      >
                        <span aria-hidden>☰</span> List
                      </button>
                      <button
                        type="button"
                        className={`${styles.viewToggleBtn} ${
                          productViewMode === 'grid'
                            ? styles.viewToggleBtnActive
                            : ''
                        }`}
                        onClick={() => {
                          setProductViewMode('grid');
                          localStorage.setItem(
                            'product-registration-view-mode',
                            'grid'
                          );
                        }}
                        title="Grid view"
                        aria-pressed={productViewMode === 'grid'}
                      >
                        <span aria-hidden>⊞</span> Grid
                      </button>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  className={styles.addProductBtn}
                  onClick={handleAddProduct}
                  disabled={isLoading}
                >
                  + Add Product
                </button>
              </div>
            </div>

            {products.length > 0 && (
              <p className={styles.keyboardNavHint}>
                <span className={styles.keyboardNavHintLabel}>Keyboard:</span>{' '}
                <kbd className={styles.kbdInline}>Enter</kbd> next field ·{' '}
                <kbd className={styles.kbdInline}>↑</kbd>
                <kbd className={styles.kbdInline}>↓</kbd>{' '}
                {productViewMode === 'grid'
                  ? 'same column'
                  : 'previous / next'}
                {' · '}
                <kbd className={styles.kbdInline}>Shift</kbd>+
                <kbd className={styles.kbdInline}>Enter</kbd> back
              </p>
            )}

            {products.length === 0 ? (
              <div className={styles.emptyState}>
                <p>
                  No products added yet. Click "Add Product" to get started.
                </p>
              </div>
            ) : productViewMode === 'grid' ? (
              <div
                className={styles.excelTableWrap}
                {...{ 'data-keyboard-nav': KEYBOARD_NAV_GRID }}
                onKeyDownCapture={(e) => {
                  if (shouldSkipNestedFormKeyboardNav(document.activeElement)) {
                    return;
                  }
                  runFormKeyboardNavigation(e, e.currentTarget, 'grid');
                }}
              >
                <table className={styles.excelTable}>
                  <thead>
                    <tr>
                      <th className={styles.excelTh}>#</th>
                      <th className={styles.excelTh}>Barcode</th>
                      <th className={styles.excelTh}>Product</th>
                      <th className={styles.excelTh}>Company</th>
                      <th className={styles.excelTh}>Count</th>
                      <th className={styles.excelTh}>Packaging</th>
                      <th className={styles.excelTh}>Expiry</th>
                      <th className={styles.excelTh}>Location</th>
                      {billingMode !== 'BASIC' && (
                        <>
                          <th className={styles.excelTh}>HSN</th>
                          <th className={styles.excelTh}>Batch</th>
                        </>
                      )}
                      <th className={styles.excelTh}>Cost</th>
                      <th className={styles.excelTh}>PTR</th>
                      <th className={styles.excelTh}>MRP</th>
                      <th className={styles.excelTh}>Sale deal type</th>
                      <th className={styles.excelTh}>Sale scheme</th>
                      <th className={styles.excelTh}>Sale disc %</th>
                      <th className={styles.excelTh}>Purchase deal type</th>
                      <th className={styles.excelTh}>Purchase scheme</th>
                      <th className={styles.excelTh}>Purchase disc %</th>
                      <th className={styles.excelTh}>Item type</th>
                      <th className={styles.excelTh}>°</th>
                      <th className={styles.excelTh}>Disc appl.</th>
                      <th className={styles.excelTh}>Purch. date</th>
                      {billingMode === 'REGULAR' && (
                        <>
                          <th className={styles.excelTh}>CGST %</th>
                          <th className={styles.excelTh}>SGST %</th>
                        </>
                      )}
                      <th className={styles.excelTh}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, idx) => (
                      <tr key={product.id} className={styles.excelTr}>
                        <td className={styles.excelTd}>{idx + 1}</td>
                        <td className={styles.excelTd}>
                          <input
                            type="text"
                            className={styles.excelInput}
                            placeholder="Barcode"
                            value={product.barcode}
                            onChange={(e) =>
                              handleProductChange(
                                product.id,
                                'barcode',
                                e.target.value
                              )
                            }
                            disabled={isLoading}
                          />
                        </td>
                        <td className={styles.excelTd}>
                          <input
                            type="text"
                            className={styles.excelInput}
                            placeholder="Product name"
                            value={product.name}
                            onChange={(e) =>
                              handleProductChange(
                                product.id,
                                'name',
                                e.target.value
                              )
                            }
                            disabled={isLoading}
                          />
                        </td>
                        <td className={styles.excelTd}>
                          <input
                            type="text"
                            className={styles.excelInput}
                            placeholder="Company"
                            value={product.companyName}
                            onChange={(e) =>
                              handleProductChange(
                                product.id,
                                'companyName',
                                e.target.value
                              )
                            }
                            disabled={isLoading}
                          />
                        </td>
                        <td className={styles.excelTd}>
                          <input
                            type="text"
                            inputMode="numeric"
                            className={styles.excelInputNarrow}
                            placeholder="0"
                            value={product.count === 0 ? '' : product.count}
                            onChange={(e) =>
                              handleIntegerChange(
                                product.id,
                                'count',
                                e.target.value
                              )
                            }
                            disabled={isLoading}
                          />
                        </td>
                        <td className={styles.excelTd}>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={styles.excelInputNarrow}
                            placeholder="1 x _"
                            value={
                              product.conversionFactor &&
                              product.conversionFactor > 0
                                ? product.conversionFactor
                                : ''
                            }
                            onChange={(e) =>
                              handleDecimalChange(
                                product.id,
                                'conversionFactor',
                                e.target.value
                              )
                            }
                            disabled={isLoading}
                          />
                        </td>
                        <td className={styles.excelTd}>
                          <input
                            type="date"
                            className={styles.excelInputDate}
                            value={
                              product.expiryDate &&
                              !isNaN(new Date(product.expiryDate).getTime())
                                ? new Date(product.expiryDate)
                                    .toISOString()
                                    .split('T')[0]
                                : ''
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              handleProductChange(
                                product.id,
                                'expiryDate',
                                v ? `${v}T00:00:00Z` : ''
                              );
                            }}
                            disabled={isLoading}
                          />
                        </td>
                        <td className={styles.excelTd}>
                          <input
                            type="text"
                            className={styles.excelInput}
                            placeholder="Location"
                            value={product.location}
                            onChange={(e) =>
                              handleProductChange(
                                product.id,
                                'location',
                                e.target.value
                              )
                            }
                            disabled={isLoading}
                          />
                        </td>
                        {billingMode !== 'BASIC' && (
                          <>
                            <td className={styles.excelTd}>
                              <input
                                type="text"
                                className={styles.excelInput}
                                placeholder="HSN"
                                value={product.hsn || ''}
                                onChange={(e) =>
                                  handleProductChange(
                                    product.id,
                                    'hsn',
                                    e.target.value
                                  )
                                }
                                disabled={isLoading}
                              />
                            </td>
                            <td className={styles.excelTd}>
                              <input
                                type="text"
                                className={styles.excelInput}
                                placeholder="Batch"
                                value={product.batchNo || ''}
                                onChange={(e) =>
                                  handleProductChange(
                                    product.id,
                                    'batchNo',
                                    e.target.value
                                  )
                                }
                                disabled={isLoading}
                              />
                            </td>
                          </>
                        )}
                        <td className={styles.excelTd}>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={styles.excelInputNarrow}
                            placeholder="0"
                            value={
                              product.costPrice === 0 ? '' : product.costPrice
                            }
                            onChange={(e) =>
                              handleDecimalChange(
                                product.id,
                                'costPrice',
                                e.target.value
                              )
                            }
                            disabled={isLoading}
                          />
                        </td>
                        <td className={styles.excelTd}>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={styles.excelInputNarrow}
                            placeholder="0"
                            value={
                              product.priceToRetail === 0
                                ? ''
                                : product.priceToRetail
                            }
                            onChange={(e) =>
                              handleDecimalChange(
                                product.id,
                                'priceToRetail',
                                e.target.value
                              )
                            }
                            disabled={isLoading}
                          />
                        </td>
                        <td className={styles.excelTd}>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={styles.excelInputNarrow}
                            placeholder="0"
                            value={
                              product.maximumRetailPrice === 0
                                ? ''
                                : product.maximumRetailPrice
                            }
                            onChange={(e) =>
                              handleDecimalChange(
                                product.id,
                                'maximumRetailPrice',
                                e.target.value
                              )
                            }
                            disabled={isLoading}
                          />
                        </td>
                        <td className={styles.excelTd}>
                          <label className={styles.srOnly} htmlFor={`grid-scheme-type-${product.id}`}>
                            Sale scheme deal type
                          </label>
                          <select
                            id={`grid-scheme-type-${product.id}`}
                            className={styles.excelSelect}
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
                                  null
                                );
                              }
                            }}
                            disabled={isLoading}
                          >
                            <option value="FIXED_UNITS">Free units</option>
                            <option value="PERCENTAGE">Percentage</option>
                          </select>
                        </td>
                        <td className={styles.excelTd}>
                          <input
                            type="text"
                            className={styles.excelInputNarrow}
                            placeholder="e.g. 10+2"
                            value={
                              gridSchemeDrafts[product.id]?.sale ??
                              ((product.schemeType ?? 'FIXED_UNITS') ===
                              'PERCENTAGE'
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
                                handleProductChange(
                                  product.id,
                                  'schemePayFor',
                                  null
                                );
                                handleProductChange(
                                  product.id,
                                  'schemeFree',
                                  null
                                );
                                handleProductChange(
                                  product.id,
                                  'schemePercentage',
                                  null
                                );
                                return;
                              }
                              if (raw.endsWith('%')) {
                                const num = parseFloat(raw.slice(0, -1));
                                if (!isNaN(num) && num > 0 && num <= 100) {
                                  handleProductChange(
                                    product.id,
                                    'schemeType',
                                    'PERCENTAGE'
                                  );
                                  handleProductChange(
                                    product.id,
                                    'schemePercentage',
                                    num
                                  );
                                  handleProductChange(
                                    product.id,
                                    'schemePayFor',
                                    null
                                  );
                                  handleProductChange(
                                    product.id,
                                    'schemeFree',
                                    null
                                  );
                                }
                                return;
                              }
                              const plusIdx = raw.indexOf('+');
                              if (plusIdx >= 0) {
                                const left = parseInt(
                                  raw.slice(0, plusIdx).trim(),
                                  10
                                );
                                const right = parseInt(
                                  raw.slice(plusIdx + 1).trim(),
                                  10
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
                                    'FIXED_UNITS'
                                  );
                                  handleProductChange(
                                    product.id,
                                    'schemePayFor',
                                    left
                                  );
                                  handleProductChange(
                                    product.id,
                                    'schemeFree',
                                    right
                                  );
                                  handleProductChange(
                                    product.id,
                                    'schemePercentage',
                                    null
                                  );
                                }
                              }
                            }}
                            disabled={isLoading}
                          />
                        </td>
                        <td className={styles.excelTd}>
                          <input
                            type="number"
                            className={styles.excelInputNarrow}
                            placeholder="—"
                            step="0.01"
                            min={0}
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
                                  null
                                );
                              } else {
                                const n = parseFloat(v);
                                if (!isNaN(n) && n >= 0 && n <= 100) {
                                  handleProductChange(
                                    product.id,
                                    'saleAdditionalDiscount',
                                    n
                                  );
                                }
                              }
                            }}
                            disabled={isLoading}
                          />
                        </td>
                        <td className={styles.excelTd}>
                          <label
                            className={styles.srOnly}
                            htmlFor={`grid-purchase-scheme-type-${product.id}`}
                          >
                            Purchase scheme deal type
                          </label>
                          <select
                            id={`grid-purchase-scheme-type-${product.id}`}
                            className={styles.excelSelect}
                            value={product.purchaseSchemeType ?? 'FIXED_UNITS'}
                            onChange={(e) => {
                              const val = e.target.value as SchemeType;
                              handleProductChange(
                                product.id,
                                'purchaseSchemeType',
                                val
                              );
                              if (val === 'PERCENTAGE') {
                                handleProductChange(
                                  product.id,
                                  'purchaseSchemePayFor',
                                  null
                                );
                                handleProductChange(
                                  product.id,
                                  'purchaseSchemeFree',
                                  null
                                );
                              } else {
                                handleProductChange(
                                  product.id,
                                  'purchaseSchemePercentage',
                                  null
                                );
                              }
                            }}
                            disabled={isLoading}
                          >
                            <option value="FIXED_UNITS">Free units</option>
                            <option value="PERCENTAGE">Percentage</option>
                          </select>
                        </td>
                        <td className={styles.excelTd}>
                          <input
                            type="text"
                            className={styles.excelInputNarrow}
                            placeholder="e.g. 10+2"
                            value={
                              gridSchemeDrafts[product.id]?.purchase ??
                              ((product.purchaseSchemeType ?? 'FIXED_UNITS') ===
                              'PERCENTAGE'
                                ? product.purchaseSchemePercentage != null
                                  ? `${product.purchaseSchemePercentage}%`
                                  : ''
                                : product.purchaseSchemePayFor != null ||
                                  product.purchaseSchemeFree != null
                                ? `${product.purchaseSchemePayFor ?? 0}+${
                                    product.purchaseSchemeFree ?? 0
                                  }`
                                : '')
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
                                handleProductChange(
                                  product.id,
                                  'purchaseSchemePayFor',
                                  null
                                );
                                handleProductChange(
                                  product.id,
                                  'purchaseSchemeFree',
                                  null
                                );
                                handleProductChange(
                                  product.id,
                                  'purchaseSchemePercentage',
                                  null
                                );
                                return;
                              }
                              if (raw.endsWith('%')) {
                                const num = parseFloat(raw.slice(0, -1));
                                if (!isNaN(num) && num >= 0 && num <= 100) {
                                  handleProductChange(
                                    product.id,
                                    'purchaseSchemeType',
                                    'PERCENTAGE'
                                  );
                                  handleProductChange(
                                    product.id,
                                    'purchaseSchemePercentage',
                                    num
                                  );
                                  handleProductChange(
                                    product.id,
                                    'purchaseSchemePayFor',
                                    null
                                  );
                                  handleProductChange(
                                    product.id,
                                    'purchaseSchemeFree',
                                    null
                                  );
                                }
                                return;
                              }
                              const plusIdx = raw.indexOf('+');
                              if (plusIdx >= 0) {
                                const left = parseInt(
                                  raw.slice(0, plusIdx).trim(),
                                  10
                                );
                                const right = parseInt(
                                  raw.slice(plusIdx + 1).trim(),
                                  10
                                );
                                if (
                                  !isNaN(left) &&
                                  !isNaN(right) &&
                                  left >= 0 &&
                                  right >= 0
                                ) {
                                  handleProductChange(
                                    product.id,
                                    'purchaseSchemeType',
                                    'FIXED_UNITS'
                                  );
                                  handleProductChange(
                                    product.id,
                                    'purchaseSchemePayFor',
                                    left
                                  );
                                  handleProductChange(
                                    product.id,
                                    'purchaseSchemeFree',
                                    right
                                  );
                                  handleProductChange(
                                    product.id,
                                    'purchaseSchemePercentage',
                                    null
                                  );
                                }
                              }
                            }}
                            disabled={isLoading}
                          />
                        </td>
                        <td className={styles.excelTd}>
                          <input
                            type="number"
                            className={styles.excelInputNarrow}
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
                                  null
                                );
                              } else {
                                const n = parseFloat(v);
                                if (!isNaN(n) && n >= 0 && n <= 100) {
                                  handleProductChange(
                                    product.id,
                                    'purchaseAdditionalDiscount',
                                    n
                                  );
                                }
                              }
                            }}
                            disabled={isLoading}
                          />
                        </td>
                        <td className={styles.excelTd}>
                          <label
                            className={styles.srOnly}
                            htmlFor={`grid-item-type-${product.id}`}
                          >
                            Item type
                          </label>
                          <select
                            id={`grid-item-type-${product.id}`}
                            className={styles.excelSelect}
                            value={product.itemType ?? 'NORMAL'}
                            onChange={(e) => {
                              const val = e.target.value as ItemType | '';
                              const itemType =
                                val === '' ? 'NORMAL' : (val as ItemType);
                              handleProductChange(
                                product.id,
                                'itemType',
                                itemType
                              );
                              if (itemType !== 'DEGREE') {
                                handleProductChange(
                                  product.id,
                                  'itemTypeDegree',
                                  undefined
                                );
                              }
                            }}
                            disabled={isLoading}
                          >
                            <option value="NORMAL">Normal</option>
                            <option value="COSTLY">Costly</option>
                            <option value="DEGREE">Temp / °</option>
                          </select>
                        </td>
                        <td className={styles.excelTd}>
                          {product.itemType === 'DEGREE' ? (
                            <input
                              type="number"
                              className={styles.excelInputNarrow}
                              placeholder="°"
                              min={1}
                              step={1}
                              value={
                                product.itemTypeDegree != null
                                  ? product.itemTypeDegree
                                  : ''
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                  handleProductChange(
                                    product.id,
                                    'itemTypeDegree',
                                    undefined
                                  );
                                } else {
                                  const num = parseInt(val, 10);
                                  if (
                                    !isNaN(num) &&
                                    num > 0 &&
                                    Number.isInteger(num)
                                  ) {
                                    handleProductChange(
                                      product.id,
                                      'itemTypeDegree',
                                      num
                                    );
                                  }
                                }
                              }}
                              disabled={isLoading}
                            />
                          ) : (
                            <span className={styles.excelCellDash}>—</span>
                          )}
                        </td>
                        <td className={styles.excelTd}>
                          <label
                            className={styles.srOnly}
                            htmlFor={`grid-discount-applicable-${product.id}`}
                          >
                            Discount applicable
                          </label>
                          <select
                            id={`grid-discount-applicable-${product.id}`}
                            className={styles.excelSelect}
                            value={product.discountApplicable ?? ''}
                            onChange={(e) => {
                              const val = e.target.value as DiscountApplicable | '';
                              handleProductChange(
                                product.id,
                                'discountApplicable',
                                val === ''
                                  ? undefined
                                  : (val as DiscountApplicable)
                              );
                            }}
                            disabled={isLoading}
                          >
                            <option value="">—</option>
                            <option value="DISCOUNT">Discount</option>
                            <option value="SCHEME">Scheme</option>
                            <option value="DISCOUNT_AND_SCHEME">Both</option>
                          </select>
                        </td>
                        <td className={styles.excelTd}>
                          <input
                            type="date"
                            className={styles.excelInputDate}
                            min={purchaseDateFieldMin}
                            max={purchaseDateFieldMax}
                            value={
                              product.purchaseDate
                                ? new Date(product.purchaseDate)
                                    .toISOString()
                                    .split('T')[0]
                                : ''
                            }
                            onChange={(e) => {
                              const dateValue = e.target.value;
                              if (dateValue) {
                                handleProductChange(
                                  product.id,
                                  'purchaseDate',
                                  `${dateValue}T00:00:00.000Z`
                                );
                              } else {
                                handleProductChange(
                                  product.id,
                                  'purchaseDate',
                                  undefined
                                );
                              }
                            }}
                            disabled={isLoading}
                          />
                        </td>
                        {billingMode === 'REGULAR' && (
                          <>
                            <td className={styles.excelTd}>
                              <input
                                type="text"
                                inputMode="decimal"
                                className={styles.excelInputNarrow}
                                placeholder="CGST"
                                value={product.cgst || ''}
                                onChange={(e) =>
                                  handleProductChange(
                                    product.id,
                                    'cgst',
                                    e.target.value
                                  )
                                }
                                disabled={isLoading}
                              />
                            </td>
                            <td className={styles.excelTd}>
                              <input
                                type="text"
                                inputMode="decimal"
                                className={styles.excelInputNarrow}
                                placeholder="SGST"
                                value={product.sgst || ''}
                                onChange={(e) =>
                                  handleProductChange(
                                    product.id,
                                    'sgst',
                                    e.target.value
                                  )
                                }
                                disabled={isLoading}
                              />
                            </td>
                          </>
                        )}
                        <td className={styles.excelTd}>
                          <button
                            type="button"
                            className={styles.excelRemoveBtn}
                            onClick={() => handleRemoveProduct(product.id)}
                            disabled={isLoading}
                            aria-label="Remove product"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className={styles.gridViewFootnote}>
                  Optional rate tiers and custom reminders are editable in list
                  view.
                </p>
              </div>
            ) : (
              <div className={styles.productsList}>
                {products.map((product, index) => (
                  <ProductAccordion
                    key={product.id}
                    product={product}
                    billingMode={billingMode}
                    index={index}
                    onToggle={() => handleToggleProduct(product.id)}
                    onRemove={() => handleRemoveProduct(product.id)}
                    onChange={handleProductChange}
                    onIntegerChange={handleIntegerChange}
                    onDecimalChange={handleDecimalChange}
                    onCustomRemindersChange={(reminders) =>
                      handleProductChange(
                        product.id,
                        'customReminders',
                        reminders
                      )
                    }
                    isLoading={isLoading}
                    isoToLocalDateTime={isoToLocalDateTime}
                    localDateTimeToIso={localDateTimeToIso}
                  />
                ))}
              </div>
            )}
          </div>

          {products.length > 0 && (
            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isLoading}
              >
                {isLoading
                  ? `Registering ${products.length} Product(s)...`
                  : `Register ${products.length} Product(s)`}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Vendor Creation Modal */}
      {showVendorModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => !isCreatingVendor && handleCloseVendorModal()}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Create New Vendor</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={handleCloseVendorModal}
                disabled={isCreatingVendor}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label htmlFor="vendorName" className={styles.label}>
                  Vendor Name *
                </label>
                <input
                  type="text"
                  id="vendorName"
                  className={styles.input}
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
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="vendorContactPhone" className={styles.label}>
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  id="vendorContactPhone"
                  className={styles.input}
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
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="vendorContactEmail" className={styles.label}>
                  Contact Email
                </label>
                <input
                  type="email"
                  id="vendorContactEmail"
                  className={styles.input}
                  placeholder="Enter contact email"
                  value={vendorFormData.contactEmail}
                  onChange={(e) =>
                    setVendorFormData((prev) => ({
                      ...prev,
                      contactEmail: e.target.value,
                    }))
                  }
                  disabled={isCreatingVendor}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Link to registered user</label>
                <p
                  className={styles.helperText}
                  style={{ marginBottom: 8, fontSize: 13, color: '#666' }}
                >
                  If this vendor is a registered user, search by their email to
                  link. Enables credit sync across shops.
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={handleSearchUserForLink}
                    disabled={
                      isCreatingVendor ||
                      isSearchingUser ||
                      !vendorFormData.contactEmail?.trim()
                    }
                  >
                    {isSearchingUser ? 'Checking...' : 'Check'}
                  </button>
                  {linkedUser && (
                    <button
                      type="button"
                      className={styles.clearBtn}
                      onClick={handleUnlinkUser}
                      disabled={isCreatingVendor}
                    >
                      Unlink
                    </button>
                  )}
                </div>
                {userSearchMessage && (
                  <p
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      color: linkedUser ? '#16a34a' : '#666',
                    }}
                  >
                    {userSearchMessage}
                  </p>
                )}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="vendorAddress" className={styles.label}>
                  Address
                </label>
                <input
                  type="text"
                  id="vendorAddress"
                  className={styles.input}
                  placeholder="Enter address"
                  value={vendorFormData.address}
                  onChange={(e) =>
                    setVendorFormData((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  disabled={isCreatingVendor}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="vendorGstinUin" className={styles.label}>
                  GSTIN / UIN
                </label>
                <input
                  type="text"
                  id="vendorGstinUin"
                  className={styles.input}
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
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="vendorBusinessType" className={styles.label}>
                  Business Type *
                </label>
                <select
                  id="vendorBusinessType"
                  className={styles.input}
                  value={
                    showCustomBusinessType
                      ? 'OTHER'
                      : vendorFormData.businessType
                  }
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
                </select>
              </div>
              {showCustomBusinessType && (
                <div className={styles.formGroup}>
                  <label htmlFor="customBusinessType" className={styles.label}>
                    Custom Business Type *
                  </label>
                  <input
                    type="text"
                    id="customBusinessType"
                    className={styles.input}
                    placeholder="Enter custom business type"
                    value={customBusinessType}
                    onChange={(e) => setCustomBusinessType(e.target.value)}
                    disabled={isCreatingVendor}
                    required
                  />
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={handleCloseVendorModal}
                disabled={isCreatingVendor}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.submitBtn}
                onClick={handleCreateVendor}
                disabled={isCreatingVendor}
              >
                {isCreatingVendor ? 'Creating...' : 'Create Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Upload Modal */}
      {showQrModal && (
        <div className={styles.modalOverlay} onClick={handleCloseQrModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px' }}
          >
            <div className={styles.modalHeader}>
              <h3>Scan QR Code to Upload Invoice</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={handleCloseQrModal}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '20px',
                  padding: '20px',
                }}
              >
                {uploadUrl && (
                  <div
                    style={{
                      padding: '20px',
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <QRCodeSVG value={uploadUrl} size={256} />
                  </div>
                )}
                <div style={{ textAlign: 'center' }}>
                  <p style={{ marginBottom: '12px', fontWeight: 500 }}>
                    Scan this QR code with your mobile device to upload the
                    invoice image.
                  </p>
                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '8px',
                    }}
                  >
                    Status: <strong>{uploadStatus || 'PENDING'}</strong>
                  </p>
                  {isPolling && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginTop: '12px',
                      }}
                    >
                      <div className={styles.progressSpinner}></div>
                      <span style={{ fontSize: '0.9rem' }}>
                        Waiting for upload...
                      </span>
                    </div>
                  )}
                  {uploadStatus === 'UPLOADING' && (
                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        marginTop: '8px',
                      }}
                    >
                      Image is being uploaded...
                    </p>
                  )}
                  {uploadStatus === 'PROCESSING' && (
                    <p
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        marginTop: '8px',
                      }}
                    >
                      Processing invoice...
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={handleCloseQrModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Product Accordion Component
interface ProductAccordionProps {
  product: ProductFormData;
  billingMode: BillingMode;
  index: number;
  onToggle: () => void;
  onRemove: () => void;
  onChange: (
    productId: string,
    field: keyof ProductFormData,
    value: ProductFormData[keyof ProductFormData]
  ) => void;
  onIntegerChange: (productId: string, field: string, value: string) => void;
  onDecimalChange: (productId: string, field: string, value: string) => void;
  onCustomRemindersChange: (reminders: CustomReminderInput[]) => void;
  isLoading: boolean;
  isoToLocalDateTime: (iso: string) => string;
  localDateTimeToIso: (local: string) => string;
}

function ProductAccordion({
  product,
  billingMode,
  index,
  onToggle,
  onRemove,
  onChange,
  onIntegerChange,
  onDecimalChange,
  onCustomRemindersChange,
  isLoading,
  isoToLocalDateTime,
  localDateTimeToIso,
}: ProductAccordionProps) {
  const productTitle = product.name || `Product ${index + 1}`;

  const formatSchemeFixed = (p: ProductFormData): string => {
    if (p.schemePayFor != null || p.schemeFree != null) {
      return `${p.schemePayFor ?? 0} + ${p.schemeFree ?? 0}`;
    }
    if (p.scheme != null && p.scheme !== undefined) return `1 + ${p.scheme}`;
    return '';
  };
  const formatPurchaseSchemeFixed = (p: ProductFormData): string => {
    if (p.purchaseSchemePayFor != null || p.purchaseSchemeFree != null) {
      return `${p.purchaseSchemePayFor ?? 0} + ${p.purchaseSchemeFree ?? 0}`;
    }
    return '';
  };

  const [schemeFixedDraft, setSchemeFixedDraft] = useState('');
  const [schemeFixedFocused, setSchemeFixedFocused] = useState(false);
  const [purchaseSchemeFixedDraft, setPurchaseSchemeFixedDraft] = useState('');
  const [purchaseSchemeFixedFocused, setPurchaseSchemeFixedFocused] =
    useState(false);

  useEffect(() => {
    if (!schemeFixedFocused) setSchemeFixedDraft(formatSchemeFixed(product));
  }, [
    product.id,
    product.schemePayFor,
    product.schemeFree,
    product.scheme,
    schemeFixedFocused,
  ]);

  useEffect(() => {
    if (!purchaseSchemeFixedFocused)
      setPurchaseSchemeFixedDraft(formatPurchaseSchemeFixed(product));
  }, [
    product.id,
    product.purchaseSchemePayFor,
    product.purchaseSchemeFree,
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
      onChange(product.id, 'purchaseSchemePayFor', null);
      onChange(product.id, 'purchaseSchemeFree', null);
      return;
    }
    const plusIdx = raw.indexOf('+');
    if (plusIdx === -1) {
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num >= 0) {
        onChange(product.id, 'purchaseSchemePayFor', num);
        onChange(product.id, 'purchaseSchemeFree', 0);
      }
      return;
    }
    const leftStr = raw.slice(0, plusIdx).trim();
    const rightStr = raw.slice(plusIdx + 1).trim();
    const left = leftStr === '' ? 0 : parseInt(leftStr, 10);
    const right = rightStr === '' ? 0 : parseInt(rightStr, 10);
    if (!isNaN(left) && !isNaN(right) && left >= 0 && right >= 0) {
      onChange(product.id, 'purchaseSchemePayFor', left);
      onChange(product.id, 'purchaseSchemeFree', right);
    }
  };

  return (
    <div className={styles.productAccordion}>
      <div className={styles.accordionHeader} onClick={onToggle}>
        <div className={styles.accordionTitle}>
          <span className={styles.accordionIcon}>
            {product.isExpanded ? '▼' : '▶'}
          </span>
          <span>{productTitle}</span>
          {product.barcode && (
            <span className={styles.accordionSubtitle}>
              (Barcode: {product.barcode})
            </span>
          )}
        </div>
        <button
          type="button"
          className={styles.removeProductBtn}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={isLoading}
          aria-label="Remove product"
        >
          ×
        </button>
      </div>

      {product.isExpanded && (
        <div className={styles.accordionContent}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor={`barcode-${product.id}`} className={styles.label}>
                Barcode
              </label>
              <input
                type="text"
                id={`barcode-${product.id}`}
                className={styles.input}
                placeholder="Enter barcode (optional)"
                value={product.barcode}
                onChange={(e) =>
                  onChange(product.id, 'barcode', e.target.value)
                }
                disabled={isLoading}
              />
            </div>
            <div className={styles.formGroup}>
              <label
                htmlFor={`companyName-${product.id}`}
                className={styles.label}
              >
                Company *
              </label>
              <input
                type="text"
                id={`companyName-${product.id}`}
                className={styles.input}
                placeholder="Enter company name"
                value={product.companyName}
                onChange={(e) =>
                  onChange(product.id, 'companyName', e.target.value)
                }
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor={`name-${product.id}`} className={styles.label}>
                Product Name *
              </label>
              <input
                type="text"
                id={`name-${product.id}`}
                className={styles.input}
                placeholder="Enter product name"
                value={product.name}
                onChange={(e) => onChange(product.id, 'name', e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor={`count-${product.id}`} className={styles.label}>
                Count *
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                id={`count-${product.id}`}
                className={styles.input}
                placeholder="0"
                value={product.count === 0 ? '' : product.count}
                onChange={(e) =>
                  onIntegerChange(product.id, 'count', e.target.value)
                }
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label
                htmlFor={`conversionFactor-${product.id}`}
                className={styles.label}
              >
                Packaging Details
              </label>
              <div className={styles.factorInputWrap}>
                <span className={styles.factorPrefix} aria-hidden="true">
                  1 *{' '}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  id={`conversionFactor-${product.id}`}
                  className={styles.factorInput}
                  placeholder="e.g. 10"
                  value={
                    product.conversionFactor && product.conversionFactor > 0
                      ? product.conversionFactor
                      : ''
                  }
                  onChange={(e) =>
                    onDecimalChange(
                      product.id,
                      'conversionFactor',
                      e.target.value
                    )
                  }
                  disabled={isLoading}
                />
              </div>
              <span className={styles.unitHint}>
                1 sale unit = factor × base unit
              </span>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label
                htmlFor={`expiryDate-${product.id}`}
                className={styles.label}
              >
                Expiry Date *
              </label>
              <input
                type="date"
                id={`expiryDate-${product.id}`}
                className={styles.input}
                value={
                  product.expiryDate &&
                  !isNaN(new Date(product.expiryDate).getTime())
                    ? new Date(product.expiryDate).toISOString().split('T')[0]
                    : ''
                }
                onChange={(e) => {
                  const dateValue = e.target.value;
                  if (dateValue) {
                    const isoDate = `${dateValue}T00:00:00Z`;
                    onChange(product.id, 'expiryDate', isoDate);
                  } else {
                    onChange(product.id, 'expiryDate', '');
                  }
                }}
                required
                disabled={isLoading}
              />
            </div>
            <div className={styles.formGroup}>
              <label
                htmlFor={`location-${product.id}`}
                className={styles.label}
              >
                Inventory Location *
              </label>
              <input
                type="text"
                id={`location-${product.id}`}
                className={styles.input}
                placeholder="Enter inventory location"
                value={product.location}
                onChange={(e) =>
                  onChange(product.id, 'location', e.target.value)
                }
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Additional Product Information */}
          {billingMode !== 'BASIC' && (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor={`hsn-${product.id}`} className={styles.label}>
                  HSN Code
                </label>
                <input
                  type="text"
                  id={`hsn-${product.id}`}
                  className={styles.input}
                  placeholder="Enter the HSN code"
                  value={product.hsn || ''}
                  onChange={(e) => onChange(product.id, 'hsn', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className={styles.formGroup}>
                <label
                  htmlFor={`batchNo-${product.id}`}
                  className={styles.label}
                >
                  Batch Number
                </label>
                <input
                  type="text"
                  id={`batchNo-${product.id}`}
                  className={styles.input}
                  placeholder="Enter the batch number"
                  value={product.batchNo || ''}
                  onChange={(e) =>
                    onChange(product.id, 'batchNo', e.target.value)
                  }
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label
                htmlFor={`schemeType-${product.id}`}
                className={styles.label}
              >
                Sale scheme/deal type
              </label>
              <select
                id={`schemeType-${product.id}`}
                className={styles.input}
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
              </select>
            </div>
            {(product.schemeType ?? 'FIXED_UNITS') === 'FIXED_UNITS' ? (
              <div className={styles.formGroup}>
                <label
                  htmlFor={`scheme-fixed-${product.id}`}
                  className={styles.label}
                >
                  Pay + free (e.g. 10 + 2)
                </label>
                <input
                  type="text"
                  id={`scheme-fixed-${product.id}`}
                  className={styles.input}
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
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label
                  htmlFor={`schemePercentage-${product.id}`}
                  className={styles.label}
                >
                  Sale Scheme/Deal % *
                </label>
                <input
                  type="number"
                  id={`schemePercentage-${product.id}`}
                  className={styles.input}
                  placeholder="e.g. 10 for 10%"
                  min={0.01}
                  max={100}
                  step={0.01}
                  value={
                    product.schemePercentage != null
                      ? product.schemePercentage
                      : ''
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      onChange(product.id, 'schemePercentage', null);
                    } else {
                      const num = parseFloat(val);
                      if (!isNaN(num) && num > 0 && num <= 100) {
                        onChange(product.id, 'schemePercentage', num);
                      }
                    }
                  }}
                  disabled={isLoading}
                />
              </div>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label
                htmlFor={`saleAdditionalDiscount-${product.id}`}
                className={styles.label}
              >
                Sale add. discount (%)
              </label>
              <input
                type="number"
                id={`saleAdditionalDiscount-${product.id}`}
                className={styles.input}
                placeholder="Enter discount percentage"
                step="0.01"
                min="0"
                max="100"
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
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                      onChange(product.id, 'saleAdditionalDiscount', numValue);
                    }
                  }
                }}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Purchase (from vendor) - for comparison at sale */}
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label
                htmlFor={`purchaseSchemeType-${product.id}`}
                className={styles.label}
              >
                Purchase scheme/deal type
              </label>
              <select
                id={`purchaseSchemeType-${product.id}`}
                className={styles.input}
                value={product.purchaseSchemeType ?? 'FIXED_UNITS'}
                onChange={(e) => {
                  const val = e.target.value as SchemeType;
                  onChange(product.id, 'purchaseSchemeType', val);
                  if (val === 'PERCENTAGE') {
                    onChange(product.id, 'purchaseSchemePayFor', null);
                    onChange(product.id, 'purchaseSchemeFree', null);
                  } else {
                    onChange(product.id, 'purchaseSchemePercentage', null);
                  }
                }}
                disabled={isLoading}
              >
                <option value="FIXED_UNITS">Free units</option>
                <option value="PERCENTAGE">Percentage</option>
              </select>
            </div>
            {(product.purchaseSchemeType ?? 'FIXED_UNITS') === 'FIXED_UNITS' ? (
              <div className={styles.formGroup}>
                <label
                  htmlFor={`purchase-scheme-fixed-${product.id}`}
                  className={styles.label}
                >
                  Purchase scheme/deal (e.g. 10 + 2)
                </label>
                <input
                  type="text"
                  id={`purchase-scheme-fixed-${product.id}`}
                  className={styles.input}
                  placeholder="Optional, from vendor"
                  value={purchaseSchemeFixedDraft}
                  onChange={(e) => setPurchaseSchemeFixedDraft(e.target.value)}
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
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label
                  htmlFor={`purchaseSchemePercentage-${product.id}`}
                  className={styles.label}
                >
                  Purchase scheme %
                </label>
                <input
                  type="number"
                  id={`purchaseSchemePercentage-${product.id}`}
                  className={styles.input}
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
              </div>
            )}
            <div className={styles.formGroup}>
              <label
                htmlFor={`purchaseAdditionalDiscount-${product.id}`}
                className={styles.label}
              >
                Purchase add. discount (%)
              </label>
              <input
                type="number"
                id={`purchaseAdditionalDiscount-${product.id}`}
                className={styles.input}
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
                      onChange(
                        product.id,
                        'purchaseAdditionalDiscount',
                        numValue
                      );
                    }
                  }
                }}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label
                htmlFor={`itemType-${product.id}`}
                className={styles.label}
              >
                Item Type
              </label>
              <select
                id={`itemType-${product.id}`}
                className={styles.input}
                value={product.itemType ?? 'NORMAL'}
                onChange={(e) => {
                  const val = e.target.value as ItemType | '';
                  const itemType = val === '' ? 'NORMAL' : (val as ItemType);
                  onChange(product.id, 'itemType', itemType);
                  if (itemType !== 'DEGREE') {
                    onChange(product.id, 'itemTypeDegree', undefined);
                  }
                }}
                disabled={isLoading}
              >
                <option value="NORMAL">Normal</option>
                <option value="COSTLY">Costly</option>
                <option value="DEGREE">Temperature for the item</option>
              </select>
            </div>
          </div>

          {product.itemType === 'DEGREE' ? (
            <>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label
                    htmlFor={`itemTypeDegree-${product.id}`}
                    className={styles.label}
                  >
                    Temperature / Degree *
                  </label>
                  <input
                    type="number"
                    id={`itemTypeDegree-${product.id}`}
                    className={styles.input}
                    placeholder="e.g. 8, 24"
                    min={1}
                    step={1}
                    value={
                      product.itemTypeDegree != null
                        ? product.itemTypeDegree
                        : ''
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        onChange(product.id, 'itemTypeDegree', undefined);
                      } else {
                        const num = parseInt(val, 10);
                        if (!isNaN(num) && num > 0 && Number.isInteger(num)) {
                          onChange(product.id, 'itemTypeDegree', num);
                        }
                      }
                    }}
                    disabled={isLoading}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label
                    htmlFor={`purchaseDate-${product.id}`}
                    className={styles.label}
                  >
                    Purchase date
                  </label>
                  <input
                    type="date"
                    id={`purchaseDate-${product.id}`}
                    className={styles.input}
                    min={(() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 30);
                      return d.toISOString().split('T')[0];
                    })()}
                    max={(() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 30);
                      return d.toISOString().split('T')[0];
                    })()}
                    value={
                      product.purchaseDate
                        ? new Date(product.purchaseDate)
                            .toISOString()
                            .split('T')[0]
                        : ''
                    }
                    onChange={(e) => {
                      const dateValue = e.target.value;
                      if (dateValue) {
                        onChange(
                          product.id,
                          'purchaseDate',
                          `${dateValue}T00:00:00.000Z`
                        );
                      } else {
                        onChange(product.id, 'purchaseDate', undefined);
                      }
                    }}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label
                    htmlFor={`discountApplicable-${product.id}`}
                    className={styles.label}
                  >
                    Discount applicable
                  </label>
                  <select
                    id={`discountApplicable-${product.id}`}
                    className={styles.input}
                    value={product.discountApplicable ?? ''}
                    onChange={(e) => {
                      const val = e.target.value as DiscountApplicable | '';
                      onChange(
                        product.id,
                        'discountApplicable',
                        val === '' ? undefined : (val as DiscountApplicable)
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
                  </select>
                </div>
                <div className={styles.formGroup} aria-hidden="true">
                  <span style={{ visibility: 'hidden', userSelect: 'none' }}>
                    .
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label
                  htmlFor={`discountApplicable-${product.id}`}
                  className={styles.label}
                >
                  Discount applicable
                </label>
                <select
                  id={`discountApplicable-${product.id}`}
                  className={styles.input}
                  value={product.discountApplicable ?? ''}
                  onChange={(e) => {
                    const val = e.target.value as DiscountApplicable | '';
                    onChange(
                      product.id,
                      'discountApplicable',
                      val === '' ? undefined : (val as DiscountApplicable)
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
                </select>
              </div>
              <div className={styles.formGroup}>
                <label
                  htmlFor={`purchaseDate-${product.id}`}
                  className={styles.label}
                >
                  Purchase date
                </label>
                <input
                  type="date"
                  id={`purchaseDate-${product.id}`}
                  className={styles.input}
                  min={(() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 30);
                    return d.toISOString().split('T')[0];
                  })()}
                  max={(() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 30);
                    return d.toISOString().split('T')[0];
                  })()}
                  value={
                    product.purchaseDate
                      ? new Date(product.purchaseDate)
                          .toISOString()
                          .split('T')[0]
                      : ''
                  }
                  onChange={(e) => {
                    const dateValue = e.target.value;
                    if (dateValue) {
                      onChange(
                        product.id,
                        'purchaseDate',
                        `${dateValue}T00:00:00.000Z`
                      );
                    } else {
                      onChange(product.id, 'purchaseDate', undefined);
                    }
                  }}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label
                htmlFor={`priceToRetail-${product.id}`}
                className={styles.label}
              >
                Price to Retailer (PTR) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                id={`priceToRetail-${product.id}`}
                className={styles.input}
                placeholder="0.00"
                value={product.priceToRetail === 0 ? '' : product.priceToRetail}
                onChange={(e) =>
                  onDecimalChange(product.id, 'priceToRetail', e.target.value)
                }
                required
                disabled={isLoading}
              />
            </div>
            <div className={styles.formGroup}>
              <label
                htmlFor={`costPrice-${product.id}`}
                className={styles.label}
              >
                Price from stockist (PTS) *
              </label>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                id={`costPrice-${product.id}`}
                className={styles.input}
                placeholder="0.00"
                value={product.costPrice === 0 ? '' : product.costPrice}
                onChange={(e) =>
                  onDecimalChange(product.id, 'costPrice', e.target.value)
                }
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label
                htmlFor={`maximumRetailPrice-${product.id}`}
                className={styles.label}
              >
                MRP *
              </label>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                id={`maximumRetailPrice-${product.id}`}
                className={styles.input}
                placeholder="0.00"
                value={
                  product.maximumRetailPrice === 0
                    ? ''
                    : product.maximumRetailPrice
                }
                onChange={(e) =>
                  onDecimalChange(
                    product.id,
                    'maximumRetailPrice',
                    e.target.value
                  )
                }
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {billingMode === 'REGULAR' && (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor={`cgst-${product.id}`} className={styles.label}>
                  CGST (%)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  id={`cgst-${product.id}`}
                  className={styles.input}
                  placeholder="Leave empty for shop default"
                  value={product.cgst || ''}
                  onChange={(e) => onChange(product.id, 'cgst', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor={`sgst-${product.id}`} className={styles.label}>
                  SGST (%)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*\.?[0-9]*"
                  id={`sgst-${product.id}`}
                  className={styles.input}
                  placeholder="Leave empty for shop default"
                  value={product.sgst || ''}
                  onChange={(e) => onChange(product.id, 'sgst', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {/* Rates (optional) - custom pricing tiers */}
          <div className={styles.ratesSection}>
            <div className={styles.ratesHeader}>
              <label className={styles.label}>Rates (optional)</label>
              <button
                type="button"
                onClick={() =>
                  onChange(product.id, 'rates', [
                    ...(product.rates ?? []),
                    { name: '', price: 0 },
                  ])
                }
                className={styles.addRateBtn}
                disabled={isLoading}
              >
                + Add rate
              </button>
            </div>
            <span className={styles.unitHint}>
              Custom rate tiers (e.g. Rate-A, Rate-B). Default rate selects
              which price to use for sales.
            </span>
            {(product.rates ?? []).map((rate, i) => (
              <div key={i} className={styles.rateRow}>
                <input
                  type="text"
                  value={rate.name}
                  onChange={(e) => {
                    const next = [...(product.rates ?? [])];
                    next[i] = { ...next[i], name: e.target.value };
                    onChange(product.id, 'rates', next);
                  }}
                  className={styles.rateNameInput}
                  placeholder="Rate name"
                  disabled={isLoading}
                />
                <input
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
                  className={styles.ratePriceInput}
                  placeholder="Price"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = (product.rates ?? []).filter(
                      (_, j) => j !== i
                    );
                    onChange(product.id, 'rates', next);
                  }}
                  className={styles.removeRateBtn}
                  aria-label="Remove rate"
                  disabled={isLoading}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className={styles.formGroup}>
            <label
              htmlFor={`defaultRate-${product.id}`}
              className={styles.label}
            >
              Default rate (optional)
            </label>
            <select
              id={`defaultRate-${product.id}`}
              value={product.defaultRate ?? ''}
              onChange={(e) =>
                onChange(product.id, 'defaultRate', e.target.value)
              }
              className={styles.input}
              disabled={isLoading}
            >
              <option value="">— None —</option>
              <option value="priceToRetail">priceToRetail (PTR)</option>
              <option value="maximumRetailPrice">
                maximumRetailPrice (MRP)
              </option>
              <option value="costPrice">costPrice (PTS)</option>
              {(product.rates ?? [])
                .filter((r) => r.name.trim())
                .map((r) => (
                  <option key={r.name} value={r.name}>
                    {r.name}
                  </option>
                ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label
              htmlFor={`description-${product.id}`}
              className={styles.label}
            >
              Description
            </label>
            <textarea
              id={`description-${product.id}`}
              className={styles.textarea}
              placeholder="Enter product description (optional)"
              value={product.description || ''}
              onChange={(e) =>
                onChange(product.id, 'description', e.target.value)
              }
              disabled={isLoading}
              rows={3}
            />
          </div>

          {/* Reminder Section */}
          <div className={styles.reminderSection}>
            <h4 className={styles.subsectionTitle}>Expiry Reminder Settings</h4>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label
                  htmlFor={`reminderAt-${product.id}`}
                  className={styles.label}
                >
                  Expiry Reminder Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  id={`reminderAt-${product.id}`}
                  className={styles.input}
                  value={
                    product.reminderAt
                      ? isoToLocalDateTime(product.reminderAt)
                      : ''
                  }
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
                <p className={styles.helperText}>
                  Set a reminder date to be notified before this inventory item
                  expires
                </p>
              </div>
            </div>

            <CustomRemindersSection
              reminders={product.customReminders || []}
              onChange={onCustomRemindersChange}
              disabled={isLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
