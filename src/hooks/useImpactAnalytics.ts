import { useCallback, useEffect, useMemo, useRef } from 'react';

import { SiteImpactResponse } from '../services/impact.service';
import { useAuthStore } from '../store/authStore';
import {
  ChartPeriod,
  ImpactFilter,
  filterCacheKey,
  useImpactStore,
} from '../store/impactStore';
import {
  ChartMetricKey,
  EMPTY_IMPACT_STATS,
  buildChartSeries,
  mapImpactToDisplayStats,
} from '../utils/impactData';
import { formatDisplayDate } from '../components/ImpactDateFilter';

type UseImpactAnalyticsOptions = {
  /** null = all accessible sites (aggregated). */
  siteId?: number | null;
  filter?: ImpactFilter;
  chartPeriod?: ChartPeriod;
};

export function useImpactAnalytics(options: UseImpactAnalyticsOptions = {}) {
  const {
    siteId = null,
    filter = { mode: 'all_time' as const },
    chartPeriod = 'week',
  } = options;
  const authUser = useAuthStore((state) => state.authUser);

  const expectedScope = siteId != null ? `site:${siteId}` : 'org';
  const scopeKey = useImpactStore((state) => state.scopeKey);
  const cache = useImpactStore((state) =>
    state.scopeKey === expectedScope ? state.cache : null,
  );
  const availableSites = useImpactStore((state) => state.availableSites);
  const sitesLoading = useImpactStore((state) => state.sitesLoading);
  const isStatsLoading = useImpactStore((state) => state.isStatsLoading);
  const isChartLoading = useImpactStore((state) => state.isChartLoading);
  const error = useImpactStore((state) => state.error);
  const ensureAvailableSites = useImpactStore((state) => state.ensureAvailableSites);
  const ensureStats = useImpactStore((state) => state.ensureStats);
  const ensureChart = useImpactStore((state) => state.ensureChart);
  const reloadStore = useImpactStore((state) => state.reload);

  const filterKey = filterCacheKey(filter);
  const canFetchStats =
    filter.mode === 'all_time' ||
    (Boolean(filter.startDate) && Boolean(filter.endDate));

  useEffect(() => {
    if (!authUser?.accessToken) return;
    void ensureAvailableSites();
  }, [authUser?.accessToken, ensureAvailableSites]);

  useEffect(() => {
    if (!authUser?.accessToken || !canFetchStats) return;
    void ensureStats(filter, siteId);
  }, [
    authUser?.accessToken,
    siteId,
    filter.mode,
    filter.startDate,
    filter.endDate,
    canFetchStats,
    ensureStats,
  ]);

  useEffect(() => {
    if (!authUser?.accessToken) return;
    void ensureChart(chartPeriod, siteId);
  }, [authUser?.accessToken, siteId, chartPeriod, ensureChart]);

  const statsImpact = cache?.statsByFilter[filterKey] ?? null;
  const lastStatsRef = useRef<SiteImpactResponse | null>(null);
  if (statsImpact) {
    lastStatsRef.current = statsImpact;
  }
  const displayStatsImpact =
    statsImpact ?? (isStatsLoading ? lastStatsRef.current : null);

  const stats = useMemo(
    () => mapImpactToDisplayStats(displayStatsImpact),
    [displayStatsImpact],
  );

  const periodImpact = cache?.chartByPeriod[chartPeriod] ?? null;
  const lastPeriodImpactRef = useRef<SiteImpactResponse | null>(null);
  if (periodImpact) {
    lastPeriodImpactRef.current = periodImpact;
  }
  const displayPeriodImpact =
    periodImpact ?? (isChartLoading ? lastPeriodImpactRef.current : null);

  const getChartSeries = useCallback(
    (metric: ChartMetricKey) =>
      buildChartSeries(displayPeriodImpact, metric, chartPeriod),
    [displayPeriodImpact, chartPeriod],
  );

  const reload = useCallback(async () => {
    await ensureAvailableSites(true);
    await reloadStore(filter, chartPeriod, siteId);
  }, [ensureAvailableSites, reloadStore, filter, chartPeriod, siteId]);

  const loading =
    !!authUser?.accessToken &&
    isStatsLoading &&
    !displayStatsImpact &&
    (scopeKey !== expectedScope || !cache?.statsByFilter[filterKey]);

  const selectedSiteLabel =
    siteId == null
      ? availableSites.length > 1
        ? 'All sites'
        : availableSites[0]?.name ?? null
      : availableSites.find((site) => site.id === siteId)?.name ?? `Site ${siteId}`;

  return {
    loading,
    chartLoading: isChartLoading,
    sitesLoading,
    error,
    reload,
    sites: availableSites,
    isMultiSite: availableSites.length > 1,
    selectedSiteLabel,
    stats,
    /** @deprecated use stats */
    monthStats: stats,
    /** @deprecated use stats */
    lifetimeStats: stats,
    periodImpact: displayPeriodImpact,
    getChartSeries,
    hasData: stats.redistributedKg > 0 || stats.collectionsCompleted > 0,
    emptyStats: EMPTY_IMPACT_STATS,
    filterLabel:
      filter.mode === 'all_time'
        ? 'All time'
        : `${formatDisplayDate(filter.startDate)} → ${formatDisplayDate(filter.endDate)}`,
  };
}
