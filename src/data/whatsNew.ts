/**
 * "What's new" announcement copy. Change WHATS_NEW_RELEASE when announcing
 * something new, and the announcement opens once more for everyone.
 */
import type { Ionicons } from '@expo/vector-icons';

export const WHATS_NEW_RELEASE = '2026-11-make-food-count-consolidated';

export type WhatsNewFeatureId = 'makeFoodCount' | 'consolidated';

export type WhatsNewBenefit = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
};

export type WhatsNewFeature = {
  id: WhatsNewFeatureId;
  name: string;
  headline: string;
  benefits: WhatsNewBenefit[];
  /** Small line under the benefits. */
  note?: string;
};

export const WHATS_NEW_INTRO = {
  sticker: 'New in Saveful',
  headline: 'Two new ways to make your food count',
  body: 'Take 30 seconds to see what’s new, or skip and find it later in Profile.',
};

export const WHATS_NEW_FEATURES: WhatsNewFeature[] = [
  {
    id: 'makeFoodCount',
    name: 'Make Food Count',
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
