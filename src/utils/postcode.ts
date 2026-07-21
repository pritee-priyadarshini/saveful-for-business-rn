import * as Location from 'expo-location';

/** Pull a postal code out of free-text address when APIs omit it. */
export function extractPostcodeFromText(text?: string | null): string {
  if (!text?.trim()) return '';
  const cleaned = text.trim();

  const uk = cleaned.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i);
  if (uk?.[1]) return uk[1].toUpperCase().replace(/\s+/g, ' ');

  const us = cleaned.match(/\b(\d{5}(?:-\d{4})?)\b/);
  if (us?.[1]) return us[1];

  const india = cleaned.match(/\b(\d{6})\b/);
  if (india?.[1]) return india[1];

  const auOrShort = cleaned.match(/\b(\d{4})\b/);
  if (auOrShort?.[1]) return auOrShort[1];

  return '';
}

function formatGeocodedAddress(place: Location.LocationGeocodedAddress): string {
  return [place.name, place.street, place.city, place.region, place.postalCode]
    .filter(Boolean)
    .join(', ');
}

export type ResolvedLocationDetails = {
  address: string;
  postcode: string;
};

/**
 * Resolve address + postcode for a map pin.
 * Prefer an explicit postcode, then reverse-geocode, then parse the address text.
 */
export async function resolveLocationDetails(
  latitude: number,
  longitude: number,
  hints?: { address?: string; postcode?: string },
): Promise<ResolvedLocationDetails> {
  let postcode = String(hints?.postcode || '').trim();
  let address = String(hints?.address || '').trim();

  try {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (places.length > 0) {
      const place = places[0];
      if (!postcode) {
        postcode = String(place.postalCode || '').trim();
      }
      if (!address) {
        address = formatGeocodedAddress(place);
      }
    }
  } catch {
    // fall through
  }

  if (!address) {
    address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }

  if (!postcode) {
    postcode = extractPostcodeFromText(address) || extractPostcodeFromText(hints?.address);
  }

  return { address, postcode };
}
