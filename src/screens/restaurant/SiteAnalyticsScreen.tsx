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
    {
      id: '1',
      name: 'Burger King - DN Regalia , BBSR',
      analytics: {
        redistributedKg: 4800,
        peopleKg: 3600,
        collections: 123,
        charities: 4,
        rating: 4.5,
      },
    },
    {
      id: '2',
      name: 'Burger King - Esplanade , BBSR',
      analytics: {
        redistributedKg: 3200,
        peopleKg: 2100,
        collections: 84,
        charities: 3,
        rating: 4.7,
      },
    },
  ];

  const [selectedSite, setSelectedSite] = useState(sites[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const analytics = selectedSite.analytics;
  const redistributedKg = analytics.redistributedKg;

  // 420g = 1 meal
  const mealsCreated = Math.floor((redistributedKg * 1000) / 420);

  // ₹200 per meal
  const moneySaved = mealsCreated * 1.5;

  // 1kg food waste ≈ 2.5kg CO₂e
  const co2Avoided = redistributedKg * 2.5;

  const peopleKg = analytics.peopleKg;
  const animalKg = redistributedKg - peopleKg;
  const peoplePercent = Math.round((peopleKg / redistributedKg) * 100);
  const animalPercent = 100 - peoplePercent;

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
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
            <Ionicons name="arrow-back" size={24} color={palette.white} />
          </Pressable>

          <AppText variant='h5' style={styles.headerTitle}>
            SITE ANALYTICS
          </AppText>
        </View>

        {/* SITE SELECTOR */}

        <View style={styles.contentWrapper}>
          <Pressable
            style={styles.dropdown}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <AppText variant="bodyLarge"> {selectedSite.name} </AppText>

            <Ionicons
              name={ showDropdown ? 'chevron-up' : 'chevron-down' }
              size={18}
            />
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
                  <AppText variant="bodySmall"> {site.name} </AppText>
                </Pressable>
              ))}
            </View>
          )}

          {/* OVERVIEW */}

          <AppText variant="subheading" style={styles.sectionTitle}>
            Overview
          </AppText>

          {/* ROW 1 */}
          <View style={styles.analyticsRow}>
            <View style={styles.analyticsCard}>
              <Image source={require('../../../assets/placeholder/storage_box_green.png')} style={styles.cardIcon} />
              <View>
                <AppText variant="bodyBold" style={styles.greenValue} >
                  {redistributedKg.toLocaleString()} kg
                </AppText>

                <AppText variant="bodySmall" style={styles.cardLabel} >
                  Redistributed
                </AppText>
              </View>
            </View>

            <View style={styles.analyticsCard}>
              <Image source={require('../../../assets/placeholder/cutlery_icon.png')} style={styles.cardIcon} />
              <View>
                <AppText variant="bodyBold" style={styles.greenValue} >
                  {mealsCreated.toLocaleString()}
                </AppText>

                <AppText variant="bodySmall" style={styles.cardLabel} >
                  Meals created
                </AppText>
              </View>
            </View>
          </View>

          {/* ROW 2 */}
          <View style={styles.analyticsRow}>
            <View style={styles.analyticsCard}>
              <Image source={require('../../../assets/placeholder/co2_green_icon.png')} style={styles.cardIcon} />

              <View>
                <AppText variant="bodyBold" style={styles.greenValue} >
                  {co2Avoided.toLocaleString()} kg
                </AppText>

                <AppText variant="bodySmall" style={styles.cardLabel} >
                  Total CO₂ avoided
                </AppText>
              </View>
            </View>

            <View style={styles.analyticsCard}>
              <Image source={require('../../../assets/placeholder/money_icon.png')} style={styles.cardIcon} />
              <View>
                <AppText variant="bodyBold" style={styles.greenValue}>
                  ${moneySaved.toLocaleString()}
                </AppText>

                <AppText variant="bodySmall" style={styles.cardLabel}>
                  Total Food Saved
                </AppText>
              </View>
            </View>
          </View>

          {/* ROW 3 */}
          <View style={styles.analyticsRow}>
            <View style={styles.analyticsCard}>
              <Image source={require('../../../assets/placeholder/truck_icon.png')} style={styles.cardIcon}/>

              <View>
                <AppText variant="bodyBold" style={styles.greenValue} >
                  {analytics.collections}
                </AppText>

                <AppText variant="bodySmall" style={styles.cardLabel} >
                  Collections completed
                </AppText>
              </View>
            </View>

            <View style={styles.analyticsCard}>
              <Image source={require('../../../assets/placeholder/charity_green.png')} style={styles.cardIcon} />

              <View>
                <AppText variant="bodyBold" style={styles.greenValue}  >
                  {analytics.charities}
                </AppText>

                <AppText variant="bodySmall" style={styles.cardLabel} >
                  Charities Supported
                </AppText>
              </View>
            </View>
          </View>

          {/* PEOPLE */}
          <View style={styles.peopleAnimalsRow}>
            <View style={styles.peopleCard}>
              <View style={styles.segmentHeader}>
                <Image source={require('../../../assets/placeholder/people_icon.png')}  style={styles.segmentIcon}/>

                <AppText variant="label" style={styles.peopleTitle}>
                  For People
                </AppText>
              </View>

              <View style={styles.peopleFoodRow}>
                <Image source={require('../../../assets/placeholder/storage_box_green.png')} style={styles.foodIcon}/>
                <AppText variant="bodyBold" style={styles.peopleValue}>
                  {peopleKg.toLocaleString()} kg
                </AppText>
              </View>

              <AppText variant="bodySmall" style={styles.cardLabel}>
                Food donated
              </AppText>

              <View style={styles.progressTrack}>
                <View style={[ styles.progressFillPeople,{width: `${peoplePercent}%`,},]} />
              </View>

              <AppText variant="bodySmall" style={styles.percentText} >
                {peoplePercent}%
              </AppText>
            </View>

            {/* ANIMALS */}

            <View style={styles.animalsCard}>
              <View style={styles.segmentHeader}>
                <Image source={require('../../../assets/placeholder/cow_front.png')} style={styles.segmentIcon}/>

                <AppText variant="label" style={styles.animalsTitle}>
                  For Animals
                </AppText>
              </View>

              <View style={styles.peopleFoodRow}>
                <Image source={require('../../../assets/placeholder/storage_box_orange.png')} style={styles.foodIcon} />

                <AppText variant="bodyBold" style={styles.animalsValue}>
                  {animalKg.toLocaleString()} kg
                </AppText>
              </View>

              <AppText variant="bodySmall" style={styles.cardLabel}>
                Feed provided
              </AppText>

              <View style={styles.progressTrackOrange}>
                <View style={[ styles.progressFillAnimals, {width: `${animalPercent}%`,}, ]}/>
              </View>

              <AppText variant="bodySmall" style={styles.percentText} >
                {animalPercent}%
              </AppText>
            </View>
          </View>

          {/* RATING */}
          <View style={styles.ratingCard}>
            <Image
              source={require('../../../assets/placeholder/rating_icon.png')}
              style={styles.ratingIcon}
            />

            <View>
              <AppText variant="bodyBold" style={styles.greenValue}>                
                {analytics.rating}/5
              </AppText>

              <AppText variant="bodySmall" style={styles.cardLabel} >
                Rating
              </AppText>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}


