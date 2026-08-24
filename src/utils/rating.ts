/** Returns 1–5, or null if the claim has not been rated yet. */
export function parseStarRating(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(5, Math.round(n));
}
