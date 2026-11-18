import type { Ionicons } from '@expo/vector-icons';

export type GuideIcon = keyof typeof Ionicons.glyphMap;

/** GuideTarget id of the compass button in each header. */
export const COMPASS_TARGET = 'guide.compass';

/**
 * Where a step sits in the whole journey, drawn as the five-stop track:
 * 0 Set up · 1 Schedule · 2 List food · 3 Publish · 4 Collect.
 * 'all' draws the full journey with no stop singled out.
 */
export type JourneyStage = 0 | 1 | 2 | 3 | 4 | 'all';

export type GuideStep = {
  /** A GuideTarget id on the screen. Left out: the card sits centred, nothing highlighted. */
  target?: string;
  title: string;
  body: string;
  /** A short practical hint, shown under the body. */
  tip?: string;
  journey?: JourneyStage;
};

export type GuideTour = {
  id: string;
  /** Shown above each card, e.g. "Scheduling". */
  title: string;
  steps: GuideStep[];
};
