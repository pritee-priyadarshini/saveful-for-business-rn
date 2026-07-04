import * as SecureStore from 'expo-secure-store';

import api from './api';

const BASE_URL = 'https://s4b.saveful.app/api/v1';

/**
 * Native fetch for multipart PATCH — axios can fail with ERR_NETWORK on RN
 * when uploading files (same issue as signup FormData).
 */
export async function patchFormData(path: string, body: FormData) {
  const url = `${BASE_URL}${path}`;
  const token = await SecureStore.getItemAsync('accessToken');
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  console.log(`[ORG] → PATCH ${url}`);

  const response = await fetch(url, {
    method: 'PATCH',
    body,
    headers,
  });

  const json = await response.json().catch(() => null);
  console.log(`[ORG] ← ${response.status} PATCH ${url}`, json);

  if (!response.ok) {
    const error: any = new Error(json?.message || `Request failed with status ${response.status}`);
    error.response = { status: response.status, data: json };
    throw error;
  }

  return { data: json };
}

export const organizationService = {
  updateCoordinates: (
    organizationId: number | string,
    data: { latitude: number; longitude: number },
  ) => api.patch(`/organization/ccordinates/${organizationId}`, data),

  updateOrganisation: (organizationId: number | string, data: FormData) =>
    patchFormData(`/organization/${organizationId}`, data),
};
