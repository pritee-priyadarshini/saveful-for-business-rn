import { isAxiosError } from 'axios';

import {
  impactService,
  type ImpactDateRange,
  type ImpactRecipient,
  type RecipientFoodItem,
} from '@/services/impact.service';
import type { ImpactFilter } from '@/store/impactStore';
import { CO2_PER_KG, MEAL_WEIGHT_KG } from '@/utils/impactData';

/** Org types that receive food on behalf of people rather than animals. */
const CHARITY_TYPES = ['CHARITY', 'CHARITY_SINGLE', 'CHARITY_MULTI'];
const ANIMAL_TYPES = ['FARMER_CONSUMER'];

export type RecipientFoodRow = {
  name: string;
  category: string | null;
  totalKg: number;
};

export type RecipientRow = {
  key: string;
  rank: number;
  organisationId: number | null;
  name: string;
  kind: 'people' | 'animals' | 'unknown';
  logoUrl: string | null;
  collections: number;
  totalKg: number;
  peopleKg: number;
  animalKg: number;
  sharePercent: number;
  mealsCreated: number;
  co2AvoidedKg: number;
  savedUsd: number;
  firstCollectionAt: string | null;
  lastCollectionAt: string | null;
  foods: RecipientFoodRow[];
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Omitting dates makes the API fall back to lifetime figures. */
export function rangeParamsFromFilter(
  filter: ImpactFilter,
): Partial<ImpactDateRange> | undefined {
  if (filter.mode === 'custom' && filter.startDate && filter.endDate) {
    return { startDate: filter.startDate, endDate: filter.endDate };
  }
  return undefined;
}

export function unwrapRecipients(payload: unknown): ImpactRecipient[] {
  const root = (payload as { data?: unknown })?.data ?? payload;
  const list =
    (root as { recipients?: unknown })?.recipients ??
    (root as { data?: { recipients?: unknown } })?.data?.recipients ??
    (root as { partners?: unknown })?.partners;
  return Array.isArray(list) ? (list as ImpactRecipient[]) : [];
}

function recipientKind(recipient: ImpactRecipient): RecipientRow['kind'] {
  const type = String(recipient.organizationType ?? '').toUpperCase();
  if (CHARITY_TYPES.includes(type)) return 'people';
  if (ANIMAL_TYPES.includes(type)) return 'animals';
  return 'unknown';
}

function toFoodRows(foods: RecipientFoodItem[] | undefined): RecipientFoodRow[] {
  if (!Array.isArray(foods)) return [];
  return foods
    .map((food) => ({
      name: food.foodName?.trim() || food.category?.trim() || 'Food',
      category: food.category?.trim() || null,
      totalKg: round2(num(food.totalKg)),
    }))
    .filter((food) => food.totalKg > 0)
    .sort((a, b) => b.totalKg - a.totalKg);
}

/**
 * Normalises the API payload into rows the UI and the exported report can share,
 * deriving anything an older backend may omit so both surfaces always agree.
 */
export function toRecipientRows(recipients: ImpactRecipient[]): RecipientRow[] {
  const grandTotal = recipients.reduce((sum, r) => sum + num(r.totalKg), 0);

  return recipients
    .map((recipient, index) => {
      const totalKg = round2(num(recipient.totalKg));
      const kind = recipientKind(recipient);

      let peopleKg = round2(num(recipient.peopleKg));
      let animalKg = round2(num(recipient.animalKg));
      if (peopleKg + animalKg <= 0 && totalKg > 0) {
        if (kind === 'animals') {
          animalKg = totalKg;
        } else {
          peopleKg = totalKg;
        }
      }

      return {
        key: `${recipient.organisationId ?? index}:${recipient.name ?? ''}`,
        rank: recipient.rank || index + 1,
        organisationId: recipient.organisationId ?? null,
        name: recipient.name?.trim() || 'Partner organisation',
        kind,
        logoUrl: recipient.logoUrl ?? null,
        collections: Math.max(0, Math.round(num(recipient.collections))),
        totalKg,
        peopleKg,
        animalKg,
        sharePercent:
          recipient.sharePercent != null
            ? round1(num(recipient.sharePercent))
            : grandTotal > 0
              ? round1((totalKg / grandTotal) * 100)
              : 0,
        mealsCreated:
          recipient.mealsCreated != null
            ? Math.round(num(recipient.mealsCreated))
            : Math.round(peopleKg / MEAL_WEIGHT_KG),
        co2AvoidedKg:
          recipient.co2AvoidedKg != null
            ? round2(num(recipient.co2AvoidedKg))
            : round2(totalKg * CO2_PER_KG),
        savedUsd: round2(num(recipient.totalFoodSavedUsd)),
        firstCollectionAt: recipient.firstCollectionAt ?? null,
        lastCollectionAt: recipient.lastCollectionAt ?? null,
        foods: toFoodRows(recipient.foods),
      };
    })
    .sort((a, b) => b.totalKg - a.totalKg)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function fetchRecipientRows(params: {
  filter: ImpactFilter;
  siteId?: number | null;
  orgId?: number | null;
}): Promise<RecipientRow[]> {
  const { filter, siteId = null, orgId = null } = params;
  if (siteId == null && orgId == null) return [];

  const range = rangeParamsFromFilter(filter);
  const res =
    siteId != null
      ? await impactService.getSiteRecipients(siteId, range)
      : await impactService.getOrgRecipients(Number(orgId), range);

  return toRecipientRows(unwrapRecipients(res.data ?? res));
}

/**
 * True when the backend build in front of us predates the recipients endpoints.
 * Treated as "no data yet" rather than an error so the section degrades quietly.
 */
export function isRecipientsUnsupported(error: unknown): boolean {
  return isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 501);
}

export function formatCollectionDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
