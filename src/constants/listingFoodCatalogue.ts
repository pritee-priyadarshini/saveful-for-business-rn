/**
 * One food vocabulary for Saveful Connect listings and Make Food Count.
 *
 * Listings keep their own short list of rows (nothing is lost, the list does not
 * grow). Make Food Count's food is filed into those rows instead of being added
 * beside them, so "Fruit & vegetables" lands in "Fresh fruit & veg", and Beef and
 * Pork land inside "Meat" — one row with a total, opening onto the meats.
 *
 * Each Make Food Count line is still sent as its own listing item (the server
 * links one line to one item: svforb mfc-listing-link.service.ts). Grouping is
 * how the screen shows them; `category` on each item records the group.
 */
import { resolveMfcArt, type MfcArtKey } from '@/components/makeFoodCount/MfcArt';

export type ListingAudience = 'people' | 'farm';

/** Fields every listing food row has, whichever screen draws it. */
export type GroupableFoodRow = {
  name: string;
  qty: number;
  /** The listing row this sits under (e.g. "Meat"). Absent: a row of its own. */
  group?: string;
  /** Shown instead of `name` inside a group (e.g. "Mixed / other meat"). Never sent. */
  label?: string;
  /** Picture for a row inside a group. */
  art?: MfcArtKey;
  lineId?: number;
};

type SubItem = { name: string; label?: string; art: MfcArtKey };

/** Listing rows that open onto their types. A sub-item named like its group is the "mixed" bucket. */
export const LISTING_GROUPS: Record<ListingAudience, Record<string, SubItem[]>> = {
  people: {
    Meat: [
      { name: 'Chicken', art: 'chicken' },
      { name: 'Beef', art: 'beef' },
      { name: 'Lamb', art: 'lamb' },
      { name: 'Pork', art: 'pork' },
      // Still sent as "Meat", exactly as listings were before the breakdown existed.
      { name: 'Meat', label: 'Mixed / other meat', art: 'meat' },
    ],
  },
  farm: {},
};

/** Replace each groupable seed row (e.g. "Meat") by its types, all inside that group. */
export function expandGroupedSeeds<T extends GroupableFoodRow>(seeds: T[], audience: ListingAudience): T[] {
  return seeds.flatMap((seed) => {
    const subs = LISTING_GROUPS[audience][seed.name];
    if (!subs) return [seed];
    return subs.map((sub) => ({ ...seed, name: sub.name, label: sub.label, art: sub.art, group: seed.name, qty: 0 }));
  });
}

// ─── Make Food Count → listing rows ──────────────────────────────────────────

/**
 * Where a Make Food Count category goes in a listing.
 * `nest`: the line keeps its own name inside the group (Beef in Meat, Plate scraps in Food scraps).
 * Otherwise the line simply is that row (Make Food Count's "Fruit & vegetables" is "Fresh fruit & veg").
 */
type Placement = { group: string; nest: boolean };

const PEOPLE_PLACEMENT: Record<string, Placement> = {
  meat_poultry: { group: 'Meat', nest: true },
  seafood: { group: 'Seafood', nest: true },
  fruit_veg: { group: 'Fresh fruit & veg', nest: false },
  dairy: { group: 'Dairy', nest: false },
  bread_bakery: { group: 'Baked Goods', nest: false },
  prepared_meals: { group: 'Prepared meals', nest: false },
};

/**
 * Not fit for people. Anything that is or may contain meat, fish or bone goes to
 * "Food scraps – with meat": farmers rely on that split for animal feed, so when
 * in doubt (plate scraps, preparation mistakes, shells) it errs on the safe side.
 */
const FARM_PLACEMENT: Record<string, Placement> = {
  fruit_veg: { group: 'Fruit & veg', nest: false },
  dairy: { group: 'Dairy', nest: false },
  bread_bakery: { group: 'Baked goods', nest: false },
  peels_trimmings: { group: 'Food scraps – no meat', nest: true },
  coffee_grounds: { group: 'Food scraps – no meat', nest: true },
  meat_poultry: { group: 'Food scraps – with meat', nest: true },
  seafood: { group: 'Food scraps – with meat', nest: true },
  meat_offcuts: { group: 'Food scraps – with meat', nest: true },
  shells: { group: 'Food scraps – with meat', nest: true },
  plate_scraps: { group: 'Food scraps – with meat', nest: true },
  preparation_mistake: { group: 'Food scraps – with meat', nest: true },
};

