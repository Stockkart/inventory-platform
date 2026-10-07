/**
 * Dot-pitch fitting for printed barcodes.
 *
 * Thermal label printers put ink on a fixed dot grid (203 dpi on the TSC TE244 the
 * shops use, so one dot is 25.4 / 203 ≈ 0.125 mm). A Code128 module that lands on
 * a fraction of a dot, say 1.3 dots, is rasterised as one dot here and two dots
 * there, and scanners cannot decode the result. The print window therefore draws
 * JsBarcode at one CSS px per module and then stretches the `<svg>` to exactly
 * `modules × dots × DOT_MM` millimetres, so every bar and space is a whole number
 * of printer dots.
 */

/** Dot pitch of a 203 dpi thermal printer, in millimetres. */
export const DOT_MM = 25.4 / 203;

/** Code128 needs at least 10 modules of blank liner on each side of the bars. */
export const QUIET_ZONE_MODULES = 10;

/** Widest module the fitter will pick; beyond this the bars just waste label. */
const MAX_DOTS_PER_MODULE = 4;

export interface BarcodeDotFit {
  /** Printer dots per Code128 module (always ≥ 1). */
  dotsPerModule: number;
  /** Bar area width in millimetres: `modules × dotsPerModule × dotMm`. */
  widthMm: number;
}

/**
 * Picks the widest whole-dot module such that the bars plus both quiet zones fit
 * `usableWidthMm`. Falls back to one dot per module when nothing fits (a code too
 * long for the sticker still prints; it just has thin quiet zones).
 */
export function fitBarcodeToDots(
  modules: number,
  usableWidthMm: number,
  dotMm: number = DOT_MM,
): BarcodeDotFit {
  const withQuiet = modules + 2 * QUIET_ZONE_MODULES;
  for (let dots = MAX_DOTS_PER_MODULE; dots > 1; dots -= 1) {
    if (withQuiet * dots * dotMm <= usableWidthMm) {
      return { dotsPerModule: dots, widthMm: modules * dots * dotMm };
    }
  }
  return { dotsPerModule: 1, widthMm: modules * dotMm };
}

/**
 * The module count of a JsBarcode `<svg>` rendered with `width: 1, margin: 0`:
 * JsBarcode writes the total width in CSS px into the `width` attribute, and at one
 * px per module that number is the module count. `null` when it cannot be read.
 */
export function moduleCountOf(svg: SVGSVGElement): number | null {
  const raw = svg.getAttribute('width');
  if (!raw) return null;
  const modules = Number.parseFloat(raw);
  if (!Number.isFinite(modules) || modules <= 0) return null;
  return Math.round(modules);
}

/**
 * Applies {@link fitBarcodeToDots} to a rendered JsBarcode `<svg>`: pins its width
 * to a whole number of printer dots per module, lets the sticker CSS decide the
 * height (`preserveAspectRatio="none"` so the bars stretch to fill it), and asks
 * the rasteriser for crisp edges rather than anti-aliased grey ones.
 */
export function fitBarcodeSvgToDots(
  svg: SVGSVGElement,
  usableWidthMm: number,
  dotMm: number = DOT_MM,
): BarcodeDotFit | null {
  const modules = moduleCountOf(svg);
  if (modules === null) return null;
  const fit = fitBarcodeToDots(modules, usableWidthMm, dotMm);
  svg.style.width = `${fit.widthMm.toFixed(4)}mm`;
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('shape-rendering', 'crispEdges');
  return fit;
}

/** CSS px per millimetre at the 96 dpi the browser lays the print document out in. */
const CSS_PX_PER_MM = 96 / 25.4;

/**
 * Horizontal room the bars may take inside the sticker that contains `svg`: the
 * sticker's content box (border-box width minus horizontal padding), in millimetres.
 * `null` when the svg has no laid-out parent (e.g. a detached document in tests).
 */
export function usableWidthMmOf(svg: SVGSVGElement, view: Window): number | null {
  const sticker = svg.parentElement;
  if (!sticker) return null;
  const style = view.getComputedStyle(sticker);
  const padding =
    (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
  const contentPx = sticker.clientWidth - padding;
  if (!(contentPx > 0)) return null;
  return contentPx / CSS_PX_PER_MM;
}
