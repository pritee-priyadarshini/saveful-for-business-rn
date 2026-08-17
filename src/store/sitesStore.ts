import { create } from 'zustand';
import {
  sitesService,
  CreateSitePayload,
  AssignManagerPayload,
  AddStaffPayload,
  UpdateSitePayload,
} from '../services/sites.service';
import { useAuthStore } from './authStore';
import { useSubscriptionStore } from './subscriptionStore';
import { getUserFriendlyErrorMessage } from '../utils/apiError';
import { isSubscriptionGateError } from '../utils/billingErrors';
import {
  buildDefaultHqSitePayload,
  buildVirtualHqSite,
  extractCreatedSite,
  extractCreatedSiteId,
  getHqOwnerContact,
  isBusinessMultiHeadOffice,
  isVirtualHqSiteId,
  pickDefaultSiteId,
  sitesWithHqFallback,
} from '../utils/defaultHqSite';

let ensureDefaultHqSitePromise: Promise<number | null> | null = null;

const STALE_TIME_MS = 5 * 60 * 1000;

function isStale(lastFetched: number | null) {
  if (!lastFetched) return true;
  return Date.now() - lastFetched > STALE_TIME_MS;
}

function isHqSession(authUser: any) {
  return (
    isBusinessMultiHeadOffice(authUser) ||
    useAuthStore.getState().selectedRole === 'restaurant_multi'
  );
}

function parseOrganisationResponse(data: any): {
  organisation: any | null;
  sites: any[];
  subscription: any | null;
} {
  const nested =
    data?.data &&
    !Array.isArray(data?.data) &&
    (Array.isArray(data.data.sites) || data.data.organisation)
      ? data.data
      : data;

  const sites = Array.isArray(nested)
    ? nested
    : Array.isArray(nested?.sites)
      ? nested.sites
      : Array.isArray(nested?.data)
        ? nested.data
        : Array.isArray(data?.sites)
          ? data.sites
          : [];

  const organisation = Array.isArray(nested)
    ? data?.organisation ?? null
    : nested?.organisation ?? data?.organisation ?? null;

  const subscription = Array.isArray(nested)
    ? data?.subscription ?? null
    : nested?.subscription ?? data?.subscription ?? null;

  return { organisation, sites, subscription };
}

