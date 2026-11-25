import type { AvailablePlan, PlanModule } from '@/services/subscriptions.service';
import { palette } from '@/theme/colors';

export type BillingCycle = 'monthly' | 'annual';

export const SINGLE_SITE_SCREEN_TITLE = 'Your Plan - Single Site';
export const ANNUAL_PILL = '2 MONTHS FREE';
export const COMPLETE_LIST_HEADING = 'Everything in both modules, plus:';

/** Card colours from the plans design: purple MFC, green Connect, orange Complete. */
export type ModuleTheme = {
  /** Titles, prices, ticks, buttons. */
  color: string;
  /** Card background. */
  tint: string;
  /** Card border. */
  border: string;
  /** Text on a `color` background. */
  onColor: string;
};

export const MODULE_THEME: Record<PlanModule, ModuleTheme> = {
  MFC: {
    color: palette.eggplant,
    tint: `${palette.eggplant}12`,
    border: `${palette.eggplant}33`,
    onColor: palette.white,
  },
  CONNECT: {
    color: palette.kale,
    tint: `${palette.kale}12`,
    border: `${palette.kale}33`,
    onColor: palette.white,
  },
  COMPLETE: {
    color: palette.chilli,
    tint: `${palette.chilli}12`,
    border: `${palette.chilli}40`,
    onColor: palette.white,
  },
};

type ModuleCopy = {
  tagline: string;
  description: string;
  closingLine: string;
  /** Ticks after the site and users lines. */
  features: string[];
  /** Multi-site plans list these first (from the multi-site brief). */
  multiFeatures: string[];
};

/**
 * Verbatim from the plans design. The backend sends the same copy on each plan;
 * this is only used when a field is missing (an older backend).
 */
export const MODULE_FALLBACK_COPY: Record<PlanModule, ModuleCopy> = {
  MFC: {
    tagline: 'Understand your food. Discover more savings.',
    description:
      'Easily record food loss across your kitchen operations, identify opportunities to improve and track your food savings over time.',
    closingLine: 'Turn everyday food insights into smarter decisions and greater savings.',
    features: [
      'Simple food-loss tracking — no special equipment required',
      'Record overproduction, spoilage, preparation and plate scraps',
      'Track food types, quantities and sources',
      'See what happened to your food',
      'Identify trends and opportunities to save',
      'Track improvements over time',
      'Detailed dashboards & downloadable reports',
    ],
    multiFeatures: [
      'Centralised site management',
      'Individual and consolidated reporting',
      'Compare food-loss performance across sites',
      'Identify savings opportunities across locations',
    ],
  },
  CONNECT: {
    tagline: 'Make more of your surplus food.',
    description:
      'Connect with local charities and recovery partners, coordinate collections and see the difference your surplus food makes.',
    closingLine: "Make more of your surplus food and see the difference you're making.",
    features: [
      'List and manage surplus food',
      'Connect with charities and recovery partners',
      'Collection notifications and tracking',
      'Digital collection and handover records',
      'Reporting on food redistributed & destinations',
      'Track meals created and CO₂e avoided',
      'Downloadable reports and insights',
    ],
    multiFeatures: [
      'Centralised site management',
      'Individual and consolidated reporting',
      'Consolidated Collections',
      'Collection and recipient visibility across sites',
    ],
  },
  COMPLETE: {
    tagline: 'One simple system. More savings. Greater impact.',
    description:
      "Bring food tracking and redistribution together in one connected system. Understand what's happening in your kitchen, redirect surplus food and measure the difference you're making.",
    closingLine: 'Know more about your food, save more and make every kilogram count.',
    features: [
      'Record food and create redistribution listings in one connected process',
      'Track food from initial recording through to collection',
      'See what was recorded, redirected and where it went',
      'Combined insights across food savings & redistribution',
      'One platform for your team, with no unnecessary duplication',
      'Discounted pricing when you choose both modules',
    ],
    multiFeatures: [
      'Centralised site management',
      'Individual and consolidated reporting',
      'Consolidated collections across sites',
      'Compare food-loss performance and savings across locations',
    ],
  },
};

/** "1 site", "Up to 10 sites", "Unlimited users", "Up to 2 users" — shown as icon rows. */
const ALLOWANCE_LINE = /^(?:\d+|up to \d+|unlimited)\s+(?:sites?|locations?|users?)$/i;

export type PlanCardCopy = {
  tagline: string;
  description: string;
  closingLine: string;
  /** Leading site / user allowance lines, rendered with icons. */
  allowances: { icon: 'location-outline' | 'person-outline'; label: string }[];
  /** The remaining feature ticks. */
  ticks: string[];
};

/** Backend copy for a plan card, with the design copy filling any gaps. */
export function planCardCopy(plan: AvailablePlan): PlanCardCopy {
  const fallback = MODULE_FALLBACK_COPY[plan.module];
  const features = plan.features ?? [];

  let split = 0;
  while (split < features.length && ALLOWANCE_LINE.test(features[split].trim())) split += 1;

  const allowances = features.slice(0, split).map((label) => ({
    icon: /user/i.test(label) ? ('person-outline' as const) : ('location-outline' as const),
    label,
  }));
  const rest = features.slice(split);

  return {
    tagline: plan.tagline ?? fallback.tagline,
    description: plan.description?.trim() || fallback.description,
    closingLine: plan.closingLine ?? fallback.closingLine,
    allowances,
    ticks: rest.length
      ? rest
      : plan.scope === 'MULTI'
        ? [...fallback.multiFeatures, ...fallback.features]
        : fallback.features,
  };
}

export const CONFIRM_TRUST_POINTS = [
  { key: 'trial', label: '30 Day Free Trial', icon: 'alarm-outline' as const },
  { key: 'contract', label: 'No lock-in contracts', icon: 'document-text-outline' as const },
  { key: 'cancel', label: 'Cancel Anytime', icon: 'time-outline' as const },
];
