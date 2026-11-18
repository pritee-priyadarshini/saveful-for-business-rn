import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { cc, ProgressBar, tabular } from '@/components/consolidated/ui';
import {
  MFC,
  MFC_DESTINATIONS,
  MFC_IMPACT_COLORS,
  MFC_PATHWAY_ALIASES,
} from '@/constants/makeFoodCount';
import { palette } from '@/theme/colors';
import { MfcArt, resolveMfcArt } from '@/components/makeFoodCount/MfcArt';
import { useMakeFoodCountStore } from '@/store/makeFoodCountStore';
import type { InsightsCategoryRow, InsightsDestination } from '@/types/makeFoodCount';
import { formatKg } from '@/utils/makeFoodCountSummary';
import { normalize } from '@/utils/responsive';

/** "62%" for a share; one decimal below 10% so small shares don't read as 0. */
export function formatPercent(part: number, whole: number): string {
  if (!(whole > 0) || !(part > 0)) return '0%';
  const pct = (part / whole) * 100;
  return `${pct < 10 ? pct.toFixed(1).replace(/\.0$/, '') : Math.round(pct)}%`;
}

export function formatCount(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

// ─── Split bar ───────────────────────────────────────────────────────────────

/** The deck's "Where did the food go?" bar: All food total, green recovered vs lilac not recovered. */
export function RecoverySplit({
  recoveredKg,
  notRecoveredKg,
  showLegend = true,
}: {
  recoveredKg: number;
  notRecoveredKg: number;
  showLegend?: boolean;
}) {
  const total = recoveredKg + notRecoveredKg;
  const parts = [
    { kg: recoveredKg, color: MFC.recovered },
    { kg: notRecoveredKg, color: MFC.notRecovered },
  ].filter((part) => part.kg > 0);

  return (
    <View style={styles.gap8}>
      <View style={styles.rowBetween}>
        <AppText variant="bodySmall" color={MFC.ink} style={styles.bold}>
          All food
        </AppText>
        <AppText variant="bodySmall" color={MFC.ink} style={[styles.bold, tabular]}>
          {formatKg(total)}
        </AppText>
      </View>
      <View
        style={styles.split}
        accessible
        accessibilityLabel={`Recovered ${formatKg(recoveredKg)}, ${formatPercent(recoveredKg, total)}. Not recovered ${formatKg(notRecoveredKg)}, ${formatPercent(notRecoveredKg, total)}.`}
      >
        {parts.map((part, index) => (
          <View key={index} style={{ flex: part.kg, backgroundColor: part.color }} />
        ))}
      </View>
      <AppText variant="meta" color={MFC.muted} style={tabular}>
        {`${formatKg(recoveredKg)} recovered · ${formatKg(notRecoveredKg)} not recovered`}
      </AppText>
      {showLegend ? (
        <View style={styles.legendRow}>
          <LegendItem color={MFC.recovered} label="Redistributed / recovered" />
          <LegendItem color={MFC.notRecovered} label="Not recovered" />
        </View>
      ) : null}
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <AppText variant="meta" color={MFC.muted}>
        {label}
      </AppText>
    </View>
  );
}

// ─── Destinations ────────────────────────────────────────────────────────────

type DestinationRow = { key: string; label: string; color: string; kg: number; description: string };

const DESTINATION_COPY: Record<string, string> = {
  FOOD_FOR_PEOPLE: 'Edible food redistributed to people',
  LIVESTOCK_FEED: 'Approved animal feed pathway',
  CIRCULAR_RECOVERY: 'Organics processing',
  BIOENERGY: 'Food recovered for energy generation',
};

function humanise(key: string): string {
  const text = key.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Always the four destinations (zero-filled), largest first, plus any extra pathway the API sends. */
export function useDestinationRows(destinations: InsightsDestination[]): DestinationRow[] {
  return useMemo(() => {
    const totals = new Map<string, number>();
    for (const row of destinations) {
      const upper = row.pathway.toUpperCase();
      const key = MFC_PATHWAY_ALIASES[upper] ?? upper;
      totals.set(key, (totals.get(key) ?? 0) + row.kg);
    }
    const rows: DestinationRow[] = MFC_DESTINATIONS.map((meta) => ({
      ...meta,
      kg: totals.get(meta.key) ?? 0,
      description: DESTINATION_COPY[meta.key] ?? '',
    }));
    for (const [key, kg] of totals) {
      if (kg > 0 && !MFC_DESTINATIONS.some((meta) => meta.key === key)) {
        rows.push({ key, label: humanise(key), color: palette.stone, kg, description: '' });
      }
    }
    return rows.sort((a, b) => b.kg - a.kg);
  }, [destinations]);
}

/** The deck's destination list: name and what it means, kg and share of recovered. */
export function DestinationList({
  destinations,
  recoveredKg,
}: {
  destinations: InsightsDestination[];
  recoveredKg: number;
}) {
  const rows = useDestinationRows(destinations);
  // Never show a share above 100%, even if the destination figures and the recovered total disagree.
  const denominator = Math.max(recoveredKg, rows.reduce((sum, row) => sum + row.kg, 0));

  return (
    <View>
      {rows.map((row, index) => (
        <View
          key={row.key}
          style={[styles.destRow, index > 0 && styles.destDivider]}
          accessible
          accessibilityLabel={`${row.label}: ${formatKg(row.kg)}, ${formatPercent(row.kg, denominator)} of recovered`}
        >
          <View style={styles.flex}>
            <AppText variant="bodySmall" color={MFC.ink} style={styles.bold}>
              {row.label}
            </AppText>
            {row.description ? (
              <AppText variant="meta" color={MFC.muted}>
                {row.description}
              </AppText>
            ) : null}
          </View>
          <View style={styles.destRight}>
            <AppText variant="bodySmall" color={MFC.ink} style={[styles.bold, tabular]}>
              {formatKg(row.kg)}
            </AppText>
            <AppText variant="meta" color={MFC.muted} style={tabular}>
              {`${formatPercent(row.kg, denominator)} of recovered`}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Small pieces ────────────────────────────────────────────────────────────

/** "Estimated" tag used next to meals and CO₂ figures. */
export function EstimatedTag() {
  return (
    <View style={styles.estimated}>
      <AppText variant="caption" color={palette.midgray} style={styles.estimatedText}>
        Estimated
      </AppText>
    </View>
  );
}

/** A label, a kg figure, and a bar sized against `max`. */
export function BarRow({
  label,
  detail,
  value,
  max,
  color = palette.kale,
}: {
  label: string;
  detail: string;
  value: number;
  max: number;
  color?: string;
}) {
  return (
    <View style={styles.gap6} accessible accessibilityLabel={`${label}: ${detail}`}>
      <View style={styles.rowBetween}>
        <AppText variant="bodyBold" numberOfLines={1} style={styles.flex}>
          {label}
        </AppText>
        <AppText variant="bodySmall" style={tabular}>
          {detail}
        </AppText>
      </View>
      <ProgressBar value={value} total={max} color={color} />
    </View>
  );
}

export function MutedLine({ children }: { children: string }) {
  return (
    <AppText variant="bodySmall" color={palette.stone}>
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  gap6: { gap: 6 },
  gap12: { gap: 12 },
  gap14: { gap: 14 },
  bold: { fontFamily: 'Saveful-Bold' },
  gap8: { gap: 8 },
  split: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#EEE9F3',
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  destRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  destDivider: { borderTopWidth: 1, borderTopColor: MFC.divider },
  destRight: { alignItems: 'flex-end' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowBetween: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  labelWithDot: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  estimated: {
    alignSelf: 'flex-start',
    paddingHorizontal: normalize(8),
    paddingVertical: normalize(2),
    borderRadius: 999,
    backgroundColor: cc.muted,
  },
  estimatedText: { letterSpacing: 0.6 },
});

// ─── Category labels ─────────────────────────────────────────────────────────

/**
 * The taxonomy's label for a category key ("meat_poultry" → "Meat & Poultry").
 * Category keys repeat across sources with the same meaning, so the first match wins.
 */
export function useCategoryLabel(): (key: string, fallback: string) => string {
  const taxonomy = useMakeFoodCountStore((state) => state.taxonomy);
  useEffect(() => {
    if (!taxonomy) void useMakeFoodCountStore.getState().loadTaxonomy();
  }, [taxonomy]);
  return useCallback(
    (key: string, fallback: string) => taxonomy?.entries.find((entry) => entry.key === key)?.label ?? fallback,
    [taxonomy],
  );
}

/** Recovered kg per food category, as a share of everything recovered in scope. */
export function RecoveredByCategory({ rows }: { rows: InsightsCategoryRow[] }) {
  const labelFor = useCategoryLabel();
  const visible = rows.filter((row) => row.recoveredKg > 0).sort((a, b) => b.recoveredKg - a.recoveredKg);
  const total = visible.reduce((sum, row) => sum + row.recoveredKg, 0);
  if (visible.length === 0) return <MutedLine>Nothing collected in this period yet.</MutedLine>;
  return (
    <View style={styles.gap14}>
      {visible.map((row) => {
        const label = labelFor(row.category, row.label);
        const share = formatPercent(row.recoveredKg, total);
        return (
          <View key={row.category} style={styles.categoryRow} accessible accessibilityLabel={`${label}: ${formatKg(row.recoveredKg)} recovered, ${share} of recovered`}>
            <MfcArt art={resolveMfcArt({ category: row.category })} size={36} />
            <View style={[styles.flex, styles.gap6]}>
              <View style={styles.rowBetween}>
                <AppText variant="bodyBold" numberOfLines={1} style={styles.flex}>
                  {label}
                </AppText>
                <AppText variant="bodySmall" style={tabular}>
                  {formatKg(row.recoveredKg)}
                  <AppText variant="meta" color={palette.stone}>{` · ${share}`}</AppText>
                </AppText>
              </View>
              <ProgressBar value={row.recoveredKg} total={total} color={MFC_IMPACT_COLORS.recovered} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
