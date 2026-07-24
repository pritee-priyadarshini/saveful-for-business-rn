import { create } from 'zustand';
import {
  sitesService,
  CreateSitePayload,
  AssignManagerPayload,
  AddStaffPayload,
  UpdateSitePayload,
} from '../services/sites.service';
import { useAuthStore } from './authStore';
import { getUserFriendlyErrorMessage } from '../utils/apiError';

const STALE_TIME_MS = 5 * 60 * 1000;

function isStale(lastFetched: number | null): boolean {
  return !lastFetched || Date.now() - lastFetched > STALE_TIME_MS;
}

export type SiteWithManager = {
  id: number;
  tradingName: string;
  address: string;
  postCode: string;
  managerId: number | null;
  contactName: string;
  email: string;
  mobile: string;
  logo: null;
};

export type SiteStaffMember = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  role: string;
};

function formatStaff(staffData: any[]): SiteStaffMember[] {
  return (staffData || []).map((item: any) => ({
    id: item.user?.id ?? item.userId,
    firstName: item.user?.firstName ?? '',
    lastName: item.user?.lastName ?? '',
    email: item.user?.email ?? '',
    mobile: item.user?.phoneNumber ?? '',
    role: item.siteRole ?? '',
  }));
}

function formatSiteWithManager(site: any, staff: any[]): SiteWithManager {
  const managerEntry = staff.find((u: any) => u.siteRole === 'SITE_ADMIN');
  const manager = managerEntry?.user;

  return {
    id: site.id,
    tradingName: site.siteName,
    address: site.address,
    postCode: site.postcode,
    managerId: managerEntry?.userId ?? null,
    contactName: manager
      ? `${manager.firstName} ${manager.lastName}`
      : 'Manager not yet assigned',
    email: manager?.email || '-',
    mobile: manager?.phoneNumber || '-',
    logo: null,
  };
}

interface SitesState {
  organisation: any | null;
  subscription: any | null;
  sites: any[];
  sitesWithManagers: SiteWithManager[];
  staffBySiteId: Record<number, SiteStaffMember[]>;
  firstSiteId: number | null;
  maxUsersPerSite: number;
  isFetching: boolean;
  isFetchingManagers: boolean;
  lastFetched: number | null;
  managersLastFetched: number | null;
  error: string | null;
}

interface SitesActions {
  fetchOrganisation: (force?: boolean) => Promise<void>;
  fetchSitesWithManagers: (force?: boolean) => Promise<void>;
  fetchStaff: (siteId: number, force?: boolean) => Promise<SiteStaffMember[]>;
  fetchFirstSiteTeam: (force?: boolean) => Promise<void>;
  getFirstSiteId: () => Promise<number | null>;
  createSite: (data: CreateSitePayload) => Promise<any>;
  assignManager: (siteId: number, data: AssignManagerPayload) => Promise<any>;
  addStaff: (siteId: number, data: AddStaffPayload) => Promise<any>;
  updateSite: (siteId: number, data: UpdateSitePayload) => Promise<any>;
  deleteSite: (siteId: number) => Promise<void>;
  removeAccess: (siteId: number, userId: number) => Promise<void>;
  invalidate: () => void;
  reset: () => void;
}

const INITIAL: SitesState = {
  organisation: null,
  subscription: null,
  sites: [],
  sitesWithManagers: [],
  staffBySiteId: {},
  firstSiteId: null,
  maxUsersPerSite: 0,
  isFetching: false,
  isFetchingManagers: false,
  lastFetched: null,
  managersLastFetched: null,
  error: null,
};

