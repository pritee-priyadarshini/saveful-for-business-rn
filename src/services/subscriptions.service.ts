import api from './api';

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'INCOMPLETE'
  | string;

/** A module an organisation can hold. Complete Solution grants both. */
export type ProductModule = 'MFC' | 'CONNECT';

/** What a plan sells: one module, or COMPLETE for both. */
export type PlanModule = 'MFC' | 'CONNECT' | 'COMPLETE';

/** Which plans screen a plan belongs to. */
export type PlanScope = 'SINGLE' | 'MULTI' | 'ENTERPRISE';

const PLAN_MODULES: readonly PlanModule[] = ['MFC', 'CONNECT', 'COMPLETE'];
const PLAN_SCOPES: readonly PlanScope[] = ['SINGLE', 'MULTI', 'ENTERPRISE'];
const PRODUCT_MODULES: readonly ProductModule[] = ['MFC', 'CONNECT'];

export type PlanComparisonFeature = {
  key: string;
  category: string;
  label: string;
  included: boolean;
  value: string | null;
};

export type AvailablePlan = {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  module: PlanModule;
  scope: PlanScope;
  /** 0 when the plan is sold without a free trial (Make Food Count). */
  trialDays: number;
  /** The org's one trial is unused and this plan offers it — drives the card CTA. */
  trialAvailable: boolean;
  /** Card headline under the name, e.g. "Make more of your surplus food." */
  tagline: string | null;
  /** Bold line under the ticks. */
  closingLine: string | null;
  /** Pill on the card, e.g. "Best value". */
  badge: string | null;
  priceMonthly: number | null;
  priceAnnual: number | null;
  currency: string;
  isPerSite: boolean;
  contactSalesOnly: boolean;
  isMostPopular: boolean;
  maxSites: number | null;
  maxUserPerSite: number | null;
  features: string[];
  inheritsFrom: string | null;
  comparison: PlanComparisonFeature[];
};

export type AvailablePlansResponse = {
  billingRequired: boolean;
  currency?: string;
  message?: string;
  plans: AvailablePlan[];
};

export type BillingCycleApi = 'MONTHLY' | 'ANNUAL';

export type Entitlements = {
  billingRequired: boolean;
  entitled: boolean;
  status: SubscriptionStatus | null;
  planId: number | null;
  planName: string | null;
  planDisplayName: string | null;
  /** What the current plan sells. null without a plan. */
  planModule: PlanModule | null;
  planScope: PlanScope | null;
  /**
   * Modules the org may use right now: empty unless entitled, both for orgs
   * that are never billed. Check with `hasModule` (utils/moduleAccess).
   */
  modules: ProductModule[];
  /** Which cycle the org is billed on — drives the monthly/annual toggle. */
  billingCycle: BillingCycleApi | null;
  /** Billed site count on per-site plans. */
  quantity: number | null;
  maxSites: number | null;
  maxUserPerSite: number | null;
  features: string[];
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** false once the org has consumed its one trial. */
  freeTrialAvailable: boolean;
  /**
   * The org has a Stripe billing account (portal, self-serve cancel). false for
   * plans Saveful set up directly; true on older backends that don't say.
   */
  hasBillingAccount: boolean;
  /** Set while a downgrade waits for the current period to close. */
  pendingPlanId: number | null;
  pendingPlanDisplayName: string | null;
  pendingBillingCycle: BillingCycleApi | null;
  pendingChangeEffectiveAt: string | null;
};

function pickPlanModule(value: unknown): PlanModule | null {
  return PLAN_MODULES.includes(value as PlanModule) ? (value as PlanModule) : null;
}

