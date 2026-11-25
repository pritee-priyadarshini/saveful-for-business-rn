import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type NavigationProp, type ParamListBase } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import { tabular } from '@/components/consolidated/ui';
import { formatDisplayDate } from '@/components/ImpactDateFilter';
import { InsightsFilterCard } from '@/components/makeFoodCount/InsightsFilterCard';
import {
  BarRow,
  DestinationList,
  EstimatedTag,
  MutedLine,
  RecoverySplit,
  RecoveredByCategory,
  formatCount,
  formatPercent,
} from '@/components/makeFoodCount/InsightsParts';
import {
  MfcCard,
  MfcCta,
  MfcEmpty,
  MfcNotice,
  MfcPageTitle,
  MfcSectionLabel,
  MfcSkeleton,
  MfcTabs,
  mfcUi,
} from '@/components/makeFoodCount/MfcAppUi';
import { MfcArt, SOURCE_ART } from '@/components/makeFoodCount/MfcArt';
import { Screen } from '@/components/Screen';
import { MFC, MFC_IMPACT_COLORS, MFC_NOT_RECOVERED_BUCKETS, SOURCE_META } from '@/constants/makeFoodCount';
import { insightsQueryKey, useMfcInsightsStore } from '@/store/mfcInsightsStore';
import { useAuthStore } from '@/store/authStore';
import { useSitesStore } from '@/store/sitesStore';
import { palette } from '@/theme/colors';
import { elevation } from '@/theme/elevation';
import { FOOD_SOURCES, type InsightsPayload, type InsightsSourceRow } from '@/types/makeFoodCount';
import { formatKg } from '@/utils/makeFoodCountSummary';
import { normalize, useResponsiveLayout } from '@/utils/responsive';
import { useModuleGate } from '@/hooks/useModuleGate';
import { ModuleUpsellPanel } from '@/components/plans/ModuleUpsellPanel';

type ViewKey = 'overview' | 'happened' | 'redistributed';

const VIEW_OPTIONS: { value: ViewKey; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'happened', label: 'What happened' },
  { value: 'redistributed', label: 'Redistributed' },
];

const NO_DATA_TITLE = 'No food recorded for these filters';
const NO_DATA_BODY = 'Try a longer reporting period or clear the filters. Recorded food appears here once records are saved.';

function useOrganisationName(): string {
  const organisation = useSitesStore((state) => state.organisation);
  const profileName = useAuthStore((state) => state.authUser?.profile?.organisation?.name);
  const name = organisation?.name ?? profileName;
  return typeof name === 'string' && name.trim() ? name.trim() : '';
}

