import { useEffect, useMemo, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Alert, Box, Stack, Text, surfaceChrome } from '@inventory-platform/ui-kit';
import type { EffectiveLabelLayout, LabelData } from '../../model/labelLayout.types.js';
import { fitBarcodeSvgToDots, usableWidthMmOf } from '../../lib/barcodeDots.js';
import { renderBarcodeLabelsHtml, usableRollSpec } from '../../lib/renderBarcodeLabelsHtml.js';

export interface LabelPreviewProps {
  label: LabelData;
  layout: EffectiveLabelLayout;
  title?: string;
}

/** Fixed frame height; roughly a 60mm tall sheet once the body zoom is applied. */
const PREVIEW_FRAME_HEIGHT_PX = 260;
const PREVIEW_ZOOM = 1.6;

/** On-screen width (px) the full sheet is scaled to fit in SHEET mode. */
const SHEET_PREVIEW_WIDTH_PX = 320;
/** CSS px per mm at 96 dpi, used to map the mm-sized sheet page to pixels. */
const PX_PER_MM = 96 / 25.4;

/** Scale the mm-sized sticker up so it stays legible on screen; the print flow never sees this. */
const PREVIEW_STYLE = `<style id="sk-label-preview">body{zoom:${PREVIEW_ZOOM};background:#fff}</style>`;

/**
 * Shrinks a full sheet page down so its `pageWidthMm` maps to
 * `SHEET_PREVIEW_WIDTH_PX`; `transform-origin: top left` keeps it anchored and
 * `overflow:hidden` trims the sub-pixel remainder.
 */
function sheetPreviewStyle(scale: number): string {
  return `<style id="sk-label-preview">html{overflow:hidden}body{background:#fff;transform:scale(${scale});transform-origin:top left}</style>`;
}

function injectBeforeHead(html: string, style: string): string {
  const idx = html.indexOf('</head>');
  if (idx === -1) return style + html;
  return html.slice(0, idx) + style + html.slice(idx);
}

/** Draws Code128 bars into every `svg.bars[data-code]` of the iframe document. */
function drawBars(frame: HTMLIFrameElement | null): void {
  if (!frame) return;
  let doc: Document | null = null;
  try {
    doc = frame.contentDocument;
  } catch {
    return;
  }
  if (!doc) return;
  doc.querySelectorAll<SVGSVGElement>('svg.bars').forEach((svg) => {
    const code = svg.dataset.code;
    if (!code) return;
    try {
      // Same sizing as the print window (`printBarcodeLabels.ts`): one px per
      // module, then snap to whole printer dots so the preview shows the real
      // bar width and height the printer will produce.
      JsBarcode(svg, code, {
        format: 'CODE128',
        displayValue: false,
        margin: 0,
        height: 50,
        width: 1,
      });
      const view = frame.contentWindow;
      const usable = view ? usableWidthMmOf(svg, view) : null;
      if (usable !== null) fitBarcodeSvgToDots(svg, usable);
    } catch {
      // Invalid code for CODE128 — leave the bars area empty.
    }
  });
}

/**
 * Live sticker preview for the barcode label layout screen.
 *
 * Runs the pure renderer on every render (no debounce) and shows the result in a
 * sandboxed iframe; bars are drawn with JsBarcode once the frame has loaded.
 */
export function LabelPreview({ label, layout, title = 'Live preview' }: LabelPreviewProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  // SHEET mode previews one full sheet (one sticker per cell); a ROLL with a
  // saved roll setup previews one roll row (one sticker per column); a legacy
  // ROLL previews a single enlarged sticker as before.
  const sheet =
    layout.printMedia === 'SHEET' && layout.sheetSpec && layout.sheetSpec.perSheet >= 1
      ? layout.sheetSpec
      : null;
  const roll = sheet ? null : usableRollSpec(layout);
  // The fixed-size page the preview scales to fit, when there is one.
  const page = useMemo(
    () =>
      sheet
        ? { copies: sheet.perSheet, widthMm: sheet.pageWidthMm, heightMm: sheet.pageHeightMm }
        : roll
        ? { copies: roll.labelsAcross, widthMm: roll.pageWidthMm, heightMm: roll.pageHeightMm }
        : null,
    [sheet, roll],
  );

  const result = useMemo(() => {
    const labels = page ? Array.from({ length: page.copies }, () => label) : [label];
    return renderBarcodeLabelsHtml(labels, layout);
  }, [label, layout, page]);

  const pageFrameHeightPx = page
    ? Math.round(SHEET_PREVIEW_WIDTH_PX * (page.heightMm / page.widthMm))
    : PREVIEW_FRAME_HEIGHT_PX;

  const html = result.ok
    ? page
      ? injectBeforeHead(
          result.html,
          sheetPreviewStyle(SHEET_PREVIEW_WIDTH_PX / (page.widthMm * PX_PER_MM)),
        )
      : injectBeforeHead(result.html, PREVIEW_STYLE)
    : null;

  // `srcDoc` changes reload the frame asynchronously, so `onLoad` does the real work.
  // This effect covers the case where the document is already available (e.g. same
  // html string re-applied) and is a no-op during SSR.
  useEffect(() => {
    if (typeof window === 'undefined' || !html) return;
    drawBars(frameRef.current);
  }, [html]);

  return (
    <Box className={surfaceChrome.invoiceSettingsPreview}>
      <Box className={surfaceChrome.invoiceSettingsPreviewToolbar}>
        <Stack gap="sm">
          <Text as="p" className={surfaceChrome.profileSectionLabel}>
            {title}
          </Text>
          <Text variant="caption" color="secondary">
            {sheet
              ? `${layout.stickerSize} mm · ${sheet.perSheet} per sheet (${sheet.columns} × ${sheet.rows}) · updates as you change the layout`
              : roll
              ? `${layout.stickerSize} mm · ${roll.labelsAcross} across, one roll row of ${roll.pageWidthMm} mm · updates as you change the layout`
              : `${layout.stickerSize} mm sticker · updates as you change the layout`}
          </Text>
        </Stack>
      </Box>

      {!result.ok ? <Alert variant="warning">{result.error}</Alert> : null}

      {html ? (
        <Box className={surfaceChrome.invoicePreviewStage}>
          <Box className={surfaceChrome.invoicePreviewPaper}>
            <iframe
              ref={frameRef}
              title="Sticker preview"
              srcDoc={html}
              sandbox="allow-same-origin"
              className={surfaceChrome.invoicePreviewFrame}
              style={
                page
                  ? { width: SHEET_PREVIEW_WIDTH_PX, maxWidth: '100%', height: pageFrameHeightPx }
                  : { width: '100%', height: PREVIEW_FRAME_HEIGHT_PX }
              }
              onLoad={(e) => drawBars(e.currentTarget)}
            />
          </Box>
        </Box>
      ) : null}

      <Text as="p" variant="caption" color="secondary" className={surfaceChrome.invoicePreviewHint}>
        {sheet
          ? 'Scaled to fit — printed sheets use the physical page size above.'
          : 'Shown enlarged for readability — printed stickers use the physical size above.'}
      </Text>
    </Box>
  );
}
