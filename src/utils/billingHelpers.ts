import * as WebBrowser from 'expo-web-browser';

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

export function formatPlanPrice(
  amount: number | null | undefined,
  currency = 'AUD',
): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  const code = currency.toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: Number(amount) % 1 === 0 ? 0 : 2,
    }).format(Number(amount));
  } catch {
    return `${code} ${Number(amount).toFixed(0)}`;
  }
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

export async function openBillingUrl(url: string): Promise<void> {
  if (!url) throw new Error('Missing billing URL');
  await WebBrowser.openBrowserAsync(url, {
    enableBarCollapsing: true,
    showTitle: true,
  });
}