function pickPlanScope(value: unknown): PlanScope | null {
  return PLAN_SCOPES.includes(value as PlanScope) ? (value as PlanScope) : null;
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

/** Trial length a pre-modular backend offered on every plan. */
const LEGACY_TRIAL_DAYS = 30;

/**
 * Fills the modular-billing fields on a plan. A backend from before modular
 * billing omits them; every plan it sold was Saveful Connect, with a trial.
 */
function normalisePlan(raw: AvailablePlan, orgTrialUnused: boolean): AvailablePlan {
  const contactSalesOnly = Boolean(raw.contactSalesOnly);
  const scope =
    pickPlanScope(raw.scope) ??
    (contactSalesOnly ? 'ENTERPRISE' : (raw.maxSites ?? 1) > 1 ? 'MULTI' : 'SINGLE');
  const trialDays =
    typeof raw.trialDays === 'number' ? raw.trialDays : contactSalesOnly ? 0 : LEGACY_TRIAL_DAYS;

  return {
    ...raw,
    contactSalesOnly,
    module: pickPlanModule(raw.module) ?? 'CONNECT',
    scope,
    trialDays,
    trialAvailable:
      typeof raw.trialAvailable === 'boolean'
        ? raw.trialAvailable
        : orgTrialUnused && trialDays > 0 && !contactSalesOnly,
    tagline: optionalText(raw.tagline),
    closingLine: optionalText(raw.closingLine),
    badge: optionalText(raw.badge),
    features: Array.isArray(raw.features) ? raw.features : [],
  };
}

/**
 * Modules from the API, or — on a pre-modular backend — what the org's plan
 * implies: never billed means everything; any entitled plan was Saveful Connect.
 */
function resolveModules(data: Partial<Entitlements> | undefined): ProductModule[] {
  if (Array.isArray(data?.modules)) {
    return data.modules.filter((m): m is ProductModule => PRODUCT_MODULES.includes(m));
  }
  if (!data?.billingRequired) return [...PRODUCT_MODULES];
  return data.entitled ? ['CONNECT'] : [];
}

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export const subscriptionsService = {
  /**
   * @param orgTrialUnused the org-level trial flag from entitlements. Only used
   *   to derive `trialAvailable` when the backend predates per-plan trials.
   */
  async getAvailable(orgTrialUnused = false): Promise<AvailablePlansResponse> {
    const res = await api.get('/subscriptions/available');
    const data = unwrapData<AvailablePlansResponse>(res.data);
    const plans = Array.isArray(data?.plans) ? data.plans : [];
    return {
      billingRequired: Boolean(data?.billingRequired),
      currency: data?.currency,
      message: data?.message,
      plans: plans.map((plan) => normalisePlan(plan, orgTrialUnused)),
    };
  },

  async getEntitlements(): Promise<Entitlements> {
    const res = await api.get('/subscriptions/me', {
      skipBillingHandler: true,
      skipUnauthorizedHandler: true,
    });
    const data = unwrapData<Entitlements>(res.data);
    return {
      billingRequired: Boolean(data?.billingRequired),
      entitled: Boolean(data?.entitled),
      status: data?.status ?? null,
      planId: data?.planId ?? null,
      planName: data?.planName ?? null,
      planDisplayName: data?.planDisplayName ?? null,
      planModule: pickPlanModule(data?.planModule),
      planScope: pickPlanScope(data?.planScope),
      modules: resolveModules(data),
      billingCycle: data?.billingCycle ?? null,
      quantity: data?.quantity ?? null,
      maxSites: data?.maxSites ?? null,
      maxUserPerSite: data?.maxUserPerSite ?? null,
      features: Array.isArray(data?.features) ? data.features : [],
      trialEndsAt: data?.trialEndsAt ?? null,
      currentPeriodEnd: data?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: Boolean(data?.cancelAtPeriodEnd),
      // Older backends omit this; assume no trial rather than offering one that
      // the server will reject.
      freeTrialAvailable: Boolean(data?.freeTrialAvailable),
      hasBillingAccount:
        typeof data?.hasBillingAccount === 'boolean' ? data.hasBillingAccount : true,
      pendingPlanId: data?.pendingPlanId ?? null,
      pendingPlanDisplayName: data?.pendingPlanDisplayName ?? null,
      pendingBillingCycle: data?.pendingBillingCycle ?? null,
      pendingChangeEffectiveAt: data?.pendingChangeEffectiveAt ?? null,
    };
  },
};
