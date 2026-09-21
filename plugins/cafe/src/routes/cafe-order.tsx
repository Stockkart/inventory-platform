import { Stack, Text } from '@inventory-platform/ui-kit';

/**
 * Placeholder for the order punch screen. Replaced entirely by the next
 * task — do not build on this; it exists only so `cafeOrderRoutes`'
 * `:orderId` child resolves and the workspace keeps building.
 */
export function meta() {
  return [{ title: 'Order - StockKart' }, { name: 'description', content: 'Cafe order detail' }];
}

export default function CafeOrderPlaceholderPage() {
  return (
    <Stack gap="md">
      <Text>Order detail is coming soon.</Text>
    </Stack>
  );
}
