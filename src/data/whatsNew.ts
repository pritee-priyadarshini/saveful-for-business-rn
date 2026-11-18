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
    headline: 'Know your waste. Waste less.',
    benefits: [
      {
        icon: 'create-outline',
        title: 'Record it in seconds',
        body: 'Log food by where it came from: overproduction, spoilage, prep or plate scraps.',
      },
      {
        icon: 'heart-outline',
        title: 'Give it a second life',
        body: 'Overproduction goes straight into a listing for charities to collect.',
      },
      {
        icon: 'bar-chart-outline',
        title: 'See your impact',
        body: 'Food Impact shows what was recovered, and where it went.',
      },
    ],
  },
  {
    id: 'consolidated',
    name: 'Consolidated Collections',
    headline: 'Lots of outlets. One pickup.',
    benefits: [
      {
        icon: 'git-merge-outline',
        title: 'Group your outlets',
        body: 'Outlets at one venue, like a stadium or campus, share one collection point.',
      },
      {
        icon: 'storefront-outline',
        title: 'Sites list and drop off',
        body: 'Each site adds its surplus on the day and brings it to the point.',
      },
      {
        icon: 'megaphone-outline',
        title: 'One listing, one charity',
        body: 'Publish it all as one listing. Every site still gets the credit.',
      },
    ],
    note: 'Guide me walks you through every screen the first time.',
  },
];
