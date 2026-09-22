import {
  Button,
  IconButton,
  Inline,
  Stack,
  Text,
  cn,
  productChrome,
} from '@inventory-platform/ui-kit';
import type { CafeTab } from '../types/tab';

export interface CafeTabStripProps {
  tabs: CafeTab[];
  activeTabId: string | null;
  disabled?: boolean;
  onSelect: (tabId: string) => void;
  onNew: () => void;
  onClose: (tabId: string) => void;
}

/**
 * The kitchen tabs, one per party.
 *
 * Modelled on `ScanSellQuotationStack` in `core/product` — the open-quotation tabs on the
 * Sell screen — and matching its shape, chrome and affordances. A KOT tab and a bill tab are
 * the same idea to the cashier (an open thing identified only by its token, closed only on
 * purpose), so they read as the same control. Two differences are deliberate, not drift:
 * this strip keeps a persistent "No tabs open" row where the original returns `null` (with
 * no tabs and no row there is nowhere to press `+ New`), and closing goes through a ui-kit
 * `ConfirmDialog` naming the token and the item count rather than a bare `window.confirm`.
 * Keep the chrome and wording in step with the original; leave those two alone.
 *
 * The count under each label is *pending* items: what is still on the tab and has not gone to
 * the kitchen. A tab showing "0 items" is an open tab whose round has already been printed,
 * not a broken one.
 */
export function CafeTabStrip({
  tabs,
  activeTabId,
  disabled = false,
  onSelect,
  onNew,
  onClose,
}: CafeTabStripProps) {
  return (
    <Stack
      gap="sm"
      padding="sm"
      border
      rounded="md"
      bg="elevated"
      className={productChrome.quotationStack}
      aria-label="Kitchen tabs"
    >
      <Inline gap="sm" align="center" flexWrap>
        <Text
          variant="caption"
          weight="semibold"
          color="secondary"
          className={productChrome.nowrap}
        >
          Kitchen tabs
        </Text>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNew}
          disabled={disabled}
          className={productChrome.quotationPill}
        >
          + New tab
        </Button>
      </Inline>

      {tabs.length === 0 ? (
        <Text variant="caption" color="muted">
          No tabs open. Start one for the next party.
        </Text>
      ) : (
        <Inline gap="sm" className={productChrome.quotationScroll}>
          {tabs.map((tab) => {
            const pending = tab.lines.reduce((sum, line) => sum + line.quantity, 0);
            const label = `Token ${tab.tokenNo}`;
            const isActive = tab.id === activeTabId;
            return (
              <Inline
                key={tab.id}
                align="stretch"
                className={cn(
                  productChrome.quotationTab,
                  isActive && productChrome.quotationTabActive,
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelect(tab.id)}
                  disabled={disabled}
                  className={productChrome.quotationTabBtn}
                >
                  <Stack gap="none" align="start">
                    <Text weight="semibold" truncate>
                      {label}
                    </Text>
                    <Text variant="caption" color="muted" className={productChrome.nowrap}>
                      {pending === 0 ? 'Nothing pending' : `${pending} pending`}
                    </Text>
                  </Stack>
                </Button>
                <IconButton
                  label={`Close tab ${label}`}
                  title="Close tab"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(tab.id);
                  }}
                  disabled={disabled}
                  className={productChrome.quotationTabClose}
                >
                  ×
                </IconButton>
              </Inline>
            );
          })}
        </Inline>
      )}
    </Stack>
  );
}
