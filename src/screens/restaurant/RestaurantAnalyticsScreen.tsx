import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ImageSourcePropType,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { HeroHeader } from '../../components/HeroHeader';
import { Skeleton } from '../../components/Skeleton';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { useBottomTabPadding } from '@/hooks/useBottomTabPadding';
import { HeaderAddressRow } from '@/components/HeaderAddressRow';
import { useImpactAnalytics } from '@/hooks/useImpactAnalytics';
import { useAppContext } from '../../store/AppContext';
import type { ChartMetricKey, ImpactDisplayStats } from '@/utils/impactData';

import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';

const ANALYTICS_ICONS = {
  redistributed: require('../../../assets/placeholder/veggie_basket_icon.png'),
  meals: require('../../../assets/placeholder/cutlery_icon.png'),
  co2: require('../../../assets/placeholder/co2_green_icon.png'),
  money: require('../../../assets/placeholder/money_icon.png'),
  collections: require('../../../assets/placeholder/truck_icon.png'),
  charities: require('../../../assets/placeholder/charity_green.png'),
  people: require('../../../assets/placeholder/people_icon.png'),
  animals: require('../../../assets/placeholder/cow_front.png'),
  foodPeople: require('../../../assets/placeholder/storage_box_green.png'),
  foodAnimals: require('../../../assets/placeholder/storage_box_orange.png'),
  rating: require('../../../assets/placeholder/rating_icon.png'),
};

const formatNumber = (value: number) => value.toLocaleString('en-US');

type TimeRange = 'week' | 'month' | 'year';
type ImpactMetric = 'foodRedistributed' | 'mealsCreated' | 'co2Avoided' | 'collectionsCompleted';

const METRIC_TO_CHART: Record<ImpactMetric, ChartMetricKey> = {
  foodRedistributed: 'food',
  mealsCreated: 'meals',
  co2Avoided: 'co2',
  collectionsCompleted: 'collections',
};

function formatRating(rating: number | null): string {
  return rating != null ? `${rating}/5` : '—';
}

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const IMPACT_METRICS: { key: ImpactMetric; label: string; suffix?: string }[] = [
  { key: 'foodRedistributed', label: 'Food', suffix: 'kg' },
  { key: 'mealsCreated', label: 'Meals' },
  { key: 'co2Avoided', label: 'CO₂', suffix: 'kg' },
  { key: 'collectionsCompleted', label: 'Collections' },
];

const cardShadow = Platform.select({
  ios: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: {
    elevation: 3,
  },
});

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

