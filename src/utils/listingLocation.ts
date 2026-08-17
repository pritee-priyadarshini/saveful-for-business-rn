import {
  normalizeAuthProfile,
  resolveProfileCoordinates,
} from './coordinates';
import { isBusinessMultiHeadOffice, pickDefaultSite } from './defaultHqSite';
import { useSitesStore } from '../store/sitesStore';

export function getSitePickupCoords(authUser: any): { lat: number; lng: number } | null {
  const profile = normalizeAuthProfile(authUser);
  if (isBusinessMultiHeadOffice(authUser)) {
    const hqSite =
      pickDefaultSite(useSitesStore.getState().sites) ||
      pickDefaultSite(profile?.sites);
    const lat = Number(hqSite?.latitude ?? hqSite?.lat);
    const lng = Number(hqSite?.longitude ?? hqSite?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }
  return resolveProfileCoordinates(profile);
}

export function getSitePostcode(authUser: any): string | undefined {
  const profile = normalizeAuthProfile(authUser);
  const org = profile?.organisation ?? profile?.organization;
  const hqSite = isBusinessMultiHeadOffice(authUser)
    ? pickDefaultSite(useSitesStore.getState().sites) || pickDefaultSite(profile?.sites)
    : null;
  const site = hqSite ?? profile?.sites?.[0] ?? profile?.site;

  return site?.postcode ?? site?.postCode ?? org?.postcode ?? undefined;
}

export {
  formatApiError,
  formatApiErrorMessage,
} from './apiError';
