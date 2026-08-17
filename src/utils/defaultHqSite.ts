import * as Location from 'expo-location';

import type { CreateSitePayload } from '@/services/sites.service';
import { resolveOrganisationAddress } from '@/utils/authSession';
import {
  normalizeAuthProfile,
  resolveProfileCoordinates,
} from '@/utils/coordinates';
import { extractPostcodeFromText, resolveLocationDetails } from '@/utils/postcode';

const HEAD_OFFICE_ROLES = new Set([
  'SUPER_ADMIN',
  'HEAD_OFFICE_ADMIN',
  'HEAD_OFFICE',
]);

const SITE_ONLY_ROLES = new Set(['SITE_ADMIN', 'STAFF']);

export const VIRTUAL_HQ_SITE_ID = -1;

export type HqOwnerContact = {
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  mobile: string;
};

export function isVirtualHqSiteId(id: unknown): boolean {
  const parsed = Number(id);
  return Number.isFinite(parsed) && parsed <= 0;
}

export function getHqOwnerContact(authUser: any): HqOwnerContact {
  const profile = normalizeAuthProfile(authUser);
  const user = profile?.user ?? authUser;
  const firstName = String(user?.firstName ?? authUser?.firstName ?? '').trim();
  const lastName = String(user?.lastName ?? authUser?.lastName ?? '').trim();
  const name = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Head office';
  const email = String(user?.email ?? authUser?.email ?? '').trim();
  const mobile = String(
    user?.phoneNumber ??
      user?.mobile ??
      authUser?.phoneNumber ??
      authUser?.mobile ??
      '',
  ).trim();
  return { firstName, lastName, name, email, mobile };
}

export function buildVirtualHqSite(authUser: any, organisation?: any) {
  const profile = normalizeAuthProfile(authUser);
  const org =
    organisation ??
    profile?.organisation ??
    profile?.organization ??
    null;
  const owner = getHqOwnerContact(authUser);
  const coords = resolveProfileCoordinates(profile, { preferOrganisation: true });

  return {
    id: VIRTUAL_HQ_SITE_ID,
    siteName: String(org?.name || org?.brandName || 'Head office').trim(),
    address: String(
      resolveOrganisationAddress(org) || org?.businessAddress || '',
    ).trim(),
    postcode: String(org?.postcode || org?.postCode || '').trim(),
    latitude: coords?.lat ?? org?.latitude ?? org?.lat ?? null,
    longitude: coords?.lng ?? org?.longitude ?? org?.lng ?? null,
    contactName: owner.name,
    contactEmail: owner.email,
    phoneNumber: owner.mobile,
    createdAt: org?.createdAt || new Date().toISOString(),
    isActive: true,
    isVirtual: true,
  };
}

