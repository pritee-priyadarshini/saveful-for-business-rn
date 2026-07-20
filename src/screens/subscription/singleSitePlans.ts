export type SingleSitePlanId = 'single' | 'single_plus';

export type CoreFeature = {
  key: string;
  label: string;
  icon: 'clipboard-outline' | 'heart-outline' | 'analytics-outline' | 'shield-checkmark-outline';
};

export type SingleSitePlan = {
  id: SingleSitePlanId;
  name: string;
  badge?: string;
  monthlyPrice: string;
  annualPrice: string;
  annualNote: string;
  description: string;
  includesLabel?: string;
  features: string[];
};

export type CompareCell = boolean | string;

export type CompareFeatureRow = {
  label: string;
  single: CompareCell;
  plus: CompareCell;
};

export type CompareFeatureSection = {
  title: string;
  rows: CompareFeatureRow[];
};

export const SINGLE_SITE_CORE_FEATURES: CoreFeature[] = [
  { key: 'surplus', label: 'Surplus Listing', icon: 'clipboard-outline' },
  { key: 'matching', label: 'Charity Matching', icon: 'heart-outline' },
  { key: 'impact', label: 'Impact Tracking', icon: 'analytics-outline' },
  { key: 'secure', label: 'Secure & Trusted', icon: 'shield-checkmark-outline' },
];

export const SINGLE_SITE_PLANS: SingleSitePlan[] = [
  {
    id: 'single',
    name: 'SINGLE SITE',
    monthlyPrice: '$49',
    annualPrice: '$490',
    annualNote: '2 months free',
    description: 'For businesses getting started with surplus tracking and impact reporting.',
    features: [
      '1 site',
      'Up to 2 users',
      'Quick surplus listing',
      'Charity matching & pick up coordination',
      'Basic impact tracking & date specification',
      'Email support',
    ],
  },
  {
    id: 'single_plus',
    name: 'SINGLE SITE +',
    badge: 'Most Popular',
    monthlyPrice: '$69',
    annualPrice: '$690',
    annualNote: '2 months free',
    description:
      'For businesses ready to optimise operations with advanced insights, reporting & ESG measurement.',
    includesLabel: 'Includes everything in Single Site, plus;',
    features: [
      'Up to 6 users',
      'Advanced reporting dashboard',
      'Cost saving insights',
      'ESG reporting',
      'Priority support',
    ],
  },
];

export const SINGLE_SITE_UPGRADE_TITLE = 'Why upgrade to Single Site +';
export const SINGLE_SITE_UPGRADE_BODY =
  'Unlock deeper insights, identify where money is being lost and improve operational performance.';

export const SINGLE_SITE_COMPARE_SECTIONS: CompareFeatureSection[] = [
  {
    title: 'USERS',
    rows: [
      { label: 'Users included', single: 'Upto 2', plus: 'Up to 6' },
    ],
  },
  {
    title: 'OPERATIONS & REPORTING',
    rows: [
      { label: 'Surplus Listing', single: true, plus: true },
      { label: 'Charity matching & pickup coordination', single: true, plus: true },
      { label: 'Basic impact tracking', single: true, plus: true },
      { label: 'Date specification', single: true, plus: true },
      { label: 'Operational insights', single: false, plus: true },
      { label: 'Identify cost saving opportunities', single: false, plus: true },
      { label: 'Download ESG & management report', single: false, plus: true },
      { label: 'Priority support', single: false, plus: true },
    ],
  },
];

export const SINGLE_SITE_COMPARE_UPGRADE_POINTS = [
  'Identify where food, time & money are being lost',
  'Identify cost-saving opportunities',
  'Generate management & ESG reports in seconds',
];

export function getContinueLabel(planId: SingleSitePlanId) {
  return planId === 'single_plus' ? 'Continue with Single Site +' : 'Continue with Single Site';
}
