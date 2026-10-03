import {
  STICKER_SIZES,
  ZONE_CAPS,
  type EffectiveLabelLayout,
  type LabelData,
  type LabelZone,
  type SheetSpec,
  type StickerSizeSpec,
} from '../model/labelLayout.types';

/**
 * Pure barcode sticker renderer: (labels, layout) -> HTML string.
 *
 * No DOM, window, network or JsBarcode access. The caller (`printBarcodeLabels.ts`
 * or the layout preview) writes the HTML into a window/iframe and draws Code128 bars
 * into each `svg.bars[data-idx]` element afterwards.
 */

export type StickerLine = {
  kind: 'code' | 'field';
  fieldKey?: string;
  text: string;
};

export type RenderResult = { ok: true; html: string } | { ok: false; error: string };

/** Render-time options. `startPosition` only affects `SHEET` mode (Req 10.9). */
export type RenderOptions = { startPosition?: number };

/**
 * Sticker-level CSS for the `COMPACT` template (Req 11). Shared verbatim between the
 * `ROLL` and `SHEET` style blocks so a compact sticker renders identically in both.
 * The base `.sticker`, `.bars`, `.code` and `.line` rules still apply; these add the
 * header band, the two-column body and the condensed type scale.
 */
const COMPACT_CSS = `.compact{align-items:stretch;padding:1.5mm;font-family:"Arial Narrow","Roboto Condensed","Liberation Sans Narrow",system-ui,sans-serif}
    .compact .hdr{width:100%;font-size:11pt;font-weight:700;text-transform:uppercase}
    .compact .hdr .line{text-align:left}
    .compact .body{display:flex;gap:1.5mm;flex:1;min-height:0}
    .compact .col{display:flex;flex-direction:column;min-width:0}
    .compact .left{flex:3}
    .compact .right{flex:2;text-align:right}
    .compact .left .line{font-size:7.5pt;text-align:left}
    .compact .right .line{font-size:10pt;font-weight:700;text-align:right}
    .compact .bars{height:30%;width:100%}
    .compact .code{font-size:9pt;letter-spacing:1px;text-align:center}`;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** True for null, undefined and whitespace-only strings. */
export function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === '';
}

/** Resolves the physical sticker spec, falling back to `STICKER_SIZES` by `stickerSize`. */
export function resolveStickerSize(layout: EffectiveLabelLayout): StickerSizeSpec {
  if (layout.stickerSizeSpec) return layout.stickerSizeSpec;
  const found = STICKER_SIZES.find((spec) => spec.size === layout.stickerSize);
  return found ?? STICKER_SIZES[0];
}

function formatLegacyPrice(price: number | null | undefined): string | undefined {
  if (price === null || price === undefined || !Number.isFinite(price)) return undefined;
  return `₹${price.toFixed(2)}`;
}

/**
 * Looks up a field value. When the backend did not supply a `values` map at all
 * (older servers), fall back to the legacy `BarcodeLabelDto` fields.
 */
function resolveFieldValue(label: LabelData, fieldKey: string): string | undefined {
  if (label.values !== undefined && label.values !== null) {
    return label.values[fieldKey];
  }
  switch (fieldKey) {
    case 'productName':
      return label.name ?? undefined;
    case 'companyName':
      return label.companyName ?? undefined;
    case 'mrp':
      return formatLegacyPrice(label.price);
    default:
      return undefined;
  }
}

/** Line model for one sticker, before HTML. Exposed for tests and the preview. */
export function computeStickerLines(label: LabelData, layout: EffectiveLabelLayout): StickerLine[] {
  const lines: StickerLine[] = [];
  if (layout.showBarcodeText) {
    lines.push({ kind: 'code', text: label.code });
  }

  const { maxLines } = resolveStickerSize(layout);
  let fieldLines = 0;

  for (const field of layout.enabledFields) {
    if (fieldLines >= maxLines) break;
    if (!field.label) continue;

    const value = resolveFieldValue(label, field.fieldKey);
    let text: string;
    if (isBlank(value)) {
      if (layout.blankValueBehavior === 'HIDE_LINE') continue;
      text = layout.showFieldLabels ? `${field.label}:` : '';
    } else {
      text = layout.showFieldLabels ? `${field.label}: ${value}` : (value as string);
    }

    lines.push({ kind: 'field', fieldKey: field.fieldKey, text });
    fieldLines += 1;
  }

  return lines;
}

