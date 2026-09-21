import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useNotify } from '@inventory-platform/session';
import {
  Badge,
  Box,
  Button,
  CenteredLoader,
  EmptyState,
  FormField,
  Inline,
  Input,
  Modal,
  PageHeader,
  Select,
  Stack,
  Text,
  productChrome,
  surfaceChrome,
  type SelectOptionDef,
} from '@inventory-platform/ui-kit';
import { useOpenOrderMutation, useOpenOrdersQuery } from '../queries';
import type { CafeOrder } from '../types/order';

export function meta() {
  return [
    { title: 'Orders - StockKart' },
    { name: 'description', content: 'Open cafe orders and starting a new one' },
  ];
}

type OrderType = CafeOrder['orderType'];

const ORDER_TYPE_OPTIONS: SelectOptionDef[] = [
  { value: 'DINE_IN', label: 'Dine-in' },
  { value: 'TAKEAWAY', label: 'Takeaway' },
];

function orderLabel(order: CafeOrder): string {
  return order.tableLabel ?? `Token ${order.tokenNo ?? '—'}`;
}

function orderTypeLabel(orderType: OrderType): string {
  return orderType === 'DINE_IN' ? 'Dine-in' : 'Takeaway';
}

/**
 * CafeOrder only carries `businessDate` (the shop's trading day), not an
 * open timestamp — so a precise elapsed-time "age" (e.g. "12m ago") isn't
 * available without polling for a clock tick, which is disallowed. This
 * renders "Today" for the current business day and the date itself
 * otherwise, which still flags an order that has carried over a day.
 */
function orderAgeLabel(businessDate: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (businessDate === today) return 'Today';
  const parsed = new Date(businessDate);
  if (Number.isNaN(parsed.getTime())) return businessDate;
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function NewOrderModal({
  onClose,
  onCreate,
  isSubmitting,
}: {
  onClose: () => void;
  onCreate: (orderType: OrderType, tableLabel: string) => void;
  isSubmitting: boolean;
}) {
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [tableLabel, setTableLabel] = useState('');
  const isDineIn = orderType === 'DINE_IN';
  const trimmedLabel = tableLabel.trim();
  const canSubmit = !isSubmitting && (!isDineIn || trimmedLabel.length > 0);

  return (
    <Modal open onClose={onClose} size="sm">
      <Modal.Header title="New order" onClose={onClose} />
      <Modal.Body>
        <Stack gap="md">
          <FormField label="Order type" id="new-order-type">
            <Select
              id="new-order-type"
              options={ORDER_TYPE_OPTIONS}
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as OrderType)}
              disabled={isSubmitting}
            />
          </FormField>

          {isDineIn ? (
            <FormField label="Table label" id="new-order-table" required>
              <Input
                id="new-order-table"
                value={tableLabel}
                onChange={(e) => setTableLabel(e.target.value)}
                placeholder="e.g. Table 4"
                disabled={isSubmitting}
                autoFocus
              />
            </FormField>
          ) : null}
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="solid"
          onClick={() => onCreate(orderType, trimmedLabel)}
          disabled={!canSubmit}
          loading={isSubmitting}
        >
          {isSubmitting ? 'Starting…' : 'Start order'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function OrderRow({ order, onSelect }: { order: CafeOrder; onSelect: (orderId: string) => void }) {
  return (
    <Box as="li">
      <Button
        type="button"
        variant="ghost"
        fullWidth
        align="start"
        className={surfaceChrome.radiusNone}
        onClick={() => onSelect(order.orderId)}
      >
        <Stack gap="xs" width="full">
          <Inline gap="sm" justify="between" width="full">
            <Inline gap="sm">
              <Text weight="semibold">{orderLabel(order)}</Text>
              <Badge variant={order.orderType === 'DINE_IN' ? 'info' : 'neutral'}>
                {orderTypeLabel(order.orderType)}
              </Badge>
            </Inline>
            <Text variant="caption" color="secondary">
              {orderAgeLabel(order.businessDate)}
            </Text>
          </Inline>
          <Inline gap="md">
            <Text variant="caption" color="secondary">{`Order ${order.orderNo}`}</Text>
            <Text variant="caption" color="secondary">
              {`${order.roundsPunched} ${order.roundsPunched === 1 ? 'round' : 'rounds'}`}
            </Text>
          </Inline>
        </Stack>
      </Button>
    </Box>
  );
}

export function CafeOrdersPage() {
  const { data: orders = [], isLoading } = useOpenOrdersQuery();
  const openOrder = useOpenOrderMutation();
  const navigate = useNavigate();
  const { error: notifyError } = useNotify;
  const [isModalOpen, setModalOpen] = useState(false);

  const handleCreate = (orderType: OrderType, tableLabel: string) => {
    openOrder.mutate(
      orderType === 'DINE_IN' ? { orderType, tableLabel: tableLabel.trim() } : { orderType },
      {
        onSuccess: (order) => {
          setModalOpen(false);
          navigate(`/dashboard/cafe-orders/${order.orderId}`);
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : 'Failed to start order';
          notifyError(message);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Stack gap="md" className={productChrome.pageShell}>
        <CenteredLoader label="Loading orders…" />
      </Stack>
    );
  }

  return (
    <Stack gap="md" className={productChrome.pageShell}>
      <PageHeader
        description="Open dine-in and takeaway orders. Punch rounds to the kitchen from an order."
        actions={
          <Button type="button" variant="solid" onClick={() => setModalOpen(true)}>
            + New order
          </Button>
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          title="No open orders"
          description="Start a new dine-in or takeaway order to see it here."
          action={
            <Button type="button" variant="solid" onClick={() => setModalOpen(true)}>
              New order
            </Button>
          }
        />
      ) : (
        <Box
          as="ul"
          display="flex"
          flexDirection="column"
          gap="sm"
          margin="none"
          padding="none"
          className={surfaceChrome.listPlain}
        >
          {orders.map((order) => (
            <OrderRow
              key={order.orderId}
              order={order}
              onSelect={(orderId) => navigate(`/dashboard/cafe-orders/${orderId}`)}
            />
          ))}
        </Box>
      )}

      {isModalOpen ? (
        <NewOrderModal
          onClose={() => setModalOpen(false)}
          onCreate={handleCreate}
          isSubmitting={openOrder.isPending}
        />
      ) : null}
    </Stack>
  );
}