function resolveSeatLimits(orgSubscription: any) {
  const entitlements = useSubscriptionStore.getState().entitlements;
  return {
    maxUsersPerSite:
      entitlements?.maxUserPerSite ??
      orgSubscription?.plan?.maxUserPerSite ??
      orgSubscription?.plan?.maxUsersPerSite ??
      0,
    maxSites:
      entitlements?.maxSites ??
      orgSubscription?.plan?.maxSites ??
      0,
  };
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
  const contactName = manager
    ? `${manager.firstName} ${manager.lastName}`.trim()
    : String(site.contactName || '').trim();
  const email = manager?.email || site.contactEmail || site.email || '';
  const mobile = manager?.phoneNumber || site.phoneNumber || site.contactMobile || site.mobile || '';

  return {
    id: site.id,
    tradingName: site.siteName,
    address: site.address,
    postCode: site.postcode || site.postCode || '',
    managerId: managerEntry?.userId ?? null,
    contactName: contactName || 'Manager not yet assigned',
    email: email || '-',
    mobile: mobile || '-',
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
  defaultSiteId: number | null;
  maxUsersPerSite: number;
  maxSites: number;
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
  ensureDefaultHqSite: () => Promise<number | null>;
  createSite: (data: CreateSitePayload, options?: { skipBillingHandler?: boolean }) => Promise<any>;
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
  defaultSiteId: null,
  maxUsersPerSite: 0,
  maxSites: 0,
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
    if (!force && (isFetching || !isStale(lastFetched))) return;

    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) return;

    set({ isFetching: true, error: null });
    try {
      const res = await sitesService.getOrganisation();
      const parsed = parseOrganisationResponse(res.data);
      const limits = resolveSeatLimits(parsed.subscription);
      const organisation = parsed.organisation ?? get().organisation;
      const subscription = parsed.subscription ?? get().subscription;
      const displaySites = sitesWithHqFallback(
        parsed.sites.length > 0 ? parsed.sites : get().sites,
        authUser,
        organisation,
        isHqSession(authUser),
      );
      const defaultSiteId = pickDefaultSiteId(displaySites) ?? get().defaultSiteId;

      set({
        organisation,
        subscription,
        sites: displaySites,
        firstSiteId: defaultSiteId,
        defaultSiteId,
        maxUsersPerSite: limits.maxUsersPerSite,
        maxSites: limits.maxSites,
        lastFetched: Date.now(),
      });
    } catch (error: unknown) {
      if (isSubscriptionGateError(error)) {
        return;
      }
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

    const alreadyHasSites =
      get().sites.length > 0 || get().sitesWithManagers.length > 0;
    set({ isFetchingManagers: !alreadyHasSites, error: null });
    try {
      const res = await sitesService.getOrganisation();
      const parsed = parseOrganisationResponse(res.data);
      const organisation = parsed.organisation ?? get().organisation;
      const subscription = parsed.subscription ?? get().subscription;
      const displaySites = sitesWithHqFallback(
        parsed.sites.length > 0 ? parsed.sites : get().sites,
        authUser,
        organisation,
        isHqSession(authUser),
      );
      const liveSites = displaySites.filter((site) => !isVirtualHqSiteId(site?.id));

      const sitesWithManagers = await Promise.all(
        displaySites.map(async (site) => {
          if (isVirtualHqSiteId(site?.id)) {
            return formatSiteWithManager(site, []);
          }
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
        liveSites.map(async (site) => {
          try {
            const staffRes = await sitesService.listStaff(site.id);
            staffBySiteId[site.id] = formatStaff(staffRes.data || []);
          } catch {
            staffBySiteId[site.id] = [];
          }
        }),
      );

      set({
        organisation,
        subscription,
        sites: displaySites,
        sitesWithManagers,
        staffBySiteId,
        firstSiteId: pickDefaultSiteId(displaySites) ?? get().firstSiteId,
        defaultSiteId: pickDefaultSiteId(displaySites) ?? get().defaultSiteId,
        maxUsersPerSite: resolveSeatLimits(subscription).maxUsersPerSite,
        maxSites: resolveSeatLimits(subscription).maxSites,
        lastFetched: Date.now(),
        managersLastFetched: Date.now(),
      });
    } catch (error: unknown) {
      if (isSubscriptionGateError(error)) {
        return;
      }
      const message = getUserFriendlyErrorMessage(error, 'Failed to load sites');
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ isFetchingManagers: false });
    }
  },

  fetchStaff: async (siteId, force = false) => {
    if (isVirtualHqSiteId(siteId)) return [];
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

  ensureDefaultHqSite: async () => {
    if (ensureDefaultHqSitePromise) return ensureDefaultHqSitePromise;

    ensureDefaultHqSitePromise = (async () => {
      const { authUser } = useAuthStore.getState();
      if (!authUser?.accessToken) return get().defaultSiteId;
      if (!isHqSession(authUser)) {
        return pickDefaultSiteId(get().sites) ?? get().defaultSiteId;
      }

      const orgFromProfile =
        get().organisation ??
        authUser?.profile?.organisation ??
        authUser?.profile?.organization ??
        null;

      const seedFromSite = (site: any, realId?: number | null) => {
        const id = realId ?? site?.id;
        const owner = getHqOwnerContact(authUser);
        const withContact = {
          ...site,
          id,
          contactName: site.contactName || owner.name,
          contactEmail: site.contactEmail || owner.email,
          phoneNumber: site.phoneNumber || owner.mobile,
        };
        set({
          organisation: get().organisation ?? orgFromProfile,
          sites: [withContact],
          sitesWithManagers: [formatSiteWithManager(withContact, [])],
          defaultSiteId: isVirtualHqSiteId(id) ? null : Number(id),
          firstSiteId: isVirtualHqSiteId(id) ? null : Number(id),
        });
      };

      // Paint HQ immediately from the org profile so Home never flashes empty.
      if (pickDefaultSiteId(get().sites) == null) {
        seedFromSite(buildVirtualHqSite(authUser, orgFromProfile));
      }

      try {
        const entitlements = await useSubscriptionStore.getState().fetchEntitlements();
        const canCreateSite = entitlements?.entitled === true;

        const applyHqOwnerContact = async (siteId: number) => {
          if (isVirtualHqSiteId(siteId) || !canCreateSite) return;
          const owner = getHqOwnerContact(authUser);
          try {
            await sitesService.updateSite(siteId, {
              contactName: owner.name,
              contactEmail: owner.email || undefined,
              phoneNumber: owner.mobile || undefined,
            });
          } catch {
            // HQ still operates this site as org admin, like charity.
          }
        };

        try {
          await get().fetchOrganisation(true);
        } catch {
          // Continue — we can still seed a local HQ preview from the org profile.
        }

        const existing = pickDefaultSiteId(get().sites) ?? get().defaultSiteId;
        if (existing && !isVirtualHqSiteId(existing)) {
          await applyHqOwnerContact(existing);
          set({ defaultSiteId: existing, firstSiteId: existing });
          return existing;
        }

        const fromProfile = pickDefaultSiteId(authUser?.profile?.sites);
        if (fromProfile) {
          const profileSite = (authUser.profile?.sites ?? []).find(
            (site: any) => Number(site?.id ?? site?.siteId) === fromProfile,
          );
          if (profileSite && get().sites.filter((site) => !isVirtualHqSiteId(site?.id)).length === 0) {
            seedFromSite(profileSite, fromProfile);
          } else {
            set({ defaultSiteId: fromProfile, firstSiteId: fromProfile });
          }
          await applyHqOwnerContact(fromProfile);
          return fromProfile;
        }

        if (!canCreateSite) {
          if (pickDefaultSiteId(get().sites) == null) {
            seedFromSite(buildVirtualHqSite(authUser, get().organisation ?? orgFromProfile));
          }
          return null;
        }

        const payload = await buildDefaultHqSitePayload(
          authUser,
          get().organisation ?? orgFromProfile,
        );
        if (payload) {
          try {
            const createRes = await get().createSite(
              payload,
              { skipBillingHandler: true },
            );
            const createdSite = extractCreatedSite(createRes);
            const createdId = extractCreatedSiteId(createRes) ?? createdSite?.id ?? null;

            if (createdId) {
              seedFromSite(
                {
                  ...payload,
                  ...(createdSite || {}),
                  createdAt: new Date().toISOString(),
                  isActive: true,
                },
                createdId,
              );
              await applyHqOwnerContact(createdId);
              try {
                await get().fetchOrganisation(true);
                await useAuthStore.getState().refreshProfile();
              } catch {
                // Keep the seeded HQ site if refetch fails.
              }
              const created = pickDefaultSiteId(get().sites) ?? createdId;
              if (created && !isVirtualHqSiteId(created)) {
                set({ defaultSiteId: created, firstSiteId: created });
                return created;
              }
            }
          } catch {
            if (pickDefaultSiteId(get().sites) == null) {
              seedFromSite(buildVirtualHqSite(authUser, get().organisation ?? orgFromProfile));
            }
            return pickDefaultSiteId(get().sites);
          }
        }

        if (pickDefaultSiteId(get().sites) == null) {
          seedFromSite(buildVirtualHqSite(authUser, get().organisation ?? orgFromProfile));
        }
        return null;
      } catch {
        if (pickDefaultSiteId(get().sites) == null) {
          seedFromSite(buildVirtualHqSite(authUser, get().organisation ?? orgFromProfile));
        }
        return pickDefaultSiteId(get().sites);
      }
    })().finally(() => {
      ensureDefaultHqSitePromise = null;
    });

    return ensureDefaultHqSitePromise;
  },

  createSite: async (data, options) => {
    const res = await sitesService.createSite(data, options);
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
