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
    for (const point of response.chart ?? []) {
      const label = String(point?.label ?? '');
      if (!label) continue;
      const kg = Number(point?.kg);
      const safeKg = Number.isFinite(kg) ? Math.max(0, kg) : 0;
      if (!bucketMap.has(label)) {
        labelOrder.push(label);
      }
      bucketMap.set(label, round2((bucketMap.get(label) ?? 0) + safeKg));
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
  period: Exclude<ImpactPeriod, 'range'>,
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

export async function fetchAggregatedSiteImpactByRange(
  siteIds: number[],
  range: { startDate: string; endDate: string },
): Promise<SiteImpactResponse | null> {
  if (siteIds.length === 0) return null;

  const responses = await Promise.all(
    siteIds.map(async (siteId) => {
      const res = await impactService.getSiteImpactByRange(siteId, range);
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

  const labels = impact.chart.map((point) => String(point.label ?? ''));
  const kgValues = impact.chart.map((point) => {
    const raw = Number((point as ImpactChartPoint).kg);
    return Number.isFinite(raw) ? Math.max(0, raw) : 0;
  });
  const totalKg = Number(impact.totals?.redistributedKg) || 0;
  const totalCollections = Number(impact.totals?.collectionsCompleted) || 0;

  let values: number[];
  switch (metric) {
    case 'food':
      values = kgValues.map((kg) => round1(kg));
      break;
    case 'meals':
      // Keep fractional meals so small daily kg values are still visible on the chart.
      // (Math.round(kg / 0.42) often collapses sparse days to 0 → flat line.)
      values = kgValues.map((kg) => (kg > 0 ? round1(kg / MEAL_WEIGHT_KG) : 0));
      break;
    case 'co2':
      values = kgValues.map((kg) => round1(kg * CO2_PER_KG));
      break;
    case 'collections': {
      if (totalKg <= 0 || totalCollections <= 0) {
        values = kgValues.map(() => 0);
        break;
      }
      // Keep proportional floats so low-volume days don’t all round to 0.
      values = kgValues.map((kg) => round1((kg / totalKg) * totalCollections));
      break;
    }
    default:
      values = kgValues;
  }

  // Normalize any NaN/negative leftovers from bad payloads.
  values = values.map((value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  });

  // react-native-chart-kit needs >= 2 points; duplicate instead of padding with 0
  // (padding with 0 was forcing a flat drop to the baseline).
  if (values.length === 1) {
    return {
      labels: [labels[0], labels[0]],
      values: [values[0], values[0]],
    };
  }

  return { labels, values };
}

/** LineChart crashes the Y scale when all points are equal — add a silent 0 baseline. */
export function toLineChartDatasets(values: number[]): Array<{
  data: number[];
  withDots?: boolean;
  strokeWidth?: number;
  color?: (opacity?: number) => string;
}> {
  const data = values.length > 0 ? values : [0];
  const datasets: Array<{
    data: number[];
    withDots?: boolean;
    strokeWidth?: number;
    color?: (opacity?: number) => string;
  }> = [{ data }];

  const max = Math.max(...data);
  const min = Math.min(...data);
  if (max > 0 && max === min) {
    datasets.push({
      data: data.map(() => 0),
      withDots: false,
      strokeWidth: 0,
      color: () => 'transparent',
    });
  }

  return datasets;
}
