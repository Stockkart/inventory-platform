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
import { clearPunchKey, readParkedAttempt } from '../lib/punchKeyStore';
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
  // A list, not one slot: a mount can resume several stranded rounds in a row, and each
  // outcome has to stay on the page. A single notice would leave the cashier reading only the
  // last one — the exact silence F2 is about.
  const [notices, setNotices] = useState<Notice[]>([]);
  const [targetOpen, setTargetOpen] = useState(false);
  const [flushError, setFlushError] = useState<string | null>(null);
  const [closingTabId, setClosingTabId] = useState<string | null>(null);
  const [resumeQueue, setResumeQueue] = useState<string[]>([]);

  const pushNotice = useCallback(
    (notice: Notice) => setNotices((current) => [...current, notice]),
    [],
  );

  const tabs = useMemo(() => tabsQuery.data ?? [], [tabsQuery.data]);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;

  // Follow the server's list rather than holding a selection it no longer contains: a closed
  // tab must not leave the composer pointing at nothing.
  useEffect(() => {
    if (activeTabId && tabs.some((tab) => tab.id === activeTabId)) return;
    setActiveTabId(tabs[0]?.id ?? null);
  }, [tabs, activeTabId]);

  /**
   * A flush whose response never arrived leaves its key parked in `sessionStorage`, and
   * until this mount nothing ever read it back.
   *
   * The server claims and empties the tab *before* it creates the tickets, so the cashier
   * who reloads mid-flush reopens a tab that is empty, with Print KOT disabled — there is no
   * press left on this screen that could reach the tickets the server already made. So look
   * for parked rounds once per mount, as soon as the tab list is known, and queue *every* tab
   * that has one; the effect below works through them one at a time. Once per mount only: a
   * resume that keeps failing must not become a loop.
   *
   * Every parked tab, because a bad connection does not politely strand one party: flush tab A
   * and lose the response, switch to tab B and lose that one too, and taking only the first
   * leaves B's round billed to a customer, ticketed on the server, and never printed — with
   * nothing said to the cashier. Each round is replayed under its own parked key on its own
   * tab, so they cannot be run in parallel; the queue is drained head-first.
   */
  const resumeScannedRef = useRef(false);
  const resumingRef = useRef(false);

  useEffect(() => {
    if (resumeScannedRef.current || !tabsQuery.isSuccess) return;
    resumeScannedRef.current = true;
    const parked = tabs.filter((tab) => readParkedAttempt(tab.id) !== null).map((tab) => tab.id);
    if (parked.length === 0) return;
    setActiveTabId(parked[0]);
    setResumeQueue(parked);
  }, [tabs, tabsQuery.isSuccess]);

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

  /**
   * Every kotId this screen has already put on the print queue.
   *
   * The ticket strip used to dedupe on its own while `queue.enqueue` was called for every
   * ticket the server returned, so a replayed response — a resume, a retried flush — sent a
   * ticket to the printer a second time while the strip showed nothing new. The second slip
   * carries the same KOT number and is NOT stamped REPRINT (only `/reprint` stamps), which is
   * precisely what a cook reads as a second order. One set now decides both: a ticket the
   * strip does not add is a ticket the queue does not get.
   *
   * A ref, not the `tickets` state: the decision is made inside an async handler, where a
   * state snapshot from an earlier render would be stale.
   */
  const queuedKotIdsRef = useRef<Set<string>>(new Set());

  const handleChooseTarget = useCallback(
    async (target: CafeFlushTarget, options?: { resumed?: boolean }) => {
      const resumed = options?.resumed ?? false;
      if (flushInFlightRef.current || !activeTab) return;
      flushInFlightRef.current = true;
      setFlushError(null);
      // A resume appends to whatever earlier resumes have already reported; a press the
      // cashier made starts the page clean.
      if (!resumed) setNotices([]);
      const token = activeTab.tokenNo;
      try {
        const sent = await flushTab.mutateAsync(target);
        // Print only once the server has recorded the flush: a slip on paper for a round the
        // server never took is worse than no slip at all.
        const fresh = sent.filter((kot) => !queuedKotIdsRef.current.has(kot.kotId));
        fresh.forEach((kot) => queuedKotIdsRef.current.add(kot.kotId));
        setTickets((current) => [
          ...current,
          ...fresh.map((kot) => ({ kot, state: 'QUEUED' as PrintState })),
        ]);
        fresh.forEach((kot) => queue.enqueue(kot.kotId));
        // The tab is now empty on the server and the chosen bill has grown. Refetch both
        // rather than editing a local copy: the emptied tab the cashier sees is the server's
        // tab, not a guess about it.
        void queryClient.invalidateQueries({ queryKey: cafeTabKeys.list() });
        void queryClient.invalidateQueries({ queryKey: cafeKotScreenKeys.openBills() });
        setTargetOpen(false);
        if (resumed) {
          // Count what actually reached the printer, not what the server replayed: a ticket
          // already printed this session is deliberately not sent again.
          const reprinted = `${fresh.length} ticket${fresh.length === 1 ? '' : 's'}`;
          pushNotice({
            tone: 'success',
            text:
              fresh.length === 0
                ? `Recovered an unfinished round on token ${token}: the kitchen had already taken it and its tickets have already printed here. Nothing was ordered twice.`
                : `Recovered an unfinished round on token ${token}: the kitchen had already taken it, so ${reprinted} ${
                    fresh.length === 1 ? 'was' : 'were'
                  } re-sent to the printer. Nothing was ordered twice.`,
          });
        } else {
          const tickets = `${sent.length} ticket${sent.length === 1 ? '' : 's'}`;
          pushNotice({
            tone: 'success',
            text: `Sent ${tickets} to the kitchen. Token ${token} is still open and now empty — add the next round to it.`,
          });
        }
      } catch (error) {
        // A flush that fails quietly is an order the kitchen never sees. A press stays on
        // the dialog it was made from; a resume has no dialog, so it surfaces on the page.
        if (resumed) {
          pushNotice({
            tone: 'danger',
            text: `Could not recover an unfinished round on token ${token}: ${errorText(
              error,
            )}. The kitchen may already have it — check with them before sending it again.`,
          });
        } else {
          setFlushError(errorText(error));
        }
      } finally {
        flushInFlightRef.current = false;
      }
    },
    [activeTab, flushTab, pushNotice, queryClient, queue],
  );

  /**
   * Drains the resume queue one tab at a time, replaying each parked round only once the strip
   * has actually switched to its tab — `flushTab` is bound to the active tab, so firing before
   * then would flush the wrong one. `resumingRef` keeps the drain strictly sequential: a
   * replay refetches the tab list, which re-runs this effect while the replay is still open.
   *
   * Each is a replay, not a second round: `useIdempotentMutation` picks the parked key back
   * up out of `sessionStorage`, and the server answers a key it has already seen with the
   * tickets it made for it, which then go to the print queue like any other.
   *
   * Every exit from a head entry — resumed, unresumable, or gone — drops it from the queue and
   * says so on the page. A round that silently stays parked is the failure F2 named.
   */
  useEffect(() => {
    const tabId = resumeQueue[0];
    if (!tabId || resumingRef.current) return;
    const advance = () => setResumeQueue((current) => current.slice(1));

    const tab = tabs.find((entry) => entry.id === tabId);
    if (!tab) {
      // Its tab is no longer open, so there is nothing left to flush it against — but the
      // round is on a bill and its tickets exist, so the cashier has to hear about it.
      clearPunchKey(tabId);
      pushNotice({
        tone: 'danger',
        text: 'An unfinished round could not be recovered: the tab it belongs to is no longer open. Check with the kitchen before sending it again.',
      });
      advance();
      return;
    }

    // Switch first, replay on the next pass, once `flushTab` is bound to this tab.
    if (!activeTab || activeTab.id !== tabId) {
      setActiveTabId(tabId);
      return;
    }

    const parked = readParkedAttempt<CafeFlushTarget>(tabId);
    if (!parked) {
      advance();
      return;
    }
    if (!parked.variables) {
      // A key parked without its target — an older build's record. Which bill the round
      // belongs to is unknowable, and guessing would open a bill nobody asked for.
      clearPunchKey(tabId);
      pushNotice({
        tone: 'danger',
        text: `Token ${tab.tokenNo} has an unfinished round from an earlier session that cannot be re-sent automatically. Check with the kitchen before sending it again.`,
      });
      advance();
      return;
    }

    resumingRef.current = true;
    void handleChooseTarget(parked.variables, { resumed: true }).finally(() => {
      resumingRef.current = false;
      advance();
    });
  }, [resumeQueue, tabs, activeTab, handleChooseTarget, pushNotice]);

  const handleAddLine = useCallback(
    (line: CafeTabLineInput) => {
      setNotices([]);
      addLine.mutate(line, {
        onError: (error) => pushNotice({ tone: 'danger', text: errorText(error) }),
      });
    },
    [addLine, pushNotice],
  );

  const handleRemoveLine = useCallback(
    (lineRef: string) => {
      removeLine.mutate(lineRef, {
        onError: (error) => pushNotice({ tone: 'danger', text: errorText(error) }),
      });
    },
    [removeLine, pushNotice],
  );

  const handleNewTab = useCallback(() => {
    openTab.mutate(undefined, {
      onSuccess: (tab) => setActiveTabId(tab.id),
      onError: (error) => pushNotice({ tone: 'danger', text: errorText(error) }),
    });
  }, [openTab, pushNotice]);

  const handleConfirmClose = useCallback(() => {
    if (!closingTabId) return;
    closeTab.mutate(closingTabId, {
      onSettled: () => setClosingTabId(null),
      onError: (error) => pushNotice({ tone: 'danger', text: errorText(error) }),
    });
  }, [closeTab, closingTabId, pushNotice]);

  const closingTab = tabs.find((tab) => tab.id === closingTabId) ?? null;
  const sending = flushTab.isPending;

  return (
    <Stack gap="md" padding="md" className={productChrome.cafePageShell}>
      <PageHeader
        title="Kitchen Orders"
        description="One tab per party. Print KOT sends the round and leaves the tab open for the next one."
      />

      {notices.map((entry, index) => (
        <Alert
          key={`${entry.tone}-${index}-${entry.text}`}
          variant={entry.tone === 'danger' ? 'danger' : 'success'}
          role={entry.tone === 'danger' ? 'alert' : 'status'}
        >
          {entry.text}
        </Alert>
      ))}

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
