import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { cartApi } from '../api/cart.api';
import { gstAmountRowLabel, uniqueGstRateLabel } from '../lib/gstRateLabel';
import type { CartResponse, UpdateCartStatusDto } from '@inventory-platform/product/types';
import type { PaymentMethod, PaymentSplit } from '@inventory-platform/contracts';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CenteredLoader,
  EmptyState,
  Grid,
  Inline,
  Modal,
  PageHeader,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  productChrome,
} from '@inventory-platform/ui-kit';
import {
  PaymentMethodSplit,
  emptyPaymentSplit,
  formatPaymentMethod,
  formatPaymentSplit,
  isCreditMethod,
  PrintInvoiceModal,
  roundMoney,
  validatePaymentSplit,
} from '../ui';
import { useResolvedSellPath } from '@inventory-platform/routing';
import { useAuthStore, useNotify, useShopCapabilitiesStore } from '@inventory-platform/session';
import { schemeLabel } from '../ui/SaleLineItems';

export function meta() {
  return [
    { title: 'Checkout - StockKart' },
    { name: 'description', content: 'Review and complete your purchase' },
  ];
}

function InfoField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack gap="xs">
      <Text variant="label" color="secondary" weight="medium">
        {label}
      </Text>
      <Text weight="semibold">{value}</Text>
    </Stack>
  );
}

