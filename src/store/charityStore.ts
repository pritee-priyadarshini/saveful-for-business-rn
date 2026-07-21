import { create } from 'zustand';
import {
  charityService,
  CharityMemberRole,
  AddCharityLocationPayload,
  UpdateCharityLocationPayload,
  AddCharityMemberPayload,
  UpdateCharityMemberPayload,
} from '../services/charity.service';
import { useAuthStore } from './authStore';
import { getUserFriendlyErrorMessage } from '../utils/apiError';

const STALE_TIME_MS = 5 * 60 * 1000;

function isStale(lastFetched: number | null): boolean {
  return !lastFetched || Date.now() - lastFetched > STALE_TIME_MS;
}

export type CharityMember = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  role: string;
  isActive?: boolean;
  locations?: any[];
  canClaimPickupsDirectly?: boolean;
};

export function normalizeCharityLocations(data: any): any[] {
  const raw = Array.isArray(data) ? data : data?.locations || [];

  return raw
    .map((location: any) => ({
      ...location,
      id: location.id ?? location.locationId,
      locationName:
        location.locationName ?? location.name ?? location.siteName ?? '',
      postcode: location.postcode ?? location.postCode ?? '',
      pickupRadiusKm: location.pickupRadiusKm ?? location.radiusKm,
      logoUrl: location.logoUrl ?? null,
      isActive: location.isActive ?? true,
    }))
    .filter((location: any) => location.isActive !== false && location.id != null);
}

export function extractCharityLocationId(data: any): number | null {
  const candidate =
    data?.id ??
    data?.locationId ??
    data?.location?.id ??
    data?.site?.id;

  if (candidate == null || candidate === '') return null;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) ? parsed : null;
}

function collectUserSources(raw: any): any[] {
  if (raw == null || typeof raw !== 'object') return [];

  const nested = [raw.user, raw.profile, raw.member, raw.membership, raw.orgUser, raw.account];
  return [raw, ...nested.filter((source) => source && typeof source === 'object')];
}

function parseActiveFlag(value: unknown): boolean | undefined {
  if (value === null) return false;
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  }

  return undefined;
}

function readActiveFlag(source: any): boolean | undefined {
  if (!source || typeof source !== 'object') return undefined;

  const isActive = parseActiveFlag(source.isActive);
  if (isActive !== undefined) return isActive;

  return parseActiveFlag(source.active);
}

export function isCharityUserActive(raw: any, role?: string): boolean {
  const sources = collectUserSources(raw);
  if (!sources.length) return false;

  for (const source of sources) {
    const activeFlag = readActiveFlag(source);
    if (activeFlag === false) return false;

    if (source.isDeleted === true || source.deleted === true) return false;
    if (source.deletedAt != null && source.deletedAt !== '') return false;

    const status = String(source.status ?? '').toLowerCase();
    if (status === 'inactive' || status === 'deleted' || status === 'deactivated') {
      return false;
    }
  }

  for (const source of sources) {
    const activeFlag = readActiveFlag(source);
    if (activeFlag === true) return true;
  }

  if (role === 'HEAD_OFFICE_ADMIN' || role === 'HEAD_OFFICE') {
    return true;
  }

  // No inactive signals — treat as active (API often omits isActive on valid members).
  return true;
}

function resolveCharityUserRecord(raw: any, role: string): CharityMember {
  const sources = collectUserSources(raw);

  const pick = <T,>(getter: (source: any) => T | null | undefined, fallback: T): T => {
    for (const source of sources) {
      const value = getter(source);
      if (value !== undefined && value !== null && value !== '') {
        return value as T;
      }
    }
    return fallback;
  };

  const id = pick((source) => source.id ?? source.userId, 0);

  return {
    id,
    firstName: pick((source) => source.firstName, ''),
    lastName: pick((source) => source.lastName, ''),
    email: pick((source) => source.email, ''),
    mobile: pick((source) => source.mobile ?? source.phoneNumber, ''),
    role,
    isActive: isCharityUserActive(raw, role),
    locations: raw.locations ?? raw.user?.locations,
    canClaimPickupsDirectly:
      raw.canClaimPickupsDirectly ?? raw.user?.canClaimPickupsDirectly,
  };
}

