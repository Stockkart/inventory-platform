import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useNotify } from '@inventory-platform/session';
import { resolveInventoryDocumentId, sellCatalogApi } from '@inventory-platform/product/api';
import {
  inventorySellableRef,
  menuSellableRef,
  type InventoryItem,
  type MenuItem,
  type SellCatalog,
} from '@inventory-platform/product/types';
import { CafeSellCatalogPanel } from '@inventory-platform/product/ui';
import {
  Badge,
  Box,
  Button,
  CenteredLoader,
  EmptyState,
  Inline,
  PageHeader,
  Stack,
  Text,
  productChrome,
} from '@inventory-platform/ui-kit';
import { createBasket, addLine, removeLine, setNote, setQuantity } from '../lib/punchBasket';
import { createPrintQueue, type PrintQueue, type PrintState } from '../lib/printQueue';
import { printKot } from '../lib/printKot';
import { keyAfter, outcomeOf, useOrderQuery, usePunchMutation } from '../queries';
import type { CafeKot, CafeOrderLine } from '../types/order';
import { KotTicketStrip } from '../ui/KotTicketStrip';
import { PunchBasketPanel } from '../ui/PunchBasketPanel';

export function meta() {
  return [
    { title: 'Order - StockKart' },
    { name: 'description', content: 'Punch rounds to the kitchen and track ticket printing' },
  ];
}

interface PunchedRound {
  kotId: string;
  department: string | null;
  lines: CafeOrderLine[];
}

/** Rounds already punched (from `order.lines`), grouped by the kot they belong to. Read-only. */
function groupPunchedRounds(lines: CafeOrderLine[]): PunchedRound[] {
  const order: string[] = [];
  const byKot = new Map<string, CafeOrderLine[]>();
  for (const line of lines) {
    if (!line.kotId) continue;
    if (!byKot.has(line.kotId)) {
      byKot.set(line.kotId, []);
      order.push(line.kotId);
    }
    byKot.get(line.kotId)?.push(line);
  }
  return order.map((kotId) => {
    const group = byKot.get(kotId) ?? [];
    return { kotId, department: group[0]?.department ?? null, lines: group };
  });
}

