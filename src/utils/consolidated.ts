import type {
  CollectionStatus,
  ContributionStatus,
  HandoverMethod,
  RejectionReason,
  ScheduleTimes,
} from '@/types/consolidated';

export const DECLARATION_FALLBACK = {
  SITE: {
    version: 'v1',
    text: 'I confirm that the food and quantities recorded are accurate to the best of my knowledge, that the food is suitable for its intended redistribution, and that it has been handled and stored in accordance with applicable food safety requirements.',
  },
  MANAGER: {
    version: 'v1',
    text: 'I confirm that the consolidated listing accurately reflects the food recorded and verified for this collection, and that the participating organisation remains responsible for applicable food safety and handling requirements.',
  },
  CHARITY: {
    version: 'v1',
    text: 'I confirm that the quantities and condition of food accepted have been recorded, including rejected or unavailable items, and acknowledge responsibility for the safe handling, transport and use of accepted food following collection, in accordance with applicable requirements.',
  },
} as const;

export const REJECTION_REASON_OPTIONS: { value: RejectionReason; label: string }[] = [
  { value: 'QUALITY', label: 'Quality' },
  { value: 'TEMPERATURE', label: 'Temperature' },
  { value: 'PACKAGING_DAMAGED', label: 'Packaging damaged' },
  { value: 'PAST_DATE', label: 'Past date' },
  { value: 'NOT_AS_DESCRIBED', label: 'Not as described' },
  { value: 'CANNOT_TRANSPORT', label: "Can't transport" },
  { value: 'CANNOT_STORE', label: "Can't store" },
  { value: 'OTHER', label: 'Other' },
];

const COLLECTION_LABELS: Record<CollectionStatus, string> = {
  SCHEDULED: 'Scheduled',
  OPEN: 'Open',
  SUBMISSIONS_CLOSED: 'Submissions closed',
  PUBLISHED: 'Published',
  CLAIMED: 'Claimed',
  AWAITING_ITEM_CHECK: 'Awaiting item check',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
};

const COLLECTION_COLORS: Record<CollectionStatus, { background: string; color: string }> = {
  SCHEDULED: { background: '#F3F0EA', color: '#6D6D72' },
  OPEN: { background: '#E6FFF0', color: '#3A7E52' },
  SUBMISSIONS_CLOSED: { background: '#FFF1D6', color: '#C47A12' },
  PUBLISHED: { background: '#E8F1FB', color: '#2F6FED' },
  CLAIMED: { background: '#E8F1FB', color: '#2F6FED' },
  AWAITING_ITEM_CHECK: { background: '#FFF4E8', color: '#C56A12' },
  COMPLETED: { background: '#EEF7F2', color: '#3A7E52' },
  CANCELLED: { background: '#F5F5F5', color: '#888888' },
  EXPIRED: { background: '#FFF1D6', color: '#C47A12' },
};

const CONTRIBUTION_LABELS: Record<ContributionStatus, string> = {
  SUBMITTED: 'Listed',
  LATE_PENDING_APPROVAL: 'Awaiting approval',
  REJECTED_LATE: 'Rejected',
  WITHDRAWN: 'Cancelled',
  HANDED_OVER: 'Handed over',
  RECEIVED: 'Received',
  NOT_RECEIVED: 'Not received',
  EXCLUDED: 'Excluded',
  NO_CONTRIBUTION: 'No contribution',
  COMPLETED: 'Collected by charity',
  CANCELLED: 'Cancelled',
};

export function collectionStatusLabel(status?: string | null): string {
  if (!status) return 'Scheduled';
  return COLLECTION_LABELS[status as CollectionStatus] || titleCase(status);
}

export function collectionStatusColors(status?: string | null): { background: string; color: string } {
  return COLLECTION_COLORS[status as CollectionStatus] || COLLECTION_COLORS.SCHEDULED;
}

/**
 * Per-site status, worded for the collection's method (Canva CM3):
 *  Collected from sites — Awaiting collection → Collected / in transit → Received at central point
 *  Dropped off by sites — Awaiting drop off → Dropped off / awaiting verification → Received at central point
 * "Handed over" never means received: only the receiver's check does.
 */
