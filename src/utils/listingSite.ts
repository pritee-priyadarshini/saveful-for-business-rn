import { useSitesStore } from '../store/sitesStore';
import { normalizeAuthProfile } from './coordinates';

function getListingSiteId(authUser: any): number | null {
  const profile = normalizeAuthProfile(authUser);
  const site = profile?.sites?.[0] ?? profile?.site;
  const id = site?.id;

  if (id === null || id === undefined || id === '') {
    return null;
  }

  const parsed = Number(id);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function resolveListingSiteId(authUser: any): Promise<number | null> {
  const fromProfile = getListingSiteId(authUser);
  if (fromProfile) return fromProfile;

  const store = useSitesStore.getState();
  await store.fetchOrganisation();
  const sites = store.sites;
  const site = Array.isArray(sites) ? sites[0] : null;
  const id = site?.id;

  if (id === null || id === undefined || id === '') {
    return null;
  }

  const parsed = Number(id);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
