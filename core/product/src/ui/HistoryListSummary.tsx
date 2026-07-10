import { Text } from '@inventory-platform/ui-kit';

type HistoryListSummaryProps = {
  page: number;
  limit: number;
  total: number;
  filtered?: boolean;
  label?: string;
};

export function HistoryListSummary({
  page,
  limit,
  total,
  filtered = false,
  label = 'records',
}: HistoryListSummaryProps) {
  if (total === 0) return null;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return (
    <Text variant="caption" color="secondary" style={{ marginBottom: '1.25rem' }}>
      Showing {start} – {end} of {total} {label}
      {filtered ? ' (filtered)' : ''}
    </Text>
  );
}
