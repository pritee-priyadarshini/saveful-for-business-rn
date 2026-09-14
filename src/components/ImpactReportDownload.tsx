import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { elevation } from '@/theme/elevation';
import { hp, normalize, wp } from '@/utils/responsive';
import { showErrorAlert, showInfoAlert } from '@/utils/apiError';
import { foodSavedUsdFromKg, type ImpactDisplayStats } from '@/utils/impactData';
import type { ImpactFilter } from '@/store/impactStore';
import {
  impactService,
  type TopFoodItem,
} from '@/services/impact.service';
import {
  fetchRecipientRows,
  formatCollectionDate,
  rangeParamsFromFilter,
  type RecipientRow,
} from '@/utils/donationRecipients';
import { useAuthStore } from '@/store/authStore';

type Props = {
  stats: ImpactDisplayStats;
  filter: ImpactFilter;
  filterLabel: string;
  siteId?: number | null;
  siteLabel?: string | null;
  organisationName?: string | null;
};

type ReportFormat = 'pdf' | 'excel';

type ReportData = {
  foods: FoodReportRow[];
  recipients: RecipientRow[];
};

type FoodReportRow = {
  rank: number;
  name: string;
  category: string;
  totalKg: number;
  peopleKg: number;
  animalKg: number;
  mealsCreated: number;
  co2AvoidedKg: number;
  savedUsd: number;
};

