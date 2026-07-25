import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  ImageSourcePropType,
  Pressable,
  RefreshControl,
  useWindowDimensions,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Skeleton } from '../../components/Skeleton';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../../store/AppContext';
import { useImpactAnalytics } from '@/hooks/useImpactAnalytics';
import { ImpactDateFilter } from '@/components/ImpactDateFilter';
import { ImpactSiteSelector } from '@/components/ImpactSiteSelector';
import { SpecificFoodSavings } from '@/components/SpecificFoodSavings';
import type { ImpactFilter } from '@/store/impactStore';
import type { ChartMetricKey, ImpactDisplayStats } from '@/utils/impactData';
import { toLineChartDatasets } from '@/utils/impactData';
import { useBottomTabPadding, useSafeBottomPadding } from '@/hooks/useBottomTabPadding';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { palette } from '../../theme/colors';
import { elevation } from '@/theme/elevation';
import { StatusBar } from 'expo-status-bar';
import { HeroHeader } from '@/components/HeroHeader';
import { Ionicons } from '@expo/vector-icons';
import { hp, normalize, useResponsiveLayout, wp } from '@/utils/responsive';
import { buildDashboardShellStyles, dashboardChartWidth } from '@/utils/dashboardAdaptive';

const ANALYTICS_ICONS = {
  foodRecovered: require('../../../assets/placeholder/storage_box_green.png'),
  meals: require('../../../assets/placeholder/cutlery_icon.png'),
  co2: require('../../../assets/placeholder/co2_green_icon.png'),
  collections: require('../../../assets/placeholder/truck_icon.png'),
  rating: require('../../../assets/placeholder/rating_icon.png'),
};

const formatNumber = (value: number) => value.toLocaleString('en-US');

type TimeRange = 'week' | 'month' | 'year';
type ImpactMetric = 'foodRecovered' | 'mealsCreated' | 'co2Avoided' | 'collectionsCompleted';

const METRIC_TO_CHART: Record<ImpactMetric, ChartMetricKey> = {
  foodRecovered: 'food',
  mealsCreated: 'meals',
  co2Avoided: 'co2',
  collectionsCompleted: 'collections',
};

function formatRating(rating: number | null): string {
  return rating != null ? `${rating}/5` : '—';
}

function toCharityStats(stats: ImpactDisplayStats) {
  return {
    foodRecoveredKg: stats.redistributedKg,
    mealsCreated: stats.mealsCreated,
    co2AvoidedKg: stats.co2AvoidedKg,
    collectionsCompleted: stats.collectionsCompleted,
    rating: stats.rating,
  };
}

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const IMPACT_METRICS: { key: ImpactMetric; label: string; suffix?: string }[] = [
  { key: 'foodRecovered', label: 'Food recovered', suffix: 'kg' },
  { key: 'mealsCreated', label: 'Meals created' },
  { key: 'co2Avoided', label: 'CO2 Avoided', suffix: 'kg' },
  { key: 'collectionsCompleted', label: 'Collections Completed' },
];