function renderSticker(label: LabelData, layout: EffectiveLabelLayout, index: number): string {
  const { widthMm, heightMm } = resolveStickerSize(layout);
  const code = escapeHtml(label.code);
  const lines = computeStickerLines(label, layout)
    .map((line) =>
      line.kind === 'code'
        ? `<div class="code">${escapeHtml(line.text)}</div>`
        : `<div class="line">${escapeHtml(line.text)}</div>`,
    )
    .join('');
  return `<div class="sticker" style="width:${widthMm}mm;height:${heightMm}mm"><svg class="bars" data-idx="${index}" data-code="${code}"></svg>${lines}</div>`;
}

/** The three `COMPACT` zones, in render order within the sticker body/header. */
export type CompactZones = {
  header: StickerLine[];
  left: StickerLine[];
  right: StickerLine[];
};

/**
 * Line model for the `COMPACT` template (Req 11), split into header / left / right
 * zones. Pure and DOM-free, mirroring `computeStickerLines`.
 *
 * For every enabled field the zone resolves from `field.zone`, then
 * `layout.fieldZones[fieldKey]`, defaulting to `LEFT`. Label visibility resolves
 * from `field.showLabel`, then `layout.fieldLabelOverrides[fieldKey]`, defaulting
 * to a per-zone rule (header never labels; right labels unless the value is a
 * currency; left always labels). Blank values follow `blankValueBehavior` exactly
 * as the stacked path does, and each zone is capped independently.
 */
export function computeCompactZones(label: LabelData, layout: EffectiveLabelLayout): CompactZones {
  const spec = resolveStickerSize(layout);
  const caps = spec.zoneCaps ?? ZONE_CAPS[spec.size] ?? ZONE_CAPS['50x25'];
  const zones: CompactZones = { header: [], left: [], right: [] };
  const capFor: Record<LabelZone, number> = {
    HEADER: caps.header,
    LEFT: caps.left,
    RIGHT: caps.right,
  };

  for (const field of layout.enabledFields) {
    if (!field.label) continue;

    const key = field.fieldKey;
    const zone: LabelZone = field.zone ?? layout.fieldZones?.[key] ?? 'LEFT';
    const showLabel =
      field.showLabel ??
      layout.fieldLabelOverrides?.[key] ??
      (zone === 'HEADER' ? false : zone === 'RIGHT' ? field.valueType !== 'currency' : true);

    const value = resolveFieldValue(label, key);
    let text: string;
    if (isBlank(value)) {
      if (layout.blankValueBehavior === 'HIDE_LINE') continue;
      text = showLabel ? `${field.label.toUpperCase()}:` : '';
    } else {
      text = showLabel ? `${field.label.toUpperCase()}: ${value}` : (value as string);
    }

    const bucket = zone === 'HEADER' ? zones.header : zone === 'RIGHT' ? zones.right : zones.left;
    if (bucket.length >= capFor[zone]) continue;
    bucket.push({ kind: 'field', fieldKey: key, text });
  }

  return zones;
}

/** Renders the barcode `<svg>` plus, when `showBarcodeText`, the human-readable code line. */
function renderCompactBars(
  code: string,
  escapedCode: string,
  index: number,
  showText: boolean,
): string {
  const barsSvg = `<svg class="bars" data-idx="${index}" data-code="${escapedCode}"></svg>`;
  const codeLine = showText ? `<div class="code">${escapeHtml(code)}</div>` : '';
  return barsSvg + codeLine;
}

/**
 * Renders one `COMPACT` sticker (Req 11): a header band, a barcode band positioned
 * `TOP` (default) or `BOTTOM`, and a body split into a wide left column and a
 * narrow right column.
 */
function renderCompactSticker(
  label: LabelData,
  layout: EffectiveLabelLayout,
  index: number,
): string {
  const { widthMm, heightMm } = resolveStickerSize(layout);
  const code = label.code;
  const escapedCode = escapeHtml(code);
  const { header, left, right } = computeCompactZones(label, layout);

  const toLines = (lines: StickerLine[]): string =>
    lines.map((line) => `<div class="line">${escapeHtml(line.text)}</div>`).join('');

  const bars = renderCompactBars(code, escapedCode, index, layout.showBarcodeText);
  const barsTop = layout.barcodePosition === 'BOTTOM' ? '' : bars;
  const barsBottom = layout.barcodePosition === 'BOTTOM' ? bars : '';

  const headerHtml = `<div class="hdr">${toLines(header)}</div>`;
  const bodyHtml =
    `<div class="body">` +
    `<div class="col left">${toLines(left)}</div>` +
    `<div class="col right">${toLines(right)}</div>` +
    `</div>`;

  return (
    `<div class="sticker compact" style="width:${widthMm}mm;height:${heightMm}mm">` +
    headerHtml +
    barsTop +
    bodyHtml +
    barsBottom +
    `</div>`
  );
}

