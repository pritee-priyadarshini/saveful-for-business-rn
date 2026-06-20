import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  TouchableOpacity,
  ImageSourcePropType,
  Pressable,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Skeleton } from '../../components/Skeleton';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppContext } from '../../store/AppContext';
import { charityProfile } from '../../data/mockData';
import { palette } from '../../theme/colors';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

const chartWidth = width - wp(8) - wp(7);

const ANALYTICS_ICONS = {
  foodRecovered: require('../../../assets/placeholder/storage_box_green.png'),
  meals: require('../../../assets/placeholder/cutlery_icon.png'),
  co2: require('../../../assets/placeholder/co2_green_icon.png'),
  collections: require('../../../assets/placeholder/truck_icon.png'),
  rating: require('../../../assets/placeholder/rating_icon.png'),
};

const MONTHLY_STATS = {
  foodRecoveredKg: 1300,
  mealsCreated: 2340,
  co2AvoidedKg: 6400,
  collectionsCompleted: 18,
  rating: 4.5,
};

const LIFETIME_STATS = {
  foodRecoveredKg: 4800,
  mealsCreated: 2340,
  co2AvoidedKg: 9600,
  collectionsCompleted: 123,
  rating: 4.5,
};

type ImpactStats = typeof MONTHLY_STATS;

const formatNumber = (value: number) => value.toLocaleString('en-US');

type TimeRange = 'week' | 'month' | 'year';
type ImpactMetric = 'foodRecovered' | 'mealsCreated' | 'co2Avoided' | 'collectionsCompleted';

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

const TREND_DATA: Record<
  TimeRange,
  {
    labels: string[];
    foodRecovered: number[];
    mealsCreated: number[];
    co2Avoided: number[];
    collectionsCompleted: number[];
  }
> = {
  week: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    foodRecovered: [120, 180, 140, 260, 220, 340, 400],
    mealsCreated: [20, 45, 30, 78, 58, 118, 150],
    co2Avoided: [90, 130, 100, 190, 170, 260, 330],
    collectionsCompleted: [1, 2, 3, 4, 5, 7, 8],
  },
  month: {
    labels: ['W1', 'W2', 'W3', 'W4'],
    foodRecovered: [800, 1100, 1400, 1800],
    mealsCreated: [150, 220, 180, 300],
    co2Avoided: [500, 700, 900, 1200],
    collectionsCompleted: [12, 18, 24, 30],
  },
  year: {
    labels: ['21', '22', '23', '24', '25'],
    foodRecovered: [6000, 7200, 8400, 9800, 11200],
    mealsCreated: [500, 700, 650, 900, 1200],
    co2Avoided: [4200, 5100, 6200, 7700, 9200],
    collectionsCompleted: [90, 110, 130, 150, 180],
  },
};

