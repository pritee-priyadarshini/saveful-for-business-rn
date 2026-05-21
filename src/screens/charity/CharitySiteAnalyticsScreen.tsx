import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/theme/colors';

const { width, height } = Dimensions.get("window");
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

export default function CharitySiteAnalyticsScreen() {
  const navigation = useNavigation();

  const sites = [
    { id: '1', name: 'Kindness Welfare Association - Patrapada' },
    { id: '2', name: 'Kindness Welfare Association - Baramunda' },
    { id: '3', name: 'Kindness Welfare Association - Rasulgarh' },
  ];

  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const analyticsData: any = {
    '1': [
      { label: 'Kgs Saved', value: '210 kg' },
      { label: 'Meals Created', value: '520' },
      { label: 'Donations Received', value: '35' },
      { label: 'CO2 Reduced', value: '480 kg' },
      { label: 'Collections', value: '60' },
      { label: 'Rating', value: '4.8 ⭐' },
    ],
    '2': [
      { label: 'Kgs Saved', value: '150 kg' },
      { label: 'Meals Created', value: '340' },
      { label: 'Donations Received', value: '22' },
      { label: 'CO2 Reduced', value: '300 kg' },
      { label: 'Collections', value: '40' },
      { label: 'Rating', value: '4.5 ⭐' },
    ],
    '3': [
      { label: 'Kgs Saved', value: '95 kg' },
      { label: 'Meals Created', value: '210' },
      { label: 'Donations Received', value: '18' },
      { label: 'CO2 Reduced', value: '180 kg' },
      { label: 'Collections', value: '28' },
      { label: 'Rating', value: '4.2 ⭐' },
    ],
  };

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* HEADER */}
        <View style={styles.headerBg}>
          <Image
            source={require('../../../assets/placeholder/feed-bg.png')}
            style={styles.headerImage}
          />

          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={normalize(24)} color={palette.white} />
          </Pressable>

          <AppText variant='h5' style={styles.headerTitle}> CHARITY SITE ANALYTICS </AppText>
        </View>

        {/* DROPDOWN */}
        <Pressable
          style={styles.dropdown}
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <AppText variant='bodyLarge'>
            {selectedSite ? selectedSite.name : 'Select Site'}
          </AppText>

          <Ionicons name="chevron-down" size={normalize(18)} />
        </Pressable>

        {showDropdown && (
          <View style={styles.dropdownList}>
            {sites.map((site) => (
              <Pressable
                key={site.id}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedSite(site);
                  setShowDropdown(false);
                }}
              >
                <AppText variant='bodySmall'>{site.name}</AppText>
              </Pressable>
            ))}
          </View>
        )}

        {/* ANALYTICS */}
        {selectedSite && (
          <View style={styles.analyticsContainer}>

            <AppText variant='subheading' style={styles.sectionTitle}>
              Overview
            </AppText>

            <View style={styles.grid}>
              {analyticsData[selectedSite.id].map((item: any, index: number) => (
                <View key={index} style={styles.card}>

                  <View style={styles.pill}>
                    <AppText variant='bodyBold' style={styles.metricValue}> {item.value} </AppText>
                  </View>
                  <AppText variant='bodyLarge' style={styles.metricLabel}> {item.label} </AppText>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: hp(3),
  },

  headerBg: {
    height: hp(20),
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },

  headerTitle: {
    color: palette.white,
  },

  backBtn: {
    position: 'absolute',
    top: hp(2.2),
    left: wp(4),
  },

  dropdown: {
    backgroundColor: palette.white,
    margin: wp(4),
    padding: wp(3.5),
    borderRadius: normalize(10),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  dropdownList: {
    backgroundColor: palette.white,
    borderRadius: normalize(10),
    marginHorizontal: wp(4),
    marginBottom: hp(2.5),
  },

  dropdownItem: {
    padding: normalize(12),
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  analyticsContainer: {
    marginHorizontal: wp(4),
  },

  sectionTitle: {
    marginBottom: hp(1.2),
    textAlign: 'center',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  card: {
    width: '48%',
    backgroundColor: palette.radish,
    padding: wp(4),
    borderRadius: normalize(12),
    marginBottom: hp(1.5),
    alignItems: 'center',
  },

  pill: {
    backgroundColor: palette.middlegreen,
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.4),
    borderRadius: normalize(20),
    marginBottom: hp(1.6),
  },

  metricValue: {
    color: palette.white,
  },

  metricLabel: {
    color: palette.black,
    textAlign: 'center',
  },
});