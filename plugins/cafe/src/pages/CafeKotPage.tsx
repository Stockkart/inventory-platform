import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  CenteredLoader,
  ConfirmDialog,
  PageHeader,
  Stack,
  productChrome,
} from '@inventory-platform/ui-kit';
import { printKot } from '../lib/printKot';
import { createPrintQueue, type PrintState } from '../lib/printQueue';
import {
  useAddTabLineMutation,
  useCafeTabsQuery,
  useCloseTabMutation,
  useFlushTabMutation,
  useOpenTabMutation,
  useRemoveTabLineMutation,
} from '../queries/hooks';
import { useCafeSellCatalogQuery, useOpenBillsQuery } from '../queries/screenData';
import { cafeKotScreenKeys, cafeTabKeys } from '../queries/keys';
import type { CafeKot } from '../types/kot';
import type { MenuItem } from '../types/menu';
import type { CafeFlushTarget, CafeTabLineInput } from '../types/tab';
import { CafeTabComposer } from '../ui/CafeTabComposer';
import { CafeTabStrip } from '../ui/CafeTabStrip';
import { FlushTargetDialog } from '../ui/FlushTargetDialog';
import { KotTicketStrip } from '../ui/KotTicketStrip';

export function meta() {
  return [
    { title: 'Kitchen Orders - StockKart' },
    { name: 'description', content: 'Compose kitchen orders and send them to the kitchen' },
  ];
}

interface TicketView {
  kot: CafeKot;
  state: PrintState;
}

interface Notice {
  tone: 'success' | 'danger';
  text: string;
}

function errorText(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return error instanceof Error ? error.message : 'Could not send this round to the kitchen';
}

/**
 * The kitchen-order screen.
 *
 * One tab per party, each identified only by an auto-allocated token, each holding just the
 * items that have **not** yet gone to the kitchen. Print KOT asks which bill the round belongs
 * to, sends one ticket per station, appends those lines to that bill, and empties the tab —
 * which keeps its token, so the next round ten minutes later is simply more lines on the same
 * tab.
 *
 * Everything the cashier can break lives here rather than in a helper module, because the
 * things that go wrong are the ordering (print only after the server has recorded the flush),
 * the guard (one press, one round) and the failure path (a swallowed flush is an order the
 * kitchen never sees) — none of which a pure function can be tested through.
 */
