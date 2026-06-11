import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Image,
  TouchableOpacity,
  ImageSourcePropType,
} from 'react-native';

import { LineChart } from 'react-native-chart-kit';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { useAppContext } from '../../store/AppContext';

import { restaurantImpact } from '../../data/mockData';
import { palette } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

const chartWidth = width - wp(8) - wp(7);

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

const MONTHLY_STATS = {
  redistributedKg: 1300,
  mealsCreated: 2340,
  co2AvoidedKg: 6400,
  foodSavedMoney: 1240,
  collectionsCompleted: 18,
  charitiesSupported: 4,
  peopleKg: 900,
  animalKg: 400,
  peoplePercent: 71,
  animalPercent: 29,
  rating: 4.5,
};

const LIFETIME_STATS = {
  redistributedKg: 4800,
  mealsCreated: 2340,
  co2AvoidedKg: 9600,
  foodSavedMoney: 11240,
  collectionsCompleted: 123,
  charitiesSupported: 4,
  peopleKg: 3600,
  animalKg: 1200,
  peoplePercent: 71,
  animalPercent: 29,
  rating: 4.5,
};

type ImpactStats = typeof MONTHLY_STATS;

const formatNumber = (value: number) => value.toLocaleString('en-US');

type TimeRange = 'week' | 'month' | 'year';
type ImpactMetric = 'foodRedistributed' | 'mealsCreated' | 'co2Avoided' | 'collectionsCompleted';

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

const IMPACT_METRICS: { key: ImpactMetric; label: string; suffix?: string }[] = [
  { key: 'foodRedistributed', label: 'Food redistributed', suffix: 'kg' },
  { key: 'mealsCreated', label: 'Meals created' },
  { key: 'co2Avoided', label: 'CO2 Avoided', suffix: 'kg' },
  { key: 'collectionsCompleted', label: 'Collections Completed' },
];

const TREND_DATA: Record<
  TimeRange,
  { labels: string[]; foodRedistributed: number[]; mealsCreated: number[]; co2Avoided: number[]; collectionsCompleted: number[] }
> = {
  week: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    foodRedistributed: [12, 28, 18, 45, 32, 68, 85],
    mealsCreated: [20, 45, 30, 78, 58, 118, 150],
    co2Avoided: [10, 22, 15, 38, 28, 55, 72],
    collectionsCompleted: [1, 2, 1, 3, 2, 4, 5],
  },
  month: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr'],
    foodRedistributed: [180, 240, 210, 320],
    mealsCreated: [150, 220, 180, 300],
    co2Avoided: [90, 140, 120, 200],
    collectionsCompleted: [8, 12, 10, 18],
  },
  year: {
    labels: ['2020', '2021', '2022', '2023', '2024', '2025'],
    foodRedistributed: [420, 580, 540, 720, 680, 950],
    mealsCreated: [500, 700, 650, 900, 850, 1200],
    co2Avoided: [300, 450, 400, 600, 550, 800],
    collectionsCompleted: [45, 62, 58, 78, 72, 95],
  },
};

