import {
  ImpactChartPoint,
  ImpactPeriod,
  ImpactTotals,
  SiteImpactResponse,
  impactService,
} from '../services/impact.service';

/** Mirrors backend impact.constants */
export const MEAL_WEIGHT_KG = 0.42;
export const CO2_PER_KG = 2.1;

export type ImpactDisplayStats = {
  redistributedKg: number;
  mealsCreated: number;
  co2AvoidedKg: number;
  foodSavedMoney: number;
  collectionsCompleted: number;
  partnersSupported: number;
  peopleKg: number;
  animalKg: number;
  peoplePercent: number;
  animalPercent: number;
  rating: number | null;
  ratingCount: number;
  mode: 'DONOR' | 'RECEIVER';
};

export const EMPTY_IMPACT_STATS: ImpactDisplayStats = {
  redistributedKg: 0,
  mealsCreated: 0,
  co2AvoidedKg: 0,
  foodSavedMoney: 0,
  collectionsCompleted: 0,
  partnersSupported: 0,
  peopleKg: 0,
  animalKg: 0,
  peoplePercent: 0,
  animalPercent: 0,
  rating: null,
  ratingCount: 0,
  mode: 'DONOR',
};

export type ChartMetricKey = 'food' | 'meals' | 'co2' | 'collections';

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function mergeTotals(acc: ImpactTotals, next: ImpactTotals): ImpactTotals {
  const redistributedKg = round2(acc.redistributedKg + next.redistributedKg);
  const forPeopleKg = round2(acc.forPeople.kg + next.forPeople.kg);
  const forAnimalKg = round2(acc.forAnimal.kg + next.forAnimal.kg);
  const ratingCount = acc.ratingCount + next.ratingCount;
  const ratingSum =
    (acc.ratingAvg ?? 0) * acc.ratingCount + (next.ratingAvg ?? 0) * next.ratingCount;

  return {
    redistributedKg,
    mealsCreated: Math.round(acc.mealsCreated + next.mealsCreated),
    co2AvoidedKg: round2(acc.co2AvoidedKg + next.co2AvoidedKg),
    totalFoodSavedUsd: round2(acc.totalFoodSavedUsd + next.totalFoodSavedUsd),
    collectionsCompleted: acc.collectionsCompleted + next.collectionsCompleted,
    partnersSupported: acc.partnersSupported + next.partnersSupported,
    forPeople: {
      kg: forPeopleKg,
      percent: redistributedKg > 0 ? round1((forPeopleKg / redistributedKg) * 100) : 0,
    },
    forAnimal: {
      kg: forAnimalKg,
      percent: redistributedKg > 0 ? round1((forAnimalKg / redistributedKg) * 100) : 0,
    },
    ratingAvg: ratingCount > 0 ? round1(ratingSum / ratingCount) : null,
    ratingCount,
  };
}

function emptyTotals(): ImpactTotals {
  return {
    redistributedKg: 0,
    mealsCreated: 0,
    co2AvoidedKg: 0,
    totalFoodSavedUsd: 0,
    collectionsCompleted: 0,
    partnersSupported: 0,
    forPeople: { kg: 0, percent: 0 },
    forAnimal: { kg: 0, percent: 0 },
    ratingAvg: null,
    ratingCount: 0,
  };
}

function mergeCharts(responses: SiteImpactResponse[]): ImpactChartPoint[] {
  const bucketMap = new Map<string, number>();
  const labelOrder: string[] = [];

  for (const response of responses) {
    for (const point of response.chart) {
      if (!bucketMap.has(point.label)) {
        labelOrder.push(point.label);
      }
      bucketMap.set(point.label, round2((bucketMap.get(point.label) ?? 0) + point.kg));
    }
  }

  return labelOrder.map((label) => ({
    label,
    kg: bucketMap.get(label) ?? 0,
  }));
}

export function aggregateSiteImpacts(
  responses: SiteImpactResponse[],
): SiteImpactResponse | null {
  if (responses.length === 0) return null;
  if (responses.length === 1) return responses[0];

  const first = responses[0];
  const totals = responses.reduce(
    (acc, response) => mergeTotals(acc, response.totals),
    emptyTotals(),
  );

  return {
    ...first,
    siteId: 0,
    totals,
    chart: mergeCharts(responses),
  };
}

export async function fetchAggregatedSiteImpact(
  siteIds: number[],
  period: ImpactPeriod,
): Promise<SiteImpactResponse | null> {
  if (siteIds.length === 0) return null;

  const responses = await Promise.all(
    siteIds.map(async (siteId) => {
      const res = await impactService.getSiteImpact(siteId, period);
      return res.data;
    }),
  );

  return aggregateSiteImpacts(responses);
}

export function mapImpactToDisplayStats(
  impact: SiteImpactResponse | null,
): ImpactDisplayStats {
  if (!impact) return EMPTY_IMPACT_STATS;

  const { totals, mode } = impact;
  return {
    redistributedKg: totals.redistributedKg,
    mealsCreated: totals.mealsCreated,
    co2AvoidedKg: totals.co2AvoidedKg,
    foodSavedMoney: totals.totalFoodSavedUsd,
    collectionsCompleted: totals.collectionsCompleted,
    partnersSupported: totals.partnersSupported,
    peopleKg: totals.forPeople.kg,
    animalKg: totals.forAnimal.kg,
    peoplePercent: totals.forPeople.percent,
    animalPercent: totals.forAnimal.percent,
    rating: totals.ratingAvg,
    ratingCount: totals.ratingCount,
    mode,
  };
}

export function buildChartSeries(
  impact: SiteImpactResponse | null,
  metric: ChartMetricKey,
): { labels: string[]; values: number[] } {
  if (!impact?.chart?.length) {
    return { labels: ['—'], values: [0] };
  }

  const labels = impact.chart.map((point) => point.label);
  const kgValues = impact.chart.map((point) => point.kg);
  const totalKg = impact.totals.redistributedKg || 0;
  const totalCollections = impact.totals.collectionsCompleted || 0;

  let values: number[];
  switch (metric) {
    case 'food':
      values = kgValues;
      break;
    case 'meals':
      values = kgValues.map((kg) => Math.round(kg / MEAL_WEIGHT_KG));
      break;
    case 'co2':
      values = kgValues.map((kg) => round1(kg * CO2_PER_KG));
      break;
    case 'collections':
      values =
        totalKg > 0
          ? kgValues.map((kg) => Math.round((kg / totalKg) * totalCollections))
          : kgValues.map(() => 0);
      break;
    default:
      values = kgValues;
  }

  if (values.length === 1) {
    return { labels: [...labels, ''], values: [...values, 0] };
  }

  return {
    labels,
    values: values.map((value) => Math.max(0, value)),
  };
}
