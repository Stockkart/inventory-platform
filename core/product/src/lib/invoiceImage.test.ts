import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  MAX_INVOICE_IMAGE_BYTES,
  MAX_INVOICE_IMAGES,
  MAX_INVOICE_UPLOAD_BYTES,
  MAX_PICKED_IMAGE_BYTES,
  fitWithin,
  nextJpegAttempt,
  pickedImageProblem,
  uploadProblem,
  type JpegAttempt,
} from './invoiceImage';

const MB = 1024 * 1024;

describe('invoice image limits', () => {
  it('match the server: 2 MB per image, 10 MB and 20 images per upload', () => {
    expect(MAX_INVOICE_IMAGE_BYTES).toBe(2 * MB);
    expect(MAX_INVOICE_UPLOAD_BYTES).toBe(10 * MB);
    expect(MAX_INVOICE_IMAGES).toBe(20);
  });
});

describe('fitWithin', () => {
  it('shrinks the longer side to the limit and keeps the shape', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1920)).toEqual({ width: 1440, height: 1920 });
  });

  it('never enlarges', () => {
    expect(fitWithin(1200, 900, 1600)).toEqual({ width: 1200, height: 900 });
  });
});

describe('nextJpegAttempt', () => {
  it('lowers quality first, then shrinks, and stops at 800 px', () => {
    const steps: JpegAttempt[] = [];
    let a: JpegAttempt | null = { width: 1600, height: 1200, quality: 0.7 };
    while (a) {
      steps.push(a);
      a = nextJpegAttempt(a);
    }
    expect(steps.map((s) => s.quality).slice(0, 3)).toEqual([0.7, 0.6, 0.5]);
    expect(steps[3]).toEqual({ width: 1280, height: 960, quality: 0.5 });
    expect(Math.max(steps[steps.length - 1].width, steps[steps.length - 1].height)).toBe(800);
  });

  it('always ends, each step smaller or lower quality, never below 800 px or 0.5', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12000 }),
        fc.integer({ min: 1, max: 12000 }),
        fc.integer({ min: 5, max: 10 }),
        (w, h, q10) => {
          let a: JpegAttempt | null = { width: w, height: h, quality: q10 / 10 };
          for (let i = 0; i < 50 && a; i++) {
            const n = nextJpegAttempt(a);
            if (n) {
              expect(n.quality).toBeGreaterThanOrEqual(0.5);
              const smaller = n.width * n.height < a.width * a.height;
              expect(smaller || n.quality < a.quality).toBe(true);
              if (smaller) {
                expect(Math.max(n.width, n.height)).toBeGreaterThanOrEqual(800);
              }
            }
            a = n;
          }
          expect(a).toBeNull();
        },
      ),
    );
  });
});

describe('pickedImageProblem', () => {
  it('accepts large phone photos, since they are shrunk before upload', () => {
    expect(pickedImageProblem({ type: 'image/jpeg', size: 18 * MB }, 'IMG_1.jpg')).toBeNull();
  });

  it('rejects non-images and originals over 25 MB', () => {
    expect(pickedImageProblem({ type: 'application/pdf', size: MB }, 'bill.pdf')).toBe(
      'bill.pdf: must be an image file',
    );
    expect(
      pickedImageProblem({ type: 'image/png', size: MAX_PICKED_IMAGE_BYTES + 1 }, 'scan.png'),
    ).toBe('scan.png is 25.0 MB; photos up to 25.0 MB can be used');
  });
});

describe('uploadProblem', () => {
  it('allows up to 10 MB in total', () => {
    expect(uploadProblem(Array.from({ length: 5 }, () => ({ size: 2 * MB })))).toBeNull();
  });

  it('names the total when over 10 MB', () => {
    expect(uploadProblem(Array.from({ length: 6 }, () => ({ size: 2 * MB })))).toBe(
      'These images add up to 12.0 MB; the limit is 10.0 MB per upload. Please upload fewer pages at a time.',
    );
  });

  it('rejects more than 20 images', () => {
    expect(uploadProblem(Array.from({ length: 21 }, () => ({ size: 1 })))).toBe(
      'You can upload at most 20 images',
    );
  });
});