export function contributionStatusLabel(status?: string | null, method?: HandoverMethod | null): string {
  const internal = method === 'INTERNAL_COLLECTION';
  if (status === 'SUBMITTED') return internal ? 'Awaiting collection' : 'Awaiting drop off';
  if (status === 'HANDED_OVER') {
    return internal ? 'Collected / in transit' : 'Dropped off / awaiting verification';
  }
  if (status === 'RECEIVED') return 'Received at central point';
  if (!status) return 'Listed';
  return CONTRIBUTION_LABELS[status as ContributionStatus] || titleCase(status);
}

export function methodLabel(method?: HandoverMethod | null): string {
  return method === 'INTERNAL_COLLECTION' ? 'Collected from sites' : 'Dropped off by sites';
}

export function methodSentence(method?: HandoverMethod | null): string {
  return method === 'INTERNAL_COLLECTION'
    ? 'Staff will collect your food and bring it to the collection point.'
    : 'Each site brings its food to the collection point.';
}

/**
 * The one-line instruction a site sees for a collection (Canva SM1/SM2):
 * set by the manager's method, with the relevant deadline.
 */
export function handoverInstruction(collection: {
  method?: HandoverMethod | null;
  point?: { name?: string | null } | null;
  handoverStartAt?: string | null;
  handoverEndAt?: string | null;
  timezone?: string | null;
}): string {
  if (collection.method === 'INTERNAL_COLLECTION') {
    const ready = formatTimeInZone(collection.handoverStartAt, collection.timezone);
    return `Your food will be collected from your outlet. Please have it ready by ${ready}.`;
  }
  const deadline = formatTimeInZone(collection.handoverEndAt, collection.timezone);
  const where = collection.point?.name || 'the collection point';
  return `Please drop off your food at ${where} by ${deadline}.`;
}

export function handoverButtonLabel(method?: HandoverMethod | null): string {
  return method === 'INTERNAL_COLLECTION' ? 'Confirm food collected' : 'Confirm food dropped off';
}

export function handoverSuccessLabel(method?: HandoverMethod | null): string {
  return method === 'INTERNAL_COLLECTION' ? 'Collected' : 'Dropped off';
}

export function timeFieldLabel(field: keyof ScheduleTimes, method?: HandoverMethod | null): string {
  if (field === 'submissionsClose') return 'Sites must list food by';
  if (field === 'pickupStart' || field === 'pickupEnd') return 'Charity pickup window';
  if (method === 'INTERNAL_COLLECTION') {
    if (field === 'handoverStart') return 'Food-ready deadline';
    return 'Internal collection window ends';
  }
  if (field === 'handoverStart') return 'Drop-off window opens';
  return 'Final drop-off deadline';
}

export function exceptionLabel(code: string): string {
  const key = code.toUpperCase();
  if (key.includes('LATE')) return 'Late';
  if (key.includes('OVERDUE')) return 'Overdue';
  if (key.includes('NOT_RECEIVED') || key.includes('NOTRECEIVED')) return 'Not received';
  if (key.includes('CHANGE')) return 'Changed';
  return titleCase(code);
}

