/** Shared list paging defaults for MIS report pages. */
export const MIS_DEFAULT_PAGE_SIZE = 50;
export const MIS_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export function misTotalPages(totalItems: number, pageSize: number): number {
  const size = pageSize > 0 ? pageSize : MIS_DEFAULT_PAGE_SIZE;
  return Math.max(1, Math.ceil(Math.max(totalItems, 0) / size));
}