export const useSitesStore = create<SitesState & SitesActions>((set, get) => ({
  ...INITIAL,

  fetchOrganisation: async (force = false) => {
    const { isFetching, lastFetched } = get();
    if (isFetching || (!force && !isStale(lastFetched))) return;

    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) return;

    set({ isFetching: true, error: null });
    try {
      const res = await sitesService.getOrganisation();
      const data = res.data;
      const sites: any[] = Array.isArray(data)
        ? data
        : (data?.sites ?? data?.data ?? []);

      set({
        organisation: data?.organisation ?? null,
        subscription: data?.subscription ?? null,
        sites,
        firstSiteId: sites[0]?.id ?? null,
        maxUsersPerSite: data?.subscription?.plan?.maxUsersPerSite ?? 0,
        lastFetched: Date.now(),
      });
    } catch (error: unknown) {
      const message = getUserFriendlyErrorMessage(error, 'Failed to load sites');
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ isFetching: false });
    }
  },

  fetchSitesWithManagers: async (force = false) => {
    const { isFetchingManagers, managersLastFetched } = get();
    if (isFetchingManagers || (!force && !isStale(managersLastFetched))) return;

    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) return;

    set({ isFetchingManagers: true, error: null });
    try {
      const res = await sitesService.getOrganisation();
      const data = res.data;
      const rawSites: any[] = data?.sites || [];

      const sitesWithManagers = await Promise.all(
        rawSites.map(async (site) => {
          try {
            const staffRes = await sitesService.listStaff(site.id);
            const staff = staffRes.data || [];
            return formatSiteWithManager(site, staff);
          } catch {
            return formatSiteWithManager(site, []);
          }
        }),
      );

      const staffBySiteId: Record<number, SiteStaffMember[]> = {};
      await Promise.all(
        rawSites.map(async (site) => {
          try {
            const staffRes = await sitesService.listStaff(site.id);
            staffBySiteId[site.id] = formatStaff(staffRes.data || []);
          } catch {
            staffBySiteId[site.id] = [];
          }
        }),
      );

      set({
        organisation: data?.organisation ?? null,
        subscription: data?.subscription ?? null,
        sites: rawSites,
        sitesWithManagers,
        staffBySiteId,
        firstSiteId: rawSites[0]?.id ?? null,
        maxUsersPerSite: data?.subscription?.plan?.maxUsersPerSite ?? 0,
        lastFetched: Date.now(),
        managersLastFetched: Date.now(),
      });
    } catch (error: unknown) {
      const message = getUserFriendlyErrorMessage(error, 'Failed to load sites');
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ isFetchingManagers: false });
    }
  },

  fetchStaff: async (siteId, force = false) => {
    const cached = get().staffBySiteId[siteId];
    if (!force && cached && !isStale(get().managersLastFetched)) {
      return cached;
    }

    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) return [];

    try {
      const staffRes = await sitesService.listStaff(siteId);
      const formatted = formatStaff(staffRes.data || []);
      set((state) => ({
        staffBySiteId: { ...state.staffBySiteId, [siteId]: formatted },
      }));
      return formatted;
    } catch {
      return [];
    }
  },

  fetchFirstSiteTeam: async (force = false) => {
    await get().fetchOrganisation(force);
    const { firstSiteId } = get();
    if (!firstSiteId) return;
    await get().fetchStaff(firstSiteId, force);
  },

  getFirstSiteId: async () => {
    if (get().firstSiteId) return get().firstSiteId;
    await get().fetchOrganisation();
    return get().firstSiteId;
  },

  createSite: async (data) => {
    const res = await sitesService.createSite(data);
    get().invalidate();
    return res;
  },

  assignManager: async (siteId, data) => {
    const res = await sitesService.assignManager(siteId, data);
    get().invalidate();
    return res;
  },

  addStaff: async (siteId, data) => {
    const res = await sitesService.addStaff(siteId, data);
    get().invalidate();
    return res;
  },

  updateSite: async (siteId, data) => {
    const res = await sitesService.updateSite(siteId, data);
    get().invalidate();
    return res;
  },

  deleteSite: async (siteId) => {
    await sitesService.deleteSite(siteId);
    get().invalidate();
  },

  removeAccess: async (siteId, userId) => {
    await sitesService.removeAccess(siteId, userId);
    get().invalidate();
  },

  invalidate: () =>
    set({ lastFetched: null, managersLastFetched: null, staffBySiteId: {} }),

  reset: () => set(INITIAL),
}));
