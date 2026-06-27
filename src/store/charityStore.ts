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
  locations?: any[];
  canClaimPickupsDirectly?: boolean;
};

export function normalizeCharityUsers(data: any): CharityMember[] {
  const normalizeOne = (user: any, role: string): CharityMember => ({
    ...user,
    id: user.id ?? user.userId,
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    email: user.email ?? '',
    mobile: user.mobile ?? user.phoneNumber ?? '',
    role,
  });

  const combined = [
    ...(data?.headOfficeAdmins || []).map((u: any) => normalizeOne(u, 'HEAD_OFFICE_ADMIN')),
    ...(data?.headOfficeMembers || []).map((u: any) => normalizeOne(u, 'HEAD_OFFICE')),
    ...(data?.locationAdmins || []).map((u: any) => normalizeOne(u, 'LOCATION_ADMIN')),
    ...(data?.teamMembers || []).map((u: any) => normalizeOne(u, 'TEAM_MEMBER')),
    ...(data?.drivers || []).map((u: any) => normalizeOne(u, 'DRIVER')),
  ];

  const seen = new Set<number>();
  return combined.filter((member) => {
    if (!member.id) return true;
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
    if (isFetchingLocations || (!force && !isStale(locationsLastFetched))) return;

    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) return;

    set({ isFetchingLocations: true, error: null });
    try {
      const res = await charityService.listLocations();
      const locations = Array.isArray(res.data)
        ? res.data
        : res.data?.locations || [];
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
    if (isFetchingUsers || (!force && !isStale(usersLastFetched))) return;

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
    get().invalidateLocations();
    return res;
  },

  updateLocation: async (locationId, data) => {
    const res = await charityService.updateLocation(locationId, data);
    get().invalidateLocations();
    return res;
  },

  deactivateLocation: async (locationId) => {
    await charityService.deactivateLocation(locationId);
    get().invalidateLocations();
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
    await charityService.deleteUser(userId);
    get().invalidateUsers();
    set((state) => {
      const next = { ...state.userProfiles };
      delete next[userId];
      return { userProfiles: next };
    });
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
