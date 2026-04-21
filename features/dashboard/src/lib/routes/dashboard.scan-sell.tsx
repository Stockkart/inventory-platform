import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  ChangeEvent,
} from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import {
  inventoryApi,
  cartApi,
  customersApi,
  usersApi,
  pricingApi,
} from '@inventory-platform/api';
import type {
  AvailableUnit,
  BillingMode,
  InventoryItem,
  CartResponse,
  CheckoutItemResponse,
  PricingResponse,
  CustomerResponse,
} from '@inventory-platform/types';
import styles from './dashboard.scan-sell.module.css';
import { useNotify } from '@inventory-platform/store';
import {
  isScanSellHidePurchaseKey,
  shouldSkipScanSellHidePurchaseKey,
} from '@inventory-platform/ui';

export function meta() {
  return [
    { title: 'Scan and Sell - StockKart' },
    { name: 'description', content: 'Speed up sales with barcode scanning' },
  ];
}

type SchemeTypeCart = 'FIXED_UNITS' | 'PERCENTAGE';

/** Rate option for the price selector: label + price */
interface RateOption {
  label: string;
  price: number;
}

/** Build available rate options from inventory item and/or pricing API response */
function getRateOptions(
  item: InventoryItem,
  pricing?: PricingResponse | null
): RateOption[] {
  const opts: RateOption[] = [];
  const mrp = pricing?.maximumRetailPrice ?? item.maximumRetailPrice;
  const ptr = pricing?.priceToRetail ?? item.priceToRetail;
  const cost = pricing?.costPrice ?? item.costPrice;
  const rates = pricing?.rates ?? item.rates ?? [];
  if (mrp != null) opts.push({ label: 'MRP', price: mrp });
  if (ptr != null) opts.push({ label: 'PTR', price: ptr });
  if (cost != null && cost > 0) opts.push({ label: 'Cost', price: cost });
  rates.forEach((r) => {
    if (r?.name?.trim() && r?.price != null) {
      opts.push({ label: r.name.trim(), price: r.price });
    }
  });
  return opts;
}

interface CartItem {
  inventoryItem: InventoryItem;
  unit: string;
  baseQuantity: number;
  unitFactor: number;
  availableUnits: AvailableUnit[];
  quantity: number;
  price: number;
  schemeType?: SchemeTypeCart | null;
  schemePayFor?: number | null;
  schemeFree?: number | null;
  schemePercentage?: number | null;
}

/** Format purchase scheme from inventory (registration) for read-only display. Uses purchase* when present (from API). */
function formatPurchaseSchemeLabel(inv: InventoryItem): string {
  const schemeType = inv.purchaseSchemeType ?? inv.schemeType;
  const schemePercentage = inv.purchaseSchemePercentage ?? inv.schemePercentage;
  const schemePayFor = inv.purchaseSchemePayFor ?? inv.schemePayFor;
  const schemeFree = inv.purchaseSchemeFree ?? inv.schemeFree;
  if (schemeType === 'PERCENTAGE' && schemePercentage != null) {
    return `${schemePercentage}%`;
  }
  if (schemePayFor != null || schemeFree != null) {
    return `${schemePayFor ?? 0} + ${schemeFree ?? 0}`;
  }
  return '—';
}

/** Get purchase additional discount from inventory (registration). Uses purchase* when present. */
function getPurchaseAdditionalDiscount(inv: InventoryItem): number | null {
  return inv.purchaseAdditionalDiscount ?? inv.saleAdditionalDiscount ?? null;
}

function CartQuantityInput({
  value,
  onCommit,
  disabled,
}: {
  value: number;
  onCommit: (newQty: number) => Promise<void>;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(value.toString());

  useEffect(() => {
    setDraft(value.toString());
  }, [value]);

  const commit = async () => {
    const qty = Number(draft);

    if (!qty || qty <= 0 || qty === value) {
      setDraft(value.toString());
      return;
    }

    try {
      await onCommit(qty);
    } catch {
      setDraft(value.toString());
    }
  };

  return (
    <input
      type="number"
      className={styles.qtyInput}
      value={draft}
      min={1}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit();
          e.currentTarget.blur();
        }
      }}
      onFocus={(e) => e.currentTarget.select()}
    />
  );
}

function CartSellingPriceInput({
  id,
  value,
  onCommit,
  disabled,
}: {
  id?: string;
  value: number;
  onCommit: (value: number) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(value.toFixed(2));

  useEffect(() => {
    setDraft(value.toFixed(2));
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    const num = parseFloat(trimmed);
    if (isNaN(num) || num < 0) {
      setDraft(value.toFixed(2));
      return;
    }
    onCommit(num);
  };

  return (
    <input
      id={id}
      type="number"
      className={styles.itemSellingPriceInput}
      value={draft}
      min={0}
      step={0.01}
      disabled={disabled}
      onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit();
          e.currentTarget.blur();
        }
      }}
    />
  );
}

function CartAdditionalDiscountInput({
  id,
  value,
  onCommit,
  disabled,
}: {
  id?: string;
  value: number | null;
  onCommit: (value: number | null) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(
    value !== null && value !== undefined ? value.toString() : ''
  );

  useEffect(() => {
    const next = value !== null && value !== undefined ? value.toString() : '';
    setDraft(next);
  }, [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      onCommit(null);
      return;
    }
    const num = parseFloat(trimmed);
    // Allow -100 to 100: negative = markup (profit), positive = discount
    if (isNaN(num) || num < -100 || num > 100) {
      setDraft(value !== null && value !== undefined ? value.toString() : '');
      return;
    }
    onCommit(num);
  };

  return (
    <input
      id={id}
      type="number"
      className={styles.itemAdditionalInput}
      value={draft}
      placeholder="0"
      min={-100}
      max={100}
      step={0.01}
      disabled={disabled}
      onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit();
          e.currentTarget.blur();
        }
      }}
    />
  );
}

function CartSchemeInput({
  id,
  schemeType,
  payFor,
  free,
  percentage,
  onCommitUnits,
  onCommitPercentage,
  disabled,
}: {
  id?: string;
  schemeType: SchemeTypeCart | null;
  payFor: number | null;
  free: number | null;
  percentage: number | null;
  onCommitUnits: (payFor: number | null, free: number | null) => void;
  onCommitPercentage: (percentage: number | null) => void;
  disabled: boolean;
}) {
  const formatFromProps = () => {
    // Use schemeType first to decide what to show (API can return both values)
    if (
      schemeType === 'PERCENTAGE' &&
      percentage != null &&
      percentage !== undefined
    ) {
      return `${percentage}%`;
    }
    if (
      (schemeType === 'FIXED_UNITS' || schemeType == null) &&
      (payFor != null || free != null)
    ) {
      const payStr = (payFor ?? 0).toString();
      const freeStr = (free ?? 0).toString();
      return `${payStr} + ${freeStr}`;
    }
    return '';
  };

  const [draft, setDraft] = useState(formatFromProps());
  const skipNextBlurCommitRef = useRef(false);

  useEffect(() => {
    setDraft(formatFromProps());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemeType, payFor, free, percentage]);

  const handleChange = (value: string) => {
    // Allow only digits, spaces, '+', and '%'
    if (!/^[0-9+%\s]*$/.test(value)) {
      return;
    }
    const plusCount = (value.match(/\+/g) ?? []).length;
    const percCount = (value.match(/%/g) ?? []).length;
    // At most one '+' and at most one '%'
    if (plusCount > 1 || percCount > 1) {
      return;
    }
    // Do not allow mixing '+' and '%'
    if (plusCount > 0 && percCount > 0) {
      return;
    }
    setDraft(value);
  };

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === '') {
      onCommitUnits(null, null);
      onCommitPercentage(null);
      return;
    }

    // Percentage format e.g. "10%" or "10 %"
    if (trimmed.includes('%')) {
      const numStr = trimmed.replace('%', '').trim();
      const num = parseFloat(numStr);
      if (!isNaN(num) && num >= 0 && num <= 100) {
        onCommitPercentage(num);
        return;
      }
      setDraft(formatFromProps());
      return;
    }

    // Fixed units format e.g. "10 + 1" or "10+1"
    const plusIndex = trimmed.indexOf('+');
    if (plusIndex !== -1) {
      const left = trimmed.slice(0, plusIndex).trim();
      const right = trimmed.slice(plusIndex + 1).trim();
      const pay = parseInt(left, 10);
      const freeVal = parseInt(right, 10);
      if (
        !isNaN(pay) &&
        !isNaN(freeVal) &&
        pay >= 0 &&
        freeVal >= 0 &&
        Number.isInteger(pay) &&
        Number.isInteger(freeVal)
      ) {
        onCommitUnits(pay, freeVal);
        return;
      }
      setDraft(formatFromProps());
      return;
    }

    // Plain number: treat as percentage (e.g. 0, 5, 10 → schemeType PERCENTAGE, schemePercentage that number)
    const num = parseFloat(trimmed);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      onCommitUnits(null, null);
      onCommitPercentage(num);
      return;
    }

    // Invalid format, reset to last valid representation
    setDraft(formatFromProps());
  };

  return (
    <input
      id={id}
      type="text"
      className={styles.itemAdditionalInput}
      value={draft}
      placeholder="0, 10, 10 + 1 (number = %)"
      disabled={disabled}
      onChange={(e: ChangeEvent<HTMLInputElement>) =>
        handleChange(e.target.value)
      }
      onBlur={() => {
        if (skipNextBlurCommitRef.current) {
          skipNextBlurCommitRef.current = false;
          return;
        }
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          skipNextBlurCommitRef.current = true;
          commit();
          e.currentTarget.blur();
        }
      }}
    />
  );
}

