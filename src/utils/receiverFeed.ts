import { claimsService } from '@/services/claims.service';
import {
  fetchDiscoverListings,
  fetchNearbyDiscoverListings,
  mapDiscoverListing,
  type DiscoverAudience,
} from '@/services/foodListing.service';
import type { AvailableFoodMode } from '@/hooks/useAvailableFoodMode';

export type ReceiverUpdateType = 'new_surplus' | 'pickup' | 'collected' | 'feedback';
export type ReceiverUpdateSection = 'Today' | 'Previous';

export type ReceiverUpdateItem = {
  id: string;
  type: ReceiverUpdateType;
  section: ReceiverUpdateSection;
  title: string;
  quantityKg: number;
  distance: string;
  city: string;
  timeLabel: string;
  driverName?: string | null;
  claimId?: number;
  listingId?: number;
  items?: ReceiverPickupItem[];
};

export type ReceiverPickupCardStatus =
  | 'unclaimed'
  | 'claimed'
  | 'awaiting_driver'
  | 'enroute'
  | 'completed'
  | 'cancelled';

export type ReceiverPickupItem = {
  name: string;
  available: number;
  claimed: number;
};

export type ReceiverPickup = {
  id: string;
  restaurantName: string;
  restaurantAddress: string;
  distance: string;
  restaurantPhone: string;
  driverName: string | null;
  driverPhone: string | null;
  /** "Driver" when a driver pickup exists, otherwise "Collector". */
  assigneeLabel: string;
  pickupDateLabel: string;
  pickupTimeLabel: string;
  instructions: string;
  weightKg: number;
  cardStatus: ReceiverPickupCardStatus;
  isNextPickup?: boolean;
  items: ReceiverPickupItem[];
  claimId?: number;
  listingId?: number;
};

const CLAIMS_PAGE_SIZE = 100;

export function unwrapClaimsPayload(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  const data = payload as any;
  if (Array.isArray(data?.claims)) return data.claims;
  if (Array.isArray(data?.data?.claims)) return data.data.claims;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export async function fetchAllMyClaims(maxPages = 10): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const payload = await claimsService.getMyClaims({ page, limit: CLAIMS_PAGE_SIZE });
    const claims = unwrapClaimsPayload(payload);
    all.push(...claims);
    totalPages = Math.max(
      1,
      Number((payload as any)?.totalPages ?? (payload as any)?.data?.totalPages ?? 1),
    );
    page += 1;
  } while (page <= totalPages && page <= maxPages);

  return all;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function sectionForIso(iso?: string | null): ReceiverUpdateSection {
  if (!iso) return 'Previous';
  const when = new Date(iso).getTime();
  if (!Number.isFinite(when)) return 'Previous';
  return startOfDay(new Date(when)) === startOfDay(new Date()) ? 'Today' : 'Previous';
}

function formatClock(iso?: string | null) {
  if (!iso) return '';
  return new Date(iso)
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(' ', '')
    .toLowerCase();
}

function formatDayLabel(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  const today = startOfDay(new Date());
  const day = startOfDay(date);
  const dayMs = 24 * 60 * 60 * 1000;
  if (day === today) return 'Today';
  if (day === today - dayMs) return 'Yesterday';
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function formatTimeLabel(from?: string | null, to?: string | null) {
  const day = formatDayLabel(from || to);
  const fromClock = formatClock(from);
  const toClock = formatClock(to);
  if (day && fromClock && toClock) return `${day} - ${fromClock} - ${toClock}`;
  if (day && fromClock) return `${day} - ${fromClock}`;
  return day || 'Pickup window TBC';
}

function cityFromAddress(address?: string | null, postcode?: string | null) {
  if (!address) return postcode || '';
  const parts = String(address)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 1];
  return postcode || parts[0] || '';
}

function formatKg(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100) / 100;
}