function mapRoleGroup(
  items: any[] | undefined,
  role: string,
  forcedActive?: boolean,
): CharityMember[] {
  return (items ?? []).map((item) => {
    const record =
      forcedActive === false
        ? { ...item, isActive: false, user: item.user ? { ...item.user, isActive: false } : item.user }
        : item;
    return resolveCharityUserRecord(record, role);
  });
}

export function normalizeCharityUsers(data: any): CharityMember[] {
  const combined = [
    ...mapRoleGroup(data?.headOfficeAdmins, 'HEAD_OFFICE_ADMIN'),
    ...mapRoleGroup(data?.headOfficeMembers, 'HEAD_OFFICE'),
    ...mapRoleGroup(data?.locationAdmins, 'LOCATION_ADMIN'),
    ...mapRoleGroup(data?.teamMembers, 'TEAM_MEMBER'),
    ...mapRoleGroup(data?.drivers, 'DRIVER'),
    ...mapRoleGroup(data?.inactiveHeadOfficeAdmins, 'HEAD_OFFICE_ADMIN', false),
    ...mapRoleGroup(data?.inactiveHeadOfficeMembers, 'HEAD_OFFICE', false),
    ...mapRoleGroup(data?.inactiveLocationAdmins, 'LOCATION_ADMIN', false),
    ...mapRoleGroup(data?.inactiveTeamMembers, 'TEAM_MEMBER', false),
    ...mapRoleGroup(data?.inactiveDrivers, 'DRIVER', false),
    ...(Array.isArray(data?.users)
      ? data.users.map((item: any) =>
          resolveCharityUserRecord(item, String(item.role ?? item.memberRole ?? 'TEAM_MEMBER')),
        )
      : []),
  ];

  const seen = new Set<number>();
  return combined.filter((member) => {
    if (member.isActive !== true) return false;
    if (!member.id) return false;
    if (seen.has(member.id)) return false;
    seen.add(member.id);
    return true;
  });
}

interface CharityState {
  locations: any[];
  users: CharityMember[];
  userProfiles: Record<number, CharityMember>;
  isFetchingLocations: boolean;
  isFetchingUsers: boolean;
  isFetchingUser: boolean;
  locationsLastFetched: number | null;
  usersLastFetched: number | null;
  error: string | null;
}

interface CharityActions {
  fetchLocations: (force?: boolean) => Promise<void>;
  fetchUsers: (force?: boolean) => Promise<void>;
  fetchUser: (userId: number, force?: boolean) => Promise<CharityMember | null>;
  addLocation: (data: AddCharityLocationPayload) => Promise<any>;
  updateLocation: (
    locationId: number | string,
    data: UpdateCharityLocationPayload,
  ) => Promise<any>;
  deactivateLocation: (locationId: number) => Promise<void>;
  addMember: (data: AddCharityMemberPayload) => Promise<any>;
  updateUser: (userId: number, data: UpdateCharityMemberPayload) => Promise<any>;
  deleteUser: (userId: number) => Promise<void>;
  removeUserFromLocation: (userId: number, locationId: number) => Promise<void>;
  updateOrganisation: (orgId: number | string, data: FormData) => Promise<any>;
  invalidateLocations: () => void;
  invalidateUsers: () => void;
  reset: () => void;
}

const INITIAL: CharityState = {
  locations: [],
  users: [],
  userProfiles: {},
  isFetchingLocations: false,
  isFetchingUsers: false,
  isFetchingUser: false,
  locationsLastFetched: null,
  usersLastFetched: null,
  error: null,
};

