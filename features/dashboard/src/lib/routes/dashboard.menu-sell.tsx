import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router';
import { cartApi, customersApi, shopMenuApi, usersApi } from '@inventory-platform/api';
import type {
  CartResponse,
  CheckoutItemResponse,
  MenuItem,
  ShopMenu,
} from '@inventory-platform/types';
import {
  lineSellableRef,
  menuSellableRef,
} from '@inventory-platform/types';
import { useNotify, useVerticalSchemaStore } from '@inventory-platform/store';
import styles from './dashboard.scan-sell.module.css';

export function meta() {
  return [
    { title: 'Sell - StockKart' },
    { name: 'description', content: 'Sell menu items' },
  ];
}

type FlatMenuItem = MenuItem & { sectionTitle: string };

function money(n: number): string {
  return `₹${n.toFixed(2)}`;
}

function flattenMenu(menu: ShopMenu | null): FlatMenuItem[] {
  if (!menu?.sections) return [];
  return menu.sections.flatMap((section) =>
    (section.items ?? []).map((item) => ({
      ...item,
      sectionTitle: section.title,
    }))
  );
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
    if (!Number.isFinite(qty) || qty <= 0 || qty === value) {
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
      onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          void commit();
          e.currentTarget.blur();
        }
      }}
      onFocus={(e) => e.currentTarget.select()}
    />
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
    <li className={styles.dropdownItem} role="option">
      <div className={styles.dropdownItemInfo}>
        <span className={styles.dropdownItemName}>
          {item.name || 'Unnamed item'}
        </span>
        <span className={styles.dropdownItemMeta}>{item.sectionTitle}</span>
        <span
          className={`${styles.dropdownItemMeta} ${styles.dropdownItemMetaBold}`}
        >
          Price: {money(item.sellingPrice)}
        </span>
        {item.sellMode === 'direct' && (
          <span className={styles.dropdownItemMeta}>Stock linked</span>
        )}
      </div>
      <div className={styles.dropdownItemActions}>
        <button
          type="button"
          className={styles.dropdownAddBtn}
          onClick={(e) => {
            e.preventDefault();
            onAdd(item);
          }}
          disabled={disabled || item.available === false}
        >
          Add
        </button>
      </div>
    </li>
  );
}

