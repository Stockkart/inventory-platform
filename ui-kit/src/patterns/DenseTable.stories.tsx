import type { Meta, StoryObj } from '@storybook/react';
import {
  DenseTable,
  DenseTableSurface,
  DenseTableRow,
  DenseTableHeaderCell,
  DenseTableCell,
  denseTableClassNames,
} from './DenseTable';
import { DenseDataGridWrap, denseDataGrid } from './DenseDataGrid';
import { Stack, Text } from '../layout';
import { Button } from '../forms';

const meta: Meta = {
  title: 'Patterns/Dense tables',
};

export default meta;

const rows = [
  { name: 'Paracetamol 500mg', qty: 2, rate: 12.5, total: 25 },
  { name: 'Amoxicillin 250mg', qty: 1, rate: 48, total: 48 },
  { name: 'ORS Sachet', qty: 4, rate: 8, total: 32 },
];

export const DenseTableCart: StoryObj = {
  render: () => (
    <Stack gap="md">
      <Text variant="title">DenseTable (POS cart grid)</Text>
      <DenseTable>
        <DenseTableSurface>
          <thead>
            <DenseTableRow>
              <DenseTableHeaderCell>Product</DenseTableHeaderCell>
              <DenseTableHeaderCell>Qty</DenseTableHeaderCell>
              <DenseTableHeaderCell>Rate</DenseTableHeaderCell>
              <DenseTableHeaderCell>Total</DenseTableHeaderCell>
            </DenseTableRow>
          </thead>
          <tbody>
            {rows.map((row) => (
              <DenseTableRow key={row.name}>
                <DenseTableCell>
                  <button type="button" className={denseTableClassNames.productBtn}>
                    {row.name}
                  </button>
                </DenseTableCell>
                <DenseTableCell>
                  <input
                    className={denseTableClassNames.cellInput}
                    defaultValue={row.qty}
                    readOnly
                  />
                </DenseTableCell>
                <DenseTableCell className={denseTableClassNames.priceCell}>
                  ₹{row.rate.toFixed(2)}
                </DenseTableCell>
                <DenseTableCell className={denseTableClassNames.priceCell}>
                  ₹{row.total.toFixed(2)}
                </DenseTableCell>
              </DenseTableRow>
            ))}
          </tbody>
        </DenseTableSurface>
      </DenseTable>
    </Stack>
  ),
};

export const DenseDataGridRegistration: StoryObj = {
  render: () => (
    <Stack gap="md">
      <Text variant="title">DenseDataGrid (registration spreadsheet)</Text>
      <DenseDataGridWrap>
        <table className={denseDataGrid.table}>
          <thead>
            <tr className={denseDataGrid.tr}>
              <th className={denseDataGrid.th}>#</th>
              <th className={denseDataGrid.th}>Product</th>
              <th className={denseDataGrid.th}>Qty</th>
              <th className={denseDataGrid.th}>MRP</th>
              <th className={denseDataGrid.th}>
                <span className={denseDataGrid.srOnly}>Remove</span>
              </th>
            </tr>
            <tr className={denseDataGrid.bulkRow}>
              <th className={denseDataGrid.bulkTh} colSpan={2}>
                <span className={denseDataGrid.bulkLabel}>Bulk fill</span>
              </th>
              <th className={denseDataGrid.bulkTh}>
                <input className={denseDataGrid.inputNarrow} placeholder="Qty" />
              </th>
              <th className={denseDataGrid.bulkTh}>
                <input className={denseDataGrid.inputNarrow} placeholder="MRP" />
              </th>
              <th className={denseDataGrid.bulkTh}>
                <Button type="button" size="sm" className={denseDataGrid.bulkApplyBtn}>
                  Apply
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {['Crocin Advance', 'Dolo 650', 'Zincovit'].map((name, i) => (
              <tr key={name} className={denseDataGrid.tr}>
                <td className={denseDataGrid.td}>{i + 1}</td>
                <td className={denseDataGrid.td}>
                  <input className={denseDataGrid.input} defaultValue={name} />
                </td>
                <td className={denseDataGrid.td}>
                  <input className={denseDataGrid.inputNarrow} defaultValue={10 + i} />
                </td>
                <td className={denseDataGrid.td}>
                  <input
                    className={denseDataGrid.inputNarrow}
                    defaultValue={(20 + i * 5).toFixed(2)}
                  />
                </td>
                <td className={denseDataGrid.td}>
                  <button type="button" className={denseDataGrid.removeBtn} aria-label="Remove row">
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DenseDataGridWrap>
      <Text variant="caption" color="secondary" className={denseDataGrid.footnote}>
        Sticky headers + compact inputs for bulk product registration.
      </Text>
    </Stack>
  ),
};
