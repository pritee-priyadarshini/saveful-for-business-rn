/**
 * Make Food Count (MFC) types. They mirror svforb docs/make-food-count/SPEC.md §3–§5 and §7.
 * Quantities are numbers rounded to 2 dp here; the API sends Decimal strings and the
 * service normalisers convert them.
 */

// ─── Enums ───────────────────────────────────────────────────────────────────

export type FoodSource = 'OVERPRODUCTION' | 'SPOILAGE' | 'PREPARATION' | 'PLATE_SCRAPS';

export const FOOD_SOURCES: readonly FoodSource[] = [
  'OVERPRODUCTION',
  'SPOILAGE',
  'PREPARATION',
  'PLATE_SCRAPS',
];

export type FoodRecordStatus = 'DRAFT' | 'SAVED';

/** EDIBLE = people listing (fit lines). NON_EDIBLE = not-fit listing (every other line). */
export type FoodListingKind = 'EDIBLE' | 'NON_EDIBLE';

// ─── Taxonomy (§4) ───────────────────────────────────────────────────────────

export type TaxonomySubtype = {
  key: string;
  label: string;
  imageKey: string | null;
  listingName: string;
  listingIconKey: string | null;
};

export type TaxonomyEntry = {
  source: FoodSource;
  key: string;
  label: string;
  imageKey: string | null;
  /** Name used on the listing, e.g. "Fresh fruit & veg". */
  listingName: string;
  listingIconKey: string | null;
  /** True only for Overproduction rows; gates the "Fit for humans" checkbox. */
  fitAllowed: boolean;
  /** Present for the group rows (Meat & poultry, Seafood). */
  subtypes?: TaxonomySubtype[];
};

export type TaxonomyLimits = {
  maxKgPerLine: number;
  decimals: number;
};

export type Taxonomy = {
  taxonomyVersion: string;
  entries: TaxonomyEntry[];
  limits: TaxonomyLimits;
};

// ─── Records (§3, §5) ────────────────────────────────────────────────────────

export type FoodRecordLine = {
  /** Server id; absent for lines that were never saved. */
  id?: number;
  /** Stable key from the app; unique per record. */
  clientKey: string;
  source: FoodSource;
  /** Taxonomy key, e.g. "meat_poultry". */
  category: string;
  /** Taxonomy subtype key, e.g. "chicken". */
  subtype: string | null;
  qtyKg: number;
  fitForHumans: boolean;
  /** Set on soft-deleted lines; such lines never count. */
  deletedAt?: string | null;
};

export type RecordTotals = {
  totalKg: number;
  fitKg: number;
  notFitKg: number;
};

export type FoodRecord = {
  id: number;
  organisationId: number | null;
  siteId: number;
  siteName: string | null;
  createdById: number | null;
  recordedAt: string;
  status: FoodRecordStatus;
  sources: FoodSource[];
  /** Optimistic lock; send with every write. */
  version: number;
  clientRequestId: string;
  createdAt: string | null;
  updatedAt: string | null;
  /** Present on list rows and detail. */
  totals: RecordTotals | null;
};

export type KindOutcomeStatus = string;

/** Per-listing-kind result for a record (§5 GET /records/:id, §7). */
export type KindOutcome = {
  kind: FoodListingKind;
  eligibleKg: number;
  listedKg: number;
  claimedKg: number;
  collectedKg: number;
  /** Server label, e.g. NOT_LISTED, LISTED, CLAIMED, COLLECTED, EXPIRED, CANCELLED. */
  status: KindOutcomeStatus;
  /** Who claimed the food, when the server sends it. Shown as "Claimed by <name>". */
  claimedByName?: string | null;
};

export type LineOutcome = {
  lineId: number;
  qtyKg: number;
  /** qtyKg minus kg on active listings. Prefill and edit limits use this. */
  availableKg: number;
  listedKg: number;
  claimedKg: number;
  collectedKg: number;
};

export type RecordDetail = {
  record: FoodRecord;
  lines: FoodRecordLine[];
  totals: RecordTotals;
  outcomes: Record<FoodListingKind, KindOutcome>;
  lineOutcomes: LineOutcome[];
};

export type RecordListFilters = {
  siteId?: number;
  status?: FoodRecordStatus;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
};

export type RecordListPage = {
  items: FoodRecord[];
  nextCursor: string | null;
};

// ─── Listing prefill ─────────────────────────────────────────────────────────

export type ListingPrefillItem = {
  lineId: number;
  name: string;
  category: string;
  /** Taxonomy subtype key (e.g. "beef"), when the line has one. */
  subtype?: string | null;
  iconKey: string | null;
  countedKg: number;
  availableKg: number;
};

/** Route param the Summary passes to CreateListing / CreateFarmListing (prefill UI is built in A5). */
export type MfcListingRouteParams = {
  recordId: number;
  kind: FoodListingKind;
  items: ListingPrefillItem[];
};

export type ListingPrefill = {
  kind: FoodListingKind;
  items: ListingPrefillItem[];
  totalKg: number;
};

// ─── Home impact ─────────────────────────────────────────────────────────────

export type HomeImpact = {
  recordedKg: number;
  divertedKg: number;
  collections: number;
  co2AvoidedKg: number;
};