/** The groups' own "mixed" wording, for a line with no particular type. */
const MIXED_LABEL: Record<string, string> = { Meat: 'Mixed / other meat', Seafood: 'Mixed / other seafood' };

export type MfcPrefillLike = { name: string; category: string; subtype?: string | null };

/**
 * Files carried-forward Make Food Count lines into listing rows. Returns, per line
 * (same order), the name to list it under, its group, and how to show it.
 */
export function placeMfcLines(
  audience: ListingAudience,
  lines: MfcPrefillLike[],
): { name: string; group?: string; label?: string; art?: MfcArtKey }[] {
  const table = audience === 'people' ? PEOPLE_PLACEMENT : FARM_PLACEMENT;
  const placed = lines.map((line) => {
    const placement = table[line.category];
    if (!placement) return { name: line.name, group: undefined as string | undefined, nest: false, line };
    return { name: placement.group, group: placement.group, nest: placement.nest, line };
  });

  // Two lines landing on the same plain row (e.g. spoiled bread and preparation bread) can't
  // both be "Baked goods": they open into a group like any other, each under its own name.
  const plainCount = new Map<string, number>();
  for (const row of placed) if (row.group && !row.nest) plainCount.set(row.group, (plainCount.get(row.group) ?? 0) + 1);

  const seen = new Map<string, number>();
  return placed.map(({ group, nest, line }) => {
    // The same picture Make Food Count shows for this line (one place decides: resolveMfcArt).
    const art = resolveMfcArt({ category: line.category, subtype: line.subtype });
    if (!group) return { name: line.name, art };
    if (!nest && (plainCount.get(group) ?? 0) < 2) return { name: group, art };

    // Inside a group: the line's own charity-facing name (Beef, Plate scraps …).
    const mixed = line.name.trim().toLowerCase() === group.toLowerCase() || line.subtype === 'other' || !line.subtype;
    const name = nest && audience === 'people' && mixed && MIXED_LABEL[group] ? group : line.name;
    const label = name === group ? MIXED_LABEL[group] : undefined;
    const count = (seen.get(name) ?? 0) + 1;
    seen.set(name, count);
    return { name, group, art, label: count > 1 ? `${label ?? name} (${count})` : label };
  });
}

// ─── Saved listing → form (edit, relist) ─────────────────────────────────────

/** Names older listings used for food that now has a row of its own. */
const LEGACY_NAMES: Record<ListingAudience, Record<string, string>> = {
  people: {
    'fruit & vegetables': 'Fresh fruit & veg',
    'bread & baked goods': 'Baked Goods',
    'meat & poultry': 'Meat',
  },
  farm: {
    'fruit & vegetables': 'Fruit & veg',
    'bread & baked goods': 'Baked goods',
  },
};

const norm = (value: string) => value.trim().toLowerCase();

/**
 * Puts a saved listing's items back on the form's rows, by item name (category
 * is now the group, so several items can share it). Each saved item fills one
 * row only; anything without a row is kept as an extra row, never dropped.
 */
export function mergeSavedFoodItems<T extends GroupableFoodRow>(
  audience: ListingAudience,
  saved: Array<{ name?: string; category?: string; totalQtyKg?: number }>,
  seeds: T[],
  makeExtra: (name: string, qty: number) => T,
): T[] {
  const rows = seeds.map((seed) => ({ ...seed, qty: 0 }));
  const filled = new Set<number>();
  const extras: T[] = [];

  for (const item of saved) {
    const raw = (item.name || item.category || '').trim();
    if (!raw) continue;
    const qty = Number(item.totalQtyKg) || 0;
    const wanted = [norm(raw), norm(LEGACY_NAMES[audience][norm(raw)] ?? raw)];
    const index = rows.findIndex((row, i) => !filled.has(i) && wanted.includes(norm(row.name)));
    if (index >= 0) {
      rows[index] = { ...rows[index], qty };
      filled.add(index);
    } else {
      extras.push(makeExtra(raw, qty));
    }
  }
  return [...rows, ...extras];
}
