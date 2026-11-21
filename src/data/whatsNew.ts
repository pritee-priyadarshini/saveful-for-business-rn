/**
 * "What's new" announcement copy. Change WHATS_NEW_RELEASE when announcing
 * something new, and the announcement opens once more for everyone.
 */
import type { Ionicons } from '@expo/vector-icons';

import { MFC_ENABLED } from '@/config/features';

/**
 * Until Make Food Count launches, the announcement is about Consolidated
 * Collections only. Launching it changes this id, so everyone sees it again.
 */
export const WHATS_NEW_RELEASE = MFC_ENABLED ? '2026-11-make-food-count-consolidated' : '2026-11-consolidated';

export type WhatsNewFeatureId = 'makeFoodCount' | 'consolidated';

export type WhatsNewBenefit = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

export type WhatsNewFeature = {
  id: WhatsNewFeatureId;
  name: string;
  /** Two short lines on the intro card. */
  teaser: [string, string];
  headline: string;
  benefits: WhatsNewBenefit[];
  /** Small line under the benefits. */
  note?: string;
};

export const WHATS_NEW_INTRO = {
  sticker: 'New in Saveful',
  headline: MFC_ENABLED ? 'Two new ways to make your food count' : 'One collection for all your sites',
  subhead: 'More savings. Less admin. Greater impact.',
};

const ALL_FEATURES: WhatsNewFeature[] = [
  {
    id: 'makeFoodCount',
    name: 'Make Food Count',
    teaser: ['Track food loss.', 'Find more savings.'],
    headline: 'Know your food loss. find more savings.',
    benefits: [
      {
        icon: 'create-outline',
        title: 'Track food loss in seconds',
        body: 'Record what how much and why - from preparation to plate scraps.',
      },
      {
        icon: 'heart-outline',
        title: 'Turn Surplus into Opportunity',
        body: 'Redirect suitable surplus food to charities through Saveful Connect.',
      },
      {
        icon: 'bar-chart-outline',
        title: 'Identify more savings',
        body: 'See where food is being lost and uncover opportunities to reduce costs.',
      },
    ],
  },
  {
    id: 'consolidated',
    name: 'Consolidated Collections',
    teaser: ['Simplify collections.', 'Save time.'],
    headline: 'MORE SITES. LESS ADMIN. GREATER IMPACT.',
    benefits: [
      {
        icon: 'git-merge-outline',
        title: 'Bring your sites together',
        body: 'Connect multiple kitchens or outlets to one central collection point.',
      },
      {
        icon: 'storefront-outline',
        title: 'Simplify Collections',
        body: 'Each site lists its surplus. One collection brings it all together.',
      },
      {
        icon: 'megaphone-outline',
        title: 'Track every site\'s Impact',
        body: 'See individual site contributions and your combined results.',
      },
    ],
    note: 'Guide me walks you through every screen the first time.',
  },
];

export const WHATS_NEW_FEATURES: WhatsNewFeature[] = ALL_FEATURES.filter(
  (feature) => MFC_ENABLED || feature.id !== 'makeFoodCount',
);
