import api from './api';
import { foodListingService } from './foodListing.service';
import {
  isReservedPublished,
  isScheduledToday,
  matchReservedDay,
  type ConnectionDayOutcome,
  type ConnectionStatus,
} from '@/utils/connections';

export type ConnectionSiteRef = {
  id?: number;
  name?: string | null;
  organisationName?: string | null;
  timezone?: string | null;
  address?: string | null;
  postcode?: string | null;
};

export type ConnectionDay = {
  id: number;
  scheduledDate?: string;
  windowStartAt?: string;
  windowEndAt?: string;
  cutoffAt?: string;
  outcome?: ConnectionDayOutcome;
  listingId?: number | null;
  promptedAt?: string | null;
  publishedAt?: string | null;
  respondedAt?: string | null;
  releasedAt?: string | null;
};

export type ConnectionStats = {
  collectionsCompleted: number;
  kgRedirected: number;
  daysOffered: number;
  declined: number;
  missed: number;
  noSurplusDays: number;
  noResponseDays?: number;
  reliabilityPercent: number;
};

export type Connection = {
  id: number;
  status: ConnectionStatus;
  initiatedBy?: string;
  frequency?: string;
  daysOfWeek: number[];
  windowStart?: string;
  windowEnd?: string;
  schedule?: string;
  leadTimeMinutes?: number;
  cutoffMinutes?: number;
  typicalSurplus?: string | null;
  typicalQuantity?: string | null;
  notes?: string | null;
  respondedAt?: string | null;
  pausedAt?: string | null;
  endedAt?: string | null;
  invitationExpiresAt?: string | null;
  createdAt?: string;
  isCollecting?: boolean;
  warning?: string;
  scheduleClashes?: Array<{
    connectionId: number;
    charity?: string;
    schedule?: string;
  }>;
  donorSite?: ConnectionSiteRef;
  donorOrg?: { id?: number; name?: string | null };
  receiverSite?: ConnectionSiteRef;
  receiverOrg?: { id?: number; name?: string | null };
  today?: ConnectionDay | null;
  stats?: ConnectionStats;
};

export type ConnectionToday = {
  connectionId: number;
  dayId: number | null;
  status?: ConnectionStatus;
  outcome?: ConnectionDayOutcome | null;
  schedule?: string;
  charityName?: string;
  donorName?: string;
  donorSiteId?: number;
  receiverSiteId?: number;
  listingId?: number | null;
  scheduledDate?: string;
  windowStartAt?: string;
  windowEndAt?: string;
  cutoffAt?: string;
  promptedAt?: string | null;
  publishedAt?: string | null;
  respondedAt?: string | null;
  releasedAt?: string | null;
};

export type CreateConnectionPayload = {
  donorSiteId: number;
  receiverSiteId: number;
  daysOfWeek: number[];
  windowStart: string;
  windowEnd: string;
  leadTimeMinutes?: number;
  cutoffMinutes?: number;
  typicalSurplus?: string;
  typicalQuantity?: string;
  notes?: string;
};

export type UpdateConnectionPayload = {
  daysOfWeek?: number[];
  windowStart?: string;
  windowEnd?: string;
  leadTimeMinutes?: number;
  cutoffMinutes?: number;
  typicalSurplus?: string;
  typicalQuantity?: string;
  notes?: string;
};

export type SurplusItemPayload = {
  name: string;
  quantityKg: number;
  category?: string;
};

export type DailySurplusPayload = {
  items: SurplusItemPayload[];
  collectionNotes?: string;
  needsRefrigeration?: boolean;
  needsFreezer?: boolean;
  needsAmbient?: boolean;
  needsHot?: boolean;
  needsReheating?: boolean;
  isSafeForDonation?: boolean;
  allergens?: string[];
  photoUrls?: string[];
};

export type NearbyCharity = {
  orgId: number;
  orgName: string;
  orgType?: string;
  logoUrl?: string | null;
  address?: string | null;
  siteId: number | null;
  siteName?: string | null;
  distanceKm?: number;
};

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.response)) return obj.response as T[];
    const nested = obj.data;
    if (nested && typeof nested === 'object') {
      const inner = nested as Record<string, unknown>;
      if (Array.isArray(inner.data)) return inner.data as T[];
      if (Array.isArray(inner.response)) return inner.response as T[];
    }
  }
  return [];
}

