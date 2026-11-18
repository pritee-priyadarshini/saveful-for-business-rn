import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { makeFoodCountService, readMfcError } from '@/services/makeFoodCount.service';
import {
  FOOD_SOURCES,
  type FoodRecordLine,
  type FoodSource,
  type HomeImpact,
  type LineWritePayload,
  type MfcDraftLine,
  type MfcLineIdentity,
  type MfcLockedLine,
  type MfcPersistedDraft,
  type MfcSyncStatus,
  type RecordDetail,
  type Taxonomy,
} from '@/types/makeFoodCount';
import { computeTotals, roundKg, validateQtyKg, type MfcTotals } from '@/utils/makeFoodCountTotals';
import { fileKeyValueStorage } from '@/utils/fileKeyValueStorage';
import { useAuthStore } from '@/store/authStore';
import { mfcUuid } from '@/utils/mfcId';

/** Autosave runs this long after the last change (app SPEC §8.1). */
export const MFC_AUTOSAVE_MS = 800;
const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 30000;
const STORAGE_KEY = 'mfc-draft-v1';

const CONFLICT_NOTICE = 'Someone else updated this record. We loaded the latest version.';

/**
 * Why the open draft can't be saved from this phone, whatever happens next:
 * - forbidden: the person can see this site's records but not change them (403)
 * - missing: the draft no longer exists for them, e.g. deleted elsewhere (404)
 * Retrying never helps, so writes stop until the draft is closed.
 */
export type MfcWriteBlock = 'forbidden' | 'missing';

export const MFC_WRITE_BLOCK_MESSAGE: Record<MfcWriteBlock, string> = {
  forbidden: 'You can view this site’s food records but not change them, so changes to this draft won’t be saved.',
  missing: 'This draft is no longer available, so changes to it can’t be saved.',
};

