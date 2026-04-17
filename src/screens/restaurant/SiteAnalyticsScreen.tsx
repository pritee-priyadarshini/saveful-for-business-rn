import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Image,
} from 'react-native';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/theme/colors';

export default function SiteAnalyticsScreen() {
  const navigation = useNavigation();

  const sites = [
    { id: '1', name: 'Burger King - DN Regalia , BBSR' },
    { id: '2', name: 'Burger King - Esplanade , BBSR' },
  ];

  const [selectedSite, setSelectedSite] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const analytics = [
    { label: 'Kgs Saved', value: '120 kg' },
    { label: 'Meals Created', value: '300' },
    { label: 'Charities Supported', value: '12' },
    { label: 'CO2 Emissions', value: '300 kg' },
    { label: 'Total Collection', value: '45' },
    { label: 'Rating', value: '4.5 ⭐' },
  ];

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* HEADER BG */}
        <View style={styles.headerBg}>
          <Image
            source={require('../../../assets/placeholder/feed-bg.png')}
            style={styles.headerImage}
          />

          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={palette.white} />
          </Pressable>

          <AppText variant='h5' style={styles.headerTitle}>
            SITE ANALYTICS
          </AppText>
        </View>

        {/* DROPDOWN */}
        <Pressable
          style={styles.dropdown}
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <AppText variant='bodyLarge'>
            {selectedSite ? selectedSite.name : 'Select Site'}
          </AppText>

          <Ionicons name="chevron-down" size={18} />
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
              {analytics.map((item, index) => (
                <View key={index} style={styles.card}>
                  
                  <View style={styles.pill}>
                    <AppText variant='bodyBold' style={styles.metricValue}>
                      {item.value}
                    </AppText>
                  </View>

                  <AppText variant='bodyLarge' style={styles.metricLabel}>
                    {item.label}
                  </AppText>

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
    paddingBottom: 20,
  },

  headerBg: {
    height: 160,
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
    top: 20,
    left: 20,
  },

  dropdown: {
    backgroundColor: palette.white,
    margin: 16,
    padding: 14,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  dropdownList: {
    backgroundColor: palette.white,
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 20,
  },

  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  analyticsContainer: {
    marginHorizontal: 16,
  },

  sectionTitle: {
    marginBottom: 10,
    textAlign:'center',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  card: {
    width: '48%',
    backgroundColor: palette.radish,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },

  pill: {
    backgroundColor: palette.middlegreen,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 14,
  },

  metricValue: {
    color: palette.white,
  },

  metricLabel: {
    color: palette.black,
    textAlign: 'center',
  },
});