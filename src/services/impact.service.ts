import api from './api';

export type ImpactPeriod = 'week' | 'month' | 'year' | 'lifetime';

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

export const impactService = {
  getSiteImpact(siteId: number, period: ImpactPeriod = 'week') {
    return api.get<SiteImpactResponse>(`/impact/sites/${siteId}`, {
      params: { period },
    });
  },
};
