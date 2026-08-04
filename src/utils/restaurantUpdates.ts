import {
  estimateCo2AvoidedKg,
  estimateMealsSaved,
  getListingAudience,
} from '@/utils/foodListing';

export type UpdateAudience = 'people' | 'animals';
export type UpdateSection = 'TODAY' | 'YESTERDAY' | 'EARLIER';
export type UpdateCardType = 'claimed' | 'collected';

export type UpdateFoodItem = {
  name: string;
  qty: string;
};

export type RestaurantUpdate = {
  id: string;
  claimId: number;
  listingId: number;
  audience: UpdateAudience;
  cardType: UpdateCardType;
  section: UpdateSection;
  claimerName: string;
  location: string | null;
  assigneeLabel: string;
  assigneeName: string | null;
  assigneeStatus: string;
  pickupFrom: string | null;
  pickupTo: string | null;
  quantityKg: number;
  items: UpdateFoodItem[];
  claimerPhone: string | null;
  assigneePhone: string | null;
  collectedDate: string | null;
  mealsCreated: number;
  co2Avoided: number;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function sectionForDate(iso: string | null | undefined): UpdateSection {
  if (!iso) return 'EARLIER';
  const when = new Date(iso).getTime();
  if (!Number.isFinite(when)) return 'EARLIER';

  const today = startOfDay(new Date());
  const day = startOfDay(new Date(when));
  const dayMs = 24 * 60 * 60 * 1000;

  if (day === today) return 'TODAY';
  if (day === today - dayMs) return 'YESTERDAY';
  return 'EARLIER';
}

function isFarmOrgType(type?: string | null) {
  const t = String(type || '').toUpperCase();
  return t.includes('FARM');
}

function formatQty(kg: number) {
  const rounded = Math.round(kg * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}kg` : `${rounded}kg`;
}

function claimQuantityKg(claim: any, listing: any): number {
  const items = Array.isArray(claim?.claimItems) ? claim.claimItems : [];
  const fromItems = items.reduce(
    (sum: number, item: any) => sum + Number(item?.qtyKg || 0),
    0,
  );
  if (fromItems > 0) return fromItems;

  if (Number.isFinite(Number(claim?.qtyKg))) return Number(claim.qtyKg);

  return (listing?.foodItems || []).reduce(
    (sum: number, item: any) => sum + Number(item.totalQtyKg || item.remainingQtyKg || 0),
    0,
  );
}

function claimItems(claim: any, listing: any): UpdateFoodItem[] {
  const fromClaim = Array.isArray(claim?.claimItems) ? claim.claimItems : [];
  if (fromClaim.length > 0) {
    return fromClaim
      .map((item: any) => {
        const kg = Number(item?.qtyKg || 0);
        const name = item?.foodItem?.name || item?.name || 'Food item';
        return { name: String(name), qty: formatQty(kg) };
      })
      .filter((item: UpdateFoodItem) => item.name);
  }

  return (listing?.foodItems || []).map((item: any) => ({
    name: String(item?.name || 'Food item'),
    qty: formatQty(Number(item?.totalQtyKg || item?.remainingQtyKg || 0)),
  }));
}

function locationLabel(claim: any, listing: any): string | null {
  const site = claim?.claimantSite;
  if (site?.address) {
    const parts = [site.address, site.postcode].filter(Boolean);
    return parts.join(', ');
  }
  if (claim?.claimantOrg?.address) return String(claim.claimantOrg.address);
  if (listing?.pickupAddress) {
    const parts = [listing.pickupAddress, listing.pickupPostcode].filter(Boolean);
    return parts.join(', ');
  }
  return null;
}

function driverName(pickup: any): string | null {
  const driver = pickup?.driver;
  if (!driver) return null;
  const name = [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim();
  return name || null;
}

function assigneeStatusLabel(claim: any, isAnimals: boolean): string {
  const status = String(claim?.status || '').toUpperCase();
  const pickupStatus = String(claim?.driverPickups?.[0]?.status || '').toUpperCase();

  if (status === 'COLLECTED' || pickupStatus === 'COLLECTED') return 'collected';
  if (pickupStatus === 'ARRIVED') return 'arrived';
  if (pickupStatus === 'EN_ROUTE') return 'en_route';
  if (pickupStatus === 'ACCEPTED' || pickupStatus === 'ASSIGNED') {
    return isAnimals ? 'farmer_assigned' : 'driver_assigned';
  }
  if (status === 'CONFIRMED') return 'confirmed';
  return 'pending';
}

function isClaimCollected(claim: any): boolean {
  const status = String(claim?.status || '').toUpperCase();
  if (status === 'COLLECTED' || status === 'COMPLETED') return true;
  if (claim?.collectedAt) return true;

  const pickup = Array.isArray(claim?.driverPickups) ? claim.driverPickups[0] : null;
  const pickupStatus = String(pickup?.status || '').toUpperCase();
  return pickupStatus === 'COLLECTED';
}

/**
 * Turns org listings (with foodClaims) into the cards the Updates screen renders.
 * One card per non-cancelled claim — collected claims become impact cards;
 * everything still in flight stays as a claimed card.
 */
export function mapListingsToRestaurantUpdates(listings: any[]): RestaurantUpdate[] {
  const updates: RestaurantUpdate[] = [];

  for (const listing of listings || []) {
    const claims = Array.isArray(listing?.foodClaims) ? listing.foodClaims : [];
    if (claims.length === 0) continue;

    const audience: UpdateAudience =
      getListingAudience(listing) === 'animal' ? 'animals' : 'people';
    const isAnimals = audience === 'animals';

    for (const claim of claims) {
      const status = String(claim?.status || '').toUpperCase();
      if (status === 'CANCELLED') continue;

      const quantityKg = claimQuantityKg(claim, listing);
      const pickup = Array.isArray(claim?.driverPickups) ? claim.driverPickups[0] : null;
      const farmClaimant = isFarmOrgType(claim?.claimantOrg?.organizationType) || isAnimals;
      const claimerName =
        claim?.claimantSite?.organisationName ||
        claim?.claimantOrg?.name ||
        (farmClaimant ? 'Farm partner' : 'Charity partner');

      const assigneeFromDriver = driverName(pickup);
      const siteContact = claim?.claimantSite?.contactName || null;

      const collected = isClaimCollected(claim);
      const sectionDate = collected
        ? claim?.collectedAt || pickup?.collectedAt || claim?.updatedAt || claim?.createdAt
        : claim?.createdAt || claim?.confirmedAt;

      updates.push({
        id: String(claim.id ?? `${listing.id}-${claim.createdAt}`),
        claimId: Number(claim.id),
        listingId: Number(listing.id),
        audience,
        cardType: collected ? 'collected' : 'claimed',
        section: sectionForDate(sectionDate),
        claimerName,
        location: locationLabel(claim, listing),
        assigneeLabel: farmClaimant ? 'Farmer' : 'Driver',
        assigneeName: assigneeFromDriver || siteContact,
        assigneeStatus: assigneeStatusLabel(claim, farmClaimant),
        pickupFrom: listing?.pickupFromTime || listing?.pickupFrom || null,
        pickupTo: listing?.pickupByTime || listing?.pickupTo || null,
        quantityKg,
        items: claimItems(claim, listing),
        claimerPhone: claim?.claimantSite?.contactMobile || null,
        assigneePhone: pickup?.driver?.phoneNumber || claim?.claimantSite?.contactMobile || null,
        collectedDate: claim?.collectedAt || pickup?.collectedAt || null,
        mealsCreated: estimateMealsSaved(quantityKg),
        co2Avoided: estimateCo2AvoidedKg(quantityKg),
      });
    }
  }

  return updates.sort((a, b) => {
    const aDate = a.collectedDate || a.pickupFrom || '';
    const bDate = b.collectedDate || b.pickupFrom || '';
    const aMs = new Date(aDate).getTime() || 0;
    const bMs = new Date(bDate).getTime() || 0;
    if (bMs !== aMs) return bMs - aMs;
    return b.claimId - a.claimId;
  });
}