function formatNumber(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatMoney(value: number) {
  return `$${value.toLocaleString('en-AU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatKg(value: number) {
  return `${formatNumber(value)} kg`;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

type CategoryInsight = {
  name: string;
  collectedKg: number;
  percent: number;
  value: number;
};

function aggregateFoodsByCategory(foods: FoodReportRow[]): CategoryInsight[] {
  const map = new Map<string, { collectedKg: number; value: number }>();
  for (const food of foods) {
    const name = food.category && food.category !== '—' ? food.category : food.name;
    const prev = map.get(name) ?? { collectedKg: 0, value: 0 };
    map.set(name, {
      collectedKg: round2(prev.collectedKg + food.totalKg),
      value: round2(prev.value + food.savedUsd),
    });
  }
  const total = [...map.values()].reduce((sum, row) => sum + row.collectedKg, 0);
  return [...map.entries()]
    .map(([name, row]) => ({
      name,
      collectedKg: row.collectedKg,
      value: row.value,
      percent: total > 0 ? round2((row.collectedKg / total) * 100) : 0,
    }))
    .sort((a, b) => b.collectedKg - a.collectedKg);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugDate() {
  return new Date().toISOString().slice(0, 10);
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function waitForInteractions() {
  return new Promise<void>((resolve) => {
    InteractionManager.runAfterInteractions(() => resolve());
  });
}

function foodLabel(food: TopFoodItem) {
  return food.foodName?.trim() || food.category?.trim() || 'Food';
}

function unwrapTopFoods(payload: unknown): TopFoodItem[] {
  const root = (payload as { data?: unknown })?.data ?? payload;
  const list =
    (root as { topFoods?: unknown })?.topFoods ??
    (root as { data?: { topFoods?: unknown } })?.data?.topFoods ??
    (root as { foods?: unknown })?.foods;
  return Array.isArray(list) ? (list as TopFoodItem[]) : [];
}

function resolveFoodSplit(
  food: TopFoodItem,
  fallbackPeoplePercent: number,
  fallbackAnimalPercent: number,
) {
  const total = Number(food.totalKg) || 0;
  if (total <= 0) {
    return { peopleKg: 0, animalKg: 0 };
  }

  const hasPerFoodSplit =
    food.peopleKg != null ||
    food.animalKg != null ||
    food.peoplePercent != null ||
    food.animalPercent != null;

  if (hasPerFoodSplit) {
    let peopleKg =
      food.peopleKg != null
        ? Number(food.peopleKg)
        : round2((total * Number(food.peoplePercent ?? 0)) / 100);
    let animalKg =
      food.animalKg != null
        ? Number(food.animalKg)
        : round2((total * Number(food.animalPercent ?? 0)) / 100);

    if (peopleKg + animalKg <= 0) {
      peopleKg = total;
      animalKg = 0;
    }

    return { peopleKg: round2(peopleKg), animalKg: round2(animalKg) };
  }

  const peoplePct = Math.max(0, Math.min(100, fallbackPeoplePercent));
  const animalPct = Math.max(0, Math.min(100, fallbackAnimalPercent));
  const pctSum = peoplePct + animalPct;
  const safePeople = pctSum > 0 ? peoplePct : 100;
  const safeAnimal = pctSum > 0 ? animalPct : 0;

  return {
    peopleKg: round2((total * safePeople) / 100),
    animalKg: round2((total * safeAnimal) / 100),
  };
}

function toFoodReportRows(
  foods: TopFoodItem[],
  stats: ImpactDisplayStats,
): FoodReportRow[] {
  return foods.map((food, index) => {
    const totalKg = round2(Number(food.totalKg) || 0);
    const split = resolveFoodSplit(food, stats.peoplePercent, stats.animalPercent);
    return {
      rank: food.rank || index + 1,
      name: foodLabel(food),
      category: food.category?.trim() || '—',
      totalKg,
      peopleKg: split.peopleKg,
      animalKg: split.animalKg,
      mealsCreated: round2(Number(food.mealsCreated) || 0),
      co2AvoidedKg: round2(
        food.co2AvoidedKg != null ? Number(food.co2AvoidedKg) : totalKg * 2.1,
      ),
      savedUsd: foodSavedUsdFromKg(totalKg),
    };
  });
}

function formatGeneratedAt(date = new Date()) {
  const day = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const time = date
    .toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s/g, '')
    .toLowerCase();
  return `${day} at ${time}`;
}

function buildReportMeta(props: Props) {
  const generatedAt = formatGeneratedAt();
  return {
    title: 'Food Surplus Impact & Insights Report',
    organisation: props.organisationName?.trim() || 'Organisation',
    site: props.siteLabel?.trim() || null,
    period: props.filterLabel,
    generatedAt,
    fileBase: `Saveful_Impact_Report_${slugDate()}`,
  };
}

function metricRows(stats: ImpactDisplayStats) {
  return [
    { label: 'Food redistributed', value: `${formatNumber(stats.redistributedKg)} kg` },
    { label: 'Meals created', value: formatNumber(stats.mealsCreated) },
    { label: 'CO₂ emissions avoided', value: `${formatNumber(stats.co2AvoidedKg)} kg` },
    { label: 'Food saved value', value: `$${formatNumber(stats.foodSavedMoney)}` },
    { label: 'Collections completed', value: formatNumber(stats.collectionsCompleted) },
    { label: 'Partners supported', value: formatNumber(stats.partnersSupported) },
    {
      label: 'Food for people',
      value: `${formatNumber(stats.peopleKg)} kg (${formatNumber(stats.peoplePercent)}%)`,
    },
    {
      label: 'Food for animals',
      value: `${formatNumber(stats.animalKg)} kg (${formatNumber(stats.animalPercent)}%)`,
    },
  ];
}

async function fetchFoodSavings(
  props: Props,
  orgId: number | null,
): Promise<FoodReportRow[]> {
  if (props.siteId == null && orgId == null) return [];

  const rangeParams = rangeParamsFromFilter(props.filter);

  const res =
    props.siteId != null
      ? await impactService.getSiteTopFoods(props.siteId, rangeParams)
      : await impactService.getOrgTopFoods(Number(orgId), rangeParams);

  const foods = unwrapTopFoods(res.data ?? res);
  return toFoodReportRows(foods, props.stats);
}

function partnerHeading(props: Props) {
  return props.stats.mode === 'RECEIVER' ? 'Collected from' : 'Recipient Organisations';
}

function isFarmerImpactReport() {
  const role = useAuthStore.getState().selectedRole;
  return role === 'farmer' || role === 'farm_business';
}

function isCharityImpactReport() {
  const role = useAuthStore.getState().selectedRole;
  return role === 'charity_single' || role === 'charity_multi';
}

function reportCopy(mode: ImpactDisplayStats['mode']) {
  const isReceiver = mode === 'RECEIVER';
  return {
    lede: isReceiver
      ? 'A clear snapshot of the food you collected, the impact created and where it came from.'
      : 'A clear snapshot of your surplus food, the impact created and where your food went.',
    impactTitle: 'Your Impact',
    impactLede: isReceiver
      ? 'The impact created from the food you collected during this period.'
      : 'The impact created from your surplus food during this period.',
    redistributedLabel: isReceiver ? 'Food received' : 'Food redistributed',
    valueLabel: isReceiver
      ? 'Estimated food value received'
      : 'Estimated food value redistributed',
    partnersLabel: isReceiver
      ? 'Organisations collected from'
      : 'Community partners supported',
    destinationTitle: isReceiver ? 'Where food came from' : 'Where your food went',
    insightsTitle: isReceiver ? 'Your Collection Insights' : 'Your Surplus Insights',
    insightsLede: isReceiver
      ? 'See how much food you collected and which food categories contributed most.'
      : 'See how much surplus food you listed, how much was collected and which food categories contributed most.',
    destinationsTitle: isReceiver ? 'Where Your Food Came From' : 'Where Your Food Went',
    destinationsLede: isReceiver
      ? 'See the organisations you collected from and what you received.'
      : 'See the organisations your surplus food supported and what they received.',
    partnerKgLabel: isReceiver ? 'Food collected' : 'Food received',
    partnerFoodsLabel: isReceiver ? 'Food collected' : 'Food received',
  };
}

type IconKind =
  | 'weight'
  | 'meals'
  | 'co2'
  | 'value'
  | 'truck'
  | 'people'
  | 'person'
  | 'paw'
  | 'leaf'
  | 'clip'
  | 'gauge'
  | 'heart'
  | 'star'
  | 'bulb'
  | 'bag';

type IconTint = 'green' | 'peach' | 'cream' | 'lilac';

function iconDisc(kind: IconKind, tint: IconTint = 'green') {
  const paths: Record<IconKind, string> = {
    weight:
      '<path d="M7 10h10M8 10l2-5h4l2 5M6 10h12v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-7z"/>',
    meals:
      '<path d="M6 5v10M6 8h2.2c.8 0 1.3-.6 1.3-1.3S9 5.4 8.2 5.4H6M14.5 5v5.5c0 1.4.8 2 2 2V5M17.2 5v13"/>',
    co2:
      '<path d="M8 15.5a3.2 3.2 0 1 1 1.2-6.2 3.8 3.8 0 0 1 7.3 1.1 2.6 2.6 0 1 1-.3 5.1H8z"/>',
    value:
      '<path d="M12 6v12M9.2 8.6c.6-.8 1.6-1.3 2.8-1.3 1.7 0 3 1 3 2.4 0 3.3-6 1.5-6 4.4 0 1.4 1.3 2.4 3 2.4 1.2 0 2.2-.5 2.8-1.3"/>',
    truck:
      '<path d="M4 8h9v7H4zM13 11h3.2L18 13.4V15h-5M6.4 16.6a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6zm8.7 0a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6z"/>',
    people:
      '<path d="M9 10a2 2 0 1 0-4 0 2 2 0 0 0 4 0zm10 0a2 2 0 1 0-4 0 2 2 0 0 0 4 0zM3.5 17c0-2 1.6-3.2 3.5-3.2S10.5 15 10.5 17M13.5 17c0-2 1.6-3.2 3.5-3.2s3.5 1.2 3.5 3.2"/>',
    person:
      '<path d="M12 11a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8zM7.2 18c.4-2.3 2.3-3.6 4.8-3.6s4.4 1.3 4.8 3.6"/>',
    paw:
      '<path d="M8 9.2a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6zm8 0a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6zM6.8 13a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4zm10.4 0a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4zM12 17.6c-2.2 0-3.6-1.5-3.6-3.1 0-1.2 1.3-2 3.6-2s3.6.8 3.6 2c0 1.6-1.4 3.1-3.6 3.1z"/>',
    leaf:
      '<path d="M6 16.5c6-1 10.2-5.4 11.2-11.2C11.4 6.3 7 10.5 6 16.5zm0 0c2.4-2.4 5.4-3.6 8.8-4"/>',
    clip:
      '<path d="M8 7.2h8v11.2H8zM10 5.6h4v2.2h-4zM10 11h4M10 13.6h4"/>',
    gauge:
      '<path d="M6.2 16.2a7 7 0 1 1 11.6 0M12 13.2l3.2-3.2M12 16.4a1.2 1.2 0 1 0 0-2.4 1.2 1.2 0 0 0 0 2.4z"/>',
    heart:
      '<path d="M12 17.4s-6-3.7-6-7.2A3.1 3.1 0 0 1 12 8.4a3.1 3.1 0 0 1 6 1.8c0 3.5-6 7.2-6 7.2z"/>',
    star:
      '<path d="M12 5.4l1.6 3.6 4 .4-3 2.7.9 3.9L12 13.8 8.5 16l.9-3.9-3-2.7 4-.4z"/>',
    bulb:
      '<path d="M12 5.4a4.2 4.2 0 0 0-2.4 7.6V15h4.8v-2A4.2 4.2 0 0 0 12 5.4zM10.4 16.4h3.2M10.8 18h2.4"/>',
    bag:
      '<path d="M8 9h8l.8 9.2H7.2L8 9zm2 0V7.8A2 2 0 0 1 12 5.8a2 2 0 0 1 2 2V9"/>',
  };
  return `<span class="icon-disc tint-${tint}"><svg viewBox="0 0 24 24" fill="none" stroke="#2F6B47" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths[kind]}</svg></span>`;
}

function metricTile(icon: IconKind, tint: IconTint, value: string, label: string) {
  return `
    <td class="metric-cell">
      <div class="tile">
        ${iconDisc(icon, tint)}
        <div class="metric-value">${escapeHtml(value)}</div>
        <div class="metric-label">${escapeHtml(label)}</div>
      </div>
    </td>`;
}

function destinationTile(icon: IconKind, value: string, label: string) {
  return `
    <td class="dest-cell">
      ${iconDisc(icon)}
      <div class="dest-text">
        <div class="dest-value">${escapeHtml(value)}</div>
        <div class="dest-label">${escapeHtml(label)}</div>
      </div>
    </td>`;
}

function buildImpactSectionHtml(props: Props) {
  const copy = reportCopy(props.stats.mode);
  const { stats } = props;
  return `
    <section class="panel">
      <div class="panel-head">
        <div class="panel-num-col"><span class="panel-num">1</span></div>
        <div>
          <h2>${escapeHtml(copy.impactTitle)}</h2>
          <p class="panel-note">${escapeHtml(copy.impactLede)}</p>
        </div>
      </div>
      <table class="metrics">
        <tr>
          ${metricTile('leaf', 'green', formatKg(stats.redistributedKg), copy.redistributedLabel)}
          ${metricTile('meals', 'peach', formatNumber(stats.mealsCreated), 'Meals created')}
          ${metricTile('co2', 'green', formatKg(stats.co2AvoidedKg), 'CO₂e avoided')}
          ${metricTile('value', 'cream', formatMoney(stats.foodSavedMoney), copy.valueLabel)}
          ${metricTile('truck', 'lilac', formatNumber(stats.collectionsCompleted), 'Collections completed')}
          ${metricTile('people', 'green', formatNumber(stats.partnersSupported), copy.partnersLabel)}
        </tr>
      </table>
      <div class="inset">
        <div class="inset-title">${escapeHtml(copy.destinationTitle)}</div>
        <table class="destinations">
          <tr>
            ${destinationTile(
              'person',
              `${formatKg(stats.peopleKg)} · ${formatNumber(stats.peoplePercent)}%`,
              'People',
            )}
            ${destinationTile(
              'paw',
              `${formatKg(stats.animalKg)} · ${formatNumber(stats.animalPercent)}%`,
              'Animals',
            )}
            <td class="dest-cell dest-divider">
              ${iconDisc('leaf')}
              <div class="dest-text">
                <div class="dest-tagline">Good food</div>
                <div class="dest-label">Stronger communities<br/>A healthier planet</div>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </section>`;
}

function buildInsightsSectionHtml(props: Props, foods: FoodReportRow[]) {
  const copy = reportCopy(props.stats.mode);
  const categories = aggregateFoodsByCategory(foods);
  const collectedKg = props.stats.redistributedKg;
  const top = categories[0];
  const insight = top
    ? `${top.name} ${/s$/i.test(top.name) ? 'were' : 'was'} your largest source of surplus this period, accounting for ${formatNumber(top.percent)}% of food collected.`
    : 'No food-category breakdown is available for this period.';

  const rows = categories.length
    ? categories
        .slice(0, 4)
        .map(
          (row) => `
        <tr>
          <td>${escapeHtml(row.name)}</td>
          <td class="num">—</td>
          <td class="num">${escapeHtml(formatKg(row.collectedKg))}</td>
          <td class="num">${escapeHtml(formatNumber(row.percent))}%</td>
          <td class="num">${escapeHtml(formatMoney(row.value))}</td>
        </tr>`,
        )
        .join('')
    : `<tr><td colspan="5" class="empty-cell">No food collected in this reporting period.</td></tr>`;

  return `
    <section class="panel">
      <div class="panel-head">
        <div class="panel-num-col"><span class="panel-num">2</span></div>
        <div>
          <h2>${escapeHtml(copy.insightsTitle)}</h2>
          <p class="panel-note">${escapeHtml(copy.insightsLede)}</p>
        </div>
      </div>
      <table class="metrics insights-metrics">
        <tr>
          ${metricTile('clip', 'green', '—', 'Food listed')}
          ${metricTile('truck', 'lilac', formatKg(collectedKg), 'Food collected')}
          ${metricTile('gauge', 'cream', '—', 'Collection rate')}
        </tr>
      </table>
      <div class="table-title">Your surplus by category</div>
      <table class="insights-split">
        <tr>
          <td class="insights-table-wrap">
            <table class="category-table">
              <thead>
                <tr>
                  <th>Food category</th>
                  <th class="num">Listed</th>
                  <th class="num">Collected</th>
                  <th class="num">% of surplus</th>
                  <th class="num">Est. value</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </td>
          <td class="insight-card">
            ${iconDisc('bulb')}
            <div class="insight-kicker">Key insight</div>
            <p>${escapeHtml(insight)}</p>
          </td>
        </tr>
      </table>
    </section>`;
}

function partnerKindLine(kind: RecipientRow['kind']) {
  if (kind === 'animals') return 'Good food. Stronger animals.';
  if (kind === 'people') return 'Good food. Stronger people.';
  return 'Good food. Stronger communities.';
}

function buildDestinationsSectionHtml(props: Props, recipients: RecipientRow[]) {
  const copy = reportCopy(props.stats.mode);
  const head = `
      <div class="panel-head">
        <div class="panel-num-col"><span class="panel-num">3</span></div>
        <div>
          <h2>${escapeHtml(copy.destinationsTitle)}</h2>
          <p class="panel-note">${escapeHtml(copy.destinationsLede)}</p>
        </div>
      </div>`;

  if (!recipients.length) {
    return `
      <section class="panel">
        ${head}
        <div class="tile empty-tile"><span>No partner organisations in this reporting period.</span></div>
      </section>`;
  }

  const ratingText =
    props.stats.rating != null
      ? `${formatNumber(props.stats.rating)} / 5 · ${formatNumber(props.stats.ratingCount)} ${
          props.stats.ratingCount === 1 ? 'review' : 'reviews'
        }`
      : null;

  const cards = recipients
    .slice(0, 2)
    .map((recipient, index) => {
      const last = formatCollectionDate(recipient.lastCollectionAt);
      const foods = recipient.foods.length
        ? [...new Set(recipient.foods.map((food) => food.category?.trim() || food.name))]
            .filter(Boolean)
            .slice(0, 5)
            .join(' · ')
        : '—';
      const showRating = ratingText && index === 0;

      return `
        <div class="tile partner-tile">
          <table class="partner-grid">
            <tr>
              <td class="partner-col">
                ${iconDisc('heart', 'peach')}
                <div class="partner-value">${escapeHtml(recipient.name)}</div>
                <div class="partner-label">${escapeHtml(partnerKindLine(recipient.kind))}</div>
              </td>
              <td class="partner-col">
                ${iconDisc('bag')}
                <div class="partner-value">${escapeHtml(formatKg(recipient.totalKg))}</div>
                <div class="partner-label">${escapeHtml(copy.partnerKgLabel)}</div>
              </td>
              <td class="partner-col">
                ${iconDisc('truck', 'lilac')}
                <div class="partner-value">${escapeHtml(formatNumber(recipient.collections))}</div>
                <div class="partner-label">Collections</div>
              </td>
              <td class="partner-col">
                ${iconDisc('people')}
                <div class="partner-value">${escapeHtml(formatNumber(recipient.mealsCreated))}</div>
                <div class="partner-label">Meals created</div>
              </td>
            </tr>
          </table>
          <table class="partner-meta">
            <tr>
              <td>
                <div class="meta-kicker">Last collection</div>
                <div class="meta-value">${escapeHtml(last || '—')}</div>
              </td>
              <td>
                ${
                  showRating
                    ? `<div class="meta-kicker">Partner rating</div>
                       <div class="meta-value">${escapeHtml(ratingText)}</div>`
                    : ''
                }
              </td>
              <td>
                <div class="meta-kicker">${escapeHtml(copy.partnerFoodsLabel)}</div>
                <div class="meta-value">${escapeHtml(foods)}</div>
              </td>
            </tr>
          </table>
        </div>`;
    })
    .join('');

  return `
    <section class="panel">
      ${head}
      ${cards}
    </section>`;
}

/**
 * Layout is authored in mm/pt so the sheet is true A4. iOS lays the page out in
 * points (595 wide), so the mm-based page is zoomed to fit; Android prints at
 * 96dpi where the mm sizes already match A4.
 */
function buildPdfHtml(props: Props, data: ReportData, logoDataUri: string | null) {
  const meta = buildReportMeta(props);
  const copy = reportCopy(props.stats.mode);
  const zoom = Platform.OS === 'ios' ? 0.75 : 1;
  const brandLogo = logoDataUri
    ? `<img class="brand-logo" src="${logoDataUri}" alt="Saveful for Business" />`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html {
      background: #F4F6F2;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      margin: 0;
      padding: 0;
      zoom: ${zoom};
      background: #F4F6F2;
      color: #16211A;
      font-family: Helvetica, Arial, sans-serif;
    }
    .page {
      width: 210mm;
      height: 297mm;
      overflow: hidden;
      padding: 9mm 11mm 8mm;
      background: #F4F6F2;
    }
    .page-frame {
      width: 100%;
      height: 100%;
    }
    .page-frame > tbody > tr.page-main > td { height: 100%; vertical-align: top; padding: 0; }
    .page-frame > tbody > tr.page-foot > td { height: 1px; vertical-align: bottom; padding: 4mm 0 0; }
    table { border-collapse: collapse; border: 0; width: 100%; }
    td, th { border: 0; background: transparent; }

    .header { margin-bottom: 4mm; }
    .header td { vertical-align: top; padding: 0; }
    .brand-logo { height: 11mm; width: auto; max-width: 48mm; display: block; }
    .meta-block { width: 46%; }
    .meta-table { width: auto; margin-left: auto; }
    .meta-table td {
      padding: 0 0 0.6mm 0;
      font-size: 7pt;
      line-height: 1.3;
      vertical-align: top;
    }
    .meta-table .meta-label {
      padding-right: 3.5mm;
      text-align: right;
      font-size: 5.5pt;
      letter-spacing: 0.15mm;
      text-transform: uppercase;
      color: #8A938B;
      white-space: nowrap;
    }
    .meta-table .meta-data { text-align: left; white-space: nowrap; }

    .title-row { margin-bottom: 4mm; }
    .title-row td { vertical-align: top; padding: 0; }
    h1 { margin: 0 0 1mm; font-size: 16pt; line-height: 1.15; font-weight: 700; }
    .lede { margin: 0; max-width: 118mm; font-size: 8pt; line-height: 1.35; color: #67706A; }
    .tagline {
      width: 40mm;
      text-align: right;
      font-size: 9pt;
      line-height: 1.25;
      font-style: italic;
      color: #2F6B47;
    }

    .panel {
      margin: 0 0 3.5mm;
      padding: 4mm 4.5mm;
      background: #EAEFE7;
      border-radius: 2.4mm;
    }
    .panel:last-child { margin-bottom: 0; }
    .panel-head { display: table; width: 100%; margin-bottom: 2.2mm; }
    .panel-head > * { display: table-cell; vertical-align: top; }
    .panel-num-col { width: 8mm; }
    .panel-num {
      display: block;
      width: 5.8mm;
      height: 5.8mm;
      border-radius: 50%;
      background: #2F6B47;
      color: #FFFFFF;
      font-size: 8pt;
      font-weight: 700;
      line-height: 5.8mm;
      text-align: center;
    }
    h2 { margin: 0 0 0.4mm; font-size: 12pt; font-weight: 700; }
    .panel-note { margin: 0; font-size: 7.5pt; line-height: 1.3; color: #67706A; }

    .tile {
      background: #FFFFFF;
      border: 0.2mm solid #DFE6DC;
      border-radius: 2mm;
      padding: 3mm 1.6mm 3.2mm;
      text-align: center;
    }
    .empty-tile {
      padding: 6mm 3mm;
      font-size: 8pt;
      color: #67706A;
    }
    .empty-tile span { display: inline; }
    .metrics { table-layout: fixed; }
    .metric-cell { width: 16.66%; padding: 0 0.8mm; vertical-align: top; }
    .insights-metrics .metric-cell { width: 33.33%; }
    .icon-disc {
      display: inline-block;
      width: 7mm;
      height: 7mm;
      line-height: 7mm;
      text-align: center;
      border-radius: 50%;
      background: #E2EDE4;
    }
    .icon-disc svg { width: 3.6mm; height: 3.6mm; vertical-align: middle; }
    .tint-peach { background: #FBE5D8; }
    .tint-cream { background: #FAEFCF; }
    .tint-lilac { background: #E6E3F2; }
    .metric-value { margin-top: 1.6mm; font-size: 11.5pt; font-weight: 700; }
    .metric-label { margin-top: 0.6mm; font-size: 6.5pt; line-height: 1.25; color: #67706A; }

    .inset {
      margin-top: 3mm;
      padding: 3mm 3.5mm;
      background: #DFE8DA;
      border-radius: 2mm;
    }
    .inset-title { margin-bottom: 1.8mm; font-size: 7.5pt; font-weight: 700; }
    .destinations { table-layout: fixed; }
    .dest-cell { width: 33.33%; padding: 0 2.5mm 0 0; vertical-align: top; }
    .dest-cell .icon-disc { float: left; margin-right: 2mm; background: #CFDECA; }
    .dest-divider { padding-left: 3mm; padding-right: 0; border-left: 0.2mm solid #C6D3C1; }
    .dest-text { overflow: hidden; }
    .dest-value { font-size: 10pt; font-weight: 700; }
    .dest-tagline { font-size: 8pt; font-weight: 700; color: #2F6B47; }
    .dest-label { margin-top: 0.4mm; font-size: 7pt; line-height: 1.25; color: #67706A; }

    .table-title { margin: 2.6mm 0 1.8mm; font-size: 7.5pt; font-weight: 700; }
    .insights-split td { vertical-align: top; }
    .insights-table-wrap { width: 62%; padding-right: 3mm; }
    .category-table {
      background: #FFFFFF;
      border: 0.2mm solid #DFE6DC;
      border-radius: 2mm;
      overflow: hidden;
    }
    .category-table th {
      text-align: left;
      font-size: 5.5pt;
      letter-spacing: 0.12mm;
      text-transform: uppercase;
      color: #7C857D;
      background: #EDF1EA;
      padding: 1.4mm 2.4mm;
    }
    .category-table td {
      padding: 1.4mm 2.4mm;
      font-size: 8pt;
      border-top: 0.2mm solid #E9EEE6;
    }
    .category-table tr:first-child td { border-top: 0; }
    .category-table .num, .category-table th.num { text-align: right; white-space: nowrap; }
    .empty-cell { color: #8A938B; text-align: center; }
    .insight-card {
      width: 38%;
      padding: 3mm;
      background: #D8E6D9;
      border-radius: 2mm;
      vertical-align: top;
    }
    .insight-card .icon-disc { background: #FFFFFF; }
    .insight-kicker {
      margin: 1.4mm 0 1.2mm;
      font-size: 6pt;
      letter-spacing: 0.16mm;
      text-transform: uppercase;
      font-weight: 700;
      color: #2F6B47;
    }
    .insight-card p { margin: 0; font-size: 8.5pt; line-height: 1.35; }

    .partner-tile { padding: 3.2mm 3mm; margin-bottom: 2mm; }
    .partner-tile:last-child { margin-bottom: 0; }
    .partner-grid { table-layout: fixed; }
    .partner-col {
      width: 25%;
      padding: 0 1.5mm;
      vertical-align: top;
      text-align: center;
    }
    .partner-value {
      margin-top: 1.6mm;
      font-size: 10pt;
      font-weight: 700;
      line-height: 1.2;
    }
    .partner-label {
      margin-top: 0.5mm;
      font-size: 6.5pt;
      line-height: 1.25;
      color: #67706A;
    }
    .partner-meta {
      table-layout: fixed;
      margin-top: 2.4mm;
      padding-top: 2.2mm;
      border-top: 0.2mm solid #E4EAE1;
    }
    .partner-meta td {
      width: 33.33%;
      padding: 0 2.4mm;
      text-align: left;
      vertical-align: top;
    }
    .partner-meta td:first-child { padding-left: 1mm; }
    .partner-meta td:last-child { padding-right: 1mm; }
    .meta-kicker {
      font-size: 5.5pt;
      letter-spacing: 0.15mm;
      text-transform: uppercase;
      color: #8A938B;
    }
    .meta-value { margin-top: 0.6mm; font-size: 7.5pt; line-height: 1.3; }

    .footer { table-layout: fixed; margin: 0; padding-top: 2mm; border-top: 0.2mm solid #D9E0D6; }
    .footer td { vertical-align: middle; padding: 0; }
    .footer-brand { width: 32%; }
    .footer-brand img { height: 8mm; width: auto; max-width: 38mm; }
    .footer-tag { font-size: 8pt; font-weight: 700; line-height: 1.3; }
    .footer-thanks {
      text-align: right;
      font-size: 7pt;
      line-height: 1.3;
      font-style: italic;
      color: #2F6B47;
    }
    .footer-notes { margin-top: 1.6mm; font-size: 5.5pt; line-height: 1.3; color: #969E96; }
  </style>
</head>
<body>
  <div class="page">
    <table class="page-frame">
      <tr class="page-main">
        <td>
          <table class="header">
            <tr>
              <td>${brandLogo}</td>
              <td class="meta-block">
                <table class="meta-table">
                  <tr><td class="meta-label">Prepared for</td><td class="meta-data">${escapeHtml(meta.organisation)}</td></tr>
                  ${
                    meta.site
                      ? `<tr><td class="meta-label">Site</td><td class="meta-data">${escapeHtml(meta.site)}</td></tr>`
                      : ''
                  }
                  <tr><td class="meta-label">Reporting period</td><td class="meta-data">${escapeHtml(meta.period)}</td></tr>
                  <tr><td class="meta-label">Generated on</td><td class="meta-data">${escapeHtml(meta.generatedAt)}</td></tr>
                </table>
              </td>
            </tr>
          </table>
          <table class="title-row">
            <tr>
              <td>
                <h1>${escapeHtml(meta.title)}</h1>
                <p class="lede">${escapeHtml(copy.lede)}</p>
              </td>
              <td class="tagline">Good food today<br/>brighter tomorrow</td>
            </tr>
          </table>
          ${buildImpactSectionHtml(props)}
          ${buildInsightsSectionHtml(props, data.foods)}
          ${buildDestinationsSectionHtml(props, data.recipients)}
        </td>
      </tr>
      <tr class="page-foot">
        <td>
          <table class="footer">
            <tr>
              <td class="footer-brand">${brandLogo}</td>
              <td class="footer-tag">Less food waste.<br/>More good.</td>
              <td class="footer-thanks">Thank you for being part of a more sustainable,<br/>more equitable food system.</td>
            </tr>
          </table>
          <div class="footer-notes">
            Report notes · Generated by Saveful for Business.
            Figures reflect completed collections during the selected reporting period.
            Impact estimates are calculated using standard conversion factors.
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

async function readAssetAsDataUri(moduleId: number): Promise<string | null> {
  try {
    const asset = Asset.fromModule(moduleId);
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    if (uri) {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/png;base64,${base64}`;
    }
  } catch {
    // Fall through to the resolved asset URI.
  }

  try {
    const resolved = Image.resolveAssetSource(moduleId);
    if (!resolved?.uri) return null;
    const base64 = await FileSystem.readAsStringAsync(resolved.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:image/png;base64,${base64}`;
  } catch {
    return null;
  }
}

async function loadReportLogoDataUri(): Promise<string | null> {
  const wordmark = await readAssetAsDataUri(require('../../assets/intro/logo.png'));
  if (wordmark) return wordmark;
  return readAssetAsDataUri(require('../../assets/intro/Saveful-for-Business-logo.png'));
}

async function loadReportLogoDataUriSafe(): Promise<string | null> {
  try {
    return await withTimeout(loadReportLogoDataUri(), 4000, 'Logo load timed out');
  } catch {
    return null;
  }
}

async function createPdfReport(
  props: Props,
  data: ReportData,
): Promise<{ uri: string; mimeType: string; uti: string; name: string }> {
  const meta = buildReportMeta(props);
  const logoDataUri = await loadReportLogoDataUriSafe();
  const { uri } = await withTimeout(
    Print.printToFileAsync({
      html: buildPdfHtml(props, data, logoDataUri),
      width: 595,
      height: 842,
      margins: {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
      },
      base64: false,
    }),
    20000,
    'PDF generation timed out. Please try Excel, or try again.',
  );

  const dest = `${FileSystem.cacheDirectory}${meta.fileBase}.pdf`;
  try {
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    }
    await FileSystem.moveAsync({ from: uri, to: dest });
    return {
      uri: dest,
      mimeType: 'application/pdf',
      uti: 'com.adobe.pdf',
      name: `${meta.fileBase}.pdf`,
    };
  } catch {
    return {
      uri,
      mimeType: 'application/pdf',
      uti: 'com.adobe.pdf',
      name: `${meta.fileBase}.pdf`,
    };
  }
}

async function createExcelReport(
  props: Props,
  data: ReportData,
): Promise<{ uri: string; mimeType: string; uti: string; name: string }> {
  const { foods, recipients } = data;
  const meta = buildReportMeta(props);
  const workbook = XLSX.utils.book_new();

  const summaryRows: Array<Array<string | number>> = [
    ['Saveful for Business — Impact Report'],
    [],
    ['Organisation', meta.organisation],
    ...(meta.site ? [['Site', meta.site] as Array<string>] : []),
    ['Period', meta.period],
    ['Generated', meta.generatedAt],
    [],
    ['Metric', 'Value'],
    ...metricRows(props.stats).map((row) => [row.label, row.value]),
  ];

  if (props.stats.rating != null) {
    summaryRows.push([]);
    summaryRows.push(['Partner rating', `${formatNumber(props.stats.rating)} / 5`]);
    summaryRows.push(['Review count', props.stats.ratingCount]);
  }

  summaryRows.push([]);
  summaryRows.push([
    'Notes',
    isFarmerImpactReport() || isCharityImpactReport()
      ? 'Generated in Saveful for Business for the selected reporting period.'
      : 'Generated in Saveful for Business for management & ESG use.',
  ]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Impact');

  const heading = partnerHeading(props);
  const recipientRows: Array<Array<string | number>> = [
    [heading],
    [
      props.stats.mode === 'RECEIVER'
        ? 'Organisations you collected from in this period.'
        : 'Organisations that collected your food in this period.',
    ],
    [],
    [
      '#',
      'Organisation',
      'Collections',
      'Total kg',
      'Share %',
      'People kg',
      'Animals kg',
      'Meals created',
      'CO₂ avoided kg',
      'First collection',
      'Last collection',
      'Food types',
    ],
    ...(recipients.length
      ? recipients.map((recipient) => [
          recipient.rank,
          recipient.name,
          recipient.collections,
          recipient.totalKg,
          recipient.sharePercent,
          recipient.peopleKg,
          recipient.animalKg,
          recipient.mealsCreated,
          recipient.co2AvoidedKg,
          formatCollectionDate(recipient.firstCollectionAt) ?? '—',
          formatCollectionDate(recipient.lastCollectionAt) ?? '—',
          recipient.foods.length
            ? recipient.foods
                .map((food) => `${food.name} (${formatNumber(food.totalKg)} kg)`)
                .join(', ')
            : '—',
        ])
      : [['—', 'No partner organisations for this period', '', '', '', '', '', '', '', '', '', '']]),
  ];

  const recipientsSheet = XLSX.utils.aoa_to_sheet(recipientRows);
  recipientsSheet['!cols'] = [
    { wch: 4 },
    { wch: 28 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 48 },
  ];
  XLSX.utils.book_append_sheet(workbook, recipientsSheet, heading);

  // One row per organisation-and-food pair, so the data can be pivoted.
  const breakdownRows: Array<Array<string | number>> = [
    ['Organisation', 'Food item', 'Category', 'Total kg'],
    ...recipients.flatMap((recipient) =>
      recipient.foods.map((food) => [
        recipient.name,
        food.name,
        food.category ?? '—',
        food.totalKg,
      ]),
    ),
  ];

  if (breakdownRows.length > 1) {
    const breakdownSheet = XLSX.utils.aoa_to_sheet(breakdownRows);
    breakdownSheet['!cols'] = [{ wch: 28 }, { wch: 24 }, { wch: 16 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, breakdownSheet, 'Partner food detail');
  }

  const foodRows: Array<Array<string | number>> = [
    ['Specific Food Savings'],
    ['These amounts make up the totals — they are not extra.'],
    [],
    [
      '#',
      'Food item',
      'Category',
      'Total kg',
      'People kg',
      'Animals kg',
      'Meals created',
      'CO₂ avoided kg',
      'Value AUD',
    ],
    ...(foods.length
      ? foods.map((food) => [
          food.rank,
          food.name,
          food.category,
          food.totalKg,
          food.peopleKg,
          food.animalKg,
          food.mealsCreated,
          food.co2AvoidedKg,
          food.savedUsd,
        ])
      : [['—', 'No per-food-item savings for this period', '', '', '', '', '', '', '']]),
  ];

  const foodsSheet = XLSX.utils.aoa_to_sheet(foodRows);
  foodsSheet['!cols'] = [
    { wch: 4 },
    { wch: 24 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(workbook, foodsSheet, 'Food items');

  if (!FileSystem.cacheDirectory) {
    throw new Error('File storage is unavailable on this device.');
  }

  const fileName = `${meta.fileBase}.xlsx`;
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' }) as string;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    uri,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uti: 'org.openxmlformats.spreadsheetml.sheet',
    name: fileName,
  };
}

async function prepareShareableFile(file: {
  uri: string;
  name: string;
}): Promise<string> {
  const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!dir) return file.uri;

  const dest = `${dir}${file.name}`;
  try {
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) {
      await FileSystem.deleteAsync(dest, { idempotent: true });
    }
    await FileSystem.copyAsync({ from: file.uri, to: dest });
    return dest;
  } catch {
    return file.uri;
  }
}

function isMissingNativeModule(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /native module|ExpoPrint|ExpoSharing|ExponentFileSystem|Cannot find/i.test(message);
}

export function ImpactReportDownload({
  stats,
  filter,
  filterLabel,
  siteId = null,
  siteLabel,
  organisationName,
}: Props) {
  const authUser = useAuthStore((state) => state.authUser);
  const orgId =
    authUser?.profile?.organisation?.id ??
    authUser?.profile?.organization?.id ??
    null;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportReport = useCallback(
    async (format: ReportFormat) => {
      if (exporting) return;
      setExporting(true);
      setPickerOpen(false);

      const reportProps: Props = {
        stats,
        filter,
        filterLabel,
        siteId,
        siteLabel,
        organisationName,
      };

      try {
        // iOS will not present the share sheet (and shareAsync never resolves)
        // if the format modal is still dismissing. Wait it out first.
        await waitForInteractions();
        if (Platform.OS === 'ios') {
          await wait(450);
        }

        const available = await Sharing.isAvailableAsync();
        if (!available) {
          showInfoAlert(
            'Sharing is not available on this device. Rebuild the app with a development client to enable export.',
            'Sharing unavailable',
          );
          return;
        }

        const resolvedOrgId = orgId != null ? Number(orgId) : null;

        // Summary metrics are always exportable, so a failing breakdown just
        // renders as an empty section rather than losing the whole report.
        const [foods, recipients] = await Promise.all([
          fetchFoodSavings(reportProps, resolvedOrgId).catch(() => [] as FoodReportRow[]),
          fetchRecipientRows({
            filter,
            siteId,
            orgId: resolvedOrgId,
          }).catch(() => [] as RecipientRow[]),
        ]);

        const data: ReportData = { foods, recipients };
        const file =
          format === 'pdf'
            ? await createPdfReport(reportProps, data)
            : await createExcelReport(reportProps, data);

        const shareUri = await prepareShareableFile(file);

        // iOS shareAsync often never resolves after the sheet is shown/dismissed.
        // The file is ready — drop the spinner before opening the share sheet.
        setExporting(false);
        await wait(Platform.OS === 'ios' ? 120 : 0);

        void Sharing.shareAsync(shareUri, {
          mimeType: file.mimeType,
          UTI: file.uti,
          dialogTitle: `Save or share ${file.name}`,
        }).catch((shareError) => {
          showErrorAlert(shareError, 'Could not open the share sheet');
        });
      } catch (error) {
        if (isMissingNativeModule(error)) {
          showErrorAlert(
            'PDF/Excel export needs a native rebuild. Run a new development build (or EAS build), then try again.',
            'Rebuild required',
          );
        } else {
          showErrorAlert(error, 'Could not create report');
        }
      } finally {
        setExporting(false);
      }
    },
    [exporting, stats, filter, filterLabel, siteId, siteLabel, organisationName, orgId],
  );

  return (
    <View style={styles.card}>
      <View style={styles.copy}>
        <AppText variant="bodyBold" style={styles.title}>
          Download report
        </AppText>
        <AppText variant="bodySmall" color={palette.midgray} style={styles.body}>
          {stats.mode === 'RECEIVER'
            ? 'Export impact totals, who you collected from and per-food-item savings as PDF or Excel, then save or share.'
            : 'Export impact totals, who you donated to and per-food-item savings as PDF or Excel, then save or share.'}
        </AppText>
      </View>

      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, exporting && styles.btnDisabled]}
        onPress={() => setPickerOpen(true)}
        disabled={exporting}
        accessibilityRole="button"
        accessibilityLabel="Download impact report"
      >
        {exporting ? (
          <ActivityIndicator size="small" color={palette.white} />
        ) : (
          <>
            <Ionicons name="download-outline" size={normalize(18)} color={palette.white} />
            <AppText variant="bodyBold" color={palette.white} style={styles.btnText}>
              Download
            </AppText>
          </>
        )}
      </Pressable>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <AppText variant="h7" style={styles.sheetTitle}>
                Choose format
              </AppText>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={normalize(22)} color={palette.text} />
              </Pressable>
            </View>

            <AppText variant="bodySmall" color={palette.midgray} style={styles.sheetBody}>
              Includes overall impact, partner organisations and specific food savings for this
              period.
            </AppText>

            <Pressable
              style={({ pressed }) => [styles.formatBtn, pressed && styles.pressed]}
              onPress={() => void exportReport('pdf')}
              accessibilityRole="button"
              accessibilityLabel="Export PDF report"
            >
              <View style={[styles.formatIcon, styles.pdfIcon]}>
                <Ionicons name="document-text-outline" size={normalize(20)} color={palette.eggplant} />
              </View>
              <View style={styles.formatCopy}>
                <AppText variant="bodyBold" style={styles.formatTitle}>
                  PDF report
                </AppText>
                <AppText variant="bodySmall" color={palette.midgray} style={styles.formatDesc}>
                  Formatted summary with partner and per-food-item tables.
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={normalize(18)} color={palette.stone} />
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.formatBtn, pressed && styles.pressed]}
              onPress={() => void exportReport('excel')}
              accessibilityRole="button"
              accessibilityLabel="Export Excel report"
            >
              <View style={[styles.formatIcon, styles.excelIcon]}>
                <Ionicons name="grid-outline" size={normalize(20)} color={palette.kale} />
              </View>
              <View style={styles.formatCopy}>
                <AppText variant="bodyBold" style={styles.formatTitle}>
                  Excel spreadsheet
                </AppText>
                <AppText variant="bodySmall" color={palette.midgray} style={styles.formatDesc}>
                  Impact, partner and food item sheets you can analyse further.
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={normalize(18)} color={palette.stone} />
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderRadius: normalize(14),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.6),
    gap: hp(1.2),
    ...elevation.card,
  },
  copy: {
    gap: hp(0.35),
  },
  title: {
    textTransform: 'none',
  },
  body: {
    textTransform: 'none',
    lineHeight: normalize(18),
  },
  btn: {
    alignSelf: 'stretch',
    minHeight: normalize(44),
    borderRadius: normalize(12),
    backgroundColor: palette.kale,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    paddingHorizontal: wp(4),
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnText: {
    textTransform: 'none',
  },
  pressed: {
    opacity: 0.88,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 27, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: normalize(18),
    borderTopRightRadius: normalize(18),
    paddingHorizontal: wp(5),
    paddingTop: hp(1.8),
    paddingBottom: hp(3.2),
    gap: hp(1.2),
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    textTransform: 'none',
  },
  sheetBody: {
    textTransform: 'none',
    lineHeight: normalize(18),
    marginBottom: hp(0.4),
  },
  formatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    paddingVertical: hp(1.3),
    paddingHorizontal: wp(3),
    borderRadius: normalize(14),
    backgroundColor: palette.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.strokecream,
  },
  formatIcon: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfIcon: {
    backgroundColor: palette.radish,
  },
  excelIcon: {
    backgroundColor: palette.mint,
  },
  formatCopy: {
    flex: 1,
    gap: hp(0.2),
  },
  formatTitle: {
    textTransform: 'none',
  },
  formatDesc: {
    textTransform: 'none',
    lineHeight: normalize(16),
  },
});
