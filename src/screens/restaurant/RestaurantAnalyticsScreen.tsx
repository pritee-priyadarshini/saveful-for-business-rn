import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Image,
  TouchableOpacity
} from 'react-native';

import { LineChart } from 'react-native-chart-kit';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { useAppContext } from '../../store/AppContext';

import { restaurantImpact, restaurantListings } from '../../data/mockData';
import { spacing } from '../../theme/spacing';
import { palette } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

const screenWidth = Dimensions.get('window').width;

export function RestaurantAnalyticsScreen({ navigation }: any) {
  const { currentProfile } = useAppContext();

  const sortedListings = [...restaurantListings].reverse();

  // DEMO TREND DATA
  const mealsData = [20, 45, 30, 80, 60, 120, 150];
  const charityData = [5, 15, 10, 25, 20, 40, 50];
  const co2Data = [10, 20, 18, 40, 35, 70, 90];

  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [range, setRange] = React.useState<'week' | 'month' | 'year'>('week');

  const generateData = () => {
    switch (range) {
      case 'week':
        return {
          labels,
          meals: mealsData,
          co2: co2Data,
        };

      case 'month':
        return {
          labels: ['Jan ', 'Feb', 'March', 'April'],
          meals: [150, 220, 180, 300],
          co2: [90, 140, 120, 200],
        };

      case 'year':
        return {
          labels: ['2020', '2021', '2022', '2023', '2024', '2025'],
          meals: [500, 700, 650, 900, 850, 1200],
          co2: [300, 450, 400, 600, 550, 800],
        };

      default:
        return {
          labels,
          meals: mealsData,
          co2: co2Data,
        };
    }
  };

  const filtered = generateData();

  const calcTrend = (data: number[]) => {
    const last = data[data.length - 1];
    const prev = data[data.length - 2];
    return Math.round(((last - prev) / prev) * 100);
  };

  const mealsTrend = calcTrend(mealsData);
  const charityTrend = calcTrend(charityData);

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* HEADER */}
        <View style={styles.heroContainer}>
          <Image
            source={require('../../../assets/placeholder/kale-header.png')}
            style={styles.heroBg}
          />

          {/* TOP ROW */}
          <View style={styles.topBar}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="h6" style={styles.whiteText}>
                {currentProfile.organization}
              </AppText>

              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={26} color="white" />
                <AppText variant="body" style={styles.location}>
                  {currentProfile.address}
                </AppText>
              </View>
            </View>

            {/* LOGO */}
            <View style={styles.logoCircle}>
              {currentProfile.logo ? (
                <Image
                  source={{ uri: currentProfile.logo }}
                  style={styles.logoImage}
                />
              ) : (
                <AppText style={styles.logoFallback}>
                  {currentProfile.organization?.[0] || 'S'}
                </AppText>
              )}
            </View>
          </View>

          <View style={styles.header}>
            <AppText variant="heading" style={styles.heroText}>Your Dashboard</AppText>
            <AppText variant="caption" style={styles.heroSubText}>
              Help good food go further 🍲
            </AppText>
          </View>
        </View>

        <Pressable
          style={styles.createBtn}
          onPress={() =>
            navigation.navigate('Listings', { screen: 'CreateListing' })
          }
        >
          <AppText variant='bodyBold' style={styles.createText}>+ Create New Listing</AppText>
        </Pressable>

        {/* TREND CARDS */}
        <View style={styles.section}>
          <View style={styles.headingContainer}>
            <Image
              source={require('../../../assets/placeholder/Illustration.png')}
              style={styles.headingBg}
            />

            <AppText variant="heading" style={styles.headingText}>
              This Week’s Trends
            </AppText>
          </View>
        </View>

        <View style={styles.trendRow}>
          <Card style={styles.trendCard}>
            <AppText variant="caption">Meals Created</AppText>
            <View style={styles.pill}>
              <AppText variant="h6" style={styles.pillText}>
                150
              </AppText>
            </View>
            <AppText style={styles.trendUp}>
              +{mealsTrend}% this week
            </AppText>
          </Card>

          <Card style={styles.trendCard}>
            <AppText variant="caption">KGS SAVED</AppText>
            <View style={styles.pill}>
              <AppText variant="h6" style={styles.pillText}>
                450
              </AppText>
            </View>
            <AppText style={styles.trendUp}>
              +{charityTrend}% this week
            </AppText>
          </Card>
        </View>

        {/* MEALS CHART */}
        <View style={styles.section}>
          <View style={styles.section}>
            <View style={styles.headingContainer}>
              <Image
                source={require('../../../assets/placeholder/Illustration.png')}
                style={styles.headingBg}
              />

              <AppText variant="heading" style={styles.headingText}>
                Compare Your Impact
              </AppText>
            </View>
          </View>
          <AppText variant="subheading">Meals Donated </AppText>
          <View style={styles.filterContainer}>
            {['week', 'month', 'year'].map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setRange(item as any)}
                style={[
                  styles.filterChip,
                  range === item && styles.activeChip,
                ]}
              >
                <AppText style={range === item ? styles.activeText : styles.inactiveText}>
                  {item.toUpperCase()}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <LineChart
            data={{
              labels: filtered.labels,
              datasets: [{ data: filtered.meals }],
            }}
            width={screenWidth - 32}
            height={180}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        {/* CO2 CHART */}
        <View style={styles.section}>
          <AppText variant="subheading">CO₂ Reduction</AppText>

          <LineChart
            data={{
              labels: filtered.labels,
              datasets: [{ data: filtered.co2 }],
            }}
            width={screenWidth - 32}
            height={180}
            yAxisSuffix="kg"
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        {/* GAMIFICATION */}
        <Card style={styles.gamificationCard}>
          <AppText variant="bodyBold">
            🎉 You’re in the top 10% of donors!
          </AppText>

          <AppText variant="caption">
            Keep going — you’re making real impact 💜
          </AppText>
        </Card>

        {/* IMPACT SNAPSHOT */}
        <View style={styles.headingContainer}>
          <Image
            source={require('../../../assets/placeholder/Illustration.png')}
            style={styles.headingBg}
          />

          <AppText variant="heading" style={styles.headingText}>
            You's Impact Snapshot
          </AppText>
        </View>

        <View style={styles.grid}>
          {restaurantImpact.snapshot.map((item, index) => (
            <Card key={index} style={styles.impactCard}>
              <View style={styles.pill}>
                <AppText variant="h6" style={styles.pillText}>
                  {item.value}
                </AppText>
              </View>
              <AppText variant="caption" style={{ textAlign: 'center' }}>{item.label}</AppText>
            </Card>
          ))}
        </View>

      </ScrollView>
    </Screen>
  );
}