export function CharityAnalyticsScreen({
  variant = 'tab',
}: {
  variant?: 'tab' | 'stack';
} = {}) {
  useTransparentStatusBar('light');
  const r = useResponsiveLayout();
  const adaptive = React.useMemo(
    () => buildDashboardShellStyles(r, { heroPhoneHp: 22, stackHero: variant === 'stack' }),
    [r, variant],
  );
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { currentProfile } = useAppContext();
  const { width } = useWindowDimensions();
  const chartWidth = dashboardChartWidth(r, width);
  const tabBottomPadding = useBottomTabPadding(r.isTablet ? 24 : hp(2));
  const stackBottomPadding = useSafeBottomPadding(r.isTablet ? 32 : hp(4));
  const bottomPadding = variant === 'stack' ? stackBottomPadding : tabBottomPadding;

  const [filter, setFilter] = React.useState<ImpactFilter>({ mode: 'all_time' });
  /** null = All sites (aggregated). */
  const [selectedSiteId, setSelectedSiteId] = React.useState<number | null>(null);
  const [range, setRange] = React.useState<TimeRange>('week');
  const [selectedMetric, setSelectedMetric] = React.useState<ImpactMetric>('mealsCreated');
  const [refreshing, setRefreshing] = React.useState(false);
  const [foodsRefreshNonce, setFoodsRefreshNonce] = React.useState(0);

  const {
    loading,
    chartLoading,
    sitesLoading,
    stats,
    getChartSeries,
    sites,
    isMultiSite,
    reload,
    filterLabel,
  } = useImpactAnalytics({ filter, chartPeriod: range, siteId: selectedSiteId });

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
      setFoodsRefreshNonce((n) => n + 1);
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  const chartSeries = getChartSeries(METRIC_TO_CHART[selectedMetric]);
  const activeMetric = IMPACT_METRICS.find((m) => m.key === selectedMetric)!;
  const displayStats = toCharityStats(stats);

  const organization = currentProfile.organization || 'Your charity';

  const renderMetricCard = (
    icon: ImageSourcePropType,
    value: string,
    label: string,
    wrapperStyle?: ViewStyle,
  ) => (
    <View style={[styles.metricCard, adaptive.metricCard, wrapperStyle]}>
      <View style={styles.metricIconWrap}>
        <Image source={icon} style={styles.metricIcon} resizeMode="contain" />
      </View>
      <View style={styles.metricContent}>
        <AppText variant="h8" style={[styles.metricValue, adaptive.metricValue]} numberOfLines={1}>
          {value}
        </AppText>
        <AppText variant="caption" style={[styles.metricLabel, adaptive.metricLabel]} numberOfLines={2}>
          {label}
        </AppText>
      </View>
    </View>
  );

  const renderImpactMetricsSection = (title: string, stats: ReturnType<typeof toCharityStats>) => (
    <>
      <AppText variant="h8" style={[styles.sectionTitle, adaptive.sectionTitle]}>
        {title}
      </AppText>

      <View style={styles.metricsGrid}>
        {r.isTablet ? (
          <View style={adaptive.metricsWrap}>
            {renderMetricCard(
              ANALYTICS_ICONS.foodRecovered,
              `${formatNumber(stats.foodRecoveredKg)} kg`,
              'Food Recovered',
              adaptive.metricGridItem,
            )}
            {renderMetricCard(
              ANALYTICS_ICONS.meals,
              formatNumber(stats.mealsCreated),
              'Meals created',
              adaptive.metricGridItem,
            )}
            {renderMetricCard(
              ANALYTICS_ICONS.co2,
              `${formatNumber(stats.co2AvoidedKg)} kg`,
              'Total CO2 avoided',
              adaptive.metricGridItem,
            )}
            {renderMetricCard(
              ANALYTICS_ICONS.collections,
              formatNumber(stats.collectionsCompleted),
              'Collections completed',
              adaptive.metricGridItem,
            )}
            {renderMetricCard(
              ANALYTICS_ICONS.rating,
              formatRating(stats.rating),
              'Rating',
              adaptive.metricGridItem,
            )}
          </View>
        ) : (
          <>
            <View style={styles.metricsRow}>
              {renderMetricCard(
                ANALYTICS_ICONS.foodRecovered,
                `${formatNumber(stats.foodRecoveredKg)} kg`,
                'Food Recovered',
              )}
              {renderMetricCard(
                ANALYTICS_ICONS.meals,
                formatNumber(stats.mealsCreated),
                'Meals created',
              )}
            </View>

            <View style={styles.metricsRow}>
              {renderMetricCard(
                ANALYTICS_ICONS.co2,
                `${formatNumber(stats.co2AvoidedKg)} kg`,
                'Total CO2 avoided',
              )}
              {renderMetricCard(
                ANALYTICS_ICONS.collections,
                formatNumber(stats.collectionsCompleted),
                'Collections completed',
              )}
            </View>

            <View style={styles.ratingRow}>
              <View style={[styles.ratingCard, adaptive.metricCard]}>
                <View style={styles.metricIconWrap}>
                  <Image source={ANALYTICS_ICONS.rating} style={styles.ratingIcon} resizeMode="contain" />
                </View>
                <View style={styles.metricContent}>
                  <AppText variant="h8" style={[styles.metricValue, adaptive.metricValue]}>
                    {formatRating(stats.rating)}
                  </AppText>
                  <AppText variant="caption" style={[styles.metricLabel, adaptive.metricLabel]}>
                    Rating
                  </AppText>
                </View>
              </View>
            </View>
          </>
        )}
      </View>
    </>
  );

  const renderTimeChip = (key: TimeRange, label: string) => {
    const active = range === key;
    return (
      <Pressable
        key={key}
        onPress={() => setRange(key)}
        style={[
          styles.filterChip,
          adaptive.filterChip,
          active ? styles.filterChipActive : styles.filterChipInactive,
        ]}
      >
        <AppText
          variant="bodyBold"
          style={[
            styles.filterChipText,
            adaptive.filterChipText,
            { color: active ? palette.white : palette.stone },
          ]}
          numberOfLines={1}
        >
          {label}
        </AppText>
      </Pressable>
    );
  };

  const renderMetricChip = (key: ImpactMetric, label: string) => {
    const active = selectedMetric === key;
    return (
      <Pressable
        key={key}
        onPress={() => setSelectedMetric(key)}
        style={[
          styles.metricChip,
          adaptive.filterChip,
          active ? styles.filterChipActive : styles.filterChipInactive,
        ]}
      >
        <AppText
          variant="bodyBold"
          style={[
            styles.filterChipText,
            adaptive.filterChipText,
            { color: active ? palette.white : palette.stone },
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {label}
        </AppText>
      </Pressable>
    );
  };

  if (loading && !refreshing) {
    return (
      <Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: bottomPadding }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[palette.primary]}
              tintColor={palette.primary}
            />
          }
        >
          <Skeleton width="100%" height={adaptive.heroHeight} borderRadius={0} />
          <View style={{ padding: wp(5), gap: hp(1.5) }}>
            <Skeleton width="100%" height={normalize(52)} borderRadius={normalize(14)} />
            <Skeleton width="100%" height={hp(28)} borderRadius={normalize(14)} />
            <Skeleton width="100%" height={hp(32)} borderRadius={normalize(14)} />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={palette.creme} transparentTop scrollable={false}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          adaptive.scrollContent,
          { paddingBottom: bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        bounces
        alwaysBounceVertical
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[palette.primary]}
            tintColor={palette.primary}
          />
        }
      >
        <HeroHeader
          source={require('../../../assets/placeholder/kale-header.png')}
          height={adaptive.heroHeight}
          style={adaptive.heroBleed}
        >
          <View
            style={[
              styles.heroContent,
              variant === 'stack' && styles.heroContentWithBack,
              adaptive.heroContent,
            ]}
          >
            {variant === 'stack' ? (
              <Pressable
                onPress={() => navigation.goBack()}
                style={[
                  styles.heroBackBtnAbsolute,
                  r.isTablet && { left: r.pagePadH, top: 20 },
                ]}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={22} color={palette.white} />
              </Pressable>
            ) : null}

            <View style={styles.heroTopRow}>
              <View style={styles.heroTextBlock}>
                <AppText
                  variant="caption"
                  style={[styles.heroEyebrow, adaptive.heroEyebrow]}
                  numberOfLines={1}
                >
                  {organization}
                </AppText>
                <AppText
                  variant="h6"
                  style={[styles.heroTitle, adaptive.heroTitle]}
                  numberOfLines={1}
                >
                  Your insights
                </AppText>
                <AppText
                  variant="bodySmall"
                  style={[styles.heroSubtitle, adaptive.heroSubtitle]}
                  numberOfLines={2}
                >
                  See the difference your surplus makes
                </AppText>
              </View>

              <Pressable
                style={[styles.heroIconCircle, adaptive.heroIconCircle]}
                onPress={() => navigation.navigate('Account')}
                accessibilityRole="button"
                accessibilityLabel="Open account profile"
              >
                {currentProfile.logo ? (
                  <Image
                    source={{ uri: currentProfile.logo }}
                    style={styles.logoImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="bar-chart" size={26} color={palette.eggplant} />
                )}
              </Pressable>
            </View>

            <View style={[styles.heroStatsPill, adaptive.heroStatsPill]}>
              <Ionicons name="leaf-outline" size={14} color={palette.white} />
              <AppText
                variant="caption"
                style={[styles.heroStatsText, adaptive.heroStatsText]}
                numberOfLines={1}
              >
                {selectedSiteId == null && isMultiSite ? 'All sites · ' : ''}
                {formatNumber(displayStats.mealsCreated)} meals ·{' '}
                {formatNumber(displayStats.foodRecoveredKg)} kg · {filterLabel}
              </AppText>
            </View>
          </View>
        </HeroHeader>

        <View style={[styles.mainContent, adaptive.mainContent]}>
          <Pressable
            style={({ pressed }) => [
              styles.createBtn,
              adaptive.createBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => navigation.navigate('CharityHistory')}
          >
            <View style={styles.createBtnLeft}>
              <View style={[styles.createBtnIconWrap, adaptive.createBtnIconWrap]}>
                <Ionicons name="time-outline" size={16} color={palette.white} />
              </View>
              <AppText
                variant="bodyBold"
                style={[styles.createBtnText, adaptive.createBtnText]}
                numberOfLines={1}
              >
                View Collections History
              </AppText>
            </View>
            <Ionicons name="arrow-forward" size={16} color={palette.white} />
          </Pressable>

          <View style={styles.siteSelectorSlot}>
            <ImpactSiteSelector
              sites={sites}
              selectedSiteId={selectedSiteId}
              onChange={setSelectedSiteId}
              loading={sitesLoading}
              includeAllSites
              label="Site"
            />
          </View>
          <ImpactDateFilter filter={filter} onChange={setFilter} />
          {renderImpactMetricsSection(
            filter.mode === 'all_time' ? 'All-time impact' : `Impact · ${filterLabel}`,
            displayStats,
          )}

          <View style={styles.chartCard}>
            <AppText variant="bodyBold" style={[styles.sectionTitle, adaptive.sectionTitle]}>
              Impact over time
            </AppText>

            <View style={styles.filterRow}>
              {TIME_RANGES.map(({ key, label }) => renderTimeChip(key, label))}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.metricFilterRow}
            >
              {IMPACT_METRICS.map(({ key, label }) => renderMetricChip(key, label))}
            </ScrollView>

            <View style={styles.chartContainer}>
              <LineChart
                key={`${range}-${selectedMetric}-${selectedSiteId ?? 'all'}`}
                data={{
                  labels: chartSeries.labels,
                  datasets: toLineChartDatasets(chartSeries.values),
                }}
                width={chartWidth}
                height={hp(24)}
                yAxisSuffix={activeMetric.suffix ? ` ${activeMetric.suffix}` : ''}
                yLabelsOffset={4}
                chartConfig={{
                  ...chartConfig,
                  decimalPlaces:
                    selectedMetric === 'mealsCreated' ||
                    selectedMetric === 'collectionsCompleted'
                      ? 1
                      : 0,
                }}
                bezier
                fromZero
                segments={4}
                withInnerLines
                withOuterLines={false}
                withVerticalLines
                withHorizontalLines
                style={StyleSheet.flatten([
                  styles.chart,
                  chartLoading && styles.chartDimmed,
                ])}
              />
              {chartLoading ? (
                <View style={styles.chartLoadingOverlay}>
                  <ActivityIndicator size="small" color={palette.kale} />
                </View>
              ) : null}
            </View>
          </View>

          <SpecificFoodSavings
            filter={filter}
            siteId={selectedSiteId}
            peoplePercent={stats.peoplePercent}
            animalPercent={stats.animalPercent}
            refreshNonce={foodsRefreshNonce}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const chartConfig = {
  backgroundGradientFrom: palette.white,
  backgroundGradientTo: palette.white,
  decimalPlaces: 0,
  color: () => palette.kale,
  labelColor: () => palette.midgray,
  fillShadowGradientFrom: palette.middlegreen,
  fillShadowGradientTo: palette.white,
  fillShadowGradientFromOpacity: 0.3,
  fillShadowGradientToOpacity: 0.01,
  strokeWidth: 2,
  propsForDots: {
    r: '5',
    strokeWidth: '0',
    stroke: palette.kale,
    fill: palette.kale,
  },
  propsForBackgroundLines: {
    strokeDasharray: '4 4',
    stroke: '#D8E8DC',
    strokeWidth: 1,
  },
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    marginTop: -hp(2),
  },
  heroContent: {
    flex: 1,
    paddingHorizontal: wp(5),
    justifyContent: 'flex-end',
    paddingBottom: hp(3),
    gap: hp(1.2),
  },
  heroContentWithBack: {
    paddingTop: normalize(56),
  },
  heroBackBtnAbsolute: {
    position: 'absolute',
    top: hp(1.6),
    left: wp(5),
    zIndex: 5,
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: wp(3),
  },
  heroTextBlock: {
    flex: 1,
    gap: hp(0.3),
    minWidth: 0,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'none',
    letterSpacing: 0.3,
    fontSize: normalize(12),
  },
  heroTitle: {
    color: palette.white,
    textTransform: 'none',
    fontSize: normalize(26),
    lineHeight: normalize(34),
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'none',
    fontSize: normalize(14),
    lineHeight: normalize(20),
  },
  heroIconCircle: {
    width: normalize(52),
    height: normalize(52),
    borderRadius: normalize(26),
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...elevation.soft,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  heroStatsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: wp(1.5),
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingVertical: hp(0.6),
    paddingHorizontal: wp(3),
    borderRadius: normalize(20),
    maxWidth: '100%',
  },
  heroStatsText: {
    color: palette.white,
    flexShrink: 1,
    textTransform: 'none',
    fontSize: normalize(11),
    lineHeight: normalize(15),
  },
  mainContent: {
    paddingHorizontal: wp(5),
    paddingTop: hp(1.2),
    gap: hp(1.2),
    paddingBottom: hp(0.8),
    marginTop: -hp(1.5),
  },
  siteSelectorSlot: {
    marginBottom: hp(0.5),
  },
  createBtn: {
    backgroundColor: palette.eggplant,
    borderRadius: normalize(14),
    height: 46,
    minHeight: 46,
    maxHeight: 46,
    marginTop: hp(1.2),
    paddingVertical: 0,
    paddingHorizontal: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    ...elevation.flat,
  },
  createBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    flex: 1,
    minWidth: 0,
  },
  createBtnIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  createBtnText: {
    color: palette.white,
    textTransform: 'none',
    fontSize: normalize(15),
    lineHeight: normalize(20),
    includeFontPadding: false,
  },
  sectionTitle: {
    fontSize: normalize(16),
    lineHeight: normalize(22),
    textTransform: 'none',
    color: palette.black,
    letterSpacing: 0.2,
  },
  metricsGrid: {
    gap: hp(1.2),
  },
  metricsRow: {
    flexDirection: 'row',
    gap: wp(2),
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: palette.white,
    borderRadius: normalize(14),
    borderWidth: 1,
    borderColor: palette.strokecream,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    ...elevation.flat,
  },
  metricIconWrap: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIcon: {
    width: normalize(28),
    height: normalize(28),
  },
  metricContent: {
    flex: 1,
    minWidth: 0,
  },
  metricValue: {
    color: palette.kale,
    textTransform: 'none',
    letterSpacing: 0,
  },
  metricLabel: {
    color: palette.midgray,
    textTransform: 'none',
    marginTop: hp(0.2),
    letterSpacing: 0,
  },
  ratingRow: {
    flexDirection: 'row',
  },
  ratingCard: {
    flex: 1,
    maxWidth: '48.5%',
    backgroundColor: palette.white,
    borderRadius: normalize(16),
    borderWidth: 1,
    borderColor: palette.strokecream,
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  ratingIcon: {
    width: normalize(24),
    height: normalize(24),
  },
  chartCard: {
    backgroundColor: palette.white,
    borderRadius: normalize(14),
    borderWidth: 1,
    borderColor: palette.strokecream,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.3),
    gap: hp(1),
    ...elevation.flat,
  },
  filterRow: {
    flexDirection: 'row',
    gap: wp(2),
  },
  metricFilterRow: {
    flexDirection: 'row',
    gap: wp(2),
    paddingVertical: hp(0.2),
  },
  filterChip: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 7,
    paddingHorizontal: wp(2),
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  metricChip: {
    minWidth: 0,
    paddingVertical: 7,
    paddingHorizontal: wp(3),
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: palette.eggplant,
    borderColor: palette.eggplant,
  },
  filterChipInactive: {
    backgroundColor: palette.white,
    borderColor: palette.strokecream,
  },
  filterChipText: {
    fontSize: normalize(12),
    lineHeight: normalize(16),
    textTransform: 'none',
  },
  chartContainer: {
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    minHeight: hp(24),
    justifyContent: 'center',
  },
  chartEmptyText: {
    color: palette.midgray,
    textAlign: 'center',
    textTransform: 'none',
  },
  chartLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  chartDimmed: {
    opacity: 0.55,
  },
  chart: {
    borderRadius: normalize(12),
    marginLeft: -wp(2),
  },
  pressed: {
    opacity: 0.82,
  },
});