function asObject<T>(value: unknown): T {
  if (value && typeof value === 'object' && 'data' in (value as object)) {
    const nested = (value as { data: unknown }).data;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as T;
    }
  }
  return value as T;
}

function isNotFound(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 404;
}

function errorMessageText(error: unknown): string {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data
    ?.message;
  if (Array.isArray(message)) return message.join(' ');
  return typeof message === 'string' ? message : '';
}

function isUnknownPropertyRejection(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 400 && /should not exist/i.test(errorMessageText(error));
}

type SurplusListingResult = { message?: string; listingId: number; totalKg: number };

async function applyListingDetails(listingId: number, payload: DailySurplusPayload) {
  const details = {
    needsRefrigeration: payload.needsRefrigeration,
    needsFreezer: payload.needsFreezer,
    needsAmbient: payload.needsAmbient,
    needsHot: payload.needsHot,
    needsReheating: payload.needsReheating,
    isSafeForDonation: payload.isSafeForDonation ?? true,
    allergens: payload.allergens,
    photoUrls: payload.photoUrls,
  };
  try {
    await foodListingService.updateListing(listingId, details);
  } catch (error) {
    if (!isUnknownPropertyRejection(error)) return;
    const { photoUrls: _photoUrls, ...withoutPhotos } = details;
    await foodListingService.updateListing(listingId, withoutPhotos).catch(() => undefined);
  }
}

function fromListedConnection(connection: Connection): ConnectionToday {
  const today = connection.today;
  return {
    connectionId: connection.id,
    dayId: today?.id ?? null,
    status: connection.status,
    outcome: today?.outcome ?? null,
    schedule: connection.schedule,
    charityName: connection.receiverSite?.name || connection.receiverSite?.organisationName,
    donorName:
      connection.donorSite?.name ||
      connection.donorSite?.organisationName ||
      connection.donorOrg?.name,
    donorSiteId: connection.donorSite?.id,
    receiverSiteId: connection.receiverSite?.id,
    listingId: today?.listingId ?? null,
    scheduledDate: today?.scheduledDate,
    windowStartAt: today?.windowStartAt,
    windowEndAt: today?.windowEndAt,
    cutoffAt: today?.cutoffAt,
    promptedAt: today?.promptedAt,
    publishedAt: today?.publishedAt,
    respondedAt: today?.respondedAt,
    releasedAt: today?.releasedAt,
  };
}

