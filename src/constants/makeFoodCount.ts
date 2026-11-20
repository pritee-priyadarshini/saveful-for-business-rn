import type { ImageSourcePropType } from 'react-native';

import type { FoodSource } from '@/types/makeFoodCount';

/**
 * Make Food Count copy that does not come from the API (app SPEC §6 MFC-002 and MFC-003 to 006).
 * Food rows (labels, image keys) come from GET /mfc/taxonomy instead.
 */

export type MfcSourceMeta = {
  label: string;
  description: string;
  /** "e.g." line on the Sources tile. */
  example: string;
  /** Source tile / panel image: the client's photograph (assets/newmfc). */
  image: ImageSourcePropType;
};

export const SOURCE_META: Record<FoodSource, MfcSourceMeta> = {
  OVERPRODUCTION: {
    label: 'Overproduction',
    description: 'Prepared food that wasn’t used.',
    example: 'cooked meals, baked goods, prepared ingredients',
    image: require('../../assets/newmfc/mfc-source-overproduction.png'),
  },
  SPOILAGE: {
    label: 'Spoilage',
    description: 'Food no longer suitable to eat.',
    example: 'expired fresh produce, damaged packaging',
    image: require('../../assets/newmfc/mfc-source-spoilage.png'),
  },
  PREPARATION: {
    label: 'Preparation',
    description: 'Peels, trimmings and offcuts.',
    example: 'vegetable peelings, meat offcuts, bones, shells, coffee grounds',
    image: require('../../assets/newmfc/mfc-source-preparation.png'),
  },
  PLATE_SCRAPS: {
    label: 'Plate Scraps',
    description: 'Food left on plates after service.',
    example: 'uneaten meals, plate returns',
    image: require('../../assets/newmfc/mfc-source-plate-scraps.png'),
  },
};

/** Same map, plural name used in the milestone prompts. */
export const SOURCES_META = SOURCE_META;

/** The four steps of the stepper (C2: no "Choose destination" step). */
export const MFC_STEPS = ['Select sources', 'Add quantities', 'Review', 'Finish'] as const;

/** Index of each stepper step, so screens don't pass magic numbers. */
export const MFC_STEP_INDEX = {
  sources: 0,
  quantities: 1,
  review: 2,
  list: 3,
} as const;

/** Light lilac used for the "section sits on a lilac panel" look (app SPEC §5). */
export const MFC_LILAC = {
  background: '#F4EEFB',
  border: '#E1D3F3',
} as const;

export const MFC_OVERPRODUCTION_SUBTITLE =
  'Record prepared food that wasn\'t used. You can choose what to make available through Saveful Connect later.';

export const MFC_OVERPRODUCTION_NOTICE =
  'These are recorded quantities, not a declaration that the food is safe to donate. You can adjust the quantities when preparing the people listing; food safety is checked before publication.';

export const MFC_OFFLINE_NOTICE = 'Saved on this phone, will sync';

// ─── Food Impact (MFC-010) ───────────────────────────────────────────────────

/** Soft green for "recovered" and lilac for "not recovered" (never "landfill"; the app does not know where it went). */
export const MFC_IMPACT_COLORS = {
  recovered: '#2E9E5B',
  recoveredBg: '#EFFAF2',
  recoveredBorder: '#D3EEDC',
  notRecovered: '#B79BDB',
  notRecoveredBg: MFC_LILAC.background,
  notRecoveredBorder: MFC_LILAC.border,
} as const;

export type MfcPathwayMeta = { key: string; label: string; color: string };

/** The four redistribution destinations, in display order. */
export const MFC_DESTINATIONS: MfcPathwayMeta[] = [
  { key: 'FOOD_FOR_PEOPLE', label: 'Charity donations', color: '#3A7E52' },
  { key: 'LIVESTOCK_FEED', label: 'Animal feed', color: '#F99C46' },
  { key: 'CIRCULAR_RECOVERY', label: 'Compost / organics', color: '#8A6A3B' },
  { key: 'BIOENERGY', label: 'Bioenergy', color: '#007EFF' },
];

/** Other spellings the API may use for the same destination. */
export const MFC_PATHWAY_ALIASES: Record<string, string> = {
  CHARITY: 'FOOD_FOR_PEOPLE',
  CHARITY_DONATION: 'FOOD_FOR_PEOPLE',
  CHARITY_DONATIONS: 'FOOD_FOR_PEOPLE',
  PEOPLE: 'FOOD_FOR_PEOPLE',
  ANIMAL_FEED: 'LIVESTOCK_FEED',
  LIVESTOCK: 'LIVESTOCK_FEED',
  COMPOST: 'CIRCULAR_RECOVERY',
  ORGANICS: 'CIRCULAR_RECOVERY',
  COMPOST_ORGANICS: 'CIRCULAR_RECOVERY',
};

/** "What happened to the food?" not-recovered buckets, in display order (SPEC §6). */
export const MFC_NOT_RECOVERED_BUCKETS = [
  { key: 'notListed', label: 'Not listed' },
  { key: 'listedNotClaimed', label: 'Listed, not claimed' },
  { key: 'expired', label: 'Expired' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'claimedNotCollected', label: 'Claimed, not collected' },
] as const;

// ─── Deck colours (sampled from the client's mobile mock-ups, deck "Make Food Count 2610") ──

export const MFC = {
  purple: '#4B2076',
  /** Body text: a near-black purple, not pure black. */
  ink: '#26123F',
  muted: '#70677D',
  /** Table header labels on the summary. */
  label: '#5D4D70',
  /** Page background: Saveful cream (palette.creme). Cards stay true white on it. */
  page: '#FEFFED',
  /** True white for cards and inputs (the app's palette.white is a cream). */
  white: '#FFFFFF',
  /** Lilac panels (food table, "What would you like to do next?"). */
  panel: '#FBF9FD',
  panelBorder: '#E7DFEF',
  tableHead: '#F7F2FA',
  divider: '#ECE6F0',
  inputBorder: '#D9CFE4',
  /** Total rows and the current source chip. */
  lilac: '#F5EFFA',
  notice: '#F3EAFC',
  backPill: '#EFE6F9',
  disabled: '#B3A5C4',
  chipBorder: '#E5DCED',
  doneBg: '#EDF8F1',
  doneBorder: '#6BBA8E',
  greenBg: '#EFFAF3',
  greenBorder: '#ADDABB',
  greenText: '#147343',
  orangeBg: '#FFF7ED',
  orangeBorder: '#F4D9BD',
  orangeText: '#B65C1A',
  recoveredBg: '#EFFAF2',
  notRecoveredBg: '#F6F0FC',
  recovered: '#2E9E5B',
  notRecovered: '#B79BDB',
} as const;

/** Source tile tints from the mobile "select" mock-up. */
export const MFC_SOURCE_TINT: Record<FoodSource, { bg: string; border: string }> = {
  OVERPRODUCTION: { bg: '#F0FBF3', border: '#D5EEDD' },
  SPOILAGE: { bg: '#FDF3F2', border: '#F4D9D5' },
  PREPARATION: { bg: '#F4F0FE', border: '#E1D8F6' },
  PLATE_SCRAPS: { bg: '#FFF6EF', border: '#F5E1CE' },
};
