import api from './api';
import { getUserFriendlyErrorMessage } from '@/utils/apiError';
import { roundKg } from '@/utils/makeFoodCountTotals';
import {
  FOOD_SOURCES,
  type CreateRecordPayload,
  type FoodListingKind,
  type FoodRecord,
  type FoodRecordLine,
  type FoodRecordStatus,
  type FoodSource,
  type HomeImpact,
  type InsightsCategoryRow,
  type InsightsDestination,
  type InsightsFilters,
  type InsightsPayload,
  type InsightsQuery,
  type KindOutcome,
  type LineOutcome,
  type LineWritePayload,
  type ListingPrefill,
  type MfcConflictBody,
  type PutLinesResult,
  type RecordDetail,
  type RecordListFilters,
  type RecordListPage,
  type RecordTotals,
  type SourceDrilldown,
  type Taxonomy,
  type TaxonomyEntry,
  type TaxonomySubtype,
  type UpdateRecordPayload,
} from '@/types/makeFoodCount';

// ─── Defensive readers (same pattern as consolidated.service.ts) ─────────────

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function unwrapData(value: unknown): unknown {
  const record = asRecord(value);
  if (!record || !('data' in record) || record.data == null) return value;
  return record.data;
}

function asArray(value: unknown, keys: string[] = ['items', 'data', 'rows', 'results']): unknown[] {
  const unwrapped = unwrapData(value);
  if (Array.isArray(unwrapped)) return unwrapped;
  const record = asRecord(unwrapped) ?? asRecord(value);
  if (!record) return [];
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function num(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function numOrNull(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function str(value: unknown, fallback = ''): string {
  if (value == null) return fallback;
  return String(value);
}

function strOrNull(value: unknown): string | null {
  if (value == null || value === '') return null;
  return String(value);
}

/** Decimal string or number → number rounded to 2 dp. */
function kg(value: unknown): number {
  return roundKg(num(value));
}

function isSource(value: unknown): value is FoodSource {
  return typeof value === 'string' && (FOOD_SOURCES as readonly string[]).includes(value);
}

function sourceOf(value: unknown, fallback: FoodSource = 'OVERPRODUCTION'): FoodSource {
  const upper = str(value).toUpperCase();
  return isSource(upper) ? upper : fallback;
}

function sourcesOf(value: unknown): FoodSource[] {
  if (!Array.isArray(value)) return [];
  const out: FoodSource[] = [];
  for (const entry of value) {
    const source = str(entry).toUpperCase();
    if (isSource(source) && !out.includes(source)) out.push(source);
  }
  return out;
}

// ─── Normalisers ─────────────────────────────────────────────────────────────

const DEFAULT_LIMITS = { maxKgPerLine: 500, decimals: 2 };

function normalizeSubtype(value: unknown): TaxonomySubtype {
  const record = asRecord(value) ?? {};
  const label = str(record.label, str(record.key));
  return {
    key: str(record.key),
    label,
    imageKey: strOrNull(record.imageKey),
    listingName: str(record.listingName, label),
    // The server sends a subtype's listing icon as `iconKey`.
    listingIconKey: strOrNull(record.listingIconKey ?? record.iconKey),
  };
}

function normalizeTaxonomyEntry(value: unknown): TaxonomyEntry {
  const record = asRecord(value) ?? {};
  const label = str(record.label, str(record.key));
  const subtypes = asArray(record.subtypes).map(normalizeSubtype).filter((subtype) => subtype.key);
  const source = sourceOf(record.source);
  return {
    source,
    key: str(record.key),
    label,
    imageKey: strOrNull(record.imageKey),
    listingName: str(record.listingName, label),
    listingIconKey: strOrNull(record.listingIconKey),
    fitAllowed: record.fitAllowed == null ? source === 'OVERPRODUCTION' : Boolean(record.fitAllowed),
    ...(subtypes.length ? { subtypes } : {}),
  };
}

export function normalizeTaxonomy(value: unknown): Taxonomy {
  const record = asRecord(unwrapData(value)) ?? {};
  const limits = asRecord(record.limits) ?? {};
  return {
    taxonomyVersion: str(record.taxonomyVersion ?? record.version, ''),
    entries: asArray(record.entries ?? record.taxonomy ?? record.rows ?? value)
      .map(normalizeTaxonomyEntry)
      .filter((entry) => entry.key),
    limits: {
      maxKgPerLine: num(limits.maxKgPerLine ?? record.maxKgPerLine, DEFAULT_LIMITS.maxKgPerLine),
      decimals: num(limits.decimals ?? record.decimals, DEFAULT_LIMITS.decimals),
    },
  };
}

function normalizeTotals(value: unknown): RecordTotals {
  const record = asRecord(value) ?? {};
  const totalKg = kg(record.totalKg ?? record.recordedKg ?? record.total);
  const fitKg = kg(record.fitKg ?? record.fit);
  const notFit = record.notFitKg ?? record.notFit;
  return {
    totalKg,
    fitKg,
    notFitKg: notFit == null ? roundKg(totalKg - fitKg) : kg(notFit),
  };
}

export function normalizeLine(value: unknown): FoodRecordLine {
  const record = asRecord(value) ?? {};
  const source = sourceOf(record.source);
  return {
    id: numOrNull(record.id ?? record.lineId) ?? undefined,
    clientKey: str(record.clientKey),
    source,
    category: str(record.category),
    subtype: strOrNull(record.subtype),
    qtyKg: kg(record.qtyKg),
    // Server forces false for every source but Overproduction.
    fitForHumans: source === 'OVERPRODUCTION' && Boolean(record.fitForHumans),
    deletedAt: strOrNull(record.deletedAt),
  };
}

export function normalizeRecord(value: unknown): FoodRecord {
  const record = asRecord(unwrapData(value)) ?? {};
  const site = asRecord(record.site) ?? {};
  const totals = asRecord(record.totals);
  return {
    id: num(record.id ?? record.recordId),
    organisationId: numOrNull(record.organisationId),
    siteId: num(record.siteId ?? site.id),
    siteName: strOrNull(record.siteName ?? site.name ?? site.locationName ?? site.organisationName),
    createdById: numOrNull(record.createdById),
    recordedAt: str(record.recordedAt ?? record.createdAt),
    status: (str(record.status, 'DRAFT').toUpperCase() === 'SAVED' ? 'SAVED' : 'DRAFT') as FoodRecordStatus,
    sources: sourcesOf(record.sources),
    version: num(record.version, 1),
    clientRequestId: str(record.clientRequestId),
    createdAt: strOrNull(record.createdAt),
    updatedAt: strOrNull(record.updatedAt),
    totals: totals ? normalizeTotals(totals) : null,
  };
}

function normalizeKindOutcome(kind: FoodListingKind, value: unknown): KindOutcome {
  const record = asRecord(value) ?? {};
  return {
    kind,
    eligibleKg: kg(record.eligibleKg),
    listedKg: kg(record.listedKg),
    claimedKg: kg(record.claimedKg),
    collectedKg: kg(record.collectedKg),
    status: str(record.status, 'NOT_LISTED'),
    claimedByName: strOrNull(
      record.claimedByName ?? record.claimantName ?? asRecord(record.claimedBy)?.name ?? record.claimedBy,
    ),
  };
}

function normalizeLineOutcome(value: unknown, fallbackLineId = 0): LineOutcome {
  const record = asRecord(value) ?? {};
  const qtyKg = kg(record.qtyKg);
  return {
    lineId: num(record.lineId ?? record.id, fallbackLineId),
    qtyKg,
    availableKg: record.availableKg == null ? qtyKg : kg(record.availableKg),
    listedKg: kg(record.listedKg),
    claimedKg: kg(record.claimedKg),
    collectedKg: kg(record.collectedKg),
  };
}

/** The kind's status, from its lines' statuses, when the server does not send one. */
function kindStatusFromLines(kind: FoodListingKind, rawLines: unknown[]): string | undefined {
  const statuses = rawLines
    .map((row) => asRecord(row) ?? {})
    .filter((line) => {
      const fit = sourceOf(line.source) === 'OVERPRODUCTION' && Boolean(line.fitForHumans);
      return kind === 'EDIBLE' ? fit : !fit;
    })
    .map((line) => str(line.status).toUpperCase())
    .filter(Boolean);
  if (statuses.length === 0) return undefined;
  for (const status of ['COLLECTED', 'PARTIALLY_COLLECTED', 'CLAIMED', 'LISTED', 'EXPIRED', 'CANCELLED']) {
    if (statuses.includes(status)) return status;
  }
  return 'NOT_LISTED';
}

function readOutcomes(record: Record<string, unknown>, rawLines: unknown[] = []): Record<FoodListingKind, KindOutcome> {
  // GET /records/:id sends `byKind: { EDIBLE, NON_EDIBLE }`.
  const raw = record.byKind ?? record.outcomes ?? record.kinds ?? record.kindOutcomes;
  let edible: unknown;
  let nonEdible: unknown;
  if (Array.isArray(raw)) {
    edible = raw.find((row) => str(asRecord(row)?.kind).toUpperCase() === 'EDIBLE');
    nonEdible = raw.find((row) => str(asRecord(row)?.kind).toUpperCase() === 'NON_EDIBLE');
  } else {
    const map = asRecord(raw) ?? {};
    edible = map.EDIBLE ?? map.edible;
    nonEdible = map.NON_EDIBLE ?? map.nonEdible;
  }
  const withStatus = (kind: FoodListingKind, value: unknown) => {
    const row = asRecord(value) ?? {};
    return row.status == null ? { ...row, status: kindStatusFromLines(kind, rawLines) } : row;
  };
  return {
    EDIBLE: normalizeKindOutcome('EDIBLE', withStatus('EDIBLE', edible)),
    NON_EDIBLE: normalizeKindOutcome('NON_EDIBLE', withStatus('NON_EDIBLE', nonEdible)),
  };
}

export function normalizeRecordDetail(value: unknown): RecordDetail {
  const body = asRecord(unwrapData(value)) ?? {};
  const record = normalizeRecord(asRecord(body.record) ?? body);
  const rawLines = asArray(body.lines, ['lines', 'items', 'data']);
  const lines = rawLines.map(normalizeLine).filter((line) => line.clientKey && !line.deletedAt);

  let lineOutcomes: LineOutcome[] = [];
  if (Array.isArray(body.lineOutcomes) || Array.isArray(body.outcomesByLine)) {
    lineOutcomes = asArray(body.lineOutcomes ?? body.outcomesByLine).map((row) => normalizeLineOutcome(row));
  } else {
    // The server puts each line's outcome on the line itself (listedKg, availableKg …); older shapes nest it.
    lineOutcomes = rawLines
      .map((row) => {
        const line = asRecord(row) ?? {};
        if (line.deletedAt) return null;
        const nested = asRecord(line.outcome);
        if (nested) return normalizeLineOutcome({ qtyKg: line.qtyKg, ...nested }, num(line.id));
        if (line.availableKg != null || line.listedKg != null) return normalizeLineOutcome(line, num(line.id));
        return null;
      })
      .filter((row): row is LineOutcome => row !== null);
  }

  return {
    record: { ...record, totals: body.totals ? normalizeTotals(body.totals) : record.totals },
    lines,
    totals: normalizeTotals(body.totals ?? record.totals),
    outcomes: readOutcomes(body, rawLines),
    lineOutcomes,
  };
}

export function normalizePutLinesResult(value: unknown): PutLinesResult {
  const body = asRecord(unwrapData(value)) ?? {};
  const record = asRecord(body.record);
  return {
    version: num(body.version ?? record?.version, 0),
    lines: asArray(body.lines, ['lines', 'items', 'data'])
      .map(normalizeLine)
      .filter((line) => line.clientKey && !line.deletedAt),
    totals: normalizeTotals(body.totals ?? record?.totals),
  };
}

export function normalizeListingPrefill(value: unknown, kind: FoodListingKind): ListingPrefill {
  const body = asRecord(unwrapData(value)) ?? {};
  const items = asArray(body.items ?? body.lines).map((row) => {
    const record = asRecord(row) ?? {};
    const countedKg = kg(record.countedKg ?? record.qtyKg);
    return {
      lineId: num(record.lineId ?? record.id),
      name: str(record.name, 'Food'),
      category: str(record.category),
      iconKey: strOrNull(record.iconKey),
      countedKg,
      availableKg: record.availableKg == null ? countedKg : kg(record.availableKg),
    };
  });
  return {
    kind,
    items,
    totalKg: body.totalKg == null ? roundKg(items.reduce((sum, item) => sum + item.availableKg, 0)) : kg(body.totalKg),
  };
}

export function normalizeHomeImpact(value: unknown): HomeImpact {
  const record = asRecord(unwrapData(value)) ?? {};
  return {
    recordedKg: kg(record.recordedKg),
    divertedKg: kg(record.divertedKg),
    collections: num(record.collections),
    co2AvoidedKg: kg(record.co2AvoidedKg),
  };
}

function normalizeFilters(value: unknown): InsightsFilters {
  const body = asRecord(unwrapData(value)) ?? {};
  return {
    groups: asArray(body.groups).map((row) => {
      const record = asRecord(row) ?? {};
      return { id: num(record.id), name: str(record.name, 'Group') };
    }),
    territories: asArray(body.territories).map((row) => {
      const record = asRecord(row) ?? {};
      return { id: num(record.id), name: str(record.name, 'Territory'), groupId: numOrNull(record.groupId) };
    }),
    clusters: asArray(body.clusters).map((row) => {
      const record = asRecord(row) ?? {};
      return {
        id: num(record.id),
        name: str(record.name, 'Cluster'),
        groupId: numOrNull(record.groupId),
        territoryId: numOrNull(record.territoryId),
      };
    }),
    sites: asArray(body.sites).map((row) => {
      const record = asRecord(row) ?? {};
      return {
        id: num(record.id),
        name: str(record.name ?? record.siteName ?? record.locationName, 'Site'),
        groupId: numOrNull(record.groupId),
        territoryId: numOrNull(record.territoryId),
        clusterId: numOrNull(record.clusterId),
      };
    }),
  };
}

function normalizeDestinations(value: unknown): InsightsDestination[] {
  return asArray(value).map((row) => {
    const record = asRecord(row) ?? {};
    return {
      pathway: str(record.pathway, 'OTHER'),
      kg: kg(record.kg),
      shareOfRecovered: num(record.shareOfRecovered),
    };
  });
}

/** "meat_poultry" → "Meat poultry"; screens prefer the taxonomy label when they have it. */
export function humanizeKey(key: string): string {
  const text = key.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return text ? text[0].toUpperCase() + text.slice(1) : key;
}

function normalizeCategoryRows(value: unknown): InsightsCategoryRow[] {
  return asArray(value).map((row) => {
    const record = asRecord(row) ?? {};
    const category = str(record.category ?? record.key);
    // The server sends `{ category, kg }` where kg is what was collected (recovered).
    const recoveredKg = kg(record.recoveredKg ?? record.kg);
    const recordedKg = record.recordedKg == null ? recoveredKg : kg(record.recordedKg);
    return {
      category,
      label: str(record.label, humanizeKey(category)),
      recordedKg,
      recoveredKg,
      notRecoveredKg: record.notRecoveredKg == null ? roundKg(Math.max(0, recordedKg - recoveredKg)) : kg(record.notRecoveredKg),
    };
  });
}

function readFiltersApplied(value: unknown): Partial<InsightsQuery> {
  const record = asRecord(value) ?? {};
  const out: Partial<InsightsQuery> = {};
  if (record.from != null) out.from = str(record.from);
  if (record.to != null) out.to = str(record.to);
  for (const key of ['groupId', 'territoryId', 'clusterId', 'siteId'] as const) {
    const parsed = numOrNull(record[key]);
    if (parsed != null) out[key] = parsed;
  }
  return out;
}

export function normalizeInsights(value: unknown): InsightsPayload {
  const body = asRecord(unwrapData(value)) ?? {};
  const overview = asRecord(body.overview) ?? {};
  const what = asRecord(body.whatHappened) ?? {};
  const notRecovered = asRecord(what.notRecovered) ?? {};
  const redistributed = asRecord(body.redistributed) ?? {};
  return {
    filtersApplied: readFiltersApplied(body.filtersApplied),
    isDemo: Boolean(body.isDemo),
    overview: {
      recordedKg: kg(overview.recordedKg),
      recoveredKg: kg(overview.recoveredKg),
      notRecoveredKg: kg(overview.notRecoveredKg),
      estimatedMeals: num(overview.estimatedMeals),
      estimatedCo2Kg: kg(overview.estimatedCo2Kg),
    },
    destinations: normalizeDestinations(body.destinations),
    bySource: asArray(body.bySource).map((row) => {
      const record = asRecord(row) ?? {};
      return {
        source: sourceOf(record.source),
        recordedKg: kg(record.recordedKg),
        recoveredKg: kg(record.recoveredKg),
        notRecoveredKg: kg(record.notRecoveredKg),
      };
    }),
    whatHappened: {
      recordedKg: kg(what.recordedKg),
      listedKg: kg(what.listedKg),
      claimedKg: kg(what.claimedKg),
      collectedKg: kg(what.collectedKg),
      notRecovered: {
        notListed: kg(notRecovered.notListed),
        listedNotClaimed: kg(notRecovered.listedNotClaimed),
        expired: kg(notRecovered.expired),
        cancelled: kg(notRecovered.cancelled),
        claimedNotCollected: kg(notRecovered.claimedNotCollected),
      },
    },
    redistributed: {
      byCategory: normalizeCategoryRows(redistributed.byCategory),
      bySite: asArray(redistributed.bySite).map((row) => {
        const record = asRecord(row) ?? {};
        return {
          siteId: num(record.siteId ?? record.id),
          siteName: str(record.siteName ?? record.name, 'Site'),
          recordedKg: kg(record.recordedKg),
          recoveredKg: kg(record.recoveredKg),
        };
      }),
      trend: asArray(redistributed.trend).map((row) => {
        const record = asRecord(row) ?? {};
        return {
          bucketStart: str(record.bucketStart),
          recordedKg: kg(record.recordedKg),
          recoveredKg: kg(record.recoveredKg),
        };
      }),
    },
  };
}

export function normalizeSourceDrilldown(value: unknown, source: FoodSource): SourceDrilldown {
  const body = asRecord(unwrapData(value)) ?? {};
  // GET /insights/sources/:source returns the insights payload narrowed to that source.
  const totals = asRecord(body.overview) ?? asRecord(body.totals) ?? body;
  const redistributed = asRecord(body.redistributed) ?? {};
  return {
    source: sourceOf(asRecord(body.filtersApplied)?.source ?? body.source, source),
    recordedKg: kg(totals.recordedKg),
    recoveredKg: kg(totals.recoveredKg),
    notRecoveredKg: kg(totals.notRecoveredKg),
    categories: normalizeCategoryRows(body.categories ?? redistributed.byCategory),
    destinations: normalizeDestinations(body.destinations),
  };
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export type MfcErrorInfo = {
  /** HTTP status; 0 when there was no response (offline, timeout). */
  status: number;
  /** True for no response, timeouts and 5xx: safe to retry later. */
  retryable: boolean;
  message: string;
  body: MfcConflictBody | null;
};

export function readMfcError(error: unknown): MfcErrorInfo {
  const response = (error as { response?: { status?: number; data?: unknown } })?.response;
  const status = Number(response?.status) || 0;
  const raw = asRecord(response?.data);
  const nested = asRecord(raw?.message) ?? asRecord(raw?.error);
  const source = nested ?? raw;
  const body: MfcConflictBody | null = source
    ? {
        currentVersion: numOrNull(source.currentVersion) ?? undefined,
        code: source.code == null ? undefined : str(source.code),
        lineId: numOrNull(source.lineId) ?? undefined,
        listedKg: numOrNull(source.listedKg) ?? undefined,
        message: typeof source.message === 'string' ? source.message : undefined,
      }
    : null;
  const serverMessage =
    typeof raw?.message === 'string'
      ? raw.message
      : Array.isArray(raw?.message)
        ? raw.message.map((entry) => String(entry)).join(' ')
        : body?.message;
  return {
    status,
    retryable: status === 0 || status >= 500 || status === 408 || status === 429,
    message: serverMessage?.trim() || getUserFriendlyErrorMessage(error, 'Could not save your food record.'),
    body,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const response = await api.get(path, { params, skipBillingHandler: true });
  return response.data as T;
}

function cleanParams<T extends Record<string, unknown>>(params: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') out[key] = value;
  }
  return out;
}

/** Backend DTOs forbid unknown keys, so send only these. */
function lineBody(line: LineWritePayload): Record<string, unknown> {
  return cleanParams({
    clientKey: line.clientKey,
    source: line.source,
    category: line.category,
    subtype: line.subtype,
    qtyKg: roundKg(line.qtyKg),
    fitForHumans: line.fitForHumans,
  });
}

export const makeFoodCountService = {
  async getTaxonomy(): Promise<Taxonomy> {
    return normalizeTaxonomy(await get('/mfc/taxonomy'));
  },

  /** Idempotent on clientRequestId: a retry returns the same record. */
  async createRecord(payload: CreateRecordPayload): Promise<FoodRecord> {
    const response = await api.post('/mfc/records', cleanParams({ ...payload }));
    return normalizeRecord(response.data);
  },

  async listRecords(filters: RecordListFilters = {}): Promise<RecordListPage> {
    const body = await get('/mfc/records', cleanParams({ ...filters }));
    const record = asRecord(unwrapData(body)) ?? {};
    return {
      items: asArray(body, ['records', 'items', 'data', 'rows', 'results']).map(normalizeRecord),
      nextCursor: strOrNull(record.nextCursor ?? asRecord(body)?.nextCursor),
    };
  },

  async getRecord(id: number): Promise<RecordDetail> {
    return normalizeRecordDetail(await get(`/mfc/records/${id}`));
  },

  async updateRecord(id: number, payload: UpdateRecordPayload): Promise<FoodRecord> {
    const response = await api.patch(`/mfc/records/${id}`, cleanParams({ ...payload }));
    return normalizeRecord(response.data);
  },

  /** Sends the full set of live lines; the server diffs by clientKey. */
  async putLines(id: number, version: number, lines: LineWritePayload[]): Promise<PutLinesResult> {
    const response = await api.put(`/mfc/records/${id}/lines`, { version, lines: lines.map(lineBody) });
    return normalizePutLinesResult(response.data);
  },

  /** DRAFT → SAVED. Idempotent. */
  async saveRecord(id: number, version: number): Promise<FoodRecord> {
    const response = await api.post(`/mfc/records/${id}/save`, { version });
    return normalizeRecord(response.data);
  },

  async getListingPrefill(id: number, kind: FoodListingKind): Promise<ListingPrefill> {
    return normalizeListingPrefill(await get(`/mfc/records/${id}/listing-prefill`, { kind }), kind);
  },

  async getHomeImpact(siteId?: number): Promise<HomeImpact> {
    return normalizeHomeImpact(await get('/mfc/home-impact', cleanParams({ siteId })));
  },

  async getInsightsFilters(): Promise<InsightsFilters> {
    return normalizeFilters(await get('/mfc/insights/filters'));
  },

  async getInsights(query: InsightsQuery): Promise<InsightsPayload> {
    return normalizeInsights(await get('/mfc/insights', cleanParams({ ...query })));
  },

  async getSourceDrilldown(source: FoodSource, query: InsightsQuery): Promise<SourceDrilldown> {
    return normalizeSourceDrilldown(await get(`/mfc/insights/sources/${source}`, cleanParams({ ...query })), source);
  },
};