export default function ScanSellPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const scanSellCustomerPrefillRef = useRef<CustomerResponse | null>(null);
  const scanSellCustomerPrefillConsumedRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InventoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [_searchPage, setSearchPage] = useState(0);
  const [searchPageSize, setSearchPageSize] = useState(10);
  const [_searchTotalPages, setSearchTotalPages] = useState(0);
  const [_searchTotalItems, setSearchTotalItems] = useState(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartData, setCartData] = useState<CartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingCart, setIsLoadingCart] = useState(true);
  const [isUpdatingCart, setIsUpdatingCart] = useState(false);
  const cartLoadedRef = useRef(false);
  const isUpdatingRef = useRef(false);
  const syncVersionRef = useRef(0);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isRetailer, setIsRetailer] = useState(false);
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerDlNo, setCustomerDlNo] = useState('');
  const [customerPan, setCustomerPan] = useState('');
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [linkedUser, setLinkedUser] = useState<{
    userId: string;
    email: string;
    name: string;
  } | null>(null);
  const [userSearchMessage, setUserSearchMessage] = useState<string | null>(
    null
  );
  const [isSearchingUser, setIsSearchingUser] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [customerSectionOpen, setCustomerSectionOpen] = useState(false);
  const [additionalDiscountOverrides, setAdditionalDiscountOverrides] =
    useState<Record<string, number | null>>({});
  const [detailModalItem, setDetailModalItem] = useState<CartItem | null>(null);
  const [detailModalFullItem, setDetailModalFullItem] =
    useState<InventoryItem | null>(null);
  const [detailModalFullItemLoading, setDetailModalFullItemLoading] =
    useState(false);
  const [detailModalFullItemError, setDetailModalFullItemError] = useState<
    string | null
  >(null);
  const [cartViewMode, setCartViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('scan-sell-view-mode');
      if (stored === 'list' || stored === 'grid') return stored;
    }
    return 'list';
  });
  /** When true, purchase scheme / purchase add. discount read-only rows are hidden in cart (sale inputs stay). */
  const [hidePurchaseDetailsInSell, setHidePurchaseDetailsInSell] = useState(
    () => {
      if (typeof window === 'undefined') return false;
      return localStorage.getItem('scan-sell-hide-purchase-details') === '1';
    }
  );
  const [pricingCache, setPricingCache] = useState<
    Record<string, PricingResponse>
  >({});
  const [pricingLoading, setPricingLoading] = useState<Record<string, boolean>>(
    {}
  );
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const { error: notifyError } = useNotify;

  useEffect(() => {
    if (!detailModalItem) {
      setDetailModalFullItem(null);
      setDetailModalFullItemLoading(false);
      setDetailModalFullItemError(null);
      return;
    }

    let cancelled = false;
    setDetailModalFullItemLoading(true);
    setDetailModalFullItemError(null);
    inventoryApi
      .getById(detailModalItem.inventoryItem.id)
      .then((inv) => {
        if (cancelled) return;
        setDetailModalFullItem(inv);
      })
      .catch((err) => {
        if (cancelled) return;
        setDetailModalFullItem(null);
        setDetailModalFullItemError(
          err instanceof Error ? err.message : 'Failed to load product details'
        );
      })
      .finally(() => {
        if (cancelled) return;
        setDetailModalFullItemLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [detailModalItem]);

  const [inventoryToPricingId, setInventoryToPricingId] = useState<
    Record<string, string>
  >({});

  const loadPricingOnDropdownClick = useCallback(
    async (pricingId: string | undefined, inventoryId: string) => {
      let idToFetch = pricingId ?? inventoryToPricingId[inventoryId];
      const loadingKey = idToFetch ?? `inv:${inventoryId}`;

      if (!idToFetch) {
        if (pricingLoading[loadingKey]) return;
        setPricingLoading((prev) => ({ ...prev, [loadingKey]: true }));
        try {
          const inv = await inventoryApi.getById(inventoryId);
          const resolvedId = inv.pricingId ?? undefined;
          if (!resolvedId) return;
          idToFetch = resolvedId;
          setInventoryToPricingId((prev) => ({
            ...prev,
            [inventoryId]: resolvedId,
          }));
        } catch (err) {
          notifyError(
            err instanceof Error ? err.message : 'Failed to load inventory'
          );
          return;
        } finally {
          setPricingLoading((prev) => ({ ...prev, [loadingKey]: false }));
        }
      }
      if (!idToFetch) return;
      if (pricingCache[idToFetch] || pricingLoading[idToFetch]) return;

      const finalPricingId = idToFetch;
      setPricingLoading((prev) => ({ ...prev, [finalPricingId]: true }));
      try {
        const pricing = await pricingApi.getById(finalPricingId);
        setPricingCache((prev) => ({ ...prev, [finalPricingId]: pricing }));
      } catch (err) {
        notifyError(
          err instanceof Error ? err.message : 'Failed to load pricing'
        );
      } finally {
        setPricingLoading((prev) => ({ ...prev, [finalPricingId]: false }));
      }
    },
    [pricingCache, pricingLoading, inventoryToPricingId, notifyError]
  );

  // Preload rates when cart items are displayed (before dropdown interaction).
  // Only re-run when cart item IDs change to avoid flicker from effect re-running on load completion.
  const loadPricingRef = useRef(loadPricingOnDropdownClick);
  loadPricingRef.current = loadPricingOnDropdownClick;
  const cartItemIds = cartItems.map((c) => c.inventoryItem.id).join(',');
  useEffect(() => {
    if (!cartItems.length) return;
    cartItems.forEach((item) => {
      const invId = item.inventoryItem.id;
      const pricingId =
        item.inventoryItem.pricingId ?? inventoryToPricingId[invId];
      loadPricingRef.current(pricingId ?? undefined, invId);
    });
  }, [cartItemIds, cartItems, inventoryToPricingId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isScanSellHidePurchaseKey(e)) return;
      if (shouldSkipScanSellHidePurchaseKey(document.activeElement)) return;
      e.preventDefault();
      setHidePurchaseDetailsInSell((v) => {
        const next = !v;
        localStorage.setItem(
          'scan-sell-hide-purchase-details',
          next ? '1' : '0'
        );
        return next;
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    scanSellCustomerPrefillConsumedRef.current = false;
  }, [location.key]);

  useLayoutEffect(() => {
    const raw = (
      location.state as
        | { prefillCustomer?: CustomerResponse }
        | null
        | undefined
    )?.prefillCustomer;
    if (!raw?.customerId) return;
    scanSellCustomerPrefillRef.current = raw;
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.pathname, navigate]);

  const normalizeBillingMode = useCallback(
    (mode?: BillingMode | null): BillingMode =>
      mode === 'BASIC' ? 'BASIC' : 'REGULAR',
    []
  );

  const toNumber = useCallback((value: unknown, fallback: number) => {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : fallback;
  }, []);

  const getAvailableUnitsFromInventory = (
    item: InventoryItem
  ): AvailableUnit[] => {
    const fromApi = item.availableUnits ?? [];
    if (Array.isArray(fromApi) && fromApi.length > 0) {
      return fromApi;
    }
    const units: AvailableUnit[] = [];
    if (item.baseUnit) {
      units.push({ unit: item.baseUnit, baseUnit: true });
    }
    if (item.unitConversions?.unit) {
      units.push({ unit: item.unitConversions.unit, baseUnit: false });
    }
    return units;
  };

  const getUnitFactorForUnit = (
    item: InventoryItem,
    unit: string | null | undefined,
    fallback = 1
  ) => {
    if (!unit) return fallback;
    if (item.baseUnit && unit === item.baseUnit) return 1;
    if (item.unitConversions?.unit && unit === item.unitConversions.unit) {
      return Math.max(1, toNumber(item.unitConversions.factor, fallback));
    }
    return fallback;
  };

  const getDefaultUnit = (item: InventoryItem): string => {
    if (item.unitConversions?.unit) {
      return item.unitConversions.unit;
    }
    const availableUnits = getAvailableUnitsFromInventory(item);
    return (
      availableUnits.find((u) => !u.baseUnit)?.unit ??
      availableUnits[0]?.unit ??
      item.baseUnit ??
      'UNIT'
    );
  };

  // Product search for dropdown (only on Enter or Search button)
  const runSearch = useCallback(
    async (query: string, pageNum = 0, pageSize = 8) => {
      if (!query.trim()) {
        setSearchResults([]);
        setSearchPage(0);
        setSearchTotalPages(0);
        setSearchTotalItems(0);
        return;
      }
      setSearchPage(pageNum);
      if (pageSize !== searchPageSize) setSearchPageSize(pageSize);
      setIsSearching(true);
      setError(null);
      try {
        const response = await inventoryApi.search(
          query.trim(),
          pageNum,
          pageSize
        );
        let items: InventoryItem[] = [];
        if (response) {
          if (Array.isArray(response)) items = response;
          else if (response.data) {
            if (Array.isArray(response.data)) items = response.data;
            else if (
              response.data &&
              typeof response.data === 'object' &&
              'data' in response.data
            ) {
              const nestedData = (response.data as { data?: InventoryItem[] })
                .data;
              items = Array.isArray(nestedData) ? nestedData : [];
            }
          }
        }
        if (response?.page) {
          setSearchTotalPages(response.page.totalPages);
          setSearchTotalItems(response.page.totalItems);
          setSearchPage(response.page.page);
        }
        setSearchResults(items);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Search failed';
        notifyError(msg);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [searchPageSize, notifyError]
  );

  const handleSearchSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setShowSearchDropdown(false);
        return;
      }
      setShowSearchDropdown(true);
      runSearch(searchQuery, 0, 8);
    },
    [searchQuery, runSearch]
  );

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        showSearchDropdown &&
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(e.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearchDropdown]);

  // Load cart on mount (once; time guard avoids double run in React Strict Mode)
  const lastLoadCartTimeRef = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - lastLoadCartTimeRef.current < 1500) return;
    lastLoadCartTimeRef.current = now;
    cartLoadedRef.current = true;
    loadCart();
  }, []);

  // Auto-dismiss error message after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error]);

  const loadCart = async (): Promise<void> => {
    if (isUpdatingRef.current) {
      return;
    }

    setIsLoadingCart(true);
    setError(null);
    try {
      const cart = await cartApi.get();

      // Only handle CREATED and PENDING statuses
      // If status is PENDING, redirect to checkout page
      if (cart.status === 'PENDING') {
        scanSellCustomerPrefillRef.current = null;
        navigate('/dashboard/checkout');
        return;
      }

      // If status is CREATED, stay on scan-sell page
      if (cart.status === 'CREATED') {
        setCartData(cart);
        setCustomerName(cart.customerName || '');
        setCustomerAddress(cart.customerAddress || '');
        setCustomerPhone(cart.customerPhone || '');
        setCustomerEmail(cart.customerEmail || '');
        // Build cart items from response only (no per-item inventory/search API calls)
        setCartItems(mergeCartResponseToItems(cart, []));
        return;
      }

      // For COMPLETED or other statuses, clear cart and stay on scan-sell
      setCartData(null);
      setCartItems([]);
      setCustomerName('');
      setCustomerAddress('');
      setCustomerPhone('');
      setCustomerEmail('');
      setIsRetailer(false);
      setCustomerGstin('');
      setCustomerDlNo('');
      setCustomerPan('');
    } catch (err) {
      // 404 or other error - no cart exists, stay on scan-sell page
      console.log('No existing cart or error loading cart:', err);
      setCartData(null);
      setCartItems([]);
      // Reset customer fields if cart is empty
      setCustomerName('');
      setCustomerAddress('');
      setCustomerPhone('');
      setCustomerEmail('');
      setIsRetailer(false);
      setCustomerGstin('');
      setCustomerDlNo('');
      setCustomerPan('');
    } finally {
      setIsLoadingCart(false);
    }
  };

  useEffect(() => {
    if (isLoadingCart) return;
    const c = scanSellCustomerPrefillRef.current;
    if (!c || scanSellCustomerPrefillConsumedRef.current) return;
    scanSellCustomerPrefillConsumedRef.current = true;
    scanSellCustomerPrefillRef.current = null;
    setCustomerName(c.name ?? '');
    setCustomerPhone(c.phone ?? '');
    setCustomerEmail(c.email ?? '');
    setCustomerAddress(c.address ?? '');
    const gstin = c.gstin ?? '';
    const dl = c.dlNo ?? '';
    const pan = c.pan ?? c.panNo ?? '';
    if (gstin || dl || pan) {
      setIsRetailer(true);
      setCustomerGstin(gstin);
      setCustomerDlNo(dl);
      setCustomerPan(pan);
    } else {
      setIsRetailer(false);
      setCustomerGstin('');
      setCustomerDlNo('');
      setCustomerPan('');
    }
    if (c.userId && c.email) {
      setLinkedUser({
        userId: c.userId,
        email: c.email,
        name: c.name ?? '',
      });
    } else {
      setLinkedUser(null);
    }
    setUserSearchMessage(null);
    setCustomerSectionOpen(true);
  }, [isLoadingCart]);

  /** Build CartItem[] from cart response, reusing existing inventoryItem when possible (no API calls). */
  const mergeCartResponseToItems = useCallback(
    (cart: CartResponse, previousItems: CartItem[]): CartItem[] => {
      return cart.items.map((resItem: CheckoutItemResponse) => {
        const existing = previousItems.find(
          (i) => i.inventoryItem.id === resItem.inventoryId
        );
        const availableUnits =
          (Array.isArray(resItem.availableUnits) &&
          resItem.availableUnits.length > 0
            ? resItem.availableUnits
            : existing?.availableUnits) ?? [];
        const inferredBaseUnit =
          availableUnits.find((u) => u.baseUnit)?.unit ??
          existing?.inventoryItem.baseUnit ??
          null;
        const saleUnit =
          resItem.saleUnit ??
          existing?.unit ??
          availableUnits.find((u) => !u.baseUnit)?.unit ??
          availableUnits[0]?.unit ??
          inferredBaseUnit ??
          'UNIT';
        const unitFactor = Math.max(
          1,
          toNumber(
            resItem.unitFactor,
            existing?.unitFactor ??
              (saleUnit === inferredBaseUnit
                ? 1
                : toNumber(existing?.unitFactor, 1))
          )
        );
        const apiBaseQuantity = toNumber(
          resItem.baseQuantity,
          toNumber(resItem.quantity, 0) * unitFactor
        );
        const quantity = toNumber(
          resItem.quantity,
          unitFactor > 0 ? apiBaseQuantity / unitFactor : apiBaseQuantity
        );
        const inventoryItem: InventoryItem = existing
          ? {
              ...existing.inventoryItem,
              saleAdditionalDiscount:
                resItem.saleAdditionalDiscount ??
                existing.inventoryItem.saleAdditionalDiscount,
              billingMode: normalizeBillingMode(
                resItem.billingMode ?? existing.inventoryItem.billingMode
              ),
              baseUnit: inferredBaseUnit,
              availableUnits,
              unitConversions:
                saleUnit !== inferredBaseUnit && unitFactor > 1
                  ? { unit: saleUnit, factor: unitFactor }
                  : existing.inventoryItem.unitConversions ?? null,
              purchaseAdditionalDiscount:
                resItem.purchaseAdditionalDiscount ??
                existing.inventoryItem.purchaseAdditionalDiscount ??
                null,
              purchaseSchemeType:
                resItem.purchaseSchemeType ??
                existing.inventoryItem.purchaseSchemeType ??
                null,
              purchaseSchemePayFor:
                resItem.purchaseSchemePayFor ??
                existing.inventoryItem.purchaseSchemePayFor ??
                null,
              purchaseSchemeFree:
                resItem.purchaseSchemeFree ??
                existing.inventoryItem.purchaseSchemeFree ??
                null,
              purchaseSchemePercentage:
                resItem.purchaseSchemePercentage ??
                existing.inventoryItem.purchaseSchemePercentage ??
                null,
            }
          : {
              id: resItem.inventoryId,
              lotId: '',
              barcode: null,
              name: resItem.name,
              description: null,
              companyName: null,
              maximumRetailPrice: resItem.maximumRetailPrice,
              costPrice: resItem.costPrice ?? 0,
              priceToRetail: resItem.priceToRetail,
              receivedCount: 0,
              soldCount: 0,
              currentCount: 999999,
              location: '',
              expiryDate: '',
              shopId: cart.shopId,
              saleAdditionalDiscount: resItem.saleAdditionalDiscount ?? null,
              billingMode: normalizeBillingMode(
                resItem.billingMode ?? cart.billingMode
              ),
              baseUnit: inferredBaseUnit,
              unitConversions:
                saleUnit !== inferredBaseUnit && unitFactor > 1
                  ? { unit: saleUnit, factor: unitFactor }
                  : null,
              availableUnits,
              pricingId: resItem.pricingId ?? undefined,
              purchaseAdditionalDiscount:
                resItem.purchaseAdditionalDiscount ?? null,
              purchaseSchemeType: resItem.purchaseSchemeType ?? null,
              purchaseSchemePayFor: resItem.purchaseSchemePayFor ?? null,
              purchaseSchemeFree: resItem.purchaseSchemeFree ?? null,
              purchaseSchemePercentage:
                resItem.purchaseSchemePercentage ?? null,
            };
        return {
          inventoryItem,
          unit: saleUnit,
          baseQuantity: apiBaseQuantity,
          unitFactor,
          availableUnits,
          quantity,
          price: resItem.priceToRetail,
          schemeType: resItem.schemeType ?? null,
          schemePayFor: resItem.schemePayFor ?? null,
          schemeFree: resItem.schemeFree ?? null,
          schemePercentage: resItem.schemePercentage ?? null,
        };
      });
    },
    [normalizeBillingMode, toNumber]
  );

  const getEffectiveAdditionalDiscount = useCallback(
    (inventoryId: string, item: CartItem) =>
      additionalDiscountOverrides[inventoryId] ??
      item.inventoryItem.saleAdditionalDiscount ??
      null,
    [additionalDiscountOverrides]
  );

  const syncCartToAPI = async (
    items: CartItem[],
    changedItemId?: string,
    quantityDelta?: number,
    originalItem?: CartItem,
    overrides?: Record<string, number | null>,
    saleAdditionalDiscountUpdate?: {
      inventoryId: string;
      saleAdditionalDiscount: number | null;
    },
    schemeUpdate?: {
      inventoryId: string;
      schemePayFor?: number | null;
      schemeFree?: number | null;
      schemePercentage?: number | null;
    },
    priceToRetailUpdate?: { inventoryId: string; priceToRetail: number },
    baseQuantityDeltaMode = false
  ) => {
    // Prevent duplicate full-cart syncs; allow item-specific updates (scheme, discount, price) so they are not dropped
    const isItemSpecificUpdate =
      schemeUpdate != null ||
      saleAdditionalDiscountUpdate != null ||
      priceToRetailUpdate != null;
    if (isUpdatingRef.current && !isItemSpecificUpdate) {
      return;
    }

    const thisSyncVersion = ++syncVersionRef.current;

    type CartItemPayload = {
      id: string;
      unit?: string;
      quantity?: number;
      baseQuantity?: number;
      priceToRetail?: number;
      saleAdditionalDiscount?: number | null;
      schemePayFor?: number | null;
      schemeFree?: number | null;
      schemeType?: 'FIXED_UNITS' | 'PERCENTAGE' | null;
      schemePercentage?: number | null;
    };

    const effectiveOverrides = overrides ?? additionalDiscountOverrides;
    const withItemFields = (
      base: CartItemPayload,
      cartItem?: CartItem
    ): CartItemPayload => {
      let result = { ...base };
      if (cartItem != null) {
        const addDisc =
          effectiveOverrides[cartItem.inventoryItem.id] ??
          cartItem.inventoryItem.saleAdditionalDiscount ??
          undefined;
        if (addDisc !== undefined && addDisc !== null) {
          result = { ...result, saleAdditionalDiscount: addDisc };
        }
        const hasPercentage =
          cartItem.schemePercentage !== undefined &&
          cartItem.schemePercentage !== null;
        const hasUnits =
          (cartItem.schemePayFor !== undefined &&
            cartItem.schemePayFor !== null) ||
          (cartItem.schemeFree !== undefined && cartItem.schemeFree !== null);

        if (hasPercentage) {
          result = {
            ...result,
            schemeType: 'PERCENTAGE',
            schemePercentage: cartItem.schemePercentage ?? null,
          };
        } else if (hasUnits) {
          result = {
            ...result,
            schemeType: 'FIXED_UNITS',
            schemePayFor: cartItem.schemePayFor ?? null,
            schemeFree: cartItem.schemeFree ?? null,
          };
        }
      }
      return result;
    };

    const withAdditionalDiscount = (
      id: string,
      unit: string,
      quantity: number,
      baseQuantity: number,
      priceToRetail: number,
      cartItem?: CartItem
    ) =>
      withItemFields(
        { id, unit, quantity, baseQuantity, priceToRetail },
        cartItem
      );

    isUpdatingRef.current = true;
    setIsUpdatingCart(true);
    try {
      let itemsToSend: CartItemPayload[];

      if (priceToRetailUpdate) {
        // Only price to retail changed: send id + priceToRetail (no quantity/baseQuantity)
        const item = items.find(
          (i) => i.inventoryItem.id === priceToRetailUpdate.inventoryId
        );
        if (!item) {
          isUpdatingRef.current = false;
          setIsUpdatingCart(false);
          return;
        }
        itemsToSend = [
          {
            id: item.inventoryItem.id,
            unit: item.unit,
            priceToRetail: priceToRetailUpdate.priceToRetail,
          },
        ];
      } else if (schemeUpdate) {
        // Only scheme changed: send id + scheme info (no quantity/baseQuantity)
        const item = items.find(
          (i) => i.inventoryItem.id === schemeUpdate.inventoryId
        );
        if (!item) {
          isUpdatingRef.current = false;
          setIsUpdatingCart(false);
          return;
        }
        const hasPercentage =
          schemeUpdate.schemePercentage !== undefined &&
          schemeUpdate.schemePercentage !== null;
        const hasUnits =
          (schemeUpdate.schemePayFor !== undefined &&
            schemeUpdate.schemePayFor !== null) ||
          (schemeUpdate.schemeFree !== undefined &&
            schemeUpdate.schemeFree !== null);
        itemsToSend = [
          {
            id: item.inventoryItem.id,
            unit: item.unit,
            priceToRetail: item.price,
            ...(hasPercentage
              ? {
                  schemeType: 'PERCENTAGE' as const,
                  schemePercentage: schemeUpdate.schemePercentage ?? null,
                }
              : {}),
            ...(!hasPercentage && hasUnits
              ? {
                  schemeType: 'FIXED_UNITS' as const,
                  schemePayFor: schemeUpdate.schemePayFor ?? null,
                  schemeFree: schemeUpdate.schemeFree ?? null,
                }
              : {}),
          },
        ];
      } else if (saleAdditionalDiscountUpdate) {
        // Only discount changed: send id + saleAdditionalDiscount (no quantity/baseQuantity)
        const item = items.find(
          (i) => i.inventoryItem.id === saleAdditionalDiscountUpdate.inventoryId
        );
        if (!item) {
          isUpdatingRef.current = false;
          setIsUpdatingCart(false);
          return;
        }
        const addDisc = saleAdditionalDiscountUpdate.saleAdditionalDiscount;
        itemsToSend = [
          {
            id: item.inventoryItem.id,
            unit: item.unit,
            priceToRetail: item.price,
            ...(addDisc !== null && addDisc !== undefined
              ? { saleAdditionalDiscount: addDisc }
              : {}),
          } as CartItemPayload,
        ];
      } else if (changedItemId && quantityDelta !== undefined) {
        // Only send the changed item with the delta quantity (1 for increment, -1 for decrement)
        const changedItem = items.find(
          (item) => item.inventoryItem.id === changedItemId
        );
        if (changedItem) {
          const effectiveBaseDelta = baseQuantityDeltaMode
            ? quantityDelta
            : quantityDelta * Math.max(1, changedItem.unitFactor);
          const effectiveQuantityDelta = baseQuantityDeltaMode
            ? 0
            : quantityDelta;
          // Send the actual delta value (1 for +, -1 for -)
          itemsToSend = [
            withAdditionalDiscount(
              changedItem.inventoryItem.id,
              changedItem.unit,
              effectiveQuantityDelta,
              effectiveBaseDelta,
              changedItem.price,
              changedItem
            ),
          ];
        } else {
          // Item was removed from local state (quantity became 0)
          // We still need to send it to API with -1 to remove it from cart
          // Use the originalItem passed as parameter, or find it from cartData
          const itemToRemove =
            originalItem ||
            (() => {
              const cartItem = cartData?.items.find(
                (ci: CheckoutItemResponse) => ci.inventoryId === changedItemId
              );
              return cartItem
                ? {
                    inventoryItem: {
                      id: changedItemId,
                      lotId: '',
                      barcode: null,
                      name: cartItem.name,
                      description: null,
                      companyName: null,
                      maximumRetailPrice: cartItem.maximumRetailPrice,
                      costPrice: 0,
                      priceToRetail: cartItem.priceToRetail,
                      receivedCount: 0,
                      soldCount: 0,
                      currentCount: 0,
                      location: '',
                      expiryDate: '',
                      shopId: '',
                      additionalDiscount: null,
                    },
                    quantity: 0,
                    unit: cartItem.saleUnit ?? 'UNIT',
                    baseQuantity: toNumber(cartItem.baseQuantity, 0),
                    unitFactor: Math.max(1, toNumber(cartItem.unitFactor, 1)),
                    availableUnits: cartItem.availableUnits ?? [],
                    price: cartItem.priceToRetail,
                    schemePayFor: cartItem.schemePayFor ?? null,
                    schemeFree: cartItem.schemeFree ?? null,
                  }
                : null;
            })();

          if (itemToRemove) {
            const effectiveBaseDelta = baseQuantityDeltaMode
              ? quantityDelta
              : quantityDelta * Math.max(1, itemToRemove.unitFactor);
            const effectiveQuantityDelta = baseQuantityDeltaMode
              ? 0
              : quantityDelta;
            itemsToSend = [
              withAdditionalDiscount(
                changedItemId,
                itemToRemove.unit,
                effectiveQuantityDelta,
                effectiveBaseDelta,
                itemToRemove.price
              ),
            ];
          } else {
            // Fallback: send all remaining items
            itemsToSend = items.map((item) =>
              withAdditionalDiscount(
                item.inventoryItem.id,
                item.unit,
                item.quantity,
                item.baseQuantity,
                item.price,
                item
              )
            );
          }
        }
      } else {
        // Send all items (for initial load or bulk operations)
        itemsToSend = items.map((item) =>
          withAdditionalDiscount(
            item.inventoryItem.id,
            item.unit,
            item.quantity,
            item.baseQuantity,
            item.price,
            item
          )
        );
      }

      const cartPayload = {
        businessType: 'pharmacy',
        items: itemsToSend,
        ...(customerName && { customerName }),
        ...(customerAddress && { customerAddress }),
        ...(customerPhone && { customerPhone }),
        ...(customerEmail && { customerEmail }),
        ...(isRetailer && customerGstin && { customerGstin }),
        ...(isRetailer && customerDlNo && { customerDlNo }),
        ...(isRetailer && customerPan && { customerPan }),
        ...(linkedUser && { customerUserId: linkedUser.userId }),
      };

      const updatedCart = await cartApi.add(cartPayload);
      // Only apply if no newer sync started (prevents stale response overwriting e.g. 15 with 10)
      if (thisSyncVersion !== syncVersionRef.current) return;
      setCartData(updatedCart);
      // Merge response into local state (no extra inventory/search API calls)
      setCartItems(mergeCartResponseToItems(updatedCart, items));
      setError(null);
    } catch (err) {
      // Handle API errors - might include stock validation errors
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update cart';
      if (
        errorMessage.includes(
          'Cannot mix REGULAR and BASIC inventory items in a single cart'
        )
      ) {
        const mixedModeMessage =
          'Cannot mix REGULAR and BASIC inventory items in a single cart';
        setError(mixedModeMessage);
        notifyError(mixedModeMessage);
      } else {
        notifyError(errorMessage);
      }
      // Revert to previous cart state on error by reloading cart (only if still latest sync)
      if (thisSyncVersion === syncVersionRef.current) {
        try {
          const currentCart = await cartApi.get();
          if (thisSyncVersion !== syncVersionRef.current) return;
          setCartData(currentCart);
          setCartItems(mergeCartResponseToItems(currentCart, items));
        } catch {
          // If reload fails, just show the error
        }
      }
      throw err;
    } finally {
      setIsUpdatingCart(false);
      isUpdatingRef.current = false;
    }
  };

  const handleAddToCart = async (item: InventoryItem, price?: number) => {
    // Use sellingPrice (effective) as default, or override with provided price
    const finalPrice =
      price !== undefined ? price : item.sellingPrice ?? item.priceToRetail;
    const incomingMode = normalizeBillingMode(item.billingMode);
    const activeMode = normalizeBillingMode(
      cartData?.billingMode ?? cartItems[0]?.inventoryItem.billingMode
    );

    if (finalPrice <= 0) {
      notifyError('Please enter a valid price');
      return;
    }

    const availableBase = item.currentBaseCount ?? item.currentCount;
    if (availableBase <= 0) {
      notifyError('Product is out of stock');
      return;
    }

    if (cartItems.length > 0 && activeMode !== incomingMode) {
      notifyError(
        'Cannot mix REGULAR and BASIC inventory items in a single cart'
      );
      return;
    }

    setShowSearchDropdown(false);

    setCartItems((prev) => {
      const existingItem = prev.find(
        (cartItem) => cartItem.inventoryItem.id === item.id
      );

      let updatedItems: CartItem[];
      if (existingItem) {
        // Update quantity if item already in cart
        const newQuantity = existingItem.quantity + 1;
        const newBaseQuantity =
          existingItem.baseQuantity + existingItem.unitFactor;
        // Validate stock: compare base quantities (currentBaseCount is in base units)
        const availableBase = item.currentBaseCount ?? item.currentCount;
        if (availableBase > 0 && newBaseQuantity > availableBase) {
          notifyError(`Only ${availableBase} items available in stock`);
          return prev;
        }
        updatedItems = prev.map((cartItem) =>
          cartItem.inventoryItem.id === item.id
            ? {
                ...cartItem,
                quantity: newQuantity,
                baseQuantity: newBaseQuantity,
              }
            : cartItem
        );
      } else {
        const defaultUnit = getDefaultUnit(item);
        const unitFactor = getUnitFactorForUnit(item, defaultUnit, 1);
        const availableUnits = getAvailableUnitsFromInventory(item);
        const baseQuantity = unitFactor;
        // Add new item to cart: validate stock in base units (currentBaseCount)
        const availableBase = item.currentBaseCount ?? item.currentCount;
        if (availableBase > 0 && availableBase < baseQuantity) {
          notifyError('Product is out of stock');
          return prev;
        }
        updatedItems = [
          ...prev,
          {
            inventoryItem: { ...item, billingMode: incomingMode },
            unit: defaultUnit,
            baseQuantity,
            unitFactor,
            availableUnits,
            quantity: 1,
            price: finalPrice,
          },
        ];
      }

      // Sync to API - only send the changed item with quantity: 1
      syncCartToAPI(updatedItems, item.id, 1);
      return updatedItems;
    });
    setError(null);
  };

  const handleUpdateQuantity = async (
    id: string,
    delta: number,
    isBaseUnitSelected = false
  ) => {
    const originalItem = cartItems.find((item) => item.inventoryItem.id === id);

    if (!originalItem) return;

    const baseDelta = isBaseUnitSelected
      ? delta
      : delta * Math.max(1, originalItem.unitFactor);
    const newBaseQuantity = originalItem.baseQuantity + baseDelta;
    const factor = Math.max(1, originalItem.unitFactor);
    const newQuantity = Number((newBaseQuantity / factor).toFixed(3));

    const availableBase =
      originalItem.inventoryItem.currentBaseCount ??
      originalItem.inventoryItem.currentCount;
    if (availableBase < 999999 && newBaseQuantity > availableBase) {
      setError(`Only ${availableBase} items available in stock`);
      throw new Error('Stock exceeded');
    }

    await syncCartToAPI(
      cartItems,
      id,
      delta,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      isBaseUnitSelected
    );

    setCartItems((prev) =>
      prev
        .map((item) =>
          item.inventoryItem.id === id
            ? {
                ...item,
                quantity: newQuantity,
                baseQuantity: newBaseQuantity,
              }
            : item
        )
        .filter((item) => item.baseQuantity > 0)
    );
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => {
      // Find the item being removed to get its quantity and price
      const itemToRemove = prev.find((item) => item.inventoryItem.id === id);
      if (!itemToRemove) {
        return prev;
      }

      // Remove from local state
      const updatedItems = prev.filter((item) => item.inventoryItem.id !== id);

      // Sync to API - send the item with negative quantity (remove all)
      syncCartToAPI(updatedItems, id, -itemToRemove.quantity, itemToRemove);
      return updatedItems;
    });
  };

  const handleAdditionalDiscountChange = (
    inventoryId: string,
    value: number | null
  ) => {
    const next = { ...additionalDiscountOverrides, [inventoryId]: value };
    setAdditionalDiscountOverrides(next);
    // Send only this item to API (id + additionalDiscount), like quantity update
    syncCartToAPI(cartItems, undefined, undefined, undefined, undefined, {
      inventoryId,
      saleAdditionalDiscount: value,
    });
  };

  const handleSchemeChange = (
    inventoryId: string,
    schemePayFor: number | null,
    schemeFree: number | null
  ) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.inventoryItem.id === inventoryId
          ? {
              ...item,
              schemeType: 'FIXED_UNITS',
              schemePayFor,
              schemeFree,
              schemePercentage: null,
            }
          : item
      )
    );
    syncCartToAPI(
      cartItems,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        inventoryId,
        schemePayFor,
        schemeFree,
        schemePercentage: null,
      }
    );
  };

  const handleSchemePercentageChange = (
    inventoryId: string,
    schemePercentage: number | null
  ) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.inventoryItem.id === inventoryId
          ? {
              ...item,
              schemeType: 'PERCENTAGE',
              schemePercentage,
              schemePayFor: null,
              schemeFree: null,
            }
          : item
      )
    );
    syncCartToAPI(
      cartItems,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        inventoryId,
        schemePercentage,
        schemePayFor: null,
        schemeFree: null,
      }
    );
  };

  const handleSellingPriceChange = (
    inventoryId: string,
    priceToRetail: number
  ) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.inventoryItem.id === inventoryId
          ? { ...item, price: priceToRetail }
          : item
      )
    );
    syncCartToAPI(
      cartItems,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { inventoryId, priceToRetail }
    );
  };

  const handleUnitChange = (inventoryId: string, unit: string) => {
    setCartItems((prev) => {
      const updatedItems = prev.map((item) => {
        if (item.inventoryItem.id !== inventoryId) return item;
        const nextFactor = getUnitFactorForUnit(
          item.inventoryItem,
          unit,
          item.unitFactor
        );
        const preservedBaseQty = Math.max(
          1,
          toNumber(item.baseQuantity, item.quantity)
        );
        const nextQty =
          nextFactor > 0
            ? Number((preservedBaseQty / nextFactor).toFixed(3))
            : preservedBaseQty;
        return {
          ...item,
          unit,
          unitFactor: nextFactor,
          baseQuantity: preservedBaseQty,
          quantity: nextQty,
        };
      });
      syncCartToAPI(updatedItems);
      return updatedItems;
    });
  };

  const handleClearCart = async () => {
    // Get current cart items before clearing
    const currentItems = [...cartItems];

    // Clear local state
    setCartItems([]);
    setAdditionalDiscountOverrides({});
    setError(null);

    // Send all items with negative quantities to remove them from cart
    if (currentItems.length > 0) {
      setIsUpdatingCart(true);
      try {
        const itemsToSend = currentItems.map((item) => ({
          id: item.inventoryItem.id,
          unit: item.unit,
          quantity: -item.quantity, // Negative quantity to remove all
          baseQuantity: -item.baseQuantity,
          priceToRetail: item.price,
        }));

        const cartPayload = {
          businessType: 'pharmacy',
          items: itemsToSend,
          ...(customerName && { customerName }),
          ...(customerAddress && { customerAddress }),
          ...(customerPhone && { customerPhone }),
          ...(customerEmail && { customerEmail }),
          ...(isRetailer && customerGstin && { customerGstin }),
          ...(isRetailer && customerDlNo && { customerDlNo }),
          ...(isRetailer && customerPan && { customerPan }),
          ...(linkedUser && { customerUserId: linkedUser.userId }),
        };

        const updatedCart = await cartApi.add(cartPayload);
        setCartData(updatedCart);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to clear cart';
        notifyError(errorMessage);
        // Reload cart on error to restore state
        try {
          await loadCart();
        } catch {
          // If reload fails, just show the error
        }
      } finally {
        setIsUpdatingCart(false);
      }
    } else {
      // If cart is already empty, just clear the data
      setCartData(null);
    }
  };

  const calculateSubtotal = () => {
    return (
      cartData?.subTotal ??
      cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
    );
  };

  const cartBillingMode = normalizeBillingMode(
    cartData?.billingMode ?? cartItems[0]?.inventoryItem.billingMode
  );

  const calculateSGST = () => {
    if (cartBillingMode === 'BASIC') {
      return 0;
    }
    if (cartData?.sgstAmount !== undefined && cartData?.sgstAmount !== null) {
      return cartData.sgstAmount;
    }
    // Fallback: calculate 4.5% if not provided
    return calculateSubtotal() * 0.045;
  };

  const calculateCGST = () => {
    if (cartBillingMode === 'BASIC') {
      return 0;
    }
    if (cartData?.cgstAmount !== undefined && cartData?.cgstAmount !== null) {
      return cartData.cgstAmount;
    }
    // Fallback: calculate 4.5% if not provided
    return calculateSubtotal() * 0.045;
  };

  const calculateTax = () => {
    if (cartBillingMode === 'BASIC') {
      return 0;
    }
    if (cartData?.taxTotal !== undefined && cartData?.taxTotal !== null) {
      return cartData.taxTotal;
    }
    // Fallback: sum of SGST and CGST
    return calculateSGST() + calculateCGST();
  };

  const calculateTotal = () => {
    if (cartData?.grandTotal !== undefined && cartData?.grandTotal !== null) {
      return cartData.grandTotal;
    }
    return calculateSubtotal() + calculateTax();
  };

  const getSGSTPercentage = () => {
    const subtotal = calculateSubtotal();
    if (subtotal === 0) return '0.0';
    const sgst = calculateSGST();
    return ((sgst / subtotal) * 100).toFixed(1);
  };

  const getCGSTPercentage = () => {
    const subtotal = calculateSubtotal();
    if (subtotal === 0) return '0.0';
    const cgst = calculateCGST();
    return ((cgst / subtotal) * 100).toFixed(1);
  };

  const handleCustomerSearch = async () => {
    if (!customerPhone.trim()) {
      notifyError('Please enter a customer phone number');
      return;
    }

    setIsSearchingCustomer(true);
    setError(null);
    try {
      const customer = await customersApi.searchByPhone(customerPhone.trim());
      if (customer) {
        setCustomerName(customer.name || '');
        setCustomerEmail(customer.email || '');
        setCustomerAddress(customer.address || '');
        // Phone is already set from the search input

        // Check if retailer fields are present
        const hasRetailerFields = !!(
          customer.gstin ||
          customer.dlNo ||
          customer.pan
        );
        if (hasRetailerFields) {
          setIsRetailer(true);
          setCustomerGstin(customer.gstin || '');
          setCustomerDlNo(customer.dlNo || '');
          setCustomerPan(customer.pan || '');
        } else {
          setIsRetailer(false);
          setCustomerGstin('');
          setCustomerDlNo('');
          setCustomerPan('');
        }
        if (customer.userId) {
          setLinkedUser({
            userId: customer.userId,
            email: customer.email || '',
            name: customer.name || '',
          });
        }
      } else {
        // Customer not found - clear all fields
        setCustomerName('');
        setCustomerEmail('');
        setCustomerAddress('');
        setIsRetailer(false);
        setCustomerGstin('');
        setCustomerDlNo('');
        setCustomerPan('');
      }
    } catch (err) {
      // On error (404 or any other error), clear all fields
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to search customer';
      notifyError(errorMessage);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerAddress('');
      setIsRetailer(false);
      setCustomerGstin('');
      setCustomerDlNo('');
      setCustomerPan('');
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleCustomerSearchByEmail = async () => {
    if (!customerEmail.trim()) {
      notifyError('Please enter a customer email');
      return;
    }

    setIsSearchingCustomer(true);
    setError(null);
    try {
      const customer = await customersApi.searchByEmail(customerEmail.trim());
      if (customer) {
        setCustomerName(customer.name || '');
        setCustomerPhone(customer.phone || '');
        setCustomerAddress(customer.address || '');
        const hasRetailerFields = !!(
          customer.gstin ||
          customer.dlNo ||
          customer.pan
        );
        if (hasRetailerFields) {
          setIsRetailer(true);
          setCustomerGstin(customer.gstin || '');
          setCustomerDlNo(customer.dlNo || '');
          setCustomerPan(customer.pan || '');
        } else {
          setIsRetailer(false);
          setCustomerGstin('');
          setCustomerDlNo('');
          setCustomerPan('');
        }
        if (customer.userId) {
          setLinkedUser({
            userId: customer.userId,
            email: customer.email || '',
            name: customer.name || '',
          });
        }
      } else {
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setIsRetailer(false);
        setCustomerGstin('');
        setCustomerDlNo('');
        setCustomerPan('');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to search customer';
      notifyError(errorMessage);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setIsRetailer(false);
      setCustomerGstin('');
      setCustomerDlNo('');
      setCustomerPan('');
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleSearchUserForLink = async () => {
    const email = customerEmail?.trim();
    if (!email) {
      notifyError('Enter customer email first to check for StockKart user');
      return;
    }
    setIsSearchingUser(true);
    setUserSearchMessage(null);
    setLinkedUser(null);
    try {
      const user = await usersApi.searchByEmail(email);
      if (user) {
        setLinkedUser({
          userId: user.userId,
          email: user.email,
          name: user.name,
        });
        setUserSearchMessage(`Found: ${user.name} (${user.email})`);
        setCustomerName((prev) => prev || user.name);
      } else {
        setUserSearchMessage('No StockKart user found with this email');
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

  const handleProcessPayment = async () => {
    if (cartItems.length === 0) {
      notifyError('Cart is empty');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Call upsert API with only customer info (no items)
      const upsertPayload = {
        businessType: 'pharmacy',
        items: [], // Empty items array - only updating customer info
        ...(customerName && { customerName }),
        ...(customerAddress && { customerAddress }),
        ...(customerPhone && { customerPhone: customerPhone.trim() }),
        ...(customerEmail && { customerEmail: customerEmail.trim() }),
        ...(isRetailer &&
          customerGstin && { customerGstin: customerGstin.trim() }),
        ...(isRetailer &&
          customerDlNo && { customerDlNo: customerDlNo.trim() }),
        ...(isRetailer && customerPan && { customerPan: customerPan.trim() }),
        ...(linkedUser && { customerUserId: linkedUser.userId }),
      };

      const upsertResponse = await cartApi.add(upsertPayload);

      // Get purchaseId from upsert response or cartData
      const purchaseId = upsertResponse.purchaseId || cartData?.purchaseId;

      if (!purchaseId) {
        throw new Error('Purchase ID not found');
      }

      // Step 2: Call update status API with PENDING status and CASH payment method
      const statusPayload = {
        purchaseId,
        status: 'PENDING',
        paymentMethod: 'CASH',
      };

      await cartApi.updateStatus(statusPayload);

      // Navigate to checkout page (it will load data via GET cart API)
      navigate('/dashboard/checkout');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to process payment';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.page}>
      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.header}>
        <h2 className={styles.title}>Scan and Sell</h2>
        <p className={styles.subtitle}>Speed up sales with barcode scanning</p>
      </div>

      {/* Main: cart (wider) + totals sidebar (narrow fixed) */}
      <div className={styles.mainRow}>
        <div className={styles.cartArea}>
          <div className={styles.cartSection}>
            {/* Search inside cart: API only on Enter or Search button */}
            <div className={styles.searchRow} ref={searchWrapperRef}>
              <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
                <div className={styles.searchInputWrapper}>
                  <span
                    className={styles.searchIcon}
                    role="img"
                    aria-label="Search"
                  >
                    🔍
                  </span>
                  <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setSearchQuery(e.currentTarget.value)
                    }
                    disabled={isSearching}
                    autoFocus
                    aria-expanded={showSearchDropdown}
                    aria-haspopup="listbox"
                    aria-controls="search-results-list"
                  />
                  <button
                    type="submit"
                    className={styles.searchSubmitBtn}
                    disabled={isSearching}
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </form>
              {showSearchDropdown && (
                <div
                  id="search-results-list"
                  className={styles.searchDropdown}
                  role="listbox"
                >
                  {isSearching ? (
                    <div className={styles.dropdownLoading}>Searching...</div>
                  ) : searchResults.length === 0 ? (
                    <div className={styles.dropdownEmpty}>
                      No products found
                    </div>
                  ) : (
                    <ul className={styles.dropdownList}>
                      {searchResults.map((item) => (
                        <SearchDropdownItem
                          key={item.id}
                          item={item}
                          onAddToCart={handleAddToCart}
                          disabled={
                            item.currentCount <= 0 ||
                            (item.sellingPrice ?? item.priceToRetail) == null ||
                            isUpdatingCart
                          }
                        />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* View toggle: List (default) / Grid */}
            {cartItems.length > 0 && (
              <div className={styles.viewToggleWrap}>
                <span className={styles.viewToggleLabel}>View:</span>
                <div
                  className={styles.viewToggleButtons}
                  role="group"
                  aria-label="Cart view mode"
                >
                  <button
                    type="button"
                    className={`${styles.viewToggleBtn} ${
                      cartViewMode === 'list' ? styles.viewToggleBtnActive : ''
                    }`}
                    onClick={() => {
                      setCartViewMode('list');
                      localStorage.setItem('scan-sell-view-mode', 'list');
                    }}
                    title="List view"
                    aria-pressed={cartViewMode === 'list'}
                  >
                    <span aria-hidden>☰</span> List
                  </button>
                  <button
                    type="button"
                    className={`${styles.viewToggleBtn} ${
                      cartViewMode === 'grid' ? styles.viewToggleBtnActive : ''
                    }`}
                    onClick={() => {
                      setCartViewMode('grid');
                      localStorage.setItem('scan-sell-view-mode', 'grid');
                    }}
                    title="Grid view"
                    aria-pressed={cartViewMode === 'grid'}
                  >
                    <span aria-hidden>⊞</span> Grid
                  </button>
                </div>
              </div>
            )}

            <div
              className={`${styles.cartItems} ${
                cartViewMode === 'grid' ? styles.cartItemsExcel : ''
              }`}
            >
              {isLoadingCart ? (
                <div className={styles.loading}>Loading cart...</div>
              ) : cartItems.length === 0 ? (
                <div className={styles.emptyCart}>Cart is empty</div>
              ) : cartViewMode === 'grid' ? (
                <div className={styles.excelTableWrap}>
                  <table className={styles.excelTable}>
                    <thead>
                      <tr>
                        <th className={styles.excelTh}>#</th>
                        <th className={styles.excelTh}>Product</th>
                        <th className={styles.excelTh}>Company</th>
                        <th className={styles.excelTh}>Qty</th>
                        <th className={styles.excelTh}>Unit</th>
                        <th className={styles.excelTh}>Amount</th>
                        <th className={styles.excelTh}>Price</th>
                        <th className={styles.excelTh}>Discount</th>
                        <th className={styles.excelTh}>Scheme</th>
                        <th className={styles.excelTh}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map((cartItem, idx) => {
                        const isBaseUnitSelected =
                          (cartItem.inventoryItem.baseUnit != null &&
                            cartItem.unit ===
                              cartItem.inventoryItem.baseUnit) ||
                          cartItem.availableUnits.some(
                            (u) => u.baseUnit && u.unit === cartItem.unit
                          );
                        const quantityInputValue = isBaseUnitSelected
                          ? cartItem.baseQuantity
                          : cartItem.quantity;
                        const lineTotal = cartItem.price * cartItem.quantity;
                        const formatPrice = (n: number) =>
                          new Intl.NumberFormat('en-IN', {
                            style: 'currency',
                            currency: 'INR',
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }).format(n);
                        const pricingId =
                          cartItem.inventoryItem.pricingId ??
                          inventoryToPricingId[cartItem.inventoryItem.id];
                        const pricing = pricingId
                          ? pricingCache[pricingId]
                          : undefined;
                        const rateOpts = getRateOptions(
                          cartItem.inventoryItem,
                          pricing
                        );
                        const showRateDropdown =
                          pricingId ||
                          cartItem.inventoryItem.id ||
                          rateOpts.length > 1;
                        const matched = rateOpts.find(
                          (o) => Math.abs(o.price - cartItem.price) < 0.01
                        );
                        const isLoading =
                          pricingLoading[pricingId ?? ''] ||
                          pricingLoading[`inv:${cartItem.inventoryItem.id}`];
                        return (
                          <tr
                            key={cartItem.inventoryItem.id}
                            className={styles.excelTr}
                          >
                            <td className={styles.excelTd}>{idx + 1}</td>
                            <td className={styles.excelTd}>
                              <button
                                type="button"
                                className={styles.excelProductBtn}
                                onClick={() => setDetailModalItem(cartItem)}
                              >
                                {cartItem.inventoryItem.name || '—'}
                              </button>
                            </td>
                            <td className={styles.excelTd}>
                              {cartItem.inventoryItem.companyName || '—'}
                            </td>
                            <td className={styles.excelTd}>
                              <div className={styles.excelCellInput}>
                                <CartQuantityInput
                                  value={quantityInputValue}
                                  disabled={isUpdatingCart}
                                  onCommit={async (newQty) => {
                                    const delta = newQty - quantityInputValue;
                                    if (delta !== 0) {
                                      await handleUpdateQuantity(
                                        cartItem.inventoryItem.id,
                                        delta,
                                        isBaseUnitSelected
                                      );
                                    }
                                  }}
                                />
                              </div>
                            </td>
                            <td className={styles.excelTd}>
                              <select
                                className={styles.excelSelect}
                                value={cartItem.unit}
                                onChange={(e) =>
                                  handleUnitChange(
                                    cartItem.inventoryItem.id,
                                    e.currentTarget.value
                                  )
                                }
                                disabled={isUpdatingCart}
                              >
                                {(cartItem.availableUnits.length > 0
                                  ? cartItem.availableUnits
                                  : [{ unit: cartItem.unit, baseUnit: false }]
                                ).map((uo) => (
                                  <option
                                    key={`${uo.unit}-${uo.baseUnit}`}
                                    value={uo.unit}
                                  >
                                    {uo.unit}
                                    {uo.baseUnit ? ' (base)' : ''}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className={styles.excelTd}>
                              {formatPrice(lineTotal)}
                            </td>
                            <td className={styles.excelTd}>
                              <div className={styles.excelPriceCell}>
                                <CartSellingPriceInput
                                  value={cartItem.price}
                                  onCommit={(n) =>
                                    handleSellingPriceChange(
                                      cartItem.inventoryItem.id,
                                      n
                                    )
                                  }
                                  disabled={isUpdatingCart}
                                />
                                {showRateDropdown && (
                                  <select
                                    className={styles.excelRateSelect}
                                    value={
                                      matched ? matched.label : '__custom__'
                                    }
                                    onChange={(e) => {
                                      const sel = e.target.value;
                                      if (sel === '__custom__') return;
                                      const opt = rateOpts.find(
                                        (o) => o.label === sel
                                      );
                                      if (opt)
                                        handleSellingPriceChange(
                                          cartItem.inventoryItem.id,
                                          opt.price
                                        );
                                    }}
                                    onMouseDown={() =>
                                      loadPricingOnDropdownClick(
                                        cartItem.inventoryItem.pricingId ??
                                          undefined,
                                        cartItem.inventoryItem.id
                                      )
                                    }
                                    disabled={isUpdatingCart || isLoading}
                                  >
                                    <option value="__custom__">Custom</option>
                                    {rateOpts.map((opt) => (
                                      <option
                                        key={`${opt.label}-${opt.price}`}
                                        value={opt.label}
                                      >
                                        {opt.label} ({formatPrice(opt.price)})
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </td>
                            <td className={styles.excelTd}>
                              <div className={styles.compareCell}>
                                {!hidePurchaseDetailsInSell && (
                                  <div className={styles.compareTop}>
                                    {(() => {
                                      const v = getPurchaseAdditionalDiscount(
                                        cartItem.inventoryItem
                                      );
                                      return v != null ? `${v}%` : '—';
                                    })()}
                                  </div>
                                )}

                                <div className={styles.compareBottom}>
                                  <CartAdditionalDiscountInput
                                    value={getEffectiveAdditionalDiscount(
                                      cartItem.inventoryItem.id,
                                      cartItem
                                    )}
                                    onCommit={(n) =>
                                      handleAdditionalDiscountChange(
                                        cartItem.inventoryItem.id,
                                        n
                                      )
                                    }
                                    disabled={isUpdatingCart}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className={styles.excelTd}>
                              <div className={styles.compareCell}>
                                {!hidePurchaseDetailsInSell && (
                                  <div className={styles.compareTop}>
                                    {formatPurchaseSchemeLabel(
                                      cartItem.inventoryItem
                                    )}
                                  </div>
                                )}

                                <div className={styles.compareBottom}>
                                  <CartSchemeInput
                                    schemeType={cartItem.schemeType ?? null}
                                    payFor={cartItem.schemePayFor ?? null}
                                    free={cartItem.schemeFree ?? null}
                                    percentage={
                                      cartItem.schemePercentage ?? null
                                    }
                                    onCommitUnits={(pf, f) =>
                                      handleSchemeChange(
                                        cartItem.inventoryItem.id,
                                        pf,
                                        f
                                      )
                                    }
                                    onCommitPercentage={(p) =>
                                      handleSchemePercentageChange(
                                        cartItem.inventoryItem.id,
                                        p
                                      )
                                    }
                                    disabled={isUpdatingCart}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className={styles.excelTd}>
                              <button
                                type="button"
                                className={styles.excelRemoveBtn}
                                onClick={() =>
                                  handleRemoveItem(cartItem.inventoryItem.id)
                                }
                                disabled={isUpdatingCart}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                cartItems.map((cartItem) =>
                  (() => {
                    const isBaseUnitSelected =
                      (cartItem.inventoryItem.baseUnit != null &&
                        cartItem.unit === cartItem.inventoryItem.baseUnit) ||
                      cartItem.availableUnits.some(
                        (unitOption) =>
                          unitOption.baseUnit &&
                          unitOption.unit === cartItem.unit
                      );
                    const quantityInputValue = isBaseUnitSelected
                      ? cartItem.baseQuantity
                      : cartItem.quantity;
                    return (
                      <div
                        key={cartItem.inventoryItem.id}
                        className={styles.cartItem}
                      >
                        <div className={styles.itemInfo}>
                          <div className={styles.itemHeader}>
                            <button
                              type="button"
                              className={styles.itemNameButton}
                              onClick={() => setDetailModalItem(cartItem)}
                              aria-label="View pricing details"
                            >
                              {cartItem.inventoryItem.name || 'Unnamed Product'}
                            </button>
                            <span className={styles.modeBadge}>
                              {normalizeBillingMode(
                                cartItem.inventoryItem.billingMode
                              )}
                            </span>
                            {cartItem.inventoryItem.companyName && (
                              <span className={styles.itemCompany}>
                                {cartItem.inventoryItem.companyName}
                              </span>
                            )}
                            <div className={styles.itemMetaRow}>
                              <span className={styles.itemUnitMeta}>
                                {cartItem.baseQuantity}{' '}
                                {cartItem.inventoryItem.baseUnit ??
                                  'base units'}{' '}
                                ({cartItem.quantity} {cartItem.unit})
                              </span>
                            </div>
                            {cartItem.inventoryItem.maximumRetailPrice >
                              cartItem.price && (
                              <span className={styles.itemDiscount}>
                                {(
                                  ((cartItem.inventoryItem.maximumRetailPrice -
                                    cartItem.price) /
                                    cartItem.inventoryItem.maximumRetailPrice) *
                                  100
                                ).toFixed(1)}
                                % off MRP
                              </span>
                            )}
                          </div>
                          <div className={styles.itemEditRow}>
                            <div className={styles.itemEditFields}>
                              <div className={styles.itemFieldGroup}>
                                <label
                                  className={styles.itemFieldLabel}
                                  htmlFor={`price-${cartItem.inventoryItem.id}`}
                                >
                                  Price
                                </label>
                                <div className={styles.itemFieldInputWrap}>
                                  <CartSellingPriceInput
                                    id={`price-${cartItem.inventoryItem.id}`}
                                    value={cartItem.price}
                                    onCommit={(num) =>
                                      handleSellingPriceChange(
                                        cartItem.inventoryItem.id,
                                        num
                                      )
                                    }
                                    disabled={isUpdatingCart}
                                  />
                                  {(() => {
                                    const pricingId =
                                      cartItem.inventoryItem.pricingId ??
                                      inventoryToPricingId[
                                        cartItem.inventoryItem.id
                                      ];
                                    const pricing = pricingId
                                      ? pricingCache[pricingId]
                                      : undefined;
                                    const invId = cartItem.inventoryItem.id;
                                    const isLoading =
                                      pricingLoading[pricingId ?? ''] ||
                                      pricingLoading[`inv:${invId}`];
                                    const rateOpts = getRateOptions(
                                      cartItem.inventoryItem,
                                      pricing
                                    );
                                    const formatPrice = (n: number) =>
                                      new Intl.NumberFormat('en-IN', {
                                        style: 'currency',
                                        currency: 'INR',
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      }).format(n);
                                    const showDropdown =
                                      pricingId || invId || rateOpts.length > 1;
                                    if (!showDropdown) return null;
                                    const matched = rateOpts.find(
                                      (o) =>
                                        Math.abs(o.price - cartItem.price) <
                                        0.01
                                    );
                                    const selectValue = matched
                                      ? matched.label
                                      : '__custom__';
                                    // Never switch select value to loading - keep current selection to avoid flicker
                                    const displayValue =
                                      isLoading && rateOpts.length === 0
                                        ? '__custom__'
                                        : selectValue;
                                    return (
                                      <select
                                        className={styles.itemRateSelect}
                                        value={displayValue}
                                        onChange={(e) => {
                                          const sel = e.target.value;
                                          if (sel === '__custom__') return;
                                          const opt = rateOpts.find(
                                            (o) => o.label === sel
                                          );
                                          if (opt) {
                                            handleSellingPriceChange(
                                              cartItem.inventoryItem.id,
                                              opt.price
                                            );
                                          }
                                        }}
                                        onMouseDown={() => {
                                          loadPricingOnDropdownClick(
                                            cartItem.inventoryItem.pricingId ??
                                              undefined,
                                            invId
                                          );
                                        }}
                                        disabled={isUpdatingCart || isLoading}
                                        title={
                                          isLoading
                                            ? 'Loading rates…'
                                            : 'Select rate'
                                        }
                                      >
                                        <option value="__custom__">
                                          Custom
                                        </option>
                                        {rateOpts.map((opt) => (
                                          <option
                                            key={`${opt.label}-${opt.price}`}
                                            value={opt.label}
                                          >
                                            {opt.label} (
                                            {formatPrice(opt.price)})
                                          </option>
                                        ))}
                                      </select>
                                    );
                                  })()}
                                  <span className={styles.itemFieldUnit}>
                                    /{cartItem.unit}
                                  </span>
                                </div>
                              </div>
                              <div className={styles.itemSaleRowInline}>
                                {/* Discount */}
                                <div className={styles.itemFieldGroup}>
                                  <label className={styles.itemFieldLabel}>
                                    Disc
                                  </label>

                                  <div className={styles.compareCell}>
                                    {!hidePurchaseDetailsInSell && (
                                      <div className={styles.compareTop}>
                                        {(() => {
                                          const v =
                                            getPurchaseAdditionalDiscount(
                                              cartItem.inventoryItem
                                            );
                                          return v != null ? `${v}%` : '—';
                                        })()}
                                      </div>
                                    )}

                                    <div className={styles.compareBottom}>
                                      <CartAdditionalDiscountInput
                                        value={getEffectiveAdditionalDiscount(
                                          cartItem.inventoryItem.id,
                                          cartItem
                                        )}
                                        onCommit={(num) =>
                                          handleAdditionalDiscountChange(
                                            cartItem.inventoryItem.id,
                                            num
                                          )
                                        }
                                        disabled={isUpdatingCart}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Scheme */}
                                <div className={styles.itemFieldGroup}>
                                  <label className={styles.itemFieldLabel}>
                                    Scheme
                                  </label>

                                  <div className={styles.compareCell}>
                                    {!hidePurchaseDetailsInSell && (
                                      <div className={styles.compareTop}>
                                        {formatPurchaseSchemeLabel(
                                          cartItem.inventoryItem
                                        )}
                                      </div>
                                    )}

                                    <div className={styles.compareBottom}>
                                      <CartSchemeInput
                                        schemeType={cartItem.schemeType ?? null}
                                        payFor={cartItem.schemePayFor ?? null}
                                        free={cartItem.schemeFree ?? null}
                                        percentage={
                                          cartItem.schemePercentage ?? null
                                        }
                                        onCommitUnits={(pf, f) =>
                                          handleSchemeChange(
                                            cartItem.inventoryItem.id,
                                            pf,
                                            f
                                          )
                                        }
                                        onCommitPercentage={(p) =>
                                          handleSchemePercentageChange(
                                            cartItem.inventoryItem.id,
                                            p
                                          )
                                        }
                                        disabled={isUpdatingCart}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Unit */}
                                <div className={styles.itemFieldGroup}>
                                  <label className={styles.itemFieldLabel}>
                                    Unit
                                  </label>

                                  <select
                                    className={styles.itemUnitSelect}
                                    value={cartItem.unit}
                                    onChange={(e) =>
                                      handleUnitChange(
                                        cartItem.inventoryItem.id,
                                        e.currentTarget.value
                                      )
                                    }
                                    disabled={isUpdatingCart}
                                  >
                                    {(cartItem.availableUnits.length > 0
                                      ? cartItem.availableUnits
                                      : [
                                          {
                                            unit: cartItem.unit,
                                            baseUnit: false,
                                          },
                                        ]
                                    ).map((unitOption) => (
                                      <option
                                        key={`${unitOption.unit}-${unitOption.baseUnit}`}
                                        value={unitOption.unit}
                                      >
                                        {unitOption.unit}
                                        {unitOption.baseUnit ? ' (base)' : ''}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                            <div className={styles.itemActions}>
                              <div className={styles.itemActionTopRow}>
                                <div className={styles.qtyStepper}>
                                  <button
                                    className={styles.qtyBtn}
                                    onClick={() =>
                                      handleUpdateQuantity(
                                        cartItem.inventoryItem.id,
                                        -1,
                                        isBaseUnitSelected
                                      )
                                    }
                                    disabled={isUpdatingCart}
                                    aria-label="Decrease quantity"
                                  >
                                    −
                                  </button>
                                  <CartQuantityInput
                                    value={quantityInputValue}
                                    disabled={isUpdatingCart}
                                    onCommit={async (newQty) => {
                                      const delta = newQty - quantityInputValue;
                                      if (delta !== 0) {
                                        await handleUpdateQuantity(
                                          cartItem.inventoryItem.id,
                                          delta,
                                          isBaseUnitSelected
                                        );
                                      }
                                    }}
                                  />
                                  <button
                                    className={styles.qtyBtn}
                                    onClick={() =>
                                      handleUpdateQuantity(
                                        cartItem.inventoryItem.id,
                                        1,
                                        isBaseUnitSelected
                                      )
                                    }
                                    disabled={isUpdatingCart}
                                    aria-label="Increase quantity"
                                  >
                                    +
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  className={styles.removeBtn}
                                  onClick={() =>
                                    handleRemoveItem(cartItem.inventoryItem.id)
                                  }
                                  disabled={isUpdatingCart}
                                >
                                  Remove
                                </button>
                              </div>
                              <div className={styles.itemActionAmount}>
                                ₹
                                {(cartItem.price * cartItem.quantity).toFixed(
                                  2
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )
              )}
            </div>
          </div>
        </div>

        {/* Totals and actions sidebar */}
        <aside className={styles.summarySidebar}>
          <div className={styles.customerBlock}>
            <button
              type="button"
              className={styles.customerToggle}
              onClick={() => setCustomerSectionOpen((o) => !o)}
              aria-expanded={customerSectionOpen}
            >
              <span className={styles.customerToggleLabel}>Customer</span>
              {customerName || customerPhone ? (
                <span className={styles.customerToggleValue}>
                  {customerName || customerPhone}
                </span>
              ) : (
                <span className={styles.customerToggleHint}>Optional</span>
              )}
              <span className={styles.customerToggleIcon}>
                {customerSectionOpen ? '▼' : '▶'}
              </span>
            </button>
            {customerSectionOpen && (
              <div className={styles.customerForm}>
                <div className={styles.customerFieldsVertical}>
                  <div className={styles.customerField}>
                    <label
                      htmlFor="sidebar-customerPhone"
                      className={styles.customerLabel}
                    >
                      Phone
                    </label>
                    <div className={styles.customerInputRow}>
                      <input
                        id="sidebar-customerPhone"
                        type="tel"
                        className={styles.customerInput}
                        placeholder="Phone"
                        value={customerPhone}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setCustomerPhone(e.currentTarget.value)
                        }
                        disabled={isSearchingCustomer}
                      />
                      <button
                        type="button"
                        className={styles.sidebarSearchBtn}
                        onClick={handleCustomerSearch}
                        disabled={isSearchingCustomer || !customerPhone.trim()}
                        title="Search customer"
                      >
                        {isSearchingCustomer ? '…' : '⌕'}
                      </button>
                    </div>
                  </div>
                  <div className={styles.customerField}>
                    <label
                      htmlFor="sidebar-customerName"
                      className={styles.customerLabel}
                    >
                      Name
                    </label>
                    <input
                      id="sidebar-customerName"
                      type="text"
                      className={styles.customerInput}
                      placeholder="Name"
                      value={customerName}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setCustomerName(e.currentTarget.value)
                      }
                    />
                  </div>
                  <div className={styles.customerField}>
                    <label
                      htmlFor="sidebar-customerEmail"
                      className={styles.customerLabel}
                    >
                      Email
                    </label>
                    <div className={styles.customerInputRow}>
                      <input
                        id="sidebar-customerEmail"
                        type="email"
                        className={styles.customerInput}
                        placeholder="Email"
                        value={customerEmail}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setCustomerEmail(e.currentTarget.value)
                        }
                        disabled={isSearchingCustomer}
                      />
                      <button
                        type="button"
                        className={styles.sidebarSearchBtn}
                        onClick={handleCustomerSearchByEmail}
                        disabled={isSearchingCustomer || !customerEmail.trim()}
                        title="Search customer by email"
                      >
                        {isSearchingCustomer ? '…' : '⌕'}
                      </button>
                    </div>
                  </div>
                  <div className={styles.customerField}>
                    <label
                      htmlFor="sidebar-customerAddress"
                      className={styles.customerLabel}
                    >
                      Address
                    </label>
                    <input
                      id="sidebar-customerAddress"
                      type="text"
                      className={styles.customerInput}
                      placeholder="Address"
                      value={customerAddress}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setCustomerAddress(e.currentTarget.value)
                      }
                    />
                  </div>
                </div>
                <div className={styles.retailerCheckboxContainer}>
                  <label className={styles.retailerCheckboxLabel}>
                    <input
                      type="checkbox"
                      checked={isRetailer}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setIsRetailer(e.currentTarget.checked);
                        if (!e.currentTarget.checked) {
                          setCustomerGstin('');
                          setCustomerDlNo('');
                          setCustomerPan('');
                        }
                      }}
                      className={styles.retailerCheckbox}
                    />
                    <span>Is Retailer</span>
                  </label>
                </div>
                {isRetailer && (
                  <div className={styles.retailerSection}>
                    <div className={styles.customerField}>
                      <label
                        htmlFor="sidebar-customerGstin"
                        className={styles.customerLabel}
                      >
                        GSTIN
                      </label>
                      <input
                        id="sidebar-customerGstin"
                        type="text"
                        className={styles.customerInput}
                        placeholder="GSTIN"
                        value={customerGstin}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setCustomerGstin(e.currentTarget.value)
                        }
                      />
                    </div>
                    <div className={styles.customerField}>
                      <label
                        htmlFor="sidebar-customerDlNo"
                        className={styles.customerLabel}
                      >
                        DL No
                      </label>
                      <input
                        id="sidebar-customerDlNo"
                        type="text"
                        className={styles.customerInput}
                        placeholder="DL No"
                        value={customerDlNo}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setCustomerDlNo(e.currentTarget.value)
                        }
                      />
                    </div>
                    <div className={styles.customerField}>
                      <label
                        htmlFor="sidebar-customerPan"
                        className={styles.customerLabel}
                      >
                        PAN
                      </label>
                      <input
                        id="sidebar-customerPan"
                        type="text"
                        className={styles.customerInput}
                        placeholder="PAN"
                        value={customerPan}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          setCustomerPan(e.currentTarget.value)
                        }
                      />
                    </div>
                  </div>
                )}
                <div className={styles.customerLinkSection}>
                  <span className={styles.customerLinkLabel}>
                    Link to StockKart user
                  </span>
                  {linkedUser ? (
                    <div className={styles.customerLinkStatus}>
                      <span>
                        Linked: {linkedUser.name} ({linkedUser.email})
                      </span>
                      <button
                        type="button"
                        className={styles.customerUnlinkBtn}
                        onClick={handleUnlinkUser}
                      >
                        Unlink
                      </button>
                    </div>
                  ) : (
                    <div className={styles.customerLinkSearch}>
                      <p className={styles.customerLinkHint}>
                        Enter email above and search to link a new customer to
                        their StockKart account.
                      </p>
                      <button
                        type="button"
                        className={styles.customerLinkSearchBtn}
                        onClick={handleSearchUserForLink}
                        disabled={isSearchingUser || !customerEmail?.trim()}
                      >
                        {isSearchingUser ? '…' : 'Search by email'}
                      </button>
                      {userSearchMessage && (
                        <span className={styles.customerLinkMessage}>
                          {userSearchMessage}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className={styles.cartSummary}>
            {isLoadingCart ? (
              <div className={styles.loading}>Loading...</div>
            ) : (
              <>
                <div className={styles.summaryRow}>
                  <span>Billing Mode</span>
                  <span>{cartBillingMode}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Subtotal</span>
                  <span>₹{calculateSubtotal().toFixed(2)}</span>
                </div>
                {cartData &&
                  cartData.saleAdditionalDiscountTotal !== undefined &&
                  cartData.saleAdditionalDiscountTotal !== null &&
                  cartData.saleAdditionalDiscountTotal !== 0 && (
                    <div className={styles.summaryRow}>
                      <span>
                        {cartData.saleAdditionalDiscountTotal > 0
                          ? 'Additional Discount'
                          : 'Additional (markup)'}
                      </span>
                      <span>
                        {cartData.saleAdditionalDiscountTotal > 0
                          ? `-₹${cartData.saleAdditionalDiscountTotal.toFixed(
                              2
                            )}`
                          : `+₹${Math.abs(
                              cartData.saleAdditionalDiscountTotal
                            ).toFixed(2)}`}
                      </span>
                    </div>
                  )}
                {cartBillingMode === 'REGULAR' &&
                  ((cartData?.taxTotal ?? 0) !== 0 ||
                    (cartData?.sgstAmount ?? 0) !== 0 ||
                    (cartData?.cgstAmount ?? 0) !== 0) && (
                    <>
                      <div className={styles.summaryRow}>
                        <span>SGST ({getSGSTPercentage()}%)</span>
                        <span>₹{calculateSGST().toFixed(2)}</span>
                      </div>
                      <div className={styles.summaryRow}>
                        <span>CGST ({getCGSTPercentage()}%)</span>
                        <span>₹{calculateCGST().toFixed(2)}</span>
                      </div>
                    </>
                  )}
                {((cartData?.taxTotal ?? 0) !== 0 ||
                  (cartData?.sgstAmount ?? 0) !== 0 ||
                  (cartData?.cgstAmount ?? 0) !== 0) && (
                  <div className={styles.summaryRow}>
                    <span>Total Tax</span>
                    <span>₹{calculateTax().toFixed(2)}</span>
                  </div>
                )}
                <div className={styles.summaryRowTotal}>
                  <span>Total</span>
                  <span>₹{calculateTotal().toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
          {cartData &&
            (cartData.totalCost != null ||
              cartData.revenueAfterTax != null ||
              cartData.totalProfit != null ||
              cartData.marginPercent != null) && (
              <div className={styles.costMarginDetail}>
                <div className={styles.summaryRow}>
                  <span>Total Cost</span>
                  <span>₹{(cartData.totalCost ?? 0).toFixed(2)}</span>
                </div>
                {cartData.revenueAfterTax != null && (
                  <div className={styles.summaryRow}>
                    <span>Revenue (after tax)</span>
                    <span>₹{cartData.revenueAfterTax.toFixed(2)}</span>
                  </div>
                )}
                {cartData.totalProfit != null && (
                  <div className={styles.summaryRow}>
                    <span>Profit</span>
                    <span>₹{cartData.totalProfit.toFixed(2)}</span>
                  </div>
                )}
                {cartData.marginPercent != null && (
                  <div className={styles.summaryRow}>
                    <span>Margin</span>
                    <span>{cartData.marginPercent.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            )}
          <div className={styles.cartActions}>
            <button className={styles.clearBtn} onClick={handleClearCart}>
              Clear Cart
            </button>
            <button
              className={styles.checkoutBtn}
              onClick={handleProcessPayment}
              disabled={
                cartItems.length === 0 ||
                isProcessing ||
                isUpdatingCart ||
                isLoadingCart
              }
            >
              {isProcessing
                ? 'Processing...'
                : isUpdatingCart
                ? 'Updating...'
                : 'Process Payment'}
            </button>
          </div>
        </aside>
      </div>

      {detailModalItem &&
        (() => {
          const apiItem = cartData?.items?.find(
            (i: CheckoutItemResponse) =>
              i.inventoryId === detailModalItem.inventoryItem.id
          );
          const inv = detailModalFullItem ?? detailModalItem.inventoryItem;
          const mrp = inv.maximumRetailPrice;
          const price = detailModalItem.price;
          const qty = detailModalItem.quantity;
          const addDisc = getEffectiveAdditionalDiscount(
            detailModalItem.inventoryItem.id,
            detailModalItem
          );
          const schemeLabel =
            detailModalItem.schemeType === 'PERCENTAGE' &&
            detailModalItem.schemePercentage != null
              ? `${detailModalItem.schemePercentage}%`
              : detailModalItem.schemePayFor != null ||
                detailModalItem.schemeFree != null
              ? `${detailModalItem.schemePayFor ?? 0} + ${
                  detailModalItem.schemeFree ?? 0
                }`
              : '—';
          return (
            <div
              className={styles.detailModalOverlay}
              onClick={() => setDetailModalItem(null)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cart-detail-modal-title"
            >
              <div
                className={styles.detailModalContent}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.detailModalHeader}>
                  <div className={styles.detailModalHeaderContent}>
                    <span className={styles.detailModalProductIcon} aria-hidden>
                      📦
                    </span>
                    <div>
                      <h3
                        id="cart-detail-modal-title"
                        className={styles.detailModalTitle}
                      >
                        {inv.name || 'Product'}
                      </h3>
                      {inv.companyName && (
                        <p className={styles.detailModalSubtitle}>
                          {inv.companyName}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.detailModalClose}
                    onClick={() => setDetailModalItem(null)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <div className={styles.detailModalBody}>
                  <div className={styles.detailModalSection}>
                    <div className={styles.detailModalSectionHeader}>
                      <span
                        className={styles.detailModalSectionIcon}
                        aria-hidden
                      >
                        📋
                      </span>
                      <h4 className={styles.detailModalSectionTitle}>
                        Product Information
                      </h4>
                    </div>
                    <div className={styles.detailModalDetailsGrid}>
                      {detailModalFullItemLoading && (
                        <div className={styles.detailModalDetailCard}>
                          <div className={styles.detailModalDetailIcon}>⏳</div>
                          <div className={styles.detailModalDetailContent}>
                            <span className={styles.detailModalDetailLabel}>
                              Loading full details
                            </span>
                            <span className={styles.detailModalDetailValue}>
                              …
                            </span>
                          </div>
                        </div>
                      )}
                      {detailModalFullItemError && (
                        <div className={styles.detailModalDetailCard}>
                          <div className={styles.detailModalDetailIcon}>⚠️</div>
                          <div className={styles.detailModalDetailContent}>
                            <span className={styles.detailModalDetailLabel}>
                              Details
                            </span>
                            <span className={styles.detailModalDetailValue}>
                              {detailModalFullItemError}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className={styles.detailModalDetailCard}>
                        <div className={styles.detailModalDetailIcon}>🏷️</div>
                        <div className={styles.detailModalDetailContent}>
                          <span className={styles.detailModalDetailLabel}>
                            Product name
                          </span>
                          <span className={styles.detailModalDetailValue}>
                            {inv.name || '—'}
                          </span>
                        </div>
                      </div>
                      {inv.companyName && (
                        <div className={styles.detailModalDetailCard}>
                          <div className={styles.detailModalDetailIcon}>🏢</div>
                          <div className={styles.detailModalDetailContent}>
                            <span className={styles.detailModalDetailLabel}>
                              Company
                            </span>
                            <span className={styles.detailModalDetailValue}>
                              {inv.companyName}
                            </span>
                          </div>
                        </div>
                      )}
                      {inv.barcode && (
                        <div className={styles.detailModalDetailCard}>
                          <div className={styles.detailModalDetailIcon}>🏷️</div>
                          <div className={styles.detailModalDetailContent}>
                            <span className={styles.detailModalDetailLabel}>
                              Barcode
                            </span>
                            <span className={styles.detailModalDetailValue}>
                              {inv.barcode}
                            </span>
                          </div>
                        </div>
                      )}
                      {inv.location && (
                        <div className={styles.detailModalDetailCard}>
                          <div className={styles.detailModalDetailIcon}>📍</div>
                          <div className={styles.detailModalDetailContent}>
                            <span className={styles.detailModalDetailLabel}>
                              Location
                            </span>
                            <span className={styles.detailModalDetailValue}>
                              {inv.location}
                            </span>
                          </div>
                        </div>
                      )}
                      {(inv.hsn || inv.batchNo) && (
                        <div className={styles.detailModalDetailCard}>
                          <div className={styles.detailModalDetailIcon}>🧾</div>
                          <div className={styles.detailModalDetailContent}>
                            <span className={styles.detailModalDetailLabel}>
                              HSN / Batch
                            </span>
                            <span className={styles.detailModalDetailValue}>
                              {[inv.hsn, inv.batchNo]
                                .filter(Boolean)
                                .join(' / ')}
                            </span>
                          </div>
                        </div>
                      )}
                      {inv.expiryDate && (
                        <div className={styles.detailModalDetailCard}>
                          <div className={styles.detailModalDetailIcon}>📅</div>
                          <div className={styles.detailModalDetailContent}>
                            <span className={styles.detailModalDetailLabel}>
                              Expiry
                            </span>
                            <span className={styles.detailModalDetailValue}>
                              {
                                new Date(inv.expiryDate)
                                  .toISOString()
                                  .split('T')[0]
                              }
                            </span>
                          </div>
                        </div>
                      )}
                      {(inv.currentCount != null ||
                        inv.currentBaseCount != null) && (
                        <div className={styles.detailModalDetailCard}>
                          <div className={styles.detailModalDetailIcon}>📦</div>
                          <div className={styles.detailModalDetailContent}>
                            <span className={styles.detailModalDetailLabel}>
                              Stock (current)
                            </span>
                            <span className={styles.detailModalDetailValue}>
                              {inv.currentCount ?? inv.currentBaseCount ?? '—'}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className={styles.detailModalDetailCard}>
                        <div className={styles.detailModalDetailIcon}>🔢</div>
                        <div className={styles.detailModalDetailContent}>
                          <span className={styles.detailModalDetailLabel}>
                            Quantity
                          </span>
                          <span className={styles.detailModalDetailValue}>
                            {qty}
                          </span>
                        </div>
                      </div>
                      <div className={styles.detailModalDetailCard}>
                        <div className={styles.detailModalDetailIcon}>🧾</div>
                        <div className={styles.detailModalDetailContent}>
                          <span className={styles.detailModalDetailLabel}>
                            Billing mode
                          </span>
                          <span className={styles.detailModalDetailValue}>
                            {normalizeBillingMode(inv.billingMode)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.detailModalSection}>
                    <div className={styles.detailModalSectionHeader}>
                      <span
                        className={styles.detailModalSectionIcon}
                        aria-hidden
                      >
                        💰
                      </span>
                      <h4 className={styles.detailModalSectionTitle}>
                        Pricing
                      </h4>
                    </div>
                    <div className={styles.detailModalPricingGrid}>
                      <div
                        className={`${styles.detailModalDetailCard} ${styles.detailModalPricingCard}`}
                      >
                        <div className={styles.detailModalDetailIcon}>💵</div>
                        <div className={styles.detailModalDetailContent}>
                          <span className={styles.detailModalDetailLabel}>
                            Selling Price
                          </span>
                          <span
                            className={`${styles.detailModalDetailValue} ${styles.detailModalPriceValue}`}
                          >
                            ₹{price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`${styles.detailModalDetailCard} ${styles.detailModalPricingCard}`}
                      >
                        <div className={styles.detailModalDetailIcon}>🏷️</div>
                        <div className={styles.detailModalDetailContent}>
                          <span className={styles.detailModalDetailLabel}>
                            MRP
                          </span>
                          <span
                            className={`${styles.detailModalDetailValue} ${styles.detailModalMrpValue}`}
                          >
                            ₹{mrp.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      {mrp > 0 && (
                        <div
                          className={`${styles.detailModalDetailCard} ${styles.detailModalPricingCard}`}
                        >
                          <div className={styles.detailModalDetailIcon}>📉</div>
                          <div className={styles.detailModalDetailContent}>
                            <span className={styles.detailModalDetailLabel}>
                              Discount off MRP
                            </span>
                            <span className={styles.detailModalDetailValue}>
                              {(((mrp - price) / mrp) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}
                      {!hidePurchaseDetailsInSell && (
                        <>
                          <div
                            className={`${styles.detailModalDetailCard} ${styles.detailModalPricingCard}`}
                          >
                            <div className={styles.detailModalDetailIcon}>
                              🏷️
                            </div>
                            <div className={styles.detailModalDetailContent}>
                              <span className={styles.detailModalDetailLabel}>
                                Purchase add. discount
                              </span>
                              <span className={styles.detailModalDetailValue}>
                                {(() => {
                                  const v = getPurchaseAdditionalDiscount(
                                    detailModalItem.inventoryItem
                                  );
                                  return v != null ? `${v}%` : '—';
                                })()}
                              </span>
                            </div>
                          </div>
                          <div
                            className={`${styles.detailModalDetailCard} ${styles.detailModalPricingCard}`}
                          >
                            <div className={styles.detailModalDetailIcon}>
                              🎁
                            </div>
                            <div className={styles.detailModalDetailContent}>
                              <span className={styles.detailModalDetailLabel}>
                                Purchase scheme/deal
                              </span>
                              <span className={styles.detailModalDetailValue}>
                                {formatPurchaseSchemeLabel(
                                  detailModalItem.inventoryItem
                                )}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                      <div
                        className={`${styles.detailModalDetailCard} ${styles.detailModalPricingCard}`}
                      >
                        <div className={styles.detailModalDetailIcon}>🏷️</div>
                        <div className={styles.detailModalDetailContent}>
                          <span className={styles.detailModalDetailLabel}>
                            Sale add. discount
                          </span>
                          <span className={styles.detailModalDetailValue}>
                            {addDisc != null ? `${addDisc}%` : '—'}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`${styles.detailModalDetailCard} ${styles.detailModalPricingCard}`}
                      >
                        <div className={styles.detailModalDetailIcon}>🎁</div>
                        <div className={styles.detailModalDetailContent}>
                          <span className={styles.detailModalDetailLabel}>
                            Sale scheme/deal
                          </span>
                          <span className={styles.detailModalDetailValue}>
                            {schemeLabel}
                          </span>
                        </div>
                      </div>
                      {normalizeBillingMode(
                        detailModalItem.inventoryItem.billingMode
                      ) === 'REGULAR' &&
                        apiItem?.sgst != null && (
                          <div
                            className={`${styles.detailModalDetailCard} ${styles.detailModalPricingCard}`}
                          >
                            <div className={styles.detailModalDetailIcon}>
                              📊
                            </div>
                            <div className={styles.detailModalDetailContent}>
                              <span className={styles.detailModalDetailLabel}>
                                SGST
                              </span>
                              <span className={styles.detailModalDetailValue}>
                                {apiItem.sgst}%
                              </span>
                            </div>
                          </div>
                        )}
                      {normalizeBillingMode(
                        detailModalItem.inventoryItem.billingMode
                      ) === 'REGULAR' &&
                        apiItem?.cgst != null && (
                          <div
                            className={`${styles.detailModalDetailCard} ${styles.detailModalPricingCard}`}
                          >
                            <div className={styles.detailModalDetailIcon}>
                              📊
                            </div>
                            <div className={styles.detailModalDetailContent}>
                              <span className={styles.detailModalDetailLabel}>
                                CGST
                              </span>
                              <span className={styles.detailModalDetailValue}>
                                {apiItem.cgst}%
                              </span>
                            </div>
                          </div>
                        )}
                      {apiItem?.discount != null && (
                        <div
                          className={`${styles.detailModalDetailCard} ${styles.detailModalPricingCard}`}
                        >
                          <div className={styles.detailModalDetailIcon}>💰</div>
                          <div className={styles.detailModalDetailContent}>
                            <span className={styles.detailModalDetailLabel}>
                              Discount (amount)
                            </span>
                            <span className={styles.detailModalDetailValue}>
                              ₹{Number(apiItem.discount).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                      <div
                        className={`${styles.detailModalDetailCard} ${styles.detailModalPricingCard}`}
                      >
                        <div className={styles.detailModalDetailIcon}>₹</div>
                        <div className={styles.detailModalDetailContent}>
                          <span className={styles.detailModalDetailLabel}>
                            Total amount
                          </span>
                          <span
                            className={`${styles.detailModalDetailValue} ${styles.detailModalTotalValue}`}
                          >
                            ₹{(apiItem?.totalAmount ?? price * qty).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {detailModalItem.inventoryItem.pricingId && (
                      <div className={styles.detailModalPricingActions}>
                        <Link
                          to={`/dashboard/price-edit/${detailModalItem.inventoryItem.pricingId}`}
                          state={{
                            priceToRetail:
                              detailModalItem.inventoryItem.priceToRetail,
                            maximumRetailPrice:
                              detailModalItem.inventoryItem.maximumRetailPrice,
                            productName: detailModalItem.inventoryItem.name,
                            rates:
                              detailModalItem.inventoryItem.rates ?? undefined,
                            defaultRate:
                              detailModalItem.inventoryItem.defaultRate ??
                              undefined,
                          }}
                          className={styles.editPriceLink}
                        >
                          Edit price
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

// Search dropdown item with full details (like original product result)
function SearchDropdownItem({
  item,
  onAddToCart,
  disabled,
}: {
  item: InventoryItem;
  onAddToCart: (item: InventoryItem, price?: number) => void;
  disabled: boolean;
}) {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    onAddToCart(item);
  };

  return (
    <li className={styles.dropdownItem} role="option">
      <div className={styles.dropdownItemInfo}>
        <span className={styles.dropdownItemName}>
          {item.name || 'Unnamed Product'}
        </span>
        <span className={styles.dropdownModeBadge}>
          {item.billingMode === 'BASIC' ? 'BASIC' : 'REGULAR'}
        </span>
        {item.companyName && (
          <span className={styles.dropdownItemCompany}>
            Company: {item.companyName}
          </span>
        )}
        {item.barcode && (
          <span className={styles.dropdownItemMeta}>
            Barcode: {item.barcode}
          </span>
        )}
        <span className={styles.dropdownItemMeta}>
          Current: {item.currentCount}
        </span>
        <span
          className={`${styles.dropdownItemMeta} ${styles.dropdownItemMetaBold}`}
        >
          MRP: ₹
          {item.maximumRetailPrice != null
            ? item.maximumRetailPrice.toFixed(2)
            : '—'}
        </span>
        <span
          className={`${styles.dropdownItemMeta} ${styles.dropdownItemMetaBold}`}
        >
          Selling: ₹
          {(item.sellingPrice ?? item.priceToRetail) != null
            ? (item.sellingPrice ?? item.priceToRetail)!.toFixed(2)
            : '—'}
        </span>
        {item.expiryDate && (
          <span
            className={`${styles.dropdownItemMeta} ${styles.dropdownItemMetaBold}`}
          >
            Expires: {formatDate(item.expiryDate)}
          </span>
        )}
      </div>
      <div className={styles.dropdownItemActions}>
        <button
          type="button"
          className={styles.dropdownAddBtn}
          onClick={handleAdd}
          disabled={disabled}
        >
          Add
        </button>
      </div>
    </li>
  );
}
