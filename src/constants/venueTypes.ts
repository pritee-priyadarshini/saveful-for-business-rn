/** Venue / business types from restaurant signup. */
export const BUSINESS_VENUE_OPTIONS = [
  { label: 'Bakery', value: 'BAKERY' },
  { label: 'Cafe / Restaurant', value: 'CAFE_RESTAURANT' },
  { label: 'Caterer', value: 'CATERING_SERVICE' },
  { label: 'Cloud Kitchen', value: 'CLOUD_KITCHEN' },
  { label: 'Event Venue', value: 'EVENT_VENUE' },
  { label: 'Food Truck', value: 'FOOD_TRUCK' },
  { label: 'Grocery Store', value: 'GROCERY_STORE' },
  { label: 'Hotel', value: 'HOTEL' },
  { label: 'Wedding Venue', value: 'WEDDING_VENUE' },
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