export function FoodImpactScreen() {
  const layout = useResponsiveLayout();
  const connectGate = useModuleGate('CONNECT');
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const organisationName = useOrganisationName();
  const route = useRoute();
  const initialView = (route.params as { view?: ViewKey } | undefined)?.view;
  const [view, setView] = useState<ViewKey>(
    initialView && VIEW_OPTIONS.some((option) => option.value === initialView) ? initialView : 'overview',
  );
  const [refreshing, setRefreshing] = useState(false);

  const insights = useMfcInsightsStore((s) => s.insights);
  const loading = useMfcInsightsStore((s) => s.loading);
  const error = useMfcInsightsStore((s) => s.error);
  const filtersLoaded = useMfcInsightsStore((s) => s.filters != null);
  const clearFilters = useMfcInsightsStore((s) => s.clearFilters);
  const loadFilters = useMfcInsightsStore((s) => s.loadFilters);
  const loadInsights = useMfcInsightsStore((s) => s.loadInsights);
  const queryKey = useMfcInsightsStore(insightsQueryKey);

  useEffect(() => {
    useSitesStore.getState().fetchOrganisation().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!filtersLoaded) void loadFilters();
  }, [filtersLoaded, loadFilters]);

  // Every filter change reloads; one state feeds all three views.
  useEffect(() => {
    void loadInsights();
  }, [queryKey, loadInsights]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadFilters(), loadInsights()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadFilters, loadInsights]);

  const showSkeleton = loading || (!insights && !error);
  const isEmpty = !!insights && insights.overview.recordedKg <= 0 && insights.whatHappened.recordedKg <= 0;

  return (
    <Screen
      transparentTop
      backgroundColor={MFC.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} colors={[palette.primary]} />}
    >
      <View
        style={[
          styles.page,
          {
            paddingHorizontal: layout.pagePadH,
            maxWidth: layout.contentMaxWidth,
            paddingTop: layout.space(8, 12),
            paddingBottom: layout.space(32, 40),
          },
        ]}
      >
        <AppText variant="body1" color={MFC.muted}>
          {`${organisationName || 'Your organisation'} · Food insights and recovery outcomes`}
        </AppText>

        <InsightsFilterCard organisationName={organisationName} />

        <MfcTabs options={VIEW_OPTIONS} value={view} onChange={setView} />

        {error && !loading ? (
          <MfcNotice tone="danger" title="We couldn't load your food insights" body={error}>
            <MfcCta label="Try again" variant="secondary" compact onPress={() => void loadInsights()} style={styles.noticeAction} />
          </MfcNotice>
        ) : null}

        {showSkeleton ? (
          <View style={styles.stack} accessibilityLabel="Loading food insights" accessibilityLiveRegion="polite">
            <MfcSkeleton lines={2} />
            <MfcSkeleton lines={3} />
            <MfcSkeleton lines={4} />
          </View>
        ) : null}

        {!showSkeleton && isEmpty ? (
          <MfcEmpty
            icon="stats-chart-outline"
            title={NO_DATA_TITLE}
            body={NO_DATA_BODY}
            action={<MfcCta label="Clear filters" variant="secondary" onPress={clearFilters} />}
          />
        ) : null}

        {!showSkeleton && insights && !isEmpty ? (
          <>
            {view === 'overview' ? (
              <OverviewView
                insights={insights}
                isTablet={layout.isTablet}
                onOpenSource={(source) => navigation.navigate('MfcSourceDrilldown', { source })}
              />
            ) : null}
            {view === 'happened' ? <HappenedView insights={insights} isTablet={layout.isTablet} /> : null}
            {view === 'redistributed' ? (
              // Redistribution is Saveful Connect; without it there is nothing to show.
              connectGate.locked ? (
                <ModuleUpsellPanel module="CONNECT" variant="inline" />
              ) : (
                <RedistributedView insights={insights} isTablet={layout.isTablet} />
              )
            ) : null}
          </>
        ) : null}
      </View>
    </Screen>
  );
}

// ─── Impact overview ─────────────────────────────────────────────────────────

