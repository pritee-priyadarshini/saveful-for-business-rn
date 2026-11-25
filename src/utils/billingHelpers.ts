import type { BillingCycleApi } from '@/services/billing.service';
import type {
  AvailablePlan,
  Entitlements,
  PlanModule,
  PlanScope,
} from '@/services/subscriptions.service';
import { MODULE_LABEL } from '@/utils/moduleAccess';
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

/** A plan's price for one billing cycle, split for "A$49 /month" layouts. */
export function planPriceForCycle(
  plan: Pick<AvailablePlan, 'priceMonthly' | 'priceAnnual' | 'currency' | 'isPerSite'>,
  cycle: BillingCycle,
): { amount: string; suffix: string } {
  const annual = cycle === 'annual';
  const amount = formatPlanPrice(annual ? plan.priceAnnual : plan.priceMonthly, plan.currency);
  const suffix = `${annual ? '/year' : '/month'}${plan.isPerSite ? ' per site' : ''}`;
  return { amount, suffix };
}

/**
 * What a per-site plan comes to for the org's sites, e.g. "3 sites · A$207/month".
 * null for flat-priced plans. Stripe bills at least one site.
 */
export function perSiteEstimate(
  plan: Pick<AvailablePlan, 'priceMonthly' | 'priceAnnual' | 'currency' | 'isPerSite'>,
  cycle: BillingCycle,
  siteCount: number,
): { sites: number; unit: string; total: string; suffix: string; label: string } | null {
  if (!plan.isPerSite) return null;
  const unitPrice = cycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
  if (unitPrice == null) return null;
  const sites = Math.max(1, Math.floor(siteCount) || 0);
  const suffix = cycle === 'annual' ? '/year' : '/month';
  const total = formatPlanPrice(unitPrice * sites, plan.currency);
  return {
    sites,
    unit: formatPlanPrice(unitPrice, plan.currency),
    total,
    suffix,
    label: `${sites} ${sites === 1 ? 'site' : 'sites'} · ${total}${suffix}`,
  };
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

/**
 * Default plan to highlight: the badged one ("Best value"), else the most
 * popular, else the first purchasable plan.
 */
export function pickDefaultPlanId(plans: AvailablePlan[]): number | null {
  if (!plans.length) return null;
  const purchasable = plans.filter((p) => !p.contactSalesOnly);
  const badged = purchasable.find((p) => p.badge);
  if (badged) return badged.id;
  const popular = purchasable.find((p) => p.isMostPopular);
  if (popular) return popular.id;
  return (purchasable[0] ?? plans[0]).id;
}

export function findPlanById(
  plans: AvailablePlan[],
  planId: number | null | undefined,
): AvailablePlan | null {
  if (planId == null) return null;
  return plans.find((p) => p.id === planId) ?? null;
}

/**
 * Enough of a plan to compare against. The org's current plan may be a legacy
 * one (Single Site +, Multi Site) that is no longer for sale, so it is not in
 * `/subscriptions/available`; entitlements still say what it sells.
 */
export type PlanRef = {
  id: number;
  module: PlanModule;
  scope: PlanScope;
  /** null when unknown (a legacy plan that is not in the catalogue response). */
  priceMonthly: number | null;
  displayName: string;
};

/** The org's current plan, from the catalogue when listed, else from entitlements. */
export function resolveCurrentPlanRef(
  plans: AvailablePlan[],
  entitlements: Entitlements | null | undefined,
): PlanRef | null {
  if (!entitlements?.entitled || entitlements.planId == null) return null;
  const listed = findPlanById(plans, entitlements.planId);
  if (listed) return listed;
  return {
    id: entitlements.planId,
    // Every pre-modular plan sold Saveful Connect.
    module: entitlements.planModule ?? 'CONNECT',
    scope:
      entitlements.planScope ?? ((entitlements.maxSites ?? 1) > 1 ? 'MULTI' : 'SINGLE'),
    priceMonthly: null,
    displayName: entitlements.planDisplayName ?? entitlements.planName ?? 'your current plan',
  };
}

/**
 * How a plan relates to the one the org is already on.
 * - SWITCH: Make Food Count ↔ Saveful Connect, or another plan at the same
 *   price — takes effect at the period end.
 */
export type PlanRelation = 'CURRENT' | 'UPGRADE' | 'DOWNGRADE' | 'SWITCH' | 'NEW';

/** Complete Solution holds both modules, so it outranks either one alone. */
const MODULE_RANK: Record<PlanModule, number> = { MFC: 1, CONNECT: 1, COMPLETE: 2 };

/**
 * Labels a plan card relative to the current subscription.
 *
 * Mirrors the backend (svforb billing/plan-change.rules.ts): within one scope
 * the module decides — gaining a module is an upgrade, losing one a downgrade,
 * MFC ↔ Connect a switch. Otherwise the monthly list price decides, then the
 * cycle (annual prepays, so it is an upgrade). This only drives copy; the
 * charged direction and amount always come from the preview endpoint.
 */
export function getPlanRelation(params: {
  plan: PlanRef;
  currentPlan: PlanRef | null;
  targetCycle: BillingCycle;
  currentCycle: BillingCycle;
}): PlanRelation {
  const { plan, currentPlan, targetCycle, currentCycle } = params;
  if (!currentPlan) return 'NEW';

  if (plan.id === currentPlan.id) {
    if (targetCycle === currentCycle) return 'CURRENT';
    return targetCycle === 'annual' ? 'UPGRADE' : 'DOWNGRADE';
  }

  if (plan.scope === currentPlan.scope && plan.module !== currentPlan.module) {
    const delta = MODULE_RANK[plan.module] - MODULE_RANK[currentPlan.module];
    if (delta > 0) return 'UPGRADE';
    if (delta < 0) return 'DOWNGRADE';
    return 'SWITCH';
  }

  // A legacy plan's price is unknown here; the preview will say which way it goes.
  if (currentPlan.priceMonthly == null) return 'SWITCH';

  const next = plan.priceMonthly ?? 0;
  const now = currentPlan.priceMonthly;
  if (next > now) return 'UPGRADE';
  if (next < now) return 'DOWNGRADE';
  if (targetCycle === currentCycle) return 'SWITCH';
  return targetCycle === 'annual' ? 'UPGRADE' : 'DOWNGRADE';
}

/**
 * "Add Saveful Connect" when moving from one module to Complete Solution —
 * reads as what the customer gains, not as a plan name. null otherwise.
 */
export function addModuleLabel(plan: PlanRef, currentPlan: PlanRef | null): string | null {
  if (plan.module !== 'COMPLETE' || !currentPlan || plan.scope !== currentPlan.scope) return null;
  if (currentPlan.module === 'MFC') return `Add ${MODULE_LABEL.CONNECT}`;
  if (currentPlan.module === 'CONNECT') return `Add ${MODULE_LABEL.MFC}`;
  return null;
}

export function planRelationLabel(
  relation: PlanRelation,
  planName: string,
  context?: { plan: PlanRef; currentPlan: PlanRef | null },
): string {
  switch (relation) {
    // Still actionable — the cycle can change even when the tier does not.
    case 'CURRENT':
      return 'Change billing cycle';
    case 'UPGRADE':
      return (context && addModuleLabel(context.plan, context.currentPlan)) ?? `Upgrade to ${planName}`;
    case 'DOWNGRADE':
    case 'SWITCH':
      return `Switch to ${planName}`;
    default:
      return `Continue with ${planName}`;
  }
}

/**
 * The CTA on a plan card, verbatim from the plans design:
 * - new org, trial offered: "Start your free 30 day trial for Saveful Connect"
 * - new org, no trial:      "Start subscription for Make Food Count"
 * - already subscribed:     "Add Make Food Count", "Switch to …", "Upgrade to …"
 */
export function planCtaLabel(
  plan: AvailablePlan,
  options: { relation: PlanRelation; currentPlan: PlanRef | null; trialAvailable?: boolean },
): string {
  const { relation, currentPlan } = options;
  if (relation === 'NEW') {
    const trial = options.trialAvailable ?? plan.trialAvailable;
    return trial && plan.trialDays > 0
      ? `Start your free ${plan.trialDays} day trial for ${plan.displayName}`
      : `Start subscription for ${plan.displayName}`;
  }
  return planRelationLabel(relation, plan.displayName, { plan, currentPlan });
}