export function RestaurantAnalyticsScreen({ navigation }: any) {
  const { currentProfile } = useAppContext();

  const [range, setRange] = React.useState<TimeRange>('week');
  const [selectedMetric, setSelectedMetric] = React.useState<ImpactMetric>('mealsCreated');

  const filtered = TREND_DATA[range];
  const activeMetric = IMPACT_METRICS.find((m) => m.key === selectedMetric)!;

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

  const renderImpactMetricsSection = (title: string, stats: ImpactStats) => {
    const progressFillStyles = StyleSheet.create({
      people: { width: `${stats.peoplePercent}%` },
      animals: { width: `${stats.animalPercent}%` },
    });

    return (
      <>
        <AppText variant="h8" style={styles.sectionTitle}>
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
              'Total CO2 avoided',
            )}
            {renderMetricCard(
              ANALYTICS_ICONS.money,
              `$${formatNumber(stats.foodSavedMoney)}`,
              'Total Food Saved',
            )}
          </View>

          <View style={styles.metricsRow}>
            {renderMetricCard(
              ANALYTICS_ICONS.collections,
              formatNumber(stats.collectionsCompleted),
              'Collections completed',
            )}
            {renderMetricCard(
              ANALYTICS_ICONS.charities,
              formatNumber(stats.charitiesSupported),
              'Charities Supported',
            )}
          </View>

          <View style={styles.impactSplitRow}>
            <View style={styles.peopleImpactCard}>
              <View style={styles.impactBadgePeople}>
                <Image source={ANALYTICS_ICONS.people} style={styles.impactBadgeIcon} resizeMode="contain" />
                <AppText variant="caption" style={styles.impactBadgeTextPeople}>
                  For People
                </AppText>
              </View>

              <View style={styles.impactValueRow}>
                <Image source={ANALYTICS_ICONS.foodPeople} style={styles.impactFoodIcon} resizeMode="contain" />
                <AppText variant="h8" style={styles.peopleValue}>
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

            <View style={styles.animalsImpactCard}>
              <View style={styles.impactBadgeAnimals}>
                <Image source={ANALYTICS_ICONS.animals} style={styles.impactBadgeIcon} resizeMode="contain" />
                <AppText variant="caption" style={styles.impactBadgeTextAnimals}>
                  For Animals
                </AppText>
              </View>

              <View style={styles.impactValueRow}>
                <Image source={ANALYTICS_ICONS.foodAnimals} style={styles.impactFoodIcon} resizeMode="contain" />
                <AppText variant="h8" style={styles.animalsValue}>
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
  };

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView contentContainerStyle={styles.container}>

        <View style={styles.heroContainer}>
          <Image
            source={require('../../../assets/placeholder/kale-header.png')}
            style={styles.heroBg}
            resizeMode="cover"
          />

          <View style={styles.heroContent}>
            <View style={styles.topBar}>
              <View style={styles.topBarLeft}>
                <AppText variant="h6" style={styles.brandText}>
                  {(currentProfile.organization || 'SAVEFUL').toUpperCase()}
                </AppText>

                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={normalize(20)} color={palette.white} />
                  <AppText variant="body" style={styles.location}>
                    {(currentProfile.address || restaurantImpact.siteAddress).toUpperCase()}
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
                  <AppText style={styles.logoFallback}>
                    {currentProfile.organization?.[0] || 'S'}
                  </AppText>
                )}
              </View>
            </View>

            <View style={styles.headerCenter}>
              <AppText variant="h4" style={styles.heroTitle}>
                YOUR DASHBOARD
              </AppText>
              <AppText variant="caption" style={styles.heroSubtitle}>
                HELP GOOD FOOD GO FURTHER 🍲
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.topSection}>
          <Pressable
            style={styles.createBtn}
            onPress={() =>
              navigation.navigate('Listings', { screen: 'CreateListing' })
            }
          >
            <AppText variant="bodyBold" style={styles.createText}>
              + CREATE NEW LISTING
            </AppText>
            <Ionicons
              name="arrow-forward"
              size={normalize(18)}
              color={palette.white}
              style={styles.createArrow}
            />
          </Pressable>

          {renderImpactMetricsSection('This month', MONTHLY_STATS)}
        </View>

        {/* IMPACT OVER TIME */}
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

        {/* LIFETIME IMPACT */}
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
  heroSubtitle: {
    color: palette.white,
    textAlign: 'center',
    paddingTop: hp(0.25),
    opacity: 0.95,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  topSection: {
    paddingHorizontal: wp(4),
    gap: hp(1.5),
    marginTop: -hp(2.5),
  },

  createBtn: {
    backgroundColor: palette.kale,
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    borderRadius: normalize(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  createText: {
    color: palette.white,
    textTransform: 'none',
    letterSpacing: 0.3,
  },
  createArrow: {
    position: 'absolute',
    right: wp(4),
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

  impactSplitRow: {
    flexDirection: 'row',
    gap: wp(2.5),
  },

  peopleImpactCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: palette.white,
    borderRadius: normalize(12),
    borderWidth: normalize(1),
    borderColor: palette.middlegreen,
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(2.5),
    gap: hp(0.4),
  },

  animalsImpactCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: palette.white,
    borderRadius: normalize(12),
    borderWidth: normalize(1),
    borderColor: palette.orange,
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(2.5),
    gap: hp(0.4),
  },

  impactBadgePeople: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: wp(1.5),
    backgroundColor: palette.white,
    borderWidth: normalize(1),
    borderColor: palette.kale,
    borderRadius: normalize(8),
    paddingVertical: hp(0.4),
    paddingHorizontal: wp(2),
  },

  impactBadgeAnimals: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: wp(1.5),
    backgroundColor: palette.white,
    borderWidth: normalize(1),
    borderColor: palette.orange,
    borderRadius: normalize(8),
    paddingVertical: hp(0.4),
    paddingHorizontal: wp(2),
  },

  impactBadgeIcon: {
    width: normalize(16),
    height: normalize(16),
  },

  impactBadgeTextPeople: {
    color: palette.kale,
    textTransform: 'none',
    letterSpacing: 0,
  },

  impactBadgeTextAnimals: {
    color: palette.orange,
    textTransform: 'none',
    letterSpacing: 0,
  },

  impactValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginTop: hp(0.6),
  },

  impactFoodIcon: {
    width: normalize(18),
    height: normalize(18),
  },

  peopleValue: {
    color: palette.kale,
    textTransform: 'none',
  },

  animalsValue: {
    color: palette.orange,
    textTransform: 'none',
  },

  impactSubLabel: {
    color: palette.black,
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: normalize(12),
  },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },

  progressTrackPeople: {
    flex: 1,
    height: hp(0.9),
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
    height: hp(0.9),
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
    fontSize: normalize(11),
    textTransform: 'none',
    minWidth: wp(8),
    textAlign: 'right',
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

  emptyStateBox: {
    marginHorizontal: wp(4),
    padding: wp(4),
    borderRadius: normalize(16),
    backgroundColor: '#EEE7FF',
    alignItems: 'center',
    gap: hp(1),
  },

  smallBtn: {
    marginTop: hp(1),
    backgroundColor: palette.eggplant,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderRadius: normalize(12),
  },

  smallBtnText: {
    color: palette.white,
    fontSize: normalize(14),
  },

  listingBox: {
    marginHorizontal: wp(4),
    padding: wp(4),
    borderRadius: normalize(20),
    borderWidth: 1,
    borderColor: palette.black,
    backgroundColor: palette.creme,
    gap: hp(2),
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  status: {
    backgroundColor: '#EEE7FF',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderRadius: normalize(14),
  },

  detailsRow: {
    flexDirection: 'row',
    gap: wp(4),
    alignItems: 'center',
  },

  image: {
    width: normalize(50),
    height: normalize(50),
    borderRadius: normalize(12),
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

  section: {
    marginHorizontal: wp(4),
    gap: hp(1),
  },

  pill: {
    backgroundColor: palette.middlegreen,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(5),
    borderRadius: normalize(30),
    marginTop: hp(0.5),
  },

  pillText: {
    color: palette.white,
    textAlign: 'center',
    fontSize: normalize(18),
  },

  chart: {
    borderRadius: normalize(12),
    marginLeft: -wp(5),
  },
});