import { isAxiosError } from 'axios';

/** Machine-readable billing error codes from svforb subscriptions module. */
export const BILLING_ERROR = {
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  SUBSCRIPTION_INACTIVE: 'SUBSCRIPTION_INACTIVE',
  /** Checkout was called by an org with a live plan — use change-plan instead. */
  PLAN_CHANGE_REQUIRED: 'PLAN_CHANGE_REQUIRED',
  /** change-plan was called with nothing to change from — use checkout instead. */
  NO_ACTIVE_SUBSCRIPTION: 'NO_ACTIVE_SUBSCRIPTION',
  ALREADY_ON_PLAN: 'ALREADY_ON_PLAN',
  SITE_LIMIT_REACHED: 'SITE_LIMIT_REACHED',
  USER_LIMIT_REACHED: 'USER_LIMIT_REACHED',
  FEATURE_NOT_IN_PLAN: 'FEATURE_NOT_IN_PLAN',
} as const;

export type BillingErrorCode = (typeof BILLING_ERROR)[keyof typeof BILLING_ERROR];

export type BillingApiError = {
  statusCode?: number;
  error?: string;
  message?: string;
  status?: string;
  feature?: string;
  limit?: number;
  current?: number;
  /** Present on PLAN_CHANGE_REQUIRED so the client can jump straight to switching. */
  currentPlanId?: number;
};

export function getBillingErrorPayload(error: unknown): BillingApiError | null {
  if (!isAxiosError(error) || !error.response?.data) return null;
  const data = error.response.data;
  if (typeof data !== 'object' || data === null) return null;
  return data as BillingApiError;
}

export function getBillingErrorCode(error: unknown): BillingErrorCode | null {
  const payload = getBillingErrorPayload(error);
  const code = payload?.error;
  if (!code) return null;
  if ((Object.values(BILLING_ERROR) as string[]).includes(code)) {
    return code as BillingErrorCode;
  }
  return null;
}

export function isSubscriptionGateError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  const status = error.response?.status;
  const code = getBillingErrorCode(error);
  if (status === 402) return true;
  return (
    code === BILLING_ERROR.SUBSCRIPTION_REQUIRED ||
    code === BILLING_ERROR.SUBSCRIPTION_INACTIVE
  );
}

export function isPlanLimitError(error: unknown): boolean {
  const code = getBillingErrorCode(error);
  return (
    code === BILLING_ERROR.SITE_LIMIT_REACHED ||
    code === BILLING_ERROR.USER_LIMIT_REACHED ||
    code === BILLING_ERROR.FEATURE_NOT_IN_PLAN
  );
}

/**
 * The org already holds a live Stripe subscription, so a second Checkout would
 * bill it twice. The caller should switch plans instead.
 */
export function isPlanChangeRequiredError(error: unknown): boolean {
  return getBillingErrorCode(error) === BILLING_ERROR.PLAN_CHANGE_REQUIRED;
}

/** change-plan was called with nothing to change from — send the org to checkout. */
export function isNoActiveSubscriptionError(error: unknown): boolean {
  return getBillingErrorCode(error) === BILLING_ERROR.NO_ACTIVE_SUBSCRIPTION;
}

export function isAlreadyOnPlanError(error: unknown): boolean {
  return getBillingErrorCode(error) === BILLING_ERROR.ALREADY_ON_PLAN;
}

/** The plan the org currently holds, returned alongside PLAN_CHANGE_REQUIRED. */
export function getCurrentPlanIdFromError(error: unknown): number | null {
  const planId = getBillingErrorPayload(error)?.currentPlanId;
  return typeof planId === 'number' ? planId : null;
}

/**
 * Backend rejects a second trial with 409 in two shapes: the trial was already
 * consumed, or a subscription record already exists. Both mean "go to checkout".
 */
export function isTrialAlreadyUsedError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  if (error.response?.status !== 409) return false;
  const message = String(
    getBillingErrorPayload(error)?.message ?? error.message ?? '',
  ).toLowerCase();
  return (
    message.includes('free trial') ||
    message.includes('already used') ||
    message.includes('already has a subscription')
  );
}

/** No Stripe customer yet — trial-only orgs have nothing to manage in the portal. */
export function isNoBillingAccountError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  if (error.response?.status !== 404) return false;
  const message = String(getBillingErrorPayload(error)?.message ?? '').toLowerCase();
  return message.includes('billing account');
}

/**
 * Turns billing/Stripe failures from svforb into copy a business owner can act
 * on. Falls back to the server message when it is already user-facing.
 */
export function getBillingErrorMessage(
  error: unknown,
  fallback = 'Something went wrong with billing. Please try again.',
): string {
  if (!isAxiosError(error)) return fallback;

  const status = error.response?.status;
  const raw = String(getBillingErrorPayload(error)?.message ?? '').trim();
  const lower = raw.toLowerCase();

  // Coded conflicts carry an accurate server-written message; prefer it over
  // any substring guess below.
  if (
    isPlanChangeRequiredError(error) ||
    isNoActiveSubscriptionError(error) ||
    isAlreadyOnPlanError(error)
  ) {
    return raw || fallback;
  }

  if (status === 503 || lower.includes('payments are not configured')) {
    return 'Payments are temporarily unavailable. Please try again shortly or contact support.';
  }

  if (lower.includes('price configured')) {
    return 'This plan is not priced for your region yet. Please contact support or choose another plan.';
  }

  if (lower.includes('quote-based') || lower.includes('enterprise plan is quote')) {
    return 'Enterprise is quote-based. Submit an enquiry and our team will contact you.';
  }

  if (isNoBillingAccountError(error)) {
    return 'Your organisation does not have a billing account yet. Choose a plan to get started.';
  }

  if (status === 403 && lower.includes('organisation admin')) {
    return 'Only an organisation admin can manage billing.';
  }

  if (status === 403 && lower.includes('free lifetime access')) {
    return 'Your organisation has free lifetime access — no subscription is required.';
  }

  if (status === 403 && lower.includes('not available for your organisation')) {
    return 'That plan is not available for your organisation type.';
  }

  // Stripe (and similar) leak parameter names, unix timestamps, and snake_case
  // fields — never show those to a business owner.
  if (looksLikeRawProviderError(raw)) {
    if (lower.includes('trial') && lower.includes('billing_cycle_anchor')) {
      return 'We could not change your plan while your free trial is still active. Please try again, or contact support if this keeps happening.';
    }
    if (lower.includes('card') || lower.includes('insufficient') || lower.includes('declined')) {
      return 'Your card could not be charged. Please update your payment method and try again.';
    }
    return fallback;
  }

  return raw || fallback;
}

/**
 * True when a server message still looks like an internal provider error —
 * snake_case API fields, backtick code hints, or bare unix timestamps.
 */
function looksLikeRawProviderError(message: string): boolean {
  if (!message) return false;
  return (
    /billing_cycle_anchor|trial_end|proration_behavior|resource_missing|param\b/i.test(
      message,
    ) ||
    /`[a-z_]+`/.test(message) ||
    /\(\d{9,}\)/.test(message)
  );
}
