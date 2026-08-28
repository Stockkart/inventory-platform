import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { userLookupApi } from '@inventory-platform/user/users';
import { cartApi, sellCatalogApi } from '@inventory-platform/product/api';
import { customersApi } from '@inventory-platform/user/customers';
import type { CartResponse } from '@inventory-platform/product/types';
import type { MenuItem, SellCatalog, ShopMenu } from '@inventory-platform/plugin-cafe/types';
import { lineSellableRef, menuSellableRef } from '@inventory-platform/product/types';
import { useNotify, useVerticalSchemaStore } from '@inventory-platform/session';
import {
  CustomerProductHistoryHint,
  PendingCustomerSellFlow,
  useCustomerProductHistory,
} from '@inventory-platform/product';
import {
  cartActionsStyle,
  cartItemsStyle,
  cartLineFlushStyle,
  cartSectionStyle,
  customerBlockStyle,
  customerFormStyle,
  customerInputStyle,
  customerToggleIconStyle,
  customerToggleStyle,
  customerToggleValueStyle,
  dropdownItemNameStyle,
  dropdownItemStyle,
  dropdownListStyle,
  flexGrow2Style,
  menuSellPageShell,
  searchInputStyle,
  searchInputWrapperFocusedStyle,
  searchInputWrapperStyle,
  searchRowStyle,
  sectionDividerStyle,
  sectionDividerLgStyle,
  sidebarSearchBtnStyle,
  summaryRowStyle,
  summaryRowTotalStyle,
} from '../menuSellStyles';
import {
  Alert,
  AsideLayout,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  Checkbox,
  CartQtyStepper,
  EmptyState,
  FormField,
  IconButton,
  Inline,
  Input,
  PageHeader,
  SearchDropdown,
  Stack,
  Text,
  cn,
  surfaceChrome,
} from '@inventory-platform/ui-kit';

export function meta() {
  return [{ title: 'Sell - StockKart' }, { name: 'description', content: 'Sell menu items' }];
}

type FlatMenuItem = MenuItem & { sectionTitle: string };

type SellSearchHit = { kind: 'menu'; item: FlatMenuItem };

function money(n: number): string {
  return `₹${n.toFixed(2)}`;
}

function flattenMenu(menu: ShopMenu | null): FlatMenuItem[] {
  if (!menu?.sections) return [];
  return menu.sections.flatMap((section) =>
    (section.items ?? []).map((item) => ({
      ...item,
      sectionTitle: section.title,
    })),
  );
}

function catalogToSearchHits(catalog: SellCatalog | null): SellSearchHit[] {
  if (!catalog) return [];
  return flattenMenu(catalog.menu)
    .filter((item) => item.available !== false)
    .map((item) => ({ kind: 'menu' as const, item }));
}

function SummaryRow({ label, value, total }: { label: string; value: string; total?: boolean }) {
  if (total) {
    return (
      <Inline justify="between" width="full" className={summaryRowTotalStyle}>
        <Text weight="bold">{label}</Text>
        <Text weight="bold">{value}</Text>
      </Inline>
    );
  }
  return (
    <Inline justify="between" width="full" className={summaryRowStyle}>
      <Text color="secondary">{label}</Text>
      <Text color="secondary">{value}</Text>
    </Inline>
  );
}

function MenuSearchDropdownItem({
  item,
  onAdd,
  disabled,
}: {
  item: FlatMenuItem;
  onAdd: (item: MenuItem) => void;
  disabled: boolean;
}) {
  return (
    <Inline
      as="li"
      justify="between"
      align="start"
      gap="md"
      className={dropdownItemStyle}
      role="option"
    >
      <Stack gap="xs" flex="1" minWidth="0">
        <Text weight="semibold" className={dropdownItemNameStyle}>
          {item.name || 'Unnamed item'}
        </Text>
        <Text variant="caption" color="secondary" truncate>
          {item.sectionTitle}
        </Text>
        <Text variant="caption" color="secondary" weight="semibold" truncate>
          Price: {money(item.sellingPrice)}
        </Text>
      </Stack>
      <Button
        type="button"
        variant="solid"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          onAdd(item);
        }}
        disabled={disabled || item.available === false}
      >
        Add
      </Button>
    </Inline>
  );
}

