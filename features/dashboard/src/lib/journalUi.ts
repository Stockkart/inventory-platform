/**
 * Strips BSON-style 24‑hex IDs from persisted memos/descriptions so the dashboard stays readable.
 * Matches legacy payloads that appended internal `{purchaseId}` to sale cash lines.
 */
const INLINE_OBJECT_ID = /\s*·\s*[a-f0-9]{24}\b/gi;
const TRAILING_OBJECT_ID_LOOP = /\s*·\s*[a-f0-9]{24}\s*$/i;

function collapseSpaces(s: string): string {
  return s.replace(/\s{2,}/g, ' ').trim();
}

export function formatJournalMemoForDisplay(memo: string | null | undefined): string {
  if (!memo?.trim()) return '';
  let s = memo.trim();
  s = s.replace(INLINE_OBJECT_ID, '');
  let prev = '';
  while (prev !== s) {
    prev = s;
    s = s.replace(TRAILING_OBJECT_ID_LOOP, '').trim();
  }
  return collapseSpaces(s);
}

/** Removes embedded ObjectId segments from headings (legacy purchase drafts, etc.). */
export function formatJournalHeadingForDisplay(desc: string | null | undefined): string {
  if (!desc?.trim()) return '';
  return collapseSpaces(desc.replace(INLINE_OBJECT_ID, ''));
}