function claimQuantityKg(claim: any): number {
  const items = Array.isArray(claim?.claimItems) ? claim.claimItems : [];
  const fromItems = items.reduce(
    (sum: number, item: any) => sum + Number(item?.qtyKg || 0),
    0,
  );
  if (fromItems > 0) return formatKg(fromItems);

  // Prefer remaining/total on the listing only when claim lines are missing.
  const listingQty = Number(
    claim?.listing?.remainingQtyKg ?? claim?.listing?.totalQtyKg ?? 0,
  );
  return formatKg(listingQty);
}

function pickDriverPickup(claim: any): any | null {
  const pickups = Array.isArray(claim?.driverPickups) ? claim.driverPickups : [];
  if (pickups.length === 0) return null;

  const ranked = [...pickups].sort((a, b) => {
    const rank = (status: string) => {
      const s = String(status || '').toUpperCase();
      if (s === 'COLLECTED') return 0;
      if (s === 'ARRIVED' || s === 'EN_ROUTE') return 1;
      if (s === 'ACCEPTED' || s === 'ASSIGNED') return 2;
      if (s === 'CANCELLED') return 9;
      return 5;
    };
    const byStatus = rank(a?.status) - rank(b?.status);
    if (byStatus !== 0) return byStatus;
    return new Date(b?.collectedAt || b?.createdAt || 0).getTime()
      - new Date(a?.collectedAt || a?.createdAt || 0).getTime();
  });

  const best = ranked.find((p) => String(p?.status || '').toUpperCase() !== 'CANCELLED') || ranked[0];
  return best?.driver ? best : null;
}

