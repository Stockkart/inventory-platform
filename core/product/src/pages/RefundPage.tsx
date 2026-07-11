import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router';
import { refundsApi } from '@inventory-platform/product/api';
import type {
  CheckoutItemResponse,
  Purchase,
  RefundItem,
  SearchPurchasesParams,
} from '@inventory-platform/product/types';
import type { CustomerResponse } from '@inventory-platform/user/types';
import type { PaymentMethod, PaymentSplit } from '@inventory-platform/contracts';
import { inventoryLotIdFromSellableRef, lineSellableRef } from '@inventory-platform/product/types';
import {
  Alert,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  EmptyState,
  FormField,
  Grid,
  Inline,
  Input,
  PageHeader,
  PaginationBar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  productChrome,
  cn,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { useCapabilityFeatureGuard } from '@inventory-platform/routing';
import {
  PaymentMethodSplit,
  RefundHistoryList,
  emptyPaymentSplit,
  isCreditMethod,
  roundMoney,
  validatePaymentSplit,
} from '../ui';
import { useNotify } from '@inventory-platform/session';

export function meta() {
  return [
    { title: 'Return to customer - StockKart' },
    {
      name: 'description',
      content: 'Process customer purchase returns',
    },
  ];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseGstPct(rate: string | null | undefined): number {
  if (rate == null) return 0;
  const s = String(rate).trim().replace(/%/g, '');
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** GST column for a sale line (matches vendor return screen wording). */
function formatGstRatesLabelForSaleLine(line: CheckoutItemResponse): string {
  const cg = parseGstPct(line.cgst);
  const sg = parseGstPct(line.sgst);
  if (cg <= 0 && sg <= 0) {
    return line.billingMode === 'BASIC' ? 'Basic' : '—';
  }
  if (cg > 0 && sg > 0) {
    return `CGST ${cg}% + SGST ${sg}%`;
  }
  if (cg > 0) return `CGST ${cg}%`;
  return `SGST ${sg}%`;
}

const roundMoney2 = (n: number) => Math.round(n * 100) / 100;

function refundLineKey(line: CheckoutItemResponse, index: number): string {
  return lineSellableRef(line) ?? `line-${index}`;
}

/**
 * Mirrors RefundService: credit = priceToRetail × return qty (per selling unit on the bill).
 * Optional tooltip lines assume tax-inclusive SP for a notional GST split (display only).
 */
function estimateCustomerRefundLine(
  returnQty: number,
  line: CheckoutItemResponse,
): { total: number; title: string } | null {
  if (returnQty <= 0) return null;
  const unit = Number(line.priceToRetail);
  if (!Number.isFinite(unit) || unit < 0) return null;
  const total = roundMoney2(unit * returnQty);

  const parts = [
    `Refund ${formatCurrency(total)} (${formatCurrency(
      unit,
    )} × ${returnQty}); matches processed return.`,
  ];

  const cg = parseGstPct(line.cgst);
  const sg = parseGstPct(line.sgst);
  const sumPct = cg + sg;
  if (sumPct > 0) {
    const taxable = roundMoney2(total / (1 + sumPct / 100));
    const cgst = roundMoney2((taxable * cg) / 100);
    const sgst = roundMoney2((taxable * sg) / 100);
    parts.push(
      `If SP includes GST — taxable ${formatCurrency(taxable)}, CGST ${formatCurrency(
        cgst,
      )}, SGST ${formatCurrency(sgst)}`,
    );
  }

  return { total, title: parts.join(' · ') };
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <Inline gap="xs">
      <Text variant="caption" color="secondary" weight="semibold">
        {label}:
      </Text>
      <Text variant="caption" color="secondary">
        {value}
      </Text>
    </Inline>
  );
}

export function RefundPage() {
  const { enabled, loading: guardLoading } = useCapabilityFeatureGuard('customerReturn');
  const location = useLocation();
  const state = location.state as {
    prefillCustomer?: CustomerResponse;
    prefillTab?: 'process' | 'history';
  } | null;
  const [activeTab, setActiveTab] = useState<'process' | 'history'>('process');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { success: notifySuccess, error: notifyError } = useNotify;

  // Search state
  const [searchParams, setSearchParams] = useState<SearchPurchasesParams>({
    customerEmail: '',
    customerPhone: '',
    customerName: '',
    invoiceNo: '',
  });
  const [appliedSearch, setAppliedSearch] = useState<SearchPurchasesParams>({
    customerEmail: '',
    customerPhone: '',
    customerName: '',
    invoiceNo: '',
  });
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [refundItems, setRefundItems] = useState<
    Record<string, { quantity: number; maxQuantity: number }>
  >({});

  // Refresh refund history when a refund is processed (used by RefundHistoryList)
  const [refundHistoryRefreshTrigger, setRefundHistoryRefreshTrigger] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentSplit, setPaymentSplit] = useState<PaymentSplit>(() => emptyPaymentSplit());

  useEffect(() => {
    if (!state?.prefillCustomer) return;
    const { name, phone, email } = state.prefillCustomer;
    const next = {
      customerName: name ?? '',
      customerPhone: phone ?? '',
      customerEmail: email ?? '',
      invoiceNo: '',
    };

    setSearchParams(next);
    setAppliedSearch(next);
    setPage(0);
    setActiveTab(state.prefillTab ?? 'process');
    setError(null);
    setSuccess(null);
  }, [state]);

  const handleSearchChange = (field: keyof SearchPurchasesParams, value: string) => {
    setSearchParams((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const hasActiveSearch = Boolean(
    appliedSearch.customerEmail?.trim() ||
      appliedSearch.customerPhone?.trim() ||
      appliedSearch.customerName?.trim() ||
      appliedSearch.invoiceNo?.trim(),
  );

  const loadPurchases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await refundsApi.searchPurchases({
        ...appliedSearch,
        page: page + 1,
        limit: pageSize,
      });
      setPurchases(response.purchases);
      setTotalPages(response.totalPages);
      setTotalItems(response.total);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load purchases. Please try again.';
      notifyError(errorMessage);
      setPurchases([]);
      setTotalPages(0);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [appliedSearch, notifyError, page, pageSize]);

  useEffect(() => {
    if (activeTab !== 'process') return;
    void loadPurchases();
  }, [activeTab, loadPurchases]);

  useEffect(() => {
    setSelectedPurchase(null);
    setRefundItems({});
    setPaymentMethod(null);
    setPaymentSplit(emptyPaymentSplit());
  }, [page]);

  const handleSearchPurchases = () => {
    setSuccess(null);
    setSelectedPurchase(null);
    setRefundItems({});
    setPaymentMethod(null);
    setPaymentSplit(emptyPaymentSplit());
    setAppliedSearch({ ...searchParams });
    setPage(0);
  };

  const clearSearch = () => {
    const empty = {
      customerEmail: '',
      customerPhone: '',
      customerName: '',
      invoiceNo: '',
    };
    setSearchParams(empty);
    setAppliedSearch(empty);
    setSelectedPurchase(null);
    setRefundItems({});
    setPaymentMethod(null);
    setPaymentSplit(emptyPaymentSplit());
    setPage(0);
  };

  const handleSelectPurchase = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setPaymentMethod(null);
    setPaymentSplit(emptyPaymentSplit());
    // Initialize refund items with max quantities
    const items: Record<string, { quantity: number; maxQuantity: number }> = {};
    purchase.items.forEach((item, index) => {
      items[refundLineKey(item, index)] = {
        quantity: 0,
        maxQuantity: item.quantity,
      };
    });
    setRefundItems(items);
    setError(null);
    setSuccess(null);
  };

  const handleRefundQuantityChange = (inventoryId: string, value: string) => {
    const item = refundItems[inventoryId];
    if (!item) return;

    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) {
      setRefundItems((prev) => ({
        ...prev,
        [inventoryId]: { ...item, quantity: 0 },
      }));
      return;
    }

    if (numValue > item.maxQuantity) {
      setRefundItems((prev) => ({
        ...prev,
        [inventoryId]: { ...item, quantity: item.maxQuantity },
      }));
      return;
    }

    setRefundItems((prev) => ({
      ...prev,
      [inventoryId]: { ...item, quantity: numValue },
    }));
  };

  const handleProcessRefund = async () => {
    if (!selectedPurchase) {
      notifyError('Please select a purchase first.');
      return;
    }

    const itemsToRefund: RefundItem[] = [];
    let hasItems = false;

    Object.entries(refundItems).forEach(([lineKey, item]) => {
      if (item.quantity > 0) {
        const inventoryId = inventoryLotIdFromSellableRef(lineKey) ?? lineKey;
        itemsToRefund.push({
          inventoryId,
          quantity: item.quantity,
        });
        hasItems = true;
      }
    });

    if (!hasItems) {
      notifyError('Please select at least one item to return.');
      return;
    }

    const returnTotal = estimatedRefund.grandTotal;
    if (returnTotal <= 0) {
      notifyError('Enter return quantities to set a refund total.');
      return;
    }
    if (!paymentMethod) {
      notifyError('Choose how to refund the customer (cash, online, credit, or mixed).');
      return;
    }
    const payCheck = validatePaymentSplit(paymentMethod, paymentSplit, returnTotal);
    if (!payCheck.ok) {
      notifyError(payCheck.message ?? 'Invalid refund payment split.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await refundsApi.create({
        purchaseId: selectedPurchase.purchaseId,
        items: itemsToRefund,
        paymentMethod,
        cashAmount: paymentSplit.cashAmount,
        onlineAmount: paymentSplit.onlineAmount,
        creditAmount: paymentSplit.creditAmount,
      });

      notifySuccess(
        `Return processed successfully! Return Amount: ${formatCurrency(
          response.refundAmount,
        )}. Credit note: ${response.creditNoteNo ?? response.refundId}`,
      );

      // Reset form and refresh lists
      setSelectedPurchase(null);
      setRefundItems({});
      setPaymentMethod(null);
      setPaymentSplit(emptyPaymentSplit());
      setRefundHistoryRefreshTrigger((t) => t + 1);
      void loadPurchases();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to process return. Please try again.';
      notifyError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: 'process' | 'history') => {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
  };

  const estimatedRefund = useMemo(() => {
    if (!selectedPurchase) {
      return { grandTotal: 0, linesWithQty: 0 };
    }
    let grand = 0;
    let linesWithQty = 0;
    for (let i = 0; i < selectedPurchase.items.length; i++) {
      const it = selectedPurchase.items[i];
      const ri = refundItems[refundLineKey(it, i)];
      const q = ri?.quantity ?? 0;
      if (q <= 0) continue;
      const est = estimateCustomerRefundLine(q, it);
      if (est && est.total > 0) {
        grand += est.total;
        linesWithQty += 1;
      }
    }
    return {
      grandTotal: linesWithQty > 0 ? roundMoney2(grand) : 0,
      linesWithQty,
    };
  }, [selectedPurchase, refundItems]);

  const returnTotalNum = roundMoney(estimatedRefund.grandTotal);
  const refundPaymentValidation = validatePaymentSplit(paymentMethod, paymentSplit, returnTotalNum);
  const canProcessReturn = returnTotalNum > 0 && refundPaymentValidation.ok && !isLoading;

  if (guardLoading || !enabled) {
    return null;
  }

  const processTabs: Array<{ id: 'process' | 'history'; label: string }> = [
    { id: 'process', label: 'Process Return' },
    { id: 'history', label: 'Return History' },
  ];

  return (
    <Stack gap="md">
      <PageHeader description="Process customer sale returns and view return history" />

      <Inline gap="none" className={productChrome.processTabBar}>
        {processTabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              type="button"
              size="sm"
              variant="ghost"
              role="tab"
              aria-selected={active}
              className={cn(productChrome.processTab, active && productChrome.processTabActive)}
              onClick={() => handleTabChange(tab.id)}
            >
              {tab.label}
            </Button>
          );
        })}
      </Inline>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      {activeTab === 'process' ? (
        <Card>
          <CardBody>
            <Stack gap="lg">
              <Stack gap="md">
                <Text variant="heading3" weight="semibold">
                  Search purchase
                </Text>
                <Text color="secondary">
                  Recent sales load automatically. Use the fields below to narrow the list.
                </Text>
                <Stack gap="sm">
                  <Grid columns={3} gap="sm">
                    <FormField label="Customer Name" id="customerName">
                      <Input
                        id="customerName"
                        type="text"
                        placeholder="Enter customer name"
                        value={searchParams.customerName || ''}
                        onChange={(e) => handleSearchChange('customerName', e.target.value)}
                        disabled={isLoading}
                      />
                    </FormField>
                    <FormField label="Customer Phone" id="customerPhone">
                      <Input
                        id="customerPhone"
                        type="text"
                        placeholder="Enter customer phone"
                        value={searchParams.customerPhone || ''}
                        onChange={(e) => handleSearchChange('customerPhone', e.target.value)}
                        disabled={isLoading}
                      />
                    </FormField>
                    <FormField label="Customer Email" id="customerEmail">
                      <Input
                        id="customerEmail"
                        type="email"
                        placeholder="Enter customer email"
                        value={searchParams.customerEmail || ''}
                        onChange={(e) => handleSearchChange('customerEmail', e.target.value)}
                        disabled={isLoading}
                      />
                    </FormField>
                  </Grid>
                  <FormField label="Invoice Number" id="invoiceNo">
                    <Input
                      id="invoiceNo"
                      type="text"
                      placeholder="Enter invoice number"
                      value={searchParams.invoiceNo || ''}
                      onChange={(e) => handleSearchChange('invoiceNo', e.target.value)}
                      disabled={isLoading}
                    />
                  </FormField>
                  <Inline gap="sm">
                    <Button
                      type="button"
                      variant="solid"
                      disabled={isLoading}
                      onClick={handleSearchPurchases}
                    >
                      {isLoading ? 'Searching...' : 'Search purchases'}
                    </Button>
                    {hasActiveSearch ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isLoading}
                        onClick={clearSearch}
                      >
                        Clear
                      </Button>
                    ) : null}
                  </Inline>
                </Stack>
              </Stack>

              <Stack gap="md">
                <Text variant="heading3" weight="semibold">
                  {hasActiveSearch ? 'Matching sales' : 'Recent sales'}
                </Text>
                {isLoading ? (
                  <CenteredLoader label="Loading purchases…" />
                ) : purchases.length === 0 ? (
                  <EmptyState
                    title={hasActiveSearch ? 'No sales matched your search' : 'No sales yet'}
                    description={
                      hasActiveSearch ? 'Try different criteria or clear the search.' : undefined
                    }
                  />
                ) : (
                  <>
                    <Stack gap="md">
                      {purchases.map((purchase) => {
                        const isSelected = selectedPurchase?.purchaseId === purchase.purchaseId;
                        return (
                          <Card
                            key={purchase.purchaseId}
                            className={cn(
                              productChrome.clickableCard,
                              isSelected && productChrome.selectedCard,
                            )}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectPurchase(purchase)}
                            onKeyDown={(ev) => {
                              if (ev.key === 'Enter' || ev.key === ' ') {
                                ev.preventDefault();
                                handleSelectPurchase(purchase);
                              }
                            }}
                          >
                            <CardBody>
                              <Stack gap="md">
                                <Inline justify="between" align="start" gap="md">
                                  <DetailLine label="Invoice No" value={purchase.invoiceNo} />
                                  <DetailLine label="Date" value={formatDate(purchase.soldAt)} />
                                </Inline>
                                <Grid columns={2} gap="sm">
                                  <DetailLine
                                    label="Customer"
                                    value={purchase.customerName || 'N/A'}
                                  />
                                  <DetailLine
                                    label="Phone"
                                    value={purchase.customerPhone || 'N/A'}
                                  />
                                  <DetailLine
                                    label="Total"
                                    value={formatCurrency(purchase.grandTotal)}
                                  />
                                  <DetailLine label="Payment" value={purchase.paymentMethod} />
                                </Grid>

                                {isSelected && selectedPurchase ? (
                                  <Stack gap="md" className={productChrome.returnDetailPanel}>
                                    <Text variant="heading3" weight="semibold">
                                      Select Items to Return
                                    </Text>
                                    <Grid columns={3} gap="sm">
                                      <DetailLine
                                        label="Invoice No"
                                        value={selectedPurchase.invoiceNo}
                                      />
                                      <DetailLine
                                        label="Customer"
                                        value={selectedPurchase.customerName || 'N/A'}
                                      />
                                      <DetailLine
                                        label="Date"
                                        value={formatDate(selectedPurchase.soldAt)}
                                      />
                                    </Grid>

                                    <Box overflow="auto">
                                      <Table>
                                        <TableHead>
                                          <TableRow>
                                            <TableHeaderCell>Item Name</TableHeaderCell>
                                            <TableHeaderCell>MRP</TableHeaderCell>
                                            <TableHeaderCell>Selling Price</TableHeaderCell>
                                            <TableHeaderCell>Purchased Qty</TableHeaderCell>
                                            <TableHeaderCell>GST rates</TableHeaderCell>
                                            <TableHeaderCell className={surfaceChrome.numericCell}>
                                              Est. credit
                                            </TableHeaderCell>
                                            <TableHeaderCell>Return Qty</TableHeaderCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {selectedPurchase.items.map((item, index) => {
                                            const lineKey = refundLineKey(item, index);
                                            const refundItem = refundItems[lineKey];
                                            const rq = refundItem?.quantity ?? 0;
                                            const lineEst =
                                              rq > 0 ? estimateCustomerRefundLine(rq, item) : null;
                                            return (
                                              <TableRow key={lineKey}>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell>
                                                  {formatCurrency(item.maximumRetailPrice)}
                                                </TableCell>
                                                <TableCell>
                                                  {formatCurrency(item.priceToRetail)}
                                                </TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>
                                                  {formatGstRatesLabelForSaleLine(item)}
                                                </TableCell>
                                                <TableCell
                                                  className={surfaceChrome.numericCell}
                                                  title={lineEst?.title}
                                                >
                                                  {lineEst != null
                                                    ? formatCurrency(lineEst.total)
                                                    : '—'}
                                                </TableCell>
                                                <TableCell>
                                                  <Input
                                                    type="number"
                                                    min={0}
                                                    max={item.quantity}
                                                    value={refundItem?.quantity || 0}
                                                    onChange={(e) =>
                                                      handleRefundQuantityChange(
                                                        lineKey,
                                                        e.target.value,
                                                      )
                                                    }
                                                    className={productChrome.qtyInputNarrow}
                                                    disabled={isLoading}
                                                    aria-label={`Return quantity for ${item.name}`}
                                                  />
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                    </Box>

                                    <Box
                                      padding="md"
                                      bg="surface"
                                      rounded="md"
                                      className={productChrome.estimateBar}
                                    >
                                      <Inline justify="between" align="center">
                                        <Text>Estimated return amount:</Text>
                                        <Text weight="semibold" variant="title">
                                          {formatCurrency(estimatedRefund.grandTotal)}
                                        </Text>
                                      </Inline>
                                    </Box>

                                    {estimatedRefund.linesWithQty > 0 ? (
                                      <Stack
                                        gap="xs"
                                        padding="sm"
                                        rounded="md"
                                        border
                                        className={productChrome.estimateCreditBar}
                                      >
                                        <Text weight="semibold">
                                          Estimated credit total:{' '}
                                          {formatCurrency(estimatedRefund.grandTotal)}
                                        </Text>
                                        <Text
                                          variant="caption"
                                          color="secondary"
                                          className={productChrome.blockHint}
                                        >
                                          Same as server: selling price × return qty per line. Hover
                                          “Est. credit” for a notional GST split when rates apply.
                                          Final amount is set when you process the return.
                                        </Text>
                                      </Stack>
                                    ) : null}

                                    {estimatedRefund.linesWithQty > 0 ? (
                                      <Stack gap="sm" className={productChrome.paymentSectionTop}>
                                        <PaymentMethodSplit
                                          context="sale"
                                          title="How are you refunding?"
                                          intro="Choose cash, online, credit (reduces what they owe), or a mix. This drives accounting — not the original sale payment."
                                          total={returnTotalNum}
                                          value={{
                                            method: paymentMethod,
                                            split: paymentSplit,
                                          }}
                                          onChange={(next) => {
                                            setPaymentMethod(next.method);
                                            setPaymentSplit(next.split);
                                          }}
                                          disabled={isLoading}
                                        />
                                        {paymentMethod &&
                                        isCreditMethod(paymentMethod) &&
                                        paymentSplit.creditAmount > 0 ? (
                                          <Text
                                            variant="caption"
                                            color="secondary"
                                            className={productChrome.mtXs}
                                          >
                                            ₹{paymentSplit.creditAmount.toFixed(2)} reduces customer
                                            credit (they owe you less).
                                          </Text>
                                        ) : null}
                                      </Stack>
                                    ) : null}

                                    <Button
                                      type="button"
                                      variant="solid"
                                      fullWidth
                                      disabled={!canProcessReturn}
                                      onClick={() => void handleProcessRefund()}
                                    >
                                      {isLoading ? 'Processing...' : 'Process Return'}
                                    </Button>
                                  </Stack>
                                ) : null}
                              </Stack>
                            </CardBody>
                          </Card>
                        );
                      })}
                    </Stack>
                    <PaginationBar
                      page={page}
                      totalPages={totalPages}
                      totalItems={totalItems}
                      onPageChange={setPage}
                      disabled={isLoading}
                      aria-label="Sale pages"
                    />
                  </>
                )}
              </Stack>
            </Stack>
          </CardBody>
        </Card>
      ) : null}

      {activeTab === 'history' ? (
        <Card>
          <CardBody>
            <Stack gap="md">
              <Text variant="heading3" weight="semibold">
                Return History
              </Text>
              <RefundHistoryList refreshTrigger={refundHistoryRefreshTrigger} />
            </Stack>
          </CardBody>
        </Card>
      ) : null}
    </Stack>
  );
}
