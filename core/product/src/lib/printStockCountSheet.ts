function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type StockCountSheetLine = {
  name: string;
  batchNo: string | null;
  invoiceNo: string | null;
  createdLabel: string | null;
  currentQty: string;
};

/** Opens a printable physical-count sheet with a blank counted-qty column. */
export function openStockCountSheetPrintWindow(args: {
  shopName?: string | null;
  printedAt: string;
  lines: StockCountSheetLine[];
}): void {
  if (!args.lines.length) {
    throw new Error('Add lots to the count list before printing');
  }

  const shop = args.shopName?.trim() || 'StockKart';
  const rows = args.lines
    .map(
      (line, index) => `
      <tr>
        <td class="num">${index + 1}</td>
        <td>${escapeHtml(line.name)}</td>
        <td>${escapeHtml(line.batchNo || '—')}</td>
        <td>${escapeHtml(line.invoiceNo || '—')}</td>
        <td>${escapeHtml(line.createdLabel || '—')}</td>
        <td class="num">${escapeHtml(line.currentQty)}</td>
        <td class="count-box"></td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Stock count sheet</title>
  <style>
    @page { margin: 12mm; }
    body { font-family: system-ui, sans-serif; margin: 0; color: #111; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .meta { font-size: 12px; color: #333; margin-bottom: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #222; padding: 6px 8px; text-align: left; vertical-align: middle; }
    th { background: #f3f4f6; }
    .num { text-align: right; width: 4.5rem; font-variant-numeric: tabular-nums; }
    .count-box { width: 5.5rem; height: 1.6rem; }
    .sign { margin-top: 22px; font-size: 12px; display: flex; gap: 48px; }
    .sign span { border-bottom: 1px solid #222; min-width: 180px; display: inline-block; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <h1>Stock count sheet</h1>
  <div class="meta">${escapeHtml(shop)} · Printed ${escapeHtml(args.printedAt)} · ${
    args.lines.length
  } lots</div>
  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Product</th>
        <th>Batch</th>
        <th>Invoice</th>
        <th>Created</th>
        <th class="num">System qty</th>
        <th>Counted qty</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="sign">
    <div>Counted by <span></span></div>
    <div>Date <span></span></div>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    throw new Error('Pop-up blocked. Allow pop-ups to print the count sheet.');
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
