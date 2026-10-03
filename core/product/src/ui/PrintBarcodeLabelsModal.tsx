import { useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import { Printer } from 'lucide-react';
import { ApiError } from '@inventory-platform/api-client';
import { barcodesApi } from '../api/barcodes.api';
import { openBarcodeLabelPrintWindow } from '../lib/printBarcodeLabels';
import {
  DEFAULT_LAYOUT,
  type EffectiveLabelLayout,
  type LabelData,
  type LabelLayoutResponse,
  type SheetSpec,
} from '../model/labelLayout.types';
import { useLabelLayoutQuery } from '../queries/labelLayout.queries';
import {
  Alert,
  Button,
  FormField,
  Icon,
  Inline,
  Input,
  Link,
  Modal,
  Spinner,
  Stack,
  Text,
} from '@inventory-platform/ui-kit';

/** Profile page (core/user `profileRoutes`) with the "Barcode labels" tab preselected (Req 8.4). */
const CHANGE_LAYOUT_HREF = '/dashboard/profile?tab=labels';

export interface PrintBarcodeLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Prefer productIds when labels should pull live name/company. */
  productIds?: string[];
  codes?: string[];
  /** Optional preloaded rows (skips labels API when provided). */
  labels?: LabelData[];
  onError?: (message: string) => void;
}

/** Clamp `value` to the inclusive range `[min, max]`. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The resolved sheet geometry when `layout` prints on a label sheet (Req 10),
 * or `null` for `ROLL` layouts (or sheets that cannot hold a sticker). Only
 * then does the "Start at position" input and sheets-needed summary apply.
 */
function sheetSpecOf(layout: EffectiveLabelLayout | null | undefined): SheetSpec | null {
  const spec = layout?.sheetSpec;
  if (layout?.printMedia === 'SHEET' && spec && spec.perSheet >= 1) return spec;
  return null;
}

/**
 * One-line description of what a layout prints (Req 8.1, 8.6):
 * `"50x25 mm · Product name, Company, barcode text"`.
 */
export function describeLabelLayout(layout: EffectiveLabelLayout): string {
  const spec = layout.stickerSizeSpec;
  const size = spec ? `${spec.widthMm}x${spec.heightMm} mm` : `${layout.stickerSize} mm`;
  const parts = layout.enabledFields.map((f) => f.label);
  if (layout.showBarcodeText) parts.push('barcode text');
  const content = parts.length ? parts.join(', ') : 'no text fields';
  return `${size} · ${content}`;
}

