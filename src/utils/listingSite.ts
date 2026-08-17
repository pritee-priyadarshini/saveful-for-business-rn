import { useSitesStore } from '../store/sitesStore';
import { useAuthStore } from '../store/authStore';
import { normalizeAuthProfile } from './coordinates';
import { isBusinessMultiHeadOffice, isVirtualHqSiteId, pickDefaultSiteId } from './defaultHqSite';

function isHqUser(authUser: any): boolean {
  return (
    isBusinessMultiHeadOffice(authUser) ||
    useAuthStore.getState().selectedRole === 'restaurant_multi'
  );
}

function getListingSiteId(authUser: any): number | null {
  const profile = normalizeAuthProfile(authUser);
  if (isHqUser(authUser)) {
    const fromProfile = pickDefaultSiteId(profile?.sites);
    if (fromProfile) return fromProfile;
  }

  const site = profile?.sites?.[0] ?? profile?.site;
  const id = site?.id;

  if (id === null || id === undefined || id === '') {
    return null;
  }

  const parsed = Number(id);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function resolveListingSiteId(authUser: any): Promise<number | null> {
  if (isHqUser(authUser)) {
    const store = useSitesStore.getState();
    const hqId = await store.ensureDefaultHqSite();
    if (hqId && !isVirtualHqSiteId(hqId)) return hqId;
  }

  const fromProfile = getListingSiteId(authUser);
  if (fromProfile) return fromProfile;

  const store = useSitesStore.getState();
  await store.fetchOrganisation();
  const fromOrg = pickDefaultSiteId(store.sites);
  if (fromOrg) return fromOrg;

  const site = Array.isArray(store.sites) ? store.sites[0] : null;
  const id = site?.id;

  if (id === null || id === undefined || id === '') {
    return null;
  }

  const parsed = Number(id);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