function currentUserId(): number | null {
  const user = useAuthStore.getState().authUser as { id?: unknown; profile?: { user?: { id?: unknown } } } | null;
  const id = Number(user?.id ?? user?.profile?.user?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

type MakeFoodCountState = MfcPersistedDraft & {
  syncStatus: MfcSyncStatus;
  /** Set after a 409 version clash; the screen shows a Notice and calls dismissConflict. */
  conflictNotice: string | null;
  /** Set when the server refused a change to a line that is listed. */
  lockedLine: MfcLockedLine | null;
  taxonomy: Taxonomy | null;
  homeImpact: HomeImpact | null;
  /** Latest server copy (outcomes per kind and line). Not persisted. */
  detail: RecordDetail | null;
  lastError: string | null;
  /** Set when the server refuses this draft for good (see MfcWriteBlock). Not persisted. */
  writeBlocked: MfcWriteBlock | null;
  autosaveTimer: ReturnType<typeof setTimeout> | null;

  ensureClientRequestId: () => string;
  setSources: (sources: FoodSource[]) => void;
  setLineQty: (line: MfcLineIdentity, qtyKg: number | null) => void;
  setLineFit: (line: MfcLineIdentity, fitForHumans: boolean) => void;
  /** POST /records (idempotent on clientRequestId). Returns the record id, or null on failure. */
  createOrLoadDraft: (params?: { siteId?: number; sources?: FoodSource[] }) => Promise<number | null>;
  loadRecord: (id: number) => Promise<RecordDetail | null>;
  /** PUT /lines with the current version. Resolves true when the server has everything. */
  flushLines: () => Promise<boolean>;
  /** Flush lines, then POST /save. */
  saveRecord: () => Promise<boolean>;
  scheduleAutosave: () => void;
  /** Cancel the debounce and flush now (tab switch, blur, background). */
  flushNow: () => Promise<boolean>;
  /** Handle a 409: refetch the server copy and flag it for a Notice. */
  handle409: (error: unknown) => Promise<void>;
  dismissConflict: () => void;
  clearDraft: () => void;
  loadTaxonomy: (force?: boolean) => Promise<Taxonomy | null>;
  loadHomeImpact: (siteId?: number) => Promise<HomeImpact | null>;
  selectSource: (source: FoodSource) => void;
  /** Pure getter: totals of the live lines in the selected sources. */
  getTotals: () => MfcTotals;
};

// ─── Module state (not persisted) ────────────────────────────────────────────

/** Bumped on every local edit; syncedRevision catches up when the server has it. */
let revision = 0;
let syncedRevision = 0;
let sourcesDirty = false;
let flushPromise: Promise<boolean> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;

function clearRetry() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
}

function orderSources(sources: FoodSource[]): FoodSource[] {
  return FOOD_SOURCES.filter((source) => sources.includes(source));
}

function emptyDraft(): MfcPersistedDraft {
  return {
    clientRequestId: null,
    recordId: null,
    siteId: null,
    version: null,
    status: null,
    sources: [],
    lines: {},
    selectedSource: null,
    ownerUserId: null,
  };
}

/** True while there is an unsaved draft the user can continue (Home shows "Continue recording"). */
export function selectHasOpenDraft(state: Pick<MfcPersistedDraft, 'status' | 'siteId' | 'sources' | 'recordId'>): boolean {
  return state.status !== 'SAVED' && state.siteId != null && (state.recordId != null || state.sources.length > 0);
}

/** Lines that belong to a currently selected source. */
function activeLines(state: Pick<MfcPersistedDraft, 'lines' | 'sources'>): MfcDraftLine[] {
  return Object.values(state.lines).filter((line) => state.sources.includes(line.source));
}

function toDraftLine(line: FoodRecordLine): MfcDraftLine {
  return {
    id: line.id,
    clientKey: line.clientKey,
    source: line.source,
    category: line.category,
    subtype: line.subtype,
    qtyKg: line.qtyKg > 0 ? line.qtyKg : null,
    // No Fit-for-humans tick in the app: all Overproduction is offered for people.
    fitForHumans: line.source === 'OVERPRODUCTION',
  };
}

function toWritePayload(line: MfcDraftLine): LineWritePayload {
  return {
    clientKey: line.clientKey,
    source: line.source,
    category: line.category,
    ...(line.subtype ? { subtype: line.subtype } : {}),
    qtyKg: roundKg(line.qtyKg as number),
    // All Overproduction is offered for the people listing; the kitchen lowers amounts there if needed.
    fitForHumans: line.source === 'OVERPRODUCTION',
  };
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useMakeFoodCountStore = create<MakeFoodCountState>()(
  persist(
    (set, get) => {
      /** Local edit bookkeeping shared by every setter. */
      const markDirty = (patch: Partial<MakeFoodCountState>) => {
        revision += 1;
        set({
          ...patch,
          lockedLine: null,
          // A refused draft keeps saying why, even while the person keeps typing.
          lastError: get().writeBlocked ? get().lastError : null,
          syncStatus: get().syncStatus === 'offline' ? 'offline' : 'pending',
        });
        get().scheduleAutosave();
      };

      const scheduleRetry = () => {
        clearRetry();
        retryAttempt += 1;
        const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (retryAttempt - 1));
        retryTimer = setTimeout(() => {
          retryTimer = null;
          void get().flushLines();
        }, delay);
      };

      /** Shared failure path for every write. Always resolves false. */
      const failWrite = async (error: unknown): Promise<false> => {
        const info = readMfcError(error);
        // Not allowed, or gone: no retry will ever succeed, so stop writing and say why.
        if (info.status === 403 || info.status === 404) {
          const block: MfcWriteBlock = info.status === 403 ? 'forbidden' : 'missing';
          clearRetry();
          const timer = get().autosaveTimer;
          if (timer) clearTimeout(timer);
          set({ writeBlocked: block, autosaveTimer: null, syncStatus: 'pending', lastError: MFC_WRITE_BLOCK_MESSAGE[block] });
          return false;
        }
        if (info.status === 409) {
          await get().handle409(error);
          return false;
        }
        if (info.retryable) {
          set({ syncStatus: 'offline', lastError: null });
          scheduleRetry();
          return false;
        }
        set({ syncStatus: 'pending', lastError: info.message });
        return false;
      };

      const applyDetail = (detail: RecordDetail) => {
        const lines: Record<string, MfcDraftLine> = {};
        for (const line of detail.lines) lines[line.clientKey] = toDraftLine(line);
        revision += 1;
        syncedRevision = revision;
        sourcesDirty = false;
        retryAttempt = 0;
        clearRetry();
        set({
          clientRequestId: detail.record.clientRequestId || get().clientRequestId,
          recordId: detail.record.id,
          siteId: detail.record.siteId,
          version: detail.record.version,
          status: detail.record.status,
          sources: orderSources(detail.record.sources),
          lines,
          detail,
          ownerUserId: currentUserId(),
          syncStatus: 'saved',
          lastError: null,
          writeBlocked: null,
        });
      };

      const patchSources = async (): Promise<boolean> => {
        const { recordId, version, sources } = get();
        if (recordId == null || version == null) return true;
        try {
          const record = await makeFoodCountService.updateRecord(recordId, { version, sources });
          sourcesDirty = false;
          set({ version: record.version || version + 1 });
          return true;
        } catch (error) {
          await failWrite(error);
          return false;
        }
      };

      /** One round trip: create if needed, patch sources if changed, then PUT the lines. */
      const flushOnce = async (): Promise<boolean> => {
        const before = get();
        if (before.recordId == null) {
          if (before.siteId == null || before.sources.length === 0) return true; // nothing to sync yet
          const id = await get().createOrLoadDraft();
          if (id == null) return false;
        } else if (revision === syncedRevision && !sourcesDirty) {
          return true;
        }

        const live = activeLines(get());
        for (const line of live) {
          const error = validateQtyKg(line.qtyKg);
          if (error) {
            set({ syncStatus: 'pending', lastError: error });
            return false;
          }
        }

        if (sourcesDirty && !(await patchSources())) return false;

        const state = get();
        if (state.recordId == null || state.version == null) return false;
        const payload = live.filter((line) => (line.qtyKg ?? 0) > 0).map(toWritePayload);
        const snapshot = revision;
        set({ syncStatus: 'saving' });
        try {
          const result = await makeFoodCountService.putLines(state.recordId, state.version, payload);
          const ids = new Map(result.lines.map((line) => [line.clientKey, line.id]));
          const lines = { ...get().lines };
          for (const key of Object.keys(lines)) {
            const id = ids.get(key);
            if (id != null) lines[key] = { ...lines[key], id };
          }
          syncedRevision = snapshot;
          retryAttempt = 0;
          clearRetry();
          set({
            lines,
            version: result.version > 0 ? result.version : state.version + 1,
            syncStatus: revision === snapshot ? 'saved' : 'pending',
            lastError: null,
          });
          return true;
        } catch (error) {
          return failWrite(error);
        }
      };

      return {
        ...emptyDraft(),
        syncStatus: 'idle',
        conflictNotice: null,
        lockedLine: null,
        taxonomy: null,
        homeImpact: null,
        detail: null,
        lastError: null,
        writeBlocked: null,
        autosaveTimer: null,

        ensureClientRequestId() {
          const existing = get().clientRequestId;
          if (existing) return existing;
          const next = mfcUuid();
          set({ clientRequestId: next });
          return next;
        },

        setSources(sources) {
          const next = orderSources(sources);
          const { selectedSource } = get();
          if (get().recordId != null) sourcesDirty = true;
          markDirty({
            sources: next,
            selectedSource: selectedSource && next.includes(selectedSource) ? selectedSource : next[0] ?? null,
          });
        },

        setLineQty(line, qtyKg) {
          const current = get().lines[line.clientKey];
          const qty = qtyKg == null ? null : roundKg(qtyKg);
          markDirty({
            lines: {
              ...get().lines,
              [line.clientKey]: {
                ...(current ?? { ...line, fitForHumans: line.source === 'OVERPRODUCTION' }),
                qtyKg: qty,
              },
            },
          });
        },

        setLineFit(line, fitForHumans) {
          const current = get().lines[line.clientKey];
          markDirty({
            lines: {
              ...get().lines,
              [line.clientKey]: {
                ...(current ?? { ...line, qtyKg: null }),
                // The server forces false outside Overproduction; match it locally.
                fitForHumans: line.source === 'OVERPRODUCTION' ? fitForHumans : false,
              },
            },
          });
        },

        async createOrLoadDraft(params) {
          if (params?.siteId != null && get().recordId != null && params.siteId !== get().siteId) {
            get().clearDraft(); // a draft belongs to one site
          }
          if (params?.siteId != null) set({ siteId: params.siteId });
          if (params?.sources) {
            const next = orderSources(params.sources);
            if (get().recordId != null && next.join() !== get().sources.join()) sourcesDirty = true;
            set({
              sources: next,
              selectedSource: get().selectedSource && next.includes(get().selectedSource as FoodSource)
                ? get().selectedSource
                : next[0] ?? null,
            });
          }

          const clientRequestId = get().ensureClientRequestId();
          const { siteId, sources, recordId } = get();

          if (recordId != null) {
            if (sourcesDirty) await patchSources();
            return get().recordId;
          }
          if (siteId == null || sources.length === 0) {
            set({ lastError: 'Choose a site and at least one food source.' });
            return null;
          }

          try {
            const record = await makeFoodCountService.createRecord({ siteId, clientRequestId, sources });
            set({
              recordId: record.id,
              version: record.version,
              status: record.status,
              ownerUserId: currentUserId(),
              syncStatus: revision === syncedRevision ? 'saved' : 'pending',
              lastError: null,
            });
            sourcesDirty = false;
            return record.id;
          } catch (error) {
            await failWrite(error);
            return null;
          }
        },

        async loadRecord(id) {
          try {
            const detail = await makeFoodCountService.getRecord(id);
            applyDetail(detail);
            return detail;
          } catch (error) {
            const info = readMfcError(error);
            set({
              lastError: info.message,
              ...(info.retryable ? { syncStatus: 'offline' as const } : {}),
            });
            return null;
          }
        },

        flushLines() {
          // A draft the server has refused for good is never sent again.
          if (get().writeBlocked) return Promise.resolve(false);
          if (flushPromise) return flushPromise;
          flushPromise = (async () => {
            try {
              // Edits made while a request is in flight bump revision; go round again.
              for (;;) {
                const seen = revision;
                const ok = await flushOnce();
                if (!ok) return false;
                if (revision === seen || (revision === syncedRevision && !sourcesDirty)) return true;
              }
            } finally {
              flushPromise = null;
            }
          })();
          return flushPromise;
        },

        async saveRecord() {
          if (get().recordId == null && (await get().createOrLoadDraft()) == null) return false;
          if (!(await get().flushNow())) return false;
          const { recordId, version } = get();
          if (recordId == null || version == null) return false;
          set({ syncStatus: 'saving' });
          try {
            const record = await makeFoodCountService.saveRecord(recordId, version);
            set({
              status: record.status,
              version: record.version || version,
              syncStatus: 'saved',
              lastError: null,
            });
            return true;
          } catch (error) {
            return failWrite(error);
          }
        },

        scheduleAutosave() {
          if (get().writeBlocked) return;
          const existing = get().autosaveTimer;
          if (existing) clearTimeout(existing);
          const timer = setTimeout(() => {
            set({ autosaveTimer: null });
            void get().flushLines();
          }, MFC_AUTOSAVE_MS);
          set({ autosaveTimer: timer });
        },

        flushNow() {
          const timer = get().autosaveTimer;
          if (timer) {
            clearTimeout(timer);
            set({ autosaveTimer: null });
          }
          return get().flushLines();
        },

        async handle409(error) {
          const info = readMfcError(error);
          const body = info.body;
          const lineGuard = body?.code === 'LINE_LISTED' || (body?.lineId != null && body.currentVersion == null);

          if (lineGuard) {
            const listedKg = body?.listedKg ?? null;
            set({
              lockedLine: {
                lineId: body?.lineId ?? null,
                listedKg,
                message:
                  body?.message ||
                  (listedKg != null
                    ? `${listedKg} kg of this line is listed: edit or cancel the listing first`
                    : info.message),
              },
              lastError: null,
            });
          } else if (body?.currentVersion != null) {
            set({ version: body.currentVersion });
          }

          // Reload the server copy; the local edits that clashed are dropped.
          const id = get().recordId;
          let reloaded = false;
          if (id != null) reloaded = (await get().loadRecord(id)) != null;
          if (!lineGuard) {
            set({
              conflictNotice: CONFLICT_NOTICE,
              syncStatus: reloaded ? 'conflict' : get().syncStatus === 'offline' ? 'offline' : 'conflict',
            });
          }
        },

        dismissConflict() {
          set({ conflictNotice: null, syncStatus: get().syncStatus === 'conflict' ? 'saved' : get().syncStatus });
        },

        clearDraft() {
          const timer = get().autosaveTimer;
          if (timer) clearTimeout(timer);
          clearRetry();
          retryAttempt = 0;
          revision = 0;
          syncedRevision = 0;
          sourcesDirty = false;
          set({
            ...emptyDraft(),
            syncStatus: 'idle',
            conflictNotice: null,
            lockedLine: null,
            detail: null,
            lastError: null,
            writeBlocked: null,
            autosaveTimer: null,
          });
        },

        async loadTaxonomy(force = false) {
          if (!force && get().taxonomy) return get().taxonomy;
          try {
            const taxonomy = await makeFoodCountService.getTaxonomy();
            set({ taxonomy });
            return taxonomy;
          } catch (error) {
            set({ lastError: readMfcError(error).message });
            return get().taxonomy;
          }
        },

        async loadHomeImpact(siteId) {
          try {
            const homeImpact = await makeFoodCountService.getHomeImpact(siteId);
            set({ homeImpact });
            return homeImpact;
          } catch (error) {
            set({ lastError: readMfcError(error).message });
            return get().homeImpact;
          }
        },

        selectSource(source) {
          if (get().selectedSource === source) return;
          set({ selectedSource: source });
          void get().flushNow(); // autosave on tab switch
        },

        getTotals() {
          return computeTotals(activeLines(get()));
        },
      };
    },
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => fileKeyValueStorage),
      partialize: (state): MfcPersistedDraft => ({
        clientRequestId: state.clientRequestId,
        recordId: state.recordId,
        siteId: state.siteId,
        version: state.version,
        status: state.status,
        sources: state.sources,
        lines: state.lines,
        selectedSource: state.selectedSource,
        ownerUserId: state.ownerUserId ?? null,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state || !selectHasOpenDraft(state)) return;
        // Whatever came back from disk may not have reached the server: sync it on the next flush.
        revision = 1;
        syncedRevision = 0;
        sourcesDirty = state.recordId != null;
        void Promise.resolve().then(() => useMakeFoodCountStore.setState({ syncStatus: 'pending' }));
      },
    },
  ),
);

