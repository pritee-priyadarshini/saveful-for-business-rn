import { useEffect, useMemo } from 'react';

import { useSitesStore } from '@/store/sitesStore';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { isVirtualHqSiteId } from '@/utils/defaultHqSite';

/**
 * How many sites a per-site plan bills for. Stripe's quantity is the org's real
 * site count (the head-office placeholder is not a site yet), with a minimum of
 * one, so the estimate on the plans screen matches what checkout charges.
 */
export function useBillableSiteCount(): number {
  const sites = useSitesStore((s) => s.sites);
  const fetchOrganisation = useSitesStore((s) => s.fetchOrganisation);
  const billedQuantity = useSubscriptionStore((s) => s.entitlements?.quantity ?? null);

  useEffect(() => {
    void fetchOrganisation().catch(() => undefined);
  }, [fetchOrganisation]);

  return useMemo(() => {
    const real = (sites ?? []).filter((site: { id?: unknown }) => {
      const id = Number(site?.id);
      return Number.isFinite(id) && id > 0 && !isVirtualHqSiteId(site?.id);
    }).length;
    // Sites can lag the subscription right after checkout; trust the larger.
    return Math.max(1, real, billedQuantity ?? 0);
  }, [sites, billedQuantity]);
}
