import React from 'react';
import { RouteProp, useRoute } from '@react-navigation/native';

import type { RootStackParamList } from '@/navigation/AppNavigator';
import { PlanConfirmView } from './PlanConfirmView';

type Route = RouteProp<RootStackParamList, 'SingleSiteConfirm'>;

const SINGLE_SITE_FLOW = ['SingleSitePlans', 'RestaurantPlan', 'SingleSiteConfirm'] as const;

export function SingleSiteConfirmScreen() {
  const route = useRoute<Route>();
  return (
    <PlanConfirmView
      planId={route.params?.planId}
      initialCycle={route.params?.cycle}
      flowRoutes={SINGLE_SITE_FLOW}
    />
  );
}
