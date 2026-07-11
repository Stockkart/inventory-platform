import type { BillingMode, InventoryItem } from '@inventory-platform/product/types';
import {
  Badge,
  Button,
  Card,
  CardBody,
  Inline,
  Stack,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import { formatInventoryExpiryDate } from '@inventory-platform/schema';

export function normalizedBillingMode(item: InventoryItem): BillingMode {
  return item.billingMode === 'BASIC' ? 'BASIC' : 'REGULAR';
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
    return `Temperature (${item.itemTypeDegree}°)`;
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
    return 'Discount applicable';
  }
  if (item.discountApplicable === 'SCHEME') {
    return 'Scheme applicable';
  }
  return 'Both discount and scheme applicable';
}

function schemeLabel(item: InventoryItem) {
  const schemeType = item.schemeType ?? 'FIXED_UNITS';
  if (schemeType === 'PERCENTAGE' && item.schemePercentage != null) {
    return `Scheme/Deal: ${item.schemePercentage}%`;
  }
  if (
    (schemeType === 'FIXED_UNITS' || !item.schemeType) &&
    item.scheme != null &&
    item.scheme > 0
  ) {
    return `Scheme/Deal: ${item.scheme} free`;
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
  onAddToSell: (item: InventoryItem) => void;
}

export function ProductSearchCard({
  item,
  isPageLoading,
  isDetailLoading,
  isAddingToCart,
  onViewDetails,
  onAddToSell,
}: ProductSearchCardProps) {
  const price = effectivePrice(item);
  const outOfStock = item.currentCount <= 0;
  const priceMissing = price == null;
  const typeLabel = itemTypeLabel(item);
  const discountText = discountLabel(item);
  const schemeText = schemeLabel(item);
  const purchaseDate = item.purchaseDate || item.createdAt;
  const hasMeta =
    typeLabel ||
    discountText ||
    purchaseDate ||
    schemeText ||
    item.itemType ||
    item.discountApplicable ||
    item.purchaseDate ||
    item.createdAt ||
    item.schemeType ||
    item.scheme != null;

  return (
    <Card>
      <CardBody>
        <Stack gap="xs">
          <Text variant="heading3" weight="semibold">
            {item.name || 'Unnamed Product'}
          </Text>

          <Badge variant="info">{normalizedBillingMode(item)}</Badge>

          {item.companyName ? (
            <Text variant="caption" color="muted">
              Company: {item.companyName}
            </Text>
          ) : null}
          {item.barcode ? (
            <Text variant="caption" color="muted">
              Barcode: {item.barcode}
            </Text>
          ) : null}
          {item.location ? (
            <Text variant="caption" color="secondary" weight="medium">
              Location: {item.location}
            </Text>
          ) : null}

          <Stack gap="xs" padding="sm" className={surfaceChrome.borderTop}>
            <Stack gap="xs">
              <Text variant="caption" color="secondary">
                Current: {item.currentCount}
              </Text>
              <Text variant="caption" color="secondary">
                Received: {item.receivedCount} | Sold: {item.soldCount}
              </Text>
            </Stack>

            <Stack gap="xs">
              <Text variant="caption" color="secondary" weight="semibold">
                Selling Price: ₹{price != null ? price.toFixed(2) : '—'}
              </Text>
              <Text variant="caption" color="secondary" weight="semibold">
                MRP: ₹{item.maximumRetailPrice != null ? item.maximumRetailPrice.toFixed(2) : '—'}
              </Text>
              {item.saleAdditionalDiscount != null ? (
                <Text variant="caption" color="secondary" weight="semibold">
                  Additional Discount: {item.saleAdditionalDiscount.toFixed(2)}%
                </Text>
              ) : null}
            </Stack>

            <Text variant="caption" color="secondary" weight="medium">
              Expires: {formatInventoryExpiryDate(item)}
            </Text>

            {hasMeta ? (
              <>
                <Inline gap="sm" flexWrap>
                  {typeLabel ? (
                    <Text variant="caption" color="secondary" weight="medium">
                      Type: {typeLabel}
                    </Text>
                  ) : null}
                  {discountText ? (
                    <Text variant="caption" color="secondary" weight="medium">
                      {discountText}
                    </Text>
                  ) : null}
                  {purchaseDate ? (
                    <Text variant="caption" color="secondary" weight="medium">
                      Purchased: {formatDisplayDate(purchaseDate)}
                    </Text>
                  ) : null}
                </Inline>
                {schemeText ? (
                  <Text variant="caption" color="secondary" weight="medium">
                    {schemeText}
                  </Text>
                ) : null}
              </>
            ) : null}
          </Stack>

          {item.description ? (
            <Text variant="caption" color="secondary" className={surfaceChrome.italic}>
              {item.description}
            </Text>
          ) : null}

          <Inline gap="sm" width="full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => onViewDetails(item)}
              disabled={isPageLoading || isDetailLoading}
              loading={isDetailLoading}
            >
              {isDetailLoading ? 'Loading…' : 'View Details'}
            </Button>
            <Button
              type="button"
              variant="solid"
              size="sm"
              fullWidth
              onClick={() => onAddToSell(item)}
              disabled={isPageLoading || isAddingToCart || outOfStock || priceMissing}
              loading={isAddingToCart}
            >
              {isAddingToCart
                ? 'Adding...'
                : outOfStock
                ? 'Out of Stock'
                : priceMissing
                ? 'Price not set'
                : 'Add to Sell'}
            </Button>
          </Inline>
        </Stack>
      </CardBody>
    </Card>
  );
}
