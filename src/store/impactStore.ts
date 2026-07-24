import { create } from 'zustand';

import { ImpactPeriod, SiteImpactResponse } from '../services/impact.service';
import {
  fetchAggregatedSiteImpact,
  fetchAggregatedSiteImpactByRange,
} from '../utils/impactData';
import { AccessibleSite, resolveAccessibleSites } from '../utils/impactSites';
import { getUserFriendlyErrorMessage } from '../utils/apiError';
import { useAuthStore } from './authStore';

/** Chart time chips — week / month / year only. */
export type ChartPeriod = Exclude<ImpactPeriod, 'lifetime' | 'range'>;

export type ImpactFilterMode = 'all_time' | 'custom';

export type ImpactFilter = {
  mode: ImpactFilterMode;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
};

const STALE_TIME_MS = 10 * 60 * 1000;

function isStale(lastFetched: number | null | undefined): boolean {
  return !lastFetched || Date.now() - lastFetched > STALE_TIME_MS;
}

function scopeKeyFor(siteId: number | null): string {
  return siteId != null ? `site:${siteId}` : 'org';
}

export function filterCacheKey(filter: ImpactFilter): string {
  if (filter.mode === 'all_time') return 'all_time';
  return `custom:${filter.startDate ?? ''}:${filter.endDate ?? ''}`;
}

type ScopeCache = {
  sites: AccessibleSite[];
  statsByFilter: Record<string, SiteImpactResponse | null>;
  statsFetchedAt: Record<string, number>;
  chartByPeriod: Partial<Record<ChartPeriod, SiteImpactResponse | null>>;
  chartFetchedAt: Partial<Record<ChartPeriod, number>>;
};

interface ImpactAnalyticsState {
  scopeKey: string | null;
  cache: ScopeCache | null;
  /** Org-wide site list for the selector (not tied to selected scope). */
  availableSites: AccessibleSite[];
  sitesLoading: boolean;
  isStatsLoading: boolean;
  isChartLoading: boolean;
  error: string | null;
  ensureAvailableSites: (force?: boolean) => Promise<AccessibleSite[]>;
  ensureStats: (
    filter: ImpactFilter,
    siteId?: number | null,
    force?: boolean,
  ) => Promise<void>;
  ensureChart: (
    period: ChartPeriod,
    siteId?: number | null,
    force?: boolean,
  ) => Promise<void>;
  reload: (
    filter: ImpactFilter,
    period: ChartPeriod,
    siteId?: number | null,
  ) => Promise<void>;
  reset: () => void;
}

const EMPTY_CACHE = (): ScopeCache => ({
  sites: [],
  statsByFilter: {},
  statsFetchedAt: {},
  chartByPeriod: {},
  chartFetchedAt: {},
});

const INITIAL: Pick<
  ImpactAnalyticsState,
  | 'scopeKey'
  | 'cache'
  | 'availableSites'
  | 'sitesLoading'
  | 'isStatsLoading'
  | 'isChartLoading'
  | 'error'
> = {
  scopeKey: null,
  cache: null,
  availableSites: [],
  sitesLoading: false,
  isStatsLoading: false,
  isChartLoading: false,
  error: null,
};

async function resolveSiteIds(
  siteId: number | null,
  authUser: NonNullable<ReturnType<typeof useAuthStore.getState>['authUser']>,
  availableSites: AccessibleSite[],
): Promise<{ sites: AccessibleSite[]; siteIds: number[] }> {
  if (siteId != null) {
    const known = availableSites.find((site) => site.id === siteId);
    const sites = [{ id: siteId, name: known?.name ?? '' }];
    return { sites, siteIds: [siteId] };
  }

  const sites =
    availableSites.length > 0
      ? availableSites
      : await resolveAccessibleSites(authUser);
  return { sites, siteIds: sites.map((site) => site.id) };
}

