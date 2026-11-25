import axios, { InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Skip the global 402 / plan-required prompt for this request. */
    skipBillingHandler?: boolean;
    /** Skip session teardown on 401 — used for explore/read calls that can 401 without a site or plan. */
    skipUnauthorizedHandler?: boolean;
  }
}

type UnauthorizedHandler = () => void | Promise<void>;
type BillingRequiredHandler = (payload: {
  code?: string;
  message?: string;
}) => void | Promise<void>;

type ModuleRequiredHandler = (payload: {
  module: 'MFC' | 'CONNECT';
  message?: string;
}) => void | Promise<void>;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let billingRequiredHandler: BillingRequiredHandler | null = null;
let moduleRequiredHandler: ModuleRequiredHandler | null = null;

/** Called from AppContext so a 401 clears session and redirects to login. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

/** Called from AppNavigator so 402 / subscription-required routes to Plans. */
export function setBillingRequiredHandler(handler: BillingRequiredHandler | null) {
  billingRequiredHandler = handler;
}

/**
 * Called from AppNavigator so a 402 MODULE_REQUIRED (the plan lacks Make Food
 * Count or Saveful Connect) opens that module's upsell. Until one is registered,
 * the plan-required handler shows the server's message instead.
 */
export function setModuleRequiredHandler(handler: ModuleRequiredHandler | null) {
  moduleRequiredHandler = handler;
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

  const method = String(config.method || 'get').toLowerCase();
  const isRead = method === 'get' || method === 'head';
  if (isRead) {
    // Nest whitelist DTOs treat a JSON body on GET as extra properties
    // (e.g. leftover isDefault) and reject the request.
    config.data = undefined;
    config.headers.delete('Content-Type');
  } else if (isFormData(config.data)) {
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

    const status = error.response?.status;
    const body = error.response?.data as
      | { error?: string; message?: string; module?: string }
      | undefined;
    const billingCode = typeof body?.error === 'string' ? body.error : undefined;
    const billingMessage = typeof body?.message === 'string' ? body.message : '';
    // The org has a plan, just not this module — an upsell, not "choose a plan".
    const isModuleRequired = billingCode === 'MODULE_REQUIRED';
    const isSubscriptionGate =
      !isModuleRequired &&
      (status === 402 ||
        billingCode === 'SUBSCRIPTION_REQUIRED' ||
        billingCode === 'SUBSCRIPTION_INACTIVE' ||
        /subscription|choose a plan|free trial|billing required/i.test(
          billingMessage,
        ));

    // A missing plan can come back as 401. Never treat that as a signed-out session.
    if (error.response?.status === 401 && !isSubscriptionGate && !config?.skipUnauthorizedHandler) {
      const path = config?.url ?? '';
      const hadSession = !!(await SecureStore.getItemAsync('accessToken'));
      await SecureStore.deleteItemAsync('accessToken');

      // Don't block sign-in / sign-up error handling with full session teardown.
      if (hadSession && !isPublicAuthPath(path)) {
        void Promise.resolve(unauthorizedHandler?.()).catch(() => undefined);
      }
    }

    const method = String(config?.method || 'get').toLowerCase();
    const isReadRequest = method === 'get' || method === 'head';
    // Reads (Home, listings, entitlements) must not force the plan modal —
    // HQ can explore without a plan. Writes still prompt.
    if (
      isSubscriptionGate &&
      billingRequiredHandler &&
      !config?.skipBillingHandler &&
      !isReadRequest
    ) {
      void Promise.resolve(
        billingRequiredHandler({
          code: billingCode,
          message: billingMessage || undefined,
        }),
      ).catch(() => undefined);
    }

    if (isModuleRequired && !config?.skipBillingHandler && !isReadRequest) {
      const module = body?.module === 'MFC' || body?.module === 'CONNECT' ? body.module : null;
      if (module && moduleRequiredHandler) {
        void Promise.resolve(
          moduleRequiredHandler({ module, message: billingMessage || undefined }),
        ).catch(() => undefined);
      } else {
        void Promise.resolve(
          billingRequiredHandler?.({ code: billingCode, message: billingMessage || undefined }),
        ).catch(() => undefined);
      }
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