export const connectionsService = {
  listForSite: async (siteId: number): Promise<Connection[]> => {
    const res = await api.get(`/connections/site/${siteId}`);
    return asArray<Connection>(res.data);
  },

  getOne: async (id: number): Promise<Connection> => {
    const res = await api.get(`/connections/${id}`);
    return asObject<Connection>(res.data);
  },

  invite: async (payload: CreateConnectionPayload): Promise<Connection> => {
    try {
      const res = await api.post('/connections', payload);
      return asObject<Connection>(res.data);
    } catch (error) {
      if (!isUnknownPropertyRejection(error) || !payload.typicalQuantity) throw error;
      const { typicalQuantity: _typicalQuantity, ...withoutQuantity } = payload;
      const res = await api.post('/connections', withoutQuantity);
      return asObject<Connection>(res.data);
    }
  },

  update: async (id: number, payload: UpdateConnectionPayload): Promise<Connection> => {
    try {
      const res = await api.patch(`/connections/${id}`, payload);
      return asObject<Connection>(res.data);
    } catch (error) {
      if (!isUnknownPropertyRejection(error) || payload.typicalQuantity === undefined) throw error;
      const { typicalQuantity: _typicalQuantity, ...withoutQuantity } = payload;
      const res = await api.patch(`/connections/${id}`, withoutQuantity);
      return asObject<Connection>(res.data);
    }
  },

  pause: async (id: number): Promise<Connection> => {
    const res = await api.post(`/connections/${id}/pause`);
    return asObject<Connection>(res.data);
  },

  resume: async (id: number): Promise<Connection> => {
    const res = await api.post(`/connections/${id}/resume`);
    return asObject<Connection>(res.data);
  },

  end: async (id: number): Promise<Connection> => {
    const res = await api.delete(`/connections/${id}`);
    return asObject<Connection>(res.data);
  },

  setSiteTimezone: async (siteId: number, timezone: string) => {
    const res = await api.patch(`/connections/site/${siteId}/timezone`, { timezone });
    return asObject<{ siteId: number; timezone: string }>(res.data);
  },

  findReservedDayForListing: async (listing: {
    id?: number;
    siteId?: number;
    connectionId?: number | null;
  }): Promise<ConnectionToday | null> => {
    const listingId = Number(listing.id);
    const siteId = Number(listing.siteId);
    const connectionId = Number(listing.connectionId);

    const fromToday = async (targetSiteId: number) =>
      matchReservedDay(
        { id: listingId, connectionId },
        await connectionsService.listTodayForSite(targetSiteId),
      );

    const fromSiteConnections = async (targetSiteId: number) => {
      const listed = await connectionsService.listForSite(targetSiteId);
      for (const connection of listed) {
        let row = fromListedConnection(connection);
        if (Number(row.listingId) === listingId && row.dayId && !row.releasedAt) {
          return row;
        }
        if (connection.status !== 'ACTIVE') continue;
        try {
          row = fromListedConnection(await connectionsService.getOne(connection.id));
        } catch {
          continue;
        }
        if (Number(row.listingId) === listingId && row.dayId && !row.releasedAt) {
          return row;
        }
      }
      return null;
    };

    if (Number.isFinite(siteId) && siteId > 0) {
      const found = (await fromToday(siteId)) ?? (await fromSiteConnections(siteId));
      if (found?.dayId) return found;
    }

    if (Number.isFinite(connectionId) && connectionId > 0) {
      try {
        const connection = await connectionsService.getOne(connectionId);
        const row = fromListedConnection(connection);
        if (row.dayId && !row.releasedAt && (isReservedPublished(row) || Number(row.listingId) === listingId)) {
          return row;
        }
        const donorSiteId = Number(connection.donorSite?.id);
        if (Number.isFinite(donorSiteId) && donorSiteId > 0 && donorSiteId !== siteId) {
          const found = (await fromToday(donorSiteId)) ?? (await fromSiteConnections(donorSiteId));
          if (found?.dayId) return found;
        }
      } catch {
        return null;
      }
    }
    return null;
  },

  listTodayForSite: async (siteId: number): Promise<ConnectionToday[]> => {
    let rows: ConnectionToday[] = [];
    try {
      const res = await api.get(`/connections/site/${siteId}/today`);
      rows = asArray<ConnectionToday>(res.data);
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }

    const listed = await connectionsService.listForSite(siteId).catch(() => []);
    const fromList = (
      await Promise.all(
        listed
          .filter(
            (connection) =>
              connection.status === 'ACTIVE' &&
              (connection.today?.listingId ||
                connection.today ||
                isScheduledToday(connection.daysOfWeek)),
          )
          .map(async (connection) => {
            if (connection.today?.id) return fromListedConnection(connection);
            try {
              return fromListedConnection(await connectionsService.getOne(connection.id));
            } catch {
              return fromListedConnection(connection);
            }
          }),
      )
    ).filter((row) => row.dayId);

    const byConnection = new Map<number, ConnectionToday>();
    for (const row of [...rows, ...fromList]) {
      const prev = byConnection.get(row.connectionId);
      if (!prev) {
        byConnection.set(row.connectionId, row);
        continue;
      }
      byConnection.set(row.connectionId, {
        ...prev,
        ...row,
        listingId: row.listingId ?? prev.listingId,
        dayId: row.dayId ?? prev.dayId,
        outcome: row.outcome ?? prev.outcome,
        charityName: row.charityName ?? prev.charityName,
      });
    }
    return [...byConnection.values()];
  },

  addDailySurplus: async (dayId: number, payload: DailySurplusPayload) => {
    try {
      const res = await api.post(`/connections/days/${dayId}/surplus`, payload);
      return asObject<SurplusListingResult>(res.data);
    } catch (error) {
      if (!isUnknownPropertyRejection(error)) throw error;
      const res = await api.post(`/connections/days/${dayId}/surplus`, {
        items: payload.items,
        collectionNotes: payload.collectionNotes,
      });
      const result = asObject<SurplusListingResult>(res.data);
      if (result.listingId) {
        await applyListingDetails(result.listingId, payload);
      }
      return result;
    }
  },

  declareNoSurplus: async (dayId: number) => {
    const res = await api.post(`/connections/days/${dayId}/no-surplus`);
    return asObject<{ message?: string }>(res.data);
  },

  releaseToNetwork: async (
    dayId: number,
    payload?: {
      listingId?: number | null;
      pickupFromTime?: string;
      pickupByTime?: string;
      bestBefore?: string;
    },
  ) => {
    const window =
      payload?.pickupFromTime && payload?.pickupByTime
        ? {
            pickupFromTime: payload.pickupFromTime,
            pickupByTime: payload.pickupByTime,
            bestBefore: payload.bestBefore || payload.pickupByTime,
          }
        : undefined;

    if (payload?.listingId && window) {
      await foodListingService
        .updateListing(payload.listingId, window)
        .catch(() => undefined);
    }

    try {
      const res = await api.post(`/connections/days/${dayId}/release`, window ?? {});
      return asObject<{ message?: string; listingId?: number; reason?: string }>(res.data);
    } catch (error) {
      if (!isUnknownPropertyRejection(error) || !window) throw error;
      const res = await api.post(`/connections/days/${dayId}/release`);
      return asObject<{ message?: string; listingId?: number; reason?: string }>(res.data);
    }
  },

  reassignToConnection: async (dayId: number, toConnectionId: number) => {
    const res = await api.post(`/connections/days/${dayId}/reassign`, { toConnectionId });
    return asObject<{ message?: string; listingId?: number; toConnectionId?: number }>(res.data);
  },

  listForCharity: async (): Promise<Connection[]> => {
    const res = await api.get('/charity/connections');
    return asArray<Connection>(res.data);
  },

  listTodayForCharity: async (): Promise<ConnectionToday[]> => {
    try {
      const res = await api.get('/charity/connections/today');
      return asArray<ConnectionToday>(res.data);
    } catch (error) {
      if (!isNotFound(error)) throw error;
      const listed = await connectionsService.listForCharity();
      return listed
        .filter((connection) => connection.today?.outcome === 'PUBLISHED')
        .map(fromListedConnection);
    }
  },

  accept: async (id: number): Promise<Connection> => {
    const res = await api.post(`/charity/connections/${id}/accept`);
    return asObject<Connection>(res.data);
  },

  decline: async (id: number): Promise<Connection> => {
    const res = await api.post(`/charity/connections/${id}/decline`);
    return asObject<Connection>(res.data);
  },

  pauseAsCharity: async (id: number): Promise<Connection> => {
    const res = await api.post(`/charity/connections/${id}/pause`);
    return asObject<Connection>(res.data);
  },

  resumeAsCharity: async (id: number): Promise<Connection> => {
    const res = await api.post(`/charity/connections/${id}/resume`);
    return asObject<Connection>(res.data);
  },

  endAsCharity: async (id: number): Promise<Connection> => {
    const res = await api.delete(`/charity/connections/${id}`);
    return asObject<Connection>(res.data);
  },

  cannotCollect: async (dayId: number) => {
    const res = await api.post(`/charity/connections/days/${dayId}/cannot-collect`);
    return asObject<{ message?: string; listingId?: number; reason?: string }>(res.data);
  },

  nearbyCharities: async (params: {
    lat: number;
    lng: number;
    radiusKm?: number;
    region?: string;
  }): Promise<NearbyCharity[]> => {
    const res = await api.get('/geo/nearby-charities', {
      params: {
        lat: params.lat,
        lng: params.lng,
        radiusKm: params.radiusKm ?? 25,
        region: params.region ?? 'AU',
      },
    });
    const payload = asObject<{ charities?: NearbyCharity[] }>(res.data);
    return asArray<NearbyCharity>(payload?.charities ?? payload);
  },
};