function SummaryRow({ label, value, total }: { label: string; value: string; total?: boolean }) {
  if (total) {
    return (
      <Inline justify="between" width="full" className={productChrome.checkoutTotalRow}>
        <Text variant="title" weight="bold">
          {label}
        </Text>
        <Text variant="title" weight="bold">
          {value}
        </Text>
      </Inline>
    );
  }

  return (
    <Inline justify="between" width="full" className={productChrome.checkoutLineRow}>
      <Text color="secondary">{label}</Text>
      <Text color="secondary">{value}</Text>
    </Inline>
  );
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { error: notifyError } = useNotify;
  const activeShopId = useAuthStore((s) => s.user?.shopId ?? null);
  const fetchCapabilities = useShopCapabilitiesStore((s) => s.fetchCapabilities);
  const shopCapabilities = useShopCapabilitiesStore((s) =>
    activeShopId ? s.byShopId[activeShopId] : undefined,
  );
  const sellPath = useResolvedSellPath(shopCapabilities ?? null);
  const showTokenOnReceipt = shopCapabilities?.features?.tokenOnReceipt === true;

  const purchaseIdFromNav =
    (location.state as { purchaseId?: string } | null)?.purchaseId ??
    searchParams.get('purchaseId') ??
    undefined;

  useEffect(() => {
    void fetchCapabilities();
  }, [fetchCapabilities]);
  const [checkoutData, setCheckoutData] = useState<CartResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const cartLoadedRef = useRef(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentSplit, setPaymentSplit] = useState<PaymentSplit>(() => emptyPaymentSplit());

  const persistCheckoutPurchaseId = useCallback(
    (purchaseId: string) => {
      if (!purchaseId) return;
      if (searchParams.get('purchaseId') === purchaseId) return;
      const next = new URLSearchParams(searchParams);
      next.set('purchaseId', purchaseId);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const loadCart = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let cart: CartResponse | null = null;
      if (purchaseIdFromNav) {
        try {
          cart = await cartApi.get(purchaseIdFromNav);
        } catch {
          cart = null;
        }
      }
      if (!cart || (cart.status !== 'PENDING' && cart.status !== 'COMPLETED')) {
        const fallback = await cartApi.get().catch(() => null);
        if (fallback?.status === 'PENDING' || fallback?.status === 'COMPLETED') {
          cart = fallback;
        }
      }

      if (import.meta.env.DEV) {
        console.log('Cart data:', cart, { purchaseIdFromNav });
      }

      if (cart && (cart.status === 'PENDING' || cart.status === 'COMPLETED')) {
        persistCheckoutPurchaseId(cart.purchaseId);
        setCheckoutData(cart);
        return;
      }

      navigate(sellPath);
    } catch (err) {
      console.log('Cart API returned error (no matching cart):', err);
      if (checkoutData && checkoutData.status === 'COMPLETED') {
        setIsLoading(false);
        return;
      }
      console.error('Error loading cart:', err);
      navigate(sellPath);
    } finally {
      setIsLoading(false);
    }
  }, [navigate, checkoutData, sellPath, purchaseIdFromNav, persistCheckoutPurchaseId]);

  // Load cart data on mount
  useEffect(() => {
    if (!cartLoadedRef.current) {
      cartLoadedRef.current = true;
      loadCart();
    }
  }, [loadCart]);

  const grandTotalNum = roundMoney(checkoutData?.grandTotal ?? 0);
  const paymentValidation = validatePaymentSplit(paymentMethod, paymentSplit, grandTotalNum);
  const canSubmitPayment = paymentValidation.ok && grandTotalNum > 0;

  if (isLoading) {
    return (
      <Stack gap="md" maxWidth="xl" mx="auto" padding="lg">
        <Card>
          <CardBody>
            <CenteredLoader label="Please wait while we load your cart data." />
          </CardBody>
        </Card>
      </Stack>
    );
  }

  if (!checkoutData) {
    return (
      <Stack gap="md" maxWidth="xl" mx="auto" padding="lg">
        <EmptyState
          title="No checkout data found"
          description="Please start a new transaction from the sell page."
          action={
            <Button variant="solid" onClick={() => navigate(sellPath)}>
              Go to Sell
            </Button>
          }
        />
      </Stack>
    );
  }

  const handlePayment = async () => {
    if (!checkoutData) {
      notifyError('Checkout data not available');
      return;
    }
    if (!paymentMethod) {
      notifyError('Select a payment method to continue.');
      return;
    }
    if (!paymentValidation.ok) {
      notifyError(paymentValidation.message ?? 'Payment split is invalid');
      return;
    }

    setIsProcessingPayment(true);
    setError(null);

    try {
      const purchaseId = checkoutData.purchaseId;
      if (!purchaseId) {
        throw new Error('Purchase ID not found in checkout data');
      }

      const statusPayload: UpdateCartStatusDto = {
        purchaseId,
        status: 'COMPLETED',
        paymentMethod,
        cashAmount: paymentSplit.cashAmount,
        onlineAmount: paymentSplit.onlineAmount,
        creditAmount: paymentSplit.creditAmount,
        // Legacy field for back-compat: tells older servers how much of a
        // CREDIT bill was paid up-front. New servers should prefer the
        // explicit split above.
        ...(paymentSplit.creditAmount > 0
          ? {
              creditPaidAmount: roundMoney(paymentSplit.cashAmount + paymentSplit.onlineAmount),
            }
          : {}),
      };

      const completed = await cartApi.updateStatus(statusPayload);

      setCheckoutData({
        ...checkoutData,
        ...completed,
        purchaseId: completed.purchaseId ?? checkoutData.purchaseId,
        status: 'COMPLETED',
        paymentMethod: paymentMethod ?? checkoutData.paymentMethod,
        cashAmount: paymentSplit.cashAmount,
        onlineAmount: paymentSplit.onlineAmount,
        creditAmount: paymentSplit.creditAmount,
      });

      setShowSuccess(true);
      setIsProcessingPayment(false);

      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process payment';
      notifyError(errorMessage);
      setIsProcessingPayment(false);
    }
  };

  const handleGoBack = async () => {
    if (!checkoutData) {
      navigate(sellPath);
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const purchaseId = checkoutData.purchaseId;

      if (!purchaseId) {
        throw new Error('Purchase ID not found in checkout data');
      }

      const statusPayload: UpdateCartStatusDto = {
        purchaseId,
        status: 'CREATED',
        paymentMethod: checkoutData.paymentMethod || 'CASH',
      };

      await cartApi.updateStatus(statusPayload);

      navigate(sellPath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update cart status';
      notifyError(errorMessage);
      setIsUpdating(false);
    }
  };

  const billingMode = checkoutData.billingMode === 'BASIC' ? 'BASIC' : 'REGULAR';
  const sgstPercentage = uniqueGstRateLabel(checkoutData.items, 'sgst');
  const cgstPercentage = uniqueGstRateLabel(checkoutData.items, 'cgst');

  // Get current date
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const paymentSplitLine = formatPaymentSplit({
    cashAmount: checkoutData.cashAmount ?? undefined,
    onlineAmount: checkoutData.onlineAmount ?? undefined,
    creditAmount: checkoutData.creditAmount ?? undefined,
  });

  const statusBadgeVariant = checkoutData.status === 'COMPLETED' ? 'success' : 'warning';

  const invoiceSubtitle = `Invoice #${checkoutData.invoiceNo}${
    showTokenOnReceipt && checkoutData.tokenNo != null ? ` · Token #${checkoutData.tokenNo}` : ''
  }`;

  // Show success overlay
  if (showSuccess) {
    return (
      <Modal open onClose={() => setShowSuccess(false)} size="sm">
        <Modal.Body>
          <Stack gap="md" align="center" padding="lg">
            <Box
              display="flex"
              align="center"
              justify="center"
              className={productChrome.successCheck}
            >
              <Text weight="bold" className={productChrome.successCheckMark}>
                ✓
              </Text>
            </Box>
            <Text variant="title" weight="bold" align="center">
              Order Successful!
            </Text>
            {showTokenOnReceipt && checkoutData?.tokenNo != null ? (
              <Text
                variant="heading3"
                weight="bold"
                align="center"
                className={productChrome.tokenHighlight}
              >
                Token #{checkoutData.tokenNo}
              </Text>
            ) : null}
            <Text color="secondary" align="center">
              Your payment has been processed successfully.
            </Text>
          </Stack>
        </Modal.Body>
      </Modal>
    );
  }

  return (
    <Stack gap="md" maxWidth="xl" mx="auto" padding="lg">
      <PageHeader description={invoiceSubtitle} />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <Stack gap="lg">
        <Card>
          <CardBody>
            <Stack gap="md">
              <Inline justify="between" align="start" width="full">
                <Text variant="heading3" weight="semibold">
                  Invoice Details
                </Text>
                <Inline gap="sm" align="center">
                  <Badge variant={statusBadgeVariant}>{checkoutData.status}</Badge>
                  {checkoutData.status === 'COMPLETED' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!checkoutData.purchaseId) {
                          notifyError('Invoice is not ready to print yet.');
                          return;
                        }
                        setShowPrintModal(true);
                      }}
                      aria-label="Print Invoice"
                      title="Print Invoice"
                    >
                      Print
                    </Button>
                  )}
                </Inline>
              </Inline>

              <Grid columns={2} gap="md" width="full">
                <InfoField label="Billing Mode" value={billingMode} />
                {checkoutData.customerName ? (
                  <InfoField label="Customer Name" value={checkoutData.customerName} />
                ) : null}
                {checkoutData.customerPhone ? (
                  <InfoField label="Customer Phone" value={checkoutData.customerPhone} />
                ) : null}
                <InfoField
                  label="Address"
                  value={checkoutData.customerAddress || 'Not specified'}
                />
                {checkoutData.customerGstin && checkoutData.customerGstin.trim() ? (
                  <InfoField label="Customer GSTIN" value={checkoutData.customerGstin} />
                ) : null}
                {checkoutData.customerDlNo && checkoutData.customerDlNo.trim() ? (
                  <InfoField label="Customer DL No" value={checkoutData.customerDlNo} />
                ) : null}
                {checkoutData.customerPan && checkoutData.customerPan.trim() ? (
                  <InfoField label="Customer PAN" value={checkoutData.customerPan} />
                ) : null}
                <InfoField
                  label="Payment Method"
                  value={
                    <Stack gap="xs">
                      <Text weight="semibold">
                        {formatPaymentMethod(checkoutData.paymentMethod)}
                      </Text>
                      {paymentSplitLine ? (
                        <Text variant="caption" color="secondary">
                          {paymentSplitLine}
                        </Text>
                      ) : null}
                    </Stack>
                  }
                />
                <InfoField label="Date" value={currentDate} />
              </Grid>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stack gap="md">
              <Text variant="heading3" weight="semibold">
                Items
              </Text>
              <Box overflow="auto" width="full">
                <Table className={productChrome.tableMinWide}>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Product Name</TableHeaderCell>
                      <TableHeaderCell>Quantity</TableHeaderCell>
                      <TableHeaderCell>MRP</TableHeaderCell>
                      <TableHeaderCell>Selling Price</TableHeaderCell>
                      <TableHeaderCell>Discount</TableHeaderCell>
                      <TableHeaderCell>Additional Discount</TableHeaderCell>
                      <TableHeaderCell>Scheme/Deal</TableHeaderCell>
                      {billingMode === 'REGULAR' ? <TableHeaderCell>CGST%</TableHeaderCell> : null}
                      {billingMode === 'REGULAR' ? <TableHeaderCell>SGST%</TableHeaderCell> : null}
                      <TableHeaderCell>Total</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {checkoutData.items.map((item, index: number) => {
                      const discountAmount =
                        (item.maximumRetailPrice - item.priceToRetail) * item.quantity;
                      return (
                        <TableRow key={index}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>₹{item.maximumRetailPrice.toFixed(2)}</TableCell>
                          <TableCell>₹{item.priceToRetail.toFixed(2)}</TableCell>
                          <TableCell>₹{discountAmount.toFixed(2)}</TableCell>
                          <TableCell>
                            {item.saleAdditionalDiscount !== null &&
                            item.saleAdditionalDiscount !== undefined
                              ? `${item.saleAdditionalDiscount.toFixed(2)}%`
                              : '—'}
                          </TableCell>
                          <TableCell>{schemeLabel(item)}</TableCell>
                          {billingMode === 'REGULAR' ? (
                            <TableCell>
                              {item.cgst !== null && item.cgst !== undefined
                                ? `${item.cgst}%`
                                : '—'}
                            </TableCell>
                          ) : null}
                          {billingMode === 'REGULAR' ? (
                            <TableCell>
                              {item.sgst !== null && item.sgst !== undefined
                                ? `${item.sgst}%`
                                : '—'}
                            </TableCell>
                          ) : null}
                          <TableCell>₹{item.totalAmount.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stack gap="md">
              <Text variant="heading3" weight="semibold">
                Summary
              </Text>
              <Stack gap="sm">
                <SummaryRow label="Subtotal:" value={`₹${checkoutData.subTotal.toFixed(2)}`} />
                {checkoutData.sgstAmount !== undefined && checkoutData.sgstAmount > 0 ? (
                  <SummaryRow
                    label={`${gstAmountRowLabel('SGST', sgstPercentage)}:`}
                    value={`₹${checkoutData.sgstAmount.toFixed(2)}`}
                  />
                ) : null}
                {checkoutData.cgstAmount !== undefined && checkoutData.cgstAmount > 0 ? (
                  <SummaryRow
                    label={`${gstAmountRowLabel('CGST', cgstPercentage)}:`}
                    value={`₹${checkoutData.cgstAmount.toFixed(2)}`}
                  />
                ) : null}
                {((checkoutData.taxTotal ?? 0) !== 0 ||
                  (checkoutData.sgstAmount ?? 0) !== 0 ||
                  (checkoutData.cgstAmount ?? 0) !== 0) && (
                  <SummaryRow label="Tax:" value={`₹${checkoutData.taxTotal.toFixed(2)}`} />
                )}
                {checkoutData.saleAdditionalDiscountTotal !== 0 &&
                checkoutData.saleAdditionalDiscountTotal != null ? (
                  <SummaryRow
                    label={
                      checkoutData.saleAdditionalDiscountTotal > 0
                        ? 'Additional Discount:'
                        : 'Additional (markup):'
                    }
                    value={
                      checkoutData.saleAdditionalDiscountTotal > 0
                        ? `-₹${checkoutData.saleAdditionalDiscountTotal.toFixed(2)}`
                        : `+₹${Math.abs(checkoutData.saleAdditionalDiscountTotal).toFixed(2)}`
                    }
                  />
                ) : null}
                <SummaryRow
                  label="Grand Total:"
                  value={`₹${checkoutData.grandTotal.toFixed(2)}`}
                  total
                />
                {(checkoutData.totalCost != null ||
                  checkoutData.revenueAfterTax != null ||
                  checkoutData.totalProfit != null ||
                  checkoutData.marginPercent != null) && (
                  <>
                    <Box className={productChrome.sectionDivider} />
                    <SummaryRow
                      label="Total Cost:"
                      value={`₹${(checkoutData.totalCost ?? 0).toFixed(2)}`}
                    />
                    {checkoutData.revenueAfterTax != null ? (
                      <SummaryRow
                        label="Revenue (after tax):"
                        value={`₹${checkoutData.revenueAfterTax.toFixed(2)}`}
                      />
                    ) : null}
                    {checkoutData.totalProfit != null ? (
                      <SummaryRow
                        label="Profit:"
                        value={`₹${checkoutData.totalProfit.toFixed(2)}`}
                      />
                    ) : null}
                    {checkoutData.marginPercent != null ? (
                      <SummaryRow
                        label="Margin:"
                        value={`${checkoutData.marginPercent.toFixed(1)}%`}
                      />
                    ) : null}
                  </>
                )}
              </Stack>
            </Stack>
          </CardBody>
        </Card>

        {checkoutData.status !== 'COMPLETED' && (
          <Card>
            <CardBody>
              <Stack gap="md">
                <Text variant="heading3" weight="semibold">
                  Payment
                </Text>

                <PaymentMethodSplit
                  context="sale"
                  title="How was this bill settled?"
                  intro="Pick one of the six tenders. For split sales (e.g. Credit + Cash), enter the deposit and the remainder posts to Credit balances."
                  total={grandTotalNum}
                  value={{ method: paymentMethod, split: paymentSplit }}
                  onChange={(next) => {
                    setPaymentMethod(next.method);
                    setPaymentSplit(next.split);
                  }}
                  disabled={isProcessingPayment || isUpdating}
                />

                {paymentMethod && isCreditMethod(paymentMethod) && paymentSplit.creditAmount > 0 ? (
                  <Text variant="caption" color="secondary" className={productChrome.helperLine}>
                    <Link to="/dashboard/credit">
                      <Text as="span" className={productChrome.creditLink}>
                        Credit balances
                      </Text>
                    </Link>{' '}
                    ·{' '}
                    <Text as="span" weight="semibold">
                      Owes you
                    </Text>{' '}
                    ₹{paymentSplit.creditAmount.toFixed(2)}
                  </Text>
                ) : null}

                <Button
                  variant="solid"
                  fullWidth
                  onClick={handlePayment}
                  disabled={isProcessingPayment || isUpdating || !canSubmitPayment}
                  loading={isProcessingPayment}
                  leftIcon={
                    !isProcessingPayment ? (
                      <Text as="span" aria-hidden>
                        ✅
                      </Text>
                    ) : undefined
                  }
                >
                  {isProcessingPayment ? 'Processing…' : 'Complete sale'}
                </Button>
              </Stack>
            </CardBody>
          </Card>
        )}

        <Inline justify="center" width="full" padding="md">
          <Button
            variant="outline"
            onClick={handleGoBack}
            disabled={isUpdating}
            loading={isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Go Back and Sell'}
          </Button>
        </Inline>
      </Stack>

      {checkoutData?.purchaseId && (
        <PrintInvoiceModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          purchaseId={checkoutData.purchaseId}
          invoiceNo={checkoutData.invoiceNo}
          onError={(msg) => msg && notifyError(msg)}
        />
      )}
    </Stack>
  );
}
