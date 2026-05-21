import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  Image,
  TouchableOpacity,
} from 'react-native';

import { LineChart } from 'react-native-chart-kit';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { charityImpact, charityProfile } from '../../data/mockData';
import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const { width, height } = Dimensions.get("window");
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

const historyData = [
  {
    id: '1',
    business: 'Saveful Bakery',
    qty: '6 kg',
    date: 'Today · 4:30 PM',
    status: 'Completed',
    meals: 12,
  },
  {
    id: '2',
    business: 'Harvest Cafe',
    qty: '10 kg',
    date: 'Yesterday · 6:00 PM',
    status: 'Completed',
    meals: 20,
  },
  {
    id: '3',
    business: 'Green Table',
    qty: '4 kg',
    date: 'Mon · 5:00 PM',
    status: 'Completed',
    meals: 8,
  },
];

const chartDataByRange = {
  week: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    meals: [8, 20, 12, 30, 25, 40, 50],
    co2: [4, 10, 7, 18, 14, 24, 30],
  },
  month: {
    labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'],
    meals: [80, 120, 100, 185],
    co2: [48, 72, 60, 111],
  },
  year: {
    labels: ['2020', '2021', '2022', '2023', '2024', '2025'],
    meals: [300, 480, 420, 650, 590, 820],
    co2: [180, 288, 252, 390, 354, 492],
  },
};

const calcTrend = (data: number[]) => {
  const last = data[data.length - 1];
  const prev = data[data.length - 2] || 1;
  return Math.round(((last - prev) / prev) * 100);
};

const chartConfig = {
  backgroundGradientFrom: palette.white,
  backgroundGradientTo: palette.white,
  decimalPlaces: 0,
  color: () => palette.primary,
  labelColor: () => '#888',
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: palette.primary,
  },
};

function StatusBadge({ status }: { status: string }) {
  return (
    <View style={styles.statusBadge}>
      <View style={styles.statusDot} />
      <AppText variant='bodySmall' style={styles.statusText}>{status}</AppText>
    </View>
  );
}

function HistoryItem({ item, isLast }: { item: (typeof historyData)[0]; isLast: boolean }) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timeline}>
        <View style={styles.dot} />
        {!isLast && <View style={styles.line} />}
      </View>

      <View style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <View style={{ flex: 1 }}>
            <AppText variant='label'>{item.business}</AppText>
            <AppText variant='bodySmall'>{item.date}</AppText>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.historyFooter}>
          <View style={styles.chip}>
            <Ionicons name="scale-outline" size={normalize(13)} color={palette.primary} />
            <AppText variant='body' style={styles.chipText}>{item.qty}</AppText>
          </View>
          <View style={styles.chip}>
            <Ionicons name="restaurant-outline" size={normalize(13)} color={palette.primary} />
            <AppText variant='body' style={styles.chipText}>{item.meals} meals</AppText>
          </View>
        </View>
      </View>
    </View>
  );
}