function OverviewView({
  insights,
  isTablet,
  onOpenSource,
}: {
  insights: InsightsPayload;
  isTablet: boolean;
  onOpenSource: (source: InsightsSourceRow['source']) => void;
}) {
  const { overview, destinations, bySource } = insights;
  const rows = useMemo(
    () =>
      FOOD_SOURCES.map(
        (source) =>
          bySource.find((row) => row.source === source) ?? { source, recordedKg: 0, recoveredKg: 0, notRecoveredKg: 0 },
      ),
    [bySource],
  );

  return (
    <View style={styles.stack}>
      <View style={[styles.cards, isTablet && styles.row]}>
        <MetricCard style={isTablet ? styles.flex : undefined} label="Total food recorded" kg={overview.recordedKg} note="Across all four sources" />
        <View style={[styles.row, styles.cards, isTablet && styles.flex2]}>
          <MetricCard style={styles.flex} size="small" tone="recovered" label="Recovered" kg={overview.recoveredKg} note="Collected and verified" />
          <MetricCard style={styles.flex} size="small" tone="notRecovered" label="Not recovered" kg={overview.notRecoveredKg} note="Not collected" />
        </View>
      </View>

      <View style={styles.estimates} accessible accessibilityLabel={`Estimated ${formatCount(overview.estimatedMeals)} meals and ${formatKg(overview.estimatedCo2Kg)} CO2 avoided`}>
        <View style={styles.estimate}>
          <Ionicons name="restaurant-outline" size={normalize(16)} color={MFC.greenText} />
          <AppText variant="bodySmall" color={MFC.ink} style={[styles.bold, tabular]}>
            {`≈ ${formatCount(overview.estimatedMeals)} meals`}
          </AppText>
        </View>
        <View style={styles.estimateDivider} />
        <View style={styles.estimate}>
          <Ionicons name="leaf-outline" size={normalize(16)} color={MFC.greenText} />
          <AppText variant="bodySmall" color={MFC.ink} style={[styles.bold, tabular]}>
            {`≈ ${formatKg(overview.estimatedCo2Kg)} CO₂`}
          </AppText>
        </View>
        <AppText variant="meta" color={MFC.muted} style={styles.estimateTag}>
          Estimated
        </AppText>
      </View>

      <View style={[styles.stack, isTablet && styles.row, isTablet && styles.top]}>
        <MfcCard style={[styles.section, isTablet && styles.flex]}>
          <CardTitle>Where did the food go?</CardTitle>
          <RecoverySplit recoveredKg={overview.recoveredKg} notRecoveredKg={overview.notRecoveredKg} />
        </MfcCard>

        <MfcCard style={[styles.section, isTablet && styles.flex]}>
          <CardTitle>Redistribution destinations</CardTitle>
          <DestinationList destinations={destinations} recoveredKg={overview.recoveredKg} />
        </MfcCard>
      </View>

      <MfcCard style={styles.section}>
        <View style={styles.sectionHead}>
          <CardTitle>Breakdown by category</CardTitle>
          <AppText variant="meta" color={MFC.muted}>
            Select a category for its recovered, not recovered and destination details.
          </AppText>
        </View>
        <View style={styles.sourceList}>
          {rows.map((row) => (
            <SourceRow key={row.source} row={row} onPress={() => onOpenSource(row.source)} />
          ))}
        </View>
      </MfcCard>
    </View>
  );
}

function CardTitle({ children }: { children: string }) {
  return (
    <AppText variant="bodyBold" color={MFC.purple} style={styles.cardTitle} accessibilityRole="header">
      {children}
    </AppText>
  );
}

function MetricCard({
  label,
  kg,
  note,
  tone = 'default',
  size = 'large',
  style,
}: {
  label: string;
  kg: number;
  note: string;
  tone?: 'default' | 'recovered' | 'notRecovered';
  size?: 'large' | 'small';
  style?: object;
}) {
  const colors =
    tone === 'recovered'
      ? { bg: MFC.recoveredBg, border: '#D3EEDC' }
      : tone === 'notRecovered'
        ? { bg: MFC.notRecoveredBg, border: MFC.panelBorder }
        : { bg: MFC.white, border: MFC.panelBorder };
  return (
    <View
      style={[styles.metric, { backgroundColor: colors.bg, borderColor: colors.border }, style]}
      accessible
      accessibilityLabel={`${label}: ${formatKg(kg)}. ${note}`}
    >
      <AppText variant="meta" color={MFC.muted}>
        {label}
      </AppText>
      <View style={styles.metricValue}>
        <AppText
          variant="subheading"
          color={tone === 'recovered' ? MFC.greenText : MFC.purple}
          style={[tabular, size === 'small' ? styles.metricNumberSmall : styles.metricNumber]}
          numberOfLines={1}
        >
          {kgNumber(kg)}
        </AppText>
        <AppText variant="bodySmall" color={MFC.muted} style={styles.bold}>
          kg
        </AppText>
      </View>
      <AppText variant="meta" color={MFC.muted}>
        {note}
      </AppText>
    </View>
  );
}

