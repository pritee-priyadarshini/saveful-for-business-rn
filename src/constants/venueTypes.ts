/** Venue / business types accepted by the backend VenueType enum. */
export const BUSINESS_VENUE_OPTIONS = [
  { label: 'Bakery', value: 'BAKERY' },
  { label: 'Cafe / Restaurant', value: 'CAFE_RESTAURANT' },
  { label: 'Caterer', value: 'CATERER' },
  { label: 'Catering Service', value: 'CATERING_SERVICE' },
  { label: 'Cloud Kitchen', value: 'CLOUD_KITCHEN' },
  { label: 'Food Truck', value: 'FOOD_TRUCK' },
  { label: 'Grocery Store', value: 'GROCERY_STORE' },
  { label: 'Hotel', value: 'HOTEL' },
  { label: 'Wedding Venue', value: 'WEDDING_VENUE' },
  { label: 'Farm', value: 'FARM' },
  { label: 'Other', value: 'OTHER' },
] as const;

/** Farmer signup options — backend VenueType must include these values. */
export const FARMER_VENUE_OPTIONS = [
  { label: 'Farm', value: 'FARM' },
  { label: 'Produce / Market Garden', value: 'PRODUCE_MARKET_GARDEN' },
  { label: 'Livestock Farm', value: 'LIVESTOCK_FARM' },
  { label: 'Mixed Farm', value: 'MIXED_FARM' },
  { label: 'Orchard', value: 'ORCHARD' },
  { label: 'Processing / Packing Facility', value: 'PROCESSING_FACILITY' },
  { label: 'Other', value: 'OTHER' },
] as const;

export type BusinessVenueType = (typeof BUSINESS_VENUE_OPTIONS)[number]['value'];

export function getBusinessVenueLabel(value?: string | null): string {
  if (!value) return '';
  const match = BUSINESS_VENUE_OPTIONS.find((option) => option.value === value);
  if (match) return match.label;
  // Fallback for raw labels already stored as display text
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
