import { create } from 'zustand';

import { makeFoodCountService, readMfcError } from '@/services/makeFoodCount.service';
import type {
  FoodSource,
  InsightsFilters,
  InsightsPayload,
  InsightsQuery,
  SourceDrilldown,
} from '@/types/makeFoodCount';

/**
 * Filter state for Food Impact (MFC-010). One state serves all three views and the source drill-down.
 * Not persisted: it resets on app start, which is what a reporting filter should do.
 */

export type MfcPeriodPreset = 'this_week' | 'this_month' | 'last_3_months' | 'custom';

export type MfcFilterKey = 'groupId' | 'territoryId' | 'clusterId' | 'siteId';

export const MFC_PERIOD_PRESETS: { value: MfcPeriodPreset; label: string }[] = [
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'custom', label: 'Custom' },
];

export const EMPTY_INSIGHTS_FILTERS: InsightsFilters = { groups: [], territories: [], clusters: [], sites: [] };

// ─── Dates ───────────────────────────────────────────────────────────────────

/** Local calendar date as YYYY-MM-DD (matches what the user sees on the phone). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

/** From/to for a preset, ending today. Weeks start on Monday. */
export function presetRange(preset: Exclude<MfcPeriodPreset, 'custom'>, now: Date = new Date()): { from: string; to: string } {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  if (preset === 'this_week') {
    const sinceMonday = (end.getDay() + 6) % 7;
    start.setDate(end.getDate() - sinceMonday);
  } else if (preset === 'this_month') {
    start.setDate(1);
  } else {
    // Last 3 months: back three calendar months, the day after, so the window is exactly three months wide.
    start.setMonth(end.getMonth() - 3);
    start.setDate(start.getDate() + 1);
  }
  return { from: toIsoDate(start), to: toIsoDate(end) };
}

// ─── Cascading options ───────────────────────────────────────────────────────

type Parents = Partial<Record<MfcFilterKey, number | null>>;

/** An option belongs under the chosen parents unless it names a different parent. Unknown (null) parents pass. */
function fitsParents(item: Parents, chosen: Parents): boolean {
  for (const key of ['groupId', 'territoryId', 'clusterId'] as const) {
    const wanted = chosen[key];
    const own = item[key];
    if (wanted != null && own != null && own !== wanted) return false;
  }
  return true;
}

export type MfcInsightsOptions = {
  groups: InsightsFilters['groups'];
  territories: InsightsFilters['territories'];
  clusters: InsightsFilters['clusters'];
  sites: InsightsFilters['sites'];
};

/** Option lists limited by the parent ids already chosen. */
export function getInsightsOptions(
  filters: InsightsFilters | null,
  chosen: { groupId: number | null; territoryId: number | null; clusterId: number | null },
): MfcInsightsOptions {
  const source = filters ?? EMPTY_INSIGHTS_FILTERS;
  return {
    groups: source.groups,
    territories: source.territories.filter((row) => fitsParents(row, chosen)),
    clusters: source.clusters.filter((row) => fitsParents(row, chosen)),
    sites: source.sites.filter((row) => fitsParents(row, chosen)),
  };
}

type FilterIds = { groupId: number | null; territoryId: number | null; clusterId: number | null; siteId: number | null };

