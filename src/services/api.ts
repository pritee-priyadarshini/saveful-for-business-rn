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
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync('accessToken');

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
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

    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('accessToken');
      try {
        await unauthorizedHandler?.();
      } catch {
        // session teardown failed — token is already cleared
      }
    }
    return Promise.reject(error);
  },
);

export default api;
