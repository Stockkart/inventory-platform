import type { InventoryItem } from '@inventory-platform/product/types';
import { resolveInventoryDocumentId } from '@inventory-platform/product/api';
import { getExtensionFieldString, isSellDirectInventory } from '@inventory-platform/schema';
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  cn,
  productChrome,
} from '@inventory-platform/ui-kit';

function stockQty(item: InventoryItem): number {
  return item.currentBaseCount ?? item.currentCount ?? 0;
}

function stockUnit(item: InventoryItem): string {
  return item.baseUnit?.trim() || item.uqc?.trim() || 'units';
}

function sellPrice(item: InventoryItem): number | null {
  const selling = item.sellingPrice;
  if (selling != null && selling > 0) return selling;
  if (item.priceToRetail != null && item.priceToRetail > 0) return item.priceToRetail;
  return null;
}

function isLowStock(item: InventoryItem): boolean {
  const stock = stockQty(item);
  const threshold = item.thresholdCount ?? 0;
  return threshold > 0 && stock <= threshold;
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

export interface IngredientSearchCardProps {
  item: InventoryItem;
  isPageLoading: boolean;
  isDetailLoading: boolean;
  isAddingToCart: boolean;
  onViewDetails: (item: InventoryItem) => void;
  onCorrectStock: (item: InventoryItem) => void;
  onAddToCart: (item: InventoryItem) => void;
}

export function IngredientSearchCard({
  item,
  isPageLoading,
  isDetailLoading,
  isAddingToCart,
  onViewDetails,
  onCorrectStock,
  onAddToCart,
}: IngredientSearchCardProps) {
  const ingredientType = getExtensionFieldString(item, 'ingredientType');
  const stock = stockQty(item);
  const unit = stockUnit(item);
  const low = isLowStock(item);
  const itemId = resolveInventoryDocumentId(item);
  const sellDirect = isSellDirectInventory(item);
  const price = sellPrice(item);
  const outOfStock = stock <= 0;
  const priceMissing = price == null;
  const purchaseDate = item.purchaseDate || item.createdAt;
  const chips = [
    ingredientType && sellDirect ? ingredientType : null,
    low ? 'Low stock' : null,
  ].filter(Boolean) as string[];

  return (
    <Card className={productChrome.searchResultCard}>
      <CardBody className={productChrome.searchResultBody}>
        <Box className={productChrome.searchResultIdentity}>
          <Box as="h3" className={productChrome.searchResultTitle}>
            {item.name || 'Unnamed ingredient'}
          </Box>
          <Badge
            variant={sellDirect ? 'success' : 'neutral'}
            className={cn(
              productChrome.searchResultBadge,
              !sellDirect && productChrome.searchResultBadgeBasic,
            )}
          >
            {sellDirect ? 'Sell direct' : ingredientType || 'Ingredient'}
          </Badge>
        </Box>

        {(item.companyName || item.barcode || item.location) && (
          <Box
            className={cn(productChrome.searchResultStack, productChrome.searchResultStackTight)}
          >
            {item.companyName ? (
              <Box as="p" className={productChrome.searchResultLine}>
                Company: {item.companyName}
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
            Current: {stock} {unit}
            {low ? ' (low)' : ''}
          </Box>
          <Box as="p" className={productChrome.searchResultLine}>
            Received: {item.receivedCount ?? 0} | Used: {item.soldCount ?? 0}
          </Box>
          {(item.thresholdCount ?? 0) > 0 ? (
            <Box as="p" className={productChrome.searchResultLine}>
              Threshold: {item.thresholdCount}
            </Box>
          ) : null}
        </Box>

        <Box className={cn(productChrome.searchResultStack, productChrome.searchResultStackTight)}>
          <Box
            as="p"
            className={cn(productChrome.searchResultLine, productChrome.searchResultLineStrong)}
          >
            Cost: {item.costPrice != null ? `₹${item.costPrice.toFixed(2)} / ${unit}` : '—'}
          </Box>
          <Box
            as="p"
            className={cn(productChrome.searchResultLine, productChrome.searchResultLineStrong)}
          >
            Selling Price: {price != null ? `₹${price.toFixed(2)}` : '—'}
          </Box>
        </Box>

        <Box className={cn(productChrome.searchResultStack, productChrome.searchResultStackTight)}>
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
          sellDirect && productChrome.searchResultFooterTriple,
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
        <Button
          type="button"
          variant="outline"
          onClick={() => onCorrectStock(item)}
          disabled={!itemId || isPageLoading}
        >
          Correct stock
        </Button>
        {sellDirect ? (
          <Button
            type="button"
            variant="solid"
            onClick={() => onAddToCart(item)}
            disabled={!itemId || isAddingToCart || outOfStock || priceMissing}
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
        ) : null}
      </CardFooter>
    </Card>
  );
}
