import {
  normalizeAuthProfile,
  resolveProfileCoordinates,
} from './coordinates';

export function getSitePickupCoords(authUser: any): { lat: number; lng: number } | null {
  const profile = normalizeAuthProfile(authUser);
  return resolveProfileCoordinates(profile);
}

export function getSitePostcode(authUser: any): string | undefined {
  const profile = normalizeAuthProfile(authUser);
  const site = profile?.sites?.[0] ?? profile?.site;
  const org = profile?.organisation ?? profile?.organization;

  return site?.postcode ?? org?.postcode ?? undefined;
}

export function formatApiErrorMessage(message: unknown, fallback: string) {
  if (Array.isArray(message)) return message.join('\n');
  if (typeof message === 'string' && message.trim()) return message;
  if (message && typeof message === 'object') {
    const nested = (message as { message?: unknown }).message;
    if (Array.isArray(nested)) return nested.join('\n');
    if (typeof nested === 'string' && nested.trim()) return nested;
  }
  return fallback;
}

export function formatApiError(error: any, fallback: string) {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const message = formatApiErrorMessage(
    data?.message ?? data?.error,
    fallback,
  );

  if (status) {
    return `${message}${message.includes(String(status)) ? '' : ` (HTTP ${status})`}`;
  }

  return message;
}
