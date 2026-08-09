import { AuthUser } from '../store/types';
import { UserRole } from '../types';

type LoginSiteAccess = {
  siteId: number;
  siteRole: string;
  siteName?: string;
  address?: string;
};

export function buildAuthUserFromProfile(
  profile: any,
  accessToken: string,
  siteAccessFromLogin?: LoginSiteAccess | null,
): AuthUser {
  const siteRole =
    profile?.role?.siteRole ?? siteAccessFromLogin?.siteRole ?? undefined;

  // Seed profile.sites from login siteAccess when /auth/profile omits site rows
  // (common for LOCATION_ADMIN) so headers show the site name, not the org.
  let nextProfile = profile;
  const loginSiteId = Number(siteAccessFromLogin?.siteId);
  const hasSites = Array.isArray(profile?.sites) && profile.sites.length > 0;
  if (!hasSites && Number.isFinite(loginSiteId) && loginSiteId > 0) {
    const siteName =
      siteAccessFromLogin?.siteName?.trim() ||
      `Site ${loginSiteId}`;
    nextProfile = {
      ...profile,
      sites: [
        {
          id: loginSiteId,
          locationName: siteName,
          name: siteName,
          organisationName: siteName,
          address: siteAccessFromLogin?.address || '',
        },
      ],
    };
  } else if (
    hasSites &&
    Number.isFinite(loginSiteId) &&
    loginSiteId > 0
  ) {
    // Prefer the assigned site first when profile returns multiple sites.
    const sites = [...profile.sites];
    const idx = sites.findIndex(
      (site: any) => Number(site?.id ?? site?.siteId) === loginSiteId,
    );
    if (idx > 0) {
      const [assigned] = sites.splice(idx, 1);
      sites.unshift(assigned);
      nextProfile = { ...profile, sites };
    }
  }

  return {
    ...profile.user,
    accessToken,
    platformRole: profile.user?.platformRole ?? 'ORG_USER',
    orgType: profile.organisation?.type,
    orgRole: profile.role?.orgRole,
    siteRole,
    profile: nextProfile,
  };
}

export function resolveUserRole(
  authUser: Pick<AuthUser, 'orgType' | 'orgRole' | 'siteRole'> | null,
  fallback: UserRole = 'restaurant_single',
): UserRole {
  if (!authUser?.orgType) return fallback;

  const orgType = authUser.orgType.toUpperCase();
  const orgRole = authUser.orgRole?.toUpperCase() ?? '';
  const siteRole = authUser.siteRole?.toUpperCase() ?? '';

  if (orgType === 'BUSINESS_MULTI') {
    if (orgRole === 'SUPER_ADMIN') return 'restaurant_multi';
    if (siteRole === 'SITE_ADMIN' || siteRole === 'STAFF') return 'restaurant_single';
    return 'restaurant_multi';
  }

  if (orgType === 'BUSINESS_SINGLE') return 'restaurant_single';

  if (orgType === 'CHARITY_MULTI') {
    // Head-office org role wins even when they also have HQ siteAccess
    // (needed so multi signup with a default site stays on multi tabs).
    const headOfficeRoles = [
      'SUPER_ADMIN',
      'HEAD_OFFICE_ADMIN',
      'HEAD_OFFICE',
    ];
    if (headOfficeRoles.includes(orgRole)) {
      return 'charity_multi';
    }

    const siteRoles = [
      'SITE_ADMIN',
      'LOCATION_ADMIN',
      'TEAM_MEMBER',
      'STAFF',
      'DRIVER',
    ];
    if (siteRoles.includes(siteRole)) return 'charity_single';

    return 'charity_multi';
  }

  if (orgType === 'CHARITY_SINGLE') return 'charity_single';

  if (orgType === 'FARMER_PRODUCER') return 'farm_business';
  if (orgType === 'FARMER_CONSUMER') return 'farmer';
  if (orgType === 'FARMER') return 'farmer';

  return fallback;
}

export function resolveOrganisationAddress(org: {
  businessAddress?: string;
  charityAddress?: string;
  address?: string;
} | null | undefined): string {
  return org?.businessAddress ?? org?.charityAddress ?? org?.address ?? '';
}

/** Prefer organisation address when `preferOrganisation` is set (multi head-office). */
export function resolveProfileDisplayAddress(
  profile: {
    sites?: Array<{ address?: string; pickupRadiusKm?: number; radiusKm?: number }>;
    organisation?: {
      type?: string;
      businessAddress?: string;
      charityAddress?: string;
      address?: string;
      pickupRadiusKm?: number;
    };
  } | null | undefined,
  options?: { preferOrganisation?: boolean },
): string {
  const org = profile?.organisation;
  const site = profile?.sites?.[0];

  if (options?.preferOrganisation) {
    return resolveOrganisationAddress(org) || site?.address || '';
  }

  return site?.address || resolveOrganisationAddress(org);
}

/** Confirmed default pickup radius for charity / collector orgs. */
export const DEFAULT_PICKUP_RADIUS_KM = 50;

export function resolveProfilePickupRadiusKm(profile: {
  sites?: Array<{ pickupRadiusKm?: number; radiusKm?: number }>;
  organisation?: { pickupRadiusKm?: number };
} | null | undefined): string {
  const site = profile?.sites?.[0];
  const value =
    site?.pickupRadiusKm ??
    site?.radiusKm ??
    profile?.organisation?.pickupRadiusKm;

  const numeric = value == null || value === '' ? NaN : Number(value);

  // Fall back to 50 when missing/invalid, or when the old signup default (5) was stored.
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric === 5) {
    return String(DEFAULT_PICKUP_RADIUS_KM);
  }

  return String(numeric);
}
