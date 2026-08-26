import { useState } from 'react';
import type { BillingMode, InventoryItem } from '@inventory-platform/product/types';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  QtyStepper,
  cn,
  productChrome,
} from '@inventory-platform/ui-kit';
import { formatInventoryExpiryDate, getInventoryBatchNo } from '@inventory-platform/schema';
import {
  getShopAvailableBaseCount,
  getShopAvailableDisplayCount,
} from '../lib/inventoryAvailability';

export function normalizedBillingMode(item: InventoryItem): BillingMode {
  return item.billingMode === 'BASIC' ? 'BASIC' : 'REGULAR';
}

export function billingModeLabel(mode: BillingMode): string {
  return mode === 'BASIC' ? 'Basic' : 'Regular';
}

function formatDisplayDate(dateString: string) {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function itemTypeLabel(item: InventoryItem) {
  if (!item.itemType || item.itemType === 'NORMAL') {
    return null;
  }
  if (item.itemType === 'DEGREE' && item.itemTypeDegree != null) {
    return `Temp ${item.itemTypeDegree}°`;
  }
  if (item.itemType === 'COSTLY') {
    return 'Costly';
  }
  return item.itemType;
}

function discountLabel(item: InventoryItem) {
  if (!item.discountApplicable) {
    return null;
  }
  if (item.discountApplicable === 'DISCOUNT') {
    return 'Discount';
  }
  if (item.discountApplicable === 'SCHEME') {
    return 'Scheme';
  }
  return 'Discount + scheme';
}

function schemeLabel(item: InventoryItem) {
  const schemeType = item.schemeType ?? 'FIXED_UNITS';
  if (schemeType === 'PERCENTAGE' && item.schemePercentage != null) {
    return `${item.schemePercentage}% scheme`;
  }
  if (
    (schemeType === 'FIXED_UNITS' || !item.schemeType) &&
    item.scheme != null &&
    item.scheme > 0
  ) {
    return `${item.scheme} free`;
  }
  return null;
}

function effectivePrice(item: InventoryItem) {
  return item.sellingPrice ?? item.priceToRetail;
}

export interface ProductSearchCardProps {
  item: InventoryItem;
  isPageLoading: boolean;
  isDetailLoading: boolean;
  isAddingToCart: boolean;
  onViewDetails: (item: InventoryItem) => void;
  onAddToCart: (item: InventoryItem, quantity: number) => void;
}

export function ProductSearchCard({
  item,
  isPageLoading,
  isDetailLoading,
  isAddingToCart,
  onViewDetails,
  onAddToCart,
}: ProductSearchCardProps) {
  const mode = normalizedBillingMode(item);
  const price = effectivePrice(item);
  const availableDisplay = getShopAvailableDisplayCount(item);
  const outOfStock = getShopAvailableBaseCount(item) <= 0;
  const priceMissing = price == null;
  // Quantity lives on the card, not on the page: each result carries its own count until it is
  // handed to a cart, and the stock on this lot is the ceiling. The stepper stays out of the way
  // until Add to Cart is pressed, so a card at a glance is still two buttons.
  const [quantity, setQuantity] = useState(1);
  const [pickingQuantity, setPickingQuantity] = useState(false);
  const maxQuantity = Math.max(1, Math.floor(availableDisplay));
  const clampQuantity = (next: number) => Math.min(Math.max(next, 1), maxQuantity);
  const addBlocked = isPageLoading || isAddingToCart || outOfStock || priceMissing;

  const addLabel = outOfStock ? 'Out of Stock' : priceMissing ? 'Price not set' : 'Add to Cart';

  // The box keeps what is typed, including an empty string, and only settles on a number when
  // it is left or committed. Clamping on every keystroke made the field impossible to clear:
  // deleting the 1 put a 1 straight back, so a two-digit quantity could never be typed.
  const [draft, setDraft] = useState('1');

  const setQuantityFromDraft = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    const next = Number.isNaN(parsed) ? 1 : clampQuantity(parsed);
    setQuantity(next);
    setDraft(String(next));
    return next;
  };

  const stepQuantity = (delta: number) => {
    const next = clampQuantity(quantity + delta);
    setQuantity(next);
    setDraft(String(next));
  };

  const startPicking = () => {
    setQuantity(1);
    setDraft('1');
    setPickingQuantity(true);
  };

  const confirmAdd = () => {
    onAddToCart(item, setQuantityFromDraft(draft));
    setPickingQuantity(false);
    setQuantity(1);
    setDraft('1');
  };
  const typeLabel = itemTypeLabel(item);
  const discountText = discountLabel(item);
  const schemeText = schemeLabel(item);
  const purchaseDate = item.purchaseDate || item.createdAt;
  // The batch lives on the line for some verticals and in the extension fields
  // for others, so it is read through the helper that knows both. The helper
  // answers "—" when there is none, which is a value to print in a table of
  // fixed rows but not a line to add to a card.
  const rawBatchNo = getInventoryBatchNo(item);
  const batchNo = rawBatchNo && rawBatchNo !== '—' ? rawBatchNo : '';
  const chips = [typeLabel, discountText, schemeText].filter(Boolean) as string[];

  return (
    <Card className={productChrome.searchResultCard}>
      <CardBody className={productChrome.searchResultBody}>
        <Box className={productChrome.searchResultIdentity}>
          <Box as="h3" className={productChrome.searchResultTitle}>
            {item.name || 'Unnamed Product'}
          </Box>
          <Badge
            variant={mode === 'BASIC' ? 'neutral' : 'info'}
            className={cn(
              productChrome.searchResultBadge,
              mode === 'BASIC' && productChrome.searchResultBadgeBasic,
            )}
          >
            {billingModeLabel(mode)}
          </Badge>
        </Box>

        {(item.companyName || item.barcode || item.location || batchNo) && (
          <Box
            className={cn(productChrome.searchResultStack, productChrome.searchResultStackTight)}
          >
            {item.companyName ? (
              <Box as="p" className={productChrome.searchResultLine}>
                Company: {item.companyName}
              </Box>
            ) : null}
            {batchNo ? (
              <Box as="p" className={productChrome.searchResultLine}>
                Batch: {batchNo}
              </Box>
            ) : null}
            {item.barcode ? (
              <Box as="p" className={productChrome.searchResultLine}>
                Barcode: {item.barcode}
              </Box>
            ) : null}
            {item.location ? (
              <Box as="p" className={productChrome.searchResultLine}>
                Location: {item.location}
              </Box>
            ) : null}
          </Box>
        )}

        <Box as="hr" className={productChrome.searchResultDivider} />

        <Box className={cn(productChrome.searchResultStack, productChrome.searchResultStackTight)}>
          <Box as="p" className={productChrome.searchResultLine}>
            Available: {availableDisplay}
          </Box>
          <Box as="p" className={productChrome.searchResultLine}>
            Received: {item.receivedCount} | Sold: {item.soldCount}
          </Box>
        </Box>

        <Box className={cn(productChrome.searchResultStack, productChrome.searchResultStackTight)}>
          <Box
            as="p"
            className={cn(productChrome.searchResultLine, productChrome.searchResultLineStrong)}
          >
            Selling Price: {price != null ? `₹${price.toFixed(2)}` : '—'}
          </Box>
          <Box
            as="p"
            className={cn(productChrome.searchResultLine, productChrome.searchResultLineStrong)}
          >
            MRP: {item.maximumRetailPrice != null ? `₹${item.maximumRetailPrice.toFixed(2)}` : '—'}
          </Box>
          {item.saleAdditionalDiscount != null ? (
            <Box
              as="p"
              className={cn(productChrome.searchResultLine, productChrome.searchResultLineStrong)}
            >
              Additional Discount: {item.saleAdditionalDiscount.toFixed(2)}%
            </Box>
          ) : null}
        </Box>

        <Box className={cn(productChrome.searchResultStack, productChrome.searchResultStackTight)}>
          <Box as="p" className={productChrome.searchResultLine}>
            Expires: {formatInventoryExpiryDate(item)}
          </Box>
          {purchaseDate ? (
            <Box as="p" className={productChrome.searchResultLine}>
              Purchased: {formatDisplayDate(purchaseDate)}
            </Box>
          ) : null}
          {chips.length > 0 ? (
            <Box className={productChrome.searchResultChips}>
              {chips.map((chip) => (
                <Box as="span" key={chip} className={productChrome.searchResultChip}>
                  {chip}
                </Box>
              ))}
            </Box>
          ) : null}
          {item.description ? (
            <Box as="p" className={productChrome.searchResultDesc}>
              {item.description}
            </Box>
          ) : null}
        </Box>

        <Box className={productChrome.searchResultGrow} aria-hidden />
      </CardBody>

      <CardFooter
        className={cn(
          productChrome.searchResultFooter,
          pickingQuantity && productChrome.searchResultFooterTriple,
        )}
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => onViewDetails(item)}
          disabled={isPageLoading || isDetailLoading}
          loading={isDetailLoading}
        >
          {isDetailLoading ? 'Loading…' : 'View Details'}
        </Button>
        {pickingQuantity ? (
          <>
            <QtyStepper
              value={draft}
              onDecrement={() => stepQuantity(-1)}
              onIncrement={() => stepQuantity(1)}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={(e) => setQuantityFromDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  confirmAdd();
                }
              }}
              disabled={addBlocked}
              decrementDisabled={quantity <= 1}
              incrementDisabled={quantity >= maxQuantity}
              inputProps={{ min: 1, max: maxQuantity, 'aria-label': 'Quantity', autoFocus: true }}
            />
            <Button
              type="button"
              variant="solid"
              onClick={confirmAdd}
              disabled={addBlocked}
              loading={isAddingToCart}
            >
              {isAddingToCart ? 'Adding…' : 'Add'}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="solid"
            onClick={startPicking}
            disabled={addBlocked}
            loading={isAddingToCart}
          >
            {isAddingToCart ? 'Adding…' : addLabel}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
