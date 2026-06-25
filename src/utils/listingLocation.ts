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

export {
  formatApiError,
  formatApiErrorMessage,
} from './apiError';
