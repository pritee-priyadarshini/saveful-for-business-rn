/** Business reminder fires this long before the pickup window starts. */
export const CONNECTION_PROMPT_LEAD_MINUTES = 4 * 60;
/** Business must add food and quantities this long before pickup. */
export const CONNECTION_LIST_BY_MINUTES = 150;
/** Charity must confirm collection this long before pickup. */
export const CONNECTION_CHARITY_CONFIRM_MINUTES = 90;

export const ISO_WEEKDAYS = [
  { id: 1, label: 'Mon', full: 'Monday' },
  { id: 2, label: 'Tue', full: 'Tuesday' },
  { id: 3, label: 'Wed', full: 'Wednesday' },
  { id: 4, label: 'Thu', full: 'Thursday' },
  { id: 5, label: 'Fri', full: 'Friday' },
  { id: 6, label: 'Sat', full: 'Saturday' },
  { id: 7, label: 'Sun', full: 'Sunday' },
] as const;

export const COMMON_TIMEZONES = [
  'Australia/Brisbane',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Adelaide',
  'Australia/Perth',
  'Australia/Hobart',
  'Australia/Darwin',
  'Pacific/Auckland',
  'Asia/Kolkata',
  'Europe/London',
  'America/New_York',
] as const;

export type ConnectionStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'PAUSED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'ENDED';

export type ConnectionDayOutcome =
  | 'PROMPTED'
  | 'PUBLISHED'
  | 'NO_SURPLUS'
  | 'NO_RESPONSE'
  | 'COLLECTED'
  | 'RELEASED'
  | 'MISSED';

export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Australia/Brisbane';
  } catch {
    return 'Australia/Brisbane';
  }
}

export function isoWeekday(date = new Date()): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

export function isScheduledToday(daysOfWeek?: number[] | null): boolean {
  if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) return false;
  return daysOfWeek.includes(isoWeekday());
}

export function formatHhMm(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function parseHhMm(value: string, fallbackHour = 16, fallbackMinute = 0): Date {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || '').trim());
  const next = new Date();
  if (match) {
    next.setHours(Number(match[1]), Number(match[2]), 0, 0);
  } else {
    next.setHours(fallbackHour, fallbackMinute, 0, 0);
  }
  return next;
}

export function windowPhase(
  start?: string | null,
  end?: string | null,
  now = Date.now(),
): 'upcoming' | 'open' | 'ended' | 'unknown' {
  const startAt = start ? new Date(start).getTime() : NaN;
  const endAt = end ? new Date(end).getTime() : NaN;
  if (Number.isFinite(endAt) && now > endAt) return 'ended';
  if (Number.isFinite(startAt) && now < startAt) return 'upcoming';
  if (Number.isFinite(startAt) && Number.isFinite(endAt)) return 'open';
  return 'unknown';
}

export function formatWindowLabel(start?: string | null, end?: string | null): string {
  if (!start && !end) return '';
  const time = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };
  const a = time(start);
  const b = time(end);
  if (a && b) return `${a}–${b}`;
  return a || b;
}

export function connectionPartyName(
  party?: { name?: string | null; organisationName?: string | null } | null,
  fallback = 'Charity',
): string {
  return party?.name || party?.organisationName || fallback;
}

export function connectionLocationLabel(site?: {
  address?: string | null;
  postcode?: string | null;
} | null): string {
  return [site?.address, site?.postcode].filter(Boolean).join(', ');
}

export function statusLabel(status?: string | null): string {
  switch (String(status || '').toUpperCase()) {
    case 'PENDING':
      return 'Awaiting charity';
    case 'ACTIVE':
      return 'Active';
    case 'PAUSED':
      return 'Paused';
    case 'DECLINED':
      return 'Declined';
    case 'EXPIRED':
      return 'Expired';
    case 'ENDED':
      return 'Ended';
    default:
      return status || '';
  }
}

export function outcomeNeedsSurplus(outcome?: string | null): boolean {
  const value = String(outcome || 'PROMPTED').toUpperCase();
  return value === 'PROMPTED' || value === '';
}

