import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
  Fragment,
  ChangeEvent,
  type ReactNode,
} from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  EmptyState,
  FormField,
  Grid,
  IconButton,
  Inline,
  Input,
  Modal,
  PageHeader,
  Select,
  Stack,
  TableBody,
  TableHead,
  Text,
  AsideLayout,
  SearchDropdown,
  StickyBar,
  DenseTable,
  DenseTableSurface,
  DenseTableRow,
  DenseTableHeaderCell,
  DenseTableCell,
  denseTableClassNames,
  cn,
  productChrome,
  shellChrome,
  surfaceChrome,
  ViewModeToggle,
  Icon,
} from '@inventory-platform/ui-kit';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Banknote,
  Barcode,
  Building2,
  Calendar,
  ClipboardList,
  Gift,
  Hash,
  IndianRupee,
  Loader2,
  MapPin,
  Package,
  Percent,
  Receipt,
  Tag,
  Trash2,
  TrendingDown,
  X,
} from 'lucide-react';
import { inventoryApi, resolveInventoryDocumentId } from '../api/inventory.api';
import { cartApi } from '../api/cart.api';
import { estimatesApi } from '../api/estimates.api';
import {
  ESTIMATES_LIST_PATH,
  estimateWorkspaceHref,
  isEstimateListPath,
  isEstimateWorkspaceSearch,
  isLegacyEstimateWorkspacePath,
} from '../lib/estimatePaths';
import { rememberOpenQuotationId, readOpenQuotationId } from '../lib/sellSession';
import { sellCatalogApi } from '../api/sell-catalog.api';
import { pricingClient } from '../api/pricing-client.api';
import { gstAmountRowLabel, uniqueGstRateLabel } from '../lib/gstRateLabel';
import type {
  AvailableUnit,
  BillingMode,
  InventoryItem,
  CartResponse,
  CheckoutItemResponse,
  QuotationSummary,
} from '@inventory-platform/product/types';
import type { PricingResponse } from '@inventory-platform/contracts';
import type { CustomerResponse } from '@inventory-platform/user/types';
import type { MenuItem, SellCatalog } from '@inventory-platform/product/types';
import {
  inventoryLotIdFromSellableRef,
  inventorySellableRef,
  lineSellableRef,
  menuSellableRef,
  menuItemIdFromSellableRef,
} from '@inventory-platform/product/types';
import { CartQtyStepper } from '@inventory-platform/ui-kit';
import {
  scanSellPageShell,
  scanSellCafePageShell,
  searchRowStyle,
  searchRowCafeStyle,
  searchInputWrapperStyle,
  searchInputWrapperFocusedStyle,
  searchInputStyle,
  dropdownListStyle,
  dropdownItemStyle,
  dropdownItemNameStyle,
  cartSectionStyle,
  cartItemsStyle,
  itemEditFieldsStyle,
  itemPriceBlockStyle,
  itemSellingPriceInputStyle,
  itemAdditionalInputStyle,
  itemRateSelectStyle,
  itemUnitSelectStyle,
  itemSaleRowInlineStyle,
  cartActionsStyle,
  customerBlockStyle,
  customerBlockCafeStyle,
  customerToggleStyle,
  customerToggleValueStyle,
  customerToggleIconStyle,
  customerFormStyle,
  detailModalContentStyle,
  detailModalHeaderStyle,
  detailModalBodyStyle,
  detailModalSectionStyle,
  detailModalSectionFlushStyle,
  detailPriceValueStyle,
  detailMrpValueStyle,
  detailTotalValueStyle,
  cafeSellWorkspaceStyle,
  cafePickerColumnStyle,
  cafePickerSectionStyle,
  cafeOrderColumnStyle,
  cafeOrderPanelStyle,
  cafeOrderPanelBodyStyle,
  cafeOrderHeaderStyle,
  cafeOrderHeaderTitleStyle,
  cafeOrderListStyle,
  cafeOrderEmptyStyle,
  cafeAnalyticsStyle,
  cafeCheckoutBarInnerStyle,
  cafeCheckoutTotalRowStyle,
  cafeCheckoutTotalValueStyle,
  cafeCheckoutPayBtnStyle,
  cartLineFlushStyle,
  lineTotalAmountStyle,
  microLabelStyle,
} from '../ui/scanSellStyles';
import { CafeSellCatalogPanel } from '../ui/CafeSellCatalogPanel';
import { ScanSellMenuCartLine } from '../ui/ScanSellMenuCartLine';
import { ScanSellCafeStockLine } from '../ui/ScanSellCafeStockLine';
import { useNotify, useAuthStore, useVerticalSchemaStore } from '@inventory-platform/session';
import {
  isScanSellHidePurchaseKey,
  shouldSkipScanSellHidePurchaseKey,
} from '@inventory-platform/routing';
import {
  formatInventoryExpiryDate,
  hasInventoryExpiryDate,
  getExtensionFieldString,
  getInventoryBatchNo,
  sortInventoryByExpirySoonest,
} from '@inventory-platform/schema';
import {
  useCustomerProductHistory,
  CustomerProductHistoryHint,
  shouldShowCustomerHistorySubrow,
  PrintInvoiceModal,
  PendingCustomerSellFlow,
} from '../ui';
import { CustomerSearchPanel } from '../ui/CustomerSearchPanel';
import { ScanSellQuotationStack } from '../ui/ScanSellQuotationStack';
import type { CustomerPartyType } from '@inventory-platform/user/types';

export function meta() {
  return [
    { title: 'Scan and Sell - StockKart' },
    { name: 'description', content: 'Speed up sales with barcode scanning' },
  ];
}

type SchemeTypeCart = 'FIXED_UNITS' | 'PERCENTAGE';

const GENERAL_CUSTOMER_DISPLAY_NAME = 'General Customer';

function isGeneralCustomerName(name?: string | null): boolean {
  return (name ?? '').trim().toLowerCase() === GENERAL_CUSTOMER_DISPLAY_NAME.toLowerCase();
}

/** Header chip for the customer section — hide backend general placeholder name. */
function customerSectionSummary(name: string, phone: string): string {
  if (isGeneralCustomerName(name)) {
    return '';
  }
  return name.trim() || phone.trim();
}

/** True when a cart/checkout line represents a cafe menu item (not direct inventory). */
function isMenuLine(line: CheckoutItemResponse): boolean {
  if (line.sellMode === 'menu') return true;
  if (line.menuItemId?.trim()) return true;
  return menuItemIdFromSellableRef(lineSellableRef(line)) != null;
}

/** Rate option for the price selector: label + price */
interface RateOption {
  label: string;
  price: number;
}

/** Build available rate options from inventory item and/or pricing API response */
function getRateOptions(item: InventoryItem, pricing?: PricingResponse | null): RateOption[] {
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

function resolveInventoryBaseUnit(
  inv: Pick<InventoryItem, 'baseUnit' | 'uqc' | 'unitConversions' | 'packUnitUqc'>,
  availableUnits?: AvailableUnit[],
): string {
  const direct = inv.baseUnit?.trim();
  if (direct) return direct;
  const fromAvail = availableUnits?.find((u) => u.baseUnit)?.unit?.trim();
  if (fromAvail) return fromAvail;
  if (inv.uqc?.trim()) return inv.uqc.trim();
  return 'UNT';
}

/** e.g. "1 BTL = 50 MLT" when pack conversion is configured. */
function formatPackConversionLabel(
  inv: Pick<InventoryItem, 'baseUnit' | 'uqc' | 'unitConversions' | 'unitsPerPack' | 'packUnitUqc'>,
  availableUnits?: AvailableUnit[],
): string | null {
  const base = resolveInventoryBaseUnit(inv, availableUnits);
  const packUnit = inv.unitConversions?.unit?.trim() ?? inv.packUnitUqc?.trim() ?? null;
  const factor = inv.unitConversions?.factor ?? inv.unitsPerPack ?? null;
  if (!packUnit || factor == null || factor <= 1) return null;
  if (packUnit.toUpperCase() === base.toUpperCase()) return null;
  return `1 ${packUnit} = ${factor} ${base}`;
}

function formatCartPackagingMeta(cartItem: CartItem): string {
  const inv = cartItem.inventoryItem;
  const units = cartItem.availableUnits;
  const conv = formatPackConversionLabel(inv, units);
  const base = resolveInventoryBaseUnit(inv, units);
  const qty = cartItem.quantity;
  const unit = cartItem.unit;
  const baseQty = cartItem.baseQuantity;
  const line =
    baseQty !== qty || unit.toUpperCase() !== base.toUpperCase()
      ? `${qty} ${unit} (${baseQty} ${base})`
      : `${qty} ${unit}`;
  return conv ? `${conv} · ${line}` : line;
}

/** Format purchase scheme from inventory (registration) for the read-only hint above the sale scheme field. */
function formatPurchaseSchemeLabel(inv: InventoryItem): string {
  const schemeType = inv.purchaseSchemeType;
  const schemePercentage = inv.purchaseSchemePercentage;
  const schemePayFor = inv.purchaseSchemePayFor;
  const schemeFree = inv.purchaseSchemeFree;
  if (schemeType === 'PERCENTAGE' && schemePercentage != null) {
    return `${schemePercentage}%`;
  }
  if (schemePayFor != null || schemeFree != null) {
    return `${schemePayFor ?? 0} + ${schemeFree ?? 0}`;
  }
  return '—';
}

/**
 * What the line is billed before tax, mirroring CheckoutService: a percentage scheme cuts the
 * price per unit, a pay-for/free scheme cuts the billable quantity, and the sale DISC comes off
 * whatever is left. Without this the row read price x quantity, so a discount or a scheme only
 * showed up once it reached the bill totals.
 */
function cartLineNetAmount(item: CartItem, additionalDiscount: number | null): number {
  const price =
    item.schemeType === 'PERCENTAGE' && item.schemePercentage
      ? item.price * (1 - item.schemePercentage / 100)
      : item.price;

  const payFor = item.schemePayFor ?? 0;
  const free = item.schemeFree ?? 0;
  const billableQty =
    item.schemeType === 'FIXED_UNITS' && payFor > 0 && free >= 0 && payFor + free > 0
      ? (item.quantity * payFor) / (payFor + free)
      : item.quantity;

  const gross = price * billableQty;
  return additionalDiscount ? gross * (1 - additionalDiscount / 100) : gross;
}

/** Purchase additional discount from product registration only — never the sale DISC input. */
function getPurchaseAdditionalDiscount(inv: InventoryItem): number | null {
  return inv.purchaseAdditionalDiscount ?? null;
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
    <Input
      type="number"
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
    <Input
      id={id}
      type="number"
      className={itemSellingPriceInputStyle}
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
  const [draft, setDraft] = useState(value !== null && value !== undefined ? value.toString() : '');

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
    <Input
      id={id}
      type="number"
      className={itemAdditionalInputStyle}
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
    if (schemeType === 'PERCENTAGE' && percentage != null && percentage !== undefined) {
      return `${percentage}%`;
    }
    if ((schemeType === 'FIXED_UNITS' || schemeType == null) && (payFor != null || free != null)) {
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
    <Input
      id={id}
      type="text"
      className={itemAdditionalInputStyle}
      value={draft}
      placeholder="0, 10, 10 + 1 (number = %)"
      disabled={disabled}
      onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(e.target.value)}
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

function SummaryRow({ label, value, total }: { label: string; value: string; total?: boolean }) {
  if (total) {
    return (
      <Inline justify="between" align="end" width="full" className={productChrome.summaryRowTotal}>
        <Text as="span" className={productChrome.summaryRowTotalLabel}>
          {label}
        </Text>
        <Text as="span" className={productChrome.summaryRowTotalValue}>
          {value}
        </Text>
      </Inline>
    );
  }
  return (
    <Inline justify="between" width="full" className={productChrome.summaryRow}>
      <Text variant="caption" color="secondary">
        {label}
      </Text>
      <Text weight="medium">{value}</Text>
    </Inline>
  );
}

function DetailField({
  icon,
  label,
  children,
  pricing,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  pricing?: boolean;
}) {
  return (
    <Inline
      gap="sm"
      align="start"
      className={cn(productChrome.detailCard, pricing && productChrome.detailCardPricing)}
    >
      <Box className={productChrome.detailCardIcon} aria-hidden>
        <Icon icon={icon} size="sm" />
      </Box>
      <Stack gap="xs" flex="1" minWidth="0">
        <Text variant="caption" color="secondary" weight="semibold">
          {label}
        </Text>
        <Text weight="medium">{children}</Text>
      </Stack>
    </Inline>
  );
}

function DetailSectionHeader({ icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <Box className={productChrome.detailSectionHeader}>
      <Box className={productChrome.detailSectionIcon} aria-hidden>
        <Icon icon={icon} size="sm" />
      </Box>
      <Text variant="heading3">{title}</Text>
    </Box>
  );
}

function ProductSearchBlock({
  searchQuery,
  setSearchQuery,
  isSearching,
  showSearchDropdown,
  searchResults,
  onSearch,
  placeholder,
  autoFocus,
  onAddToCart,
  addDisabled,
  rowClassName,
  searchWrapperRef,
}: {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  isSearching: boolean;
  showSearchDropdown: boolean;
  searchResults: InventoryItem[];
  onSearch: () => void;
  placeholder: string;
  autoFocus?: boolean;
  onAddToCart: (item: InventoryItem, price?: number) => void;
  addDisabled: (item: InventoryItem) => boolean;
  rowClassName?: string;
  searchWrapperRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <Box
      position="relative"
      width="full"
      className={cn(searchRowStyle, rowClassName)}
      ref={searchWrapperRef}
      onFocusCapture={() => setSearchFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setSearchFocused(false);
        }
      }}
    >
      <Inline
        gap="sm"
        align="center"
        width="full"
        className={cn(searchInputWrapperStyle, searchFocused && searchInputWrapperFocusedStyle)}
      >
        <Input
          type="text"
          className={searchInputStyle}
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSearch();
            }
          }}
          disabled={isSearching}
          autoFocus={autoFocus}
          aria-expanded={showSearchDropdown}
          aria-haspopup="listbox"
          aria-controls="search-results-list"
        />
        <Button type="button" variant="solid" disabled={isSearching} onClick={onSearch}>
          {isSearching ? 'Searching…' : 'Search'}
        </Button>
      </Inline>
      {showSearchDropdown ? (
        <SearchDropdown id="search-results-list" role="listbox">
          {isSearching ? (
            <Box padding="md" textAlign="center">
              <Text color="secondary">Searching…</Text>
            </Box>
          ) : searchResults.length === 0 ? (
            <Box padding="md" textAlign="center">
              <Text color="secondary">No products found</Text>
            </Box>
          ) : (
            <Stack as="ul" gap="none" className={dropdownListStyle}>
              {searchResults.map((item) => (
                <SearchDropdownItem
                  key={item.id}
                  item={item}
                  onAddToCart={onAddToCart}
                  disabled={addDisabled(item)}
                />
              ))}
            </Stack>
          )}
        </SearchDropdown>
      ) : null}
    </Box>
  );
}

