import type { Region } from '../types';

export type RegionOption = {
  label: string;
  value: Region;
  description: string;
};

/**
 * Full backend `region` enum.
 * `US` stays valid for API/backend compatibility, but is not offered in the signup UI.
 */
export const BACKEND_REGION_VALUES: readonly Region[] = ['AU', 'IN', 'US'];

const REGION_META: Record<Region, { label: string; description: string }> = {
  AU: {
    label: 'Australia',
    description: 'Organisations operating in Australia',
  },
  IN: {
    label: 'India',
    description: 'Organisations operating in India',
  },
  US: {
    label: 'United States',
    description: 'Organisations operating in the United States',
  },
};

/** Regions shown in the frontend signup picker (alphabetical; excludes US). */
export const REGION_OPTIONS: RegionOption[] = (['AU', 'IN'] as const).map((value) => ({
  value,
  label: REGION_META[value].label,
  description: REGION_META[value].description,
}));

export function getRegionLabel(value: string): string {
  const normalized = value.trim().toUpperCase() as Region;
  return REGION_META[normalized]?.label ?? '';
}

/** True for any value accepted by the backend region enum (includes US). */
export function isValidRegion(value: string): value is Region {
  const normalized = value.trim().toUpperCase();
  return (BACKEND_REGION_VALUES as readonly string[]).includes(normalized);
}

/** True only for regions selectable in the signup UI (Australia, India). */
export function isSelectableRegion(value: string): value is Region {
  const normalized = value.trim().toUpperCase();
  return REGION_OPTIONS.some((option) => option.value === normalized);
}

/** Append backend `region` enum (IN | US | AU) to signup FormData. */
export function appendSignupRegion(form: FormData, region: string): void {
  const normalized = region.trim().toUpperCase();
  // Signup can only submit UI-selectable regions; US remains a backend enum value.
  if (!isSelectableRegion(normalized)) {
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
