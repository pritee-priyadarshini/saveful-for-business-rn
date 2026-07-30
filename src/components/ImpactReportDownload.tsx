import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { elevation } from '@/theme/elevation';
import { hp, normalize, wp } from '@/utils/responsive';
import { showErrorAlert, showInfoAlert } from '@/utils/apiError';
import type { ImpactDisplayStats } from '@/utils/impactData';
import type { ImpactFilter } from '@/store/impactStore';
import {
  impactService,
  type TopFoodItem,
} from '@/services/impact.service';
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

function round2(value: number) {
  return Math.round(value * 100) / 100;
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
      savedUsd: round2(Number(food.totalFoodSavedUsd) || 0),
    };
  });
}

function buildReportMeta(props: Props) {
  const generatedAt = new Date().toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  return {
    title: 'Impact Report',
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

  const rangeParams =
    props.filter.mode === 'custom' && props.filter.startDate && props.filter.endDate
      ? { startDate: props.filter.startDate, endDate: props.filter.endDate }
      : undefined;

  const res =
    props.siteId != null
      ? await impactService.getSiteTopFoods(props.siteId, rangeParams)
      : await impactService.getOrgTopFoods(Number(orgId), rangeParams);

  const foods = unwrapTopFoods(res.data ?? res);
  return toFoodReportRows(foods, props.stats);
}

function buildFoodItemsHtml(foods: FoodReportRow[]) {
  if (!foods.length) {
    return `
      <h2>Specific food savings</h2>
      <p class="empty">No per-food-item savings for this period.</p>
    `;
  }

  const rows = foods
    .map(
      (food) => `
      <tr>
        <td class="rank">${food.rank}</td>
        <td>
          <div class="food-name">${escapeHtml(food.name)}</div>
          <div class="food-cat">${escapeHtml(food.category)}</div>
        </td>
        <td class="value">${escapeHtml(formatNumber(food.totalKg))} kg</td>
        <td class="value">${escapeHtml(formatNumber(food.peopleKg))} kg</td>
        <td class="value">${escapeHtml(formatNumber(food.animalKg))} kg</td>
        <td class="value">${escapeHtml(formatNumber(food.mealsCreated))}</td>
        <td class="value">${escapeHtml(formatNumber(food.co2AvoidedKg))} kg</td>
        <td class="value">$${escapeHtml(formatNumber(food.savedUsd))}</td>
      </tr>`,
    )
    .join('');

  return `
    <h2>Specific food savings</h2>
    <p class="section-note">
      Breakdown by food item for this period. These amounts make up the totals above — they are not extra.
    </p>
    <table class="foods">
      <thead>
        <tr>
          <th>#</th>
          <th>Food item</th>
          <th style="text-align:right">Total</th>
          <th style="text-align:right">People</th>
          <th style="text-align:right">Animals</th>
          <th style="text-align:right">Meals</th>
          <th style="text-align:right">CO₂</th>
          <th style="text-align:right">Value</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function buildPdfHtml(props: Props, foods: FoodReportRow[]) {
  const meta = buildReportMeta(props);
  const rows = metricRows(props.stats)
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.label)}</td>
        <td class="value">${escapeHtml(row.value)}</td>
      </tr>`,
    )
    .join('');

  const ratingHtml =
    props.stats.rating != null
      ? `<div class="rating">Partner rating: <strong>${escapeHtml(
          formatNumber(props.stats.rating),
        )}</strong> / 5 · ${escapeHtml(formatNumber(props.stats.ratingCount))} reviews</div>`
      : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 24px; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      color: #1A1A1B;
      background: #FFFAF3;
    }
    .page {
      padding: 24px 20px 28px;
      background: linear-gradient(180deg, #FEFFED 0%, #FFFAF3 42%, #FFFCF9 100%);
    }
    .brand {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 22px;
      padding-bottom: 14px;
      border-bottom: 2px solid #3A7E52;
    }
    .brand-mark {
      font-size: 20px;
      font-weight: 800;
      color: #4B2176;
    }
    .brand-sub {
      margin-top: 4px;
      font-size: 11px;
      color: #575757;
      text-transform: uppercase;
      letter-spacing: 1.1px;
    }
    .chip {
      background: #96F0B6;
      color: #1A1A1B;
      font-size: 11px;
      font-weight: 700;
      padding: 8px 12px;
      border-radius: 999px;
      white-space: nowrap;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 26px;
      line-height: 1.15;
    }
    h2 {
      margin: 28px 0 8px;
      font-size: 18px;
      color: #4B2176;
    }
    .lede, .section-note, .empty {
      margin: 0 0 18px;
      font-size: 13px;
      line-height: 1.45;
      color: #575757;
    }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 16px;
      margin-bottom: 20px;
      padding: 14px;
      background: #FFFCF9;
      border: 1px solid #EEE4D7;
      border-radius: 14px;
    }
    .meta-item label {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #6D6D72;
      margin-bottom: 4px;
    }
    .meta-item div {
      font-size: 13px;
      font-weight: 650;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #FFFCF9;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid #EEE4D7;
    }
    th {
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: #FEFFED;
      background: #3A7E52;
      padding: 10px 10px;
    }
    td {
      padding: 11px 10px;
      border-top: 1px solid #EEE4D7;
      font-size: 12px;
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #FEFFED; }
    td.value {
      text-align: right;
      font-weight: 700;
      color: #4B2176;
      white-space: nowrap;
    }
    td.rank {
      width: 28px;
      font-weight: 700;
      color: #3A7E52;
    }
    .food-name { font-weight: 700; color: #1A1A1B; }
    .food-cat { margin-top: 2px; font-size: 11px; color: #6D6D72; }
    table.foods th, table.foods td { font-size: 11px; padding: 9px 8px; }
    .rating {
      margin-top: 16px;
      padding: 11px 12px;
      background: #FFCDF5;
      border-radius: 12px;
      font-size: 12px;
    }
    .footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #EEE4D7;
      font-size: 10px;
      color: #6D6D72;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="brand">
      <div>
        <div class="brand-mark">Saveful for Business</div>
        <div class="brand-sub">Impact &amp; ESG summary</div>
      </div>
      <div class="chip">Confidential</div>
    </div>

    <h1>${escapeHtml(meta.title)}</h1>
    <p class="lede">
      A management-ready snapshot of food redistribution impact for the selected period,
      including per-food-item savings.
    </p>

    <div class="meta">
      <div class="meta-item">
        <label>Organisation</label>
        <div>${escapeHtml(meta.organisation)}</div>
      </div>
      <div class="meta-item">
        <label>Period</label>
        <div>${escapeHtml(meta.period)}</div>
      </div>
      ${
        meta.site
          ? `<div class="meta-item"><label>Site</label><div>${escapeHtml(meta.site)}</div></div>`
          : ''
      }
      <div class="meta-item">
        <label>Generated</label>
        <div>${escapeHtml(meta.generatedAt)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th style="text-align:right">Value</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    ${ratingHtml}
    ${buildFoodItemsHtml(foods)}

    <div class="footer">
      Generated by Saveful for Business · Figures reflect completed collections in the selected period.
      CO₂ avoided uses standard factors applied in-product.
    </div>
  </div>
</body>
</html>`;
}

async function createPdfReport(
  props: Props,
  foods: FoodReportRow[],
): Promise<{ uri: string; mimeType: string; uti: string; name: string }> {
  const meta = buildReportMeta(props);
  const { uri } = await Print.printToFileAsync({
    html: buildPdfHtml(props, foods),
    base64: false,
  });

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
  foods: FoodReportRow[],
): Promise<{ uri: string; mimeType: string; uti: string; name: string }> {
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
  summaryRows.push(['Notes', 'Generated in Saveful for Business for management & ESG use.']);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 28 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Impact');

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
      'Value USD',
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
        const available = await Sharing.isAvailableAsync();
        if (!available) {
          showInfoAlert(
            'Sharing is not available on this device. Rebuild the app with a development client to enable export.',
            'Sharing unavailable',
          );
          return;
        }

        let foods: FoodReportRow[] = [];
        try {
          foods = await fetchFoodSavings(reportProps, orgId != null ? Number(orgId) : null);
        } catch {
          // Still export summary metrics if food-item fetch fails.
          foods = [];
        }

        const file =
          format === 'pdf'
            ? await createPdfReport(reportProps, foods)
            : await createExcelReport(reportProps, foods);

        await Sharing.shareAsync(file.uri, {
          mimeType: file.mimeType,
          UTI: file.uti,
          dialogTitle: `Save or share ${file.name}`,
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
          Export impact totals plus per-food-item savings as PDF or Excel, then save or share.
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
              Includes overall impact and specific food savings for this period.
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
                  Formatted summary with per-food-item savings table.
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
                  Impact sheet plus a Food items sheet you can analyse further.
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