function CustomerSectionBlock({
  idPrefix,
  customerSectionOpen,
  setCustomerSectionOpen,
  selectedCustomer,
  summaryLabel,
  walkInName,
  onWalkInNameChange,
  onSelectCustomer,
  onClearCustomer,
  disabled,
}: {
  idPrefix: string;
  customerSectionOpen: boolean;
  setCustomerSectionOpen: (open: boolean | ((o: boolean) => boolean)) => void;
  selectedCustomer: CustomerResponse | null;
  summaryLabel: string;
  walkInName: string;
  onWalkInNameChange: (value: string) => void;
  onSelectCustomer: (customer: CustomerResponse) => void;
  onClearCustomer: () => void;
  disabled?: boolean;
}) {
  return (
    <Box className={cn(customerBlockStyle, idPrefix === 'cafe' && customerBlockCafeStyle)}>
      <Button
        type="button"
        variant="ghost"
        className={customerToggleStyle}
        onClick={() => setCustomerSectionOpen((o) => !o)}
        aria-expanded={customerSectionOpen}
      >
        <Inline gap="sm" align="center" width="full">
          <Text weight="semibold">Customer</Text>
          {summaryLabel ? (
            <Text className={customerToggleValueStyle}>{summaryLabel}</Text>
          ) : (
            <Text color="secondary" className={surfaceChrome.flexMin0}>
              Walk-in
            </Text>
          )}
          <Text className={customerToggleIconStyle}>{customerSectionOpen ? '▼' : '▶'}</Text>
        </Inline>
      </Button>
      {customerSectionOpen ? (
        <Stack gap="md" className={customerFormStyle}>
          <CustomerSearchPanel
            idPrefix={idPrefix}
            selected={selectedCustomer}
            onSelect={onSelectCustomer}
            onClear={onClearCustomer}
            disabled={disabled}
            walkInName={walkInName}
            onWalkInNameChange={onWalkInNameChange}
          />
        </Stack>
      ) : null}
    </Box>
  );
}

