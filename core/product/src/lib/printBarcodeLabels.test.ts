// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { labelLayoutSession } from './labelLayoutSession';
import { openBarcodeLabelPrintWindow, openLocalBarcodeLabelPrint } from './printBarcodeLabels';
import type { EffectiveLabelLayout, LabelLayoutResponse } from '../model/labelLayout.types';

// vi.mock calls are hoisted above imports by Vitest, so declaring them after the
// import block keeps `import/first` happy without changing mock behaviour.
vi.mock('@inventory-platform/session', () => ({
  useAuthStore: { subscribe: vi.fn() },
}));
vi.mock('jsbarcode', () => ({ default: vi.fn() }));

function createFakeWindow() {
  return {
    document: {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
      querySelectorAll: () => [],
    },
    focus: vi.fn(),
    print: vi.fn(),
    close: vi.fn(),
  };
}

function writtenHtml(fake: ReturnType<typeof createFakeWindow>): string {
  expect(fake.document.write).toHaveBeenCalledTimes(1);
  return fake.document.write.mock.calls[0][0] as string;
}

const mrpOnlyLayout: LabelLayoutResponse = {
  enabledFields: [{ fieldKey: 'mrp', label: 'MRP', valueType: 'currency' }],
  stickerSize: '50x25',
  stickerSizeSpec: { size: '50x25', widthMm: 50, heightMm: 25, maxLines: 3 },
  showBarcodeText: true,
  showFieldLabels: false,
  blankValueBehavior: 'HIDE_LINE',
  printMedia: 'ROLL',
  isDefault: false,
  shopType: 'RETAILER',
};

const item = { code: 'ABC123', name: 'Paracetamol', companyName: 'Acme Pharma', price: 12 };

describe('printBarcodeLabels', () => {
  let fakeWin: ReturnType<typeof createFakeWindow>;
  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fakeWin = createFakeWindow();
    openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWin as unknown as Window);
  });

  afterEach(() => {
    labelLayoutSession.clear();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('falls back to DEFAULT_LAYOUT when no session layout exists (Req 7.10)', () => {
    openLocalBarcodeLabelPrint([item]);
    vi.advanceTimersByTime(50);

    const html = writtenHtml(fakeWin);
    expect(html).toContain('ABC123');
    expect(html).toContain('Paracetamol');
    expect(html).toContain('Acme Pharma');
    expect(html).not.toContain('₹12.00');
    expect(fakeWin.print).toHaveBeenCalledTimes(1);
  });

  it('uses the session-cached layout for local prints (Req 7.9)', () => {
    labelLayoutSession.set(mrpOnlyLayout);
    openLocalBarcodeLabelPrint([item]);
    vi.advanceTimersByTime(50);

    const html = writtenHtml(fakeWin);
    expect(html).toContain('₹12.00');
    expect(html).not.toContain('Acme Pharma');
    expect(html).not.toContain('Paracetamol');
  });

  it('throws before opening a window when the list is empty (Req 7.13)', () => {
    expect(() => openLocalBarcodeLabelPrint([])).toThrow('No labels to print');
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('prefers an explicit layout over the session layout (Req 7.8)', () => {
    labelLayoutSession.set(mrpOnlyLayout);
    const explicit: EffectiveLabelLayout = {
      enabledFields: [{ fieldKey: 'companyName', label: 'Company', valueType: 'text' }],
      stickerSize: '50x25',
      showBarcodeText: false,
      showFieldLabels: false,
      blankValueBehavior: 'HIDE_LINE',
      printMedia: 'ROLL',
    };

    openBarcodeLabelPrintWindow(
      [{ code: 'XYZ', companyName: 'Acme Pharma', values: { companyName: 'Acme Pharma', mrp: '₹12.00' } }],
      explicit,
    );
    vi.advanceTimersByTime(50);

    const html = writtenHtml(fakeWin);
    expect(html).toContain('Acme Pharma');
    expect(html).not.toContain('₹12.00');
  });
});
