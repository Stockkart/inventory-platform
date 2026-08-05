/** Shorten long txn ids for dense tables while keeping enough to scan. */
export function shortenTxnId(txnId: string, keep = 8): string {
  const id = txnId.trim();
  if (!id) return '—';
  if (id.length <= keep + 1) return id;
  return `${id.slice(0, keep)}…`;
}
