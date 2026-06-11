



import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  TouchableOpacity,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { AppText } from '../../components/AppText';
import { Screen } from '@/components/Screen';
import { palette } from '@/theme/colors';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get("window");
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};


export function FarmerAnalyticsScreen() {
  const [selectedRange, setSelectedRange] = React.useState<'week' | 'month' | 'year'>('week');
  const [selectedMetric, setSelectedMetric] = React.useState<'food' | 'meal' | 'co2' | 'collection'>('food');
  const analyticsCards = [
    {
      value: '1000 kg',
      label: 'Food Collected',
      icon: require('../../../assets/placeholder/storage_box_green.png'),
    },
    {
      value: '50',
      label: 'Collections Completed',
      icon: require('../../../assets/placeholder/truck_icon.png'),
    },
    {
      value: '6400 kg',
      label: 'Total CO2 Avoided',
      icon: require('../../../assets/placeholder/co2_green_icon.png'),
    },
    {
      value: '4.5/5',
      label: 'Rating',
      icon: require('../../../assets/placeholder/rating_icon.png'),
    },
  ];

  const lifetimeCards = [
    {
      value: '4000 kg',
      label: 'Food Collected',
      icon: require('../../../assets/placeholder/storage_box_green.png'),
    },
    {
      value: '120',
      label: 'Collections Completed',
      icon: require('../../../assets/placeholder/truck_icon.png'),
    },
    {
      value: '9600 kg',
      label: 'Food Diverted',
      icon: require('../../../assets/placeholder/co2_green_icon.png'),
    },
    {
      value: '4.5/5',
      label: 'Rating',
      icon: require('../../../assets/placeholder/rating_icon.png'),
    },
  ];

  const graphData = {
    week: {
      food: [120, 180, 140, 260, 220, 340, 400],
      meal: [300, 420, 350, 600, 520, 780, 920],
      co2: [80, 130, 110, 190, 170, 250, 320],
      collection: [2, 4, 3, 6, 5, 8, 10],
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    },

    month: {
      food: [900, 1100, 1300, 1600, 1200],
      meal: [2200, 2600, 3100, 3800, 2800],
      co2: [600, 720, 860, 1050, 800],
      collection: [12, 18, 21, 28, 15],
      labels: ['Jan', 'Feb', 'March', 'April', 'May'],
    },

    year: {
      food: [6000, 7200, 8100, 9400, 11200],
      meal: [14000, 17000, 19400, 22800, 27000],
      co2: [4200, 5100, 5900, 6800, 8100],
      collection: [120, 150, 180, 220, 270],
      labels: ['2021', '2022', '2023', '2024', '2025'],
    },
  };

  const currentData = graphData[selectedRange];

  return (
    <Screen backgroundColor={palette.creme} scrollable={false}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >

        {/* HEADER */}
        <View style={styles.heroContainer}>
          <Image source={require('../../../assets/placeholder/feed-bg.png')} style={styles.heroBg} />
          <View style={styles.topBar}>
            <View style={{ flex: 1 }}>
              <AppText variant="h7" style={styles.whiteText} > SEVA BHOJAN TRUST </AppText>

              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={normalize(14)} color={palette.white} />
                <AppText variant="body" style={styles.location}  > SHAHEED NAGAR, BHUBANESWAR </AppText>
              </View>
            </View>

            <View style={styles.headerActions}>
              <View style={styles.logoCircle}>
                <AppText variant="bodyBold" style={styles.logoFallback} >
                  S
                </AppText>
              </View>
            </View>
          </View>

          <View style={styles.header}>
            <AppText variant="h4" style={styles.heroText} > YOUR DASHBOARD </AppText>
          </View>
        </View>

        {/* THIS MONTH */}
        <AppText variant="label" style={styles.sectionHeader}> This Month </AppText>
        <View style={styles.grid}>
          {analyticsCards.map(
            (item, index) => (
              <View key={index} style={styles.analyticsCard} >
                <Image source={item.icon} style={styles.analyticsIcon} />
                <View style={styles.analyticsContent}>
                  <AppText variant="h7" style={styles.analyticsValue} > {item.value} </AppText>
                  <AppText variant="bodyBold" style={styles.analyticsLabel}> {item.label} </AppText>
                </View>
              </View>
            )
          )}
        </View>

        {/* IMPACT OVERVIEW */}
        <AppText variant="label" style={styles.sectionHeader} > Impact Over Time </AppText>

        {/* RANGE */}
        <View style={styles.rangeRow}>
          {(['week', 'month', 'year'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.rangeChip,
                selectedRange === range &&
                styles.rangeChipActive,
              ]}
              onPress={() =>setSelectedRange(range) }
            >
              <AppText style={selectedRange === range ? styles.rangeChipTextActive : styles.rangeChipText } >
                {range.toUpperCase()}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* METRICS */}
        <View style={styles.metricFilterRow}>
          <TouchableOpacity
            style={[
              styles.metricChip,
              selectedMetric === 'food' && styles.metricChipActive,
            ]}
            onPress={() => setSelectedMetric('food') }
          >
            <AppText variant='bodySmall' style={ selectedMetric === 'food' ? styles.metricChipTextActive : styles.metricChipText } >
              Food Recovered
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.metricChip,
              selectedMetric === 'meal' && styles.metricChipActive,
            ]}
            onPress={() =>setSelectedMetric('meal') }
          >
            <AppText variant='bodySmall' style={ selectedMetric === 'meal' ? styles.metricChipTextActive : styles.metricChipText } >
              Meal Created
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.metricChip,
              selectedMetric === 'co2' && styles.metricChipActive,
            ]}
            onPress={() =>setSelectedMetric('co2')}
          >
            <AppText variant='bodySmall' style={ selectedMetric === 'co2' ? styles.metricChipTextActive : styles.metricChipText } >
              CO2 Avoided
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.metricChip,
              selectedMetric === 'collection' && styles.metricChipActive,
            ]}
            onPress={() =>setSelectedMetric( 'collection')}
          >
            <AppText variant='bodySmall' style={ selectedMetric === 'collection' ? styles.metricChipTextActive : styles.metricChipText } >
              Collections Completed
            </AppText>
          </TouchableOpacity>

        </View>

        {/* GRAPH */}
        <View style={styles.chartCard}>
          <LineChart
            data={{
              labels: currentData.labels,
              datasets: [
                {
                  data: currentData[selectedMetric ],
                },
              ],
            }}
            width={wp(88)}
            height={hp(28)}
            chartConfig={{
              backgroundGradientFrom: palette.white,
              backgroundGradientTo: palette.white,
              decimalPlaces: 0,
              color: () => palette.middlegreen,
              labelColor: () => '#666',
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {/* LIFETIME */}
        <AppText variant="label" style={styles.sectionHeader} > Lifetime Impact  </AppText>
        <View style={styles.grid}>
          {lifetimeCards.map(
            (item, index) => (
              <View key={index} style={styles.analyticsCard} >
                <Image source={item.icon} style={styles.analyticsIcon} />
                <View style={styles.analyticsContent}>
                  <AppText variant="bodyBold" style={styles.analyticsValue}> {item.value} </AppText>
                  <AppText variant="bodySmall" style={styles.analyticsLabel}> {item.label} </AppText>
                </View>
              </View>
            )
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}


const styles = StyleSheet.create({
  container: {
    paddingBottom: hp(4),
  },

  heroContainer: {
    height: hp(17),
    width: '100%',
    overflow: 'hidden',
    backgroundColor: palette.primary,
    paddingTop: hp(2.5),
  },

  heroBg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: wp(4),
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },

  iconBtn: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: palette.white,
    justifyContent: 'center',
    alignItems: 'center',
  },

  whiteText: {
    color: palette.white,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(0.5),
    gap: wp(1),
  },

  location: {
    color: palette.white,
    fontSize: normalize(11),
  },

  logoCircle: {
    width: normalize(38),
    height: normalize(38),
    borderRadius: normalize(19),
    backgroundColor: palette.white,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoFallback: {
    color: palette.primary,
  },

  header: {
    alignItems: 'center',
    marginTop: hp(2.5),
  },

  heroText: {
    color: palette.white,
  },

  sectionHeader: {
    marginHorizontal: wp(4),
    marginTop: hp(1.8),
    marginBottom: hp(1),
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: wp(4),
  },

  analyticsCard: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: normalize(12),
    borderWidth: 1,
    borderColor: '#E6E6E6',
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(3),
    marginBottom: hp(1),
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  analyticsIcon: {
    width: normalize(24),
    height: normalize(24),
    resizeMode: 'contain',
    marginRight: wp(2),
  },

  analyticsContent: {
    flex: 1,
  },

  analyticsValue: {
    color: palette.middlegreen,
    marginBottom: hp(0.2),
  },

  analyticsLabel: {
    color: '#666',
    fontSize: normalize(11),
  },

  metricFilterRow: {
    flexDirection: 'row',
    marginHorizontal: wp(4),
    marginBottom: hp(1),
    gap: wp(2),
  },

  metricChip: {
    flex: 1,
    height: hp(4.5),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.middlegreen,
    borderRadius: normalize(8),
    paddingHorizontal: wp(1.5),
  },

  metricChipActive: {
    backgroundColor: palette.primary,
  },

  metricChipText: {
    color: palette.middlegreen,
    fontSize: normalize(11),
  },

  metricChipTextActive: {
    color: palette.white,
    fontSize: normalize(11),
  },

  rangeRow: {
    flexDirection: 'row',
    marginHorizontal: wp(4),
    marginBottom: hp(1.2),
    gap: wp(2),
  },

  rangeChip: {
    flex: 1,
    height: hp(4.5),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.middlegreen,
    borderRadius: normalize(8),
  },

  rangeChipActive: {
    backgroundColor: palette.primary,
  },

  rangeChipText: {
    color: '#666',
    fontSize: normalize(11),
  },

  rangeChipTextActive: {
    color: palette.white,
    fontSize: normalize(11),
  },

  chartCard: {
    backgroundColor: palette.white,
    marginHorizontal: wp(4),
    marginBottom: hp(1.5),
    borderRadius: normalize(16),
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingVertical: hp(3),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  chart: {
    borderRadius: normalize(16),
    marginLeft: -wp(4),
  },
});