export function RestaurantAnalyticsScreen({ navigation }: any) {
  useTransparentStatusBar('light');
  const bottomPadding = useBottomTabPadding(hp(2));
  const { width } = useWindowDimensions();
  const { currentProfile } = useAppContext();

  const [range, setRange] = React.useState<TimeRange>('week');
  const [selectedMetric, setSelectedMetric] = React.useState<ImpactMetric>('mealsCreated');

  const {
    loading,
    monthStats,
    lifetimeStats,
    getChartSeries,
    isMultiSite,
  } = useImpactAnalytics({ chartPeriod: range });

  const chartSeries = getChartSeries(METRIC_TO_CHART[selectedMetric]);
  const activeMetric = IMPACT_METRICS.find((m) => m.key === selectedMetric)!;
  const chartWidth = width - wp(10) - wp(8);

  const renderMetricCard = (icon: ImageSourcePropType, value: string, label: string, accent = palette.kale) => (
    <View style={styles.metricCard}>
      <View style={[styles.metricIconWrap, { backgroundColor: accent === palette.orange ? '#FFF3E4' : '#E8F3EC' }]}>
        <Image source={icon} style={styles.metricIcon} resizeMode="contain" />
      </View>
      <View style={styles.metricContent}>
        <AppText variant="bodyBold" style={[styles.metricValue, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </AppText>
        <AppText variant="caption" style={styles.metricLabel} numberOfLines={2}>
          {label}
        </AppText>
      </View>
    </View>
  );

  const renderImpactMetricsSection = (title: string, stats: ImpactDisplayStats) => {
    const progressFillStyles = StyleSheet.create({
      people: { width: `${stats.peoplePercent}%` },
      animals: { width: `${stats.animalPercent}%` },
    });
    const partnersLabel = stats.mode === 'RECEIVER' ? 'Donors' : 'Charities';

    return (
      <View style={styles.section}>
        <AppText variant="bodyBold" style={styles.sectionTitle}>
          {title}
        </AppText>

        <View style={styles.metricsGrid}>
          <View style={styles.metricsRow}>
            {renderMetricCard(
              ANALYTICS_ICONS.redistributed,
              `${formatNumber(stats.redistributedKg)} kg`,
              'Redistributed',
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
              'CO₂ avoided',
            )}
            {renderMetricCard(
              ANALYTICS_ICONS.money,
              `$${formatNumber(stats.foodSavedMoney)}`,
              'Food saved',
            )}
          </View>

          <View style={styles.metricsRow}>
            {renderMetricCard(
              ANALYTICS_ICONS.collections,
              formatNumber(stats.collectionsCompleted),
              'Collections',
            )}
            {renderMetricCard(
              ANALYTICS_ICONS.charities,
              formatNumber(stats.partnersSupported),
              partnersLabel,
            )}
          </View>

          <View style={styles.impactSplitRow}>
            <View style={[styles.splitCard, styles.peopleSplitCard]}>
              <View style={[styles.splitCardHeader, { backgroundColor: '#F0F8F3' }]}>
                <Image source={ANALYTICS_ICONS.people} style={styles.splitBadgeIcon} resizeMode="contain" />
                <AppText variant="caption" style={styles.splitBadgeTextPeople}>
                  For people
                </AppText>
              </View>
              <View style={styles.splitCardBody}>
                <View style={styles.impactValueRow}>
                  <Image source={ANALYTICS_ICONS.foodPeople} style={styles.impactFoodIcon} resizeMode="contain" />
                  <AppText variant="bodyBold" style={styles.peopleValue} numberOfLines={1} adjustsFontSizeToFit>
                    {formatNumber(stats.peopleKg)} kg
                  </AppText>
                </View>
                <AppText variant="caption" style={styles.impactSubLabel}>
                  Food donated
                </AppText>
                <View style={styles.progressRow}>
                  <View style={styles.progressTrackPeople}>
                    <View style={[styles.progressFillPeople, progressFillStyles.people]} />
                  </View>
                  <AppText variant="caption" style={styles.percentText}>
                    {stats.peoplePercent}%
                  </AppText>
                </View>
              </View>
            </View>

            <View style={[styles.splitCard, styles.animalsSplitCard]}>
              <View style={[styles.splitCardHeader, { backgroundColor: '#FFF6EC' }]}>
                <Image source={ANALYTICS_ICONS.animals} style={styles.splitBadgeIcon} resizeMode="contain" />
                <AppText variant="caption" style={styles.splitBadgeTextAnimals}>
                  For animals
                </AppText>
              </View>
              <View style={styles.splitCardBody}>
                <View style={styles.impactValueRow}>
                  <Image source={ANALYTICS_ICONS.foodAnimals} style={styles.impactFoodIcon} resizeMode="contain" />
                  <AppText variant="bodyBold" style={styles.animalsValue} numberOfLines={1} adjustsFontSizeToFit>
                    {formatNumber(stats.animalKg)} kg
                  </AppText>
                </View>
                <AppText variant="caption" style={styles.impactSubLabel}>
                  Feed provided
                </AppText>
                <View style={styles.progressRow}>
                  <View style={styles.progressTrackAnimals}>
                    <View style={[styles.progressFillAnimals, progressFillStyles.animals]} />
                  </View>
                  <AppText variant="caption" style={styles.percentText}>
                    {stats.animalPercent}%
                  </AppText>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.ratingCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#FFF8E8' }]}>
              <Image source={ANALYTICS_ICONS.rating} style={styles.ratingIcon} resizeMode="contain" />
            </View>
            <View style={styles.metricContent}>
              <AppText variant="bodyBold" style={styles.metricValue}>
                {formatRating(stats.rating)}
              </AppText>
              <AppText variant="caption" style={styles.metricLabel}>
                Collection rating
              </AppText>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderTimeChip = (key: TimeRange, label: string) => {
    const active = range === key;
    return (
      <Pressable
        key={key}
        onPress={() => setRange(key)}
        style={[styles.filterChip, active ? styles.filterChipActive : styles.filterChipInactive]}
      >
        <AppText
          variant="bodyBold"
          style={[styles.filterChipText, { color: active ? palette.white : palette.stone }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
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
        style={[styles.metricChip, active ? styles.filterChipActive : styles.filterChipInactive]}
      >
        <AppText
          variant="bodyBold"
          style={[styles.filterChipText, { color: active ? palette.white : palette.stone }]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
        >
          {label}
        </AppText>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <Screen scrollable={false} backgroundColor={palette.creme} transparentTop>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: bottomPadding }]}>
          <Skeleton width="100%" height={hp(20)} borderRadius={0} />
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
    <Screen scrollable={false} backgroundColor={palette.creme} transparentTop>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <HeroHeader
          source={require('../../../assets/placeholder/kale-header.png')}
          height={hp(20)}
        >
       
          <View style={styles.heroContent}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroTextBlock}>
                <AppText variant="caption" style={styles.heroEyebrow} numberOfLines={1}>
                  {currentProfile.organization || 'Your business'}
                </AppText>
                <AppText variant="h6" style={styles.heroTitle} numberOfLines={1}>
                  Your insights
                </AppText>
                <AppText variant="bodySmall" style={styles.heroSubtitle} numberOfLines={2}>
                  See the difference your surplus makes
                </AppText>
                {!!currentProfile.address && (
                  <HeaderAddressRow
                    address={currentProfile.address}
                    iconSize={normalize(14)}
                    style={styles.heroAddressRow}
                    textStyle={styles.heroAddressText}
                  />
                )}
              </View>

              <View style={styles.heroIconCircle}>
                <Ionicons name="bar-chart" size={normalize(26)} color={palette.eggplant} />
              </View>
            </View>

            <View style={styles.heroStatsPill}>
              <Ionicons name="leaf-outline" size={normalize(14)} color={palette.white} />
              <AppText variant="caption" style={styles.heroStatsText} numberOfLines={1}>
                {isMultiSite ? 'All sites · ' : ''}
                {formatNumber(monthStats.mealsCreated)} meals · {formatNumber(monthStats.redistributedKg)} kg this month
              </AppText>
            </View>
          </View>
        </HeroHeader>

        <View style={styles.mainContent}>
          <Pressable
            style={({ pressed }) => [styles.createBtn, pressed && styles.pressed]}
            onPress={() => navigation.navigate('Listings', { screen: 'CreateListing' })}
          >
            <View style={styles.createBtnLeft}>
              <View style={styles.createBtnIconWrap}>
                <Ionicons name="add" size={normalize(20)} color={palette.white} />
              </View>
              <AppText variant="bodyBold" style={styles.createBtnText}>
                Create new listing
              </AppText>
            </View>
            <View style={styles.createBtnArrow}>
              <Ionicons name="arrow-forward" size={normalize(16)} color={palette.white} />
            </View>
          </Pressable>

          {renderImpactMetricsSection('This month', monthStats)}

          <View style={styles.chartCard}>
            <AppText variant="bodyBold" style={styles.sectionTitle}>
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
                key={`${range}-${selectedMetric}`}
                data={{
                  labels: chartSeries.labels,
                  datasets: [{ data: chartSeries.values }],
                }}
                width={chartWidth}
                height={hp(24)}
                yAxisSuffix={activeMetric.suffix ? ` ${activeMetric.suffix}` : ''}
                yLabelsOffset={4}
                chartConfig={chartConfig}
                bezier
                fromZero
                segments={4}
                withInnerLines
                withOuterLines={false}
                withVerticalLines
                withHorizontalLines
                style={styles.chart}
              />
            </View>
          </View>

          {renderImpactMetricsSection('Lifetime impact', lifetimeStats)}
        </View>
      </ScrollView>
    </Screen>
  );
}

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
    paddingBottom: hp(0.2),
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

  heroAddressRow: {
    marginTop: hp(0.8),
  },

  heroAddressText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: normalize(13),
    lineHeight: normalize(18),
    opacity: 1,
  },

  heroIconCircle: {
    width: normalize(52),
    height: normalize(52),
    borderRadius: normalize(26),
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
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

  createBtn: {
    backgroundColor: palette.eggplant,
    borderRadius: normalize(16),
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: palette.eggplant,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: { elevation: 5 },
    }),
  },

  createBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },

  createBtnIconWrap: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(16),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  createBtnText: {
    color: palette.white,
    textTransform: 'none',
    fontSize: normalize(17),
  },

  createBtnArrow: {
    width: normalize(28),
    height: normalize(28),
    borderRadius: normalize(14),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: {
    gap: hp(1.4),
  },

  sectionTitle: {
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
    gap: wp(2),
  },

  metricCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: palette.white,
    borderRadius: normalize(16),
    borderWidth: 1,
    borderColor: palette.strokecream,
    paddingVertical: hp(1.6),
    paddingHorizontal: wp(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    minHeight: normalize(72),
    ...cardShadow,
  },

  metricIconWrap: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  metricIcon: {
    width: normalize(24),
    height: normalize(24),
  },

  metricContent: {
    flex: 1,
    minWidth: 0,
    gap: hp(0.2),
  },

  metricValue: {
    color: palette.kale,
    textTransform: 'none',
    fontSize: normalize(15),
    lineHeight: normalize(20),
  },

  metricLabel: {
    color: palette.midgray,
    textTransform: 'none',
    fontSize: normalize(12),
    lineHeight: normalize(18),
  },

  impactSplitRow: {
    flexDirection: 'row',
    gap: wp(2),
  },

  splitCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: palette.white,
    borderRadius: normalize(16),
    borderWidth: 1,
    overflow: 'hidden',
    ...cardShadow,
  },

  peopleSplitCard: {
    borderColor: '#C8E0D2',
  },

  animalsSplitCard: {
    borderColor: '#FDDBB0',
  },

  splitCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
  },

  splitCardBody: {
    paddingHorizontal: wp(3),
    paddingBottom: hp(1.2),
    gap: hp(0.4),
  },

  splitBadgeIcon: {
    width: normalize(16),
    height: normalize(16),
  },

  splitBadgeTextPeople: {
    color: palette.kale,
    textTransform: 'none',
    fontSize: normalize(12),
    lineHeight: normalize(17),
    fontWeight: '600',
  },

  splitBadgeTextAnimals: {
    color: palette.orange,
    textTransform: 'none',
    fontSize: normalize(12),
    lineHeight: normalize(17),
    fontWeight: '600',
  },

  impactValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginTop: hp(0.2),
  },

  impactFoodIcon: {
    width: normalize(18),
    height: normalize(18),
  },

  peopleValue: {
    color: palette.kale,
    textTransform: 'none',
    fontSize: normalize(16),
    lineHeight: normalize(22),
    flexShrink: 1,
  },

  animalsValue: {
    color: palette.orange,
    textTransform: 'none',
    fontSize: normalize(16),
    lineHeight: normalize(22),
    flexShrink: 1,
  },

  impactSubLabel: {
    color: palette.midgray,
    textTransform: 'none',
    fontSize: normalize(12),
    lineHeight: normalize(17),
  },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginTop: hp(0.3),
  },

  progressTrackPeople: {
    flex: 1,
    height: hp(0.8),
    backgroundColor: '#D8E8DC',
    borderRadius: normalize(100),
    overflow: 'hidden',
  },

  progressFillPeople: {
    height: '100%',
    backgroundColor: palette.kale,
    borderRadius: normalize(100),
  },

  progressTrackAnimals: {
    flex: 1,
    height: hp(0.8),
    backgroundColor: '#F8DEC8',
    borderRadius: normalize(100),
    overflow: 'hidden',
  },

  progressFillAnimals: {
    height: '100%',
    backgroundColor: palette.orange,
    borderRadius: normalize(100),
  },

  percentText: {
    color: palette.midgray,
    fontSize: normalize(12),
    lineHeight: normalize(17),
    textTransform: 'none',
    minWidth: wp(9),
    textAlign: 'right',
  },

  ratingCard: {
    alignSelf: 'flex-start',
    minWidth: '48%',
    backgroundColor: palette.white,
    borderRadius: normalize(16),
    borderWidth: 1,
    borderColor: palette.strokecream,
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(3),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    ...cardShadow,
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
    ...cardShadow,
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
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
    borderRadius: normalize(20),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: normalize(38),
  },

  metricChip: {
    minWidth: 0,
    paddingVertical: hp(0.9),
    paddingHorizontal: wp(3),
    borderRadius: normalize(20),
    borderWidth: 1,
    minHeight: normalize(36),
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
    fontSize: normalize(13),
    lineHeight: normalize(18),
    textTransform: 'none',
  },

  chartContainer: {
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
  },

  chart: {
    borderRadius: normalize(12),
    marginLeft: -wp(2),
  },

  pressed: {
    opacity: 0.82,
  },
});
