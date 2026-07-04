import axios, { InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

type UnauthorizedHandler = () => void | Promise<void>;

let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Called from AppContext so a 401 clears session and redirects to login. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
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
    // Let React Native's XHR set Content-Type with the multipart boundary.
    // Bypass axios's transformRequest to prevent any serialization of FormData.
    config.headers.delete('Content-Type');
    config.transformRequest = [(data: any) => data];
  } else if (!config.headers.get('Content-Type')) {
    config.headers.set('Content-Type', 'application/json');
  }

  const method = (config.method ?? 'get').toUpperCase();
  const base = config.baseURL ?? '';
  const path = config.url ?? '';
  const query = config.params
    ? `?${new URLSearchParams(
        Object.entries(config.params).reduce<Record<string, string>>((acc, [key, value]) => {
          if (value != null) acc[key] = String(value);
          return acc;
        }, {}),
      ).toString()}`
    : '';
  console.log(`[API] → ${method} ${base}${path}${query}`);

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
    const method = (response.config.method ?? 'get').toUpperCase();
    const base = response.config.baseURL ?? '';
    const path = response.config.url ?? '';
    console.log(`[API] ← ${response.status} ${method} ${base}${path}`);
    return response;
  },
  async error => {
    const config = error.config;
    const method = (config?.method ?? 'get').toUpperCase();
    const base = config?.baseURL ?? '';
    const path = config?.url ?? '';
    console.log(
      `[API] ← ERROR ${error.response?.status ?? 'NETWORK'} ${method} ${base}${path}`,
      error.response?.data ?? error.message,
    );
    if (!error.response) {
      console.log('[API] Network failure details:', error.code, error.message);
    }

    if (error.response?.status === 401) {
      const path = config?.url ?? '';
      const hadSession = !!(await SecureStore.getItemAsync('accessToken'));
      await SecureStore.deleteItemAsync('accessToken');

      // Don't block sign-in / sign-up error handling with full session teardown.
      if (hadSession && !isPublicAuthPath(path)) {
        void Promise.resolve(unauthorizedHandler?.()).catch(() => undefined);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
