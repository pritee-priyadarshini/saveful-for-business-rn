import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  TouchableOpacity,
  ImageSourcePropType,
  Pressable,
  RefreshControl,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Skeleton } from '../../components/Skeleton';
import { HeroHeader } from '@/components/HeroHeader';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../../store/AppContext';
import { useAuthStore } from '../../store/authStore';
import { useImpactAnalytics } from '@/hooks/useImpactAnalytics';
import { ImpactDateFilter } from '@/components/ImpactDateFilter';
import { ImpactSiteSelector } from '@/components/ImpactSiteSelector';
import { SpecificFoodSavings } from '@/components/SpecificFoodSavings';
import type { ImpactFilter } from '@/store/impactStore';
import type { ChartMetricKey, ImpactDisplayStats } from '@/utils/impactData';
import { toLineChartDatasets } from '@/utils/impactData';
import { useBottomTabPadding } from '@/hooks/useBottomTabPadding';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { palette } from '../../theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';

const { width } = Dimensions.get('window');

const ANALYTICS_ICONS = {
  feedCollected: require('../../../assets/placeholder/storage_box_green.png'),
  meals: require('../../../assets/placeholder/cow_front.png'),
  co2: require('../../../assets/placeholder/co2_green_icon.png'),
  collections: require('../../../assets/placeholder/truck_icon.png'),
  rating: require('../../../assets/placeholder/rating_icon.png'),
};

const formatNumber = (value: number) => value.toLocaleString('en-US');

type TimeRange = 'week' | 'month' | 'year';
type ImpactMetric = 'feedCollected' | 'mealsCreated' | 'co2Avoided' | 'collectionsCompleted';

const METRIC_TO_CHART: Record<ImpactMetric, ChartMetricKey> = {
  feedCollected: 'food',
  mealsCreated: 'meals',
  co2Avoided: 'co2',
  collectionsCompleted: 'collections',
};

function formatRating(rating: number | null): string {
  return rating != null ? `${rating}/5` : '—';
}

