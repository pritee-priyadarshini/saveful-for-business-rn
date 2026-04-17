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

        {/* STATUS */}
        <View style={styles.section}>
          <View style={styles.headingContainer}>
            <Image
              source={require('../../../assets/placeholder/Illustration.png')}
              style={styles.headingBg}
            />

            <AppText variant="heading" style={styles.headingText}>
              Today's Status
            </AppText>
          </View>
        </View>
        {sortedListings.length === 0 ? (

          <View style={styles.emptyStateBox}>
            <AppText variant="bodyBold">
              You haven’t listed anything today
            </AppText>

            <Pressable
              style={styles.smallBtn}
              onPress={() =>
                navigation.navigate('Listings', {
                  screen: 'CreateListing',
                })
              }
            >
              <AppText style={styles.smallBtnText}>
                + Add Listing
              </AppText>
            </Pressable>
          </View>

        ) : (

          sortedListings.slice(0, 1).map((item) => (
            <View key={item.id} style={styles.listingBox}>

              {/* TOP */}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyBold">{item.title}</AppText>
                  <AppText variant="caption">
                    {item.quantityKg}kg • {item.pickupWindow}
                  </AppText>
                </View>

                <View style={styles.status}>
                  <AppText variant="caption">{item.status}</AppText>
                </View>
              </View>

              {/* DETAILS */}
              <View style={styles.detailsRow}>
                <Image
                  source={require('../../../assets/placeholder/bowl.png')}
                  style={styles.image}
                />

                <View style={{ flex: 1 }}>
                  <AppText variant="caption">
                    📍 {item.suburb}
                  </AppText>

                  <AppText variant="caption">
                    {item.receiver
                      ? `Collected by ${item.receiver}`
                      : 'Waiting for charity'}
                  </AppText>
                </View>
              </View>

            </View>
          ))

        )}


        <Pressable
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateListing')}
        >
          <AppText style={styles.createText}>+ Create New Listing</AppText>
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
            <AppText variant="caption">Kg Saveds</AppText>
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
              <AppText variant="caption">{item.label}</AppText>
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
    gap: spacing.lg,
  },

  heroContainer: {
    height: 200,
    width: '100%',
    paddingTop: spacing.lg,
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
    paddingLeft: spacing.md,
    justifyContent: 'space-between',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xs,
    gap: 6,
  },

  whiteText: {
    color: 'white',
  },

  location: {
    color: 'white',
    opacity: 0.8,
    flex: 1,
    flexWrap: 'wrap',
  },

  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginHorizontal: spacing.sm,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },

  logoFallback: {
    color: '#7B3FE4',
    fontWeight: 'bold',
  },
  header: {
    gap: spacing.sm,
  },

  heroText: {
    paddingTop: spacing.xxl,
    color: palette.white,
    textAlign: 'center',
  },

  heroSubText: {
    color: palette.white,
    lineHeight: 10,
    textAlign: 'center',
    paddingBottom: spacing.sm,
    opacity: 0.9,
  },

  headingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xxl,
  },

  headingBg: {
    position: 'absolute',
    width: '100%',
    height: 80,
    resizeMode: 'contain',
    borderRadius: 12,
  },

  headingText: {
    textAlign: 'center',
  },

  emptyStateBox: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: '#EEE7FF',
    alignItems: 'center',
    gap: spacing.sm,
  },

  smallBtn: {
    marginTop: spacing.sm,
    backgroundColor: palette.eggplant,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },

  smallBtnText: {
    color: palette.white,
  },

  createBtn: {
    backgroundColor: palette.eggplant,
    padding: spacing.md,
    borderRadius: 16,
    marginLeft: spacing.xl,
    marginRight: spacing.xl,
    alignItems: 'center',
  },

  createText: {
    color: 'white',
  },

  listingBox: {
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.black,
    backgroundColor: palette.creme,
    gap: spacing.md,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  status: {
    backgroundColor: '#EEE7FF',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 14,
  },

  detailsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },

  image: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },

  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },

  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.strokecream,
  },

  activeChip: {
    backgroundColor: palette.primary,
  },

  activeText: {
    color: palette.white,
  },

  inactiveText: {
    color: palette.textMuted,
  },

  trendRow: {
    flexDirection: 'row',
  },

  trendCard: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
    padding: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
  },

  trendUp: {
    color: 'green',
    marginTop: spacing.xs,
  },

  section: {
    marginHorizontal: spacing.md,
    gap: spacing.sm,
  },

  pill: {
    backgroundColor: palette.middlegreen,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
    marginTop: spacing.xs,
  },

  pillText: {
    color: palette.white,
    textAlign: 'center',
  },

  chart: {
    borderRadius: 16,
  },

  gamificationCard: {
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: '#EDE7FF',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: spacing.lg,
    gap: spacing.sm,
  },

  impactCard: {
    width: '48%',
    borderRadius: 16,
    alignItems: 'center',
    textAlign: 'center',
  },
});