import {
  Alert,
  Badge,
  Button,
  Modal,
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TableLoadingRow,
  TableRow,
} from '@inventory-platform/ui-kit';
import type { BadgeVariant } from '@inventory-platform/ui-kit';
import type { AdminVoucher, VoucherRedemptionStatus } from '@inventory-platform/plan/types';
import { useVoucherRedemptionsQuery } from '../hooks';
import { adminErrorMessage, formatAdminDate } from '../format';
import { formatRupees } from '../../ui/planPricing';

const STATUS_BADGE: Record<VoucherRedemptionStatus, { label: string; variant: BadgeVariant }> = {
  RESERVED: { label: 'Held at checkout', variant: 'warning' },
  REDEEMED: { label: 'Redeemed', variant: 'success' },
  RELEASED: { label: 'Released', variant: 'neutral' },
};

export interface RedemptionsModalProps {
  voucher: AdminVoucher | null;
  onClose: () => void;
}

export function RedemptionsModal({ voucher, onClose }: RedemptionsModalProps) {
  const query = useVoucherRedemptionsQuery(voucher?.id ?? null);
  const rows = query.data ?? [];

  return (
    <Modal open={voucher !== null} onClose={onClose} size="lg">
      <Modal.Header title={voucher ? `Uses of ${voucher.code}` : 'Uses'} onClose={onClose} />
      <Modal.Body>
        {query.isError ? (
          <Alert variant="danger">{adminErrorMessage(query.error, 'Could not load uses.')}</Alert>
        ) : null}
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Shop</TableHeaderCell>
              <TableHeaderCell>Order</TableHeaderCell>
              <TableHeaderCell>Discount</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>When</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {query.isLoading ? (
              <TableLoadingRow colSpan={5} />
            ) : rows.length === 0 ? (
              <TableEmptyRow colSpan={5} message="Not used yet." />
            ) : (
              rows.map((r) => {
                const badge = STATUS_BADGE[r.status];
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.shopId}</TableCell>
                    <TableCell>{r.orderId}</TableCell>
                    <TableCell>{formatRupees(r.discount)}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {formatAdminDate(r.redeemedAt ?? r.releasedAt ?? r.reservedAt)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
