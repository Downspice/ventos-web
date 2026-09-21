/** Client-side list filter: true when query is empty or any haystack contains query (case-insensitive). */
export function matchesListSearch(
  query: string,
  ...haystacks: (string | null | undefined)[]
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystacks.some((h) => h != null && String(h).toLowerCase().includes(q));
}
