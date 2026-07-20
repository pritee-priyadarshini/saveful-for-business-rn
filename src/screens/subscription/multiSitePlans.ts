import type { BillingCycle } from './singleSitePlans';
import { CONFIRM_TRUST_POINTS } from './singleSitePlans';

export type MultiSitePlanId = 'multi' | 'enterprise';

export type MultiSitePlan = {
  id: MultiSitePlanId;
  name: string;
  nameAccent?: boolean;
  monthlyPrice: string;
  monthlySuffix: string;
  annualPrice?: string;
  annualNote?: string;
  customPricing?: boolean;
  description: string;
  includesLabel?: string;
  features: string[];
  primaryCta: string;
  ctaVariant: 'solid' | 'outline';
};

export const MULTI_SITE_INTRO =
  "We've recommended the best plan for your business. Based on your organisation profile, here are the plans that suit your needs.";

export const MULTI_SITE_SUCCESS_BANNER =
  "You're all set! Let's start turning your food operations into measurable savings.";

export const MULTI_SITE_PLANS: MultiSitePlan[] = [
  {
    id: 'multi',
    name: 'MULTI SITE (up to 10 locations)',
    nameAccent: true,
    monthlyPrice: '$89',
    monthlySuffix: '/month per site',
    annualPrice: '$890',
    annualNote: '2 months free',
    description:
      'For businesses managing multiple locations with consistent reporting and operations.',
    features: [
      'Manage up to 10 locations',
      'Manage all locations from one dashboard',
      'Compare performance across locations',
      'Consistent process across every site',
      'Dedicated onboarding support',
    ],
    primaryCta: 'Start Free 30 Day Trial',
    ctaVariant: 'solid',
  },
  {
    id: 'enterprise',
    name: 'ENTERPRISE 10+ locations',
    monthlyPrice: 'Custom Pricing',
    monthlySuffix: '',
    customPricing: true,
    description:
      'For organisations requiring enterprise-scale deployment and support.',
    includesLabel: 'Includes everything in Multi Site Plan, plus;',
    features: [
      'Unlimited locations',
      'Enterprise analytics & executive dashboards',
      'Custom implementation & onboarding',
      'Dedicated Customer Success Manager',
      'Priority support & SLA',
    ],
    primaryCta: 'Talk to Sales Team',
    ctaVariant: 'outline',
  },
];

export const ENTERPRISE_LOCATION_OPTIONS = [
  { id: '10-25', label: '10-25' },
  { id: '26-50', label: '26-50' },
  { id: '51-100', label: '51-100' },
  { id: '100+', label: '100+' },
] as const;

export const ENTERPRISE_CONTACT_OPTIONS = [
  { id: 'asap', label: 'As soon as possible' },
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'anytime', label: 'Any time' },
] as const;

export type EnterpriseLocationRange = (typeof ENTERPRISE_LOCATION_OPTIONS)[number]['id'];
export type EnterpriseContactPref = (typeof ENTERPRISE_CONTACT_OPTIONS)[number]['id'];

export const MULTI_SITE_TRUST_POINTS = CONFIRM_TRUST_POINTS;

export function getMultiSitePlanById(planId: MultiSitePlanId) {
  return MULTI_SITE_PLANS.find((plan) => plan.id === planId) ?? MULTI_SITE_PLANS[0];
}

export function getMultiSiteBillingAmount(cycle: BillingCycle) {
  const plan = getMultiSitePlanById('multi');
  if (cycle === 'annual') {
    return {
      amount: plan.annualPrice ?? '$890',
      suffix: '/year per site',
    };
  }
  return {
    amount: plan.monthlyPrice,
    suffix: '/month per site',
  };
}

export type { BillingCycle };