/** After a parent changes, drop any lower-level pick that no longer belongs. */
function pruneSelection(filters: InsightsFilters | null, ids: FilterIds): FilterIds {
  // Without the option lists there is nothing to check against; keep the picks as they are.
  if (!filters) return ids;
  const source = filters;
  const next = { ...ids };

  if (next.territoryId != null) {
    const row = source.territories.find((entry) => entry.id === next.territoryId);
    if (!row || !fitsParents(row, { groupId: next.groupId })) next.territoryId = null;
  }
  if (next.clusterId != null) {
    const row = source.clusters.find((entry) => entry.id === next.clusterId);
    if (!row || !fitsParents(row, { groupId: next.groupId, territoryId: next.territoryId })) next.clusterId = null;
  }
  if (next.siteId != null) {
    const row = source.sites.find((entry) => entry.id === next.siteId);
    if (!row || !fitsParents(row, { groupId: next.groupId, territoryId: next.territoryId, clusterId: next.clusterId })) {
      next.siteId = null;
    }
  }
  return next;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export type MfcDrilldownEntry = {
  data: SourceDrilldown | null;
  loading: boolean;
  error: string | null;
};

type MfcInsightsState = {
  periodPreset: MfcPeriodPreset;
  from: string;
  to: string;
  groupId: number | null;
  territoryId: number | null;
  clusterId: number | null;
  siteId: number | null;

  filters: InsightsFilters | null;
  filtersLoading: boolean;
  filtersError: string | null;

  insights: InsightsPayload | null;
  loading: boolean;
  error: string | null;

  drilldowns: Partial<Record<FoodSource, MfcDrilldownEntry>>;

  setPreset: (preset: MfcPeriodPreset) => void;
  setRange: (from: string, to: string) => void;
  setFilter: (key: MfcFilterKey, id: number | null) => void;
  clearFilters: () => void;
  loadFilters: () => Promise<void>;
  loadInsights: () => Promise<void>;
  loadSourceDrilldown: (source: FoodSource) => Promise<void>;
};

const DEFAULT_PRESET: Exclude<MfcPeriodPreset, 'custom'> = 'this_month';

const initialRange = presetRange(DEFAULT_PRESET);

const EMPTY_DRILLDOWN: MfcDrilldownEntry = { data: null, loading: false, error: null };

/** Stale responses (the user changed a filter while a request was in flight) must not overwrite newer ones. */
let insightsRequest = 0;
const drilldownRequests: Partial<Record<FoodSource, number>> = {};

/** The query the API sees. Ids that are not set are left out. */
export function buildInsightsQuery(state: Pick<MfcInsightsState, 'from' | 'to' | 'groupId' | 'territoryId' | 'clusterId' | 'siteId'>): InsightsQuery {
  // The server compares recordedAt with `new Date(from/to)`. A bare "YYYY-MM-DD" is UTC midnight at the
  // *start* of that day, which would drop everything recorded on the last day (today, for the presets) and
  // shift the window for sites outside UTC. Send the user's local day boundaries as full timestamps instead.
  const start = parseIsoDate(state.from);
  const end = parseIsoDate(state.to);
  end.setHours(23, 59, 59, 999);
  const query: InsightsQuery = { from: start.toISOString(), to: end.toISOString() };
  if (state.groupId != null) query.groupId = state.groupId;
  if (state.territoryId != null) query.territoryId = state.territoryId;
  if (state.clusterId != null) query.clusterId = state.clusterId;
  if (state.siteId != null) query.siteId = state.siteId;
  return query;
}

/** Stable string of everything that changes the numbers, for effect dependencies. */
export function insightsQueryKey(state: Pick<MfcInsightsState, 'from' | 'to' | 'groupId' | 'territoryId' | 'clusterId' | 'siteId'>): string {
  return [state.from, state.to, state.groupId ?? '', state.territoryId ?? '', state.clusterId ?? '', state.siteId ?? ''].join('|');
}

export const useMfcInsightsStore = create<MfcInsightsState>((set, get) => ({
  periodPreset: DEFAULT_PRESET,
  from: initialRange.from,
  to: initialRange.to,
  groupId: null,
  territoryId: null,
  clusterId: null,
  siteId: null,

  filters: null,
  filtersLoading: false,
  filtersError: null,

  insights: null,
  loading: false,
  error: null,

  drilldowns: {},

  setPreset: (preset) => {
    if (preset === 'custom') {
      // Keep the current dates as the starting point; the user edits From / To next.
      set({ periodPreset: 'custom' });
      return;
    }
    set({ periodPreset: preset, ...presetRange(preset) });
  },

  setRange: (from, to) => {
    // An inverted range is nudged so From never passes To.
    const range = from > to ? { from, to: from } : { from, to };
    set({ periodPreset: 'custom', ...range });
  },

  setFilter: (key, id) => {
    const state = get();
    const ids: FilterIds = {
      groupId: state.groupId,
      territoryId: state.territoryId,
      clusterId: state.clusterId,
      siteId: state.siteId,
      [key]: id,
    };
    // Picking a lower level on its own is fine; picking a higher one prunes what no longer belongs.
    set(pruneSelection(state.filters, ids));
  },

  clearFilters: () => {
    const range = presetRange(DEFAULT_PRESET);
    set({
      periodPreset: DEFAULT_PRESET,
      ...range,
      groupId: null,
      territoryId: null,
      clusterId: null,
      siteId: null,
    });
  },

  loadFilters: async () => {
    if (get().filtersLoading) return;
    set({ filtersLoading: true, filtersError: null });
    try {
      const filters = await makeFoodCountService.getInsightsFilters();
      set({ filters, filtersLoading: false });
      // Options can shrink between sessions (access changed); drop picks that are no longer available.
      const state = get();
      set(
        pruneSelection(filters, {
          groupId: state.groupId,
          territoryId: state.territoryId,
          clusterId: state.clusterId,
          siteId: state.siteId,
        }),
      );
    } catch (error) {
      set({ filtersLoading: false, filtersError: readMfcError(error).message });
    }
  },

  loadInsights: async () => {
    const request = ++insightsRequest;
    set({ loading: true, error: null });
    try {
      const insights = await makeFoodCountService.getInsights(buildInsightsQuery(get()));
      if (request !== insightsRequest) return;
      set({ insights, loading: false });
    } catch (error) {
      if (request !== insightsRequest) return;
      set({ loading: false, error: readMfcError(error).message });
    }
  },

  loadSourceDrilldown: async (source) => {
    const request = (drilldownRequests[source] ?? 0) + 1;
    drilldownRequests[source] = request;
    const previous = get().drilldowns[source] ?? EMPTY_DRILLDOWN;
    set({ drilldowns: { ...get().drilldowns, [source]: { ...previous, loading: true, error: null } } });
    try {
      const data = await makeFoodCountService.getSourceDrilldown(source, buildInsightsQuery(get()));
      if (request !== drilldownRequests[source]) return;
      set({ drilldowns: { ...get().drilldowns, [source]: { data, loading: false, error: null } } });
    } catch (error) {
      if (request !== drilldownRequests[source]) return;
      set({
        drilldowns: {
          ...get().drilldowns,
          [source]: { ...previous, loading: false, error: readMfcError(error).message },
        },
      });
    }
  },
}));