/** Picks the sticker renderer for the active template (Req 11). */
function renderStickerForTemplate(
  label: LabelData,
  layout: EffectiveLabelLayout,
  index: number,
): string {
  return layout.template === 'COMPACT'
    ? renderCompactSticker(label, layout, index)
    : renderSticker(label, layout, index);
}

/** Clamp `value` to the inclusive range `[min, max]`. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * `SHEET` mode (Req 10.7, 10.9): lay stickers out in a CSS grid matching the
 * Sheet_Preset. The first `start - 1` cells of the first sheet are left empty,
 * cells are chunked into pages of `perSheet`, and every page except the last
 * carries `break-after: page`. The `@page` box is the preset page size with no
 * margin and stickers have no dashed border.
 */
function renderSheetHtml(
  labels: readonly LabelData[],
  layout: EffectiveLabelLayout,
  sheet: SheetSpec,
  startPosition: number | undefined,
): RenderResult {
  const { perSheet } = sheet;
  const start = clamp(Math.trunc(startPosition ?? 1), 1, perSheet);

  const cells: string[] = [];
  for (let i = 0; i < start - 1; i += 1) {
    cells.push('<div class="cell"></div>');
  }
  // `data-idx` stays the label index so JsBarcode draws into the right sticker.
  labels.forEach((label, index) => {
    cells.push(renderStickerForTemplate(label, layout, index));
  });

  const pages: string[] = [];
  for (let i = 0; i < cells.length; i += perSheet) {
    pages.push(cells.slice(i, i + perSheet).join(''));
  }
  const pagesHtml = pages
    .map((inner, pageIndex) => {
      const isLast = pageIndex === pages.length - 1;
      const style = isLast ? '' : ' style="break-after:page"';
      return `<div class="page"${style}>${inner}</div>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcode labels</title>
  <style>
    @page { size: ${sheet.pageWidthMm}mm ${sheet.pageHeightMm}mm; margin: 0 }
    body { font-family: system-ui, sans-serif; margin: 0; color: #111; }
    .page { display: grid; grid-template-columns: repeat(${sheet.columns}, ${sheet.pitchXMm}mm); grid-auto-rows: ${sheet.pitchYMm}mm; padding: ${sheet.marginTopMm}mm 0 0 ${sheet.marginLeftMm}mm; width: ${sheet.pageWidthMm}mm; height: ${sheet.pageHeightMm}mm; box-sizing: border-box }
    .sticker{box-sizing:border-box;display:inline-flex;flex-direction:column;align-items:center;justify-content:flex-start;border:none;padding:2mm;overflow:hidden;page-break-inside:avoid}
    .bars{height:38%;width:90%}
    .code,.line{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:system-ui,sans-serif;text-align:center}
    .code{font-size:10pt;letter-spacing:.5px}
    .line{font-size:9pt}
    .code+.line,.bars+.line{font-weight:600}
    ${COMPACT_CSS}
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;

  return { ok: true, html };
}

export function renderBarcodeLabelsHtml(
  labels: readonly LabelData[],
  layout: EffectiveLabelLayout,
  opts?: RenderOptions,
): RenderResult {
  if (labels.length === 0) {
    return { ok: false, error: 'No labels to print' };
  }

  // SHEET mode only when a resolved sheet spec can hold at least one sticker;
  // otherwise fall through to the byte-identical ROLL output (Req 10.8).
  const { sheetSpec } = layout;
  if (
    layout.printMedia === 'SHEET' &&
    sheetSpec !== undefined &&
    sheetSpec !== null &&
    sheetSpec.perSheet >= 1
  ) {
    return renderSheetHtml(labels, layout, sheetSpec, opts?.startPosition);
  }

  const stickerHtml = labels
    .map((label, index) => renderStickerForTemplate(label, layout, index))
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcode labels</title>
  <style>
    @page { margin: 8mm; }
    body { font-family: system-ui, sans-serif; margin: 0; color: #111; }
    .sheet { display: flex; flex-wrap: wrap; padding: 4mm; align-content: flex-start; }
    .sticker{box-sizing:border-box;display:inline-flex;flex-direction:column;align-items:center;justify-content:flex-start;border:1px dashed #bbb;padding:2mm;margin:2mm;overflow:hidden;page-break-inside:avoid}
    .bars{height:38%;width:90%}
    .code,.line{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:system-ui,sans-serif;text-align:center}
    .code{font-size:10pt;letter-spacing:.5px}
    .line{font-size:9pt}
    .code+.line,.bars+.line{font-weight:600}
    ${COMPACT_CSS}
    @media print {
      .sticker { border-color: transparent; }
    }
  </style>
</head>
<body>
  <div class="sheet">${stickerHtml}</div>
</body>
</html>`;

  return { ok: true, html };
}
