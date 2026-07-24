import api from './api';

export type ImpactPeriod = 'week' | 'month' | 'year' | 'lifetime' | 'range';

export type ImpactTotals = {
  redistributedKg: number;
  mealsCreated: number;
  co2AvoidedKg: number;
  totalFoodSavedUsd: number;
  collectionsCompleted: number;
  partnersSupported: number;
  forPeople: { kg: number; percent: number };
  forAnimal: { kg: number; percent: number };
  ratingAvg: number | null;
  ratingCount: number;
};

export type ImpactChartPoint = {
  label: string;
  kg: number;
};

export type SiteImpactResponse = {
  siteId: number;
  organisationId: number;
  organisationName: string;
  organizationType: string;
  mode: 'DONOR' | 'RECEIVER';
  period: ImpactPeriod;
  rangeStart: string | null;
  rangeEnd: string;
  totals: ImpactTotals;
  chart: ImpactChartPoint[];
};

export type ImpactDateRange = {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};

export type TopFoodItem = {
  rank: number;
  foodName: string;
  unit: string;
  category: string | null;
  totalKg: number;
  peopleKg?: number;
  animalKg?: number;
  peoplePercent?: number;
  animalPercent?: number;
  co2AvoidedKg: number;
  mealsCreated: number;
  totalFoodSavedUsd: number;
};

export type TopFoodsResponse = {
  siteId: number | null;
  organisationId: number | null;
  mode?: 'DONOR' | 'RECEIVER';
  rangeStart: string | null;
  rangeEnd: string;
  topFoods: TopFoodItem[];
};

export const impactService = {
  getSiteImpact(siteId: number, period: Exclude<ImpactPeriod, 'range'> = 'week') {
    return api.get<SiteImpactResponse>(`/impact/sites/${siteId}`, {
      params: { period },
    });
  },

  /** Custom range — backend: GET /impact/sites/:siteId/range */
  getSiteImpactByRange(siteId: number, range: ImpactDateRange) {
    return api.get<SiteImpactResponse>(`/impact/sites/${siteId}/range`, {
      params: {
        startDate: range.startDate,
        endDate: range.endDate,
      },
    });
  },

  /** Org-wide (All sites) — GET /impact/organisations/:orgId */
  getOrgImpact(orgId: number, period: Exclude<ImpactPeriod, 'range'> = 'week') {
    return api.get<SiteImpactResponse>(`/impact/organisations/${orgId}`, {
      params: { period },
    });
  },

  getOrgImpactByRange(orgId: number, range: ImpactDateRange) {
    return api.get<SiteImpactResponse>(`/impact/organisations/${orgId}/range`, {
      params: {
        startDate: range.startDate,
        endDate: range.endDate,
      },
    });
  },

  /** Top foods for an organisation — GET /impact/organisations/:orgId/top-foods */
  getOrgTopFoods(orgId: number, range?: Partial<ImpactDateRange>) {
    return api.get<TopFoodsResponse>(`/impact/organisations/${orgId}/top-foods`, {
      params: {
        startDate: range?.startDate,
        endDate: range?.endDate,
      },
    });
  },

  /** Top foods for a site — GET /impact/sites/:siteId/top-foods */
  getSiteTopFoods(siteId: number, range?: Partial<ImpactDateRange>) {
    return api.get<TopFoodsResponse>(`/impact/sites/${siteId}/top-foods`, {
      params: {
        startDate: range?.startDate,
        endDate: range?.endDate,
      },
    });
  },
};
