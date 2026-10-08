// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  BARCODE_FILL,
  BARCODE_HEIGHT_MM,
  DOT_MM,
  QUIET_ZONE_MODULES,
  fitBarcodeSvgToDots,
  fitBarcodeToDots,
  moduleCountOf,
} from './barcodeDots';

/**
 * Thermal label printers rasterise at a fixed dot pitch (203 dpi on the TSC TE244,
 * one dot = 25.4 / 203 mm). A Code128 module that is 1.3 dots wide prints as one
 * dot or two at random and no scanner can lock on it. The print path must size the
 * bars so every module is a whole number of dots.
 */

const CODE128_14_CHARS = 189; // start + 14 data + check = 16 × 11 modules, plus the 13-module stop

describe('fitBarcodeToDots', () => {
  it('fills 90% of the 38 mm label when two dots per module would not fit', () => {
    // 38x38 with 2 mm padding leaves 34 mm. 2 dots: (189 + 20) × 2 × 0.1251 = 52 mm > 34.
    // The shop wants the familiar wide symbol here, not a 24 mm one-dot one.
    const fit = fitBarcodeToDots(CODE128_14_CHARS, 34);
    expect(fit.snapped).toBe(false);
    expect(fit.widthMm).toBeCloseTo(34 * BARCODE_FILL, 6);
    expect(fit.dotsPerModule).toBeCloseTo(fit.widthMm / (CODE128_14_CHARS * DOT_MM), 6);
    expect(fit.dotsPerModule).toBeGreaterThan(1);
    expect(fit.dotsPerModule).toBeLessThan(2);
  });

  it('picks the widest whole-dot module that still leaves quiet zones', () => {
    // EAN-13 is 95 modules: 2 dots → (95 + 20) × 2 × 0.1251 = 28.8 mm fits in 34; 3 dots does not.
    const ean = fitBarcodeToDots(95, 34);
    expect(ean.dotsPerModule).toBe(2);
    expect(ean.snapped).toBe(true);
    // 100x50 (96 mm usable) takes 3 dots for the 14-char code: (189+20)×3×0.1251 = 78 mm.
    expect(fitBarcodeToDots(CODE128_14_CHARS, 96).dotsPerModule).toBe(3);
    // Never wider than 4 dots.
    expect(fitBarcodeToDots(20, 500).dotsPerModule).toBe(4);
  });

  it('a code far too long for the sticker still fills 90% and never reports zero dots', () => {
    const fit = fitBarcodeToDots(400, 10);
    expect(fit.snapped).toBe(false);
    expect(fit.widthMm).toBeCloseTo(9, 6);
    expect(fit.dotsPerModule).toBeGreaterThan(0);
  });

  it('honours a different dot pitch (300 dpi printer)', () => {
    const dot300 = 25.4 / 300;
    // (189 + 20) × 2 × 0.0847 = 35.4 mm > 34, so at 300 dpi the 38 mm label also fills.
    expect(fitBarcodeToDots(CODE128_14_CHARS, 34, dot300).snapped).toBe(false);
    // On 100x50, 4 dots: (189 + 20) × 4 × 0.0847 = 70.8 mm fits in 96.
    const wide = fitBarcodeToDots(CODE128_14_CHARS, 96, dot300);
    expect(wide.dotsPerModule).toBe(4);
    expect(wide.widthMm).toBeCloseTo(CODE128_14_CHARS * 4 * dot300, 6);
  });

  it('quiet zone constant matches the Code128 minimum of 10 modules a side', () => {
    expect(QUIET_ZONE_MODULES).toBe(10);
  });
});

describe('moduleCountOf', () => {
  it('reads the module count JsBarcode leaves in the width attribute when width is 1', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '189px');
    expect(moduleCountOf(svg)).toBe(189);
    svg.setAttribute('width', '95');
    expect(moduleCountOf(svg)).toBe(95);
  });

  it('returns null for a missing or unusable width', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    expect(moduleCountOf(svg)).toBeNull();
    svg.setAttribute('width', 'abc');
    expect(moduleCountOf(svg)).toBeNull();
    svg.setAttribute('width', '0px');
    expect(moduleCountOf(svg)).toBeNull();
  });
});

describe('fitBarcodeSvgToDots', () => {
  function svgWithModules(modules: number): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', `${modules}px`);
    svg.setAttribute('height', '50px');
    svg.setAttribute('viewBox', `0 0 ${modules} 50`);
    return svg;
  }

  it('sets the fitted mm width, a short fixed bar height and asks for crisp edges', () => {
    const svg = svgWithModules(CODE128_14_CHARS);
    const fit = fitBarcodeSvgToDots(svg, 34);
    expect(fit?.snapped).toBe(false);
    expect(svg.style.width).toBe(`${(34 * BARCODE_FILL).toFixed(4)}mm`);
    expect(svg.getAttribute('preserveAspectRatio')).toBe('none');
    expect(svg.getAttribute('shape-rendering')).toBe('crispEdges');
    // Short bars like the shops' original stickers, not stretched to the sticker.
    expect(BARCODE_HEIGHT_MM).toBe(6);
    expect(svg.style.height).toBe('6mm');
  });

  it('pins a whole-dot width when one fits (EAN-13 on 34 mm → 2 dots)', () => {
    const svg = svgWithModules(95);
    const fit = fitBarcodeSvgToDots(svg, 34);
    expect(fit?.snapped).toBe(true);
    expect(svg.style.width).toBe(`${(95 * 2 * DOT_MM).toFixed(4)}mm`);
  });

  it('leaves the svg alone when the module count cannot be read', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    expect(fitBarcodeSvgToDots(svg, 34)).toBeNull();
    expect(svg.style.width).toBe('');
    expect(svg.getAttribute('preserveAspectRatio')).toBeNull();
  });
});
