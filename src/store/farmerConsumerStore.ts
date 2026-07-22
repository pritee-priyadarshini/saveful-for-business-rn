import { create } from 'zustand';

import {
  farmerConsumerService,
  type AddFarmerConsumerMemberPayload,
  type UpdateFarmerConsumerMemberPayload,
} from '../services/farmerConsumer.service';
import { useAuthStore } from './authStore';
import { getUserFriendlyErrorMessage } from '../utils/apiError';

const STALE_TIME_MS = 5 * 60 * 1000;

function isStale(lastFetched: number | null): boolean {
  return !lastFetched || Date.now() - lastFetched > STALE_TIME_MS;
}

export type FarmerConsumerMember = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  role: string;
  isActive?: boolean;
  siteRole?: string | null;
  canClaimPickupsDirectly?: boolean;
};

function roleFromSiteRole(siteRole: string | null | undefined, fallback: string): string {
  switch (siteRole) {
    case 'SITE_ADMIN':
      return 'ADMIN';
    case 'STAFF':
      return 'TEAM_MEMBER';
    case 'DRIVER':
      return 'DRIVER';
    default:
      return fallback;
  }
}

function mapMember(raw: any, fallbackRole: string): FarmerConsumerMember {
  const siteRole = raw?.siteRole ?? raw?.site?.siteRole ?? null;
  const role =
    fallbackRole === 'SUPER_ADMIN'
      ? 'SUPER_ADMIN'
      : roleFromSiteRole(siteRole, fallbackRole);

  return {
    id: Number(raw?.id ?? raw?.userId ?? 0),
    firstName: String(raw?.firstName ?? ''),
    lastName: String(raw?.lastName ?? ''),
    email: String(raw?.email ?? ''),
    mobile: String(raw?.mobile ?? raw?.phoneNumber ?? ''),
    role,
    isActive: raw?.isActive !== false,
    siteRole,
    canClaimPickupsDirectly: Boolean(raw?.canClaimPickupsDirectly),
  };
}

export function normalizeFarmerConsumerUsers(data: any): FarmerConsumerMember[] {
  const combined = [
    ...(data?.admins ?? []).map((item: any) => mapMember(item, 'SUPER_ADMIN')),
    ...(data?.teamMembers ?? []).map((item: any) => mapMember(item, 'TEAM_MEMBER')),
    ...(data?.drivers ?? []).map((item: any) => mapMember(item, 'DRIVER')),
  ];

  const seen = new Set<number>();
  return combined.filter((member) => {
    if (!member.id || member.isActive === false) return false;
    if (seen.has(member.id)) return false;
    seen.add(member.id);
    return true;
  });
}

interface FarmerConsumerState {
  users: FarmerConsumerMember[];
  isFetchingUsers: boolean;
  usersLastFetched: number | null;
  error: string | null;
}

interface FarmerConsumerActions {
  fetchUsers: (force?: boolean) => Promise<void>;
  addMember: (data: AddFarmerConsumerMemberPayload) => Promise<any>;
  updateUser: (userId: number, data: UpdateFarmerConsumerMemberPayload) => Promise<any>;
  deleteUser: (userId: number) => Promise<void>;
  invalidateUsers: () => void;
  reset: () => void;
}

const INITIAL: FarmerConsumerState = {
  users: [],
  isFetchingUsers: false,
  usersLastFetched: null,
  error: null,
};

export const useFarmerConsumerStore = create<FarmerConsumerState & FarmerConsumerActions>(
  (set, get) => ({
    ...INITIAL,

    fetchUsers: async (force = false) => {
      const { isFetchingUsers, usersLastFetched } = get();
      if (isFetchingUsers && !force) return;
      if (!force && !isStale(usersLastFetched)) return;

      const { authUser } = useAuthStore.getState();
      if (!authUser?.accessToken) return;

      set({ isFetchingUsers: true, error: null });
      try {
        const res = await farmerConsumerService.listUsers();
        const users = normalizeFarmerConsumerUsers(res.data);
        set({ users, usersLastFetched: Date.now() });
      } catch (error: unknown) {
        const message = getUserFriendlyErrorMessage(error, 'Failed to load team members');
        set({ error: message });
        throw new Error(message);
      } finally {
        set({ isFetchingUsers: false });
      }
    },

    addMember: async (data) => {
      const res = await farmerConsumerService.addMember(data);
      get().invalidateUsers();
      return res;
    },

    updateUser: async (userId, data) => {
      const res = await farmerConsumerService.updateUser(userId, data);
      get().invalidateUsers();
      return res;
    },

    deleteUser: async (userId) => {
      try {
        await farmerConsumerService.deleteUser(userId);
      } catch {
        await farmerConsumerService.deactivateUser(userId);
      }

      set((state) => ({
        users: state.users.filter((user) => user.id !== userId),
        usersLastFetched: Date.now(),
      }));

      try {
        const res = await farmerConsumerService.listUsers();
        set({
          users: normalizeFarmerConsumerUsers(res.data).filter((user) => user.id !== userId),
          usersLastFetched: Date.now(),
        });
      } catch {
        // Keep optimistic removal if refetch fails.
      }
    },

    invalidateUsers: () => set({ usersLastFetched: null }),

    reset: () => set(INITIAL),
  }),
);
