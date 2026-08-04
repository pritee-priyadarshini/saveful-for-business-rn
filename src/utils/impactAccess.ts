import type { Entitlements } from '@/services/subscriptions.service';

/** Backend PlanFeature keys that unlock advanced impact (plus / multi / enterprise). */
export const IMPACT_FEATURE = {
  COST_SAVING_INSIGHTS: 'cost_saving_insights',
  ESG_REPORTS: 'esg_reports',
} as const;

/**
 * Base Single Site → Impact metrics + graphs only.
 * Single Site +, Multi Site, Enterprise → also Specific Food Savings + report download.
 */
export function hasAdvancedImpactAccess(entitlements: Entitlements | null | undefined): boolean {
  if (!entitlements) return false;

  // Charities / free-forever orgs are never limited on impact.
  if (!entitlements.billingRequired) return true;
  if (!entitlements.entitled) return false;

  const features = entitlements.features ?? [];
  if (
    features.includes(IMPACT_FEATURE.COST_SAVING_INSIGHTS) ||
    features.includes(IMPACT_FEATURE.ESG_REPORTS)
  ) {
    return true;
  }

  const label = `${entitlements.planName ?? ''} ${entitlements.planDisplayName ?? ''}`.toLowerCase();

  if (
    label.includes('plus') ||
    label.includes('single_plus') ||
    label.includes('single-plus') ||
    label.includes('multi') ||
    label.includes('enterprise')
  ) {
    return true;
  }

  // Explicit base single-site plan names.
  if (
    label.includes('single') &&
    !label.includes('plus') &&
    !label.includes('multi')
  ) {
    return false;
  }

  // Catalogue fallbacks when feature keys are not seeded yet.
  if (entitlements.maxSites != null && entitlements.maxSites > 1) return true;
  if (entitlements.maxUserPerSite != null && entitlements.maxUserPerSite > 2) return true;

  return false;
}

export function canShowSpecificFoodSavings(
  entitlements: Entitlements | null | undefined,
): boolean {
  return hasAdvancedImpactAccess(entitlements);
}

export function canShowDonationRecipients(
  entitlements: Entitlements | null | undefined,
): boolean {
  return hasAdvancedImpactAccess(entitlements);
}

export function canDownloadImpactReports(
  entitlements: Entitlements | null | undefined,
): boolean {
  return hasAdvancedImpactAccess(entitlements);
}
