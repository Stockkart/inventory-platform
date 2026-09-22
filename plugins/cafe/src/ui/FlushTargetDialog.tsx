import type { QuotationSummary } from '@inventory-platform/product/types';
import {
  Alert,
  Box,
  Button,
  Inline,
  Modal,
  Spinner,
  Stack,
  Text,
  surfaceChrome,
} from '@inventory-platform/ui-kit';
import type { CafeFlushTarget } from '../types/tab';

export interface FlushTargetDialogProps {
  open: boolean;
  /** The cashier's open bills — the Sell screen's open quotations. */
  bills: QuotationSummary[];
  loading?: boolean;
  /** True while the flush this dialog started is in flight. */
  sending?: boolean;
  /** Set when the flush failed, so the cashier sees it where they pressed the button. */
  error?: string | null;
  onChoose: (target: CafeFlushTarget) => void;
  onCancel: () => void;
}

function billLabel(bill: QuotationSummary): string {
  return bill.tokenNo?.trim() ? `Token ${bill.tokenNo.trim()}` : bill.customerName || 'Bill';
}

/**
 * Asks which bill this round belongs to — every time, never remembered.
 *
 * One tab's rounds may legitimately land on different bills (a table that splits, a round
 * ordered at the counter), so a remembered choice would silently bill the wrong party. The
 * one extra tap is the accepted cost; see "Decisions taken" in the design spec.
 *
 * "New bill" sends `purchaseId: null`, which asks the server to open one.
 */
export function FlushTargetDialog({
  open,
  bills,
  loading = false,
  sending = false,
  error = null,
  onChoose,
  onCancel,
}: FlushTargetDialogProps) {
  return (
    <Modal open={open} onClose={sending ? undefined : onCancel} size="sm">
      <Modal.Header title="Which bill does this round go on?" onClose={onCancel} />
      <Modal.Body>
        <Stack gap="sm" width="full">
          {error ? (
            <Alert variant="danger" role="alert">
              {error}
            </Alert>
          ) : null}
          {loading ? (
            <Inline gap="sm" align="center">
              <Spinner size="sm" />
              <Text variant="caption" color="secondary">
                Loading open bills…
              </Text>
            </Inline>
          ) : null}
          <Stack
            as="ul"
            gap="xs"
            margin="none"
            padding="none"
            width="full"
            className={surfaceChrome.listPlain}
            aria-label="Open bills"
          >
            {bills.map((bill) => (
              <Box as="li" key={bill.purchaseId} width="full">
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  disabled={sending}
                  onClick={() => onChoose({ purchaseId: bill.purchaseId })}
                >
                  {`${billLabel(bill)} · ${bill.itemCount} item${bill.itemCount === 1 ? '' : 's'}`}
                </Button>
              </Box>
            ))}
          </Stack>
          {!loading && bills.length === 0 ? (
            <Text variant="caption" color="muted">
              No bills open yet — this round will start one.
            </Text>
          ) : null}
          <Button
            type="button"
            variant="solid"
            fullWidth
            loading={sending}
            disabled={sending}
            onClick={() => onChoose({ purchaseId: null })}
          >
            New bill
          </Button>
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={sending}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