export function ScanSellPage({ forceEstimateMode = false }: { forceEstimateMode?: boolean }) {
  const fetchShopSchema = useVerticalSchemaStore((s) => s.fetchShopSchema);
  const activeShopId = useAuthStore((s) => s.user?.shopId ?? null);
  const [cartBusinessType, setCartBusinessType] = useState('medical');
  const isCafeSell = cartBusinessType === 'cafe';
  const [sellCatalog, setSellCatalog] = useState<SellCatalog | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const catalogLoadedForShopRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEstimateMode =
    forceEstimateMode ||
    isLegacyEstimateWorkspacePath(location.pathname) ||
    searchParams.get('mode') === 'estimate' ||
    (isEstimateListPath(location.pathname) && isEstimateWorkspaceSearch(searchParams));
  const estimatePurchaseIdParam = searchParams.get('purchaseId');
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
  const [quotations, setQuotations] = useState<QuotationSummary[]>([]);
  const [activePurchaseId, setActivePurchaseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingCart, setIsLoadingCart] = useState(true);
  const [isUpdatingCart, setIsUpdatingCart] = useState(false);
  const [printEstimateOpen, setPrintEstimateOpen] = useState(false);
  const [isConvertingEstimate, setIsConvertingEstimate] = useState(false);
  const cartLoadedRef = useRef(false);
  const isUpdatingRef = useRef(false);
  const syncVersionRef = useRef(0);
  const suppressCustomerSyncRef = useRef(false);
  const customerSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingCustomerRef = useRef(false);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPartyType, setCustomerPartyType] = useState<CustomerPartyType>('CONSUMER');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResponse | null>(null);
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerDlNo, setCustomerDlNo] = useState('');
  const [customerPan, setCustomerPan] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [customerSectionOpen, setCustomerSectionOpen] = useState(false);
  const [additionalDiscountOverrides, setAdditionalDiscountOverrides] = useState<
    Record<string, number | null>
  >({});
  const [detailModalItem, setDetailModalItem] = useState<CartItem | null>(null);
  const [detailModalFullItem, setDetailModalFullItem] = useState<InventoryItem | null>(null);
  const [detailModalFullItemLoading, setDetailModalFullItemLoading] = useState(false);
  const [detailModalFullItemError, setDetailModalFullItemError] = useState<string | null>(null);
  const [cartViewMode, setCartViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('scan-sell-view-mode');
      if (stored === 'list' || stored === 'grid') return stored;
    }
    return 'list';
  });
  /** When true, purchase scheme / purchase add. discount read-only rows are hidden in cart (sale inputs stay). */
  const [hidePurchaseDetailsInSell, setHidePurchaseDetailsInSell] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('scan-sell-hide-purchase-details') !== '0';
  });
  const [pricingCache, setPricingCache] = useState<Record<string, PricingResponse>>({});
  const [pricingLoading, setPricingLoading] = useState<Record<string, boolean>>({});
  const { error: notifyError, success: notifySuccess, info: notifyInfo } = useNotify;

  useEffect(() => {
    if (!activeShopId) {
      return;
    }
    void fetchShopSchema('regular').then((schema) => {
      if (schema?.verticalId && schema.shopId === activeShopId) {
        setCartBusinessType(schema.verticalId);
      }
    });
  }, [activeShopId, fetchShopSchema]);

  useEffect(() => {
    if (!isCafeSell) {
      setSellCatalog(null);
      catalogLoadedForShopRef.current = null;
      return;
    }
    const shopKey = activeShopId ?? '__me__';
    if (catalogLoadedForShopRef.current === shopKey) {
      return;
    }
    catalogLoadedForShopRef.current = shopKey;
    let cancelled = false;
    setIsLoadingCatalog(true);
    sellCatalogApi
      .get()
      .then((catalog) => {
        if (!cancelled) setSellCatalog(catalog);
      })
      .catch((err) => {
        if (cancelled) return;
        catalogLoadedForShopRef.current = null;
        notifyError(err instanceof Error ? err.message : 'Failed to load menu');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCatalog(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isCafeSell, activeShopId]);

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
      .getById(
        resolveInventoryDocumentId(detailModalItem.inventoryItem) ??
          detailModalItem.inventoryItem.id,
      )
      .then((inv) => {
        if (cancelled) return;
        setDetailModalFullItem(inv);
      })
      .catch((err) => {
        if (cancelled) return;
        setDetailModalFullItem(null);
        setDetailModalFullItemError(
          err instanceof Error ? err.message : 'Failed to load product details',
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

  const [inventoryToPricingId, setInventoryToPricingId] = useState<Record<string, string>>({});

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
          notifyError(err instanceof Error ? err.message : 'Failed to load inventory');
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
        const pricing = await pricingClient.getById(finalPricingId);
        setPricingCache((prev) => ({ ...prev, [finalPricingId]: pricing }));
      } catch (err) {
        notifyError(err instanceof Error ? err.message : 'Failed to load pricing');
      } finally {
        setPricingLoading((prev) => ({ ...prev, [finalPricingId]: false }));
      }
    },
    [pricingCache, pricingLoading, inventoryToPricingId, notifyError],
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
      const pricingId = item.inventoryItem.pricingId ?? inventoryToPricingId[invId];
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
        localStorage.setItem('scan-sell-hide-purchase-details', next ? '1' : '0');
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
    const state = location.state as
      | { prefillCustomer?: CustomerResponse; pickSellDestination?: boolean }
      | null
      | undefined;
    const raw = state?.prefillCustomer;
    if (!raw?.customerId) return;
    if (state?.pickSellDestination) return;
    scanSellCustomerPrefillRef.current = raw;
    // Keep the query string: the destination picker hands the chosen quotation
    // over as `?purchaseId=`, and dropping it here loses which document to open.
    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
  }, [location.state, location.pathname, location.search, navigate]);

  const normalizeBillingMode = useCallback(
    (mode?: BillingMode | null): BillingMode => (mode === 'BASIC' ? 'BASIC' : 'REGULAR'),
    [],
  );

  const toNumber = useCallback((value: unknown, fallback: number) => {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : fallback;
  }, []);

  const getAvailableUnitsFromInventory = (item: InventoryItem): AvailableUnit[] => {
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
    fallback = 1,
  ) => {
    if (!unit) return fallback;
    if (item.baseUnit && unit === item.baseUnit) return 1;
    if (item.unitConversions?.unit && unit === item.unitConversions.unit) {
      return Math.max(1, toNumber(item.unitConversions.factor, fallback));
    }
    return fallback;
  };

  /** First add defaults to sale/pack unit when a pack conversion exists (e.g. 1 PAC, not 1 TBS). */
  const getDefaultUnit = (item: InventoryItem): string => {
    const availableUnits = getAvailableUnitsFromInventory(item);
    const base = resolveInventoryBaseUnit(item, availableUnits);
    const packUnit =
      item.unitConversions?.unit?.trim() ??
      item.packUnitUqc?.trim() ??
      availableUnits.find((u) => !u.baseUnit)?.unit?.trim() ??
      null;
    const packFactor = item.unitConversions?.factor ?? item.unitsPerPack ?? null;

    if (item.sellUnitRule === 'PACK_ONLY') {
      if (packUnit) return packUnit;
      if (item.packUnitUqc) return item.packUnitUqc;
      if (item.unitConversions?.unit) return item.unitConversions.unit;
    }

    if (
      packUnit &&
      packFactor != null &&
      packFactor > 1 &&
      packUnit.toUpperCase() !== base.toUpperCase()
    ) {
      return packUnit;
    }

    if (item.baseUnit?.trim()) return item.baseUnit.trim();
    const nonBase = availableUnits.find((u) => !u.baseUnit)?.unit;
    if (nonBase) return nonBase;
    return availableUnits[0]?.unit ?? item.uqc ?? 'UNT';
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
        // Sold-out lots cannot be added to a bill, so the counter never sees them here.
        const response = await inventoryApi.search({
          q: query.trim(),
          limit: pageSize,
          includeZeroStock: false,
        });
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
              const nestedData = (response.data as { data?: InventoryItem[] }).data;
              items = Array.isArray(nestedData) ? nestedData : [];
            }
          }
        }
        if (response?.page) {
          setSearchTotalPages(response.page.totalPages);
          setSearchTotalItems(response.page.totalItems);
          setSearchPage(response.page.page);
        }
        setSearchResults(sortInventoryByExpirySoonest(items));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Search failed';
        notifyError(msg);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [searchPageSize, notifyError],
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
    [searchQuery, runSearch],
  );

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!showSearchDropdown) return;
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearchDropdown]);

  // Load cart on mount (sell quotations vs estimate workspace are different routes)
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const lastLoadCartTimeRef = useRef(0);
  const lastSellModeRef = useRef<boolean | null>(null);
  /** Dedupes concurrent estimate bootstraps (Strict Mode). */
  const estimateBootstrapRef = useRef<Promise<void> | null>(null);
  useEffect(() => {
    if (location.pathname.includes('/scan-sell') && searchParams.get('mode') === 'estimate') {
      const next = new URLSearchParams(searchParams);
      next.delete('mode');
      const purchaseId = next.get('purchaseId')?.trim();
      const fresh = next.get('fresh') === '1';
      navigate(estimateWorkspaceHref({ purchaseId: purchaseId || undefined, fresh }), {
        replace: true,
      });
      return;
    }
    const modeChanged =
      lastSellModeRef.current !== null && lastSellModeRef.current !== isEstimateMode;
    lastSellModeRef.current = isEstimateMode;
    const now = Date.now();
    if (!modeChanged && now - lastLoadCartTimeRef.current < 1500) return;
    lastLoadCartTimeRef.current = now;
    cartLoadedRef.current = true;
    void loadCart();
  }, [isEstimateMode, location.pathname]);

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
    if (isEstimateMode) {
      await initializeEstimateSession();
      return;
    }
    await initializeQuotations();
  };

  const ensureDefaultQuotation = async (): Promise<string> => {
    const cart = await cartApi.createQuotation({
      businessType: cartBusinessType,
    });
    await refreshQuotationList();
    applyCartToState(cart, []);
    return cart.purchaseId;
  };

  const syncEstimateUrl = (purchaseId: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('mode');
        next.set('purchaseId', purchaseId);
        next.delete('fresh');
        return next;
      },
      { replace: true },
    );
  };

  const createEstimateDocument = async (): Promise<string> => {
    const cart = await estimatesApi.create({
      businessType: cartBusinessType,
    });
    applyCartToState(cart, []);
    syncEstimateUrl(cart.purchaseId);
    return cart.purchaseId;
  };

  /** Prefer an existing open estimate; create only when none exist (or fresh=1). */
  const ensureDefaultEstimate = async (): Promise<string> => {
    const list = await estimatesApi.list('OPEN', { size: 100 });
    const existing = list.estimates[0];
    if (existing) {
      await loadQuotation(existing.purchaseId);
      syncEstimateUrl(existing.purchaseId);
      return existing.purchaseId;
    }
    return createEstimateDocument();
  };

  const looksLikePhone = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const digits = trimmed.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15 && /^[+]?[\d\s-]+$/.test(trimmed);
  };

  const resolveCustomerFieldsFromCart = (cart: CartResponse) => {
    let name = cart.customerName?.trim() ?? '';
    let phone = cart.customerPhone?.trim() ?? '';
    if (!phone && name && looksLikePhone(name) && !cart.customerId) {
      phone = name;
      name = '';
    }
    return {
      name,
      phone,
      email: cart.customerEmail?.trim() ?? '',
      address: cart.customerAddress?.trim() ?? '',
      customerId: cart.customerId ?? '',
      gstin: cart.customerGstin ?? '',
      dlNo: cart.customerDlNo ?? '',
      pan: cart.customerPan ?? '',
    };
  };

  const applySelectedCustomer = (customer: CustomerResponse | null) => {
    if (!customer) {
      setSelectedCustomer(null);
      setCustomerId('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerAddress('');
      setCustomerGstin('');
      setCustomerDlNo('');
      setCustomerPan('');
      setCustomerPartyType('CONSUMER');
      return;
    }
    setSelectedCustomer(customer);
    setCustomerId(customer.customerId || '');
    setCustomerName(customer.name || '');
    setCustomerPhone(customer.phone || '');
    setCustomerEmail(customer.email || '');
    setCustomerAddress(customer.address || '');
    setCustomerGstin(customer.gstin || '');
    setCustomerDlNo(customer.dlNo || '');
    setCustomerPan(customer.pan || customer.panNo || '');
    setCustomerPartyType(customer.partyType ?? 'CONSUMER');
  };

  const applyCustomerFieldsFromCart = (
    cart: CartResponse,
    typed?: {
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
      customerAddress?: string;
    },
  ) => {
    const resolved = resolveCustomerFieldsFromCart(cart);
    const nameRaw = resolved.name || typed?.customerName?.trim() || '';
    const name = isGeneralCustomerName(nameRaw) ? '' : nameRaw;
    const phone = resolved.phone || typed?.customerPhone?.trim() || '';
    const email = resolved.email || typed?.customerEmail?.trim() || '';
    const address = resolved.address || typed?.customerAddress?.trim() || '';
    const gstin = resolved.gstin;
    const dl = resolved.dlNo;
    const pan = resolved.pan;
    setCustomerName(name);
    setCustomerAddress(address);
    setCustomerPhone(phone);
    setCustomerId(resolved.customerId);
    setCustomerEmail(email);
    setCustomerGstin(gstin);
    setCustomerDlNo(dl);
    setCustomerPan(pan);
    if (resolved.customerId && (phone || email || gstin || dl || pan)) {
      setSelectedCustomer({
        customerId: resolved.customerId,
        name: name || 'Customer',
        phone: phone || '',
        email: email || null,
        address: address || null,
        gstin: gstin || null,
        dlNo: dl || null,
        pan: pan || null,
        partyType: customerPartyType,
        createdAt: '',
        updatedAt: '',
      });
    } else {
      setSelectedCustomer(null);
      if (!phone && !email && !gstin && !dl && !pan) {
        setCustomerPartyType('CONSUMER');
      }
    }
  };

  const normCustomerField = (value?: string | null) => (value ?? '').trim();

  const applyCartToState = (cart: CartResponse, previousItems: CartItem[] = []) => {
    setCartData(cart);
    setActivePurchaseId(cart.purchaseId);
    rememberOpenQuotationId(cart.purchaseId);
    applyCustomerFieldsFromCart(cart);
    setCartItems(mergeCartResponseToItems(cart, previousItems));
  };

  const refreshQuotationList = async (): Promise<QuotationSummary[]> => {
    const list = await cartApi.listQuotations();
    setQuotations(list.quotations);
    return list.quotations;
  };

  const syncCustomerToQuotation = async (overrides?: {
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    customerAddress?: string;
    customerGstin?: string;
    customerDlNo?: string;
    customerPan?: string;
    customerPartyType?: CustomerPartyType;
  }): Promise<void> => {
    if (
      suppressCustomerSyncRef.current ||
      isLoadingCart ||
      !activePurchaseId ||
      isUpdatingRef.current ||
      isSavingCustomerRef.current
    ) {
      return;
    }

    const id = overrides?.customerId ?? customerId;
    const name = overrides?.customerName ?? customerName;
    const phone = overrides?.customerPhone ?? customerPhone;
    const email = overrides?.customerEmail ?? customerEmail;
    const address = overrides?.customerAddress ?? customerAddress;
    const gstin = overrides?.customerGstin ?? customerGstin;
    const dlNo = overrides?.customerDlNo ?? customerDlNo;
    const pan = overrides?.customerPan ?? customerPan;
    const partyType = overrides?.customerPartyType ?? customerPartyType;

    const dirty =
      normCustomerField(id) !== normCustomerField(cartData?.customerId) ||
      normCustomerField(name) !== normCustomerField(cartData?.customerName) ||
      normCustomerField(phone) !== normCustomerField(cartData?.customerPhone) ||
      normCustomerField(email) !== normCustomerField(cartData?.customerEmail) ||
      normCustomerField(address) !== normCustomerField(cartData?.customerAddress) ||
      normCustomerField(gstin) !== normCustomerField(cartData?.customerGstin) ||
      normCustomerField(dlNo) !== normCustomerField(cartData?.customerDlNo) ||
      normCustomerField(pan) !== normCustomerField(cartData?.customerPan);
    if (!dirty) {
      return;
    }

    const hasCustomerInput =
      normCustomerField(id).length > 0 ||
      normCustomerField(name).length > 0 ||
      normCustomerField(phone).length > 0 ||
      normCustomerField(email).length > 0 ||
      normCustomerField(address).length > 0 ||
      normCustomerField(gstin).length > 0 ||
      normCustomerField(dlNo).length > 0 ||
      normCustomerField(pan).length > 0;
    if (!hasCustomerInput && !cartData?.customerId && !normCustomerField(cartData?.customerName)) {
      return;
    }

    isSavingCustomerRef.current = true;
    try {
      const updatedCart = await cartApi.add({
        businessType: cartBusinessType,
        purchaseId: activePurchaseId,
        items: [],
        ...(id.trim() && { customerId: id.trim() }),
        ...(name.trim() && { customerName: name.trim() }),
        ...(address.trim() && { customerAddress: address.trim() }),
        ...(phone.trim() && { customerPhone: phone.trim() }),
        ...(email.trim() && { customerEmail: email.trim() }),
        ...(gstin.trim() && { customerGstin: gstin.trim() }),
        ...(dlNo.trim() && { customerDlNo: dlNo.trim() }),
        ...(pan.trim() && { customerPan: pan.trim() }),
        ...(partyType && { customerPartyType: partyType }),
      });
      suppressCustomerSyncRef.current = true;
      setCartData(updatedCart);
      applyCustomerFieldsFromCart(updatedCart, {
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        customerAddress: address,
      });
      await refreshQuotationList();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to save customer details');
    } finally {
      isSavingCustomerRef.current = false;
      suppressCustomerSyncRef.current = false;
    }
  };

  const handleSelectCustomer = (customer: CustomerResponse) => {
    applySelectedCustomer(customer);
    setCustomerSectionOpen(true);
    void syncCustomerToQuotation({
      customerId: customer.customerId,
      customerName: customer.name || '',
      customerPhone: customer.phone || '',
      customerEmail: customer.email || '',
      customerAddress: customer.address || '',
      customerGstin: customer.gstin || '',
      customerDlNo: customer.dlNo || '',
      customerPan: customer.pan || customer.panNo || '',
      customerPartyType: customer.partyType ?? 'CONSUMER',
    });
  };

  const handleClearCustomer = () => {
    applySelectedCustomer(null);
    void syncCustomerToQuotation({
      customerId: '',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      customerGstin: '',
      customerDlNo: '',
      customerPan: '',
      customerPartyType: 'CONSUMER',
    });
  };

  const loadQuotation = async (purchaseId: string): Promise<void> => {
    suppressCustomerSyncRef.current = true;
    try {
      const cart = await cartApi.get(purchaseId);
      if (cart.documentType === 'ESTIMATE') {
        if (cart.estimateState === 'DISCARDED') {
          throw new Error('Estimate was discarded');
        }
        applyCartToState(cart, []);
        return;
      }
      if (cart.status === 'PENDING') {
        scanSellCustomerPrefillRef.current = null;
        navigate(`/dashboard/checkout?purchaseId=${encodeURIComponent(purchaseId)}`, {
          state: { purchaseId },
        });
        return;
      }
      if (cart.status !== 'CREATED') {
        throw new Error('Quotation is no longer open');
      }
      applyCartToState(cart, []);
    } finally {
      suppressCustomerSyncRef.current = false;
    }
  };

  const initializeEstimateSession = async (): Promise<void> => {
    if (isUpdatingRef.current) {
      return;
    }
    if (estimateBootstrapRef.current) {
      await estimateBootstrapRef.current;
      return;
    }

    const forceFresh = searchParams.get('fresh') === '1';
    const bootstrap = (async () => {
      setIsLoadingCart(true);
      setError(null);
      setQuotations([]);
      try {
        const targetId = estimatePurchaseIdParam?.trim() || activePurchaseId;
        if (targetId && !forceFresh) {
          await loadQuotation(targetId);
          syncEstimateUrl(targetId);
          return;
        }
        if (forceFresh) {
          await createEstimateDocument();
          return;
        }
        await ensureDefaultEstimate();
      } catch (err) {
        console.log('No estimate or error loading:', err);
        try {
          await ensureDefaultEstimate();
        } catch (createErr) {
          console.log('Failed to open estimate session:', createErr);
          setActivePurchaseId(null);
          setCartData(null);
          setCartItems([]);
        }
      } finally {
        setIsLoadingCart(false);
      }
    })();

    estimateBootstrapRef.current = bootstrap;
    try {
      await bootstrap;
    } finally {
      if (estimateBootstrapRef.current === bootstrap) {
        estimateBootstrapRef.current = null;
      }
    }
  };

  const initializeQuotations = async (): Promise<void> => {
    if (isUpdatingRef.current) {
      return;
    }

    setIsLoadingCart(true);
    setError(null);
    try {
      // In-progress checkout (PENDING) is not in the open-quotation list.
      // Resume it instead of creating a new empty cart.
      const preferredId =
        estimatePurchaseIdParam?.trim() || activePurchaseId || readOpenQuotationId() || undefined;
      if (preferredId) {
        try {
          const preferred = await cartApi.get(preferredId);
          if (preferred.status === 'PENDING') {
            navigate(`/dashboard/checkout?purchaseId=${encodeURIComponent(preferred.purchaseId)}`, {
              replace: true,
              state: { purchaseId: preferred.purchaseId },
            });
            return;
          }
        } catch {
          // Fall through to active-cart / open quotations.
        }
      }

      const activeCart = await cartApi.get().catch(() => null);
      if (activeCart?.status === 'PENDING' && activeCart.purchaseId) {
        navigate(`/dashboard/checkout?purchaseId=${encodeURIComponent(activeCart.purchaseId)}`, {
          replace: true,
          state: { purchaseId: activeCart.purchaseId },
        });
        return;
      }

      const list = await refreshQuotationList();
      if (list.length > 0) {
        const targetId =
          preferredId && list.some((q) => q.purchaseId === preferredId)
            ? preferredId
            : list[0].purchaseId;
        await loadQuotation(targetId);
        return;
      }
      await ensureDefaultQuotation();
    } catch (err) {
      console.log('No quotations or error loading:', err);
      try {
        await ensureDefaultQuotation();
      } catch (createErr) {
        console.log('Failed to create default quotation:', createErr);
        setActivePurchaseId(null);
        setCartData(null);
        setCartItems([]);
      }
    } finally {
      setIsLoadingCart(false);
    }
  };

  const handleNewQuotation = async () => {
    if (isUpdatingRef.current || isLoadingCart) {
      return;
    }
    setIsUpdatingCart(true);
    try {
      setSearchQuery('');
      setShowSearchDropdown(false);
      setError(null);
      if (customerSyncTimerRef.current) {
        clearTimeout(customerSyncTimerRef.current);
      }
      await syncCustomerToQuotation();
      await ensureDefaultQuotation();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to create quotation');
    } finally {
      setIsUpdatingCart(false);
    }
  };

  const handleSelectQuotation = async (purchaseId: string) => {
    if (purchaseId === activePurchaseId || isUpdatingRef.current) {
      return;
    }
    setIsLoadingCart(true);
    try {
      if (customerSyncTimerRef.current) {
        clearTimeout(customerSyncTimerRef.current);
      }
      await syncCustomerToQuotation();
      await loadQuotation(purchaseId);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to load quotation');
    } finally {
      setIsLoadingCart(false);
    }
  };

  const handleCancelQuotation = async (purchaseId: string) => {
    if (!window.confirm('Cancel this quotation? Reserved stock will be released.')) {
      return;
    }
    setIsUpdatingCart(true);
    try {
      await cartApi.cancelQuotation(purchaseId);
      const list = await refreshQuotationList();
      if (activePurchaseId === purchaseId) {
        if (list.length > 0) {
          await loadQuotation(list[0].purchaseId);
        } else {
          await ensureDefaultQuotation();
        }
      }
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to cancel quotation');
    } finally {
      setIsUpdatingCart(false);
    }
  };

  const ensureActiveQuotationId = async (): Promise<string | null> => {
    if (activePurchaseId) {
      return activePurchaseId;
    }
    try {
      if (isEstimateMode) {
        return await ensureDefaultEstimate();
      }
      return await ensureDefaultQuotation();
    } catch (err) {
      notifyError(
        err instanceof Error
          ? err.message
          : isEstimateMode
          ? 'Failed to open estimate'
          : 'Failed to create quotation',
      );
      return null;
    }
  };

  useEffect(() => {
    if (isLoadingCart) return;
    const c = scanSellCustomerPrefillRef.current;
    if (!c || scanSellCustomerPrefillConsumedRef.current) return;
    // The picker names its quotation in the URL, but the page only adopts it once that cart has
    // loaded. Applying the customer before then wrote it to whichever quotation happened to be
    // open, renaming that one and leaving two quotations under the same customer.
    const targetPurchaseId = estimatePurchaseIdParam?.trim();
    if (targetPurchaseId && targetPurchaseId !== activePurchaseId) return;
    scanSellCustomerPrefillConsumedRef.current = true;
    scanSellCustomerPrefillRef.current = null;
    applySelectedCustomer(c);
    setCustomerSectionOpen(true);
    void syncCustomerToQuotation({
      customerId: c.customerId ?? '',
      customerName: c.name ?? '',
      customerPhone: c.phone ?? '',
      customerEmail: c.email ?? '',
      customerAddress: c.address ?? '',
      customerGstin: c.gstin ?? '',
      customerDlNo: c.dlNo ?? '',
      customerPan: c.pan ?? c.panNo ?? '',
      customerPartyType: c.partyType ?? 'CONSUMER',
    });
    // `location.key` matters as much as the cart: arriving from the customer
    // picker is a navigation to this same route, so the cart never reloads and
    // `isLoadingCart` never changes. Keyed only on that, this effect would not
    // run again and the customer left in the ref would never be applied.
  }, [isLoadingCart, location.key, activePurchaseId, estimatePurchaseIdParam]);

  /** Build CartItem[] from cart response, reusing existing inventoryItem when possible (no API calls). */
  const mergeCartResponseToItems = useCallback(
    (cart: CartResponse, previousItems: CartItem[]): CartItem[] => {
      return cart.items
        .filter((resItem) => !isMenuLine(resItem))
        .map((resItem: CheckoutItemResponse) => {
          const existing = previousItems.find((i) => i.inventoryItem.id === resItem.inventoryId);
          const availableUnits =
            (Array.isArray(resItem.availableUnits) && resItem.availableUnits.length > 0
              ? resItem.availableUnits
              : existing?.availableUnits) ?? [];
          const inferredBaseUnit =
            resItem.baseUnit?.trim() ??
            existing?.inventoryItem.baseUnit?.trim() ??
            availableUnits.find((u) => u.baseUnit)?.unit?.trim() ??
            null;
          const packUnitUqc =
            resItem.packUnitUqc?.trim() ??
            existing?.inventoryItem.packUnitUqc?.trim() ??
            existing?.inventoryItem.unitConversions?.unit?.trim() ??
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
                (saleUnit === inferredBaseUnit ? 1 : toNumber(existing?.unitFactor, 1)),
            ),
          );
          const apiBaseQuantity = toNumber(
            resItem.baseQuantity,
            toNumber(resItem.quantity, 0) * unitFactor,
          );
          const quantity = toNumber(
            resItem.quantity,
            unitFactor > 0 ? apiBaseQuantity / unitFactor : apiBaseQuantity,
          );
          const resolvedLotId =
            resItem.inventoryId ??
            inventoryLotIdFromSellableRef(resItem.stockRef ?? resItem.sellableRef) ??
            '';
          const inventoryItem: InventoryItem = existing
            ? {
                ...existing.inventoryItem,
                saleAdditionalDiscount:
                  resItem.saleAdditionalDiscount ?? existing.inventoryItem.saleAdditionalDiscount,
                sgst: resItem.sgst ?? existing.inventoryItem.sgst,
                cgst: resItem.cgst ?? existing.inventoryItem.cgst,
                billingMode: normalizeBillingMode(
                  resItem.billingMode ?? existing.inventoryItem.billingMode,
                ),
                baseUnit: inferredBaseUnit ?? existing.inventoryItem.baseUnit,
                packUnitUqc: packUnitUqc ?? existing.inventoryItem.packUnitUqc,
                availableUnits,
                unitConversions:
                  existing.inventoryItem.unitConversions ??
                  (packUnitUqc && unitFactor > 1
                    ? { unit: packUnitUqc, factor: unitFactor }
                    : null),
                purchaseAdditionalDiscount:
                  resItem.purchaseAdditionalDiscount ??
                  existing.inventoryItem.purchaseAdditionalDiscount ??
                  null,
                purchaseSchemeType:
                  resItem.purchaseSchemeType ?? existing.inventoryItem.purchaseSchemeType ?? null,
                purchaseSchemePayFor:
                  resItem.purchaseSchemePayFor ??
                  existing.inventoryItem.purchaseSchemePayFor ??
                  null,
                purchaseSchemeFree:
                  resItem.purchaseSchemeFree ?? existing.inventoryItem.purchaseSchemeFree ?? null,
                purchaseSchemePercentage:
                  resItem.purchaseSchemePercentage ??
                  existing.inventoryItem.purchaseSchemePercentage ??
                  null,
              }
            : {
                id: resolvedLotId,
                lotId: resolvedLotId,
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
                sgst: resItem.sgst ?? null,
                cgst: resItem.cgst ?? null,
                billingMode: normalizeBillingMode(resItem.billingMode ?? cart.billingMode),
                baseUnit: inferredBaseUnit ?? undefined,
                packUnitUqc: packUnitUqc ?? undefined,
                unitConversions:
                  packUnitUqc && unitFactor > 1 ? { unit: packUnitUqc, factor: unitFactor } : null,
                availableUnits,
                pricingId: resItem.pricingId ?? undefined,
                purchaseAdditionalDiscount: resItem.purchaseAdditionalDiscount ?? null,
                purchaseSchemeType: resItem.purchaseSchemeType ?? null,
                purchaseSchemePayFor: resItem.purchaseSchemePayFor ?? null,
                purchaseSchemeFree: resItem.purchaseSchemeFree ?? null,
                purchaseSchemePercentage: resItem.purchaseSchemePercentage ?? null,
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
    [normalizeBillingMode, toNumber],
  );

  const getEffectiveAdditionalDiscount = useCallback(
    (inventoryId: string, item: CartItem) =>
      additionalDiscountOverrides[inventoryId] ?? item.inventoryItem.saleAdditionalDiscount ?? null,
    [additionalDiscountOverrides],
  );

  useEffect(() => {
    if (isLoadingCart || !activePurchaseId || suppressCustomerSyncRef.current) {
      return undefined;
    }
    if (customerSyncTimerRef.current) {
      clearTimeout(customerSyncTimerRef.current);
    }
    customerSyncTimerRef.current = setTimeout(() => {
      void syncCustomerToQuotation();
    }, 800);
    return () => {
      if (customerSyncTimerRef.current) {
        clearTimeout(customerSyncTimerRef.current);
      }
    };
  }, [
    customerId,
    customerName,
    customerEmail,
    customerAddress,
    customerPartyType,
    customerGstin,
    customerDlNo,
    customerPan,
    activePurchaseId,
    isLoadingCart,
  ]);

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
    baseQuantityDeltaMode = false,
  ) => {
    // Prevent duplicate full-cart syncs; allow item-specific updates (scheme, discount, price) so they are not dropped
    const isItemSpecificUpdate =
      schemeUpdate != null || saleAdditionalDiscountUpdate != null || priceToRetailUpdate != null;
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
    const withItemFields = (base: CartItemPayload, cartItem?: CartItem): CartItemPayload => {
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
          cartItem.schemePercentage !== undefined && cartItem.schemePercentage !== null;
        const hasUnits =
          (cartItem.schemePayFor !== undefined && cartItem.schemePayFor !== null) ||
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
      cartItem?: CartItem,
    ) => withItemFields({ id, unit, quantity, baseQuantity, priceToRetail }, cartItem);

    isUpdatingRef.current = true;
    setIsUpdatingCart(true);
    try {
      let targetPurchaseId = activePurchaseId;
      const hasPositiveQty = items.some((item) => item.quantity > 0 || item.baseQuantity > 0);
      if (!targetPurchaseId && hasPositiveQty) {
        targetPurchaseId = await ensureActiveQuotationId();
        if (!targetPurchaseId) {
          return;
        }
      }

      let itemsToSend: CartItemPayload[];

      if (priceToRetailUpdate) {
        // Only price to retail changed: send id + priceToRetail (no quantity/baseQuantity)
        const item = items.find((i) => i.inventoryItem.id === priceToRetailUpdate.inventoryId);
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
        const item = items.find((i) => i.inventoryItem.id === schemeUpdate.inventoryId);
        if (!item) {
          isUpdatingRef.current = false;
          setIsUpdatingCart(false);
          return;
        }
        const hasPercentage =
          schemeUpdate.schemePercentage !== undefined && schemeUpdate.schemePercentage !== null;
        const hasUnits =
          (schemeUpdate.schemePayFor !== undefined && schemeUpdate.schemePayFor !== null) ||
          (schemeUpdate.schemeFree !== undefined && schemeUpdate.schemeFree !== null);
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
          (i) => i.inventoryItem.id === saleAdditionalDiscountUpdate.inventoryId,
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
        const changedItem = items.find((item) => item.inventoryItem.id === changedItemId);
        if (changedItem) {
          const effectiveBaseDelta = baseQuantityDeltaMode
            ? quantityDelta
            : quantityDelta * Math.max(1, changedItem.unitFactor);
          const effectiveQuantityDelta = baseQuantityDeltaMode ? 0 : quantityDelta;
          // Send the actual delta value (1 for +, -1 for -)
          itemsToSend = [
            withAdditionalDiscount(
              changedItem.inventoryItem.id,
              changedItem.unit,
              effectiveQuantityDelta,
              effectiveBaseDelta,
              changedItem.price,
              changedItem,
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
                (ci: CheckoutItemResponse) => ci.inventoryId === changedItemId,
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
            const effectiveQuantityDelta = baseQuantityDeltaMode ? 0 : quantityDelta;
            itemsToSend = [
              withAdditionalDiscount(
                changedItemId,
                itemToRemove.unit,
                effectiveQuantityDelta,
                effectiveBaseDelta,
                itemToRemove.price,
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
                item,
              ),
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
            item,
          ),
        );
      }

      const cartPayload = {
        businessType: cartBusinessType,
        ...(targetPurchaseId && { purchaseId: targetPurchaseId }),
        items: itemsToSend,
        ...(customerName && { customerName }),
        ...(customerAddress && { customerAddress }),
        ...(customerPhone && { customerPhone }),
        ...(customerEmail && { customerEmail }),
        ...(customerId.trim() && { customerId: customerId.trim() }),
        ...(customerGstin && { customerGstin }),
        ...(customerDlNo && { customerDlNo }),
        ...(customerPan && { customerPan }),
        ...(customerPartyType && { customerPartyType }),
      };

      const updatedCart = await cartApi.add(cartPayload);
      // Only apply if no newer sync started (prevents stale response overwriting e.g. 15 with 10)
      if (thisSyncVersion !== syncVersionRef.current) return;
      setCartData(updatedCart);
      setActivePurchaseId(updatedCart.purchaseId);
      rememberOpenQuotationId(updatedCart.purchaseId);
      // Merge response into local state (no extra inventory/search API calls)
      setCartItems(mergeCartResponseToItems(updatedCart, items));
      void refreshQuotationList();
      setError(null);
    } catch (err) {
      // Handle API errors - might include stock validation errors
      const errorMessage = err instanceof Error ? err.message : 'Failed to update cart';
      if (errorMessage.includes('Cannot mix REGULAR and BASIC inventory items in a single cart')) {
        const mixedModeMessage = 'Cannot mix REGULAR and BASIC inventory items in a single cart';
        setError(mixedModeMessage);
        notifyError(mixedModeMessage);
      } else {
        notifyError(errorMessage);
      }
      // Revert to previous cart state on error by reloading cart (only if still latest sync)
      if (thisSyncVersion === syncVersionRef.current) {
        try {
          const reloadId = activePurchaseId ?? cartData?.purchaseId;
          if (!reloadId) return;
          const currentCart = await cartApi.get(reloadId);
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
    const finalPrice = price !== undefined ? price : item.sellingPrice ?? item.priceToRetail;
    const incomingMode = normalizeBillingMode(item.billingMode);
    const activeMode = normalizeBillingMode(
      cartData?.billingMode ?? cartItems[0]?.inventoryItem.billingMode,
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
      notifyError('Cannot mix REGULAR and BASIC inventory items in a single cart');
      return;
    }

    setShowSearchDropdown(false);

    setCartItems((prev) => {
      const existingItem = prev.find((cartItem) => cartItem.inventoryItem.id === item.id);

      let updatedItems: CartItem[];
      if (existingItem) {
        // Update quantity if item already in cart
        const newQuantity = existingItem.quantity + 1;
        const newBaseQuantity = existingItem.baseQuantity + existingItem.unitFactor;
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
            : cartItem,
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

  const handleUpdateQuantity = async (id: string, delta: number, isBaseUnitSelected = false) => {
    const originalItem = cartItems.find((item) => item.inventoryItem.id === id);

    if (!originalItem) return;

    const baseDelta = isBaseUnitSelected ? delta : delta * Math.max(1, originalItem.unitFactor);
    const newBaseQuantity = originalItem.baseQuantity + baseDelta;
    const factor = Math.max(1, originalItem.unitFactor);
    const newQuantity = Number((newBaseQuantity / factor).toFixed(3));

    const availableBase =
      originalItem.inventoryItem.currentBaseCount ?? originalItem.inventoryItem.currentCount;
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
      isBaseUnitSelected,
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
            : item,
        )
        .filter((item) => item.baseQuantity > 0),
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

  /**
   * Cafe menu lines are simple (no lots/units/schemes), so they bypass the
   * inventory-centric syncCartToAPI path and post deltas directly, then
   * reconcile from the server response.
   */
  const applyMenuCartDelta = async (sellableRef: string, delta: number) => {
    if (delta === 0 || isUpdatingRef.current) {
      return;
    }
    isUpdatingRef.current = true;
    setIsUpdatingCart(true);
    setError(null);
    try {
      let targetPurchaseId = activePurchaseId;
      if (!targetPurchaseId) {
        if (delta <= 0) return;
        targetPurchaseId = await ensureActiveQuotationId();
        if (!targetPurchaseId) return;
      }
      const updated = await cartApi.add({
        businessType: cartBusinessType,
        purchaseId: targetPurchaseId,
        items: [{ sellableRef, quantity: delta }],
      });
      applyCartToState(updated, cartItems);
      await refreshQuotationList();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to update order');
    } finally {
      isUpdatingRef.current = false;
      setIsUpdatingCart(false);
    }
  };

  const handleAddMenuItem = async (item: MenuItem) => {
    if (item.available === false) {
      notifyError('This item is unavailable');
      return;
    }
    setShowSearchDropdown(false);
    await applyMenuCartDelta(menuSellableRef(item.id), 1);
  };

  const handleAddDirectStock = (item: InventoryItem) => {
    void handleAddToCart(item);
  };

  const handleMenuQtyChange = (sellableRef: string, delta: number) => {
    void applyMenuCartDelta(sellableRef, delta);
  };

  const handleMenuSetQuantity = async (sellableRef: string, newQty: number) => {
    const line = (cartData?.items ?? []).find((row) => lineSellableRef(row) === sellableRef);
    if (!line) return;
    const current = Math.trunc(Number(line.quantity));
    const next = Math.trunc(newQty);
    const delta = next - current;
    if (delta === 0) return;
    await applyMenuCartDelta(sellableRef, delta);
  };

  const handleMenuRemove = (sellableRef: string) => {
    const line = (cartData?.items ?? []).find((row) => lineSellableRef(row) === sellableRef);
    if (!line) return;
    const qty = Math.trunc(Number(line.quantity));
    if (qty <= 0) return;
    void applyMenuCartDelta(sellableRef, -qty);
  };

  const handleAdditionalDiscountChange = (inventoryId: string, value: number | null) => {
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
    schemeFree: number | null,
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
          : item,
      ),
    );
    syncCartToAPI(cartItems, undefined, undefined, undefined, undefined, undefined, {
      inventoryId,
      schemePayFor,
      schemeFree,
      schemePercentage: null,
    });
  };

  const handleSchemePercentageChange = (inventoryId: string, schemePercentage: number | null) => {
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
          : item,
      ),
    );
    syncCartToAPI(cartItems, undefined, undefined, undefined, undefined, undefined, {
      inventoryId,
      schemePercentage,
      schemePayFor: null,
      schemeFree: null,
    });
  };

  const handleSellingPriceChange = (inventoryId: string, priceToRetail: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.inventoryItem.id === inventoryId ? { ...item, price: priceToRetail } : item,
      ),
    );
    syncCartToAPI(cartItems, undefined, undefined, undefined, undefined, undefined, undefined, {
      inventoryId,
      priceToRetail,
    });
  };

  const handleUnitChange = (inventoryId: string, unit: string) => {
    setCartItems((prev) => {
      const updatedItems = prev.map((item) => {
        if (item.inventoryItem.id !== inventoryId) return item;
        const nextFactor = getUnitFactorForUnit(item.inventoryItem, unit, item.unitFactor);
        const preservedBaseQty = Math.max(
          1,
          toNumber(item.baseQuantity, item.quantity * Math.max(1, item.unitFactor)),
        );
        const nextQty =
          nextFactor > 0 ? Number((preservedBaseQty / nextFactor).toFixed(3)) : preservedBaseQty;
        // Keep line total: price is always per selected unit (PAC ₹120 → TBS ₹12 when qty 10).
        const lineTotal = item.price * item.quantity;
        const nextPrice = nextQty > 0 ? Math.round((lineTotal / nextQty) * 100) / 100 : item.price;
        const next = {
          ...item,
          unit,
          unitFactor: nextFactor,
          baseQuantity: preservedBaseQty,
          quantity: nextQty,
          price: nextPrice,
        };
        return next;
      });
      syncCartToAPI(updatedItems, inventoryId, 0);
      return updatedItems;
    });
  };

  const handleClearCart = async () => {
    // Get current cart items before clearing
    const currentItems = [...cartItems];
    // Cafe menu lines are tracked on cartData, not cartItems.
    const menuRemovals = menuCartLines
      .map((line) => {
        const ref = lineSellableRef(line);
        const qty = Math.trunc(Number(line.quantity));
        if (!ref || qty <= 0) return null;
        return { sellableRef: ref, quantity: -qty };
      })
      .filter((d): d is { sellableRef: string; quantity: number } => d != null);

    // Clear local state
    setCartItems([]);
    setAdditionalDiscountOverrides({});
    setError(null);

    // Send all items with negative quantities to remove them from cart
    if (currentItems.length > 0 || menuRemovals.length > 0) {
      setIsUpdatingCart(true);
      try {
        const itemsToSend = [
          ...currentItems.map((item) => ({
            id: item.inventoryItem.id,
            unit: item.unit,
            quantity: -item.quantity, // Negative quantity to remove all
            baseQuantity: -item.baseQuantity,
            priceToRetail: item.price,
          })),
          ...menuRemovals,
        ];

        const cartPayload = {
          businessType: cartBusinessType,
          ...(activePurchaseId && { purchaseId: activePurchaseId }),
          items: itemsToSend,
          ...(customerId && { customerId }),
          ...(customerName && { customerName }),
          ...(customerAddress && { customerAddress }),
          ...(customerPhone && { customerPhone }),
          ...(customerEmail && { customerEmail }),
          ...(customerGstin && { customerGstin }),
          ...(customerDlNo && { customerDlNo }),
          ...(customerPan && { customerPan }),
          ...(customerPartyType && { customerPartyType }),
        };

        const updatedCart = await cartApi.add(cartPayload);
        setCartData(updatedCart);
        void refreshQuotationList();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to clear cart';
        notifyError(errorMessage);
        // Reload cart on error to restore state
        try {
          if (activePurchaseId) {
            await loadQuotation(activePurchaseId);
          } else {
            await initializeQuotations();
          }
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
      cartData?.subTotal ?? cartItems.reduce((total, item) => total + item.price * item.quantity, 0)
    );
  };

  const cartBillingMode = normalizeBillingMode(
    cartData?.billingMode ?? cartItems[0]?.inventoryItem.billingMode,
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

  const sgstRateLabel = uniqueGstRateLabel(
    [...(cartData?.items ?? []), ...cartItems.map((item) => item.inventoryItem)],
    'sgst',
  );
  const cgstRateLabel = uniqueGstRateLabel(
    [...(cartData?.items ?? []), ...cartItems.map((item) => item.inventoryItem)],
    'cgst',
  );

  const handleProcessPayment = async () => {
    if (isEstimateMode) {
      notifyError('Convert the estimate to an invoice before taking payment');
      return;
    }
    if (cartItems.length === 0 && menuCartLines.length === 0) {
      notifyError('Cart is empty');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let purchaseId = activePurchaseId ?? cartData?.purchaseId ?? null;
      if (!purchaseId) {
        purchaseId = await ensureActiveQuotationId();
        if (!purchaseId) {
          return;
        }
      }

      // Step 1: Call upsert API with only customer info (no items)
      const upsertPayload = {
        businessType: cartBusinessType,
        purchaseId,
        items: [], // Empty items array - only updating customer info
        ...(customerName && { customerName }),
        ...(customerAddress && { customerAddress }),
        ...(customerPhone && { customerPhone: customerPhone.trim() }),
        ...(customerEmail && { customerEmail: customerEmail.trim() }),
        ...(customerId.trim() && { customerId: customerId.trim() }),
        ...(customerGstin.trim() && { customerGstin: customerGstin.trim() }),
        ...(customerDlNo.trim() && { customerDlNo: customerDlNo.trim() }),
        ...(customerPan.trim() && { customerPan: customerPan.trim() }),
        ...(customerPartyType && { customerPartyType }),
      };

      const upsertResponse = await cartApi.add(upsertPayload);

      // Get purchaseId from upsert response or resolved id
      const finalPurchaseId = upsertResponse.purchaseId || purchaseId;

      if (!finalPurchaseId) {
        throw new Error('Purchase ID not found');
      }

      // Step 2: Call update status API with PENDING status and CASH payment method
      const statusPayload = {
        purchaseId: finalPurchaseId,
        status: 'PENDING',
        paymentMethod: 'CASH',
      };

      await cartApi.updateStatus(statusPayload);

      // Pass purchaseId so checkout loads THIS quotation (not legacy active cart)
      navigate(`/dashboard/checkout?purchaseId=${encodeURIComponent(finalPurchaseId)}`, {
        state: { purchaseId: finalPurchaseId },
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process payment';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const isEstimateEditable = !isEstimateMode || cartData?.estimateState !== 'CONVERTED';

  const handleConvertEstimate = async () => {
    const estimateId = activePurchaseId ?? cartData?.purchaseId;
    if (!estimateId) {
      notifyError('No estimate to convert');
      return;
    }
    if (cartItems.length === 0 && menuCartLines.length === 0) {
      notifyError('Add items before converting');
      return;
    }
    setIsConvertingEstimate(true);
    try {
      await syncCustomerToQuotation();
      const result = await estimatesApi.convert(estimateId);
      navigate(`/dashboard/scan-sell?purchaseId=${encodeURIComponent(result.salePurchaseId)}`);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to convert estimate');
    } finally {
      setIsConvertingEstimate(false);
    }
  };

  const menuCartLines = useMemo(
    () => (cartData?.items ?? []).filter((line) => isMenuLine(line)),
    [cartData],
  );

  const cartSellableRefs = useMemo(
    () => [
      ...cartItems.map((item) => inventorySellableRef(item.inventoryItem.id)),
      ...menuCartLines
        .map((line) => lineSellableRef(line))
        .filter((ref): ref is string => Boolean(ref)),
    ],
    [cartItems, menuCartLines],
  );

  const { data: customerProductHistory, loading: customerProductHistoryLoading } =
    useCustomerProductHistory({
      customerId,
      customerPhone,
      sellableRefs: cartSellableRefs,
      excludePurchaseId: cartData?.purchaseId,
      enabled: cartItems.length > 0 || menuCartLines.length > 0,
    });

  const cafeOrderItemCount = useMemo(
    () =>
      menuCartLines.reduce((sum, line) => sum + line.quantity, 0) +
      cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [menuCartLines, cartItems],
  );

  const renderCafeOrderLines = () => {
    if (isLoadingCart) {
      return (
        <Text color="secondary" className={cafeOrderEmptyStyle}>
          Loading order…
        </Text>
      );
    }
    if (menuCartLines.length === 0 && cartItems.length === 0) {
      return <EmptyState title="Tap menu or stock items to start an order" />;
    }
    return (
      <>
        {menuCartLines.map((line) => (
          <ScanSellMenuCartLine
            key={lineSellableRef(line) ?? line.name}
            line={line}
            disabled={isUpdatingCart}
            customerProductHistory={customerProductHistory}
            customerProductHistoryLoading={customerProductHistoryLoading}
            onChangeQty={handleMenuQtyChange}
            onSetQuantity={handleMenuSetQuantity}
            onRemove={handleMenuRemove}
          />
        ))}
        {cartItems.map((cartItem) => {
          const lineTotal = cartItem.price * cartItem.quantity;
          const unitLabel = `${cartItem.quantity} ${cartItem.unit}`;
          return (
            <ScanSellCafeStockLine
              key={cartItem.inventoryItem.id}
              name={cartItem.inventoryItem.name || 'Product'}
              inventoryId={cartItem.inventoryItem.id}
              unitLabel={unitLabel}
              price={cartItem.price}
              quantity={cartItem.quantity}
              lineTotal={lineTotal}
              disabled={isUpdatingCart}
              customerProductHistory={customerProductHistory}
              customerProductHistoryLoading={customerProductHistoryLoading}
              onChangeQty={(delta) => {
                void handleUpdateQuantity(cartItem.inventoryItem.id, delta, false);
              }}
              onSetQuantity={async (newQty) => {
                const delta = newQty - cartItem.quantity;
                if (delta !== 0) {
                  await handleUpdateQuantity(cartItem.inventoryItem.id, delta, false);
                }
              }}
              onRemove={() => void handleRemoveItem(cartItem.inventoryItem.id)}
            />
          );
        })}
      </>
    );
  };

  const renderCafeCheckoutBar = () => (
    <StickyBar fixed className={productChrome.stickySurface}>
      <Inline className={cafeCheckoutBarInnerStyle} justify="between" align="center" width="full">
        <Stack gap="xs">
          {isLoadingCart ? (
            <Text color="secondary">Loading…</Text>
          ) : (
            <>
              <SummaryRow label="Subtotal" value={`₹${calculateSubtotal().toFixed(2)}`} />
              {((cartData?.taxTotal ?? 0) !== 0 ||
                (cartData?.sgstAmount ?? 0) !== 0 ||
                (cartData?.cgstAmount ?? 0) !== 0) && (
                <SummaryRow label="Tax" value={`₹${calculateTax().toFixed(2)}`} />
              )}
              <Inline justify="between" width="full" className={cafeCheckoutTotalRowStyle}>
                <Text weight="bold">Total</Text>
                <Text weight="bold" className={cafeCheckoutTotalValueStyle}>
                  ₹{calculateTotal().toFixed(2)}
                </Text>
              </Inline>
            </>
          )}
        </Stack>
        <Inline gap="sm" flexShrink={0}>
          <Button
            type="button"
            variant="outline"
            className={shellChrome.nowrap}
            onClick={() => void handleClearCart()}
            disabled={isUpdatingCart || isLoadingCart || !isEstimateEditable}
          >
            Clear Cart
          </Button>
          {isEstimateMode ? (
            <>
              <Button
                type="button"
                variant="outline"
                className={shellChrome.nowrap}
                disabled={
                  !activePurchaseId ||
                  (cartItems.length === 0 && menuCartLines.length === 0) ||
                  isUpdatingCart ||
                  isLoadingCart
                }
                onClick={() => setPrintEstimateOpen(true)}
              >
                Print
              </Button>
              <Button
                type="button"
                variant="solid"
                className={cafeCheckoutPayBtnStyle}
                onClick={() => void handleConvertEstimate()}
                disabled={
                  !isEstimateEditable ||
                  (cartItems.length === 0 && menuCartLines.length === 0) ||
                  isConvertingEstimate ||
                  isUpdatingCart ||
                  isLoadingCart
                }
              >
                {isConvertingEstimate ? 'Converting…' : 'Convert to invoice'}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="solid"
              className={cafeCheckoutPayBtnStyle}
              onClick={() => void handleProcessPayment()}
              disabled={
                (cartItems.length === 0 && menuCartLines.length === 0) ||
                isProcessing ||
                isUpdatingCart ||
                isLoadingCart
              }
            >
              {isProcessing ? 'Processing…' : isUpdatingCart ? 'Updating…' : 'Process Payment'}
            </Button>
          )}
        </Inline>
      </Inline>
    </StickyBar>
  );

  return (
    <Stack
      gap="md"
      maxWidth={isCafeSell ? undefined : 'xl'}
      mx={isCafeSell ? undefined : 'auto'}
      className={isCafeSell ? scanSellCafePageShell : scanSellPageShell}
    >
      <PendingCustomerSellFlow sellPath={location.pathname} />
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <PageHeader
        description={
          isEstimateMode
            ? 'Build a printable estimate (with tax when products are Regular), then convert to invoice'
            : isCafeSell
            ? 'Tap menu items or direct stock to build the order'
            : 'Speed up sales with barcode scanning'
        }
        actions={
          isEstimateMode ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(ESTIMATES_LIST_PATH)}
            >
              All estimates
            </Button>
          ) : undefined
        }
      />

      {isEstimateMode && cartData?.estimateNo ? (
        <Inline gap="sm" align="center" flexWrap>
          <Badge variant="info">{cartData.estimateNo}</Badge>
          {cartData.estimateState === 'CONVERTED' ? (
            <Badge variant="neutral">Converted — reprint only</Badge>
          ) : (
            <Text variant="caption" color="secondary">
              Estimates do not reserve stock. Convert to invoice when the customer confirms.
            </Text>
          )}
        </Inline>
      ) : null}

      {isLoadingCart ? (
        <CenteredLoader label="Loading…" />
      ) : (
        <>
          {!isEstimateMode ? (
            <ScanSellQuotationStack
              quotations={quotations}
              activePurchaseId={activePurchaseId}
              disabled={isUpdatingCart || isLoadingCart}
              onSelect={handleSelectQuotation}
              onNew={handleNewQuotation}
              onCancel={handleCancelQuotation}
            />
          ) : null}

          {isCafeSell ? (
            <>
              <Box flex="1" minHeight="0">
                <Inline className={cafeSellWorkspaceStyle} align="start" width="full">
                  <Box display="flex" className={cafePickerColumnStyle}>
                    <Stack
                      gap="md"
                      bg="elevated"
                      border
                      rounded="lg"
                      padding="md"
                      className={cafePickerSectionStyle}
                    >
                      <ProductSearchBlock
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        isSearching={isSearching}
                        showSearchDropdown={showSearchDropdown}
                        searchResults={searchResults}
                        onSearch={() => handleSearchSubmit()}
                        placeholder="Filter menu, or search more products…"
                        onAddToCart={handleAddToCart}
                        rowClassName={searchRowCafeStyle}
                        searchWrapperRef={searchWrapperRef}
                        addDisabled={(item) =>
                          item.currentCount <= 0 ||
                          (item.sellingPrice ?? item.priceToRetail) == null ||
                          isUpdatingCart
                        }
                      />
                      <CafeSellCatalogPanel
                        catalog={sellCatalog}
                        loading={isLoadingCatalog}
                        disabled={isUpdatingCart || isLoadingCart}
                        filterQuery={searchQuery}
                        onAddMenuItem={(item) => void handleAddMenuItem(item)}
                        onAddDirectStock={handleAddDirectStock}
                      />
                    </Stack>
                  </Box>

                  <Box as="aside" className={cafeOrderColumnStyle}>
                    <CustomerSectionBlock
                      idPrefix="cafe"
                      customerSectionOpen={customerSectionOpen}
                      setCustomerSectionOpen={setCustomerSectionOpen}
                      selectedCustomer={selectedCustomer}
                      summaryLabel={customerSectionSummary(customerName, customerPhone)}
                      walkInName={customerName}
                      onWalkInNameChange={setCustomerName}
                      onSelectCustomer={handleSelectCustomer}
                      onClearCustomer={handleClearCustomer}
                      disabled={isUpdatingCart || isLoadingCart}
                    />

                    <Card className={cafeOrderPanelStyle}>
                      <CardBody className={cafeOrderPanelBodyStyle}>
                        <Inline
                          justify="between"
                          align="center"
                          width="full"
                          className={cafeOrderHeaderStyle}
                        >
                          <Text as="h3" className={cafeOrderHeaderTitleStyle}>
                            Current order
                          </Text>
                          <Badge variant="neutral">
                            {cafeOrderItemCount} item
                            {cafeOrderItemCount === 1 ? '' : 's'}
                          </Badge>
                        </Inline>
                        <Stack gap="md" className={cafeOrderListStyle}>
                          {renderCafeOrderLines()}
                        </Stack>
                      </CardBody>
                    </Card>

                    {/* Same figures as the Margins block below, in the cafe layout —
                        hidden by `~` too, or the numbers would just leak here instead. */}
                    {!hidePurchaseDetailsInSell &&
                      cartData &&
                      (cartData.totalCost != null ||
                        cartData.revenueAfterTax != null ||
                        cartData.totalProfit != null ||
                        cartData.marginPercent != null) && (
                        <Stack
                          gap="xs"
                          padding="md"
                          border
                          rounded="md"
                          bg="surface"
                          className={cafeAnalyticsStyle}
                        >
                          <SummaryRow
                            label="Total Cost"
                            value={`₹${(cartData.totalCost ?? 0).toFixed(2)}`}
                          />
                          {cartData.revenueAfterTax != null && (
                            <SummaryRow
                              label="Revenue (after tax)"
                              value={`₹${cartData.revenueAfterTax.toFixed(2)}`}
                            />
                          )}
                          {cartData.totalProfit != null && (
                            <SummaryRow
                              label="Profit"
                              value={`₹${cartData.totalProfit.toFixed(2)}`}
                            />
                          )}
                          {cartData.marginPercent != null && (
                            <SummaryRow
                              label="Margin"
                              value={`${cartData.marginPercent.toFixed(1)}%`}
                            />
                          )}
                        </Stack>
                      )}
                  </Box>
                </Inline>
              </Box>
              {renderCafeCheckoutBar()}
            </>
          ) : (
            <AsideLayout
              main={
                <Box display="flex" flex="1" minWidth="0">
                  <Stack
                    gap="md"
                    bg="elevated"
                    border
                    rounded="lg"
                    padding="lg"
                    className={cartSectionStyle}
                  >
                    <ProductSearchBlock
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      isSearching={isSearching}
                      showSearchDropdown={showSearchDropdown}
                      searchResults={searchResults}
                      onSearch={() => handleSearchSubmit()}
                      placeholder="Search products..."
                      autoFocus
                      onAddToCart={handleAddToCart}
                      searchWrapperRef={searchWrapperRef}
                      addDisabled={(item) =>
                        item.currentCount <= 0 ||
                        (item.sellingPrice ?? item.priceToRetail) == null ||
                        isUpdatingCart
                      }
                    />

                    {cartItems.length > 0 ? (
                      <Inline gap="sm" align="center" mb="md" flexShrink={0}>
                        <ViewModeToggle
                          value={cartViewMode}
                          aria-label="Cart view mode"
                          onChange={(mode) => {
                            setCartViewMode(mode);
                            localStorage.setItem('scan-sell-view-mode', mode);
                          }}
                        />
                      </Inline>
                    ) : null}

                    <Box className={cartItemsStyle}>
                      {isLoadingCart ? (
                        <CenteredLoader label="Loading cart..." />
                      ) : cartItems.length === 0 ? (
                        <Box padding="lg">
                          <EmptyState title="Cart is empty" />
                        </Box>
                      ) : cartViewMode === 'grid' ? (
                        <DenseTable>
                          <DenseTableSurface>
                            <TableHead>
                              <DenseTableRow>
                                <DenseTableHeaderCell>#</DenseTableHeaderCell>
                                <DenseTableHeaderCell>Product</DenseTableHeaderCell>
                                <DenseTableHeaderCell>Unit</DenseTableHeaderCell>
                                <DenseTableHeaderCell>Qty</DenseTableHeaderCell>
                                <DenseTableHeaderCell>Price</DenseTableHeaderCell>
                                <DenseTableHeaderCell>Disc</DenseTableHeaderCell>
                                <DenseTableHeaderCell>Scheme</DenseTableHeaderCell>
                                <DenseTableHeaderCell>Amount</DenseTableHeaderCell>
                                <DenseTableHeaderCell
                                  aria-label="Actions"
                                  className={productChrome.rowActionsCell}
                                />
                              </DenseTableRow>
                            </TableHead>
                            <TableBody>
                              {cartItems.map((cartItem, idx) => {
                                const isPackOnlySale =
                                  cartItem.inventoryItem.sellUnitRule === 'PACK_ONLY';
                                const isBaseUnitSelected =
                                  !isPackOnlySale &&
                                  ((cartItem.inventoryItem.baseUnit != null &&
                                    cartItem.unit === cartItem.inventoryItem.baseUnit) ||
                                    cartItem.availableUnits.some(
                                      (u) => u.baseUnit && u.unit === cartItem.unit,
                                    ));
                                const quantityInputValue = isBaseUnitSelected
                                  ? cartItem.baseQuantity
                                  : cartItem.quantity;
                                const lineTotal = cartLineNetAmount(
                                  cartItem,
                                  getEffectiveAdditionalDiscount(
                                    cartItem.inventoryItem.id,
                                    cartItem,
                                  ),
                                );
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
                                const pricing = pricingId ? pricingCache[pricingId] : undefined;
                                const rateOpts = getRateOptions(cartItem.inventoryItem, pricing);
                                const showRateDropdown =
                                  pricingId || cartItem.inventoryItem.id || rateOpts.length > 1;
                                const matched = rateOpts.find(
                                  (o) => Math.abs(o.price - cartItem.price) < 0.01,
                                );
                                const isLoading =
                                  pricingLoading[pricingId ?? ''] ||
                                  pricingLoading[`inv:${cartItem.inventoryItem.id}`];
                                const showHistorySubrow = shouldShowCustomerHistorySubrow(
                                  inventorySellableRef(cartItem.inventoryItem.id),
                                  customerProductHistory,
                                  customerProductHistoryLoading,
                                );
                                return (
                                  <Fragment key={cartItem.inventoryItem.id}>
                                    <DenseTableRow>
                                      <DenseTableCell>{idx + 1}</DenseTableCell>
                                      <DenseTableCell>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          className={denseTableClassNames.productBtn}
                                          onClick={() => setDetailModalItem(cartItem)}
                                        >
                                          {cartItem.inventoryItem.name || '—'}
                                        </Button>
                                      </DenseTableCell>
                                      <DenseTableCell>
                                        <Select
                                          className={denseTableClassNames.select}
                                          value={cartItem.unit}
                                          onChange={(e) =>
                                            handleUnitChange(
                                              cartItem.inventoryItem.id,
                                              e.currentTarget.value,
                                            )
                                          }
                                          disabled={
                                            isUpdatingCart ||
                                            cartItem.inventoryItem.sellUnitRule === 'PACK_ONLY'
                                          }
                                          options={(cartItem.availableUnits.length > 0
                                            ? cartItem.availableUnits
                                            : [{ unit: cartItem.unit, baseUnit: false }]
                                          ).map((uo) => ({
                                            value: uo.unit,
                                            label: `${uo.unit}${uo.baseUnit ? ' (base)' : ''}`,
                                          }))}
                                        />
                                      </DenseTableCell>
                                      <DenseTableCell>
                                        <Box className={denseTableClassNames.cellInput}>
                                          <CartQuantityInput
                                            value={quantityInputValue}
                                            disabled={isUpdatingCart}
                                            onCommit={async (newQty) => {
                                              const delta = newQty - quantityInputValue;
                                              if (delta !== 0) {
                                                await handleUpdateQuantity(
                                                  cartItem.inventoryItem.id,
                                                  delta,
                                                  isBaseUnitSelected,
                                                );
                                              }
                                            }}
                                          />
                                        </Box>
                                      </DenseTableCell>
                                      <DenseTableCell>
                                        <Stack gap="xs" className={denseTableClassNames.priceCell}>
                                          <CartSellingPriceInput
                                            value={cartItem.price}
                                            onCommit={(n) =>
                                              handleSellingPriceChange(cartItem.inventoryItem.id, n)
                                            }
                                            disabled={isUpdatingCart}
                                          />
                                          {showRateDropdown ? (
                                            <Select
                                              className={denseTableClassNames.rateSelect}
                                              value={matched ? matched.label : '__custom__'}
                                              onChange={(e) => {
                                                const sel = e.target.value;
                                                if (sel === '__custom__') return;
                                                const opt = rateOpts.find((o) => o.label === sel);
                                                if (opt)
                                                  handleSellingPriceChange(
                                                    cartItem.inventoryItem.id,
                                                    opt.price,
                                                  );
                                              }}
                                              onMouseDown={() =>
                                                loadPricingOnDropdownClick(
                                                  cartItem.inventoryItem.pricingId ?? undefined,
                                                  cartItem.inventoryItem.id,
                                                )
                                              }
                                              disabled={isUpdatingCart || isLoading}
                                              options={[
                                                { value: '__custom__', label: 'Custom' },
                                                ...rateOpts.map((opt) => ({
                                                  value: opt.label,
                                                  label: `${opt.label} (${formatPrice(opt.price)})`,
                                                })),
                                              ]}
                                            />
                                          ) : null}
                                        </Stack>
                                      </DenseTableCell>
                                      <DenseTableCell>
                                        <Stack gap="xs">
                                          {!hidePurchaseDetailsInSell ? (
                                            <Text
                                              variant="caption"
                                              className={productChrome.microLabel}
                                            >
                                              {(() => {
                                                const v = getPurchaseAdditionalDiscount(
                                                  cartItem.inventoryItem,
                                                );
                                                return v != null ? `${v}%` : '—';
                                              })()}
                                            </Text>
                                          ) : null}
                                          <Box className={productChrome.fontSemibold}>
                                            <CartAdditionalDiscountInput
                                              value={getEffectiveAdditionalDiscount(
                                                cartItem.inventoryItem.id,
                                                cartItem,
                                              )}
                                              onCommit={(n) =>
                                                handleAdditionalDiscountChange(
                                                  cartItem.inventoryItem.id,
                                                  n,
                                                )
                                              }
                                              disabled={isUpdatingCart}
                                            />
                                          </Box>
                                        </Stack>
                                      </DenseTableCell>
                                      <DenseTableCell>
                                        <Stack gap="xs">
                                          {!hidePurchaseDetailsInSell ? (
                                            <Text
                                              variant="caption"
                                              className={productChrome.microLabel}
                                            >
                                              {formatPurchaseSchemeLabel(cartItem.inventoryItem)}
                                            </Text>
                                          ) : null}
                                          <Box className={productChrome.fontSemibold}>
                                            <CartSchemeInput
                                              schemeType={cartItem.schemeType ?? null}
                                              payFor={cartItem.schemePayFor ?? null}
                                              free={cartItem.schemeFree ?? null}
                                              percentage={cartItem.schemePercentage ?? null}
                                              onCommitUnits={(pf, f) =>
                                                handleSchemeChange(cartItem.inventoryItem.id, pf, f)
                                              }
                                              onCommitPercentage={(p) =>
                                                handleSchemePercentageChange(
                                                  cartItem.inventoryItem.id,
                                                  p,
                                                )
                                              }
                                              disabled={isUpdatingCart}
                                            />
                                          </Box>
                                        </Stack>
                                      </DenseTableCell>
                                      <DenseTableCell>{formatPrice(lineTotal)}</DenseTableCell>
                                      <DenseTableCell className={productChrome.rowActionsCell}>
                                        <IconButton
                                          type="button"
                                          size="sm"
                                          className={productChrome.rowRemoveButton}
                                          onClick={() =>
                                            handleRemoveItem(cartItem.inventoryItem.id)
                                          }
                                          disabled={isUpdatingCart}
                                          label={`Remove ${cartItem.inventoryItem.name || 'item'}`}
                                          title="Remove"
                                        >
                                          <Icon icon={Trash2} size="sm" />
                                        </IconButton>
                                      </DenseTableCell>
                                    </DenseTableRow>
                                    {showHistorySubrow ? (
                                      <DenseTableRow className={productChrome.historySubrowTr}>
                                        <DenseTableCell
                                          colSpan={9}
                                          className={productChrome.historySubrowCell}
                                        >
                                          <CustomerProductHistoryHint
                                            variant="subrow"
                                            sellableRef={inventorySellableRef(
                                              cartItem.inventoryItem.id,
                                            )}
                                            history={customerProductHistory}
                                            loading={customerProductHistoryLoading}
                                          />
                                        </DenseTableCell>
                                      </DenseTableRow>
                                    ) : null}
                                  </Fragment>
                                );
                              })}
                            </TableBody>
                          </DenseTableSurface>
                        </DenseTable>
                      ) : (
                        cartItems.map((cartItem) =>
                          (() => {
                            const isBaseUnitSelected =
                              (cartItem.inventoryItem.baseUnit != null &&
                                cartItem.unit === cartItem.inventoryItem.baseUnit) ||
                              cartItem.availableUnits.some(
                                (unitOption) =>
                                  unitOption.baseUnit && unitOption.unit === cartItem.unit,
                              );
                            const quantityInputValue = isBaseUnitSelected
                              ? cartItem.baseQuantity
                              : cartItem.quantity;
                            return (
                              <Card key={cartItem.inventoryItem.id} className={cartLineFlushStyle}>
                                <CardBody className={productChrome.cartLineBody}>
                                  <Stack gap="md" flex="1" minWidth="0">
                                    <Stack gap="xs">
                                      <Inline
                                        gap="sm"
                                        align="center"
                                        justify="between"
                                        width="full"
                                        flexWrap
                                      >
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          className={productChrome.cartLineName}
                                          onClick={() => setDetailModalItem(cartItem)}
                                          aria-label="View pricing details"
                                        >
                                          {cartItem.inventoryItem.name || 'Unnamed Product'}
                                        </Button>
                                        <Badge variant="info">
                                          {normalizeBillingMode(cartItem.inventoryItem.billingMode)}
                                        </Badge>
                                      </Inline>
                                      {cartItem.inventoryItem.companyName ? (
                                        <Text variant="caption" color="secondary">
                                          {cartItem.inventoryItem.companyName}
                                        </Text>
                                      ) : null}
                                      <CustomerProductHistoryHint
                                        sellableRef={inventorySellableRef(
                                          cartItem.inventoryItem.id,
                                        )}
                                        history={customerProductHistory}
                                        loading={customerProductHistoryLoading}
                                      />
                                      <Inline gap="sm" align="center" flexWrap>
                                        <Text variant="caption" color="secondary">
                                          {formatCartPackagingMeta(cartItem)}
                                        </Text>
                                      </Inline>
                                      {cartItem.inventoryItem.maximumRetailPrice >
                                      cartItem.price ? (
                                        <Text variant="caption" color="success">
                                          {(
                                            ((cartItem.inventoryItem.maximumRetailPrice -
                                              cartItem.price) /
                                              cartItem.inventoryItem.maximumRetailPrice) *
                                            100
                                          ).toFixed(1)}
                                          % off MRP
                                        </Text>
                                      ) : null}
                                    </Stack>
                                    <Inline align="start" gap="lg" width="full" flexWrap>
                                      <Stack gap="md" className={itemEditFieldsStyle}>
                                        <FormField
                                          label="Price"
                                          id={`price-${cartItem.inventoryItem.id}`}
                                        >
                                          <Inline
                                            gap="sm"
                                            align="center"
                                            width="full"
                                            className={itemPriceBlockStyle}
                                          >
                                            <CartSellingPriceInput
                                              id={`price-${cartItem.inventoryItem.id}`}
                                              value={cartItem.price}
                                              onCommit={(num) =>
                                                handleSellingPriceChange(
                                                  cartItem.inventoryItem.id,
                                                  num,
                                                )
                                              }
                                              disabled={isUpdatingCart}
                                            />
                                            <Text
                                              variant="caption"
                                              color="secondary"
                                              className={microLabelStyle}
                                            >
                                              per {cartItem.unit}
                                            </Text>
                                            {(() => {
                                              const pricingId =
                                                cartItem.inventoryItem.pricingId ??
                                                inventoryToPricingId[cartItem.inventoryItem.id];
                                              const pricing = pricingId
                                                ? pricingCache[pricingId]
                                                : undefined;
                                              const invId = cartItem.inventoryItem.id;
                                              const isLoading =
                                                pricingLoading[pricingId ?? ''] ||
                                                pricingLoading[`inv:${invId}`];
                                              const rateOpts = getRateOptions(
                                                cartItem.inventoryItem,
                                                pricing,
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
                                                (o) => Math.abs(o.price - cartItem.price) < 0.01,
                                              );
                                              const selectValue = matched
                                                ? matched.label
                                                : '__custom__';
                                              // Never switch select value to loading - keep current selection to avoid flicker
                                              const displayValue =
                                                isLoading && rateOpts.length === 0
                                                  ? '__custom__'
                                                  : selectValue;
                                              const selectedOpt = rateOpts.find(
                                                (o) => o.label === displayValue,
                                              );
                                              return (
                                                <Select
                                                  className={itemRateSelectStyle}
                                                  value={displayValue}
                                                  onChange={(e) => {
                                                    const sel = e.target.value;
                                                    if (sel === '__custom__') return;
                                                    const opt = rateOpts.find(
                                                      (o) => o.label === sel,
                                                    );
                                                    if (opt) {
                                                      handleSellingPriceChange(
                                                        cartItem.inventoryItem.id,
                                                        opt.price,
                                                      );
                                                    }
                                                  }}
                                                  onMouseDown={() => {
                                                    loadPricingOnDropdownClick(
                                                      cartItem.inventoryItem.pricingId ?? undefined,
                                                      invId,
                                                    );
                                                  }}
                                                  disabled={isUpdatingCart || isLoading}
                                                  aria-label={
                                                    isLoading
                                                      ? 'Loading rates'
                                                      : selectedOpt
                                                      ? `Rate: ${selectedOpt.label}, ${formatPrice(
                                                          selectedOpt.price,
                                                        )}`
                                                      : 'Select selling rate'
                                                  }
                                                  options={[
                                                    { value: '__custom__', label: 'Custom' },
                                                    ...rateOpts.map((opt) => ({
                                                      value: opt.label,
                                                      label: `${opt.label} · ${formatPrice(
                                                        opt.price,
                                                      )}`,
                                                    })),
                                                  ]}
                                                />
                                              );
                                            })()}
                                          </Inline>
                                        </FormField>
                                        <Inline
                                          className={itemSaleRowInlineStyle}
                                          gap="md"
                                          align="start"
                                        >
                                          <FormField label="Disc">
                                            <Stack gap="xs">
                                              {!hidePurchaseDetailsInSell ? (
                                                <Text
                                                  variant="caption"
                                                  className={productChrome.microLabel}
                                                >
                                                  {(() => {
                                                    const v = getPurchaseAdditionalDiscount(
                                                      cartItem.inventoryItem,
                                                    );
                                                    return v != null ? `${v}%` : '—';
                                                  })()}
                                                </Text>
                                              ) : null}
                                              <Box className={productChrome.fontSemibold}>
                                                <CartAdditionalDiscountInput
                                                  value={getEffectiveAdditionalDiscount(
                                                    cartItem.inventoryItem.id,
                                                    cartItem,
                                                  )}
                                                  onCommit={(num) =>
                                                    handleAdditionalDiscountChange(
                                                      cartItem.inventoryItem.id,
                                                      num,
                                                    )
                                                  }
                                                  disabled={isUpdatingCart}
                                                />
                                              </Box>
                                            </Stack>
                                          </FormField>

                                          <FormField label="Scheme">
                                            <Stack gap="xs">
                                              {!hidePurchaseDetailsInSell ? (
                                                <Text
                                                  variant="caption"
                                                  className={productChrome.microLabel}
                                                >
                                                  {formatPurchaseSchemeLabel(
                                                    cartItem.inventoryItem,
                                                  )}
                                                </Text>
                                              ) : null}
                                              <Box className={productChrome.fontSemibold}>
                                                <CartSchemeInput
                                                  schemeType={cartItem.schemeType ?? null}
                                                  payFor={cartItem.schemePayFor ?? null}
                                                  free={cartItem.schemeFree ?? null}
                                                  percentage={cartItem.schemePercentage ?? null}
                                                  onCommitUnits={(pf, f) =>
                                                    handleSchemeChange(
                                                      cartItem.inventoryItem.id,
                                                      pf,
                                                      f,
                                                    )
                                                  }
                                                  onCommitPercentage={(p) =>
                                                    handleSchemePercentageChange(
                                                      cartItem.inventoryItem.id,
                                                      p,
                                                    )
                                                  }
                                                  disabled={isUpdatingCart}
                                                />
                                              </Box>
                                            </Stack>
                                          </FormField>

                                          <FormField label="Unit">
                                            <Select
                                              className={itemUnitSelectStyle}
                                              value={cartItem.unit}
                                              onChange={(e) =>
                                                handleUnitChange(
                                                  cartItem.inventoryItem.id,
                                                  e.currentTarget.value,
                                                )
                                              }
                                              disabled={isUpdatingCart}
                                              options={(cartItem.availableUnits.length > 0
                                                ? cartItem.availableUnits
                                                : [
                                                    {
                                                      unit: cartItem.unit,
                                                      baseUnit: false,
                                                    },
                                                  ]
                                              ).map((unitOption) => ({
                                                value: unitOption.unit,
                                                label: `${unitOption.unit}${
                                                  unitOption.baseUnit ? ' (base)' : ''
                                                }`,
                                              }))}
                                            />
                                          </FormField>
                                        </Inline>
                                      </Stack>
                                      <Stack
                                        gap="sm"
                                        align="end"
                                        flexShrink={0}
                                        className={productChrome.mlAuto}
                                      >
                                        <Inline gap="sm" align="center">
                                          <CartQtyStepper
                                            value={quantityInputValue}
                                            disabled={isUpdatingCart}
                                            onDecrement={() =>
                                              handleUpdateQuantity(
                                                cartItem.inventoryItem.id,
                                                -1,
                                                isBaseUnitSelected,
                                              )
                                            }
                                            onIncrement={() =>
                                              handleUpdateQuantity(
                                                cartItem.inventoryItem.id,
                                                1,
                                                isBaseUnitSelected,
                                              )
                                            }
                                            onCommit={async (newQty) => {
                                              const delta = newQty - quantityInputValue;
                                              if (delta !== 0) {
                                                await handleUpdateQuantity(
                                                  cartItem.inventoryItem.id,
                                                  delta,
                                                  isBaseUnitSelected,
                                                );
                                              }
                                            }}
                                          />
                                          <IconButton
                                            type="button"
                                            size="sm"
                                            className={cn(
                                              surfaceChrome.flexShrink0,
                                              productChrome.rowRemoveButton,
                                            )}
                                            onClick={() =>
                                              handleRemoveItem(cartItem.inventoryItem.id)
                                            }
                                            disabled={isUpdatingCart}
                                            label={`Remove ${
                                              cartItem.inventoryItem.name || 'item'
                                            }`}
                                            title="Remove"
                                          >
                                            <Icon icon={Trash2} size="sm" />
                                          </IconButton>
                                        </Inline>
                                        <Text weight="semibold" className={lineTotalAmountStyle}>
                                          ₹
                                          {cartLineNetAmount(
                                            cartItem,
                                            getEffectiveAdditionalDiscount(
                                              cartItem.inventoryItem.id,
                                              cartItem,
                                            ),
                                          ).toFixed(2)}
                                        </Text>
                                      </Stack>
                                    </Inline>
                                  </Stack>
                                </CardBody>
                              </Card>
                            );
                          })(),
                        )
                      )}
                    </Box>
                  </Stack>
                </Box>
              }
              aside={
                <Stack
                  as="aside"
                  gap="md"
                  bg="elevated"
                  border
                  rounded="lg"
                  padding="lg"
                  className={productChrome.billingAside}
                >
                  <Box className={productChrome.billingAsideHeader}>
                    <Text as="h3" className={productChrome.billingAsideTitle}>
                      Bill summary
                    </Text>
                    <Text as="p" className={productChrome.billingAsideHint}>
                      Customer, totals, and checkout
                    </Text>
                  </Box>
                  <CustomerSectionBlock
                    idPrefix="sidebar"
                    customerSectionOpen={customerSectionOpen}
                    setCustomerSectionOpen={setCustomerSectionOpen}
                    selectedCustomer={selectedCustomer}
                    summaryLabel={customerSectionSummary(customerName, customerPhone)}
                    walkInName={customerName}
                    onWalkInNameChange={setCustomerName}
                    onSelectCustomer={handleSelectCustomer}
                    onClearCustomer={handleClearCustomer}
                    disabled={isUpdatingCart || isLoadingCart}
                  />

                  <Stack gap="xs" className={productChrome.sectionDivider}>
                    {isLoadingCart ? (
                      <CenteredLoader label="Loading..." />
                    ) : (
                      <>
                        <SummaryRow label="Billing Mode" value={cartBillingMode} />
                        <SummaryRow label="Subtotal" value={`₹${calculateSubtotal().toFixed(2)}`} />
                        {cartData &&
                          cartData.saleAdditionalDiscountTotal !== undefined &&
                          cartData.saleAdditionalDiscountTotal !== null &&
                          cartData.saleAdditionalDiscountTotal !== 0 && (
                            <SummaryRow
                              label={
                                cartData.saleAdditionalDiscountTotal > 0
                                  ? 'Additional Discount'
                                  : 'Additional (markup)'
                              }
                              value={
                                cartData.saleAdditionalDiscountTotal > 0
                                  ? `-₹${cartData.saleAdditionalDiscountTotal.toFixed(2)}`
                                  : `+₹${Math.abs(cartData.saleAdditionalDiscountTotal).toFixed(2)}`
                              }
                            />
                          )}
                        {cartBillingMode === 'REGULAR' &&
                          ((cartData?.taxTotal ?? 0) !== 0 ||
                            (cartData?.sgstAmount ?? 0) !== 0 ||
                            (cartData?.cgstAmount ?? 0) !== 0) && (
                            <>
                              <SummaryRow
                                label={gstAmountRowLabel('SGST', sgstRateLabel)}
                                value={`₹${calculateSGST().toFixed(2)}`}
                              />
                              <SummaryRow
                                label={gstAmountRowLabel('CGST', cgstRateLabel)}
                                value={`₹${calculateCGST().toFixed(2)}`}
                              />
                            </>
                          )}
                        {((cartData?.taxTotal ?? 0) !== 0 ||
                          (cartData?.sgstAmount ?? 0) !== 0 ||
                          (cartData?.cgstAmount ?? 0) !== 0) && (
                          <SummaryRow label="Total Tax" value={`₹${calculateTax().toFixed(2)}`} />
                        )}
                        <SummaryRow label="Total" value={`₹${calculateTotal().toFixed(2)}`} total />
                      </>
                    )}
                  </Stack>
                  {/* Cost, profit and margin are purchase-side figures, so they hide behind
                      the same `~` toggle as purchase scheme and purchase discount — the
                      point of that key is keeping them off a customer-facing screen. */}
                  {!hidePurchaseDetailsInSell &&
                    cartData &&
                    (cartData.totalCost != null ||
                      cartData.revenueAfterTax != null ||
                      cartData.totalProfit != null ||
                      cartData.marginPercent != null) && (
                      <Stack gap="xs" className={productChrome.sectionDivider}>
                        <Text as="p" className={productChrome.billingAnalyticsLabel}>
                          Margins
                        </Text>
                        <SummaryRow
                          label="Total Cost"
                          value={`₹${(cartData.totalCost ?? 0).toFixed(2)}`}
                        />
                        {cartData.revenueAfterTax != null && (
                          <SummaryRow
                            label="Revenue (after tax)"
                            value={`₹${cartData.revenueAfterTax.toFixed(2)}`}
                          />
                        )}
                        {cartData.totalProfit != null && (
                          <SummaryRow
                            label="Profit"
                            value={`₹${cartData.totalProfit.toFixed(2)}`}
                          />
                        )}
                        {cartData.marginPercent != null && (
                          <SummaryRow
                            label="Margin"
                            value={`${cartData.marginPercent.toFixed(1)}%`}
                          />
                        )}
                      </Stack>
                    )}
                  <Inline gap="sm" width="full" className={cartActionsStyle}>
                    <Button
                      type="button"
                      variant="outline"
                      className={surfaceChrome.flexMin0}
                      onClick={handleClearCart}
                      disabled={!isEstimateEditable}
                    >
                      Clear Cart
                    </Button>
                    {isEstimateMode ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className={surfaceChrome.flexMin0}
                          disabled={
                            !activePurchaseId ||
                            (cartItems.length === 0 && menuCartLines.length === 0) ||
                            isUpdatingCart ||
                            isLoadingCart
                          }
                          onClick={() => setPrintEstimateOpen(true)}
                        >
                          Print estimate
                        </Button>
                        <Button
                          type="button"
                          variant="solid"
                          className={productChrome.flexGrow2}
                          onClick={() => void handleConvertEstimate()}
                          disabled={
                            !isEstimateEditable ||
                            (cartItems.length === 0 && menuCartLines.length === 0) ||
                            isConvertingEstimate ||
                            isUpdatingCart ||
                            isLoadingCart
                          }
                        >
                          {isConvertingEstimate ? 'Converting…' : 'Convert to invoice'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="solid"
                        className={productChrome.flexGrow2}
                        onClick={handleProcessPayment}
                        disabled={
                          (cartItems.length === 0 && menuCartLines.length === 0) ||
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
                      </Button>
                    )}
                  </Inline>
                </Stack>
              }
            />
          )}
        </>
      )}

      {detailModalItem
        ? (() => {
            const apiItem = cartData?.items?.find(
              (i: CheckoutItemResponse) => i.inventoryId === detailModalItem.inventoryItem.id,
            );
            const inv = detailModalFullItem ?? detailModalItem.inventoryItem;
            const mrp = inv.maximumRetailPrice;
            const price = detailModalItem.price;
            const qty = detailModalItem.quantity;
            const addDisc = getEffectiveAdditionalDiscount(
              detailModalItem.inventoryItem.id,
              detailModalItem,
            );
            const schemeLabel =
              detailModalItem.schemeType === 'PERCENTAGE' &&
              detailModalItem.schemePercentage != null
                ? `${detailModalItem.schemePercentage}%`
                : detailModalItem.schemePayFor != null || detailModalItem.schemeFree != null
                ? `${detailModalItem.schemePayFor ?? 0} + ${detailModalItem.schemeFree ?? 0}`
                : '—';
            return (
              <Modal
                open
                onClose={() => setDetailModalItem(null)}
                size="lg"
                className={detailModalContentStyle}
              >
                <Inline
                  className={detailModalHeaderStyle}
                  justify="between"
                  align="center"
                  width="full"
                >
                  <Inline gap="md" align="center" flex="1">
                    <Box className={productChrome.detailModalHeroIcon} aria-hidden>
                      <Icon icon={Package} size="md" />
                    </Box>
                    <Stack gap="xs">
                      <Text variant="heading3">{inv.name || 'Product'}</Text>
                      {inv.companyName ? <Text color="secondary">{inv.companyName}</Text> : null}
                    </Stack>
                  </Inline>
                  <IconButton label="Close" onClick={() => setDetailModalItem(null)}>
                    <Icon icon={X} size="sm" />
                  </IconButton>
                </Inline>
                <Modal.Body>
                  <Stack gap="lg" className={detailModalBodyStyle}>
                    <Stack gap="md" className={detailModalSectionStyle}>
                      <DetailSectionHeader icon={ClipboardList} title="Product Information" />
                      <Grid columns={2}>
                        {detailModalFullItemLoading ? (
                          <DetailField icon={Loader2} label="Loading full details">
                            …
                          </DetailField>
                        ) : null}
                        {detailModalFullItemError ? (
                          <DetailField icon={AlertTriangle} label="Details">
                            {detailModalFullItemError}
                          </DetailField>
                        ) : null}
                        <DetailField icon={Tag} label="Product name">
                          {inv.name || '—'}
                        </DetailField>
                        {inv.companyName ? (
                          <DetailField icon={Building2} label="Company">
                            {inv.companyName}
                          </DetailField>
                        ) : null}
                        {inv.barcode ? (
                          <DetailField icon={Barcode} label="Barcode">
                            {inv.barcode}
                          </DetailField>
                        ) : null}
                        {inv.location ? (
                          <DetailField icon={MapPin} label="Location">
                            {inv.location}
                          </DetailField>
                        ) : null}
                        {inv.hsn || inv.batchNo ? (
                          <DetailField icon={Receipt} label="HSN / Batch">
                            {[inv.hsn, getExtensionFieldString(inv, 'batchNo')]
                              .filter(Boolean)
                              .join(' / ')}
                          </DetailField>
                        ) : null}
                        {hasInventoryExpiryDate(inv) ? (
                          <DetailField icon={Calendar} label="Expiry">
                            {formatInventoryExpiryDate(inv)}
                          </DetailField>
                        ) : null}
                        {inv.currentCount != null || inv.currentBaseCount != null ? (
                          <DetailField icon={Package} label="Stock (current)">
                            {inv.currentCount ?? inv.currentBaseCount ?? '—'}
                          </DetailField>
                        ) : null}
                        <DetailField icon={Hash} label="Quantity">
                          {qty}
                        </DetailField>
                        <DetailField icon={Receipt} label="Billing mode">
                          {normalizeBillingMode(inv.billingMode)}
                        </DetailField>
                      </Grid>
                    </Stack>
                    <Stack gap="md" className={detailModalSectionFlushStyle}>
                      <DetailSectionHeader icon={IndianRupee} title="Pricing" />
                      <Grid columns={2} gap="md">
                        <DetailField icon={Banknote} label="Selling Price" pricing>
                          <Text className={detailPriceValueStyle}>₹{price.toFixed(2)}</Text>
                        </DetailField>
                        <DetailField icon={Tag} label="MRP" pricing>
                          <Text className={detailMrpValueStyle}>₹{mrp.toFixed(2)}</Text>
                        </DetailField>
                        {mrp > 0 ? (
                          <DetailField icon={TrendingDown} label="Discount off MRP" pricing>
                            {(((mrp - price) / mrp) * 100).toFixed(1)}%
                          </DetailField>
                        ) : null}
                        {!hidePurchaseDetailsInSell ? (
                          <>
                            <DetailField icon={Percent} label="Purchase add. discount" pricing>
                              {(() => {
                                const v = getPurchaseAdditionalDiscount(
                                  detailModalItem.inventoryItem,
                                );
                                return v != null ? `${v}%` : '—';
                              })()}
                            </DetailField>
                            <DetailField icon={Gift} label="Purchase scheme/deal" pricing>
                              {formatPurchaseSchemeLabel(detailModalItem.inventoryItem)}
                            </DetailField>
                          </>
                        ) : null}
                        <DetailField icon={Percent} label="Sale add. discount" pricing>
                          {addDisc != null ? `${addDisc}%` : '—'}
                        </DetailField>
                        <DetailField icon={Gift} label="Sale scheme/deal" pricing>
                          {schemeLabel}
                        </DetailField>
                        {normalizeBillingMode(detailModalItem.inventoryItem.billingMode) ===
                          'REGULAR' && apiItem?.sgst != null ? (
                          <DetailField icon={Percent} label="SGST" pricing>
                            {apiItem.sgst}%
                          </DetailField>
                        ) : null}
                        {normalizeBillingMode(detailModalItem.inventoryItem.billingMode) ===
                          'REGULAR' && apiItem?.cgst != null ? (
                          <DetailField icon={Percent} label="CGST" pricing>
                            {apiItem.cgst}%
                          </DetailField>
                        ) : null}
                        {apiItem?.discount != null ? (
                          <DetailField icon={IndianRupee} label="Discount (amount)" pricing>
                            ₹{Number(apiItem.discount).toFixed(2)}
                          </DetailField>
                        ) : null}
                        <DetailField icon={IndianRupee} label="Total amount" pricing>
                          <Text className={detailTotalValueStyle}>
                            ₹{(apiItem?.totalAmount ?? price * qty).toFixed(2)}
                          </Text>
                        </DetailField>
                      </Grid>
                      {detailModalItem.inventoryItem.pricingId ? (
                        <Box mt="md">
                          <Link
                            to={`/dashboard/price-edit/${detailModalItem.inventoryItem.pricingId}`}
                            state={{
                              priceToRetail: detailModalItem.inventoryItem.priceToRetail,
                              maximumRetailPrice: detailModalItem.inventoryItem.maximumRetailPrice,
                              productName: detailModalItem.inventoryItem.name,
                              rates: detailModalItem.inventoryItem.rates ?? undefined,
                              defaultRate: detailModalItem.inventoryItem.defaultRate ?? undefined,
                            }}
                          >
                            <Text color="primary">Edit price</Text>
                          </Link>
                        </Box>
                      ) : null}
                    </Stack>
                  </Stack>
                </Modal.Body>
              </Modal>
            );
          })()
        : null}

      {(() => {
        const printId = activePurchaseId ?? cartData?.purchaseId;
        if (!printEstimateOpen || !printId) return null;
        return (
          <PrintInvoiceModal
            isOpen
            onClose={() => setPrintEstimateOpen(false)}
            purchaseId={printId}
            invoiceNo={cartData?.estimateNo ?? undefined}
            documentLabel="Estimate"
            onError={(message) => notifyError(message)}
            onSuccess={(message) => notifySuccess(message)}
            onInfo={(message) => notifyInfo(message)}
          />
        );
      })()}
    </Stack>
  );
}

function SearchDropdownItem({
  item,
  onAddToCart,
  disabled,
}: {
  item: InventoryItem;
  onAddToCart: (item: InventoryItem, price?: number) => void;
  disabled: boolean;
}) {
  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    onAddToCart(item);
  };

  // The batch sits on the line for some verticals and in the extension fields
  // for others, so read it through the helper that knows both. It answers '—'
  // when there is none, which suits a fixed table row but not a card line.
  const rawBatchNo = getInventoryBatchNo(item);
  const batchNo = rawBatchNo && rawBatchNo !== '—' ? rawBatchNo : '';

  return (
    <Inline as="li" justify="between" align="start" gap="md" className={dropdownItemStyle}>
      <Stack gap="xs" flex="1" minWidth="0">
        <Inline gap="sm" align="center">
          <Text weight="semibold" className={dropdownItemNameStyle}>
            {item.name || 'Unnamed Product'}
          </Text>
          <Badge variant="info">{item.billingMode === 'BASIC' ? 'BASIC' : 'REGULAR'}</Badge>
        </Inline>
        {item.companyName ? (
          <Text variant="caption" color="secondary" truncate>
            Company: {item.companyName}
          </Text>
        ) : null}
        {batchNo ? (
          <Text variant="caption" color="secondary" truncate>
            Batch: {batchNo}
          </Text>
        ) : null}
        {item.barcode ? (
          <Text variant="caption" color="secondary" truncate>
            Barcode: {item.barcode}
          </Text>
        ) : null}
        <Text variant="caption" color="secondary" truncate>
          Current: {item.currentCount}
        </Text>
        <Text variant="caption" weight="semibold" truncate>
          MRP: ₹{item.maximumRetailPrice != null ? item.maximumRetailPrice.toFixed(2) : '—'}
        </Text>
        <Text variant="caption" weight="semibold" truncate>
          Selling: ₹
          {(item.sellingPrice ?? item.priceToRetail) != null
            ? (item.sellingPrice ?? item.priceToRetail)!.toFixed(2)
            : '—'}
        </Text>
        {hasInventoryExpiryDate(item) ? (
          <Text variant="caption" weight="semibold" truncate>
            Expires: {formatInventoryExpiryDate(item)}
          </Text>
        ) : null}
      </Stack>
      <Button type="button" variant="solid" size="sm" onClick={handleAdd} disabled={disabled}>
        Add
      </Button>
    </Inline>
  );
}
