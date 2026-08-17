import * as SecureStore from 'expo-secure-store';

const BASE_URL = 'https://s4b.saveful.app/api/v1';

/**
 * Native fetch for multipart/form-data uploads. React Native's fetch handles
 * FormData file parts correctly, while axios's XHR adapter fails with
 * ERR_NETWORK and surfaces as "Unable to reach the server".
 */
async function sendFormData(method: 'POST' | 'PATCH', path: string, body: FormData) {
  const token = await SecureStore.getItemAsync('accessToken');
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, { method, body, headers });
  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const error: any = new Error(
      json?.message || `Request failed with status ${response.status}`,
    );
    error.response = { status: response.status, data: json };
    throw error;
  }

  return { data: json };
}

export function postFormData(path: string, body: FormData) {
  return sendFormData('POST', path, body);
}

export function patchFormData(path: string, body: FormData) {
  return sendFormData('PATCH', path, body);
}
