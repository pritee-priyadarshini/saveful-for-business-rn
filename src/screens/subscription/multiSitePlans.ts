import type { BillingCycle } from './singleSitePlans';

export const MULTI_SITE_SCREEN_TITLE = 'Your Plan - Multi Site';

/** Enterprise card copy, from the plans brief. The backend sends the same on the plan. */
export const ENTERPRISE_FALLBACK_COPY = {
  tagline: '10+ locations',
  price: 'Custom Pricing',
  cta: 'Talk to Sales Team',
  features: [
    'Unlimited locations',
    'Make Food Count and Saveful Connect included',
    'Enterprise analytics & executive dashboards',
    'Custom implementation & onboarding',
    'Dedicated Customer Success Manager',
    'Priority support & SLA',
  ],
};

export const MULTI_SITE_INTRO =
  "We've recommended the best plan for your business. Based on your organisation profile, here are the plans that suit your needs.";

export const MULTI_SITE_SUCCESS_BANNER =
  "You're all set! Let's start turning your food operations into measurable savings.";

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

export type { BillingCycle };
