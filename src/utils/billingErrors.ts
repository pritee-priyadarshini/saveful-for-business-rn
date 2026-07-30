import { isAxiosError } from 'axios';

/** Machine-readable billing error codes from svforb subscriptions module. */
export const BILLING_ERROR = {
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  SUBSCRIPTION_INACTIVE: 'SUBSCRIPTION_INACTIVE',
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

export function isTrialAlreadyUsedError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  if (error.response?.status !== 409) return false;
  const message = String(
    getBillingErrorPayload(error)?.message ?? error.message ?? '',
  ).toLowerCase();
  return message.includes('free trial') || message.includes('already used');
}