/** Active Connection, scheduled day, food not listed yet — use preferred listing. */
export function canListPreferredSurplus(row?: {
  dayId?: number | null;
  outcome?: string | null;
  windowStartAt?: string | null;
  windowEndAt?: string | null;
} | null): boolean {
  if (!row?.dayId) return false;
  if (!outcomeNeedsSurplus(row.outcome)) return false;
  if (row.windowStartAt) {
    const listBy = new Date(row.windowStartAt).getTime() - CONNECTION_LIST_BY_MINUTES * 60_000;
    if (Number.isFinite(listBy) && Date.now() >= listBy) return false;
  }
  if (row.windowEndAt) {
    const end = new Date(row.windowEndAt).getTime();
    if (Number.isFinite(end) && Date.now() > end) return false;
  }
  return true;
}

export function isReservedPublished(row?: {
  outcome?: string | null;
  listingId?: number | null;
  releasedAt?: string | null;
} | null): boolean {
  if (!row || row.releasedAt) return false;
  const outcome = String(row.outcome || '').toUpperCase();
  if (['RELEASED', 'COLLECTED', 'NO_SURPLUS', 'NO_RESPONSE', 'MISSED'].includes(outcome)) return false;
  if (outcomeAwaitingCharity(outcome)) return true;
  return Boolean(row.listingId) && outcome !== 'PROMPTED';
}

/** A listing held for a preferred charity — not yet on the open network. */
export function isReservedListing(listing?: {
  reserved?: boolean;
  exclusiveToOrgId?: number | null;
  exclusive_to_org_id?: number | null;
  connectionId?: number | null;
  connection_id?: number | null;
  releasedAt?: string | null;
  released_at?: string | null;
} | null): boolean {
  if (!listing) return false;
  if (listing.releasedAt || listing.released_at) return false;
  if (listing.reserved) return true;
  const exclusive = listing.exclusiveToOrgId ?? listing.exclusive_to_org_id;
  const connectionId = listing.connectionId ?? listing.connection_id;
  return Boolean(exclusive || connectionId);
}

export function matchReservedDay<T extends {
  listingId?: number | null;
  connectionId?: number;
  outcome?: string | null;
}>(listing: { id?: number; listingId?: number; connectionId?: number | null; connection_id?: number | null } | null, rows: T[]): T | undefined {
  const listingId = Number(listing?.id ?? listing?.listingId);
  if (Number.isFinite(listingId) && listingId > 0) {
    const byListing = rows.find(
      (row) => Number(row.listingId) === listingId && isReservedPublished(row),
    );
    if (byListing) return byListing;
  }
  const connectionId = Number(listing?.connectionId ?? listing?.connection_id);
  if (Number.isFinite(connectionId) && connectionId > 0) {
    return rows.find(
      (row) => row.connectionId === connectionId && isReservedPublished(row),
    );
  }
  return undefined;
}

export function otherOpenConnections<T extends {
  connectionId: number;
  dayId?: number | null;
  outcome?: string | null;
  windowEndAt?: string | null;
}>(rows: T[], exceptConnectionId?: number): T[] {
  return rows.filter(
    (row) => row.connectionId !== exceptConnectionId && canListPreferredSurplus(row),
  );
}

export function parseWindowFromSchedule(schedule?: string | null): { start: Date; end: Date } {
  const part = String(schedule || '').split('|')[1]?.trim() || String(schedule || '');
  const match = /(\d{1,2}):(\d{2})\s*(am|pm)?\s*[–-]\s*(\d{1,2}):(\d{2})\s*(am|pm)?/i.exec(part);
  if (!match) return { start: parseHhMm('16:00', 16, 0), end: parseHhMm('17:00', 17, 0) };

  const toDate = (hour: number, minute: number, suffix?: string) => {
    let h = hour;
    const mer = suffix?.toLowerCase();
    if (mer === 'pm' && h < 12) h += 12;
    if (mer === 'am' && h === 12) h = 0;
    return parseHhMm(`${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, h, minute);
  };

  const startMer = match[3] || match[6];
  const endMer = match[6] || match[3];
  return {
    start: toDate(Number(match[1]), Number(match[2]), startMer),
    end: toDate(Number(match[4]), Number(match[5]), endMer),
  };
}

export function outcomeAwaitingCharity(outcome?: string | null): boolean {
  return String(outcome || '').toUpperCase() === 'PUBLISHED';
}

export function isCutoffDue(cutoffAt?: string | null, outcome?: string | null): boolean {
  if (!outcomeAwaitingCharity(outcome) || !cutoffAt) return false;
  const at = new Date(cutoffAt).getTime();
  return Number.isFinite(at) && Date.now() >= at;
}