export function MenuSellPage() {
  const navigate = useNavigate();
  const { error: notifyError } = useNotify;
  const fetchShopSchema = useVerticalSchemaStore((s) => s.fetchShopSchema);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);

  const [businessType, setBusinessType] = useState('cafe');
  const [searchCatalog, setSearchCatalog] = useState<SellCatalog | null>(null);
  const [cartData, setCartData] = useState<CartResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [customerSectionOpen, setCustomerSectionOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState('');
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
  const [userSearchMessage, setUserSearchMessage] = useState<string | null>(null);
  const [isSearchingUser, setIsSearchingUser] = useState(false);

  useEffect(() => {
    void fetchShopSchema('regular').then((schema) => {
      if (schema?.verticalId) {
        setBusinessType(schema.verticalId);
      }
    });
  }, [fetchShopSchema]);

  const loadPage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const cart = await cartApi.get().catch(() => null);
      setSearchCatalog(null);
      if (cart && cart.status === 'PENDING') {
        const purchaseId = cart.purchaseId;
        if (purchaseId) {
          navigate(`/dashboard/checkout?purchaseId=${encodeURIComponent(purchaseId)}`, {
            state: { purchaseId },
          });
        } else {
          navigate('/dashboard/checkout');
        }
        return;
      }
      if (cart && cart.status !== 'COMPLETED') {
        setCartData(cart);
        setCustomerName(cart.customerName || '');
        setCustomerAddress(cart.customerAddress || '');
        setCustomerPhone(cart.customerPhone || '');
        setCustomerId(cart.customerId || '');
        setCustomerEmail(cart.customerEmail || '');
        const hasRetailerFields = !!(cart.customerGstin || cart.customerDlNo || cart.customerPan);
        setIsRetailer(hasRetailerFields);
        setCustomerGstin(cart.customerGstin || '');
        setCustomerDlNo(cart.customerDlNo || '');
        setCustomerPan(cart.customerPan || '');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load menu';
      setError(message);
      notifyError(message);
    } finally {
      setIsLoading(false);
    }
  }, [navigate, notifyError]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showSearchDropdown &&
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(event.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearchDropdown]);

  const searchResults = useMemo(() => catalogToSearchHits(searchCatalog), [searchCatalog]);

  const runSearch = useCallback(
    async (q: string) => {
      setIsSearching(true);
      setError(null);
      try {
        const result = await sellCatalogApi.get(q);
        setSearchCatalog(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Search failed';
        setError(message);
        notifyError(message);
        setSearchCatalog(null);
      } finally {
        setIsSearching(false);
      }
    },
    [notifyError],
  );

  const customerPayload = useCallback(
    () => ({
      ...(customerName.trim() && { customerName: customerName.trim() }),
      ...(customerAddress.trim() && { customerAddress: customerAddress.trim() }),
      ...(customerPhone.trim() && { customerPhone: customerPhone.trim() }),
      ...(customerEmail.trim() && { customerEmail: customerEmail.trim() }),
      ...(isRetailer && customerGstin.trim() && { customerGstin: customerGstin.trim() }),
      ...(isRetailer && customerDlNo.trim() && { customerDlNo: customerDlNo.trim() }),
      ...(isRetailer && customerPan.trim() && { customerPan: customerPan.trim() }),
      ...(linkedUser && { customerUserId: linkedUser.userId }),
    }),
    [
      customerName,
      customerAddress,
      customerPhone,
      customerEmail,
      isRetailer,
      customerGstin,
      customerDlNo,
      customerPan,
      linkedUser,
    ],
  );

  /** Cart upsert merges quantities — always send deltas, never absolute totals. */
  const applyCartDelta = useCallback(
    async (deltas: Array<{ sellableRef: string; quantity: number }>) => {
      if (deltas.length === 0) return;
      if (isSyncingRef.current) return;

      isSyncingRef.current = true;
      setIsSyncing(true);
      setError(null);
      try {
        const updated = await cartApi.add({
          businessType,
          items: deltas,
          ...customerPayload(),
        });
        setCartData(updated);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update cart';
        setError(message);
        notifyError(message);
        throw err;
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [businessType, customerPayload, notifyError],
  );

  const addMenuItem = async (item: MenuItem) => {
    if (item.available === false) return;
    const ref = menuSellableRef(item.id);
    await applyCartDelta([{ sellableRef: ref, quantity: 1 }]);
    setShowSearchDropdown(false);
  };

  const changeQty = async (sellableRef: string, delta: number) => {
    if (delta === 0) return;
    await applyCartDelta([{ sellableRef, quantity: delta }]);
  };

  const setQuantity = async (sellableRef: string, newQty: number) => {
    const line = (cartData?.items ?? []).find((row) => lineSellableRef(row) === sellableRef);
    if (!line) return;
    const current = Math.trunc(Number(line.quantity));
    const next = Math.trunc(newQty);
    const delta = next - current;
    if (delta === 0) return;
    await applyCartDelta([{ sellableRef, quantity: delta }]);
  };

  const removeLine = async (sellableRef: string) => {
    const line = (cartData?.items ?? []).find((row) => lineSellableRef(row) === sellableRef);
    if (!line) return;
    const qty = Math.trunc(Number(line.quantity));
    if (qty <= 0) return;
    await applyCartDelta([{ sellableRef, quantity: -qty }]);
  };

  const handleClearCart = async () => {
    const items = cartData?.items ?? [];
    if (items.length === 0) return;
    const deltas = items
      .map((line) => {
        const ref = lineSellableRef(line);
        if (!ref) return null;
        const qty = Math.trunc(Number(line.quantity));
        if (qty <= 0) return null;
        return { sellableRef: ref, quantity: -qty };
      })
      .filter((d): d is { sellableRef: string; quantity: number } => d != null);
    await applyCartDelta(deltas);
  };

  const handleSearchSubmit = () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchCatalog(null);
      setShowSearchDropdown(false);
      return;
    }
    setShowSearchDropdown(true);
    void runSearch(q);
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
        setCustomerId(customer.customerId || '');
        setCustomerEmail(customer.email || '');
        setCustomerAddress(customer.address || '');
        const hasRetailerFields = !!(customer.gstin || customer.dlNo || customer.pan);
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
        setCustomerId('');
        setCustomerEmail('');
        setCustomerAddress('');
        setIsRetailer(false);
        setCustomerGstin('');
        setCustomerDlNo('');
        setCustomerPan('');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search customer';
      notifyError(message);
      setCustomerName('');
      setCustomerId('');
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
        setCustomerId(customer.customerId || '');
        setCustomerAddress(customer.address || '');
        const hasRetailerFields = !!(customer.gstin || customer.dlNo || customer.pan);
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
        setCustomerId('');
        setCustomerAddress('');
        setIsRetailer(false);
        setCustomerGstin('');
        setCustomerDlNo('');
        setCustomerPan('');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search customer';
      notifyError(message);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerId('');
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
      const user = await userLookupApi.searchByEmail(email);
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
    if (!cartData?.items?.length) {
      notifyError('Cart is empty');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const upsertResponse = await cartApi.add({
        businessType,
        items: [],
        ...customerPayload(),
      });
      const purchaseId = upsertResponse.purchaseId || cartData.purchaseId;
      if (!purchaseId) {
        throw new Error('Purchase ID not found');
      }
      await cartApi.updateStatus({
        purchaseId,
        status: 'PENDING',
        paymentMethod: 'CASH',
      });
      navigate(`/dashboard/checkout?purchaseId=${encodeURIComponent(purchaseId)}`, {
        state: { purchaseId },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process payment';
      setError(message);
      notifyError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const cartItems = cartData?.items ?? [];
  const cartSellableRefs = useMemo(
    () =>
      cartItems.map((line) => lineSellableRef(line)).filter((ref): ref is string => Boolean(ref)),
    [cartItems],
  );
  const { data: customerProductHistory, loading: customerProductHistoryLoading } =
    useCustomerProductHistory({
      customerId,
      customerPhone,
      sellableRefs: cartSellableRefs,
      excludePurchaseId: cartData?.purchaseId,
      enabled: !isLoading && cartItems.length > 0,
    });

  if (isLoading) {
    return (
      <Stack gap="md" maxWidth="xl" mx="auto" className={menuSellPageShell}>
        <CenteredLoader label="Loading cart…" />
      </Stack>
    );
  }

  const grandTotal =
    cartData?.grandTotal ??
    cartItems.reduce(
      (sum, line) => sum + (line.totalAmount ?? line.priceToRetail * line.quantity),
      0,
    );

  const cartMain = (
    <Stack gap="md" bg="elevated" border rounded="lg" padding="lg" className={cartSectionStyle}>
      <Box
        position="relative"
        width="full"
        className={searchRowStyle}
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
          <Text aria-hidden>🔍</Text>
          <Input
            type="text"
            className={searchInputStyle}
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchSubmit();
              }
            }}
            disabled={isSyncing || isSearching}
            autoFocus
            aria-expanded={showSearchDropdown}
            aria-haspopup="listbox"
            aria-controls="menu-search-results-list"
          />
          <Button
            type="button"
            variant="solid"
            disabled={isSyncing || isSearching}
            onClick={handleSearchSubmit}
          >
            {isSearching ? 'Searching…' : 'Search'}
          </Button>
        </Inline>
        {showSearchDropdown ? (
          <SearchDropdown id="menu-search-results-list" role="listbox">
            {isSearching ? (
              <Box padding="md" textAlign="center">
                <Text color="secondary">Searching…</Text>
              </Box>
            ) : searchResults.length === 0 ? (
              <Box padding="md" textAlign="center">
                <Text color="secondary">No menu items found</Text>
              </Box>
            ) : (
              <Stack as="ul" gap="none" className={dropdownListStyle}>
                {searchResults.map((hit) => (
                  <MenuSearchDropdownItem
                    key={`menu-${hit.item.id}`}
                    item={hit.item}
                    onAdd={(menuItem) => void addMenuItem(menuItem)}
                    disabled={isSyncing}
                  />
                ))}
              </Stack>
            )}
          </SearchDropdown>
        ) : null}
      </Box>

      <Box className={cartItemsStyle}>
        {isSyncing && cartItems.length === 0 ? (
          <CenteredLoader label="Updating cart…" />
        ) : cartItems.length === 0 ? (
          <Box padding="lg">
            <EmptyState title="Cart is empty" />
          </Box>
        ) : (
          cartItems.map((line) => {
            const ref = lineSellableRef(line) ?? line.name ?? '';
            const lineTotal = line.totalAmount ?? line.priceToRetail * line.quantity;
            return (
              <Inline
                key={ref}
                justify="between"
                align="start"
                gap="md"
                className={cartLineFlushStyle}
              >
                <Stack gap="xs" flex="1" minWidth="0">
                  <Stack gap="xs">
                    <Text weight="semibold">{line.name || 'Menu item'}</Text>
                    {ref ? (
                      <CustomerProductHistoryHint
                        sellableRef={ref}
                        history={customerProductHistory}
                        loading={customerProductHistoryLoading}
                      />
                    ) : null}
                    <Text variant="caption" color="secondary">
                      {money(line.priceToRetail)} each · {money(lineTotal)} total
                    </Text>
                  </Stack>
                </Stack>
                <Stack gap="sm" align="end">
                  <Inline gap="sm" align="center" width="full">
                    <CartQtyStepper
                      value={line.quantity}
                      disabled={isSyncing}
                      onDecrement={() => void changeQty(ref, -1)}
                      onIncrement={() => void changeQty(ref, 1)}
                      onCommit={(newQty: number) => setQuantity(ref, newQty)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={surfaceChrome.flexShrink0}
                      onClick={() => void removeLine(ref)}
                      disabled={isSyncing}
                    >
                      Remove
                    </Button>
                  </Inline>
                </Stack>
              </Inline>
            );
          })
        )}
      </Box>
    </Stack>
  );

  const cartAside = (
    <Stack as="aside" gap="md" bg="elevated" border rounded="lg" padding="lg">
      <Box className={customerBlockStyle}>
        <Button
          type="button"
          variant="ghost"
          className={customerToggleStyle}
          onClick={() => setCustomerSectionOpen((o) => !o)}
          aria-expanded={customerSectionOpen}
        >
          <Inline gap="sm" align="center" width="full">
            <Text weight="semibold">Customer</Text>
            {customerName || customerPhone ? (
              <Text className={customerToggleValueStyle}>{customerName || customerPhone}</Text>
            ) : (
              <Text color="secondary" className={surfaceChrome.flexMin0}>
                Optional
              </Text>
            )}
            <Text className={customerToggleIconStyle}>{customerSectionOpen ? '▼' : '▶'}</Text>
          </Inline>
        </Button>
        {customerSectionOpen ? (
          <Stack gap="md" className={customerFormStyle}>
            <Stack gap="sm" pt="sm">
              <FormField label="Phone" id="menu-sell-customerPhone">
                <Inline gap="sm" width="full">
                  <Input
                    id="menu-sell-customerPhone"
                    type="tel"
                    className={customerInputStyle}
                    placeholder="Phone"
                    value={customerPhone}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setCustomerPhone(e.currentTarget.value)
                    }
                    disabled={isSearchingCustomer}
                  />
                  <IconButton
                    label="Search customer"
                    title="Search customer"
                    className={sidebarSearchBtnStyle}
                    onClick={() => void handleCustomerSearch()}
                    disabled={isSearchingCustomer || !customerPhone.trim()}
                  >
                    {isSearchingCustomer ? '…' : '⌕'}
                  </IconButton>
                </Inline>
              </FormField>
              <FormField label="Name" id="menu-sell-customerName">
                <Input
                  id="menu-sell-customerName"
                  type="text"
                  className={customerInputStyle}
                  placeholder="Name"
                  value={customerName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCustomerName(e.currentTarget.value)
                  }
                />
              </FormField>
              <FormField label="Email" id="menu-sell-customerEmail">
                <Inline gap="sm" width="full">
                  <Input
                    id="menu-sell-customerEmail"
                    type="email"
                    className={customerInputStyle}
                    placeholder="Email"
                    value={customerEmail}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setCustomerEmail(e.currentTarget.value)
                    }
                    disabled={isSearchingCustomer}
                  />
                  <IconButton
                    label="Search customer by email"
                    title="Search customer by email"
                    className={sidebarSearchBtnStyle}
                    onClick={() => void handleCustomerSearchByEmail()}
                    disabled={isSearchingCustomer || !customerEmail.trim()}
                  >
                    {isSearchingCustomer ? '…' : '⌕'}
                  </IconButton>
                </Inline>
              </FormField>
              <FormField label="Address" id="menu-sell-customerAddress">
                <Input
                  id="menu-sell-customerAddress"
                  type="text"
                  className={customerInputStyle}
                  placeholder="Address"
                  value={customerAddress}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setCustomerAddress(e.currentTarget.value)
                  }
                />
              </FormField>
            </Stack>
            <Box className={sectionDividerLgStyle}>
              <Checkbox
                label="Is Retailer"
                checked={isRetailer}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setIsRetailer(e.currentTarget.checked);
                  if (!e.currentTarget.checked) {
                    setCustomerGstin('');
                    setCustomerDlNo('');
                    setCustomerPan('');
                  }
                }}
              />
            </Box>
            {isRetailer ? (
              <Stack gap="sm" padding="md" border rounded="md" bg="surface" mt="md" borderTop>
                <FormField label="GSTIN" id="menu-sell-customerGstin">
                  <Input
                    id="menu-sell-customerGstin"
                    type="text"
                    className={customerInputStyle}
                    placeholder="GSTIN"
                    value={customerGstin}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setCustomerGstin(e.currentTarget.value)
                    }
                  />
                </FormField>
                <FormField label="DL No" id="menu-sell-customerDlNo">
                  <Input
                    id="menu-sell-customerDlNo"
                    type="text"
                    className={customerInputStyle}
                    placeholder="DL No"
                    value={customerDlNo}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setCustomerDlNo(e.currentTarget.value)
                    }
                  />
                </FormField>
                <FormField label="PAN" id="menu-sell-customerPan">
                  <Input
                    id="menu-sell-customerPan"
                    type="text"
                    className={customerInputStyle}
                    placeholder="PAN"
                    value={customerPan}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setCustomerPan(e.currentTarget.value)
                    }
                  />
                </FormField>
              </Stack>
            ) : null}
            <Stack gap="sm" className={sectionDividerStyle}>
              <Text weight="semibold">Link to StockKart user</Text>
              {linkedUser ? (
                <Inline gap="sm" align="center" width="full" flexWrap>
                  <Text>
                    Linked: {linkedUser.name} ({linkedUser.email})
                  </Text>
                  <Button type="button" variant="ghost" size="sm" onClick={handleUnlinkUser}>
                    Unlink
                  </Button>
                </Inline>
              ) : (
                <Stack gap="sm">
                  <Text color="secondary">
                    Enter email above and search to link a customer to their StockKart account.
                  </Text>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleSearchUserForLink()}
                    disabled={isSearchingUser || !customerEmail?.trim()}
                  >
                    {isSearchingUser ? '…' : 'Search by email'}
                  </Button>
                  {userSearchMessage ? (
                    <Text variant="caption" color="secondary">
                      {userSearchMessage}
                    </Text>
                  ) : null}
                </Stack>
              )}
            </Stack>
          </Stack>
        ) : null}
      </Box>

      <Card>
        <CardBody>
          <Stack gap="xs">
            <SummaryRow label="Subtotal" value={money(cartData?.subTotal ?? 0)} />
            {(cartData?.taxTotal ?? 0) > 0 ? (
              <SummaryRow label="Tax" value={money(cartData?.taxTotal ?? 0)} />
            ) : null}
            <SummaryRow label="Total" value={money(grandTotal)} total />
          </Stack>
        </CardBody>
      </Card>

      <Inline gap="sm" width="full" className={cartActionsStyle}>
        <Button
          type="button"
          variant="outline"
          className={surfaceChrome.flexMin0}
          onClick={() => void handleClearCart()}
          disabled={isSyncing || cartItems.length === 0}
        >
          Clear Cart
        </Button>
        <Button
          type="button"
          variant="solid"
          className={flexGrow2Style}
          onClick={() => void handleProcessPayment()}
          disabled={isProcessing || isSyncing || cartItems.length === 0}
          loading={isProcessing || isSyncing}
        >
          {isProcessing ? 'Processing...' : isSyncing ? 'Updating...' : 'Process Payment'}
        </Button>
      </Inline>
    </Stack>
  );

  return (
    <Stack gap="md" maxWidth="xl" mx="auto" className={menuSellPageShell}>
      <PendingCustomerSellFlow sellPath="/dashboard/menu-sell" />
      {error ? <Alert variant="danger">{error}</Alert> : null}

      <PageHeader description="Search and add menu items to the cart" />

      <AsideLayout main={cartMain} aside={cartAside} />
    </Stack>
  );
}