/** 1,234 or 12.5 (up to 2 decimals). */
function kgNumber(kg: number): string {
  return kg.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function SourceRow({ row, onPress }: { row: InsightsSourceRow; onPress: () => void }) {
  const meta = SOURCE_META[row.source];
  const summary = `${formatKg(row.recordedKg)} total · ${formatKg(row.recoveredKg)} recovered · ${formatKg(row.notRecoveredKg)} not recovered`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}: ${summary}`}
      style={({ pressed }) => [styles.sourceRow, pressed && styles.pressed]}
    >
      <MfcArt art={SOURCE_ART[row.source]} size={60} aspect={4 / 3} radius={8} />
      <View style={styles.flex}>
        <AppText variant="bodySmall" color={MFC.purple} style={styles.bold}>
          {meta.label}
        </AppText>
        <AppText variant="meta" color={MFC.muted} style={tabular}>
          {summary}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={normalize(16)} color={MFC.purple} />
    </Pressable>
  );
}

// ─── What happened to the food? ──────────────────────────────────────────────

function HappenedView({ insights, isTablet }: { insights: InsightsPayload; isTablet: boolean }) {
  const { whatHappened, overview } = insights;
  const base = whatHappened.recordedKg;
  const steps = [
    { label: 'Recorded', kg: whatHappened.recordedKg },
    { label: 'Listed', kg: whatHappened.listedKg },
    { label: 'Claimed', kg: whatHappened.claimedKg },
    { label: 'Collected', kg: whatHappened.collectedKg },
  ];
  const buckets = MFC_NOT_RECOVERED_BUCKETS.map((bucket) => ({
    label: bucket.label,
    kg: whatHappened.notRecovered[bucket.key],
  }));
  const notRecoveredKg = overview.notRecoveredKg;

  return (
    <View style={[styles.stack, isTablet && styles.row, isTablet && styles.top]}>
      <MfcCard style={[styles.section, isTablet && styles.flex]}>
        <CardTitle>From recorded to collected</CardTitle>
        <View style={styles.gap14}>
          {steps.map((step, index) => (
            <BarRow
              key={step.label}
              label={`${index + 1}. ${step.label}`}
              detail={index === 0 ? formatKg(step.kg) : `${formatKg(step.kg)} · ${formatPercent(step.kg, base)} of recorded`}
              value={step.kg}
              max={base}
              color={index === steps.length - 1 ? palette.kale : '#9DC7AB'}
            />
          ))}
        </View>
        <MfcNotice tone="tint" title="Food is not counted as recovered until collection is verified." />
      </MfcCard>

      <MfcCard style={[styles.section, isTablet && styles.flex]}>
        <CardTitle>Not recovered</CardTitle>
        <AppText variant="bodySmall" color={palette.midgray}>
          {`${formatKg(notRecoveredKg)} was not collected. This is where it stopped:`}
        </AppText>
        <View style={styles.gap14}>
          {buckets.map((bucket) => (
            <BarRow
              key={bucket.label}
              label={bucket.label}
              detail={`${formatKg(bucket.kg)} · ${formatPercent(bucket.kg, notRecoveredKg)}`}
              value={bucket.kg}
              max={notRecoveredKg}
              color={MFC_IMPACT_COLORS.notRecovered}
            />
          ))}
        </View>
      </MfcCard>
    </View>
  );
}

// ─── Food redistributed ──────────────────────────────────────────────────────

/** Weekly and daily buckets read as "3 Nov"; monthly ones as "Nov 2026". */
function formatBucket(iso: string, monthly: boolean): string {
  const date = iso.length >= 10 ? iso.slice(0, 10) : iso;
  if (!monthly) return formatDisplayDate(date).replace(/ \d{4}$/, '');
  const [y, m] = date.split('-').map(Number);
  if (!y || !m) return date;
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function RedistributedView({ insights, isTablet }: { insights: InsightsPayload; isTablet: boolean }) {
  const { redistributed, destinations, overview } = insights;
  const from = useMfcInsightsStore((s) => s.from);
  const to = useMfcInsightsStore((s) => s.to);
  const monthly = useMemo(() => {
    const days = (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
    return days > 183;
  }, [from, to]);

  const sites = redistributed.bySite.filter((row) => row.recordedKg > 0 || row.recoveredKg > 0);
  const maxSite = Math.max(0, ...sites.map((row) => row.recoveredKg));
  const maxTrend = Math.max(0, ...redistributed.trend.map((point) => point.recordedKg));

  return (
    <View style={styles.stack}>
      <View style={[styles.stack, isTablet && styles.row, isTablet && styles.top]}>
        <MfcCard style={[styles.section, isTablet && styles.flex]}>
          <CardTitle>By destination</CardTitle>
          <DestinationList destinations={destinations} recoveredKg={overview.recoveredKg} />
        </MfcCard>

        <MfcCard style={[styles.section, isTablet && styles.flex]}>
          <CardTitle>By food category</CardTitle>
          <RecoveredByCategory rows={redistributed.byCategory} />
        </MfcCard>
      </View>

      <View style={[styles.stack, isTablet && styles.row, isTablet && styles.top]}>
        <MfcCard style={[styles.section, isTablet && styles.flex]}>
          <CardTitle>By site</CardTitle>
          {sites.length === 0 ? (
            <MutedLine>No sites have redistributed food in this period yet.</MutedLine>
          ) : (
            <View style={styles.gap14}>
              {sites.map((row) => (
                <BarRow
                  key={row.siteId}
                  label={row.siteName}
                  detail={`${formatKg(row.recoveredKg)} of ${formatKg(row.recordedKg)}`}
                  value={row.recoveredKg}
                  max={maxSite}
                />
              ))}
            </View>
          )}
        </MfcCard>

        <MfcCard style={[styles.section, isTablet && styles.flex]}>
          <CardTitle>Trend over time</CardTitle>
          {redistributed.trend.length === 0 ? (
            <MutedLine>No trend yet for this period.</MutedLine>
          ) : (
            <View style={styles.gap14}>
              {redistributed.trend.map((point) => (
                <BarRow
                  key={point.bucketStart}
                  label={formatBucket(point.bucketStart, monthly)}
                  detail={`${formatKg(point.recoveredKg)} of ${formatKg(point.recordedKg)}`}
                  value={point.recoveredKg}
                  max={maxTrend}
                />
              ))}
            </View>
          )}
          <AppText variant="meta" color={palette.stone}>
            Recovered food as a share of what was recorded.
          </AppText>
        </MfcCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', alignSelf: 'center', gap: 16 },
  bold: { fontFamily: 'Saveful-Bold' },
  cardTitle: { fontFamily: 'Saveful-Bold', fontSize: normalize(17) },
  sourceList: { gap: 10 },
  titleBlock: { gap: 4 },
  noticeAction: { alignSelf: 'flex-start' },
  sectionHead: { gap: 2, marginTop: 4 },
  stack: { gap: 16 },
  cards: { gap: 12 },
  row: { flexDirection: 'row' },
  top: { alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 0 },
  gap14: { gap: 14 },
  section: { gap: 14 },
  metric: {
    borderRadius: 14,
    borderWidth: 1,
    padding: normalize(16),
    gap: 4,
  },
  flex2: { flex: 2 },
  metricNumber: { fontSize: normalize(30), lineHeight: normalize(36) },
  metricNumberSmall: { fontSize: normalize(22), lineHeight: normalize(28) },
  metricValue: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  estimate: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  estimateDivider: { width: 1, height: 18, backgroundColor: MFC.divider },
  estimateTag: { marginLeft: 'auto', fontFamily: 'Saveful-SemiBold' },
  estimates: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: normalize(14),
    borderRadius: 14,
    backgroundColor: MFC.recoveredBg,
  },
  estimateLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: normalize(10),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: MFC.panelBorder,
    backgroundColor: MFC.white,
  },
  sourceRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.strokecream },
  sourceImage: { width: normalize(44), height: normalize(44), resizeMode: 'contain' },
  pressed: { opacity: 0.88 },
});