const styles = StyleSheet.create({
  container: {
    paddingBottom: 30,
  },

  headerBg: {
    height: 150,
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
    letterSpacing: 0.5,
  },

  backBtn: {
    position: 'absolute',
    left: 20,
    top: 20,
    zIndex: 10,
  },

  contentWrapper: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },

  dropdown: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dropdownList: {
    backgroundColor: palette.white,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ECECEC',
  },

  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },

  sectionTitle: {
    marginTop: 14,
    marginBottom: 14,
  },

  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  analyticsCard: {
    width: '48.5%',
    backgroundColor: palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#9BC6A7',
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  cardIcon: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
    marginRight: 10,
  },

  greenValue: {
    color: '#2E8B57',
    marginBottom: 2,
  },

  cardLabel: {
    color: '#6B6B6B',
  },

  peopleAnimalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 12,
  },

  peopleCard: {
    width: '48.5%',
    backgroundColor: palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#9BC6A7',
    padding: 12,
  },

  animalsCard: {
    width: '48.5%',
    backgroundColor: palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3B37A',
    padding: 12,
  },

  segmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  segmentIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    marginRight: 8,
  },

  peopleTitle: {
    color: '#2E8B57',
  },

  animalsTitle: {
    color: '#F28C38',
  },

  peopleValue: {
    color: '#2E8B57',
    marginBottom: 2,
  },

  animalsValue: {
    color: '#F28C38',
    marginBottom: 2,
  },

  progressTrack: {
    height: 8,
    backgroundColor: '#D8E8DC',
    borderRadius: 100,
    overflow: 'hidden',
    marginTop: 10,
  },

  progressFillPeople: {
    height: '100%',
    backgroundColor: '#2E8B57',
    borderRadius: 100,
  },

  progressTrackOrange: {
    height: 8,
    backgroundColor: '#F8DEC8',
    borderRadius: 100,
    overflow: 'hidden',
    marginTop: 10,
  },

  progressFillAnimals: {
    height: '100%',
    backgroundColor: '#F28C38',
    borderRadius: 100,
  },

  percentText: {
    textAlign: 'right',
    marginTop: 6,
    color: '#666',
  },

  ratingCard: {
    backgroundColor: palette.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#9BC6A7',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  ratingIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
    marginRight: 12,
  },

  peopleFoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 2,
  },

  foodIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    marginRight: 8,
  },
});