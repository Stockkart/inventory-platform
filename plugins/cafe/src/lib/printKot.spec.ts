import { beforeEach, describe, expect, it, vi } from 'vitest';

const getKotPdf = vi.fn();
const openForPrinting = vi.fn();

vi.mock('../api/cafe-order.api', () => ({ cafeOrderApi: { getKotPdf } }));

describe('printKot', () => {
  beforeEach(() => {
    vi.resetModules();
    getKotPdf.mockReset();
    openForPrinting.mockReset();
  });

  it('fetches the ticket document and hands it to the printer', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    getKotPdf.mockResolvedValue(blob);
    const { printKot } = await import('./printKot');

    await printKot('k1', openForPrinting);

    expect(getKotPdf).toHaveBeenCalledWith('k1');
    expect(openForPrinting).toHaveBeenCalledWith(blob, 'kot_k1.pdf');
  });

  it('rejects when the document cannot be fetched, so the ticket shows Failed', async () => {
    getKotPdf.mockRejectedValue(new Error('offline'));
    const { printKot } = await import('./printKot');

    await expect(printKot('k1', openForPrinting)).rejects.toThrow('offline');
    expect(openForPrinting).not.toHaveBeenCalled();
  });
});
