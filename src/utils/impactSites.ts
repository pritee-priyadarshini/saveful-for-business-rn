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

function isBusinessMultiOrg(authUser: any): boolean {
  const orgType = String(
    authUser?.orgType ?? normalizeAuthProfile(authUser)?.organisation?.organizationType ?? '',
  ).toUpperCase();
  return orgType === 'BUSINESS_MULTI' || orgType === 'FARMER_PRODUCER';
}

function mergeSites(...groups: AccessibleSite[][]): AccessibleSite[] {
  const byId = new Map<number, AccessibleSite>();
  for (const group of groups) {
    for (const site of group) {
      byId.set(site.id, site);
    }
  }
  return [...byId.values()];
}

export async function resolveAccessibleSites(authUser: any): Promise<AccessibleSite[]> {
  const fromProfile = sitesFromProfile(authUser);

  if (isCharityOrg(authUser)) {
    // Multi-charity SUPER_ADMIN often has no siteAccess rows in the profile.
    // Always load charity locations so Impact can query every org site.
    try {
      const charityStore = useCharityStore.getState();
      await charityStore.fetchLocations(true);
      const fromLocations = charityStore.locations
        .map((location: any) => {
          const id = parseSiteId(location?.id ?? location?.locationId);
          if (!id) return null;
          return { id, name: getSiteDisplayName(location) };
        })
        .filter((site: AccessibleSite | null): site is AccessibleSite => site !== null);

      if (fromLocations.length > 0) {
        return mergeSites(fromProfile, fromLocations);
      }
    } catch {
      // Fall through to profile sites.
    }
  }

  if (isBusinessMultiOrg(authUser)) {
    // Multi-restaurant / farm-business SUPER_ADMIN may lack siteAccess on every site.
    // Always load organisation sites for Impact site picker + aggregation.
    try {
      const sitesStore = useSitesStore.getState();
      await sitesStore.fetchOrganisation(true);
      const fromOrg = (sitesStore.sites ?? [])
        .map((site: any) => {
          const id = parseSiteId(site?.id);
          if (!id) return null;
          return { id, name: getSiteDisplayName(site) };
        })
        .filter((site: AccessibleSite | null): site is AccessibleSite => site !== null);

      if (fromOrg.length > 0) {
        return mergeSites(fromProfile, fromOrg);
      }
    } catch {
      // Fall through.
    }
  }

  if (fromProfile.length > 0) return fromProfile;

  // Farmer consumer and single-site business orgs use the organisation sites endpoint.
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