function toFarmerStats(stats: ImpactDisplayStats) {
  return {
    feedCollectedKg: stats.redistributedKg,
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
  { key: 'feedCollected', label: 'Feed Collected', suffix: 'kg' },
  { key: 'mealsCreated', label: 'Meals created' },
  { key: 'co2Avoided', label: 'CO2 Avoided', suffix: 'kg' },
  { key: 'collectionsCompleted', label: 'Collections Completed' },
];

export function FarmerAnalyticsScreen() {
  useTransparentStatusBar('light');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { currentProfile, authUser } = useAppContext();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const bottomPadding = useBottomTabPadding(hp(2));
  const businessLogo =
    currentProfile.logo || authUser?.profile?.organisation?.logoUrl || null;

  const [filter, setFilter] = React.useState<ImpactFilter>({ mode: 'all_time' });
  const [selectedSiteId, setSelectedSiteId] = React.useState<number | null>(null);
  const [range, setRange] = React.useState<TimeRange>('week');
  const [selectedMetric, setSelectedMetric] = React.useState<ImpactMetric>('feedCollected');
  const [refreshing, setRefreshing] = React.useState(false);
  const [foodsRefreshNonce, setFoodsRefreshNonce] = React.useState(0);

  React.useEffect(() => {
    refreshProfile().catch(() => undefined);
  }, [refreshProfile]);

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
      await Promise.all([reload(), refreshProfile()]);
      setFoodsRefreshNonce((n) => n + 1);
    } finally {
      setRefreshing(false);
    }
  }, [reload, refreshProfile]);

  const chartSeries = getChartSeries(METRIC_TO_CHART[selectedMetric]);
  const activeMetric = IMPACT_METRICS.find((m) => m.key === selectedMetric)!;
  const displayStats = toFarmerStats(stats);

  const organization = currentProfile.organization || 'Your farm';

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={hp(22)} borderRadius={0} />
      <View style={styles.skeletonBody}>
        <Skeleton width="100%" height={normalize(48)} borderRadius={normalize(12)} />
        <Skeleton width="100%" height={hp(24)} borderRadius={normalize(12)} />
        <Skeleton width="100%" height={hp(30)} borderRadius={normalize(12)} />
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <ScrollView
          contentContainerStyle={styles.container}
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
          {renderSkeleton()}
        </ScrollView>
      </Screen>
    );
  }

  const renderMetricCard = (icon: ImageSourcePropType, value: string, label: string) => (
    <View style={styles.metricCard}>
      <View style={styles.metricIconWrap}>
        <Image source={icon} style={styles.metricIcon} resizeMode="contain" />
      </View>
      <View style={styles.metricContent}>
        <AppText variant="h8" style={styles.metricValue} numberOfLines={1}>
          {value}
        </AppText>
        <AppText variant="caption" style={styles.metricLabel} numberOfLines={2}>
          {label}
        </AppText>
      </View>
    </View>
  );

  const renderImpactMetricsSection = (title: string, stats: ReturnType<typeof toFarmerStats>) => (
    <>
      <AppText variant="h8" style={styles.sectionTitle}>
        {title}
      </AppText>

      <View style={styles.metricsGrid}>
        <View style={styles.metricsRow}>
          {renderMetricCard(
            ANALYTICS_ICONS.feedCollected,
            `${formatNumber(stats.feedCollectedKg)} kg`,
            'Feed Collected',
          )}
          {renderMetricCard(
            ANALYTICS_ICONS.meals,
            formatNumber(stats.mealsCreated),
            'Meals Collected',
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
          <View style={styles.ratingCard}>
            <View style={styles.metricIconWrap}>
              <Image source={ANALYTICS_ICONS.rating} style={styles.ratingIcon} resizeMode="contain" />
            </View>
            <View style={styles.metricContent}>
              <AppText variant="h8" style={styles.metricValue}>
                {formatRating(stats.rating)}
              </AppText>
              <AppText variant="caption" style={styles.metricLabel}>
                Rating
              </AppText>
            </View>
          </View>
        </View>
      </View>
    </>
  );

  return (
    <Screen backgroundColor={palette.creme} transparentTop scrollable={false}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: bottomPadding }]}
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
          height={hp(22)}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroTextBlock}>
                <AppText variant="caption" style={styles.heroEyebrow} numberOfLines={1}>
                  {organization}
                </AppText>
                <AppText variant="h6" style={styles.heroTitle} numberOfLines={1}>
                  Your insights
                </AppText>
                <AppText variant="bodySmall" style={styles.heroSubtitle} numberOfLines={2}>
                  See the difference your collections make
                </AppText>
              </View>

              <Pressable
                style={styles.heroIconCircle}
                onPress={() => navigation.navigate('Account')}
                accessibilityRole="button"
                accessibilityLabel="Open account profile"
              >
                {businessLogo ? (
                  <Image
                    key={businessLogo}
                    source={{ uri: businessLogo }}
                    style={styles.logoImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="bar-chart" size={normalize(26)} color={palette.eggplant} />
                )}
              </Pressable>
            </View>

            <View style={styles.heroStatsPill}>
              <Ionicons name="leaf-outline" size={normalize(14)} color={palette.white} />
              <AppText variant="caption" style={styles.heroStatsText} numberOfLines={1}>
                {selectedSiteId == null && isMultiSite ? 'All sites · ' : ''}
                {formatNumber(displayStats.mealsCreated)} meals ·{' '}
                {formatNumber(displayStats.feedCollectedKg)} kg · {filterLabel}
              </AppText>
            </View>
          </View>
        </HeroHeader>

        <View style={styles.mainContent}>
          <Pressable
            style={styles.ctaButton}
            onPress={() => navigation.navigate('FarmerHistory')}
          >
            <AppText variant="bodyLarge" style={styles.ctaText}>
              View Collections History
            </AppText>
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
            <AppText variant="bodyBold" style={styles.chartSectionTitle}>
              Impact over time
            </AppText>

            <View style={styles.timeFilterRow}>
              {TIME_RANGES.map(({ key, label }) => {
                const isActive = range === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setRange(key)}
                    activeOpacity={0.8}
                    style={[styles.timeFilterPill, isActive && styles.filterPillActive]}
                  >
                    <AppText
                      style={[styles.filterPillText, isActive && styles.filterPillTextActive]}
                    >
                      {label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.metricFilterScroll}
            >
              {IMPACT_METRICS.map(({ key, label }) => {
                const isActive = selectedMetric === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setSelectedMetric(key)}
                    activeOpacity={0.8}
                    style={[styles.metricFilterPill, isActive && styles.filterPillActive]}
                  >
                    <AppText
                      style={[styles.metricFilterPillText, isActive && styles.filterPillTextActive]}
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.chartContainer}>
              <LineChart
                key={`${range}-${selectedMetric}-${selectedSiteId ?? 'all'}`}
                data={{
                  labels: chartSeries.labels,
                  datasets: toLineChartDatasets(chartSeries.values),
                }}
                width={width - wp(10) - wp(8)}
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
                  <AppText variant="caption" style={styles.chartEmptyText}>
                    Updating…
                  </AppText>
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
    fontSize: normalize(13),
  },
  heroTitle: {
    color: palette.white,
    textTransform: 'none',
    fontSize: normalize(30),
    lineHeight: normalize(38),
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'none',
    fontSize: normalize(15),
    lineHeight: normalize(22),
  },
  heroIconCircle: {
    width: normalize(52),
    height: normalize(52),
    borderRadius: normalize(26),
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
    fontSize: normalize(13),
  },
  mainContent: {
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    gap: hp(2),
    paddingBottom: hp(1),
  },
  siteSelectorSlot: {
    marginBottom: hp(0.5),
  },
  sectionTitle: {
    color: palette.black,
    textTransform: 'none',
    marginTop: hp(0.5),
  },
  chartSectionTitle: {
    fontSize: normalize(18),
    textTransform: 'none',
    color: palette.black,
    letterSpacing: 0.2,
  },
  metricsGrid: {
    gap: hp(1.2),
  },
  metricsRow: {
    flexDirection: 'row',
    gap: wp(2.5),
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
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
    borderRadius: normalize(20),
    borderWidth: 1,
    borderColor: palette.strokecream,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
    gap: hp(1.2),
  },
  timeFilterRow: {
    flexDirection: 'row',
    width: '100%',
    gap: wp(2),
  },
  metricFilterScroll: {
    flexDirection: 'row',
    gap: wp(2),
    paddingVertical: hp(0.2),
  },
  timeFilterPill: {
    flex: 1,
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
    borderRadius: normalize(20),
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.strokecream,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: normalize(38),
  },
  metricFilterPill: {
    minWidth: 0,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.9),
    borderRadius: normalize(20),
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.strokecream,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: normalize(36),
  },
  filterPillActive: {
    backgroundColor: palette.eggplant,
    borderColor: palette.eggplant,
  },
  filterPillText: {
    color: palette.stone,
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: normalize(13),
    lineHeight: normalize(18),
    fontFamily: 'Saveful-Bold',
    textAlign: 'center',
  },
  metricFilterPillText: {
    color: palette.stone,
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: normalize(13),
    lineHeight: normalize(18),
    fontFamily: 'Saveful-Bold',
    textAlign: 'center',
  },
  filterPillTextActive: {
    color: palette.white,
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
  ctaButton: {
    backgroundColor: palette.eggplant,
    borderRadius: normalize(16),
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(5),
    alignItems: 'center',
  },
  ctaText: {
    color: palette.white,
    textTransform: 'none',
  },
  skeletonWrap: {
    gap: hp(1.2),
    paddingBottom: hp(3),
  },
  skeletonBody: {
    padding: wp(5),
    gap: hp(1.5),
  },
});