export default function MenuSellPage() {
  const navigate = useNavigate();
  const { error: notifyError } = useNotify;
  const fetchShopSchema = useVerticalSchemaStore((s) => s.fetchShopSchema);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);

  const [businessType, setBusinessType] = useState('cafe');
  const [menu, setMenu] = useState<ShopMenu | null>(null);
  const [cartData, setCartData] = useState<CartResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [customerSectionOpen, setCustomerSectionOpen] = useState(false);
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
      const [menuData, cart] = await Promise.all([
        shopMenuApi.get(),
        cartApi.get().catch(() => null),
      ]);
      setMenu(menuData);
      if (cart && cart.status === 'PENDING') {
        navigate('/dashboard/checkout');
        return;
      }
      if (cart && cart.status !== 'COMPLETED') {
        setCartData(cart);
        setCustomerName(cart.customerName || '');
        setCustomerAddress(cart.customerAddress || '');
        setCustomerPhone(cart.customerPhone || '');
        setCustomerEmail(cart.customerEmail || '');
        const hasRetailerFields = !!(
          cart.customerGstin ||
          cart.customerDlNo ||
          cart.customerPan
        );
        setIsRetailer(hasRetailerFields);
        setCustomerGstin(cart.customerGstin || '');
        setCustomerDlNo(cart.customerDlNo || '');
        setCustomerPan(cart.customerPan || '');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load menu';
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
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(event.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allMenuItems = useMemo(() => flattenMenu(menu), [menu]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const available = allMenuItems.filter((item) => item.available !== false);
    return available.filter(
      (item) =>
        item.name?.toLowerCase().includes(q) ||
        item.sectionTitle.toLowerCase().includes(q)
    );
  }, [allMenuItems, searchQuery]);

  const hasActiveSearch = searchQuery.trim().length > 0;

  const customerPayload = useCallback(
    () => ({
      ...(customerName.trim() && { customerName: customerName.trim() }),
      ...(customerAddress.trim() && { customerAddress: customerAddress.trim() }),
      ...(customerPhone.trim() && { customerPhone: customerPhone.trim() }),
      ...(customerEmail.trim() && { customerEmail: customerEmail.trim() }),
      ...(isRetailer &&
        customerGstin.trim() && { customerGstin: customerGstin.trim() }),
      ...(isRetailer &&
        customerDlNo.trim() && { customerDlNo: customerDlNo.trim() }),
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
    ]
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
        const message =
          err instanceof Error ? err.message : 'Failed to update cart';
        setError(message);
        notifyError(message);
        throw err;
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [businessType, customerPayload, notifyError]
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
    const line = (cartData?.items ?? []).find(
      (row) => lineSellableRef(row) === sellableRef
    );
    if (!line) return;
    const current = Math.trunc(Number(line.quantity));
    const next = Math.trunc(newQty);
    const delta = next - current;
    if (delta === 0) return;
    await applyCartDelta([{ sellableRef, quantity: delta }]);
  };

  const removeLine = async (sellableRef: string) => {
    const line = (cartData?.items ?? []).find(
      (row) => lineSellableRef(row) === sellableRef
    );
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

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasActiveSearch) {
      setShowSearchDropdown(false);
      return;
    }
    setShowSearchDropdown(true);
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
        setCustomerEmail('');
        setCustomerAddress('');
        setIsRetailer(false);
        setCustomerGstin('');
        setCustomerDlNo('');
        setCustomerPan('');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to search customer';
      notifyError(message);
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
      const message =
        err instanceof Error ? err.message : 'Failed to search customer';
      notifyError(message);
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
      navigate('/dashboard/checkout');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to process payment';
      setError(message);
      notifyError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading menu…</div>
      </div>
    );
  }

  const cartItems = cartData?.items ?? [];
  const grandTotal =
    cartData?.grandTotal ??
    cartItems.reduce(
      (sum, line) => sum + (line.totalAmount ?? line.priceToRetail * line.quantity),
      0
    );

  return (
    <div className={styles.page}>
      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.header}>
        <h2 className={styles.title}>Sell</h2>
        <p className={styles.subtitle}>
          Search menu items and build the order
        </p>
      </div>

      <div className={styles.mainRow}>
        <div className={styles.cartArea}>
          <div className={styles.cartSection}>
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
                    placeholder="Search menu items..."
                    value={searchQuery}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const next = e.currentTarget.value;
                      setSearchQuery(next);
                      setShowSearchDropdown(next.trim().length > 0);
                    }}
                    disabled={isSyncing}
                    autoFocus
                    aria-expanded={showSearchDropdown && hasActiveSearch}
                    aria-haspopup="listbox"
                    aria-controls="menu-search-results-list"
                  />
                  <button
                    type="submit"
                    className={styles.searchSubmitBtn}
                    disabled={isSyncing}
                  >
                    Search
                  </button>
                </div>
              </form>
              {showSearchDropdown && hasActiveSearch && (
                <div
                  id="menu-search-results-list"
                  className={styles.searchDropdown}
                  role="listbox"
                >
                  {searchResults.length === 0 ? (
                    <div className={styles.dropdownEmpty}>
                      No menu items found
                    </div>
                  ) : (
                    <ul className={styles.dropdownList}>
                      {searchResults.map((item) => (
                        <MenuSearchDropdownItem
                          key={item.id}
                          item={item}
                          onAdd={(menuItem) => void addMenuItem(menuItem)}
                          disabled={isSyncing}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className={styles.cartItems}>
              {isSyncing && cartItems.length === 0 ? (
                <div className={styles.loading}>Updating cart…</div>
              ) : cartItems.length === 0 ? (
                <div className={styles.emptyCart}>Cart is empty</div>
              ) : (
                cartItems.map((line) => {
                  const ref = lineSellableRef(line) ?? line.name ?? '';
                  const lineTotal =
                    line.totalAmount ?? line.priceToRetail * line.quantity;
                  return (
                    <div key={ref} className={styles.cartItem}>
                      <div className={styles.itemInfo}>
                        <div className={styles.itemHeader}>
                          <div className={styles.itemHeaderTop}>
                            <span className={styles.itemNameButton}>
                              {line.name || 'Menu item'}
                            </span>
                          </div>
                          <div className={styles.itemMetaRow}>
                            <span className={styles.itemUnitMeta}>
                              {money(line.priceToRetail)} each ·{' '}
                              {money(lineTotal)} total
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className={styles.itemActions}>
                        <div className={styles.itemActionTopRow}>
                          <div className={styles.qtyStepper}>
                            <button
                              type="button"
                              className={styles.qtyBtn}
                              onClick={() => void changeQty(ref, -1)}
                              disabled={isSyncing}
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <CartQuantityInput
                              value={line.quantity}
                              disabled={isSyncing}
                              onCommit={(newQty) => setQuantity(ref, newQty)}
                            />
                            <button
                              type="button"
                              className={styles.qtyBtn}
                              onClick={() => void changeQty(ref, 1)}
                              disabled={isSyncing}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            className={styles.removeBtn}
                            onClick={() => void removeLine(ref)}
                            disabled={isSyncing}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

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
                      htmlFor="menu-sell-customerPhone"
                      className={styles.customerLabel}
                    >
                      Phone
                    </label>
                    <div className={styles.customerInputRow}>
                      <input
                        id="menu-sell-customerPhone"
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
                        onClick={() => void handleCustomerSearch()}
                        disabled={isSearchingCustomer || !customerPhone.trim()}
                        title="Search customer"
                      >
                        {isSearchingCustomer ? '…' : '⌕'}
                      </button>
                    </div>
                  </div>
                  <div className={styles.customerField}>
                    <label
                      htmlFor="menu-sell-customerName"
                      className={styles.customerLabel}
                    >
                      Name
                    </label>
                    <input
                      id="menu-sell-customerName"
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
                      htmlFor="menu-sell-customerEmail"
                      className={styles.customerLabel}
                    >
                      Email
                    </label>
                    <div className={styles.customerInputRow}>
                      <input
                        id="menu-sell-customerEmail"
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
                        onClick={() => void handleCustomerSearchByEmail()}
                        disabled={isSearchingCustomer || !customerEmail.trim()}
                        title="Search customer by email"
                      >
                        {isSearchingCustomer ? '…' : '⌕'}
                      </button>
                    </div>
                  </div>
                  <div className={styles.customerField}>
                    <label
                      htmlFor="menu-sell-customerAddress"
                      className={styles.customerLabel}
                    >
                      Address
                    </label>
                    <input
                      id="menu-sell-customerAddress"
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
                        htmlFor="menu-sell-customerGstin"
                        className={styles.customerLabel}
                      >
                        GSTIN
                      </label>
                      <input
                        id="menu-sell-customerGstin"
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
                        htmlFor="menu-sell-customerDlNo"
                        className={styles.customerLabel}
                      >
                        DL No
                      </label>
                      <input
                        id="menu-sell-customerDlNo"
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
                        htmlFor="menu-sell-customerPan"
                        className={styles.customerLabel}
                      >
                        PAN
                      </label>
                      <input
                        id="menu-sell-customerPan"
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
                        Enter email above and search to link a customer to their
                        StockKart account.
                      </p>
                      <button
                        type="button"
                        className={styles.customerLinkSearchBtn}
                        onClick={() => void handleSearchUserForLink()}
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
            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <span>{money(cartData?.subTotal ?? 0)}</span>
            </div>
            {(cartData?.taxTotal ?? 0) > 0 && (
              <div className={styles.summaryRow}>
                <span>Tax</span>
                <span>{money(cartData?.taxTotal ?? 0)}</span>
              </div>
            )}
            <div className={styles.summaryRowTotal}>
              <span>Total</span>
              <span>{money(grandTotal)}</span>
            </div>
          </div>
          <div className={styles.cartActions}>
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => void handleClearCart()}
              disabled={isSyncing || cartItems.length === 0}
            >
              Clear Cart
            </button>
            <button
              type="button"
              className={styles.checkoutBtn}
              onClick={() => void handleProcessPayment()}
              disabled={
                isProcessing || isSyncing || cartItems.length === 0
              }
            >
              {isProcessing
                ? 'Processing...'
                : isSyncing
                ? 'Updating...'
                : 'Process Payment'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
