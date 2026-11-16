import api from './api';
import { foodListingService } from './foodListing.service';
import type {
  AuditEntry,
  ChangeRequest,
  CollectionDashboard,
  CollectionListItem,
  CollectionPoint,
  CollectionStatus,
  ConsolidatedGroup,
  ConsolidatedMe,
  ConsolidatedSchedule,
  ContributionDetail,
  ContributionStatus,
  CreateGroupPayload,
  DashboardContribution,
  Declarations,
  EligibleSite,
  EligibleUser,
  HandoverMethod,
  ItemCheckPayload,
  ItemCheckView,
  OpenCollection,
  Paged,
  PermissionUser,
  PointPayload,
  PublishPreview,
  RejectionReason,
  SiteInvitation,
  SiteInvitationStatus,
  ScheduleTimes,
  ReportCollectionRow,
  ReportSummary,
  SchedulePayload,
} from '@/types/consolidated';
import { DECLARATION_FALLBACK } from '@/utils/consolidated';

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

function asArray(value: unknown): unknown[] {
  const unwrapped = unwrapData(value);
  if (Array.isArray(unwrapped)) return unwrapped;
  const record = asRecord(unwrapped) ?? asRecord(value);
  if (!record) return [];
  for (const key of [
    'items',
    'data',
    'groups',
    'collections',
    'contributions',
    'users',
    'sites',
    'rows',
    'results',
    'entries',
    'points',
  ]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function pageOf<T>(body: unknown, items: T[]): Paged<T> {
  const record = asRecord(body) ?? {};
  const inner = asRecord(unwrapData(body)) ?? record;
  const page = Number(inner.page ?? record.page ?? 1) || 1;
  const totalPages = Number(inner.totalPages ?? inner.pages ?? record.totalPages ?? 1) || 1;
  return { items, page, totalPages: Math.max(1, totalPages, items.length ? 1 : 1) };
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

function person(value: unknown): { id: number; name: string } | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = num(record.id ?? record.userId, 0);
  const name =
    str(record.name) ||
    [record.firstName, record.lastName].filter(Boolean).join(' ').trim();
  if (!id && !name) return null;
  return { id, name: name || 'User' };
}

function point(value: unknown): CollectionPoint {
  const record = asRecord(value) ?? {};
  return {
    id: num(record.id),
    name: str(record.name, 'Collection point'),
    address: str(record.address),
    postcode: record.postcode == null ? null : str(record.postcode),
    lat: num(record.lat ?? record.latitude),
    lng: num(record.lng ?? record.longitude),
    directions: record.directions == null ? null : str(record.directions),
    isDefault: Boolean(record.isDefault),
    isActive: record.isActive == null ? true : Boolean(record.isActive),
  };
}

function normalizeGroup(value: unknown): ConsolidatedGroup {
  const record = asRecord(unwrapData(value)) ?? {};
  const host = asRecord(record.hostSite) ?? asRecord(record.host) ?? {};
  const sites = asArray(record.sites).map((site) => {
    const row = asRecord(site) ?? {};
    const nested = asRecord(row.site) ?? row;
    return {
      id: num(nested.id ?? row.siteId ?? row.id),
      name: str(nested.name || nested.siteName || nested.organisationName || row.name, 'Site'),
      removedAt: row.removedAt == null ? null : str(row.removedAt),
      invitationStatus: (row.invitationStatus ? str(row.invitationStatus) : 'ACCEPTED') as SiteInvitationStatus,
    };
  });
  const members = asArray(record.members ?? record.users);
  const managers = asArray(record.managers).map((row) => person(asRecord(row)?.user ?? row)).filter(Boolean) as {
    id: number;
    name: string;
  }[];
  const receivers = asArray(record.receivers).map((row) => person(asRecord(row)?.user ?? row)).filter(Boolean) as {
    id: number;
    name: string;
  }[];
  for (const member of members) {
    const row = asRecord(member) ?? {};
    const who = person(row.user ?? row);
    if (!who) continue;
    const role = str(row.role).toUpperCase();
    if (role === 'RECEIVER') receivers.push(who);
    else managers.push(who);
  }
  const next = asRecord(record.nextCollection);
  return {
    id: num(record.id),
    name: str(record.name, 'Collection group'),
    description: record.description == null ? null : str(record.description),
    hostSite: { id: num(host.id ?? record.hostSiteId), name: str(host.name || host.siteName || host.organisationName, 'Host site') },
    timezone: str(record.timezone, 'Australia/Melbourne'),
    points: asArray(record.points ?? record.collectionPoints).map(point),
    sites,
    managers,
    receivers,
    isActive: record.isActive == null ? record.archivedAt == null && record.status !== 'ARCHIVED' : Boolean(record.isActive),
    siteCount: num(record.siteCount, sites.filter((site) => !site.removedAt).length),
    acceptedSiteCount: num(
      record.acceptedSiteCount,
      sites.filter((site) => !site.removedAt && site.invitationStatus === 'ACCEPTED').length,
    ),
    pendingSiteCount: num(
      record.pendingSiteCount,
      sites.filter((site) => !site.removedAt && site.invitationStatus === 'PENDING').length,
    ),
    nextCollection: next
      ? {
          id: num(next.id),
          scheduledDate: str(next.scheduledDate ?? next.date),
          status: str(next.status, 'SCHEDULED') as CollectionStatus,
        }
      : null,
  };
}

function normalizeOpen(value: unknown): OpenCollection {
  const record = asRecord(value) ?? {};
  const times = asRecord(record.times) ?? record;
  const pt = asRecord(record.point) ?? asRecord(record.collectionPoint) ?? {};
  return {
    id: num(record.id),
    groupName: str(record.groupName ?? asRecord(record.group)?.name, 'Shared collection'),
    point: {
      name: str(pt.name, 'Collection point'),
      address: str(pt.address),
      directions: pt.directions == null ? null : str(pt.directions),
    },
    method: (str(record.method, 'SITE_DROP_OFF') as HandoverMethod),
    scheduledDate: str(record.scheduledDate ?? times.scheduledDate),
    submissionsCloseAt: str(record.submissionsCloseAt ?? times.submissionsCloseAt),
    handoverStartAt: str(record.handoverStartAt ?? times.handoverStartAt),
    handoverEndAt: str(record.handoverEndAt ?? times.handoverEndAt),
    pickupStartAt: str(record.pickupStartAt ?? times.pickupStartAt),
    pickupEndAt: str(record.pickupEndAt ?? times.pickupEndAt),
    suitabilityNotes: str(record.suitabilityNotes),
    instructions: record.instructions == null ? null : str(record.instructions),
    lateAllowed: Boolean(record.lateAllowed ?? record.isLate),
    timezone: str(record.timezone, 'Australia/Melbourne'),
  };
}

function normalizeItem(value: unknown) {
  const record = asRecord(value) ?? {};
  return {
    itemId: numOrNull(record.itemId),
    foodItemId: num(record.foodItemId ?? record.id),
    name: str(record.name, 'Food'),
    category: record.category == null ? null : str(record.category),
    quantityDescription: record.quantityDescription == null ? null : str(record.quantityDescription),
    submittedQtyKg: num(record.submittedQtyKg ?? record.totalQtyKg ?? record.qtyKg),
    verifiedQtyKg: numOrNull(record.verifiedQtyKg),
    acceptedQtyKg: numOrNull(record.acceptedQtyKg),
    rejectedQtyKg: numOrNull(record.rejectedQtyKg),
    unavailableQtyKg: numOrNull(record.unavailableQtyKg),
    rejectionReason: (record.rejectionReason as RejectionReason) ?? null,
    bestBefore: record.bestBefore == null ? null : str(record.bestBefore),
  };
}

function normalizeContribution(value: unknown): DashboardContribution {
  const record = asRecord(value) ?? {};
  const site = asRecord(record.site) ?? {};
  const handover = asRecord(record.handover);
  const receipt = asRecord(record.receipt);
  return {
    id: num(record.id),
    site: { id: num(site.id ?? record.siteId), name: str(site.name || site.siteName || site.organisationName || record.siteName, 'Site') },
    listingId: num(record.listingId),
    status: str(record.status, 'SUBMITTED') as ContributionStatus,
    submittedAt: record.submittedAt == null ? null : str(record.submittedAt),
    submittedBy: person(record.submittedBy),
    isLate: Boolean(record.isLate),
    handover: handover
      ? { at: str(handover.at ?? handover.handedOverAt), by: person(handover.by) }
      : null,
    receipt: receipt
      ? {
          status: str(receipt.status, 'PENDING') as 'PENDING' | 'RECEIVED' | 'NOT_RECEIVED',
          at: receipt.at == null ? null : str(receipt.at),
          by: person(receipt.by),
          note: receipt.note == null ? null : str(receipt.note),
        }
      : null,
    items: asArray(record.items ?? record.foodItems).map(normalizeItem),
    storage: (asRecord(record.storage) as DashboardContribution['storage']) ?? null,
    allergens: Array.isArray(record.allergens) ? record.allergens.map((entry) => String(entry)) : [],
    pendingChangeRequestId: numOrNull(record.pendingChangeRequestId),
    exceptions: Array.isArray(record.exceptions) ? record.exceptions.map((entry) => String(entry)) : [],
    collectionNotes: record.collectionNotes == null ? null : str(record.collectionNotes),
  };
}

function normalizeDashboard(value: unknown): CollectionDashboard {
  const record = asRecord(unwrapData(value)) ?? {};
  const times = asRecord(record.times) ?? {};
  const group = asRecord(record.group) ?? {};
  const totals = asRecord(record.totals);
  const counts = asRecord(record.counts);
  const publication = asRecord(record.publication);
  const claim = asRecord(record.claim);
  const driver = asRecord(claim?.driverPickup);
  const permissions = asRecord(record.permissions);
  const contact = asRecord(record.contact);
  return {
    id: num(record.id),
    status: str(record.status, 'SCHEDULED') as CollectionStatus,
    cancelReason: record.cancelReason == null ? null : str(record.cancelReason),
    method: str(record.method, 'SITE_DROP_OFF') as HandoverMethod,
    timezone: str(record.timezone, 'Australia/Melbourne'),
    scheduleId: numOrNull(record.scheduleId ?? asRecord(record.schedule)?.id),
    scheduledDate: record.scheduledDate == null ? null : str(record.scheduledDate),
    group: { id: num(group.id), name: str(group.name, 'Collection') },
    point: point(record.point ?? record.collectionPoint),
    times: {
      opensAt: times.opensAt == null ? null : str(times.opensAt),
      submissionsCloseAt: times.submissionsCloseAt == null ? null : str(times.submissionsCloseAt),
      handoverStartAt: times.handoverStartAt == null ? null : str(times.handoverStartAt),
      handoverEndAt: times.handoverEndAt == null ? null : str(times.handoverEndAt),
      pickupStartAt: times.pickupStartAt == null ? null : str(times.pickupStartAt),
      pickupEndAt: times.pickupEndAt == null ? null : str(times.pickupEndAt),
      reopenedUntil: times.reopenedUntil == null ? null : str(times.reopenedUntil),
    },
    contact: contact ? { name: str(contact.name), phone: str(contact.phone) } : null,
    instructions: record.instructions == null ? null : str(record.instructions),
    suitabilityNotes: record.suitabilityNotes == null ? null : str(record.suitabilityNotes),
    participatingSiteIds: Array.isArray(record.participatingSiteIds)
      ? record.participatingSiteIds.map((id) => num(id)).filter((id) => id > 0)
      : undefined,
    totals: totals
      ? {
          submittedKg: numOrNull(totals.submittedKg),
          verifiedKg: numOrNull(totals.verifiedKg),
          acceptedKg: numOrNull(totals.acceptedKg),
          rejectedKg: numOrNull(totals.rejectedKg),
          unavailableKg: numOrNull(totals.unavailableKg),
        }
      : null,
    counts: counts
      ? {
          participating: num(counts.participating),
          submitted: num(counts.submitted),
          handedOver: num(counts.handedOver),
          received: num(counts.received),
          notReceived: num(counts.notReceived),
          noContribution: num(counts.noContribution),
          late: num(counts.late),
        }
      : null,
    contributions: asArray(record.contributions).map(normalizeContribution),
    sitesWithoutContribution: asArray(record.sitesWithoutContribution).map((site) => {
      const row = asRecord(site) ?? {};
      return { id: num(row.id), name: str(row.name, 'Site') };
    }),
    publication: publication
      ? {
          masterListingId: numOrNull(publication.masterListingId),
          publishedAt: publication.publishedAt == null ? null : str(publication.publishedAt),
          publishedBy: person(publication.publishedBy),
          declarationVersion: publication.declarationVersion == null ? null : str(publication.declarationVersion),
        }
      : null,
    claim: claim
      ? {
          id: num(claim.id),
          charityName: claim.charityName == null ? null : str(claim.charityName),
          claimedAt: claim.claimedAt == null ? null : str(claim.claimedAt),
          status: claim.status == null ? null : str(claim.status),
          driverPickup: driver
            ? {
                status: driver.status == null ? null : str(driver.status),
                driverName: driver.driverName == null ? null : str(driver.driverName),
              }
            : null,
        }
      : null,
    pendingMaterialChange: asRecord(record.pendingMaterialChange)
      ? {
          id: num(asRecord(record.pendingMaterialChange)?.id),
          summary: str(asRecord(record.pendingMaterialChange)?.summary),
        }
      : null,
    permissions: permissions
      ? {
          canManage: Boolean(permissions.canManage),
          canReceive: Boolean(permissions.canReceive),
          canPublish: permissions.canPublish == null ? undefined : Boolean(permissions.canPublish),
          publishBlockers: Array.isArray(permissions.publishBlockers)
            ? permissions.publishBlockers.map((entry) => String(entry))
            : [],
        }
      : undefined,
  };
}

function normalizeListItem(value: unknown): CollectionListItem {
  const record = asRecord(value) ?? {};
  const dash = record.times ? null : null;
  void dash;
  const times = asRecord(record.times) ?? record;
  const group = asRecord(record.group) ?? {};
  const pt = asRecord(record.point) ?? {};
  const counts = asRecord(record.counts);
  const totals = asRecord(record.totals);
  return {
    id: num(record.id),
    status: str(record.status, 'SCHEDULED') as CollectionStatus,
    method: str(record.method, 'SITE_DROP_OFF') as HandoverMethod,
    timezone: str(record.timezone, 'Australia/Melbourne'),
    scheduledDate: str(record.scheduledDate ?? times.pickupStartAt ?? times.handoverStartAt),
    group: { id: num(group.id ?? record.groupId), name: str(group.name ?? record.groupName, 'Collection') },
    point: { id: num(pt.id), name: str(pt.name ?? record.pointName, 'Collection point'), address: str(pt.address) },
    times: {
      submissionsCloseAt: times.submissionsCloseAt == null ? null : str(times.submissionsCloseAt),
      handoverStartAt: times.handoverStartAt == null ? null : str(times.handoverStartAt),
      handoverEndAt: times.handoverEndAt == null ? null : str(times.handoverEndAt),
      pickupStartAt: times.pickupStartAt == null ? null : str(times.pickupStartAt),
      pickupEndAt: times.pickupEndAt == null ? null : str(times.pickupEndAt),
    },
    counts: counts
      ? { participating: num(counts.participating), submitted: num(counts.submitted) }
      : undefined,
    totals: totals
      ? { submittedKg: numOrNull(totals.submittedKg), verifiedKg: numOrNull(totals.verifiedKg) }
      : undefined,
  };
}

function normalizeSchedule(value: unknown): ConsolidatedSchedule {
  const record = asRecord(unwrapData(value)) ?? {};
  const nested = asRecord(record.schedule) ?? record;
  const times = asRecord(nested.times) ?? {};
  return {
    id: num(nested.id),
    groupId: num(nested.groupId),
    collectionPointId: num(nested.collectionPointId),
    method: str(nested.method, 'SITE_DROP_OFF') as HandoverMethod,
    recurrence: str(nested.recurrence, 'ONE_OFF') as ConsolidatedSchedule['recurrence'],
    startDate: str(nested.startDate),
    endDate: nested.endDate == null ? null : str(nested.endDate),
    daysOfWeek: Array.isArray(nested.daysOfWeek) ? nested.daysOfWeek.map((day) => num(day)) : [],
    customDates: Array.isArray(nested.customDates) ? nested.customDates.map((day) => str(day)) : [],
    opensDaysBefore: num(nested.opensDaysBefore, 0),
    times: {
      submissionsClose: str(times.submissionsClose, '12:00'),
      handoverStart: str(times.handoverStart, '13:00'),
      handoverEnd: str(times.handoverEnd, '13:30'),
      pickupStart: str(times.pickupStart, '14:00'),
      pickupEnd: str(times.pickupEnd, '15:00'),
    },
    contactName: str(nested.contactName),
    contactPhone: str(nested.contactPhone),
    instructions: nested.instructions == null ? null : str(nested.instructions),
    suitabilityNotes: str(nested.suitabilityNotes),
    participatingSiteIds: Array.isArray(nested.participatingSiteIds)
      ? nested.participatingSiteIds.map((id) => num(id))
      : [],
  };
}

function normalizeDeclarations(value: unknown): Declarations {
  const record = asRecord(unwrapData(value)) ?? {};
  const read = (key: 'SITE' | 'MANAGER' | 'CHARITY') => {
    const row = asRecord(record[key]) ?? asRecord(record[key.toLowerCase()]);
    return {
      version: str(row?.version, DECLARATION_FALLBACK[key].version),
      text: str(row?.text, DECLARATION_FALLBACK[key].text),
    };
  };
  return { SITE: read('SITE'), MANAGER: read('MANAGER'), CHARITY: read('CHARITY') };
}

function storageLabel(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;
  const parts = [
    record.refrigeration ? 'Fridge' : null,
    record.freezer ? 'Freezer' : null,
    record.ambient ? 'Ambient' : null,
    record.hot ? 'Hot' : null,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

/** Backend DTOs reject unknown keys (forbidNonWhitelisted), so send only these. */
const CONTRIBUTION_KEYS = [
  'siteId',
  'foodItems',
  'bestBefore',
  'needsRefrigeration',
  'needsAmbient',
  'needsFreezer',
  'needsHot',
  'needsReheating',
  'allergens',
  'photoUrls',
  'collectionNotes',
  'declaration',
] as const;
const FOOD_ITEM_KEYS = ['name', 'totalQtyKg', 'unit', 'category', 'quantityDescription'] as const;

function pick(source: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

function contributionBody(payload: Record<string, unknown>, keys: readonly string[]) {
  const body = pick(payload, keys);
  if (Array.isArray(body.foodItems)) {
    body.foodItems = (body.foodItems as Record<string, unknown>[]).map((item) => {
      const row = pick(item, FOOD_ITEM_KEYS);
      if (typeof row.quantityDescription === 'string' && !row.quantityDescription.trim()) {
        delete row.quantityDescription;
      }
      return row;
    });
  }
  return body;
}

function membersBody(managerUserIds: number[] = [], receiverUserIds: number[] = []) {
  return [
    ...[...new Set(managerUserIds)].map((userId) => ({ userId, role: 'MANAGER' as const })),
    ...[...new Set(receiverUserIds)].map((userId) => ({ userId, role: 'RECEIVER' as const })),
  ];
}

/** Plain-language summary of a site's requested edit, for the manager. */
function describeChange(payload: Record<string, unknown> | null): string {
  if (!payload) return 'Requested a change';
  const parts: string[] = [];
  if (Array.isArray(payload.foodItems)) {
    const items = payload.foodItems as Record<string, unknown>[];
    const kg = items.reduce((sum, item) => sum + (Number(item.totalQtyKg) || 0), 0);
    parts.push(`Food: ${items.map((item) => `${str(item.name)} ${num(item.totalQtyKg)} kg`).join(', ')} (total ${Math.round(kg * 100) / 100} kg)`);
  }
  if (payload.bestBefore) parts.push('Best-before date');
  if (['needsRefrigeration', 'needsAmbient', 'needsFreezer', 'needsHot', 'needsReheating'].some((key) => key in payload)) {
    parts.push('Storage');
  }
  if (Array.isArray(payload.allergens)) parts.push('Allergens');
  if (payload.collectionNotes !== undefined) parts.push('Notes');
  if (Array.isArray(payload.photoUrls)) parts.push('Photos');
  return parts.length ? parts.join(' · ') : 'Requested a change';
}

/** The API takes wall-clock times as flat `…Time` fields, never a nested object. */
function flattenTimes(times?: Partial<ScheduleTimes> | null): Record<string, string> {
  if (!times) return {};
  const out: Record<string, string> = {};
  if (times.submissionsClose) out.submissionsCloseTime = times.submissionsClose;
  if (times.handoverStart) out.handoverStartTime = times.handoverStart;
  if (times.handoverEnd) out.handoverEndTime = times.handoverEnd;
  if (times.pickupStart) out.pickupStartTime = times.pickupStart;
  if (times.pickupEnd) out.pickupEndTime = times.pickupEnd;
  return out;
}

function scheduleBody(payload: Partial<SchedulePayload>): Record<string, unknown> {
  const { groupId: _groupId, times, ...rest } = payload;
  const body: Record<string, unknown> = { ...rest, ...flattenTimes(times) };
  for (const key of Object.keys(body)) {
    if (body[key] === undefined) delete body[key];
  }
  return body;
}

async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const response = await api.get(path, { params, skipBillingHandler: true });
  return response.data as T;
}

export const consolidatedService = {
  async getMe(): Promise<ConsolidatedMe | null> {
    try {
      const body = await get<unknown>('/consolidated/me');
      const record = asRecord(unwrapData(body)) ?? {};
      return {
        canManage: Boolean(record.canManage),
        managedGroupIds: Array.isArray(record.managedGroupIds) ? record.managedGroupIds.map((id) => num(id)) : [],
        receiverGroupIds: Array.isArray(record.receiverGroupIds) ? record.receiverGroupIds.map((id) => num(id)) : [],
        siteIdsWithOpenCollections: Array.isArray(record.siteIdsWithOpenCollections)
          ? record.siteIdsWithOpenCollections.map((id) => num(id))
          : [],
        pendingInvitationCount: num(record.pendingInvitationCount),
      };
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) return null;
      throw error;
    }
  },

  async getDeclarations(): Promise<Declarations> {
    try {
      return normalizeDeclarations(await get('/consolidated/declarations'));
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        return {
          SITE: { ...DECLARATION_FALLBACK.SITE },
          MANAGER: { ...DECLARATION_FALLBACK.MANAGER },
          CHARITY: { ...DECLARATION_FALLBACK.CHARITY },
        };
      }
      throw error;
    }
  },

  async getPermissions(): Promise<PermissionUser[]> {
    const body = await get('/consolidated/permissions');
    return asArray(body).map((row) => {
      const record = asRecord(row) ?? {};
      const user = asRecord(record.user) ?? record;
      const who = person(user);
      return {
        id: who?.id || num(record.userId),
        name: who?.name || 'User',
        email: user.email == null ? null : str(user.email),
        orgRole: user.orgRole == null ? str(record.orgRole) || null : str(user.orgRole),
        siteRole: user.siteRole == null ? str(record.siteRole || record.role) || null : str(user.siteRole),
        role: record.role == null ? null : str(record.role),
        canManage: Boolean(record.canManage ?? record.canManageConsolidated ?? user.canManageConsolidated),
        // SPEC R1: only Org Admins and Site Admins can be made managers.
        eligible:
          record.eligible != null
            ? Boolean(record.eligible)
            : record.isSiteAdmin != null || record.orgRole != null
              ? Boolean(record.isSiteAdmin) || ['ORG_ADMIN', 'SUPER_ADMIN'].includes(str(record.orgRole).toUpperCase())
              : undefined,
      };
    });
  },

  async setPermission(userId: number, canManage: boolean) {
    const response = await api.patch(`/consolidated/permissions/${userId}`, { canManageConsolidated: canManage });
    return unwrapData(response.data);
  },

  /** Invitations for sites this user runs to join a collection group (Canva CM1). */
  async listInvitations(): Promise<SiteInvitation[]> {
    const body = await get('/consolidated/invitations');
    return asArray(body).map((row) => {
      const record = asRecord(row) ?? {};
      const site = asRecord(record.site) ?? {};
      const group = asRecord(record.group) ?? {};
      const pt = asRecord(group.point);
      return {
        id: num(record.id),
        invitedAt: record.invitedAt == null ? null : str(record.invitedAt),
        invitedBy: person(record.invitedBy)?.name ?? null,
        site: { id: num(site.id), name: str(site.name, 'Your site'), address: site.address == null ? null : str(site.address) },
        group: {
          id: num(group.id),
          name: str(group.name, 'Collection group'),
          description: group.description == null ? null : str(group.description),
          hostSiteName: group.hostSiteName == null ? null : str(group.hostSiteName),
          siteCount: num(group.siteCount),
          managers: Array.isArray(group.managers) ? group.managers.map((m) => String(m)).filter(Boolean) : [],
          point: pt
            ? { name: str(pt.name, 'Collection point'), address: str(pt.address), directions: pt.directions == null ? null : str(pt.directions) }
            : null,
        },
      };
    });
  },

  async acceptInvitation(id: number) {
    const response = await api.post(`/consolidated/invitations/${id}/accept`);
    return unwrapData(response.data);
  },

  async declineInvitation(id: number, reason?: string) {
    const response = await api.post(`/consolidated/invitations/${id}/decline`, reason ? { reason } : {});
    return unwrapData(response.data);
  },

  async listGroups(includeArchived = false): Promise<ConsolidatedGroup[]> {
    const body = await get('/consolidated/groups', { includeArchived });
    return asArray(body).map(normalizeGroup);
  },

  async createGroup(payload: CreateGroupPayload): Promise<ConsolidatedGroup> {
    const { managerUserIds, receiverUserIds, ...rest } = payload;
    const response = await api.post('/consolidated/groups', {
      ...rest,
      members: membersBody(managerUserIds, receiverUserIds),
    });
    return normalizeGroup(response.data);
  },

  async getGroup(id: number): Promise<ConsolidatedGroup> {
    return normalizeGroup(await get(`/consolidated/groups/${id}`));
  },

  async updateGroup(id: number, payload: Partial<Pick<CreateGroupPayload, 'name' | 'description' | 'hostSiteId' | 'timezone'>>) {
    const response = await api.patch(`/consolidated/groups/${id}`, payload);
    return normalizeGroup(response.data);
  },

  async archiveGroup(id: number) {
    const response = await api.delete(`/consolidated/groups/${id}`);
    return unwrapData(response.data);
  },

  /** Undo an archive: sites, points and people come back; schedule again afterwards. */
  async restoreGroup(id: number) {
    const response = await api.post(`/consolidated/groups/${id}/restore`);
    return unwrapData(response.data);
  },

  async setGroupSites(id: number, siteIds: number[], hostSiteId?: number) {
    const response = await api.put(`/consolidated/groups/${id}/sites`, hostSiteId ? { siteIds, hostSiteId } : { siteIds });
    return unwrapData(response.data);
  },

  async setGroupMembers(id: number, managerUserIds: number[], receiverUserIds: number[]) {
    const response = await api.put(`/consolidated/groups/${id}/members`, {
      members: membersBody(managerUserIds, receiverUserIds),
    });
    return unwrapData(response.data);
  },

  async addPoint(groupId: number, payload: PointPayload) {
    const response = await api.post(`/consolidated/groups/${groupId}/points`, payload);
    return point(unwrapData(response.data));
  },

  async updatePoint(groupId: number, pointId: number, payload: Partial<PointPayload> & { isActive?: boolean; isDefault?: boolean }) {
    const response = await api.patch(`/consolidated/groups/${groupId}/points/${pointId}`, payload);
    return point(unwrapData(response.data));
  },

  /** Sites the caller may put in a group (their own reach, active, same org). */
  async getEligibleSites(): Promise<EligibleSite[]> {
    const body = await get('/consolidated/groups/eligible-sites');
    return asArray(body).map((row) => {
      const record = asRecord(row) ?? {};
      return { id: num(record.id), name: str(record.name || record.siteName || record.organisationName, 'Site') };
    });
  },

  /** Org members for the manager / receiver pickers. */
  async getEligibleUsers(): Promise<EligibleUser[]> {
    const body = await get('/consolidated/groups/eligible-users');
    return asArray(body).map((row) => {
      const record = asRecord(row) ?? {};
      const who = person(record.user ?? record);
      return {
        id: who?.id || num(record.id),
        name: who?.name || 'User',
        canManage: Boolean(record.canManage ?? record.canManageConsolidated),
        email: record.email == null ? null : str(record.email),
      };
    });
  },

  async createSchedule(payload: SchedulePayload): Promise<{ scheduleId: number; collectionsCreated: number }> {
    const response = await api.post(`/consolidated/groups/${payload.groupId}/schedules`, scheduleBody(payload));
    const record = asRecord(unwrapData(response.data)) ?? {};
    const schedule = asRecord(record.schedule) ?? record;
    return { scheduleId: num(schedule.id ?? record.id), collectionsCreated: num(record.collectionsCreated) };
  },

  async getSchedule(id: number) {
    return normalizeSchedule(await get(`/consolidated/schedules/${id}`));
  },

  async updateSchedule(id: number, payload: Partial<SchedulePayload>) {
    const response = await api.patch(`/consolidated/schedules/${id}`, scheduleBody(payload));
    return unwrapData(response.data);
  },

  async endSchedule(id: number, fromDate: string) {
    const response = await api.post(`/consolidated/schedules/${id}/end`, { fromDate });
    return unwrapData(response.data);
  },

  async listCollections(params: {
    tab?: 'upcoming' | 'active' | 'past';
    groupId?: number;
    page?: number;
    limit?: number;
  }): Promise<Paged<CollectionListItem>> {
    const response = await api.get('/consolidated/collections', { params, skipBillingHandler: true });
    const items = asArray(response.data).map(normalizeListItem);
    return pageOf(response.data, items);
  },

  async getCollection(id: number) {
    return normalizeDashboard(await get(`/consolidated/collections/${id}`));
  },

  async updateCollection(id: number, payload: Record<string, unknown> & { times?: Partial<ScheduleTimes> }) {
    const { times, ...rest } = payload;
    const body: Record<string, unknown> = { ...rest, ...flattenTimes(times) };
    for (const key of Object.keys(body)) {
      if (body[key] === undefined) delete body[key];
    }
    const response = await api.patch(`/consolidated/collections/${id}`, body);
    return unwrapData(response.data);
  },

  async cancelCollection(id: number, reason: string) {
    const response = await api.post(`/consolidated/collections/${id}/cancel`, { reason });
    return unwrapData(response.data);
  },

  async closeSubmissions(id: number) {
    const response = await api.post(`/consolidated/collections/${id}/close`);
    return unwrapData(response.data);
  },

  async reopenSubmissions(id: number, until: string) {
    const response = await api.post(`/consolidated/collections/${id}/reopen`, { until });
    return unwrapData(response.data);
  },

  async remindSites(id: number, siteIds?: number[]) {
    const response = await api.post(`/consolidated/collections/${id}/remind`, siteIds?.length ? { siteIds } : {});
    return unwrapData(response.data);
  },

  /**
   * What the charity will see. The preview endpoint returns the items and
   * blockers; the event details and site names come from the dashboard.
   */
  async getPublishPreview(id: number): Promise<PublishPreview> {
    const [previewBody, dashboard] = await Promise.all([
      get(`/consolidated/collections/${id}/publish-preview`),
      this.getCollection(id),
    ]);
    const record = asRecord(unwrapData(previewBody)) ?? {};
    const storage = storageLabel(record.storage);
    const allergens = Array.isArray(record.allergens) ? record.allergens.map((entry) => String(entry)) : [];
    const rawItems = asArray(record.items).map((row) => asRecord(row) ?? {});
    const items = rawItems.map((item) => ({
      name: str(item.name, 'Food'),
      category: item.category == null ? null : str(item.category),
      quantityDescription: item.quantityDescription == null ? null : str(item.quantityDescription),
      qtyKg: num(item.qtyKg ?? item.verifiedQtyKg ?? item.submittedQtyKg),
      allergens,
      bestBefore: record.bestBefore == null ? null : str(record.bestBefore),
      storageLabel: storage,
    }));

    const siteNames = new Map(dashboard.contributions.map((row) => [row.site.id, row.site.name]));
    const bySite = new Map<number, { siteName: string; verifiedKg: number; items: { name: string; verifiedKg: number; quantityDescription: string | null }[] }>();
    for (const item of rawItems) {
      const siteId = num(item.siteId);
      const entry = bySite.get(siteId) ?? { siteName: siteNames.get(siteId) || 'Site', verifiedKg: 0, items: [] };
      const kg = num(item.qtyKg);
      entry.verifiedKg = Math.round((entry.verifiedKg + kg) * 100) / 100;
      entry.items.push({
        name: str(item.name, 'Food'),
        verifiedKg: kg,
        quantityDescription: item.quantityDescription == null ? null : str(item.quantityDescription),
      });
      bySite.set(siteId, entry);
    }

    const message = (entry: unknown) => {
      const row = asRecord(entry);
      return row ? str(row.message ?? row.code, 'Not ready to publish') : String(entry);
    };

    return {
      blockers: Array.isArray(record.blockers) ? record.blockers.map(message) : [],
      warnings: Array.isArray(record.warnings) ? record.warnings.map(message) : [],
      items,
      pointName: dashboard.point.name,
      pointAddress: dashboard.point.address,
      pickupStartAt: dashboard.times.pickupStartAt,
      pickupEndAt: dashboard.times.pickupEndAt,
      timezone: dashboard.timezone,
      instructions: dashboard.instructions,
      suitabilityNotes: dashboard.suitabilityNotes,
      breakdown: [...bySite.values()],
    };
  },

  async publish(id: number, declaration: { version: string; accepted: true }) {
    const response = await api.post(`/consolidated/collections/${id}/publish`, { declaration });
    return unwrapData(response.data);
  },

  async getAudit(id: number): Promise<AuditEntry[]> {
    const body = await get(`/consolidated/collections/${id}/audit`);
    return asArray(body).map((row) => {
      const record = asRecord(row) ?? {};
      return {
        id: num(record.id) || undefined,
        at: record.createdAt == null ? str(record.at) || null : str(record.createdAt),
        actor: person(record.actor ?? record.user)?.name || (record.actorName == null ? null : str(record.actorName)),
        action: str(record.action ?? record.event ?? record.message, 'Updated'),
        detail: record.detail == null ? (record.summary == null ? null : str(record.summary)) : str(record.detail),
      };
    });
  },

  async getOpenCollectionsForSite(siteId: number): Promise<OpenCollection[]> {
    const body = await get(`/consolidated/sites/${siteId}/open-collections`);
    return asArray(body).map(normalizeOpen);
  },

  async createContribution(collectionId: number, payload: Record<string, unknown> & { photos?: string[] }) {
    const localPhotos = Array.isArray(payload.photos) ? payload.photos.filter(Boolean) : [];
    let photoUrls = Array.isArray(payload.photoUrls) ? [...payload.photoUrls] : [];
    if (localPhotos.length) {
      const uploaded = await foodListingService.uploadPhotos(localPhotos);
      photoUrls = [...photoUrls, ...uploaded];
    }
    const response = await api.post(
      `/consolidated/collections/${collectionId}/contributions`,
      contributionBody({ ...payload, photoUrls }, CONTRIBUTION_KEYS),
    );
    const record = asRecord(unwrapData(response.data)) ?? {};
    const contribution = asRecord(record.contribution) ?? record;
    const listing = asRecord(record.listing);
    return {
      id: num(contribution.id ?? record.contributionId),
      listingId: num(contribution.listingId ?? listing?.id),
      status: str(contribution.status) as ContributionStatus,
    };
  },

  async getContribution(id: number): Promise<ContributionDetail> {
    return normalizeContributionDetail(await get(`/consolidated/contributions/${id}`));
  },

  async getContributionByListing(listingId: number): Promise<ContributionDetail> {
    return normalizeContributionDetail(await get(`/consolidated/contributions/by-listing/${listingId}`));
  },

  async updateContribution(id: number, payload: Record<string, unknown>) {
    const localPhotos = Array.isArray(payload.photos) ? (payload.photos as string[]) : [];
    let photoUrls = Array.isArray(payload.photoUrls) ? [...(payload.photoUrls as string[])] : undefined;
    if (localPhotos.length) {
      const uploaded = await foodListingService.uploadPhotos(localPhotos);
      photoUrls = [...(photoUrls ?? []), ...uploaded];
    }
    const response = await api.patch(
      `/consolidated/contributions/${id}`,
      contributionBody({ ...payload, ...(photoUrls ? { photoUrls } : {}) }, CONTRIBUTION_KEYS.filter((key) => key !== 'siteId' && key !== 'declaration')),
    );
    const record = asRecord(unwrapData(response.data)) ?? {};
    return {
      raw: record,
      changeRequestId: numOrNull(record.changeRequestId),
      status: str(record.status),
    };
  },

  async withdrawContribution(id: number, reason?: string) {
    const response = await api.post(`/consolidated/contributions/${id}/withdraw`, reason ? { reason } : {});
    return unwrapData(response.data);
  },

  async confirmHandover(id: number) {
    const response = await api.post(`/consolidated/contributions/${id}/handover`);
    return unwrapData(response.data);
  },

  /**
   * Received / Not received / Adjust quantity. Items are addressed by their
   * ledger id (`itemId`); an item left out keeps the quantity the site listed.
   */
  async recordReceipt(
    id: number,
    payload: {
      status: 'RECEIVED' | 'NOT_RECEIVED';
      items?: { itemId?: number | null; foodItemId: number; verifiedQtyKg: number }[];
      note?: string;
    },
  ) {
    const items = (payload.items || [])
      .filter((item) => typeof item.itemId === 'number' && item.itemId > 0)
      .map((item) => ({ itemId: item.itemId as number, verifiedQtyKg: Math.max(0, Number(item.verifiedQtyKg) || 0) }));
    const response = await api.post(`/consolidated/contributions/${id}/receipt`, {
      received: payload.status === 'RECEIVED',
      ...(payload.status === 'RECEIVED' && items.length ? { items } : {}),
      ...(payload.note ? { note: payload.note } : {}),
    });
    return unwrapData(response.data);
  },

  async excludeContribution(id: number, reason: string) {
    const response = await api.post(`/consolidated/contributions/${id}/exclude`, { reason });
    return unwrapData(response.data);
  },

  async approveLate(id: number) {
    const response = await api.post(`/consolidated/contributions/${id}/approve-late`);
    return unwrapData(response.data);
  },

  async rejectLate(id: number, reason: string) {
    const response = await api.post(`/consolidated/contributions/${id}/reject-late`, reason ? { reason } : {});
    return unwrapData(response.data);
  },

  async listChangeRequests(collectionId: number): Promise<ChangeRequest[]> {
    const body = await get(`/consolidated/collections/${collectionId}/change-requests`);
    return asArray(body).map((row) => {
      const record = asRecord(row) ?? {};
      const site = asRecord(asRecord(record.contribution)?.site) ?? asRecord(record.site);
      return {
        id: num(record.id),
        contributionId: numOrNull(record.contributionId),
        siteName: str(record.siteName || site?.name || site?.organisationName) || null,
        summary: str(record.summary) || describeChange(asRecord(record.payload)),
        status: record.status == null ? null : str(record.status),
      };
    });
  },

  async approveChangeRequest(id: number) {
    const response = await api.post(`/consolidated/change-requests/${id}/approve`);
    return unwrapData(response.data);
  },

  async rejectChangeRequest(id: number, reason: string) {
    const response = await api.post(`/consolidated/change-requests/${id}/reject`, reason ? { reason } : {});
    return unwrapData(response.data);
  },

  async getItemCheck(claimId: number): Promise<ItemCheckView> {
    const record = asRecord(unwrapData(await get(`/consolidated/charity/claims/${claimId}/item-check`))) ?? {};
    const pickup = asRecord(record.pickup) ?? {};
    const pointRecord = asRecord(record.point) ?? { name: pickup.pointName, address: pickup.address };
    const times = asRecord(record.times) ?? { pickupStartAt: pickup.start, pickupEndAt: pickup.end };
    const listingAllergens = Array.isArray(record.allergens) ? record.allergens.map((entry) => String(entry)) : [];
    const pending = asRecord(record.pendingChange ?? record.pendingMaterialChange);
    const declaration = asRecord(record.declaration);
    return {
      pointName: str(pointRecord.name ?? record.pointName, 'Pickup'),
      pointAddress: str(pointRecord.address ?? record.address) || null,
      pickupStartAt: times.pickupStartAt == null ? str(record.pickupStartAt) || null : str(times.pickupStartAt),
      pickupEndAt: times.pickupEndAt == null ? str(record.pickupEndAt) || null : str(times.pickupEndAt),
      timezone: record.timezone == null ? null : str(record.timezone),
      declaration: {
        version: str(declaration?.version, DECLARATION_FALLBACK.CHARITY.version),
        text: str(declaration?.text, DECLARATION_FALLBACK.CHARITY.text),
      },
      pendingChange: pending
        ? { id: num(pending.id), summary: str(pending.summary, 'Your pickup details have changed.') }
        : null,
      items: asArray(record.items).map((row) => {
        const item = asRecord(row) ?? {};
        return {
          masterFoodItemId: num(item.masterFoodItemId ?? item.foodItemId ?? item.id),
          name: str(item.name, 'Food'),
          category: item.category == null ? null : str(item.category),
          quantityDescription: item.quantityDescription == null ? null : str(item.quantityDescription),
          qtyKg: num(item.qtyKg ?? item.verifiedQtyKg ?? item.totalQtyKg),
          allergens: Array.isArray(item.allergens) ? item.allergens.map((entry) => String(entry)) : listingAllergens,
        };
      }),
    };
  },

  async acknowledgeChange(changeId: number) {
    const response = await api.post(`/consolidated/charity/changes/${changeId}/acknowledge`);
    return unwrapData(response.data);
  },

  async submitItemCheck(claimId: number, payload: ItemCheckPayload) {
    const response = await api.post(`/consolidated/charity/claims/${claimId}/item-check`, payload);
    return unwrapData(response.data);
  },

  async getReportSummary(params: {
    groupId?: number;
    siteId?: number;
    from: string;
    to: string;
    category?: string;
  }): Promise<ReportSummary> {
    const { category: _category, ...query } = params;
    const record = asRecord(unwrapData(await get('/consolidated/reports/summary', query))) ?? {};
    const totals = asRecord(record.combined) ?? asRecord(record.totals) ?? record;
    const readTotals = (source: Record<string, unknown>) => ({
      listedKg: num(source.listedKg ?? source.submittedKg),
      verifiedKg: num(source.verifiedKg),
      acceptedKg: num(source.acceptedKg),
      rejectedKg: num(source.rejectedKg),
      unavailableKg: num(source.unavailableKg),
    });
    return {
      totals: readTotals(totals),
      sites: asArray(record.sites ?? record.rows).map((row) => {
        const site = asRecord(row) ?? {};
        return {
          siteId: num(site.siteId ?? site.id),
          siteName: str(site.siteName ?? site.name, 'Site'),
          collections: num(site.collections ?? site.collectionCount),
          ...readTotals(site),
        };
      }),
      rejectionReasons: asArray(record.rejectionReasons ?? record.reasons).map((row) => {
        const reason = asRecord(row) ?? {};
        return {
          reason: str(reason.reason ?? reason.label, 'OTHER'),
          kg: reason.kg == null && reason.rejectedKg == null ? null : num(reason.kg ?? reason.rejectedKg),
          count: reason.count == null ? null : num(reason.count),
        };
      }),
      categories: asArray(record.categories).map((row) => {
        const category = asRecord(row) ?? {};
        return { category: str(category.category, 'Uncategorised'), acceptedKg: num(category.acceptedKg) };
      }),
    };
  },

  async getReportCollections(params: {
    groupId?: number;
    siteId?: number;
    from: string;
    to: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<Paged<ReportCollectionRow>> {
    const { limit, category: _category, ...rest } = params;
    const response = await api.get('/consolidated/reports/collections', {
      params: { ...rest, ...(limit ? { pageSize: limit } : {}) },
      skipBillingHandler: true,
    });
    const items = asArray(response.data).map((row) => {
      const record = asRecord(row) ?? {};
      const totals = asRecord(record.totals) ?? record;
      return {
        id: num(record.id ?? record.collectionId),
        scheduledDate: str(record.scheduledDate ?? record.date),
        status: str(record.status, 'COMPLETED') as CollectionStatus,
        groupName: str(record.groupName ?? asRecord(record.group)?.name) || null,
        pointName: str(record.pointName ?? asRecord(record.point)?.name) || null,
        listedKg: numOrNull(totals.listedKg ?? totals.submittedKg),
        verifiedKg: numOrNull(totals.verifiedKg),
        acceptedKg: numOrNull(totals.acceptedKg),
      };
    });
    return pageOf(response.data, items);
  },
};

function normalizeContributionDetail(value: unknown): ContributionDetail {
  const record = asRecord(unwrapData(value)) ?? {};
  const contribution = normalizeContribution(record.contribution ?? record);
  const collection = asRecord(record.collection) ?? record;
  const times = asRecord(collection.times) ?? asRecord(record.times) ?? {};
  const pointRecord = asRecord(collection.point) ?? asRecord(record.point) ?? {};
  return {
    ...contribution,
    method: str(collection.method ?? record.method, 'SITE_DROP_OFF') as HandoverMethod,
    timezone: str(collection.timezone ?? record.timezone, 'Australia/Melbourne'),
    groupName: str(asRecord(collection.group)?.name ?? record.groupName) || null,
    pointName: str(pointRecord.name ?? record.pointName, 'Collection point'),
    pointAddress: str(pointRecord.address) || null,
    directions: pointRecord.directions == null ? null : str(pointRecord.directions),
    times: {
      opensAt: times.opensAt == null ? null : str(times.opensAt),
      submissionsCloseAt: times.submissionsCloseAt == null ? null : str(times.submissionsCloseAt),
      handoverStartAt: times.handoverStartAt == null ? null : str(times.handoverStartAt),
      handoverEndAt: times.handoverEndAt == null ? null : str(times.handoverEndAt),
      pickupStartAt: times.pickupStartAt == null ? null : str(times.pickupStartAt),
      pickupEndAt: times.pickupEndAt == null ? null : str(times.pickupEndAt),
      reopenedUntil: times.reopenedUntil == null ? null : str(times.reopenedUntil),
    },
    suitabilityNotes: collection.suitabilityNotes == null ? null : str(collection.suitabilityNotes),
    instructions: collection.instructions == null ? null : str(collection.instructions),
    collectionStatus: (collection.status ? str(collection.status) : null) as CollectionStatus | null,
    canManage: Boolean(record.canManage ?? asRecord(record.permissions)?.canManage),
    canReceive: Boolean(record.canReceive ?? asRecord(record.permissions)?.canReceive),
    pendingChangeStatus: record.pendingChangeStatus == null ? str(record.status) === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : null : str(record.pendingChangeStatus),
  };
}