async function ensureSites(
  get: () => ImpactAnalyticsState,
  set: (
    partial:
      | Partial<ImpactAnalyticsState>
      | ((state: ImpactAnalyticsState) => Partial<ImpactAnalyticsState>),
  ) => void,
  siteId: number | null,
  forceResolve: boolean,
): Promise<{ sites: AccessibleSite[]; siteIds: number[] } | null> {
  const { authUser } = useAuthStore.getState();
  if (!authUser?.accessToken) {
    set({
      cache: null,
      scopeKey: null,
      isStatsLoading: false,
      isChartLoading: false,
    });
    return null;
  }

  let availableSites = get().availableSites;
  if (availableSites.length === 0) {
    availableSites = await get().ensureAvailableSites();
  }

  const nextScope = scopeKeyFor(siteId);
  const { scopeKey, cache } = get();
  const scoped = scopeKey === nextScope ? cache : null;

  if (!forceResolve && scoped && scoped.sites.length > 0) {
    if (scopeKey !== nextScope) {
      set({ scopeKey: nextScope, cache: scoped });
    }
    // For "all sites", prefer the org-wide list with proper names.
    if (siteId == null && availableSites.length > 0) {
      return {
        sites: availableSites,
        siteIds: availableSites.map((site) => site.id),
      };
    }
    return {
      sites: scoped.sites,
      siteIds: scoped.sites.map((site) => site.id),
    };
  }

  const resolved = await resolveSiteIds(siteId, authUser, availableSites);
  const prev = get().scopeKey === nextScope ? get().cache : null;
  set({
    scopeKey: nextScope,
    cache: {
      ...(prev ?? EMPTY_CACHE()),
      sites: resolved.sites,
    },
  });
  return resolved;
}

