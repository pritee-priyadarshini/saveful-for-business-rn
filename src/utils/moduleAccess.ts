import type {
  Entitlements,
  PlanModule,
  ProductModule,
} from '@/services/subscriptions.service';
import type { UserRole } from '@/types';
import type { SubscriptionStoreState } from '@/store/subscriptionStore';

/** Display names, matching the plan cards. */
export const MODULE_LABEL: Record<PlanModule, string> = {
  MFC: 'Make Food Count',
  CONNECT: 'Saveful Connect',
  COMPLETE: 'Complete Solution',
};

export const PRODUCT_MODULES: readonly ProductModule[] = ['MFC', 'CONNECT'];

/** The modules a plan grants. COMPLETE grants both. */
export function modulesOfPlan(module: PlanModule | null | undefined): ProductModule[] {
  if (module === 'COMPLETE') return [...PRODUCT_MODULES];
  if (module === 'MFC' || module === 'CONNECT') return [module];
  return [];
}

/**
 * Whether the org may use `module` right now.
 *
 * False while entitlements are still loading (null): callers should show a
 * loading state then, never the upsell, so a slow fetch doesn't flash it.
 * Orgs that are never billed (charities, farmer consumers) hold every module;
 * their own access rules still apply.
 */
export function hasModule(
  entitlements: Entitlements | null | undefined,
  module: ProductModule,
): boolean {
  if (!entitlements) return false;
  if (!entitlements.billingRequired) return true;
  return entitlements.modules.includes(module);
}

export function hasCompleteSolution(entitlements: Entitlements | null | undefined): boolean {
  return PRODUCT_MODULES.every((module) => hasModule(entitlements, module));
}

/**
 * The one module a single-module org lacks — what "Add …" offers. null when the
 * org holds both, holds neither, or is not billed.
 */
export function missingModule(
  entitlements: Entitlements | null | undefined,
): ProductModule | null {
  if (!entitlements?.billingRequired) return null;
  const held = PRODUCT_MODULES.filter((module) => entitlements.modules.includes(module));
  if (held.length !== 1) return null;
  return PRODUCT_MODULES.find((module) => !held.includes(module)) ?? null;
}

/** Zustand selector: `useSubscriptionStore(selectHasModule('MFC'))`. */
export function selectHasModule(module: ProductModule) {
  return (state: SubscriptionStoreState) => hasModule(state.entitlements, module);
}

/**
 * The org has a working plan that lacks `module` — the case for an upsell.
 *
 * Not while entitlements are loading, not for orgs that are never billed, and
 * not for an org with no usable plan at all: that one needs a plan first and
 * already gets the "plan required" prompt, not "add a module".
 */
export function isModuleLocked(
  entitlements: Entitlements | null | undefined,
  module: ProductModule,
): boolean {
  if (!entitlements?.billingRequired || !entitlements.entitled) return false;
  return !entitlements.modules.includes(module);
}

/**
 * Whether `module` is sold to this kind of organisation. Make Food Count is
 * for restaurants only; farm producers buy Saveful Connect.
 */
export function isModuleOffered(role: UserRole | null | undefined, module: ProductModule): boolean {
  if (module === 'MFC') return role === 'restaurant_single' || role === 'restaurant_multi';
  return true;
}
