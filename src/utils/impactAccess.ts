import type { Entitlements } from '@/services/subscriptions.service';
import { hasModule } from '@/utils/moduleAccess';

/**
 * Advanced impact — specific food savings, donation recipients and report
 * downloads — comes with Saveful Connect (its own plan, Complete Solution, or a
 * legacy Single Site / Multi Site plan). Orgs that are never billed always see it.
 */
export function hasAdvancedImpactAccess(entitlements: Entitlements | null | undefined): boolean {
  if (!entitlements) return false;
  if (!entitlements.billingRequired) return true;
  return entitlements.entitled && hasModule(entitlements, 'CONNECT');
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