function driverName(claim: any): string | null {
  const pickup = pickDriverPickup(claim);
  const driver = pickup?.driver;
  if (!driver) {
    // Self-collection by the claimant site — show the site contact instead of
    // a misleading "no driver" line.
    const siteName = claim?.claimantSite?.contactName;
    return siteName ? String(siteName) : null;
  }
  const name = [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim();
  return name || null;
}

function driverPhone(claim: any): string | null {
  const pickup = pickDriverPickup(claim);
  return (
    pickup?.driver?.phoneNumber ||
    claim?.claimantSite?.contactMobile ||
    null
  );
}

function driverRoleLabel(claim: any): string {
  return pickDriverPickup(claim)?.driver ? 'Driver' : 'Collector';
}

function isCollectedClaim(claim: any): boolean {
  const status = String(claim?.status || '').toUpperCase();
  if (status === 'COLLECTED' || status === 'COMPLETED') return true;
  if (claim?.collectedAt) return true;
  const pickupStatus = String(pickDriverPickup(claim)?.status || '').toUpperCase();
  return pickupStatus === 'COLLECTED';
}

function pickupStatusFromClaim(claim: any): ReceiverPickupCardStatus {
  const status = String(claim?.status || '').toUpperCase();
  if (status === 'CANCELLED') return 'cancelled';
  if (isCollectedClaim(claim)) return 'completed';

  const pickupStatus = String(pickDriverPickup(claim)?.status || '').toUpperCase();
  if (pickupStatus === 'EN_ROUTE' || pickupStatus === 'ARRIVED') return 'enroute';
  if (pickupStatus === 'ASSIGNED' || pickupStatus === 'ACCEPTED') return 'awaiting_driver';
  if (status === 'CONFIRMED' || status === 'PENDING') {
    return pickDriverPickup(claim)?.driver ? 'claimed' : 'awaiting_driver';
  }
  return 'claimed';
}

function storageInstructions(listing: any): string {
  const bits: string[] = [];
  if (listing?.needsRefrigeration) bits.push('Needs refrigeration');
  if (listing?.needsHot) bits.push('Keep hot');
  if (listing?.needsReheating) bits.push('Reheat before serving');
  return bits.join(' · ') || 'Follow on-site instructions';
}

function claimItemsToPickupItems(claim: any): ReceiverPickupItem[] {
  const claimedItems = Array.isArray(claim?.claimItems) ? claim.claimItems : [];
  if (claimedItems.length > 0) {
    return claimedItems.map((item: any) => {
      const claimed = Number(item?.qtyKg || 0);
      const available = Number(item?.foodItem?.totalQtyKg || claimed);
      return {
        name: item?.foodItem?.name || 'Food item',
        available,
        claimed,
      };
    });
  }

  return (claim?.listing?.foodItems || []).map((item: any) => ({
    name: item?.name || 'Food item',
    available: Number(item?.totalQtyKg || item?.remainingQtyKg || 0),
    claimed: Number(item?.totalQtyKg || item?.remainingQtyKg || 0),
  }));
}

function listingToPickupItems(listing: any): ReceiverPickupItem[] {
  return (listing?.foodItems || []).map((item: any) => ({
    name: item?.name || 'Food item',
    available: Number(item?.remainingQtyKg ?? item?.totalQtyKg ?? 0),
    claimed: 0,
  }));
}

/**
 * Builds the charity/farmer Updates feed from the org's claims plus available
 * surplus nearby (or from the notification inbox feed).
 */
export function mapReceiverUpdates(params: {
  claims: any[];
  availableListings: ReturnType<typeof mapDiscoverListing>[];
}): ReceiverUpdateItem[] {
  const { claims, availableListings } = params;
  const claimedListingIds = new Set(
    claims.map((claim) => Number(claim?.listingId || claim?.listing?.id)).filter(Boolean),
  );

  const updates: ReceiverUpdateItem[] = [];

  for (const listing of availableListings) {
    if (claimedListingIds.has(Number(listing.listingId))) continue;
    const status = String(listing.statusRaw || '').toUpperCase();
    if (status && status !== 'ACTIVE' && status !== 'PARTIAL' && status !== 'AVAILABLE') {
      continue;
    }

    updates.push({
      id: `surplus-${listing.id}`,
      type: 'new_surplus',
      section: sectionForIso(String(listing.listedAt || '')),
      title: listing.businessName,
      quantityKg: formatKg(Number(listing.quantityKg || 0)),
      distance: listing.distance && listing.distance !== '—' ? `${listing.distance} away` : '',
      city: cityFromAddress(listing.pickupAddress),
      timeLabel: listing.pickupWindow || formatTimeLabel(String(listing.listedAt || ''), String(listing.expiresAt || '')),
      listingId: listing.listingId,
    });
  }

  for (const claim of claims) {
    const status = String(claim?.status || '').toUpperCase();
    if (status === 'CANCELLED') continue;

    const listing = claim?.listing || {};
    const title =
      listing?.organisation?.name ||
      listing?.site?.organisationName ||
      'Business';
    const quantityKg = claimQuantityKg(claim);
    const address = listing?.pickupAddress || listing?.site?.address || '';
    const distance = '';
    const city = cityFromAddress(address, listing?.pickupPostcode || listing?.site?.postcode);
    const timeLabel = formatTimeLabel(listing?.pickupFromTime, listing?.pickupByTime);
    const collected = isCollectedClaim(claim);
    const needsFeedback = collected && claim?.rating == null;
    const sectionDate = collected
      ? claim?.collectedAt || claim?.updatedAt || claim?.createdAt
      : claim?.createdAt || claim?.confirmedAt;

    if (needsFeedback) {
      updates.push({
        id: `feedback-${claim.id}`,
        type: 'feedback',
        section: sectionForIso(sectionDate),
        title,
        quantityKg,
        distance,
        city,
        timeLabel: '',
        claimId: Number(claim.id),
        listingId: Number(listing?.id || claim?.listingId),
        items: claimItemsToPickupItems(claim),
      });
    }

    updates.push({
      id: String(claim.id),
      type: collected ? 'collected' : 'pickup',
      section: sectionForIso(sectionDate),
      title,
      quantityKg,
      distance,
      city,
      timeLabel,
      driverName: driverName(claim),
      claimId: Number(claim.id),
      listingId: Number(listing?.id || claim?.listingId),
      items: claimItemsToPickupItems(claim),
    });
  }

  return updates.sort((a, b) => {
    if (a.section !== b.section) return a.section === 'Today' ? -1 : 1;
    return Number(b.claimId || b.listingId || 0) - Number(a.claimId || a.listingId || 0);
  });
}

/**
 * Builds the charity/farmer Pickup screen from claims + the best available
 * nearby listing for the "next pickup" card.
 */
export function mapReceiverPickups(params: {
  claims: any[];
  availableListings: ReturnType<typeof mapDiscoverListing>[];
}): { nextPickup: ReceiverPickup | null; claimedPickups: ReceiverPickup[] } {
  const { claims, availableListings } = params;
  const claimedListingIds = new Set(
    claims.map((claim) => Number(claim?.listingId || claim?.listing?.id)).filter(Boolean),
  );

  const available = availableListings.find((listing) => {
    if (claimedListingIds.has(Number(listing.listingId))) return false;
    const status = String(listing.statusRaw || '').toUpperCase();
    return !status || status === 'ACTIVE' || status === 'PARTIAL' || status === 'AVAILABLE';
  });

  const nextPickup: ReceiverPickup | null = available
    ? {
        id: `available-${available.id}`,
        restaurantName: available.businessName,
        restaurantAddress: available.pickupAddress,
        distance:
          available.distance && available.distance !== '—'
            ? `${available.distance} away`
            : '',
        restaurantPhone: '',
        driverName: null,
        driverPhone: null,
        assigneeLabel: 'Driver',
        pickupDateLabel: available.pickupWindowDate || formatDayLabel(String(available.listedAt || '')),
        pickupTimeLabel: available.pickupWindow || '',
        instructions: available.storage || 'Follow on-site instructions',
        weightKg: formatKg(Number(available.quantityKg || 0)),
        cardStatus: 'unclaimed',
        isNextPickup: true,
        items: listingToPickupItems(available),
        listingId: available.listingId,
      }
    : null;

  const claimedPickups: ReceiverPickup[] = claims
    .map((claim) => {
      const listing = claim?.listing || {};
      const cardStatus = pickupStatusFromClaim(claim);
      const from = listing?.pickupFromTime;
      const to = listing?.pickupByTime;
      const collectedAt = claim?.collectedAt || pickDriverPickup(claim)?.collectedAt;
      const name = driverName(claim);
      const phone = driverPhone(claim);

      return {
        id: String(claim.id),
        restaurantName:
          listing?.organisation?.name ||
          listing?.site?.organisationName ||
          'Business',
        restaurantAddress: listing?.pickupAddress || listing?.site?.address || 'Address unavailable',
        distance: '',
        restaurantPhone: listing?.site?.contactMobile || '',
        driverName: name,
        driverPhone: phone,
        assigneeLabel: driverRoleLabel(claim),
        pickupDateLabel:
          cardStatus === 'completed' || cardStatus === 'cancelled'
            ? formatDayLabel(collectedAt || claim?.updatedAt || from)
            : formatDayLabel(from || to),
        pickupTimeLabel:
          cardStatus === 'completed' || cardStatus === 'cancelled'
            ? ''
            : [formatClock(from), formatClock(to)].filter(Boolean).join(' - '),
        instructions: storageInstructions(listing),
        weightKg: claimQuantityKg(claim),
        cardStatus,
        items: claimItemsToPickupItems(claim),
        claimId: Number(claim.id),
        listingId: Number(listing?.id || claim?.listingId),
      } satisfies ReceiverPickup;
    })
    .sort((a, b) => Number(b.claimId || 0) - Number(a.claimId || 0));

  return { nextPickup, claimedPickups };
}

export async function fetchAvailableListingsForAudience(
  audience: DiscoverAudience,
  mode: AvailableFoodMode,
) {
  const raw =
    mode === 'nearby_fallback'
      ? await fetchNearbyDiscoverListings({ page: 1, limit: 20, allPages: true })
      : await fetchDiscoverListings(audience, { page: 1, limit: 20 });
  return raw.map(mapDiscoverListing);
}