export function PrintBarcodeLabelsModal({
  isOpen,
  onClose,
  productIds,
  codes,
  labels: preloaded,
  onError,
}: PrintBarcodeLabelsModalProps) {
  const navigate = useNavigate();
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  // Raw text so the user can type freely; clamped to `[1, perSheet]` on blur
  // and whenever the value feeds a calculation (Req 10.11). Resets on close.
  const [startInput, setStartInput] = useState('1');
  const layoutQuery = useLabelLayoutQuery({ enabled: isOpen });

  useEffect(() => {
    // Clear a stale failure message whenever the modal is reopened.
    if (isOpen) setPrintError(null);
    // Forget a prior start position once the modal is dismissed.
    else setStartInput('1');
  }, [isOpen]);

  const count = preloaded?.length ?? (productIds?.length ?? 0) + (codes?.length ?? 0);

  // Sheet summary + start position apply only to the loaded SHEET layout (Req 10.11).
  const summarySheet = sheetSpecOf(layoutQuery.data);
  const perSheet = summarySheet?.perSheet ?? 0;
  const startPosition = perSheet >= 1 ? clamp(Math.trunc(Number(startInput) || 1), 1, perSheet) : 1;
  // Items to print, in task-defined precedence; undefined when it cannot be known yet.
  const sheetItemCount = preloaded?.length ?? codes?.length ?? productIds?.length;
  const sheetsNeeded =
    perSheet >= 1 && sheetItemCount !== undefined
      ? Math.ceil((sheetItemCount + startPosition - 1) / perSheet)
      : undefined;

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintError(null);
    try {
      let rows: LabelData[] | undefined = preloaded;
      // Preloaded rows carry no layout: use the shop layout loaded for the summary
      // (the print window falls back to DEFAULT_LAYOUT when it is unavailable).
      let layout: LabelLayoutResponse | null = layoutQuery.data ?? null;
      if (!rows?.length) {
        // Print always uses the layout returned with the labels, not the cache (Req 7.8).
        const response = await barcodesApi.labels({
          ...(productIds?.length ? { productIds } : {}),
          ...(codes?.length ? { codes } : {}),
        });
        rows = response.labels;
        layout = response.layout;
      }
      if (!rows.length) {
        throw new Error('No barcode labels found for the selected items');
      }
      // Start position is a render-time option that only affects SHEET layouts;
      // re-clamp against the layout actually used for printing (Req 10.9, 10.11).
      const printSheet = sheetSpecOf(layout);
      const opts = printSheet
        ? { startPosition: clamp(Math.trunc(Number(startInput) || 1), 1, printSheet.perSheet) }
        : undefined;
      openBarcodeLabelPrintWindow(rows, layout, opts);
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Failed to print barcode labels';
      // Keep the modal open so the user can retry or change the layout (Req 8.5).
      setPrintError(message);
      onError?.(message);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleChangeLayout = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    onClose();
    void navigate(CHANGE_LAYOUT_HREF);
  };

  const handleClose = isPrinting ? undefined : onClose;

  const renderLayoutSummary = () => {
    if (layoutQuery.isPending) {
      return (
        <Inline gap="sm" align="center">
          <Spinner size="sm" />
          <Text color="secondary">Loading layout…</Text>
        </Inline>
      );
    }
    if (layoutQuery.isError || !layoutQuery.data) {
      return (
        <Stack gap="sm">
          <Text>{describeLabelLayout(DEFAULT_LAYOUT)}</Text>
          <Alert variant="warning" role="status">
            Saved layout could not be loaded; printing with the default layout.
          </Alert>
        </Stack>
      );
    }
    return <Text>{describeLabelLayout(layoutQuery.data)}</Text>;
  };

  return (
    <Modal open={isOpen} onClose={handleClose} size="sm">
      <Modal.Header title="Print barcode stickers" onClose={handleClose} />
      <Modal.Body>
        <Stack gap="md">
          <Stack gap="xs">
            <Text color="secondary" variant="caption">
              Sticker layout
            </Text>
            {renderLayoutSummary()}
            <Link href={CHANGE_LAYOUT_HREF} onClick={handleChangeLayout}>
              Change layout
            </Link>
          </Stack>
          <Inline gap="sm" align="center">
            <Icon icon={Printer} size="sm" />
            <Text>
              {count} sticker{count === 1 ? '' : 's'}
            </Text>
          </Inline>
          {summarySheet ? (
            <Stack gap="xs">
              <Text color="secondary">
                {perSheet} per sheet
                {sheetsNeeded !== undefined
                  ? ` · ${sheetsNeeded} sheet${sheetsNeeded === 1 ? '' : 's'} needed`
                  : ''}
              </Text>
              <FormField
                label="Start at position"
                htmlFor="print-start-position"
                hint="Skip labels already used on the first sheet"
              >
                <Input
                  id="print-start-position"
                  type="number"
                  min={1}
                  max={perSheet}
                  value={startInput}
                  disabled={isPrinting}
                  onChange={(event) => setStartInput(event.target.value)}
                  onBlur={() => setStartInput(String(startPosition))}
                />
              </FormField>
            </Stack>
          ) : null}
          {printError ? <Alert variant="danger">{printError}</Alert> : null}
        </Stack>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="outline" onClick={onClose} disabled={isPrinting}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="solid"
          onClick={() => void handlePrint()}
          disabled={isPrinting || count < 1}
        >
          {isPrinting ? (
            <Inline gap="sm" align="center">
              <Spinner size="sm" />
              Preparing…
            </Inline>
          ) : (
            'Print'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
