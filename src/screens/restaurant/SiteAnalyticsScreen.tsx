import React from 'react';

import { RestaurantAnalyticsScreen } from './RestaurantAnalyticsScreen';

/**
 * Multi-site "View Analytics" — same impact UI as Insights (stats, chart,
 * food savings) with site picker including All sites (aggregated).
 */
export default function SiteAnalyticsScreen() {
  return <RestaurantAnalyticsScreen variant="stack" />;
}
