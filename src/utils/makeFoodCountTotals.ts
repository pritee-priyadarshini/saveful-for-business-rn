/**
 * Make Food Count quantity rules and totals. Pure functions only (no React, no store),
 * so they can be unit tested on their own.
 *
 * Rules (app SPEC §7): kilograms, up to 2 decimals, more than 0, at most 500 kg per line.
 * A blank field means "not entered", never a saved 0.
 */
import { FOOD_SOURCES, type FoodSource } from '@/types/makeFoodCount';

export const MFC_MAX_KG_PER_LINE = 500;
export const MFC_QTY_DECIMALS = 2;

/** Taxonomy keys of the two group rows that show a group total. */
export const MFC_MEAT_CATEGORY = 'meat_poultry';
export const MFC_SEAFOOD_CATEGORY = 'seafood';

/** Round to 2 dp. Works on the cent so 1.005 and 0.1 + 0.2 behave. */
export function roundKg(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function hasAtMostTwoDecimals(n: number): boolean {
  return Math.abs(n * 100 - Math.round(n * 100)) < 1e-7;
}

/**
 * Check a quantity that has already been parsed.
 * Returns an inline error message, or null when the value is fine.
 * null (not entered) is valid: it is simply not saved.
 */
export function validateQtyKg(n: number | null): string | null {
  if (n === null) return null;
  if (typeof n !== 'number' || !Number.isFinite(n)) return 'Enter a number';
  if (n < 0) return 'Enter a positive number';
  if (n === 0) return 'Enter more than 0 kg';
  if (!hasAtMostTwoDecimals(n)) return 'Use up to 2 decimal places';
  if (n > MFC_MAX_KG_PER_LINE) return `Enter ${MFC_MAX_KG_PER_LINE} kg or less`;
  return null;
}

export type QtyParseError = { error: string };
export type QtyParseResult = number | null | QtyParseError;

export function isQtyParseError(result: QtyParseResult): result is QtyParseError {
  return typeof result === 'object' && result !== null && 'error' in result;
}

/**
 * Turn what the user typed into a quantity.
 * - blank          → null (not entered)
 * - not a number   → { error }
 * - fails the rules → { error }
 * - valid          → the number (already 2 dp at most)
 * A comma is accepted as the decimal mark.
 */
export function parseQtyInput(raw: string | null | undefined): QtyParseResult {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const normalised = text.replace(',', '.');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(normalised)) return { error: 'Enter a number' };
  const value = Number(normalised);
  const error = validateQtyKg(value);
  if (error) return { error };
  return value;
}

/** Deterministic, stable client key for a line, e.g. "OVERPRODUCTION:meat_poultry:chicken". */
export function mfcLineKey(source: FoodSource, category: string, subtype?: string | null): string {
  return subtype ? `${source}:${category}:${subtype}` : `${source}:${category}`;
}

/** The fields computeTotals reads. Draft lines (qtyKg may be null) and server lines both fit. */
export type TotalsLine = {
  source: FoodSource;
  category?: string;
  qtyKg: number | null | undefined;
  fitForHumans?: boolean;
  deletedAt?: string | null;
  deleted?: boolean;
};

export type MfcTotals = {
  totalKg: number;
  fitKg: number;
  notFitKg: number;
  bySource: Record<FoodSource, number>;
  meatGroupKg: number;
  seafoodGroupKg: number;
};

export function isCountableLine(line: TotalsLine): boolean {
  if (line.deleted || line.deletedAt) return false;
  const qty = Number(line.qtyKg);
  return Number.isFinite(qty) && qty > 0;
}

function emptyBySource(): Record<FoodSource, number> {
  const out = {} as Record<FoodSource, number>;
  for (const source of FOOD_SOURCES) out[source] = 0;
  return out;
}

/**
 * Totals across lines. Only lines with qtyKg > 0 and not deleted count.
 * fitKg counts fit Overproduction lines only; every other line is notFitKg.
 * meatGroupKg / seafoodGroupKg sum the group rows over every source.
 */
export function computeTotals(lines: readonly TotalsLine[]): MfcTotals {
  const bySource = emptyBySource();
  let total = 0;
  let fit = 0;
  let meat = 0;
  let seafood = 0;

  for (const line of lines) {
    if (!isCountableLine(line)) continue;
    const qty = Number(line.qtyKg);
    total += qty;
    bySource[line.source] += qty;
    if (line.source === 'OVERPRODUCTION' && line.fitForHumans) fit += qty;
    if (line.category === MFC_MEAT_CATEGORY) meat += qty;
    if (line.category === MFC_SEAFOOD_CATEGORY) seafood += qty;
  }

  const totalKg = roundKg(total);
  const fitKg = roundKg(fit);
  for (const source of FOOD_SOURCES) bySource[source] = roundKg(bySource[source]);

  return {
    totalKg,
    fitKg,
    notFitKg: roundKg(totalKg - fitKg),
    bySource,
    meatGroupKg: roundKg(meat),
    seafoodGroupKg: roundKg(seafood),
  };
}

/** Group total for one source's group row, e.g. Overproduction Meat & poultry. */
export function computeGroupKg(lines: readonly TotalsLine[], source: FoodSource, category: string): number {
  let sum = 0;
  for (const line of lines) {
    if (line.source !== source || line.category !== category || !isCountableLine(line)) continue;
    sum += Number(line.qtyKg);
  }
  return roundKg(sum);
}

/** Display a kg figure with up to 2 decimals and no trailing zeros: 7 → "7", 7.5 → "7.5", 1.25 → "1.25". */
export function formatKgDisplay(value: number | null | undefined): string {
  const n = roundKg(Number(value ?? 0));
  return String(n);
}