export const useCharityStore = create<CharityState & CharityActions>((set, get) => ({
  ...INITIAL,

  fetchLocations: async (force = false) => {
    const { isFetchingLocations, locationsLastFetched } = get();
    if (isFetchingLocations && !force) return;
    if (!force && !isStale(locationsLastFetched)) return;

    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) return;

    set({ isFetchingLocations: true, error: null });
    try {
      const res = await charityService.listLocations();
      const locations = normalizeCharityLocations(res.data);
      set({ locations, locationsLastFetched: Date.now() });
    } catch (error: unknown) {
      const message = getUserFriendlyErrorMessage(error, 'Failed to load locations');
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ isFetchingLocations: false });
    }
  },

  fetchUsers: async (force = false) => {
    const { isFetchingUsers, usersLastFetched } = get();
    if (isFetchingUsers && !force) return;
    if (!force && !isStale(usersLastFetched)) return;

    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) return;

    set({ isFetchingUsers: true, error: null });
    try {
      const res = await charityService.listUsers();
      const users = normalizeCharityUsers(res.data);
      set({ users, usersLastFetched: Date.now() });
    } catch (error: unknown) {
      const message = getUserFriendlyErrorMessage(error, 'Failed to load team members');
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ isFetchingUsers: false });
    }
  },

  fetchUser: async (userId, force = false) => {
    const cached = get().userProfiles[userId];
    if (!force && cached) return cached;

    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) return null;

    set({ isFetchingUser: true, error: null });
    try {
      const userRes = await charityService.getUser(userId);
      const user = userRes?.data as CharityMember | null;
      if (user) {
        set((state) => ({
          userProfiles: { ...state.userProfiles, [userId]: user },
        }));
      }
      return user;
    } catch (error: unknown) {
      const message = getUserFriendlyErrorMessage(error, 'Failed to load profile');
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ isFetchingUser: false });
    }
  },

  addLocation: async (data) => {
    const res = await charityService.addLocation(data);
    const createdId = extractCharityLocationId(res.data);
    if (createdId) {
      set((state) => ({
        locationsLastFetched: Date.now(),
        locations: [
          ...state.locations.filter((location) => location.id !== createdId),
          {
            id: createdId,
            locationName: data.locationName,
            address: data.address,
            postcode: data.postcode,
            pickupRadiusKm: data.radiusKm,
            latitude: data.latitude,
            longitude: data.longitude,
            isActive: true,
          },
        ],
      }));
    } else {
      get().invalidateLocations();
    }
    return res;
  },

  updateLocation: async (locationId, data) => {
    const res = await charityService.updateLocation(locationId, data);
    get().invalidateLocations();
    return res;
  },

  deactivateLocation: async (locationId) => {
    await charityService.deactivateLocation(locationId);
    set((state) => ({
      locations: state.locations.filter((location) => location.id !== locationId),
      locationsLastFetched: Date.now(),
    }));
  },

  addMember: async (data) => {
    const res = await charityService.addMember(data);
    get().invalidateUsers();
    return res;
  },

  updateUser: async (userId, data) => {
    const res = await charityService.updateUser(userId, data);
    get().invalidateUsers();
    set((state) => {
      const next = { ...state.userProfiles };
      delete next[userId];
      return { userProfiles: next };
    });
    return res;
  },

  deleteUser: async (userId) => {
    try {
      await charityService.deleteUser(userId);
    } catch (error) {
      await charityService.deactivateUser(userId);
    }

    set((state) => {
      const nextProfiles = { ...state.userProfiles };
      delete nextProfiles[userId];
      return {
        users: state.users.filter((user) => user.id !== userId),
        usersLastFetched: Date.now(),
        userProfiles: nextProfiles,
      };
    });

    try {
      const res = await charityService.listUsers();
      const users = normalizeCharityUsers(res.data).filter((user) => user.id !== userId);
      set({ users, usersLastFetched: Date.now() });
    } catch {
      // Keep optimistic removal if refetch fails.
    }
  },

  removeUserFromLocation: async (userId, locationId) => {
    await charityService.removeUserFromLocation(userId, locationId);
    get().invalidateUsers();

    try {
      const res = await charityService.listUsers();
      set({
        users: normalizeCharityUsers(res.data),
        usersLastFetched: Date.now(),
      });
    } catch {
      // Caller can refetch if needed.
    }
  },

  updateOrganisation: async (orgId, data) => {
    const res = await charityService.updateOrganisation(orgId, data);
    return res;
  },

  invalidateLocations: () => set({ locationsLastFetched: null }),

  invalidateUsers: () => set({ usersLastFetched: null }),

  reset: () => set(INITIAL),
}));

export { CharityMemberRole };