export function CafeOrderPunchPage() {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { error: notifyError } = useNotify;

  const { data: order, isLoading } = useOrderQuery(orderId);

  const [catalog, setCatalog] = useState<SellCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    sellCatalogApi
      .get()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err) => {
        if (!cancelled) {
          notifyError(err instanceof Error ? err.message : 'Failed to load menu');
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [notifyError]);

  // --- Wiring below follows plans/cafe-kot-frontend task-9-brief.md verbatim: the ticket
  // state, the print queue, and the idempotency key lifecycle encode guarantees the rest
  // of the system depends on. ---

  const [basket, setBasket] = useState(createBasket);
  const [tickets, setTickets] = useState<Array<{ kot: CafeKot; state: PrintState }>>([]);
  const punch = usePunchMutation(orderId);

  const setTicketState = useCallback((kotId: string, state: PrintState) => {
    setTickets((current) => current.map((t) => (t.kot.kotId === kotId ? { ...t, state } : t)));
  }, []);

  // One queue for the life of the screen: tickets print one at a time, never racing.
  const queueRef = useRef<PrintQueue | null>(null);
  if (queueRef.current === null) {
    queueRef.current = createPrintQueue((kotId) => printKot(kotId), setTicketState);
  }

  const handleSend = () => {
    punch.mutate(basket, {
      onSuccess: (kots) => {
        // Printing begins only once the punch has resolved. The tickets exist now;
        // a printer problem must not look like a failed punch.
        setTickets((current) => [
          ...current,
          ...kots.map((kot) => ({ kot, state: 'QUEUED' as PrintState })),
        ]);
        kots.forEach((kot) => queueRef.current?.enqueue(kot.kotId));
        setBasket(createBasket());
      },
      onError: (error) => {
        const retained = keyAfter(outcomeOf(error), basket.key);
        if (retained === null) {
          // Permanent rejection: a new key, or the basket is stuck behind a dead request.
          setBasket((b) => ({ ...b, key: createBasket().key }));
        }
        // Otherwise leave the basket untouched so the retry reuses the same key.
        notifyError(error instanceof Error ? error.message : 'Failed to send round to the kitchen');
      },
    });
  };

  const handleRetry = (kotId: string) => queueRef.current?.enqueue(kotId);

  // --- End verbatim wiring. ---

  const handleAddMenuItem = (item: MenuItem) => {
    setBasket((b) => addLine(b, { sellableRef: menuSellableRef(item.id), name: item.name }));
  };

  const handleAddDirectStock = (item: InventoryItem) => {
    const lotId = resolveInventoryDocumentId(item);
    if (!lotId) {
      notifyError('Cannot add item: missing inventory id');
      return;
    }
    setBasket((b) =>
      addLine(b, { sellableRef: inventorySellableRef(lotId), name: item.name ?? 'Item' }),
    );
  };

  const punchedRounds = useMemo(() => groupPunchedRounds(order?.lines ?? []), [order]);

  if (isLoading) {
    return (
      <Stack gap="md" className={productChrome.pageShell}>
        <CenteredLoader label="Loading order…" />
      </Stack>
    );
  }

  if (!order) {
    return (
      <Stack gap="md" className={productChrome.pageShell}>
        <EmptyState
          title="Order not found"
          description="This order may have been closed, billed, or does not exist."
          action={
            <Button
              type="button"
              variant="solid"
              onClick={() => navigate('/dashboard/cafe-orders')}
            >
              Back to orders
            </Button>
          }
        />
      </Stack>
    );
  }

  const orderLabel =
    order.orderType === 'DINE_IN' ? order.tableLabel ?? 'Dine-in' : `Token ${order.tokenNo ?? '—'}`;

  return (
    <Stack gap="md" className={productChrome.pageShell}>
      <PageHeader
        description={`${orderLabel} · Order ${order.orderNo}`}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard/cafe-orders')}
          >
            Back to orders
          </Button>
        }
      />

      <Inline className={productChrome.cafeSellWorkspace} align="start" width="full" gap="md">
        <Box display="flex" className={productChrome.cafePickerColumn}>
          <CafeSellCatalogPanel
            catalog={catalog}
            loading={catalogLoading}
            disabled={punch.isPending}
            onAddMenuItem={handleAddMenuItem}
            onAddDirectStock={handleAddDirectStock}
          />
        </Box>

        <Box as="aside" className={productChrome.cafeOrderColumn}>
          <Stack
            gap="md"
            bg="elevated"
            border
            rounded="lg"
            padding="md"
            className={productChrome.cafeOrderPanel}
          >
            <Inline
              justify="between"
              align="center"
              width="full"
              className={productChrome.cafeOrderHeader}
            >
              <Text as="h3" className={productChrome.cafeOrderHeaderTitle}>
                This round
              </Text>
              <Badge variant="neutral">
                {basket.lines.length} {basket.lines.length === 1 ? 'item' : 'items'}
              </Badge>
            </Inline>
            <PunchBasketPanel
              basket={basket}
              onQuantity={(ref, qty) => setBasket((b) => setQuantity(b, ref, qty))}
              onNote={(ref, note) => setBasket((b) => setNote(b, ref, note))}
              onRemove={(ref) => setBasket((b) => removeLine(b, ref))}
              onSend={handleSend}
              sending={punch.isPending}
            />
          </Stack>

          {tickets.length > 0 ? (
            <Stack gap="sm" bg="elevated" border rounded="lg" padding="md">
              <Text as="h3" weight="semibold">
                Kitchen tickets
              </Text>
              <KotTicketStrip tickets={tickets} onRetry={handleRetry} />
            </Stack>
          ) : null}

          <Stack gap="sm" bg="elevated" border rounded="lg" padding="md">
            <Inline justify="between" align="center" width="full">
              <Text as="h3" weight="semibold">
                Rounds punched
              </Text>
              <Badge variant="neutral">{order.roundsPunched}</Badge>
            </Inline>
            {punchedRounds.length === 0 ? (
              <Text color="secondary" variant="caption">
                No rounds punched yet.
              </Text>
            ) : (
              <Stack gap="sm" width="full">
                {punchedRounds.map((round) => (
                  <Box key={round.kotId} border rounded="md" padding="sm">
                    <Stack gap="xs" width="full">
                      <Inline justify="between" align="center" width="full">
                        <Text weight="semibold">{round.department ?? 'Kitchen'}</Text>
                        <Text variant="caption" color="secondary">
                          {round.lines.length} {round.lines.length === 1 ? 'item' : 'items'}
                        </Text>
                      </Inline>
                      {round.lines.map((line) => (
                        <Inline key={line.lineId} justify="between" width="full" gap="sm">
                          <Text
                            variant="caption"
                            color={line.status === 'VOIDED' ? 'secondary' : 'primary'}
                          >
                            {`${line.quantity} × ${line.name}`}
                            {line.status === 'VOIDED' ? ' (voided)' : ''}
                          </Text>
                          {line.note ? (
                            <Text variant="caption" color="secondary">
                              {line.note}
                            </Text>
                          ) : null}
                        </Inline>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </Box>
      </Inline>
    </Stack>
  );
}
