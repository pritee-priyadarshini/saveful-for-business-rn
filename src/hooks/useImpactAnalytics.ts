import { useCallback, useEffect, useMemo, useState } from 'react';

import { ImpactPeriod, SiteImpactResponse } from '../services/impact.service';
import { useAuthStore } from '../store/authStore';
import {
  ChartMetricKey,
  EMPTY_IMPACT_STATS,
  buildChartSeries,
  fetchAggregatedSiteImpact,
  mapImpactToDisplayStats,
} from '../utils/impactData';
import { AccessibleSite, resolveAccessibleSites } from '../utils/impactSites';
import { getUserFriendlyErrorMessage } from '../utils/apiError';

type UseImpactAnalyticsOptions = {
  siteId?: number | null;
  chartPeriod?: Exclude<ImpactPeriod, 'lifetime'>;
};

export function useImpactAnalytics(options: UseImpactAnalyticsOptions = {}) {
  const { siteId = null, chartPeriod = 'week' } = options;
  const authUser = useAuthStore((state) => state.authUser);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sites, setSites] = useState<AccessibleSite[]>([]);
  const [monthImpact, setMonthImpact] = useState<SiteImpactResponse | null>(null);
  const [lifetimeImpact, setLifetimeImpact] = useState<SiteImpactResponse | null>(null);
  const [periodImpact, setPeriodImpact] = useState<SiteImpactResponse | null>(null);

  const load = useCallback(async () => {
    if (!authUser?.accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const accessibleSites =
        siteId != null ? [{ id: siteId, name: '' }] : await resolveAccessibleSites(authUser);
      setSites(accessibleSites);

      const siteIds = accessibleSites.map((site) => site.id);
      if (siteIds.length === 0) {
        setMonthImpact(null);
        setLifetimeImpact(null);
        setPeriodImpact(null);
        return;
      }

      const [month, lifetime, period] = await Promise.all([
        fetchAggregatedSiteImpact(siteIds, 'month'),
        fetchAggregatedSiteImpact(siteIds, 'lifetime'),
        fetchAggregatedSiteImpact(siteIds, chartPeriod),
      ]);

      setMonthImpact(month);
      setLifetimeImpact(lifetime);
      setPeriodImpact(period);
    } catch (err: unknown) {
      setError(getUserFriendlyErrorMessage(err, 'Failed to load impact data'));
    } finally {
      setLoading(false);
    }
  }, [authUser, siteId, chartPeriod]);

  useEffect(() => {
    void load();
  }, [load]);

  const monthStats = useMemo(
    () => mapImpactToDisplayStats(monthImpact),
    [monthImpact],
  );
  const lifetimeStats = useMemo(
    () => mapImpactToDisplayStats(lifetimeImpact),
    [lifetimeImpact],
  );

  const getChartSeries = useCallback(
    (metric: ChartMetricKey) => buildChartSeries(periodImpact, metric),
    [periodImpact],
  );

  return {
    loading,
    error,
    reload: load,
    sites,
    isMultiSite: sites.length > 1,
    monthStats,
    lifetimeStats,
    periodImpact,
    getChartSeries,
    hasData:
      monthStats.redistributedKg > 0 ||
      monthStats.collectionsCompleted > 0 ||
      lifetimeStats.redistributedKg > 0,
    emptyStats: EMPTY_IMPACT_STATS,
  };
}