export function FarmerAnalyticsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { currentProfile } = useAppContext();
  const [loading, setLoading] = useState(true);

  const [range, setRange] = React.useState<TimeRange>('week');
  const [selectedMetric, setSelectedMetric] = React.useState<ImpactMetric>('mealsCreated');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={hp(16)} borderRadius={0} />
      <Skeleton width={wp(70)} height={normalize(48)} borderRadius={normalize(14)} style={styles.skeletonCenter} />
      <View style={styles.skeletonGrid}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width="47%" height={normalize(90)} borderRadius={normalize(12)} />
        ))}
      </View>
      <Skeleton width={wp(55)} height={normalize(18)} style={styles.skeletonPad} />
      <Skeleton width="92%" height={normalize(220)} borderRadius={normalize(12)} style={styles.skeletonCenter} />
    </View>
  );

  if (loading) {
    return (
      <Screen backgroundColor={palette.creme}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {renderSkeleton()}
        </ScrollView>
      </Screen>
    );
  }

  const filtered = TREND_DATA[range];
  const activeMetric = IMPACT_METRICS.find((m) => m.key === selectedMetric)!;

  const organization = currentProfile.organization || charityProfile.organization;
  const address = currentProfile.address || charityProfile.address;
  const logoInitial = organization?.[0] || 'S';

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

  const renderImpactMetricsSection = (title: string, stats: ImpactStats) => (
    <>
      <AppText variant="h8" style={styles.sectionTitle}>
        {title}
      </AppText>

      <View style={styles.metricsGrid}>
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
          <View style={styles.ratingCard}>
            <View style={styles.metricIconWrap}>
              <Image source={ANALYTICS_ICONS.rating} style={styles.ratingIcon} resizeMode="contain" />
            </View>
            <View style={styles.metricContent}>
              <AppText variant="h8" style={styles.metricValue}>
                {stats.rating}/5
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
    <Screen backgroundColor={palette.creme}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroContainer}>
          <Image
            source={require('../../../assets/placeholder/feed-bg.png')}
            style={styles.heroBg}
            resizeMode="cover"
          />

          <View style={styles.heroContent}>
            <View style={styles.topBar}>
              <View style={styles.topBarLeft}>
                <AppText variant="h6" style={styles.brandText}>
                  {organization.toUpperCase()}
                </AppText>

                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={normalize(20)} color={palette.white} />
                  <AppText variant="body" style={styles.location}>
                    {address.toUpperCase()}
                  </AppText>
                </View>
              </View>

              <View style={styles.logoCircle}>
                {currentProfile.logo ? (
                  <Image
                    source={{ uri: currentProfile.logo }}
                    style={styles.logoImage}
                    resizeMode="cover"
                  />
                ) : (
                  <AppText style={styles.logoFallback}>{logoInitial}</AppText>
                )}
              </View>
            </View>

            <View style={styles.headerCenter}>
              <AppText variant="h4" style={styles.heroTitle}>
                YOUR DASHBOARD
              </AppText>
            </View>
          </View>
        </View>

        <Pressable
          style={styles.ctaButton}
          onPress={() => navigation.navigate('FarmerHistory')}
        >
          <AppText variant="bodyLarge" style={styles.ctaText}>
            View Collections History
          </AppText>
        </Pressable>

        <View style={styles.topSection}>
          {renderImpactMetricsSection('This month', MONTHLY_STATS)}
        </View>

        <View style={styles.impactOverTimeSection}>
          <AppText variant="h8" style={styles.impactOverTimeTitle}>
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
                  <AppText style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                    {label}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.metricFilterRow}>
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
          </View>

          <View style={styles.chartContainer}>
            <LineChart
              key={`${range}-${selectedMetric}`}
              data={{
                labels: filtered.labels,
                datasets: [{ data: filtered[selectedMetric] }],
              }}
              width={chartWidth + wp(5)}
              height={hp(26)}
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

        <View style={styles.lifetimeSection}>
          {renderImpactMetricsSection('Lifetime impact', LIFETIME_STATS)}
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
    r: '6',
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
    gap: hp(2),
    paddingBottom: hp(4),
  },
  heroContainer: {
    minHeight: hp(20),
    width: '100%',
    paddingTop: hp(2),
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: palette.primary,
  },
  heroBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  heroContent: {
    zIndex: 1,
    paddingHorizontal: wp(4),
    gap: hp(1),
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: wp(2),
  },
  topBarLeft: {
    flex: 1,
    minWidth: 0,
  },
  brandText: {
    color: palette.white,
    fontSize: normalize(18),
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: hp(0.6),
    gap: wp(1.5),
  },
  location: {
    color: palette.white,
    opacity: 0.9,
    flex: 1,
    flexWrap: 'wrap',
    textTransform: 'uppercase',
    alignSelf: 'center',
  },
  logoCircle: {
    width: normalize(48),
    height: normalize(48),
    borderRadius: normalize(24),
    marginLeft: wp(2),
    backgroundColor: palette.white,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoFallback: {
    color: palette.primary,
    fontWeight: 'bold',
    fontSize: normalize(18),
  },
  headerCenter: {
    alignItems: 'center',
    gap: hp(0.5),
    marginTop: hp(0.5),
  },
  heroTitle: {
    color: palette.white,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingTop: hp(0.5),
  },
  topSection: {

    paddingHorizontal: wp(4),
    gap: hp(1.5),
    marginTop: -hp(1.5),
  },
  sectionTitle: {
    color: palette.black,
    textTransform: 'none',
    marginTop: hp(0.5),
  },
  lifetimeSection: {
    paddingHorizontal: wp(4),
    gap: hp(1.5),
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
    borderColor: palette.middlegreen,
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
    borderRadius: normalize(12),
    borderWidth: normalize(1),
    borderColor: '#E0E0E0',
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
  impactOverTimeSection: {
    marginHorizontal: wp(4),
    backgroundColor: palette.creme,
    borderRadius: normalize(16),
    paddingHorizontal: wp(3.5),
    paddingTop: hp(2),
    paddingBottom: hp(1.2),
    gap: hp(1.2),
  },
  impactOverTimeTitle: {
    color: palette.black,
    textTransform: 'none',
    letterSpacing: 0,
  },
  timeFilterRow: {
    flexDirection: 'row',
    width: '100%',
    gap: wp(2),
  },
  metricFilterRow: {
    flexDirection: 'row',
    width: '100%',
    gap: wp(1),
  },
  timeFilterPill: {
    flex: 1,
    paddingVertical: hp(0.85),
    borderRadius: normalize(8),
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricFilterPill: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: wp(1),
    paddingVertical: hp(0.85),
    borderRadius: normalize(8),
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: palette.eggplant,
    borderColor: palette.eggplant,
  },
  filterPillText: {
    color: palette.kale,
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: normalize(14),
    lineHeight: normalize(16),
    fontFamily: 'Saveful-SemiBold',
    textAlign: 'center',
  },
  metricFilterPillText: {
    color: palette.kale,
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: normalize(13),
    lineHeight: normalize(16),
    fontFamily: 'Saveful-SemiBold',
    textAlign: 'center',
  },
  filterPillTextActive: {
    color: palette.white,
  },
  chartContainer: {
    width: '100%',
    overflow: 'hidden',
    marginTop: hp(0.5),
  },
  chart: {
    borderRadius: normalize(12),
    marginLeft: -wp(5),
  },
  ctaButton: {
    marginHorizontal: wp(8),
    backgroundColor: palette.kale,
    padding: hp(1.5),
    borderRadius: normalize(14),
    alignItems: 'center',
    marginVertical: hp(1),
  },
  ctaText: {
    color: palette.white,
    fontSize: normalize(18),
  },
  skeletonWrap: {
    gap: hp(1.2),
    paddingBottom: hp(3),
  },
  skeletonCenter: {
    alignSelf: 'center',
  },
  skeletonPad: {
    marginLeft: wp(4),
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    gap: hp(1),
  },
});