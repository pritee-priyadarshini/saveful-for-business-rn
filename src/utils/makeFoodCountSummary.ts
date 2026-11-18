/**
 * Pure helpers for the Food summary (MFC-007) and the outcome lines on its action cards (A6).
 * No React and no store, so they can be unit tested on their own.
 */
import type { FoodListingKind, FoodSource, KindOutcome, RecordDetail } from '@/types/makeFoodCount';
import { roundKg, type MfcTotals, type TotalsLine, computeTotals } from '@/utils/makeFoodCountTotals';

export const MFC_SOURCE_LABELS: Record<FoodSource, string> = {
  OVERPRODUCTION: 'Overproduction',
  SPOILAGE: 'Spoilage',
  PREPARATION: 'Preparation',
  PLATE_SCRAPS: 'Plate Scraps',
};

export function formatKg(kg: number): string {
  const rounded = roundKg(kg);
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(2).replace(/0$/, '')} kg`;
}

// ─── Table ───────────────────────────────────────────────────────────────────

export type SummaryRow = {
  source: FoodSource;
  label: string;
  totalKg: number;
  /** Fit Overproduction only; null for the other sources. */
  forPeopleKg: number | null;
  otherKg: number;
};

export type SummaryTable = {
  rows: SummaryRow[];
  total: { totalKg: number; forPeopleKg: number; otherKg: number };
};

/** One row per selected source plus the Total row. Totals come from the local lines. */
export function buildSummaryTable(sources: readonly FoodSource[], lines: readonly TotalsLine[]): SummaryTable {
  const scoped = lines.filter((line) => sources.includes(line.source));
  const totals = computeTotals(scoped);
  const rows = sources.map<SummaryRow>((source) => {
    const sourceTotal = totals.bySource[source];
    if (source !== 'OVERPRODUCTION') {
      return { source, label: MFC_SOURCE_LABELS[source], totalKg: sourceTotal, forPeopleKg: null, otherKg: sourceTotal };
    }
    const fit = computeTotals(scoped.filter((line) => line.source === 'OVERPRODUCTION')).fitKg;
    return {
      source,
      label: MFC_SOURCE_LABELS[source],
      totalKg: sourceTotal,
      forPeopleKg: fit,
      otherKg: roundKg(sourceTotal - fit),
    };
  });
  return {
    rows,
    total: { totalKg: totals.totalKg, forPeopleKg: totals.fitKg, otherKg: totals.notFitKg },
  };
}

// ─── Available kg ────────────────────────────────────────────────────────────

function kindOfLocalTotals(kind: FoodListingKind, totals: Pick<MfcTotals, 'fitKg' | 'notFitKg'>): number {
  return kind === 'EDIBLE' ? totals.fitKg : totals.notFitKg;
}

/**
 * Kg still available to list for one kind.
 * - Server outcomes (when they belong to this record and were just reloaded): the sum of the per-line
 *   availableKg for that kind's lines, or eligible minus listed when there is no per-line data.
 * - Otherwise: the local lines for that kind, minus whatever the last server copy says is already listed.
 */
export function kindAvailableKg(params: {
  kind: FoodListingKind;
  localTotals: Pick<MfcTotals, 'fitKg' | 'notFitKg'>;
  detail: RecordDetail | null;
  recordId: number | null;
  /** True once the outcomes were reloaded after the latest local edit. */
  outcomesFresh: boolean;
}): number {
  const { kind, localTotals, detail, recordId, outcomesFresh } = params;
  const sameRecord = detail != null && recordId != null && detail.record.id === recordId;

  if (sameRecord && outcomesFresh) {
    const outcome = detail.outcomes[kind];
    const kindLineIds = new Set(
      detail.lines
        .filter((line) => (kind === 'EDIBLE' ? line.source === 'OVERPRODUCTION' && line.fitForHumans : !(line.source === 'OVERPRODUCTION' && line.fitForHumans)))
        .map((line) => line.id)
        .filter((id): id is number => id != null),
    );
    const perLine = detail.lineOutcomes.filter((row) => kindLineIds.has(row.lineId));
    if (perLine.length > 0) {
      return Math.max(0, roundKg(perLine.reduce((sum, row) => sum + row.availableKg, 0)));
    }
    return Math.max(0, roundKg(outcome.eligibleKg - outcome.listedKg));
  }

  const listed = sameRecord ? detail.outcomes[kind].listedKg : 0;
  return Math.max(0, roundKg(kindOfLocalTotals(kind, localTotals) - listed));
}

// ─── Outcome progress ────────────────────────────────────────────────────────

export const OUTCOME_STEPS = ['Eligible', 'Listed', 'Claimed', 'Collected'] as const;

export type OutcomeSummary = {
  /** 0 Eligible · 1 Listed · 2 Claimed · 3 Collected. */
  step: number;
  /** Plain text under the progress bar. */
  text: string;
  tone: 'neutral' | 'good' | 'warn';
};

/**
 * Turn a server KindOutcome into a step and a plain sentence. Returns null when nothing has been listed
 * yet (the card then shows only "X kg available").
 */
export function describeOutcome(outcome: KindOutcome | null | undefined): OutcomeSummary | null {
  if (!outcome) return null;
  const status = String(outcome.status ?? '').toUpperCase();
  const { listedKg, claimedKg, collectedKg } = outcome;
  const step = collectedKg > 0 ? 3 : claimedKg > 0 ? 2 : listedKg > 0 ? 1 : 0;

  if (status.includes('EXPIRED')) {
    return { step, text: listedKg > 0 ? `Expired · ${formatKg(listedKg)} listed` : 'Expired', tone: 'warn' };
  }
  if (status.includes('CANCEL')) {
    return { step, text: listedKg > 0 ? `Cancelled · ${formatKg(listedKg)} listed` : 'Cancelled', tone: 'warn' };
  }
  if (collectedKg > 0) {
    return {
      step,
      text: `Collected ${formatKg(collectedKg).replace(' kg', '')} of ${formatKg(listedKg)}`,
      tone: 'good',
    };
  }
  if (claimedKg > 0) {
    const name = outcome.claimedByName?.trim();
    return { step, text: name ? `Claimed by ${name}` : `Claimed · ${formatKg(claimedKg)}`, tone: 'neutral' };
  }
  if (listedKg > 0) {
    return { step, text: `Listed ${formatKg(listedKg)} · Waiting for a claim`, tone: 'neutral' };
  }
  return null;
}