export function CafeKotPage() {
  const queryClient = useQueryClient();
  const tabsQuery = useCafeTabsQuery();
  const catalogQuery = useCafeSellCatalogQuery();
  const openTab = useOpenTabMutation();
  const closeTab = useCloseTabMutation();

  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketView[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [targetOpen, setTargetOpen] = useState(false);
  const [flushError, setFlushError] = useState<string | null>(null);
  const [closingTabId, setClosingTabId] = useState<string | null>(null);

  const tabs = useMemo(() => tabsQuery.data ?? [], [tabsQuery.data]);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;

  // Follow the server's list rather than holding a selection it no longer contains: a closed
  // tab must not leave the composer pointing at nothing.
  useEffect(() => {
    if (activeTabId && tabs.some((tab) => tab.id === activeTabId)) return;
    setActiveTabId(tabs[0]?.id ?? null);
  }, [tabs, activeTabId]);

  const addLine = useAddTabLineMutation(activeTab?.id ?? '');
  const removeLine = useRemoveTabLineMutation(activeTab?.id ?? '');
  const flushTab = useFlushTabMutation(activeTab?.id ?? '');

  // Only fetched while the picker is open, and never cached stale: the cashier must not be
  // offered a bill that was checked out since this screen loaded.
  const billsQuery = useOpenBillsQuery({ enabled: targetOpen });

  const menuItems = useMemo<MenuItem[]>(
    () => (catalogQuery.data?.menu?.sections ?? []).flatMap((section) => section.items),
    [catalogQuery.data],
  );

  /**
   * The listener is a bare `setState` and stays that way: `createPrintQueue` calls it from
   * inside its drain loop, and anything that throws here escapes as an unhandled rejection,
   * stopping every remaining ticket silently.
   */
  const queue = useMemo(
    () =>
      createPrintQueue(
        (kotId) => printKot(kotId),
        (kotId, state) =>
          setTickets((current) =>
            current.map((entry) => (entry.kot.kotId === kotId ? { ...entry, state } : entry)),
          ),
      ),
    [],
  );

  /**
   * One press, one round.
   *
   * `flushTab.isPending` disables the buttons, but only after React has re-rendered; a double
   * click, a keyboard repeat, or a second tap on a slow connection can land inside that
   * window. This ref is set synchronously before the request goes out and cleared only once it
   * has settled, so the second press finds it set no matter how slow the network is. The key
   * carried by the request is parked in `sessionStorage` regardless (see `useIdempotentMutation`),
   * so even a press the guard cannot see is replayed rather than duplicated by the server.
   */
  const flushInFlightRef = useRef(false);

  const handleChooseTarget = useCallback(
    async (target: CafeFlushTarget) => {
      if (flushInFlightRef.current || !activeTab) return;
      flushInFlightRef.current = true;
      setFlushError(null);
      setNotice(null);
      const token = activeTab.tokenNo;
      try {
        const sent = await flushTab.mutateAsync(target);
        // Print only once the server has recorded the flush: a slip on paper for a round the
        // server never took is worse than no slip at all.
        setTickets((current) => {
          const known = new Set(current.map((entry) => entry.kot.kotId));
          return [
            ...current,
            ...sent
              .filter((kot) => !known.has(kot.kotId))
              .map((kot) => ({ kot, state: 'QUEUED' as PrintState })),
          ];
        });
        sent.forEach((kot) => queue.enqueue(kot.kotId));
        // The tab is now empty on the server and the chosen bill has grown. Refetch both
        // rather than editing a local copy: the emptied tab the cashier sees is the server's
        // tab, not a guess about it.
        void queryClient.invalidateQueries({ queryKey: cafeTabKeys.list() });
        void queryClient.invalidateQueries({ queryKey: cafeKotScreenKeys.openBills() });
        setTargetOpen(false);
        setNotice({
          tone: 'success',
          text: `Sent ${sent.length} ticket${
            sent.length === 1 ? '' : 's'
          } to the kitchen. Token ${token} is still open and now empty — add the next round to it.`,
        });
      } catch (error) {
        // Stays on the dialog, where the press happened. A flush that fails quietly is an
        // order the kitchen never sees.
        setFlushError(errorText(error));
      } finally {
        flushInFlightRef.current = false;
      }
    },
    [activeTab, flushTab, queryClient, queue],
  );

  const handleAddLine = useCallback(
    (line: CafeTabLineInput) => {
      setNotice(null);
      addLine.mutate(line, {
        onError: (error) => setNotice({ tone: 'danger', text: errorText(error) }),
      });
    },
    [addLine],
  );

  const handleRemoveLine = useCallback(
    (lineRef: string) => {
      removeLine.mutate(lineRef, {
        onError: (error) => setNotice({ tone: 'danger', text: errorText(error) }),
      });
    },
    [removeLine],
  );

  const handleNewTab = useCallback(() => {
    openTab.mutate(undefined, {
      onSuccess: (tab) => setActiveTabId(tab.id),
      onError: (error) => setNotice({ tone: 'danger', text: errorText(error) }),
    });
  }, [openTab]);

  const handleConfirmClose = useCallback(() => {
    if (!closingTabId) return;
    closeTab.mutate(closingTabId, {
      onSettled: () => setClosingTabId(null),
      onError: (error) => setNotice({ tone: 'danger', text: errorText(error) }),
    });
  }, [closeTab, closingTabId]);

  const closingTab = tabs.find((tab) => tab.id === closingTabId) ?? null;
  const sending = flushTab.isPending;

  return (
    <Stack gap="md" padding="md" className={productChrome.cafePageShell}>
      <PageHeader
        title="Kitchen Orders"
        description="One tab per party. Print KOT sends the round and leaves the tab open for the next one."
      />

      {notice ? (
        <Alert
          variant={notice.tone === 'danger' ? 'danger' : 'success'}
          role={notice.tone === 'danger' ? 'alert' : 'status'}
        >
          {notice.text}
        </Alert>
      ) : null}

      <CafeTabStrip
        tabs={tabs}
        activeTabId={activeTab?.id ?? null}
        disabled={sending || openTab.isPending}
        onSelect={setActiveTabId}
        onNew={handleNewTab}
        onClose={setClosingTabId}
      />

      {tabsQuery.isLoading ? <CenteredLoader /> : null}

      {activeTab ? (
        <CafeTabComposer
          // Keyed by tab: the composer's half-typed note belongs to the tab it was typed on.
          key={activeTab.id}
          tab={activeTab}
          menuItems={menuItems}
          busy={addLine.isPending || removeLine.isPending}
          sending={sending}
          onAddLine={handleAddLine}
          onRemoveLine={handleRemoveLine}
          onPrint={() => {
            setFlushError(null);
            setTargetOpen(true);
          }}
        />
      ) : null}

      <KotTicketStrip tickets={tickets} onRetry={(kotId) => queue.enqueue(kotId)} />

      <FlushTargetDialog
        open={targetOpen}
        bills={billsQuery.data ?? []}
        loading={billsQuery.isLoading}
        sending={sending}
        error={flushError}
        onChoose={(target) => void handleChooseTarget(target)}
        onCancel={() => {
          if (flushInFlightRef.current) return;
          setTargetOpen(false);
        }}
      />

      <ConfirmDialog
        open={Boolean(closingTab)}
        title="Close this tab?"
        message={
          closingTab
            ? `Token ${closingTab.tokenNo} has ${closingTab.lines.length} item${
                closingTab.lines.length === 1 ? '' : 's'
              } that have not been sent to the kitchen. Closing the tab discards them.`
            : ''
        }
        confirmLabel="Close tab"
        loading={closeTab.isPending}
        onConfirm={handleConfirmClose}
        onCancel={() => setClosingTabId(null)}
      />
    </Stack>
  );
}

export default CafeKotPage;
