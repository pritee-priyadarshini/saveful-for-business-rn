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
