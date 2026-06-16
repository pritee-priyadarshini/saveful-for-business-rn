import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  Dimensions,
  Image,
  TouchableOpacity,
} from 'react-native';

import { LineChart } from 'react-native-chart-kit';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Skeleton } from '../../components/Skeleton';
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

const chartConfig = {
  backgroundGradientFrom: palette.white,
  backgroundGradientTo: palette.white,
  decimalPlaces: 0,
  color: () => palette.middlegreen,
  labelColor: () => palette.stone,
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: palette.middlegreen,
  },
};


export function CharityAnalyticsScreen() {
  const navigation = useNavigation<any>();

  const [selectedRange, setSelectedRange] = React.useState<'week' | 'month' | 'year'>('week');
  const [selectedMetric, setSelectedMetric] = React.useState<'food' | 'meals' | 'co2' | 'collection'>('food');
  const thisMonthCards = [
    {
      value: '1000 kg',
      label: 'Food Recovered',
      icon: require('../../../assets/placeholder/storage_box_green.png'),
    },
    {
      value: '2340',
      label: 'Meals Created',
      icon: require('../../../assets/placeholder/cutlery_icon.png'),
    },
    {
      value: '6400 kg',
      label: 'Total CO₂ Avoided',
      icon: require('../../../assets/placeholder/co2_green_icon.png'),
    },
    {
      value: '18',
      label: 'Collections Completed',
      icon: require('../../../assets/placeholder/truck_icon.png'),
    },
    {
      value: '4.5/5',
      label: 'Rating',
      icon: require('../../../assets/placeholder/rating_icon.png'),
    },
  ];

  const lifetimeCards = [
    {
      value: '4800 kg',
      label: 'Food Recovered',
      icon: require('../../../assets/placeholder/storage_box_green.png'),
    },
    {
      value: '11240',
      label: 'Meals Created',
      icon: require('../../../assets/placeholder/cutlery_icon.png'),
    },
    {
      value: '15000 kg',
      label: 'Total CO₂ Avoided',
      icon: require('../../../assets/placeholder/co2_green_icon.png'),
    },
    {
      value: '123',
      label: 'Collections Completed',
      icon: require('../../../assets/placeholder/truck_icon.png'),
    },
    {
      value: '4.5/5',
      label: 'Rating',
      icon: require('../../../assets/placeholder/rating_icon.png'),
    },
  ];

  const graphData = {
    week: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      food: [120, 180, 140, 260, 220, 340, 400],
      meals: [300, 420, 350, 620, 540, 780, 920],
      co2: [90, 130, 100, 190, 170, 260, 330],
      collection: [1, 2, 3, 4, 5, 7, 8],
    },

    month: {
      labels: ['W1', 'W2', 'W3', 'W4'],
      food: [800, 1100, 1400, 1800],
      meals: [2400, 3200, 4100, 5200],
      co2: [500, 700, 900, 1200],
      collection: [12, 18, 24, 30],
    },

    year: {
      labels: ['21', '22', '23', '24', '25'],
      food: [6000, 7200, 8400, 9800, 11200],
      meals: [15000, 18000, 21000, 26000, 32000],
      co2: [4200, 5100, 6200, 7700, 9200],
      collection: [90, 110, 130, 150, 180],
    },
  };

  const current = graphData[selectedRange];

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
              <AppText variant="h7" style={styles.whiteText} >
                {charityProfile.organization}
              </AppText>

              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={normalize(14)} color={palette.white} />
                <AppText variant="h8" style={styles.location}>
                  {charityProfile.address}
                </AppText>
              </View>

            </View>

            <View style={styles.logoCircle}>
              <AppText variant="h6" style={styles.logoFallback} > S </AppText>
            </View>
          </View>

          <View style={styles.header}>
            <AppText variant="h3" style={styles.heroText}> YOUR DASHBOARD </AppText>
          </View>
        </View>

        {/* THIS MONTH */}
        <AppText variant="bodyBold" style={styles.sectionHeader} > This Month </AppText>

        <View style={styles.grid}>
          {thisMonthCards.map((item, index) => (
            <View key={index} style={styles.analyticsCard} >
              <Image source={item.icon} style={styles.analyticsIcon} />

              <View style={styles.analyticsContent}>
                <AppText variant="h8" style={styles.analyticsValue}> {item.value} </AppText>
                <AppText variant="h8" style={styles.analyticsLabel}> {item.label} </AppText>
              </View>
            </View>
          ))}
        </View>

        {/* IMPACT OVER TIME */}
        <AppText variant="bodyBold" style={styles.sectionHeader}> Impact Over Time </AppText>

        {/* RANGE FILTER */}
        <View style={styles.rangeRow}>
          {(['week', 'month', 'year'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.rangeChip,
                selectedRange === range && styles.rangeChipActive,
              ]}
              onPress={() => setSelectedRange(range)}
            >
              <AppText variant='bodyBold' style={selectedRange === range ? styles.rangeChipTextActive : styles.rangeChipText} >
                {range.toUpperCase()}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* METRIC FILTER */}
        <View style={styles.metricFilterRow}>
          {[
            ['food', 'Food Recovered'],
            ['meals', 'Meals Created'],
            ['co2', 'CO₂ Avoided'],
            ['collection', 'Collections Completed'],
          ].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.metricChip,
                selectedMetric === key && styles.metricChipActive,
              ]}
              onPress={() => setSelectedMetric(key as any)}
            >
              <AppText variant='label' style={selectedMetric === key ? styles.metricChipTextActive : styles.metricChipText} >
                {label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* GRAPH */}
        <View style={styles.chartCard}>
          <LineChart
            data={{
              labels: current.labels,
              datasets: [ { data: current[ selectedMetric ], }, ],
            }}
            width={wp(88)}
            height={hp(22)}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        {/* LIFETIME IMPACT */}
        <AppText variant="bodyBold" style={styles.sectionHeader} > Lifetime Impact </AppText>

        <View style={styles.grid}>
          {lifetimeCards.map((item, index) => (
            <View key={index} style={styles.analyticsCard}>
              <Image source={item.icon} style={styles.analyticsIcon} />

              <View style={styles.analyticsContent}>
                <AppText variant="h8" style={styles.analyticsValue} > {item.value} </AppText>
                <AppText variant="h8" style={styles.analyticsLabel} > {item.label} </AppText>
              </View>
            </View>
          ))}
        </View>

        <Button
          label="View Collections History"
          style={styles.cta}
          onPress={() => navigation.navigate('CharityHistory' ) }
        />

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: hp(4),
  }, 

  heroContainer: {
    height: hp(18),
    width: '100%',
    overflow: 'hidden',
    backgroundColor: palette.primary,
    paddingTop: hp(2),
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
    flexShrink: 1,
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
    marginTop: hp(4.5),
  },

  heroText: {
    color: palette.white,
  },

  sectionHeader: {
    marginHorizontal: wp(4),
    marginTop: hp(1.6),
    marginBottom: hp(0.8),
    lineHeight: normalize(40),
    fontSize: normalize(18),
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
    borderColor: '#DDE5DE',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.8),
    marginBottom: hp(1),
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    elevation: 1,
  },

  analyticsIcon: {
    width: normalize(24),
    height: normalize(24),
    resizeMode: 'contain',
    marginRight: wp(2),
  },

  analyticsContent: {
    flex: 1,
    alignItems: 'center',
  },

  analyticsValue: {
    color: palette.middlegreen,
    marginBottom: hp(0.1),
  },

  analyticsLabel: {
    fontSize: normalize(10),
    color: palette.stone,
  },

  rangeRow: {
    flexDirection: 'row',
    marginHorizontal: wp(4),
    marginBottom: hp(0.8),
    gap: wp(2),
  },

  rangeChip: {
    flex: 1,
    height: hp(4.2),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: normalize(10),
    backgroundColor: palette.white,
    borderWidth:1,
    borderColor:palette.middlegreen,
  },

  rangeChipActive: {
    backgroundColor: palette.primary,
  },

  rangeChipText: {
    fontSize: normalize(11),
    color: palette.middlegreen,
  },

  rangeChipTextActive: {
    fontSize: normalize(11),
    color: palette.white,
  },

  metricFilterRow: {
    flexDirection: 'row',
    marginHorizontal: wp(4),
    marginBottom: hp(1),
    gap: wp(2),
  },

  metricChip: {
    flex: 1,
    height: hp(4.2),
    paddingHorizontal: wp(2),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: normalize(10),
    backgroundColor: palette.white,
    borderWidth:1,
    borderColor:palette.middlegreen,
  },

  metricChipActive: {
    backgroundColor: palette.primary,
  },

  metricChipText: {
    fontSize: normalize(10),
    color: palette.middlegreen,

  },

  metricChipTextActive: {
    fontSize: normalize(10),
    color: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    alignContent: 'center',
  },

  chartCard: {
    backgroundColor: palette.white,
    marginHorizontal: wp(4),
    marginBottom: hp(1.5),
    borderRadius: normalize(14),
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingTop: hp(1),
    paddingBottom: hp(2),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    elevation: 1,
  },

  chart: {
    borderRadius: normalize(12),
    marginLeft: -wp(4),
  },

  cta: {
    marginHorizontal: wp(4),
    marginTop: hp(1),
    marginBottom: hp(3),
    backgroundColor: palette.middlegreen,
    borderWidth:1,
    borderColor:palette.middlegreen,
  },
});