/**
 * After a listing from this record is published, the record is done: mark it
 * SAVED so it no longer shows as a draft. The server copy is reloaded first,
 * because linking the listing can move the record's version. Never throws;
 * if it fails the record simply stays a draft.
 */
export async function completeRecordAfterListing(recordId: number): Promise<void> {
  const store = useMakeFoodCountStore.getState();
  if (store.recordId !== recordId) return;
  try {
    if ((await store.loadRecord(recordId)) == null) return;
    if (useMakeFoodCountStore.getState().status === 'SAVED') return;
    await useMakeFoodCountStore.getState().saveRecord();
  } catch {
    // Listing is already published; the record can be saved later.
  }
}

/**
 * A draft on this phone belongs to the account that opened it. Logging out, or
 * signing in as someone else, clears it from the phone (the server keeps it, and
 * its owner can reopen it from Records). Without this, the next account inherited
 * a draft it may not be allowed to change, and every save failed.
 */
export function bindMfcDraftToAccount(): () => void {
  const reconcile = () => {
    if (!useMakeFoodCountStore.persist.hasHydrated()) return;
    const draft = useMakeFoodCountStore.getState();
    if (draft.recordId == null && draft.sources.length === 0) return;
    const userId = currentUserId();
    if (userId == null) return; // still signing in
    if (draft.ownerUserId == null) {
      // A draft saved before drafts had an owner: this account adopts it. If it can't be
      // changed, the first save is refused and the draft can be closed from the screen.
      useMakeFoodCountStore.setState({ ownerUserId: userId });
      return;
    }
    if (draft.ownerUserId !== userId) draft.clearDraft();
  };

  const offAuth = useAuthStore.subscribe((state, previous) => {
    if (previous.authUser && !state.authUser) {
      useMakeFoodCountStore.getState().clearDraft(); // logged out
      return;
    }
    if (state.authUser !== previous.authUser) reconcile();
  });
  const offHydrate = useMakeFoodCountStore.persist.onFinishHydration(reconcile);
  reconcile();
  return () => {
    offAuth();
    offHydrate();
  };
}

/** Flush the open draft when the app goes to the background; retry when it comes back. */
export function bindAppStateFlush(): () => void {
  const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
    const state = useMakeFoodCountStore.getState();
    if (next === 'background' || next === 'inactive') {
      void state.flushNow();
      return;
    }
    if (next === 'active' && !state.writeBlocked && (state.syncStatus === 'offline' || state.syncStatus === 'pending')) {
      void state.flushNow();
    }
  });
  return () => subscription.remove();
}