export const useImpactStore = create<ImpactAnalyticsState>((set, get) => ({
  ...INITIAL,

  ensureAvailableSites: async (force = false) => {
    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) {
      set({ availableSites: [], sitesLoading: false });
      return [];
    }

    const existing = get().availableSites;
    if (!force && existing.length > 0) return existing;

    set({ sitesLoading: true });
    try {
      const sites = await resolveAccessibleSites(authUser);
      set({ availableSites: sites, sitesLoading: false });
      return sites;
    } catch {
      set({ sitesLoading: false });
      return get().availableSites;
    }
  },

  ensureStats: async (filter, siteId = null, force = false) => {
    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) {
      set({ isStatsLoading: false, cache: null, scopeKey: null });
      return;
    }

    if (filter.mode === 'custom' && (!filter.startDate || !filter.endDate)) {
      return;
    }

    const nextScope = scopeKeyFor(siteId);
    const key = filterCacheKey(filter);
    const { scopeKey, cache } = get();
    const scoped = scopeKey === nextScope ? cache : null;

    if (
      !force &&
      scoped &&
      scoped.statsByFilter[key] !== undefined &&
      !isStale(scoped.statsFetchedAt[key])
    ) {
      if (scopeKey !== nextScope) {
        set({ scopeKey: nextScope, cache: scoped });
      }
      return;
    }

    const hadStats = !!scoped && Object.keys(scoped.statsByFilter).length > 0;
    set({
      scopeKey: nextScope,
      isStatsLoading: !hadStats,
      error: null,
    });

    try {
      const resolved = await ensureSites(get, set, siteId, scopeKey !== nextScope);
      if (!resolved) return;

      const { sites, siteIds } = resolved;
      if (siteIds.length === 0) {
        const prev = get().scopeKey === nextScope ? get().cache : null;
        set({
          cache: {
            ...(prev ?? EMPTY_CACHE()),
            sites,
            statsByFilter: {
              ...(prev?.statsByFilter ?? {}),
              [key]: null,
            },
            statsFetchedAt: {
              ...(prev?.statsFetchedAt ?? {}),
              [key]: Date.now(),
            },
          },
          isStatsLoading: false,
        });
        return;
      }

      const orgId =
        authUser?.profile?.organisation?.id ??
        authUser?.profile?.organization?.id ??
        authUser?.orgId ??
        null;
      const orgType = String(
        authUser?.orgType ??
          authUser?.profile?.organisation?.organizationType ??
          authUser?.profile?.organization?.organizationType ??
          '',
      ).toUpperCase();
      // All sites → org endpoint for charity/farmer receivers and multi-site donors.
      const preferOrgScope =
        orgType.startsWith('CHARITY') ||
        orgType === 'FARMER_CONSUMER' ||
        orgType === 'BUSINESS_MULTI' ||
        orgType === 'FARMER_PRODUCER';

      const impact =
        filter.mode === 'all_time'
          ? await fetchAggregatedSiteImpact(siteIds, 'lifetime', {
              orgId: orgId != null ? Number(orgId) : null,
              preferOrgScope,
            })
          : await fetchAggregatedSiteImpactByRange(siteIds, {
              startDate: filter.startDate!,
              endDate: filter.endDate!,
            }, {
              orgId: orgId != null ? Number(orgId) : null,
              preferOrgScope,
            });

      const prev = get().scopeKey === nextScope ? get().cache : null;
      set({
        cache: {
          ...(prev ?? EMPTY_CACHE()),
          sites,
          statsByFilter: {
            ...(prev?.statsByFilter ?? {}),
            [key]: impact,
          },
          statsFetchedAt: {
            ...(prev?.statsFetchedAt ?? {}),
            [key]: Date.now(),
          },
        },
        isStatsLoading: false,
      });
    } catch (error: unknown) {
      set({
        error: getUserFriendlyErrorMessage(error, 'Failed to load impact data'),
        isStatsLoading: false,
      });
    }
  },

  ensureChart: async (period, siteId = null, force = false) => {
    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) return;

    const nextScope = scopeKeyFor(siteId);
    let { scopeKey, cache } = get();

    if (scopeKey !== nextScope || !cache || cache.sites.length === 0) {
      await ensureSites(get, set, siteId, true);
      scopeKey = get().scopeKey;
      cache = get().cache;
    }

    if (!cache) return;

    const cachedPeriod = cache.chartByPeriod[period];
    const periodFetchedAt = cache.chartFetchedAt[period] ?? null;
    if (!force && cachedPeriod !== undefined && !isStale(periodFetchedAt)) {
      return;
    }

    const siteIds = cache.sites.map((site) => site.id);
    if (siteIds.length === 0) {
      set({
        cache: {
          ...cache,
          chartByPeriod: { ...cache.chartByPeriod, [period]: null },
          chartFetchedAt: { ...cache.chartFetchedAt, [period]: Date.now() },
        },
      });
      return;
    }

    set({ isChartLoading: cachedPeriod === undefined, error: null });

    try {
      const authUser = useAuthStore.getState().authUser;
      const orgId =
        authUser?.profile?.organisation?.id ??
        authUser?.profile?.organization?.id ??
        authUser?.orgId ??
        null;
      const orgType = String(
        authUser?.orgType ??
          authUser?.profile?.organisation?.organizationType ??
          authUser?.profile?.organization?.organizationType ??
          '',
      ).toUpperCase();
      const preferOrgScope =
        orgType.startsWith('CHARITY') ||
        orgType === 'FARMER_CONSUMER' ||
        orgType === 'BUSINESS_MULTI' ||
        orgType === 'FARMER_PRODUCER';

      const periodImpact = await fetchAggregatedSiteImpact(siteIds, period, {
        orgId: orgId != null ? Number(orgId) : null,
        preferOrgScope,
      });
      const current = get().cache;
      if (!current || get().scopeKey !== nextScope) return;

      set({
        cache: {
          ...current,
          chartByPeriod: { ...current.chartByPeriod, [period]: periodImpact },
          chartFetchedAt: { ...current.chartFetchedAt, [period]: Date.now() },
        },
        isChartLoading: false,
      });
    } catch (error: unknown) {
      set({
        error: getUserFriendlyErrorMessage(error, 'Failed to load chart data'),
        isChartLoading: false,
      });
    }
  },

  reload: async (filter, period, siteId = null) => {
    await Promise.all([
      get().ensureStats(filter, siteId, true),
      get().ensureChart(period, siteId, true),
    ]);
  },

  reset: () => set({ ...INITIAL }),
}));
