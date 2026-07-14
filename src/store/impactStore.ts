import { create } from 'zustand';

import { ImpactPeriod, SiteImpactResponse } from '../services/impact.service';
import { fetchAggregatedSiteImpact } from '../utils/impactData';
import { AccessibleSite, resolveAccessibleSites } from '../utils/impactSites';
import { getUserFriendlyErrorMessage } from '../utils/apiError';
import { useAuthStore } from './authStore';

export type ChartPeriod = Exclude<ImpactPeriod, 'lifetime'>;

const STALE_TIME_MS = 10 * 60 * 1000;

function isStale(lastFetched: number | null | undefined): boolean {
  return !lastFetched || Date.now() - lastFetched > STALE_TIME_MS;
}

function scopeKeyFor(siteId: number | null): string {
  return siteId != null ? `site:${siteId}` : 'org';
}

type ScopeCache = {
  sites: AccessibleSite[];
  monthImpact: SiteImpactResponse | null;
  lifetimeImpact: SiteImpactResponse | null;
  chartByPeriod: Partial<Record<ChartPeriod, SiteImpactResponse | null>>;
  baseFetchedAt: number | null;
  chartFetchedAt: Partial<Record<ChartPeriod, number>>;
};

interface ImpactAnalyticsState {
  scopeKey: string | null;
  cache: ScopeCache | null;
  isInitialLoading: boolean;
  isChartLoading: boolean;
  error: string | null;
  ensureBase: (siteId?: number | null, force?: boolean) => Promise<void>;
  ensureChart: (period: ChartPeriod, siteId?: number | null, force?: boolean) => Promise<void>;
  reload: (siteId?: number | null, period?: ChartPeriod) => Promise<void>;
  reset: () => void;
}

const EMPTY_CACHE = (): ScopeCache => ({
  sites: [],
  monthImpact: null,
  lifetimeImpact: null,
  chartByPeriod: {},
  baseFetchedAt: null,
  chartFetchedAt: {},
});

const INITIAL: Pick<
  ImpactAnalyticsState,
  'scopeKey' | 'cache' | 'isInitialLoading' | 'isChartLoading' | 'error'
> = {
  scopeKey: null,
  cache: null,
  isInitialLoading: false,
  isChartLoading: false,
  error: null,
};

async function resolveSiteIds(
  siteId: number | null,
  authUser: NonNullable<ReturnType<typeof useAuthStore.getState>['authUser']>,
): Promise<{ sites: AccessibleSite[]; siteIds: number[] }> {
  if (siteId != null) {
    const sites = [{ id: siteId, name: '' }];
    return { sites, siteIds: [siteId] };
  }
  const sites = await resolveAccessibleSites(authUser);
  return { sites, siteIds: sites.map((site) => site.id) };
}

export const useImpactStore = create<ImpactAnalyticsState>((set, get) => ({
  ...INITIAL,

  ensureBase: async (siteId = null, force = false) => {
    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) {
      set({ isInitialLoading: false, cache: null, scopeKey: null });
      return;
    }

    const nextScope = scopeKeyFor(siteId);
    const { scopeKey, cache } = get();
    const scoped = scopeKey === nextScope ? cache : null;
    const hasBase = !!scoped?.baseFetchedAt;

    if (!force && scoped && !isStale(scoped.baseFetchedAt)) {
      if (scopeKey !== nextScope) {
        set({ scopeKey: nextScope, cache: scoped });
      }
      return;
    }

    // Only block the whole page on the first load for this scope.
    set({
      scopeKey: nextScope,
      isInitialLoading: !hasBase,
      error: null,
    });

    try {
      const { sites, siteIds } = await resolveSiteIds(siteId, authUser);
      if (siteIds.length === 0) {
        set({
          cache: {
            ...EMPTY_CACHE(),
            sites,
            baseFetchedAt: Date.now(),
          },
          isInitialLoading: false,
        });
        return;
      }

      const [monthImpact, lifetimeImpact] = await Promise.all([
        fetchAggregatedSiteImpact(siteIds, 'month'),
        fetchAggregatedSiteImpact(siteIds, 'lifetime'),
      ]);

      const prev = get().scopeKey === nextScope ? get().cache : null;
      set({
        cache: {
          sites,
          monthImpact,
          lifetimeImpact,
          chartByPeriod: prev?.chartByPeriod ?? {},
          baseFetchedAt: Date.now(),
          chartFetchedAt: prev?.chartFetchedAt ?? {},
        },
        isInitialLoading: false,
      });
    } catch (error: unknown) {
      set({
        error: getUserFriendlyErrorMessage(error, 'Failed to load impact data'),
        isInitialLoading: false,
      });
    }
  },

  ensureChart: async (period, siteId = null, force = false) => {
    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) return;

    const nextScope = scopeKeyFor(siteId);
    let { scopeKey, cache } = get();

    // Base data must exist first (or share sites from a parallel ensureBase).
    if (scopeKey !== nextScope || !cache?.baseFetchedAt) {
      await get().ensureBase(siteId, force);
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

    // Keep showing the previous chart while the next period loads.
    set({ isChartLoading: cachedPeriod === undefined, error: null });

    try {
      const periodImpact = await fetchAggregatedSiteImpact(siteIds, period);
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

  reload: async (siteId = null, period = 'month') => {
    await get().ensureBase(siteId, true);
    await get().ensureChart(period, siteId, true);
  },

  reset: () => set({ ...INITIAL }),
}));
