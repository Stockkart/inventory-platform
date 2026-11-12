import {
  STICKER_SIZES,
  ZONE_CAPS,
  type EffectiveLabelLayout,
  type LabelData,
  type LabelZone,
  type RollSpec,
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

/**
 * Render-time options. `startPosition` only affects `SHEET` mode (Req 10.9).
 * `copies` prints each label that many times in a row (default 1), so a 2-across
 * roll fills both columns instead of the printer dialog repeating a half-empty row.
 */
export type RenderOptions = { startPosition?: number; copies?: number };

/** Each label repeated `copies` times in place (`A A B B`); `copies` below 1 counts as 1. */
export function repeatLabels(labels: readonly LabelData[], copies = 1): LabelData[] {
  const times = Math.max(1, Math.trunc(copies) || 1);
  return labels.flatMap((label) => Array.from({ length: times }, () => label));
}

/**
 * Sticker-level CSS for the `COMPACT` template (Req 11). Shared verbatim between the
 * `ROLL` and `SHEET` style blocks so a compact sticker renders identically in both.
 * The base `.sticker`, `.bars`, `.code` and `.line` rules still apply; these add the
 * header band, the two-column body and the condensed type scale. Left-column lines
 * wrap at word breaks to at most two lines instead of being cut with "…"; the header
 * and the right column (prices) stay on one line. The right column is as wide as its
 * longest value (up to 60%) so a price like "₹350.00" prints whole; the left column takes
 * the rest. The sticker never grows past its size. The header line and the bars sit
 * centred across the sticker; the body columns keep their own left/right alignment.
 */
const COMPACT_CSS = `.compact{align-items:stretch;padding:1.5mm;font-family:"Arial Narrow","Roboto Condensed","Liberation Sans Narrow",system-ui,sans-serif}
    .compact .hdr{width:100%;font-size:9pt;font-weight:700;text-transform:uppercase}
    .compact .hdr .line{text-align:center}
    .compact .body{display:flex;gap:1.5mm;flex:1;min-height:0}
    .compact .col{display:flex;flex-direction:column;min-width:0}
    .compact .left{flex:1 1 0}
    .compact .right{flex:0 1 auto;max-width:60%;text-align:right}
    .compact .left .line{font-size:8pt;text-align:left;white-space:normal;overflow-wrap:break-word;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-height:1.15}
    .compact .right .line{font-size:9pt;font-weight:700;text-align:right}
    .compact .bars{height:30%;width:100%;align-self:center}
    .compact .code{font-size:9pt;letter-spacing:1px;text-align:center}`;

/**
 * Sticker-level CSS shared by every page-based layout (`SHEET` and a `ROLL` with a
 * `rollSpec`): the sticker is sized by its inline style, has no dashed border and
 * no margin because the grid cell places it exactly on the label. Every text line
 * is at least semibold: thermal printers threshold anti-aliased glyphs onto a
 * 0.125 mm dot grid, and a regular-weight 9 pt stroke is ~1 dot wide, so its
 * thin horizontals drop out at random; semibold keeps every stroke ≥ 2 dots.
 */
const PAGE_STICKER_CSS = `.sticker{box-sizing:border-box;display:inline-flex;flex-direction:column;align-items:center;justify-content:flex-start;border:none;padding:2mm;overflow:hidden;page-break-inside:avoid}
    .bars{height:38%;width:90%}
    .code,.line{max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:system-ui,sans-serif;text-align:center;font-weight:600}
    .code{font-size:9pt;letter-spacing:.5px}
    .line{font-size:9pt}
    .code+.line,.bars+.line{font-weight:700}
    ${COMPACT_CSS}`;

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

const PT_TO_MM = 25.4 / 72;
/** Vertical padding of a stacked sticker (2 mm top + 2 mm bottom, from the sticker CSS). */
const STACKED_PADDING_MM = 4;
/** Share of the sticker height the bars take when every line fits as is (`.bars{height:38%}`). */
const STACKED_BARS_SHARE = 0.38;
/** Shortest bars printed; Code128 at this height still scans with a handheld scanner. */
const STACKED_MIN_BARS_MM = 7;
const STACKED_LINE_PT = 9;
const STACKED_MIN_LINE_PT = 6.5;
/** Line height of fitted text; the default `normal` is about 1.2. */
const STACKED_LINE_HEIGHT = 1.15;
const NORMAL_LINE_HEIGHT = 1.2;

/** Bars height and text size that fit a stacked sticker's lines inside its height. */
export type StackedFit = { barsMm: number; linePt: number };

/**
 * Fits `fieldLines` lines (plus the code line when `hasCodeLine`) into a stacked sticker
 * `heightMm` tall. Returns `null` when the default CSS already fits (38% bars, 9 pt lines),
 * so short layouts print exactly as before. Otherwise the bars shrink first, down to
 * {@link STACKED_MIN_BARS_MM}, keeping 9 pt text; only when that is not enough does the
 * text shrink, down to {@link STACKED_MIN_LINE_PT}. This lets a 38x38 sticker print 6
 * lines and a 25 mm sticker 4, as the server's `maxLines` allows.
 */
export function fitStackedSticker(
  heightMm: number,
  fieldLines: number,
  hasCodeLine: boolean,
): StackedFit | null {
  const textLines = fieldLines + (hasCodeLine ? 1 : 0);
  const naturalLineMm = STACKED_LINE_PT * PT_TO_MM * NORMAL_LINE_HEIGHT;
  const natural = STACKED_PADDING_MM + heightMm * STACKED_BARS_SHARE + textLines * naturalLineMm;
  if (natural <= heightMm) return null;

  const room = heightMm - STACKED_PADDING_MM;
  const lineMm = STACKED_LINE_PT * PT_TO_MM * STACKED_LINE_HEIGHT;
  const barsAtFullText = room - textLines * lineMm;
  if (barsAtFullText >= STACKED_MIN_BARS_MM) {
    return { barsMm: round1(barsAtFullText), linePt: STACKED_LINE_PT };
  }
  const perLineMm = (room - STACKED_MIN_BARS_MM) / Math.max(1, textLines);
  const linePt = Math.max(
    STACKED_MIN_LINE_PT,
    round1(perLineMm / (PT_TO_MM * STACKED_LINE_HEIGHT)),
  );
  return { barsMm: STACKED_MIN_BARS_MM, linePt: Math.min(STACKED_LINE_PT, linePt) };
}

/** Rounds down to one decimal so a fitted size never overshoots the sticker. */
function round1(value: number): number {
  return Math.floor(value * 10) / 10;
}

/**
 * Renders one `STACKED` sticker: the bars with the code line under them, and the field
 * lines in one centred column. `barcodePosition: 'BOTTOM'` moves the bars and code below
 * the field lines; `TOP` (the default) keeps them first.
 */
function renderSticker(label: LabelData, layout: EffectiveLabelLayout, index: number): string {
  const { widthMm, heightMm } = resolveStickerSize(layout);
  const code = escapeHtml(label.code);
  const lines = computeStickerLines(label, layout);
  const codeLines = lines.filter((line) => line.kind === 'code');
  const fieldLines = lines.filter((line) => line.kind !== 'code');
  const fit = fitStackedSticker(heightMm, fieldLines.length, codeLines.length > 0);
  const textStyle = fit
    ? ` style="font-size:${fit.linePt}pt;line-height:${STACKED_LINE_HEIGHT}"`
    : '';
  const barsStyle = fit ? ` style="height:${fit.barsMm}mm"` : '';
  const codeHtml = codeLines
    .map((line) => `<div class="code"${textStyle}>${escapeHtml(line.text)}</div>`)
    .join('');
  const fieldsHtml = fieldLines
    .map((line) => `<div class="line"${textStyle}>${escapeHtml(line.text)}</div>`)
    .join('');
  const bars = `<svg class="bars"${barsStyle} data-idx="${index}" data-code="${code}"></svg>${codeHtml}`;
  const body = layout.barcodePosition === 'BOTTOM' ? fieldsHtml + bars : bars + fieldsHtml;
  return `<div class="sticker" style="width:${widthMm}mm;height:${heightMm}mm">${body}</div>`;
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
    // The server resolves `showLabel` (COMPACT: values only unless overridden).
    const showLabel = field.showLabel ?? layout.fieldLabelOverrides?.[key] ?? false;

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
    ${PAGE_STICKER_CSS}
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;

  return { ok: true, html };
}

/**
 * `ROLL` with a saved roll setup: one roll row per page. The `@page` box is the
 * full web width (every label plus the gaps between them) by one label height,
 * with no margin, so the printer lays each row down in a single feed and its gap
 * sensor advances to the next row. Stickers fill the row left to right in label
 * order; every page except the last carries `break-after: page`. There is no
 * start position: a roll has no fixed first cell.
 */
function renderRollHtml(
  labels: readonly LabelData[],
  layout: EffectiveLabelLayout,
  roll: RollSpec,
): RenderResult {
  const across = Math.max(1, Math.trunc(roll.labelsAcross));
  // Column pitch from the API (label + gap, snapped to whole printer dots there)
  // so every column starts on the same dot phase.
  const { pitchMm } = roll;

  const pages: string[] = [];
  for (let i = 0; i < labels.length; i += across) {
    pages.push(
      labels
        .slice(i, i + across)
        .map((label, offset) => renderStickerForTemplate(label, layout, i + offset))
        .join(''),
    );
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
    @page { size: ${roll.pageWidthMm}mm ${roll.pageHeightMm}mm; margin: 0 }
    body { font-family: system-ui, sans-serif; margin: 0; color: #111; }
    .page { display: grid; grid-template-columns: repeat(${across}, ${pitchMm}mm); grid-auto-rows: ${roll.pageHeightMm}mm; width: ${roll.pageWidthMm}mm; height: ${roll.pageHeightMm}mm; box-sizing: border-box }
    ${PAGE_STICKER_CSS}
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;

  return { ok: true, html };
}

/** The usable roll spec of a layout, or `null` when it should print the legacy roll output. */
export function usableRollSpec(layout: EffectiveLabelLayout): RollSpec | null {
  const roll = layout.rollSpec;
  if (!roll || !(roll.labelsAcross >= 1)) return null;
  if (!(roll.pageWidthMm > 0) || !(roll.pageHeightMm > 0) || !(roll.pitchMm > 0)) return null;
  return roll;
}

export function renderBarcodeLabelsHtml(
  items: readonly LabelData[],
  layout: EffectiveLabelLayout,
  opts?: RenderOptions,
): RenderResult {
  const labels = repeatLabels(items, opts?.copies);
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

  // ROLL with a saved roll setup prints one row per page; without one the
  // legacy roll output below is kept byte-identical.
  const roll = usableRollSpec(layout);
  if (roll) {
    return renderRollHtml(labels, layout, roll);
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