function parseId(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseCoord(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isBusinessMultiHeadOffice(authUser: {
  orgType?: string;
  orgRole?: string;
  siteRole?: string;
  profile?: { organisation?: { type?: string }; organization?: { type?: string } };
} | null | undefined): boolean {
  const orgType = String(
    authUser?.orgType ??
      authUser?.profile?.organisation?.type ??
      authUser?.profile?.organization?.type ??
      '',
  ).toUpperCase();
  if (orgType !== 'BUSINESS_MULTI') return false;
  const orgRole = String(authUser?.orgRole ?? '').toUpperCase();
  if (HEAD_OFFICE_ROLES.has(orgRole)) return true;
  const siteRole = String(authUser?.siteRole ?? '').toUpperCase();
  if (SITE_ONLY_ROLES.has(siteRole)) return false;
  return true;
}

export function pickDefaultSite<T extends { id?: unknown; siteId?: unknown; isActive?: boolean; createdAt?: string }>(
  sites: T[] | null | undefined,
): T | null {
  const rows = (Array.isArray(sites) ? sites : [])
    .filter((site) => site && site.isActive !== false)
    .filter((site) => parseId(site.id ?? site.siteId) != null)
    .sort((a, b) => {
      return (
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );
    });
  return rows[0] ?? null;
}

export function pickDefaultSiteId(sites: any[] | null | undefined): number | null {
  const site = pickDefaultSite(sites);
  return parseId(site?.id ?? site?.siteId);
}

/** Keep a preview HQ when the API has no real sites yet (pre-plan). */
export function sitesWithHqFallback(
  sites: any[] | null | undefined,
  authUser: any,
  organisation?: any,
  isHq = isBusinessMultiHeadOffice(authUser),
): any[] {
  const rows = Array.isArray(sites) ? sites : [];
  const live = rows.filter((site) => site && !isVirtualHqSiteId(site.id ?? site.siteId));
  if (live.length > 0) return live;
  if (isHq) {
    return [buildVirtualHqSite(authUser, organisation)];
  }
  return rows;
}

export function extractCreatedSiteId(res: any): number | null {
  const candidates = [
    res?.data?.site?.id,
    res?.data?.data?.site?.id,
    res?.data?.data?.id,
    res?.data?.id,
    res?.site?.id,
    res?.id,
  ];
  for (const raw of candidates) {
    const id = parseId(raw);
    if (id) return id;
  }
  return null;
}

export function extractCreatedSite(res: any): any | null {
  const candidates = [
    res?.data?.site,
    res?.data?.data?.site,
    res?.data?.data,
    res?.data,
    res?.site,
    res,
  ];
  for (const candidate of candidates) {
    const id = parseId(candidate?.id);
    if (id) return { ...candidate, id };
  }
  return null;
}

async function geocodeAddress(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const query = address.trim();
  if (!query) return null;
  try {
    const hits = await Location.geocodeAsync(query);
    const hit = hits[0];
    const latitude = parseCoord(hit?.latitude);
    const longitude = parseCoord(hit?.longitude);
    if (latitude == null || longitude == null) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}

function fallbackPostcode(org: any): string {
  const region = String(org?.region ?? '').toUpperCase();
  if (region === 'IN') return '000000';
  return '0000';
}

export async function buildDefaultHqSitePayload(
  authUser: any,
  organisation?: any,
): Promise<CreateSitePayload | null> {
  const profile = normalizeAuthProfile(authUser);
  const org =
    organisation ??
    profile?.organisation ??
    profile?.organization ??
    authUser?.profile?.organisation ??
    null;
  const defaultSite = pickDefaultSite(profile?.sites);

  const siteName = String(
    defaultSite?.siteName ||
      defaultSite?.locationName ||
      defaultSite?.name ||
      org?.name ||
      org?.brandName ||
      org?.businessName ||
      'Head office',
  ).trim();

  const address = String(
    defaultSite?.address ||
      resolveOrganisationAddress(org) ||
      org?.businessAddress ||
      profile?.organisation?.businessAddress ||
      '',
  ).trim();

  const resolvedCoords = resolveProfileCoordinates(profile, { preferOrganisation: true });
  let latitude =
    parseCoord(defaultSite?.latitude ?? defaultSite?.lat) ??
    parseCoord(org?.latitude ?? org?.lat) ??
    parseCoord(org?.location?.latitude ?? org?.location?.lat) ??
    resolvedCoords?.lat ??
    null;
  let longitude =
    parseCoord(defaultSite?.longitude ?? defaultSite?.lng) ??
    parseCoord(org?.longitude ?? org?.lng) ??
    parseCoord(org?.location?.longitude ?? org?.location?.lng) ??
    resolvedCoords?.lng ??
    null;

  if ((latitude == null || longitude == null) && address) {
    const geocoded = await geocodeAddress(address);
    if (geocoded) {
      latitude = geocoded.latitude;
      longitude = geocoded.longitude;
    }
  }

  if (!siteName || !address || latitude == null || longitude == null) {
    return null;
  }

  let postcode = String(
    defaultSite?.postcode ||
      defaultSite?.postCode ||
      org?.postcode ||
      org?.postCode ||
      '',
  ).trim();

  if (!postcode) {
    postcode = extractPostcodeFromText(address);
  }

  if (!postcode) {
    const resolved = await resolveLocationDetails(latitude, longitude, { address });
    postcode = resolved.postcode;
  }

  if (!postcode) {
    postcode = fallbackPostcode(org);
  }

  return {
    siteName,
    address,
    postcode,
    latitude,
    longitude,
  };
}