const chartConfig = {
  backgroundGradientFrom: palette.white,
  backgroundGradientTo: palette.white,
  decimalPlaces: 0,
  color: () => palette.middlegreen,
  labelColor: () => '#888',
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: palette.middlegreen,
  },
};

const styles = StyleSheet.create({
  container: {
    gap: hp(2),
    paddingBottom: hp(4),
  },

  heroContainer: {
    minHeight: hp(25),
    width: '100%',
    paddingTop: hp(4),
    overflow: 'hidden',
    position: 'relative',
  },

  heroBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },

  topBar: {
    flexDirection: 'row',
    paddingLeft: wp(4),
    justifyContent: 'space-between',
    zIndex: 1,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: hp(0.5),
    gap: wp(1.5),
  },

  whiteText: {
    color: 'white',
    fontSize: normalize(18),
  },

  location: {
    color: 'white',
    opacity: 0.8,
    flex: 1,
    flexWrap: 'wrap',
    fontSize: normalize(14),
  },

  logoCircle: {
    width: normalize(48),
    height: normalize(48),
    borderRadius: normalize(24),
    marginHorizontal: wp(3),
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: normalize(24),
  },

  logoFallback: {
    color: '#7B3FE4',
    fontWeight: 'bold',
    fontSize: normalize(18),
  },
  header: {
    gap: hp(1),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(2),
  },

  heroText: {
    color: palette.white,
    textAlign: 'center',
    fontSize: normalize(24),
    fontWeight: 'bold',
  },

  heroSubText: {
    color: palette.white,
    lineHeight: normalize(18),
    textAlign: 'center',
    paddingBottom: hp(1),
    opacity: 0.9,
    fontSize: normalize(14),
  },

  headingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: hp(2),
  },

  headingBg: {
    position: 'absolute',
    width: '100%',
    height: hp(10),
    resizeMode: 'contain',
    borderRadius: normalize(12),
  },

  headingText: {
    textAlign: 'center',
    fontSize: normalize(20),
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

  createBtn: {
    backgroundColor: palette.eggplant,
    padding: hp(1.8),
    borderRadius: normalize(16),
    marginHorizontal: wp(8),
    alignItems: 'center',
    marginTop: -hp(3),
  },

  createText: {
    color: 'white',
    fontSize: normalize(16),
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

  filterContainer: {
    flexDirection: 'row',
    gap: wp(2),
    marginVertical: hp(1),
  },

  filterChip: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: normalize(20),
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.strokecream,
  },

  activeChip: {
    backgroundColor: palette.primary,
  },

  activeText: {
    color: palette.white,
    fontSize: normalize(12),
  },

  inactiveText: {
    color: palette.textMuted,
    fontSize: normalize(12),
  },

  trendRow: {
    flexDirection: 'row',
    paddingHorizontal: wp(4),
    gap: wp(2),
  },

  trendCard: {
    flex: 1,
    padding: wp(4),
    borderRadius: normalize(16),
    alignItems: 'center',
  },

  trendUp: {
    color: 'green',
    marginTop: hp(0.5),
    fontSize: normalize(12),
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
    borderRadius: normalize(16),
  },

  gamificationCard: {
    margin: wp(4),
    padding: wp(4),
    borderRadius: normalize(16),
    backgroundColor: '#EDE7FF',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: wp(4),
    gap: wp(2),
  },

  impactCard: {
    width: '48%',
    borderRadius: normalize(16),
    alignItems: 'center',
    paddingVertical: hp(2),
  },
});