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

  return {
    ...profile.user,
    accessToken,
    platformRole: profile.user?.platformRole ?? 'ORG_USER',
    orgType: profile.organisation?.type,
    orgRole: profile.role?.orgRole,
    siteRole,
    profile,
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
    const siteRoles = [
      'SITE_ADMIN',
      'LOCATION_ADMIN',
      'TEAM_MEMBER',
      'STAFF',
      'DRIVER',
    ];
    if (siteRoles.includes(siteRole)) return 'charity_single';

    const headOfficeRoles = [
      'SUPER_ADMIN',
      'HEAD_OFFICE_ADMIN',
      'HEAD_OFFICE',
    ];
    if (headOfficeRoles.includes(orgRole) || !siteRole) {
      return 'charity_multi';
    }

    return 'charity_multi';
  }

  if (orgType === 'CHARITY_SINGLE') return 'charity_single';

  if (orgType === 'FARMER_PRODUCER') return 'farm_business';
  if (orgType === 'FARMER_CONSUMER') return 'farmer';
  if (orgType === 'FARMER') return 'farmer';

  return fallback;
}
