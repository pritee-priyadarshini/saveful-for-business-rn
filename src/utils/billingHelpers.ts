import type { BillingCycleApi } from '@/services/billing.service';
import type { AvailablePlan } from '@/services/subscriptions.service';
import type { BillingCycle } from '@/screens/subscription/singleSitePlans';
import type {
  EnterpriseContactPref,
  EnterpriseLocationRange,
} from '@/screens/subscription/multiSitePlans';
import type {
  EnterpriseContactWindow,
  EnterpriseLocationBand,
} from '@/services/billing.service';

export function toApiBillingCycle(cycle: BillingCycle): BillingCycleApi {
  return cycle === 'annual' ? 'ANNUAL' : 'MONTHLY';
}

/**
 * Backend bills India in INR and every other region in AUD, and returns the
 * already-converted amount with its currency code. Symbols are mapped here
 * rather than via Intl, which is not dependable across Hermes builds.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: 'A$',
  INR: '₹',
  USD: 'US$',
  NZD: 'NZ$',
  GBP: '£',
  EUR: '€',
};

export function currencySymbol(currency?: string | null): string {
  const code = (currency || 'AUD').toUpperCase();
  return CURRENCY_SYMBOLS[code] ?? `${code} `;
}

export function fromApiBillingCycle(cycle?: BillingCycleApi | null): BillingCycle {
  return cycle === 'ANNUAL' ? 'annual' : 'monthly';
}

/** Human date for billing copy, e.g. "24 Aug 2026". */
export function formatBillingDate(value?: string | Date | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function billingCycleLabel(cycle?: BillingCycleApi | null): string {
  return cycle === 'ANNUAL' ? 'yearly' : 'monthly';
}

function groupThousands(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatPlanPrice(
  amount: number | null | undefined,
  currency = 'AUD',
): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—';

  const value = Number(amount);
  const hasCents = Math.abs(value % 1) > 0.001;
  const [whole, cents] = value.toFixed(hasCents ? 2 : 0).split('.');
  const formatted = cents ? `${groupThousands(whole)}.${cents}` : groupThousands(whole);

  return `${currencySymbol(currency)}${formatted}`;
}

export function formatPlanMonthlyLabel(plan: AvailablePlan): string {
  if (plan.contactSalesOnly) return 'Custom Pricing';
  const price = formatPlanPrice(plan.priceMonthly, plan.currency);
  if (plan.isPerSite) return `${price}/month per site`;
  return `${price}/month`;
}

export function formatPlanAnnualLabel(plan: AvailablePlan): string {
  if (plan.contactSalesOnly || plan.priceAnnual == null) return '';
  const price = formatPlanPrice(plan.priceAnnual, plan.currency);
  if (plan.isPerSite) return `${price}/year per site`;
  return `${price}/year`;
}

export function mapEnterpriseLocationBand(
  range: EnterpriseLocationRange,
): EnterpriseLocationBand {
  switch (range) {
    case '10-25':
      return 'BAND_10_25';
    case '26-50':
      return 'BAND_26_50';
    case '51-100':
      return 'BAND_51_100';
    case '100+':
      return 'BAND_100_PLUS';
    default:
      return 'BAND_10_25';
  }
}

export function mapEnterpriseContactWindow(
  pref: EnterpriseContactPref,
): EnterpriseContactWindow {
  switch (pref) {
    case 'asap':
      return 'ASAP';
    case 'morning':
      return 'MORNING';
    case 'afternoon':
      return 'AFTERNOON';
    case 'anytime':
      return 'ANY_TIME';
    default:
      return 'ANY_TIME';
  }
}

/** Prefer non-enterprise purchasable plans; fall back to first plan. */
export function pickDefaultPlanId(plans: AvailablePlan[]): number | null {
  if (!plans.length) return null;
  const popular = plans.find((p) => p.isMostPopular && !p.contactSalesOnly);
  if (popular) return popular.id;
  const purchasable = plans.find((p) => !p.contactSalesOnly);
  return (purchasable ?? plans[0]).id;
}

export function findPlanById(
  plans: AvailablePlan[],
  planId: number | null | undefined,
): AvailablePlan | null {
  if (planId == null) return null;
  return plans.find((p) => p.id === planId) ?? null;
}

/** How a plan relates to the one the org is already on. */
export type PlanRelation = 'CURRENT' | 'UPGRADE' | 'DOWNGRADE' | 'NEW';

/**
 * Labels a plan card relative to the current subscription.
 *
 * Mirrors the backend rule — compare monthly list price, and treat a move to
 * annual on the same tier as an upgrade because it prepays. This only drives
 * copy; the charged direction and amount always come from the preview endpoint.
 */
export function getPlanRelation(params: {
  plan: AvailablePlan;
  currentPlan: AvailablePlan | null;
  targetCycle: BillingCycle;
  currentCycle: BillingCycle;
}): PlanRelation {
  const { plan, currentPlan, targetCycle, currentCycle } = params;
  if (!currentPlan) return 'NEW';

  if (plan.id === currentPlan.id) {
    if (targetCycle === currentCycle) return 'CURRENT';
    return targetCycle === 'annual' ? 'UPGRADE' : 'DOWNGRADE';
  }

  const next = plan.priceMonthly ?? 0;
  const now = currentPlan.priceMonthly ?? 0;
  if (next === now) return targetCycle === 'annual' ? 'UPGRADE' : 'DOWNGRADE';
  return next > now ? 'UPGRADE' : 'DOWNGRADE';
}

export function planRelationLabel(relation: PlanRelation, planName: string): string {
  switch (relation) {
    // Still actionable — the cycle can change even when the tier does not.
    case 'CURRENT':
      return 'Change billing cycle';
    case 'UPGRADE':
      return `Upgrade to ${planName}`;
    case 'DOWNGRADE':
      return `Switch to ${planName}`;
    default:
      return `Continue with ${planName}`;
  }
}
