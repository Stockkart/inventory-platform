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
import type { ResolvedCardLayout } from '../model/cardLayout.types';
import type { FieldVisibilityPolicy } from '../cardLayout/fieldVisibility';
import {
  getShopAvailableBaseCount,
  getShopAvailableDisplayCount,
} from '../lib/inventoryAvailability';
import { CardLayoutBody } from './cardLayout/CardLayoutBody';

export function normalizedBillingMode(item: InventoryItem): BillingMode {
  return item.billingMode === 'BASIC' ? 'BASIC' : 'REGULAR';
}

export function billingModeLabel(mode: BillingMode): string {
  return mode === 'BASIC' ? 'Basic' : 'Regular';
}

function effectivePrice(item: InventoryItem) {
  return item.sellingPrice ?? item.priceToRetail;
}

export interface ProductSearchCardProps {
  item: InventoryItem;
  /** The shop's resolved layout for this item's billing mode (from `useSurfaceCardLayout`). */
  layout: ResolvedCardLayout;
  /** Hides fields the member must not see; defaults to showing everything. */
  visibility?: FieldVisibilityPolicy;
  isPageLoading: boolean;
  isDetailLoading: boolean;
  isAddingToCart: boolean;
  onViewDetails: (item: InventoryItem) => void;
  onAddToCart: (item: InventoryItem, quantity: number) => void;
}

export function ProductSearchCard({
  item,
  layout,
  visibility,
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

        {/* Everything between the title row and the footer is the shop's configured layout. */}
        <CardLayoutBody item={item} layout={layout} visibility={visibility} />

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
