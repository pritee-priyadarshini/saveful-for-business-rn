import type { FoodListingKind, ListingPrefillItem, MfcListingRouteParams } from '@/types/makeFoodCount';

export const MFC_BANNER_TEXT =
  '✓ Items from Make Food Count have been carried forward. Adjust quantities below if only part of the food is suitable.';

/** Round to 2 dp (Make Food Count quantities). */
export const roundKg = (value: number) => Math.round(value * 100) / 100;

/** "7", "7.5", "7.25" - up to 2 dp, no trailing zeros. */
export const formatMfcKg = (value: number) => String(roundKg(value));

/** Linked rows can't exceed availableKg and never go below 0. */
export function clampMfcQty(value: number, availableKg: number) {
  return Math.min(roundKg(availableKg), Math.max(0, roundKg(value)));
}

/** A listing row that came from a Make Food Count line. */
export type MfcLinkedFields = {
  /** Server line id. Present only for rows carried forward from the record. */
  lineId?: number;
  countedKg?: number;
  availableKg?: number;
};

export function mfcItemsFromRoute<T>(
  mfc: MfcListingRouteParams,
  build: (item: ListingPrefillItem, base: MfcLinkedFields & { name: string; qty: number }) => T,
): T[] {
  return mfc.items.map((item) =>
    build(item, {
      name: item.name,
      qty: clampMfcQty(item.availableKg, item.availableKg),
      lineId: item.lineId,
      countedKg: item.countedKg,
      availableKg: item.availableKg,
    }),
  );
}

/**
 * foodRecord payload: only linked rows that are still being listed (qty > 0).
 * itemIndex is the index into the foodItems array that is actually sent (rows with qty > 0).
 */
export function buildMfcFoodRecord(
  mfc: MfcListingRouteParams,
  activeItems: Array<{ lineId?: number }>,
): { recordId: number; kind: FoodListingKind; items: { lineId: number; itemIndex: number }[] } {
  const items: { lineId: number; itemIndex: number }[] = [];
  activeItems.forEach((item, itemIndex) => {
    if (typeof item.lineId === 'number') items.push({ lineId: item.lineId, itemIndex });
  });
  return { recordId: mfc.recordId, kind: mfc.kind, items };
}

/** `${clientRequestId or recordId}:${kind}:${attempt}` */
export function buildMfcIdempotencyKey(
  clientRequestId: string | null | undefined,
  recordId: number,
  kind: FoodListingKind,
  attempt: number,
) {
  return `${clientRequestId || recordId}:${kind}:${attempt}`;
}

/**
 * Attempt counter for the Idempotency-Key. A retry of the *same* request (double tap, timeout,
 * airplane mode) re-uses the same key so the server replays instead of creating a second listing.
 * If the form changed since the last attempt, the attempt number goes up so a different request
 * never collides with the earlier key.
 */
export type MfcAttemptState = { fingerprint: string | null; attempt: number };

export function nextMfcAttempt(state: MfcAttemptState, fingerprint: string): number {
  if (state.fingerprint === null) {
    state.attempt = 1;
  } else if (state.fingerprint !== fingerprint) {
    state.attempt += 1;
  }
  state.fingerprint = fingerprint;
  return state.attempt;
}

export const mfcListedNotice = (kg: number, audience: 'people' | 'not fit for human consumption') =>
  audience === 'people'
    ? `Listed ${formatMfcKg(kg)} kg for people`
    : `Listed ${formatMfcKg(kg)} kg not fit for human consumption`;
