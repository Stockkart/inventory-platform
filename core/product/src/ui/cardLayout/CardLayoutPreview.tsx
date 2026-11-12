import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  Inline,
  Stack,
  Text,
  cn,
  productChrome,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import type { InventoryItem } from '../../model/types';
import { CARD_SURFACE_IDS, type ResolvedCardLayout } from '../../model/cardLayout.types';
import { ProductSearchCard } from '../ProductSearchCard';
import { CardLayoutBody } from './CardLayoutBody';

export interface CardLayoutPreviewProps {
  surfaceId: string;
  item: InventoryItem;
  layout: ResolvedCardLayout;
}

const noop = () => undefined;

/**
 * Live preview using the real surface component where one exists in this package
 * (configurable-product-card Req 9.7): the product search card itself, the compact Scan & Sell
 * row, and an ingredient-style card for the cafe surface (the cafe component lives in its plugin;
 * header and footer are mimicked, the body is the real renderer).
 */
export function CardLayoutPreview({ surfaceId, item, layout }: CardLayoutPreviewProps) {
  return (
    <Stack gap="sm" aria-label="Card preview">
      <Inline justify="between" align="center">
        <Text as="p" className={surfaceChrome.profileSectionLabel}>
          Preview
        </Text>
        <Text variant="caption" color="secondary">
          Sample data · as staff see it
        </Text>
      </Inline>
      {surfaceId === CARD_SURFACE_IDS.scanSell ? (
        <ScanSellRowPreview item={item} layout={layout} />
      ) : surfaceId === CARD_SURFACE_IDS.cafeIngredientSearch ? (
        <IngredientCardPreview item={item} layout={layout} />
      ) : (
        <Box style={{ maxWidth: 360 }}>
          <ProductSearchCard
            item={item}
            layout={layout}
            isPageLoading={false}
            isDetailLoading={false}
            isAddingToCart={false}
            onViewDetails={noop}
            onAddToCart={noop}
          />
        </Box>
      )}
    </Stack>
  );
}

function ScanSellRowPreview({ item, layout }: { item: InventoryItem; layout: ResolvedCardLayout }) {
  return (
    <Box style={{ maxWidth: 480 }}>
      <Inline justify="between" align="start" gap="md">
        <Stack gap="xs" flex="1" minWidth="0">
          <Inline gap="sm" align="center">
            <Text weight="semibold">{item.name || 'Unnamed Product'}</Text>
            <Badge variant="info">{item.billingMode === 'BASIC' ? 'BASIC' : 'REGULAR'}</Badge>
          </Inline>
          <CardLayoutBody item={item} layout={layout} variant="compact" />
        </Stack>
        <Button type="button" variant="solid" size="sm" disabled>
          Add
        </Button>
      </Inline>
    </Box>
  );
}

function IngredientCardPreview({
  item,
  layout,
}: {
  item: InventoryItem;
  layout: ResolvedCardLayout;
}) {
  return (
    <Box style={{ maxWidth: 360 }}>
      <Card className={productChrome.searchResultCard}>
        <CardBody className={productChrome.searchResultBody}>
          <Box className={productChrome.searchResultIdentity}>
            <Box as="h3" className={productChrome.searchResultTitle}>
              {item.name || 'Unnamed ingredient'}
            </Box>
            <Badge
              variant="neutral"
              className={cn(productChrome.searchResultBadge, productChrome.searchResultBadgeBasic)}
            >
              Ingredient
            </Badge>
          </Box>
          <CardLayoutBody item={item} layout={layout} chips={['Low stock']} />
          <Box className={productChrome.searchResultGrow} aria-hidden />
        </CardBody>
        <CardFooter className={productChrome.searchResultFooter}>
          <Button type="button" variant="outline" disabled>
            View Details
          </Button>
          <Button type="button" variant="outline" disabled>
            Correct stock
          </Button>
        </CardFooter>
      </Card>
    </Box>
  );
}
