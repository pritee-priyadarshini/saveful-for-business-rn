import type { Region } from '../types';

export type RegionOption = {
  label: string;
  value: Region;
  description: string;
};

export const REGION_OPTIONS: RegionOption[] = [
  {
    label: 'India',
    value: 'IN',
    description: 'Organisations operating in India',
  },
  {
    label: 'United States',
    value: 'US',
    description: 'Organisations operating in the United States',
  },
  {
    label: 'Australia',
    value: 'AU',
    description: 'Organisations operating in Australia',
  },
];

export function getRegionLabel(value: string): string {
  return REGION_OPTIONS.find((option) => option.value === value)?.label ?? '';
}

export function isValidRegion(value: string): value is Region {
  const normalized = value.trim().toUpperCase();
  return REGION_OPTIONS.some((option) => option.value === normalized);
}

/** Append backend `region` enum (IN | US | AU) to signup FormData. */
export function appendSignupRegion(form: FormData, region: string): void {
  const normalized = region.trim().toUpperCase();
  if (!isValidRegion(normalized)) {
    throw new Error('Invalid operating region selected.');
  }
  form.append('region', normalized);
}

/** Append validated latitude/longitude for NestJS `@Type(() => Number)` parsing. */
export function appendSignupCoordinates(
  form: FormData,
  latitude: string,
  longitude: string,
): void {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('Please set a valid location before signing up.');
  }
  form.append('latitude', String(lat));
  form.append('longitude', String(lng));
}

/** Region + coordinates — required on all signup flows. */
export function appendSignupRegionAndCoordinates(
  form: FormData,
  region: string,
  latitude: string,
  longitude: string,
): void {
  appendSignupRegion(form, region);
  appendSignupCoordinates(form, latitude, longitude);
}