export function formatKg(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const n = Math.round(Number(value) * 100) / 100;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatInTimezone(
  iso?: string | null,
  timeZone?: string | null,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!iso) return '—';
  // A bare calendar date ("2026-11-13") is not an instant: show it as-is,
  // never shifted by a timezone.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const date = new Date(dateOnly ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(date.getTime())) return '—';
  if (dateOnly) {
    timeZone = 'UTC';
    options = { ...options, hour: undefined, minute: undefined };
  }
  const fmt: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...options,
  };
  try {
    return new Intl.DateTimeFormat('en-AU', {
      ...fmt,
      timeZone: timeZone || undefined,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-AU', fmt).format(date);
  }
}

export function formatTimeInZone(iso?: string | null, timeZone?: string | null): string {
  return formatInTimezone(iso, timeZone, {
    day: undefined,
    month: undefined,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateInZone(iso?: string | null, timeZone?: string | null): string {
  return formatInTimezone(iso, timeZone, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: undefined,
    minute: undefined,
  });
}

export function formatWindowInZone(
  from?: string | null,
  to?: string | null,
  timeZone?: string | null,
): string {
  const start = from ? formatTimeInZone(from, timeZone) : '';
  const end = to ? formatTimeInZone(to, timeZone) : '';
  if (start && end && start !== '—') return `${start} – ${end}`;
  return start || end || '—';
}

/** YYYY-MM-DD in the collection timezone. */
export function formatDateKey(iso?: string | null, timeZone?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
    return parts;
  } catch {
    return iso.slice(0, 10);
  }
}

export function todayKey(timeZone?: string | null): string {
  return formatDateKey(new Date().toISOString(), timeZone);
}

function minutesOf(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** SPEC A6. Returns an error message, or null when the order is valid. */
export function validateTimes(times: ScheduleTimes): string | null {
  const submissionsClose = minutesOf(times.submissionsClose);
  const handoverStart = minutesOf(times.handoverStart);
  const handoverEnd = minutesOf(times.handoverEnd);
  const pickupStart = minutesOf(times.pickupStart);
  const pickupEnd = minutesOf(times.pickupEnd);
  if ([submissionsClose, handoverStart, handoverEnd, pickupStart, pickupEnd].some((value) => value == null)) {
    return 'Enter every time.';
  }
  if (submissionsClose! > handoverEnd!) {
    return 'Listing deadline must be at or before handover ends.';
  }
  if (!(handoverStart! < handoverEnd!)) {
    return 'Handover must start before it ends.';
  }
  if (!(handoverEnd! <= pickupStart!)) {
    return 'Handover must end at or before charity pickup starts.';
  }
  if (!(pickupStart! < pickupEnd!)) {
    return 'Charity pickup must start before it ends.';
  }
  return null;
}

export function formatHHmmInZone(iso?: string | null, timeZone?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || undefined,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
    const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  } catch {
    return toHHmm(date);
  }
}

export function toHHmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function fromHHmm(hhmm?: string | null): Date {
  const date = new Date();
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  if (!match) {
    date.setHours(9, 0, 0, 0);
    return date;
  }
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date;
}

/** Wall-clock date + HH:mm in an IANA timezone, as a UTC ISO string. */
export function zonedDateTimeToUtc(date: string, time: string, timeZone?: string | null): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  let utc = Date.UTC(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0);
  const zone = timeZone || undefined;
  if (!zone) return new Date(utc).toISOString();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    let parts: Intl.DateTimeFormatPart[];
    try {
      parts = new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date(utc));
    } catch {
      return new Date(utc).toISOString();
    }
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const got = Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'));
    const want = Date.UTC(year, (month || 1) - 1, day || 1, hour || 0, minute || 0);
    const delta = want - got;
    if (delta === 0) break;
    utc += delta;
  }
  return new Date(utc).toISOString();
}

export function closesInLabel(iso?: string | null): string | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return 'Submissions closed';
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `Closes in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `Closes in ${hours}h ${rest}m` : `Closes in ${hours}h`;
}

export function pickupInLabel(iso?: string | null): string | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(diff)) return null;
  if (diff <= 0) return 'Pickup window open';
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `Pickup in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `Pickup in ${hours}h`;
}

export function isBusinessRole(role?: string | null): boolean {
  return role === 'restaurant_single' || role === 'restaurant_multi';
}

export function canWithdrawContribution(status?: string | null): boolean {
  return status === 'SUBMITTED' || status === 'LATE_PENDING_APPROVAL';
}

export function canHandoverContribution(status?: string | null): boolean {
  return status === 'SUBMITTED';
}

export function canEditContribution(status?: string | null, collectionStatus?: string | null): boolean {
  if (!status) return false;
  if (['WITHDRAWN', 'REJECTED_LATE', 'EXCLUDED', 'CANCELLED', 'COMPLETED', 'NO_CONTRIBUTION'].includes(status)) {
    return false;
  }
  if (collectionStatus && ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(collectionStatus)) return false;
  return true;
}
