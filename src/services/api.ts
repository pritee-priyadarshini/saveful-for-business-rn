import axios, { InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

type UnauthorizedHandler = () => void | Promise<void>;
type BillingRequiredHandler = (payload: {
  code?: string;
  message?: string;
}) => void | Promise<void>;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let billingRequiredHandler: BillingRequiredHandler | null = null;

/** Called from AppContext so a 401 clears session and redirects to login. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

/** Called from AppNavigator so 402 / subscription-required routes to Plans. */
export function setBillingRequiredHandler(handler: BillingRequiredHandler | null) {
  billingRequiredHandler = handler;
}

const api = axios.create({
  baseURL: 'https://s4b.saveful.app/api/v1',
  timeout: 60000,
});

function isFormData(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (value instanceof FormData) return true;
  const proto = Object.getPrototypeOf(value);
  if (proto?.constructor?.name === 'FormData') return true;
  return typeof (value as any).getParts === 'function';
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync('accessToken');

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  if (isFormData(config.data)) {
    config.headers.delete('Content-Type');
    config.transformRequest = [(data: any) => data];
  } else if (!config.headers.get('Content-Type')) {
    config.headers.set('Content-Type', 'application/json');
  }

  return config;
});

function isPublicAuthPath(path: string): boolean {
  return (
    path.includes('/auth/login') ||
    path.includes('/auth/register') ||
    path.includes('/auth/forgot-password') ||
    path.includes('/auth/reset-password') ||
    path.includes('/auth/verify-email') ||
    path.includes('/auth/resend-verification')
  );
}

api.interceptors.response.use(
  response => {
    return response;
  },
  async error => {
    const config = error.config;

    if (error.response?.status === 401) {
      const path = config?.url ?? '';
      const hadSession = !!(await SecureStore.getItemAsync('accessToken'));
      await SecureStore.deleteItemAsync('accessToken');

      // Don't block sign-in / sign-up error handling with full session teardown.
      if (hadSession && !isPublicAuthPath(path)) {
        void Promise.resolve(unauthorizedHandler?.()).catch(() => undefined);
      }
    }

    const status = error.response?.status;
    const body = error.response?.data as
      | { error?: string; message?: string }
      | undefined;
    const billingCode = typeof body?.error === 'string' ? body.error : undefined;
    const isSubscriptionGate =
      status === 402 ||
      billingCode === 'SUBSCRIPTION_REQUIRED' ||
      billingCode === 'SUBSCRIPTION_INACTIVE';

    if (isSubscriptionGate && billingRequiredHandler) {
      void Promise.resolve(
        billingRequiredHandler({
          code: billingCode,
          message: typeof body?.message === 'string' ? body.message : undefined,
        }),
      ).catch(() => undefined);
    }

    const isPlanLimit =
      status === 403 &&
      (billingCode === 'SITE_LIMIT_REACHED' ||
        billingCode === 'USER_LIMIT_REACHED' ||
        billingCode === 'FEATURE_NOT_IN_PLAN');

    if (isPlanLimit && typeof body?.message === 'string' && body.message.trim()) {
      // Surface plan-limit messages once via the billing handler when available;
      // otherwise callers still receive the rejected promise for local alerts.
      void Promise.resolve(
        billingRequiredHandler?.({
          code: billingCode,
          message: body.message,
        }),
      ).catch(() => undefined);
    }

    return Promise.reject(error);
  },
);

export default api;
