import { create } from 'zustand';

import { consolidatedService } from '@/services/consolidated.service';
import { subscribeNotificationReceived } from '@/services/pushNotifications';
import type {
  CollectionDashboard,
  CollectionListItem,
  ConsolidatedGroup,
  ConsolidatedMe,
  Declarations,
  OpenCollection,
} from '@/types/consolidated';

type TabKey = 'upcoming' | 'active' | 'past';

type ConsolidatedState = {
  me: ConsolidatedMe | null;
  meLoaded: boolean;
  featureOff: boolean;
  declarations: Declarations | null;
  groups: ConsolidatedGroup[];
  collectionsByTab: Partial<Record<string, CollectionListItem[]>>;
  openBySite: Record<number, OpenCollection[]>;
  dashboard: Record<number, CollectionDashboard>;
  fetchMe: (force?: boolean) => Promise<ConsolidatedMe | null>;
  fetchDeclarations: (force?: boolean) => Promise<Declarations>;
  fetchGroups: (force?: boolean) => Promise<ConsolidatedGroup[]>;
  fetchCollections: (tab: TabKey, groupId?: number, force?: boolean) => Promise<CollectionListItem[]>;
  fetchOpenForSite: (siteId: number, force?: boolean) => Promise<OpenCollection[]>;
  fetchDashboard: (id: number, force?: boolean) => Promise<CollectionDashboard>;
  reset: () => void;
};

const empty = {
  me: null as ConsolidatedMe | null,
  meLoaded: false,
  featureOff: false,
  declarations: null as Declarations | null,
  groups: [] as ConsolidatedGroup[],
  collectionsByTab: {} as Partial<Record<string, CollectionListItem[]>>,
  openBySite: {} as Record<number, OpenCollection[]>,
  dashboard: {} as Record<number, CollectionDashboard>,
};

let mePromise: Promise<ConsolidatedMe | null> | null = null;

export const useConsolidatedStore = create<ConsolidatedState>((set, get) => ({
  ...empty,

  async fetchMe(force) {
    if (!force && get().meLoaded) return get().me;
    if (!force && mePromise) return mePromise;
    mePromise = consolidatedService
      .getMe()
      .then((me) => {
        set({ me, meLoaded: true, featureOff: me == null });
        return me;
      })
      .catch((error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          set({ me: null, meLoaded: true, featureOff: true });
          return null;
        }
        set({ meLoaded: true });
        throw error;
      })
      .finally(() => {
        mePromise = null;
      });
    return mePromise;
  },

  async fetchDeclarations(force) {
    if (!force && get().declarations) return get().declarations as Declarations;
    const declarations = await consolidatedService.getDeclarations();
    set({ declarations });
    return declarations;
  },

  async fetchGroups(force) {
    if (!force && get().groups.length) return get().groups;
    const groups = await consolidatedService.listGroups(false);
    set({ groups });
    return groups;
  },

  async fetchCollections(tab, groupId, force) {
    const key = `${tab}:${groupId ?? 'all'}`;
    if (!force && get().collectionsByTab[key]) return get().collectionsByTab[key] as CollectionListItem[];
    const page = await consolidatedService.listCollections({ tab, groupId, page: 1, limit: 50 });
    set((state) => ({
      collectionsByTab: { ...state.collectionsByTab, [key]: page.items },
    }));
    return page.items;
  },

  async fetchOpenForSite(siteId, force) {
    if (!force && get().openBySite[siteId]) return get().openBySite[siteId];
    try {
      const rows = await consolidatedService.getOpenCollectionsForSite(siteId);
      set((state) => ({ openBySite: { ...state.openBySite, [siteId]: rows } }));
      return rows;
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        set((state) => ({ openBySite: { ...state.openBySite, [siteId]: [] } }));
        return [];
      }
      throw error;
    }
  },

  async fetchDashboard(id, force) {
    if (!force && get().dashboard[id]) return get().dashboard[id];
    const dashboard = await consolidatedService.getCollection(id);
    set((state) => ({ dashboard: { ...state.dashboard, [id]: dashboard } }));
    return dashboard;
  },

  reset() {
    mePromise = null;
    set({ ...empty, collectionsByTab: {}, openBySite: {}, dashboard: {} });
  },
}));

/** Refresh an open dashboard when a consolidated push arrives in the foreground. */
export function bindConsolidatedPushRefresh(): () => void {
  return subscribeNotificationReceived((payload) => {
    const type = String(payload.data?.type ?? payload.data?.notificationType ?? '').toLowerCase();
    if (!type.startsWith('consolidated_') && type !== 'pickup_change') return;
    const collectionId = Number(payload.data?.collectionId);
    const state = useConsolidatedStore.getState();
    if (Number.isFinite(collectionId) && collectionId > 0) {
      void state.fetchDashboard(collectionId, true).catch(() => undefined);
    }
    void state.fetchCollections('active', undefined, true).catch(() => undefined);
    void state.fetchCollections('upcoming', undefined, true).catch(() => undefined);
  });
}
