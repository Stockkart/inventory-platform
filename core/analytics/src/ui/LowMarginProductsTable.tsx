import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
} from '@inventory-platform/ui-kit';

interface LowMarginProduct {
  inventoryId: string;
  productName: string;
  lotId: string | null;
  companyName: string;
  businessType: string;
  totalQuantitySold: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  marginPercent: number;
  numberOfSales: number;
}

interface LowMarginProductsTableProps {
  data: LowMarginProduct[];
}

function marginColor(margin: number): string | undefined {
  if (margin < 20) return '#ef4444';
  if (margin < 30) return '#10b981';
  return undefined;
}

export function LowMarginProductsTable({ data }: LowMarginProductsTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  };

  return (
    <Stack gap="md">
      <Text variant="heading4" weight="semibold">
        Low Margin Products
      </Text>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Product Name</TableHeaderCell>
            <TableHeaderCell>Company</TableHeaderCell>
            <TableHeaderCell>Quantity Sold</TableHeaderCell>
            <TableHeaderCell>Revenue</TableHeaderCell>
            <TableHeaderCell>Cost</TableHeaderCell>
            <TableHeaderCell>Profit</TableHeaderCell>
            <TableHeaderCell>Margin %</TableHeaderCell>
            <TableHeaderCell>Sales Count</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((product) => (
            <TableRow key={product.inventoryId}>
              <TableCell>{product.productName}</TableCell>
              <TableCell>{product.companyName}</TableCell>
              <TableCell>{product.totalQuantitySold}</TableCell>
              <TableCell>{formatCurrency(product.totalRevenue)}</TableCell>
              <TableCell>{formatCurrency(product.totalCost)}</TableCell>
              <TableCell>{formatCurrency(product.grossProfit)}</TableCell>
              <TableCell>
                <Text
                  weight="semibold"
                  style={
                    marginColor(product.marginPercent)
                      ? { color: marginColor(product.marginPercent) }
                      : undefined
                  }
                >
                  {product.marginPercent.toFixed(2)}%
                </Text>
              </TableCell>
              <TableCell>{product.numberOfSales}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}
