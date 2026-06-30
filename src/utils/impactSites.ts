import { useCharityStore } from '../store/charityStore';
import { useSitesStore } from '../store/sitesStore';
import { normalizeAuthProfile } from './coordinates';

export type AccessibleSite = {
  id: number;
  name: string;
};

function parseSiteId(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getSiteDisplayName(site: any): string {
  return (
    site?.locationName ||
    site?.organisationName ||
    site?.name ||
    site?.siteName ||
    site?.tradingName ||
    (site?.id != null ? `Site ${site.id}` : 'Site')
  );
}

function sitesFromProfile(authUser: any): AccessibleSite[] {
  const profile = normalizeAuthProfile(authUser);
  const rawSites = Array.isArray(profile?.sites)
    ? profile.sites
    : profile?.site
      ? [profile.site]
      : [];

  const fromSites = rawSites
    .map((site: any) => {
      const id = parseSiteId(site?.id ?? site?.siteId ?? site?.locationId);
      if (!id) return null;
      return { id, name: getSiteDisplayName(site) };
    })
    .filter((site: AccessibleSite | null): site is AccessibleSite => site !== null);

  if (fromSites.length > 0) return fromSites;

  const siteAccesses = profile?.siteAccesses ?? profile?.siteAccess;
  if (!Array.isArray(siteAccesses)) return [];

  return siteAccesses
    .map((access: any) => {
      const site = access?.site ?? access;
      const id = parseSiteId(site?.id ?? access?.siteId);
      if (!id) return null;
      return { id, name: getSiteDisplayName(site) };
    })
    .filter((site: AccessibleSite | null): site is AccessibleSite => site !== null);
}

function isCharityOrg(authUser: any): boolean {
  const orgType = String(
    authUser?.orgType ?? normalizeAuthProfile(authUser)?.organisation?.organizationType ?? '',
  ).toUpperCase();
  return orgType.startsWith('CHARITY');
}

export async function resolveAccessibleSites(authUser: any): Promise<AccessibleSite[]> {
  const fromProfile = sitesFromProfile(authUser);
  if (fromProfile.length > 0) return fromProfile;

  if (isCharityOrg(authUser)) {
    const charityStore = useCharityStore.getState();
    await charityStore.fetchLocations();
    return charityStore.locations
      .map((location: any) => {
        const id = parseSiteId(location?.id ?? location?.locationId);
        if (!id) return null;
        return { id, name: getSiteDisplayName(location) };
      })
      .filter((site: AccessibleSite | null): site is AccessibleSite => site !== null);
  }

  // Farmer producer/consumer and business orgs use the organisation sites endpoint.
  const sitesStore = useSitesStore.getState();
  await sitesStore.fetchOrganisation();
  return (sitesStore.sites ?? [])
    .map((site: any) => {
      const id = parseSiteId(site?.id);
      if (!id) return null;
      return { id, name: getSiteDisplayName(site) };
    })
    .filter((site: AccessibleSite | null): site is AccessibleSite => site !== null);
}

export async function resolveAccessibleSiteIds(authUser: any): Promise<number[]> {
  const sites = await resolveAccessibleSites(authUser);
  return sites.map((site) => site.id);
}
