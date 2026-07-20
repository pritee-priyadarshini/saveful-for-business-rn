import React from 'react';

import { CharityAnalyticsScreen } from './CharityAnalyticsScreen';

/**
 * Multi-charity "View Analytics" — same Impact dashboard as the tab,
 * with site picker including All sites (aggregated).
 */
export default function CharitySiteAnalyticsScreen() {
  return <CharityAnalyticsScreen variant="stack" />;
}
