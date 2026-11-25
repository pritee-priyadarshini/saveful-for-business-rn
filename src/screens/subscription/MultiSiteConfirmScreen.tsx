import React, { useMemo } from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';

import type { RootStackParamList } from '@/navigation/AppNavigator';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { pickDefaultPlanId } from '@/utils/billingHelpers';
import { PlanConfirmView } from './PlanConfirmView';
import { useBillableSiteCount } from './useBillableSiteCount';

type Route = RouteProp<RootStackParamList, 'MultiSiteConfirm'>;

const MULTI_SITE_FLOW = ['MultiSitePlans', 'MultiSiteConfirm', 'RestaurantPlan'] as const;

/**
 * Multi-site confirm: the shared confirm view plus the per-site breakdown
 * ("A$69 × 3 sites = A$207 /month"). After activation, billingFlow turns the
 * head-office preview into a real billed site.
 */
export function MultiSiteConfirmScreen() {
  const route = useRoute<Route>();
  const plans = useSubscriptionStore((s) => s.plans);
  const siteCount = useBillableSiteCount();
  const fallbackPlanId = useMemo(
    () => pickDefaultPlanId(plans.filter((plan) => !plan.contactSalesOnly)),
    [plans],
  );

  return (
    <PlanConfirmView
      planId={route.params?.planId ?? fallbackPlanId}
      initialCycle={route.params?.cycle}
      flowRoutes={MULTI_SITE_FLOW}
      siteCount={siteCount}
    />
  );
}