// ─── Insights (§5, §7) ───────────────────────────────────────────────────────

export type InsightsFilterGroup = { id: number; name: string };
export type InsightsFilterTerritory = { id: number; name: string; groupId: number | null };
export type InsightsFilterCluster = {
  id: number;
  name: string;
  groupId: number | null;
  territoryId: number | null;
};
export type InsightsFilterSite = {
  id: number;
  name: string;
  groupId: number | null;
  territoryId: number | null;
  clusterId: number | null;
};

/** GET /insights/filters: options within the caller's reach. */
export type InsightsFilters = {
  groups: InsightsFilterGroup[];
  territories: InsightsFilterTerritory[];
  clusters: InsightsFilterCluster[];
  sites: InsightsFilterSite[];
};

/** Query for GET /insights and GET /insights/sources/:source. One state serves all views. */
export type InsightsQuery = {
  from: string;
  to: string;
  groupId?: number;
  territoryId?: number;
  clusterId?: number;
  siteId?: number;
};

export type InsightsOverview = {
  recordedKg: number;
  recoveredKg: number;
  notRecoveredKg: number;
  estimatedMeals: number;
  estimatedCo2Kg: number;
};

export type InsightsDestination = {
  /** Recovery pathway key, e.g. CHARITY, ANIMAL_FEED, COMPOST, BIOENERGY. */
  pathway: string;
  kg: number;
  shareOfRecovered: number;
};

export type InsightsSourceRow = {
  source: FoodSource;
  recordedKg: number;
  recoveredKg: number;
  notRecoveredKg: number;
};

export type NotRecoveredBreakdown = {
  notListed: number;
  listedNotClaimed: number;
  expired: number;
  cancelled: number;
  claimedNotCollected: number;
};

export type InsightsWhatHappened = {
  recordedKg: number;
  listedKg: number;
  claimedKg: number;
  collectedKg: number;
  notRecovered: NotRecoveredBreakdown;
};

export type InsightsCategoryRow = {
  category: string;
  label: string;
  recordedKg: number;
  recoveredKg: number;
  notRecoveredKg: number;
};

export type InsightsSiteRow = {
  siteId: number;
  siteName: string;
  recordedKg: number;
  recoveredKg: number;
};

export type InsightsTrendPoint = {
  bucketStart: string;
  recordedKg: number;
  recoveredKg: number;
};

export type InsightsRedistributed = {
  byCategory: InsightsCategoryRow[];
  bySite: InsightsSiteRow[];
  trend: InsightsTrendPoint[];
};

export type InsightsPayload = {
  filtersApplied: Partial<InsightsQuery>;
  /** Always false from the server in production. */
  isDemo: boolean;
  overview: InsightsOverview;
  destinations: InsightsDestination[];
  bySource: InsightsSourceRow[];
  whatHappened: InsightsWhatHappened;
  redistributed: InsightsRedistributed;
};

export type SourceDrilldown = {
  source: FoodSource;
  recordedKg: number;
  recoveredKg: number;
  notRecoveredKg: number;
  categories: InsightsCategoryRow[];
  destinations: InsightsDestination[];
};

// ─── Write payloads ──────────────────────────────────────────────────────────

/** One line in PUT /records/:id/lines. The call sends the full set of live lines. */
export type LineWritePayload = {
  clientKey: string;
  source: FoodSource;
  category: string;
  subtype?: string;
  qtyKg: number;
  fitForHumans?: boolean;
};

export type CreateRecordPayload = {
  siteId: number;
  clientRequestId: string;
  sources: FoodSource[];
  recordedAt?: string;
};

export type UpdateRecordPayload = {
  version: number;
  sources?: FoodSource[];
  recordedAt?: string;
};

export type PutLinesResult = {
  version: number;
  lines: FoodRecordLine[];
  totals: RecordTotals;
};

/** Body of a 409 from a write. A version clash carries currentVersion; a line guard carries code. */
export type MfcConflictBody = {
  currentVersion?: number;
  code?: string;
  lineId?: number;
  listedKg?: number;
  message?: string;
};

// ─── Sync state and draft store shapes ───────────────────────────────────────

export type MfcSyncStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'offline' | 'conflict';

/** What identifies a line when the app writes to it. */
export type MfcLineIdentity = {
  clientKey: string;
  source: FoodSource;
  category: string;
  subtype: string | null;
};

/** A line as held in the draft store. qtyKg null = "not entered" (never sent, never a saved 0). */
export type MfcDraftLine = MfcLineIdentity & {
  id?: number;
  qtyKg: number | null;
  fitForHumans: boolean;
};

/** A listing the server refused to change, shown inline against its line. */
export type MfcLockedLine = {
  lineId: number | null;
  listedKg: number | null;
  message: string;
};

/** The slice of the store that is persisted to AsyncStorage. */
export type MfcPersistedDraft = {
  clientRequestId: string | null;
  recordId: number | null;
  siteId: number | null;
  version: number | null;
  status: FoodRecordStatus | null;
  sources: FoodSource[];
  lines: Record<string, MfcDraftLine>;
  selectedSource: FoodSource | null;
  /** The account that opened this draft on this phone; another account never inherits it. */
  ownerUserId?: number | null;
};
