import { useState, FormEvent, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import { inventoryApi, vendorsApi, uploadApi, usersApi } from '@inventory-platform/api';
import type {
  CreateInventoryDto,
  CustomReminderInput,
  LinkableUser,
  Vendor,
  CreateVendorDto,
  VendorBusinessType,
  BulkCreateInventoryDto,
  ParseInvoiceItem,
  PricingRate,
  UploadStatus,
  ItemType,
  DiscountApplicable,
  SchemeType,
  BillingMode,
  ShopMembership,
} from '@inventory-platform/types';
import { CustomRemindersSection } from '@inventory-platform/ui';
import { useNotify } from '@inventory-platform/store';
import styles from './dashboard.product-registration.module.css';

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
  additionalDiscount?: number | null;
  conversionUnit?: string;
  conversionFactor?: number;
  enableAdditionalSaleUnit?: boolean;
  rates?: PricingRate[];
  defaultRate?: string;
}

export default function ProductRegistrationPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { success: notifySuccess, error: notifyError } = useNotify;

  // QR Code Upload state
  const [showQrModal, setShowQrModal] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);
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
  const [userSearchMessage, setUserSearchMessage] = useState<string | null>(null);

  const [lotId, setLotId] = useState('');
  const [lotIdSearchQuery, setLotIdSearchQuery] = useState('');
  const [lotIdSearchResults, setLotIdSearchResults] = useState<
    { lotId: string; createdAt: string }[]
  >([]);
  const [isSearchingLots, setIsSearchingLots] = useState(false);
  const [showLotIdDropdown, setShowLotIdDropdown] = useState(false);

  // Take on credit (buyer owes vendor) - when true, ledger entry is created
  const [onCredit, setOnCredit] = useState<boolean>(false);
  // When vendor is StockKart user: assign credit to their shop so they can see it
  const [vendorShops, setVendorShops] = useState<ShopMembership[]>([]);
  const [selectedVendorShopId, setSelectedVendorShopId] = useState<string>('');
  const [isLoadingVendorShops, setIsLoadingVendorShops] = useState(false);

  // Multiple products state
  const [products, setProducts] = useState<ProductFormData[]>([]);

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
    additionalDiscount: null,
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
      additionalDiscount: item.additionalDiscount ?? null,
      billingMode,
      itemType: item.itemType ?? 'NORMAL',
      itemTypeDegree: item.itemTypeDegree,
      discountApplicable: item.discountApplicable,
      purchaseDate: item.purchaseDate || undefined,
      baseUnit: item.baseUnit?.trim() ? item.baseUnit.trim().toUpperCase() : 'BASE UNIT',
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
            if (parsedResponse && parsedResponse.items && parsedResponse.items.length > 0) {
              const parsedProducts = parsedResponse.items.map(transformParsedItemToProduct);
              setProducts(parsedProducts);
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
        } else if (statusResponse.status === 'FAILED' || statusResponse.status === 'EXPIRED') {
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

        const normalizedConversionFactor = Number(product.conversionFactor) || 0;
        if (
          normalizedConversionFactor < 0 ||
          !Number.isFinite(normalizedConversionFactor)
        ) {
          notifyError(
            `Product "${product.name || 'Unnamed'}": packaging details must be a valid positive number`
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
            `Product "${product.name || 'Unnamed'}": SGST/CGST must not be provided when billingMode is BASIC`
          );
          setIsLoading(false);
          return;
        }

        if (product.purchaseDate) {
          const purchase = new Date(product.purchaseDate);
          const now = new Date();
          const daysPast = (now.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24);
          const daysFuture = (purchase.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          if (daysPast > 30) {
            notifyError(
              `Product "${product.name || 'Unnamed'}": Purchase date must not be older than 30 days`
            );
            setIsLoading(false);
            return;
          }
          if (daysFuture > 30) {
            notifyError(
              `Product "${product.name || 'Unnamed'}": Purchase date must not be more than 30 days in the future`
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
          ...(product.barcode?.trim() ? { barcode: product.barcode.trim() } : {}),
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
            ? product.expiryDate.includes('T') && product.expiryDate.includes('Z')
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
                  schemeType: (product.schemeType ?? 'FIXED_UNITS') as 'FIXED_UNITS',
                  scheme: product.scheme ?? null,
                }),
          billingMode: billingMode as BillingMode,
          ...(billingMode !== 'BASIC' &&
          product.sgst &&
          product.sgst.trim()
            ? { sgst: product.sgst.trim() }
            : {}),
          ...(billingMode !== 'BASIC' &&
          product.cgst &&
          product.cgst.trim()
            ? { cgst: product.cgst.trim() }
            : {}),
          ...(product.additionalDiscount !== null &&
          product.additionalDiscount !== undefined
            ? { additionalDiscount: product.additionalDiscount }
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
                    : `${String(product.purchaseDate).trim().slice(0, 10)}T00:00:00Z`,
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

      // Create bulk request
      const bulkData: BulkCreateInventoryDto = {
        vendorId: selectedVendor.vendorId,
        onCredit,
        ...(lotId && { lotId }),
        ...(onCredit &&
          selectedVendor.userId &&
          selectedVendorShopId && { vendorShopId: selectedVendorShopId }),
        items,
      };

      // Call bulk API
      try {
        const response = await inventoryApi.createBulk(bulkData);

        // The response should be BulkCreateInventoryResponse
        // Handle cases where the response structure might vary
        const createdCount =
          response?.createdCount ?? response?.items?.length ?? 0;
        const lotId = response?.lotId;
        const items = response?.items ?? [];

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
            } product(s)! ${lotId ? `Lot ID: ${lotId}. ` : ''}${
              itemDetails ? `Details: ${itemDetails}` : ''
            }`
          );

          // Clear form after 5 seconds
          setTimeout(() => {
            setProducts([]);
            handleClearVendor();
            setLotId('');
            setLotIdSearchQuery('');
            setLotIdSearchResults([]);
            setSuccess(null);
          }, 5000);
        } else if (response) {
          // If response exists but no createdCount/items, still consider it success
          // (API might return success without detailed counts)
          notifySuccess(
            `Successfully registered ${products.length} product(s)! ${
              lotId ? `Lot ID: ${lotId}. ` : ''
            }`
          );
          setTimeout(() => {
            setProducts([]);
            handleClearVendor();
            setLotId('');
            setLotIdSearchQuery('');
            setLotIdSearchResults([]);
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

  const handleLotIdSearch = async () => {
    if (!lotIdSearchQuery.trim()) {
      return;
    }

    setIsSearchingLots(true);
    setError(null);
    try {
      const response = await inventoryApi.searchLots(lotIdSearchQuery.trim());
      const lots = response.data || [];
      setLotIdSearchResults(
        lots.map((lot) => ({ lotId: lot.lotId, createdAt: lot.createdAt }))
      );
      setShowLotIdDropdown(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to search lots';
      notifyError(errorMessage);
      setLotIdSearchResults([]);
    } finally {
      setIsSearchingLots(false);
    }
  };

  const handleSelectLotId = (selectedLotId: string) => {
    setLotId(selectedLotId);
    setLotIdSearchQuery(selectedLotId);
    setShowLotIdDropdown(false);
    setLotIdSearchResults([]);
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
          Register multiple products at once with shared vendor and lot
          information
        </p>
      </div>

      <div className={styles.formContainer}>
        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.uploadSection}>
            <div className={styles.uploadHeader}>
              <h3 className={styles.sectionTitle}>Upload Invoice Image (Optional)</h3>
              <ul className={styles.helperText}>
                <li>Upload invoice image to auto-parse product details</li>
                <li>Review and edit parsed products before bulk save</li>
              </ul>
            </div>
            <div className={styles.uploadOptionsHeader}>
              <span className={styles.uploadOptionsLabel}>Choose upload method:</span>
            </div>
            <div className={styles.uploadOptionsGrid}>
              <button
                type="button"
                className={styles.qrUploadBtn}
                onClick={handleCreateQrCode}
                disabled={isUploading || isLoading || isPolling}
              >
                <div className={styles.qrBtnIcon}>
                  <span role="img" aria-label="QR Code icon">📱</span>
                </div>
                <div className={styles.qrBtnContent}>
                  <span className={styles.qrBtnTitle}>Upload via QR Code</span>
                  <span className={styles.qrBtnSubtitle}>Use mobile device to scan & upload</span>
                </div>
              </button>
              <div className={styles.uploadOptionsOr}>
                <div className={styles.uploadOptionsOrLine}></div>
                <span className={styles.uploadOptionsOrText}>OR</span>
                <div className={styles.uploadOptionsOrLine}></div>
              </div>
              <div className={styles.uploadContainer}>
                <div className={styles.uploadOptionLabel}>
                  <span className={styles.uploadOptionTitle}>Upload from this device</span>
                  <span className={styles.uploadOptionSubtitle}>Choose image file from computer</span>
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
                    <div className={styles.progressText}>{uploadProgress}</div>
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

          {/* Shared Vendor and Lot ID Section */}
          <div className={styles.sharedSection}>
            <h3 className={styles.sectionTitle}>Shared Information</h3>
            <div className={styles.sharedTopRow}>
              <span className={styles.sharedHint}>Applies to all products.</span>
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
            <div className={styles.sharedInfoGrid}>
              {/* Lot ID */}
              <div className={styles.formGroup}>
                <label htmlFor="lotId" className={styles.label}>
                  Lot ID (Optional)
                </label>
                <div className={styles.sharedFieldWrap}>
                  <div className={styles.sharedInputRow}>
                    <input
                      type="text"
                      id="lotId"
                      className={`${styles.input} ${styles.sharedInputGrow}`}
                      placeholder="Enter or search lot ID"
                      value={lotIdSearchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setLotIdSearchQuery(e.target.value);
                        setLotId(e.target.value);
                        setShowLotIdDropdown(false);
                      }}
                      disabled={isLoading || isSearchingLots}
                    />
                    <button
                      type="button"
                      className={styles.searchBtn}
                      onClick={handleLotIdSearch}
                      disabled={
                        isLoading || isSearchingLots || !lotIdSearchQuery.trim()
                      }
                    >
                      {isSearchingLots ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                  {showLotIdDropdown && lotIdSearchResults.length > 0 && (
                    <div className={styles.dropdown}>
                      {lotIdSearchResults.map((lot) => {
                        const formatDate = (dateString: string) => {
                          try {
                            const date = new Date(dateString);
                            return date.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            });
                          } catch {
                            return dateString;
                          }
                        };
                        return (
                          <div
                            key={lot.lotId}
                            className={styles.dropdownItem}
                            onClick={() => handleSelectLotId(lot.lotId)}
                          >
                            <div className={styles.dropdownItemTitle}>{lot.lotId}</div>
                            <div className={styles.dropdownItemSub}>
                              {formatDate(lot.createdAt)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
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
                      <div className={styles.formGroup} style={{ marginTop: 12 }}>
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
                            — Not assigned (vendor won&apos;t see in their shop) —
                          </option>
                          {vendorShops.map((s) => (
                            <option key={s.shopId} value={s.shopId}>
                              {s.shopName}
                            </option>
                          ))}
                        </select>
                        <small style={{ color: 'var(--text-secondary)', marginTop: 4, display: 'block' }}>
                          When assigned, the vendor can see this pending amount when they log into that shop.
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
            </div>
          </div>

          <div className={styles.separator}>
            <div className={styles.separatorLine}></div>
            <div className={styles.separatorContent}>
              <span className={styles.separatorIcon} role="img" aria-label="Sparkle icon">✨</span>
              <span className={styles.separatorText}>Or manually add products below</span>
            </div>
            <div className={styles.separatorLine}></div>
          </div>

          {/* Products Section */}
          <div className={styles.productsSection} ref={productsSectionRef}>
            {showReviewBanner && (
              <div className={styles.reviewBanner}>
                <div className={styles.reviewBannerContent}>
                  <span className={styles.reviewBannerIcon} role="img" aria-label="Clipboard icon">📋</span>
                  <div className={styles.reviewBannerText}>
                    <strong>Review Required:</strong> Please review the {reviewBannerItemsCount} item(s) below and fill in any missing information before submitting.
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
              <button
                type="button"
                className={styles.addProductBtn}
                onClick={handleAddProduct}
                disabled={isLoading}
              >
                + Add Product
              </button>
            </div>

            {products.length === 0 ? (
              <div className={styles.emptyState}>
                <p>
                  No products added yet. Click "Add Product" to get started.
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
                <label className={styles.label}>
                  Link to registered user
                </label>
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
        <div
          className={styles.modalOverlay}
          onClick={handleCloseQrModal}
        >
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

  const [schemeFixedDraft, setSchemeFixedDraft] = useState('');
  const [schemeFixedFocused, setSchemeFixedFocused] = useState(false);

  useEffect(() => {
    if (!schemeFixedFocused) setSchemeFixedDraft(formatSchemeFixed(product));
  }, [product.id, product.schemePayFor, product.schemeFree, product.scheme, schemeFixedFocused]);

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
                    onDecimalChange(product.id, 'conversionFactor', e.target.value)
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
                  product.expiryDate
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
                <label htmlFor={`batchNo-${product.id}`} className={styles.label}>
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
                Scheme type
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
                  Scheme % *
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
                      if (
                        !isNaN(num) &&
                        num > 0 &&
                        num <= 100
                      ) {
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
                htmlFor={`additionalDiscount-${product.id}`}
                className={styles.label}
              >
                Additional Discount (%)
              </label>
              <input
                type="number"
                id={`additionalDiscount-${product.id}`}
                className={styles.input}
                placeholder="Enter discount percentage"
                step="0.01"
                min="0"
                max="100"
                value={
                  product.additionalDiscount === null ||
                  product.additionalDiscount === undefined
                    ? ''
                    : product.additionalDiscount
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    onChange(product.id, 'additionalDiscount', null);
                  } else {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
                      onChange(product.id, 'additionalDiscount', numValue);
                    }
                  }
                }}
                disabled={isLoading}
              />
            </div>
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
                        if (
                          !isNaN(num) &&
                          num > 0 &&
                          Number.isInteger(num)
                        ) {
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
                    <option value="SCHEME">Scheme applicable</option>
                    <option value="DISCOUNT_AND_SCHEME">
                      Both discount and scheme applicable
                    </option>
                  </select>
                </div>
                <div className={styles.formGroup} aria-hidden="true">
                  <span style={{ visibility: 'hidden', userSelect: 'none' }}>.</span>
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
                  <option value="SCHEME">Scheme applicable</option>
                  <option value="DISCOUNT_AND_SCHEME">
                    Both discount and scheme applicable
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
              Custom rate tiers (e.g. Rate-A, Rate-B). Default rate selects which
              price to use for sales.
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
                    const next = (product.rates ?? []).filter((_, j) => j !== i);
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
