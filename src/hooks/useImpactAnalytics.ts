import { useCallback, useEffect, useMemo, useRef } from 'react';

import { ImpactPeriod, SiteImpactResponse } from '../services/impact.service';
import { useAuthStore } from '../store/authStore';
import { ChartPeriod, useImpactStore } from '../store/impactStore';
import {
  ChartMetricKey,
  EMPTY_IMPACT_STATS,
  buildChartSeries,
  mapImpactToDisplayStats,
} from '../utils/impactData';

type UseImpactAnalyticsOptions = {
  siteId?: number | null;
  chartPeriod?: ChartPeriod;
};

export function useImpactAnalytics(options: UseImpactAnalyticsOptions = {}) {
  const { siteId = null, chartPeriod = 'week' } = options;
  const authUser = useAuthStore((state) => state.authUser);

  const expectedScope = siteId != null ? `site:${siteId}` : 'org';
  const scopeKey = useImpactStore((state) => state.scopeKey);
  const cache = useImpactStore((state) =>
    state.scopeKey === expectedScope ? state.cache : null,
  );
  const isInitialLoading = useImpactStore((state) => state.isInitialLoading);
  const isChartLoading = useImpactStore((state) => state.isChartLoading);
  const error = useImpactStore((state) => state.error);
  const ensureBase = useImpactStore((state) => state.ensureBase);
  const ensureChart = useImpactStore((state) => state.ensureChart);
  const reloadStore = useImpactStore((state) => state.reload);

  useEffect(() => {
    if (!authUser?.accessToken) return;
    void ensureBase(siteId);
  }, [authUser?.accessToken, siteId, ensureBase]);

  useEffect(() => {
    if (!authUser?.accessToken) return;
    void ensureChart(chartPeriod, siteId);
  }, [authUser?.accessToken, siteId, chartPeriod, ensureChart]);

  const monthStats = useMemo(
    () => mapImpactToDisplayStats(cache?.monthImpact ?? null),
    [cache?.monthImpact],
  );
  const lifetimeStats = useMemo(
    () => mapImpactToDisplayStats(cache?.lifetimeImpact ?? null),
    [cache?.lifetimeImpact],
  );

  const periodImpact = cache?.chartByPeriod[chartPeriod] ?? null;
  const lastPeriodImpactRef = useRef<SiteImpactResponse | null>(null);
  if (periodImpact) {
    lastPeriodImpactRef.current = periodImpact;
  }

  // Keep the last chart visible while a new period is fetching for the first time.
  const displayPeriodImpact =
    periodImpact ?? (isChartLoading ? lastPeriodImpactRef.current : null);

  const getChartSeries = useCallback(
    (metric: ChartMetricKey) => buildChartSeries(displayPeriodImpact, metric),
    [displayPeriodImpact],
  );

  const reload = useCallback(
    (period?: Exclude<ImpactPeriod, 'lifetime'>) => reloadStore(siteId, period ?? chartPeriod),
    [reloadStore, siteId, chartPeriod],
  );

  // Full-page loader only before we have any base stats for this scope.
  const loading =
    (!!authUser?.accessToken && isInitialLoading && !cache?.baseFetchedAt) ||
    (!!authUser?.accessToken && scopeKey !== expectedScope && !cache?.baseFetchedAt);

  return {
    loading,
    chartLoading: isChartLoading,
    error,
    reload,
    sites: cache?.sites ?? [],
    isMultiSite: (cache?.sites?.length ?? 0) > 1,
    monthStats,
    lifetimeStats,
    periodImpact: displayPeriodImpact,
    getChartSeries,
    hasData:
      monthStats.redistributedKg > 0 ||
      monthStats.collectionsCompleted > 0 ||
      lifetimeStats.redistributedKg > 0,
    emptyStats: EMPTY_IMPACT_STATS,
  };
}
