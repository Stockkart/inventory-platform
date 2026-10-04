import type { InventoryItem } from '@inventory-platform/product/types';
import { resolveInventoryDocumentId } from '@inventory-platform/product/api';
import { CardLayoutBody, type ResolvedCardLayout } from '@inventory-platform/product';
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


export interface IngredientSearchCardProps {
  item: InventoryItem;
  /** The shop's resolved `cafe-ingredient-search` layout (from `useSurfaceCardLayout`). */
  layout: ResolvedCardLayout;
  isPageLoading: boolean;
  isDetailLoading: boolean;
  isAddingToCart: boolean;
  onViewDetails: (item: InventoryItem) => void;
  onCorrectStock: (item: InventoryItem) => void;
  onAddToCart: (item: InventoryItem) => void;
}

export function IngredientSearchCard({
  item,
  layout,
  isPageLoading,
  isDetailLoading,
  isAddingToCart,
  onViewDetails,
  onCorrectStock,
  onAddToCart,
}: IngredientSearchCardProps) {
  const ingredientType = getExtensionFieldString(item, 'ingredientType');
  const stock = stockQty(item);
  const low = isLowStock(item);
  const itemId = resolveInventoryDocumentId(item);
  const sellDirect = isSellDirectInventory(item);
  const price = sellPrice(item);
  const outOfStock = stock <= 0;
  const priceMissing = price == null;
  // Surface-specific chips; the renderer merges them with the item-attribute chips.
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

        {/* Everything between the title row and the footer is the shop's configured layout. */}
        <CardLayoutBody item={item} layout={layout} chips={chips} />

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