export function CharityAnalyticsScreen() {
  const navigation = useNavigation<any>();
  const [range, setRange] = React.useState<'week' | 'month' | 'year'>('week');

  const filtered = chartDataByRange[range];
  const mealsTrend = calcTrend(filtered.meals);
  const co2Trend = calcTrend(filtered.co2);
  const chartWidth = wp(84);

  return (
    <Screen backgroundColor={palette.creme} scrollable={false}>
      <FlatList
        data={historyData}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}

        // HEADER 
        ListHeaderComponent={
          <>
            {/* HEADER */}
            <View style={styles.heroContainer}>

              <Image
                source={require('../../../assets/placeholder/feed-bg.png')}
                style={styles.heroBg}
              />

              {/* TOP ROW */}
              <View style={styles.topBar}>
                <View style={{ flex: 1 }}>
                  <AppText variant='body' style={styles.whiteText}>
                    {charityProfile.organization}
                  </AppText>

                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={normalize(16)} color="white" />
                    <AppText variant='body' style={styles.location}>
                      {charityProfile.address}
                    </AppText>
                  </View>
                </View>

                <View style={styles.logoCircle}>
                  <AppText variant='body' style={styles.logoFallback}>S</AppText>
                </View>
              </View>

              {/* TITLE */}
              <View style={styles.header}>
                <AppText variant='h5' style={styles.heroText}>Your Dashboard</AppText>
              </View>

            </View>

            {/* HERO BANNER */}
            <View style={styles.heroBanner}>

              <AppText variant='h5' style={styles.heroValue}>
                {charityImpact.mealsCreated}
              </AppText>
              <AppText variant='h7' style={styles.heroLabel}>Meals created 🍱</AppText>

            </View>

            {/* IMPACT GRID */}
            <View style={styles.grid}>
              <Card style={styles.statCard}>
                <AppText variant='label'>{charityImpact.businessesSupported}</AppText>
                <AppText variant='body'>Partners</AppText>
              </Card>

              <Card style={styles.statCard}>
                <AppText variant='label'>{charityImpact.rating} ⭐</AppText>
                <AppText variant='body'>Rating</AppText>
              </Card>

              <Card style={[styles.statCard, styles.statHighlight]}>
                <AppText variant='label' style={{ color: palette.white }}>Top 10%</AppText>
                <AppText variant='body' style={styles.statLabelWhite}>Impact Rank 🚀</AppText>
              </Card>

              <Card style={styles.statCard}>
                <AppText variant='label' style={styles.statValue}>{charityImpact.collections}</AppText>
                <AppText variant='body'>Collections</AppText>
              </Card>
            </View>

            {/* TREND CARDS */}
            <View style={styles.trendRow}>
              <Card style={styles.trendCard}>
                <Ionicons name="restaurant-outline" size={normalize(18)} color={palette.primary} />
                <AppText variant='body'>Meals this week</AppText>
                <AppText variant='label'>{filtered.meals[filtered.meals.length - 1]}</AppText>
                <AppText variant='bodyBold' style={mealsTrend >= 0 ? styles.trendUp : styles.trendDown}>
                  {mealsTrend >= 0 ? '+' : ''}{mealsTrend}% vs last period
                </AppText>
              </Card>

              <Card style={styles.trendCard}>
                <Ionicons name="leaf-outline" size={normalize(18)} color={palette.primary} />
                <AppText variant='body'>CO₂ avoided</AppText>
                <AppText variant='label'>{filtered.co2[filtered.co2.length - 1]}kg</AppText>
                <AppText variant='bodyBold' style={co2Trend >= 0 ? styles.trendUp : styles.trendDown}>
                  {co2Trend >= 0 ? '+' : ''}{co2Trend}% vs last period
                </AppText>
              </Card>
            </View>

            {/* CHARTS */}
            <View style={styles.chartSection}>
              {/* Range filter */}
              <View style={styles.chartTitleRow}>
                <View style={styles.headingContainer}>
                  <Image
                    source={require('../../../assets/placeholder/Illustration.png')}
                    style={styles.headingBg}
                  />

                  <AppText variant="heading" style={styles.headingText}>
                    Impact Over Time
                  </AppText>
                </View>
              </View>

              <View style={styles.filterRow}>
                {(['week', 'month', 'year'] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRange(r)}
                    style={[styles.filterChip, range === r && styles.activeChip]}
                  >
                    <AppText style={range === r ? styles.activeChipText : styles.inactiveChipText}>
                      {r.toUpperCase()}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>

              <AppText variant='h7' style={{ marginTop: spacing.md }}>Meals Created</AppText>
              <LineChart
                data={{ labels: filtered.labels, datasets: [{ data: filtered.meals }] }}
                width={chartWidth}
                height={hp(22)}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />

              <AppText variant='h7' style={{ marginTop: spacing.md }}>CO₂ Avoided (kg)</AppText>
              <LineChart
                data={{ labels: filtered.labels, datasets: [{ data: filtered.co2 }] }}
                width={chartWidth}
                height={hp(22)}
                yAxisSuffix="kg"
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </View>

            {/* RECENT ACTIVITY HEADER */}
            <AppText style={styles.sectionHeader}>Recent Activity</AppText>
          </>
        }

        renderItem={({ item, index }) => (
          <HistoryItem item={item} isLast={index === historyData.length - 1} />
        )}

        ListFooterComponent={
          <Button
            label="View Full History"
            variant="primary"
            style={styles.cta}
            onPress={() => navigation.navigate('CharityHistory')}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headingContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(4.5),
    marginBottom: hp(4),
  },

  headingBg: {
    position: 'absolute',
    width: '100%',
    height: hp(10),
    resizeMode: 'contain',
  },

  headingText: {
    textAlign: 'center',
  },

  heroBanner: {
    margin: wp(3.5),
    backgroundColor: palette.primary,
    borderRadius: normalize(24),
    padding: wp(4.5),
    alignItems: 'center',
    gap: hp(0.5),
  },

  heroValue: {
    color: palette.white,
    lineHeight: normalize(50),
  },

  heroLabel: {
    color: palette.white,
  },

  heroContainer: {
    height: hp(20),
    width: '100%',
    paddingTop: hp(2.2),
    paddingRight: wp(4),
    overflow: 'hidden',
    backgroundColor: palette.primary,
  },

  heroBg: {
    ...StyleSheet.absoluteFillObject,
  },

  topBar: {
    flexDirection: 'row',
    paddingLeft: wp(4),
    justifyContent: 'space-between',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(0.5),
    gap: wp(1.5),
  },

  whiteText: {
    color: 'white',
  },

  location: {
    color: 'white',
  },

  logoCircle: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(22),
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoFallback: {
    color: palette.primary,
  },

  header: {
    marginTop: hp(2),
    alignItems: 'center',
  },

  heroText: {
    color: palette.white,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: wp(4),
    marginVertical: hp(1.8),
    gap: wp(2.5),
  },

  statCard: {
    width: '48%',
    padding: wp(3.5),
    borderRadius: normalize(18),
    gap: hp(0.4),
  },

  statHighlight: {
    backgroundColor: palette.primary,
  },

  statValue: {
    color: palette.text ?? palette.white,
  },

  statLabelWhite: {
    color: palette.white,
  },

  trendRow: {
    flexDirection: 'row',
    marginHorizontal: wp(4),
    gap: wp(2.5),
  },

  trendCard: {
    flex: 1,
    padding: wp(3.5),
    borderRadius: normalize(18),
    gap: hp(0.5),
  },

  trendCardLabel: {
    marginTop: 4,
  },

  trendUp: {
    color: palette.mint,
  },

  trendDown: {
    color: palette.chilli,
  },

  chartSection: {
    marginHorizontal: wp(4),
    marginVertical: hp(1.2),
    backgroundColor: palette.white,
    borderRadius: normalize(20),
    padding: wp(3.5),
    gap: hp(0.8),
  },

  chartTitleRow: {
    marginHorizontal: wp(2),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  filterRow: {
    flexDirection: 'row',
    gap: wp(2),
  },

  filterChip: {
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.7),
    borderRadius: normalize(20),
    backgroundColor: '#F0F0F0',
  },

  activeChip: {
    backgroundColor: palette.primary,
  },

  activeChipText: {
    color: palette.white,
  },

  inactiveChipText: {
    color: '#888',
  },

  chart: {
    borderRadius: normalize(12),
    marginLeft: -wp(2),
  },

  sectionHeader: {
    marginHorizontal: wp(4),
    marginVertical: hp(2),
  },

  timelineRow: {
    flexDirection: 'row',
    gap: wp(2.5),
  },

  timeline: {
    marginLeft: wp(4),
    width: wp(5),
    alignItems: 'center',
    paddingTop: hp(0.7),
  },

  dot: {
    width: normalize(10),
    height: normalize(10),
    borderRadius: normalize(5),
    backgroundColor: palette.primary,
  },

  line: {
    width: normalize(2),
    flex: 1,
    backgroundColor: '#E0E0E0',
    marginTop: hp(0.4),
  },

  historyCard: {
    flex: 1,
    backgroundColor: palette.white,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2),
    borderRadius: normalize(16),
    marginBottom: hp(1.2),
    gap: hp(0.8),
  },

  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F6EC',
    paddingHorizontal: wp(2.5),
    borderRadius: normalize(10),
  },

  statusDot: {
    width: normalize(6),
    height: normalize(6),
    borderRadius: normalize(3),
    backgroundColor: palette.mint,
    marginTop: hp(0.1),
  },

  statusText: {
    color: palette.mint,
    marginLeft: wp(1.5),
  },

  historyFooter: {
    flexDirection: 'row',
    gap: wp(2),
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    backgroundColor: '#F4F0FF',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.6),
    borderRadius: normalize(10),
  },

  chipText: {
    color: palette.primary,
  },

  cta: {
    margin: wp(4),
    backgroundColor: palette.middlegreen,
  },
});