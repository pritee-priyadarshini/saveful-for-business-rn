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
    {
      id: '1',
      name: 'Kindness Welfare Association - Patrapada',
      analytics: {
        foodReceivedKg: 210,
        collections: 60,
        activeDonors: 12,
        rating: 4.8,
        utilisationRate: 96,
        successRate: 98,
      },
    },
    {
      id: '2',
      name: 'Kindness Welfare Association - Baramunda',
      analytics: {
        foodReceivedKg: 150,
        collections: 40,
        activeDonors: 9,
        rating: 4.5,
        utilisationRate: 92,
        successRate: 95,
      },
    },
    {
      id: '3',
      name: 'Kindness Welfare Association - Rasulgarh',
      analytics: {
        foodReceivedKg: 95,
        collections: 28,
        activeDonors: 6,
        rating: 4.2,
        utilisationRate: 90,
        successRate: 91,
      },
    },
  ];

  const [selectedSite, setSelectedSite] = useState(sites[0]);
  const [showDropdown, setShowDropdown] = useState(false);

  const analytics = selectedSite.analytics;
  const foodReceivedKg = analytics.foodReceivedKg;
  const mealsCreated = Math.round( foodReceivedKg / 0.42 );
  const co2Avoided = Math.round( foodReceivedKg * 2.5);
  const beneficiariesServed = Math.round( mealsCreated * 0.8);
  const foodValueSaved = mealsCreated * 200;
  const siteHealth = Math.round(( analytics.successRate + analytics.utilisationRate) / 2
  );

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
            <Ionicons name="arrow-back" size={normalize(24)} color={palette.white} />
          </Pressable>

          <AppText variant='h5' style={styles.headerTitle}> CHARITY SITE ANALYTICS </AppText>
        </View>
        <View style={styles.contentWrapper}>

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

          <AppText variant="subheading" style={styles.sectionTitle}  > Overview </AppText>

          {/* ROW 1 */}
          <View style={styles.analyticsRow}>
            <View style={styles.analyticsCard}>
              <Image source={require('../../../assets/placeholder/storage_box_green.png')} style={styles.cardIcon}  />
              <View>
                <AppText variant="bodyBold" style={styles.greenValue} >
                  {foodReceivedKg.toLocaleString()} kg
                </AppText>

                <AppText variant="bodySmall" style={styles.cardLabel} >
                  Food Received
                </AppText>
              </View>
            </View>

            <View style={styles.analyticsCard}>
              <Image source={require('../../../assets/placeholder/cutlery_icon.png')} style={styles.cardIcon}  />
              <View>
                <AppText variant="bodyBold" style={styles.greenValue} > {mealsCreated.toLocaleString()} </AppText>
                <AppText variant="bodySmall" style={styles.cardLabel} > Meals Created </AppText>
              </View>
            </View>
          </View>

          {/* ROW 2 */}
          <View style={styles.analyticsRow}>
            <View style={styles.analyticsCard}>
              <Image source={require('../../../assets/placeholder/co2_green_icon.png')} style={styles.cardIcon} />

              <View>
                <AppText variant="bodyBold" style={styles.greenValue} >{co2Avoided.toLocaleString()} kg </AppText>
                <AppText variant="bodySmall" style={styles.cardLabel} >CO₂ Avoided </AppText>
              </View>
            </View>

            <View style={styles.analyticsCard}>
              <Image source={require('../../../assets/placeholder/money_icon.png')} style={styles.cardIcon} />
              <View>
                <AppText variant="bodyBold" style={styles.greenValue} > ₹{foodValueSaved.toLocaleString()}</AppText>
                <AppText variant="bodySmall" style={styles.cardLabel} > Food Value Saved </AppText>
              </View>
            </View>
          </View>

          {/* ROW 3 */}

          <View style={styles.analyticsRow}>
            <View style={styles.analyticsCard}>
              <Image source={require('../../../assets/placeholder/people_icon.png')} style={styles.cardIcon} />
              <View>
                <AppText variant="bodyBold" style={styles.greenValue}> {beneficiariesServed} </AppText>
                <AppText variant="bodySmall" style={styles.cardLabel}> Beneficiaries Served </AppText>
              </View>
            </View>

            <View style={styles.analyticsCard}>
              <Image source={require('../../../assets/placeholder/single_site.png')} style={styles.cardIcon} />
              <View>
                <AppText variant="bodyBold" style={styles.greenValue} >{analytics.activeDonors} </AppText>
                <AppText variant="bodySmall" style={styles.cardLabel} > Active Donors </AppText>
              </View>
            </View>
          </View>

          {/* ROW 4 */}
          <View style={styles.analyticsRow}>
            <View style={styles.analyticsCard}>
              <Image source={require('../../../assets/placeholder/truck_icon.png')} style={styles.cardIcon} />
              <View>
                <AppText variant="bodyBold" style={styles.greenValue}>{analytics.collections}</AppText>
                <AppText variant="bodySmall" style={styles.cardLabel}> Collections </AppText>
              </View>
            </View>

            <View style={styles.analyticsCard}>
              <Image source={require('../../../assets/placeholder/charity_green.png')} style={styles.cardIcon} />
              <View>
                <AppText variant="bodyBold" style={styles.greenValue}>{analytics.utilisationRate}% </AppText>
                <AppText variant="bodySmall" style={styles.cardLabel}> Utilisation Rate </AppText>
              </View>
            </View>
          </View>

          {/* COLLECTION SUCCESS */}

          <View style={styles.healthCard}>
            <View style={styles.healthHeader}>
              <Image source={require('../../../assets/placeholder/truck_icon.png')} style={styles.healthIcon} />
              <AppText variant="bodyBold" style={styles.healthTitle}> Collection Success Rate </AppText>
            </View>

            <AppText variant="h5" style={styles.healthValue} > {analytics.successRate}% </AppText>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill,{width: `${analytics.successRate}%`,},]}/>
            </View>
          </View>

          {/* SITE HEALTH */}
          <View style={styles.healthCard}>
            <View style={styles.healthHeader}>
              <Image source={require('../../../assets/placeholder/single_charity.png')} style={styles.healthIcon} />
              <AppText variant="bodyBold" style={styles.healthTitle} > Site Health Score </AppText>
            </View>

            <AppText variant="h5" style={styles.healthValue} > {siteHealth}% </AppText>

            <View style={styles.progressTrack}>
              <View style={[ styles.progressFill, { width: `${siteHealth}%`, }, ]} />
            </View>

            <AppText variant="bodySmall" style={styles.healthDescription} > Based on utilisation and collection success </AppText>
          </View>

          {/* RATING */}
          <View style={styles.ratingCard}>
            <Image source={require('../../../assets/placeholder/rating_icon.png')} style={styles.ratingIcon} />
            <View>
              <AppText variant="bodyBold" style={styles.greenValue} > {analytics.rating}/5 </AppText>
              <AppText variant="bodySmall" style={styles.cardLabel} > Site Rating </AppText>
            </View>
          </View>

        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: hp(4),
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
    zIndex: 10,
  },

  contentWrapper: {
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
  },

  dropdown: {
    backgroundColor: palette.white,
    borderRadius: normalize(12),
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dropdownList: {
    backgroundColor: palette.white,
    borderRadius: normalize(12),
    marginTop: hp(0.8),
    marginBottom: hp(2),
    overflow: 'hidden',

    borderWidth: 1,
    borderColor: '#ECECEC',
  },

  dropdownItem: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },

  sectionTitle: {
    textAlign: 'center',
    marginVertical: hp(3),
  },

  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(1.4),
  },

  analyticsCard: {
    width: '48.5%',
    backgroundColor: palette.white,
    borderRadius: normalize(16),
    borderWidth: 1,
    borderColor: '#DCEEDD',
    paddingVertical: hp(1.6),
    paddingHorizontal: wp(3),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  cardIcon: {
    width: normalize(34),
    height: normalize(34),
    resizeMode: 'contain',
    marginRight: wp(2.5),
  },

  greenValue: {
    color: palette.middlegreen,
    marginBottom: hp(0.2),
  },

  cardLabel: {
    color: '#6F6F6F',
  },

  healthCard: {
    backgroundColor: palette.white,
    borderRadius: normalize(16),
    borderWidth: 1,
    borderColor: '#DCEEDD',
    padding: wp(4),
    marginBottom: hp(1.5),
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.2),
  },

  healthIcon: {
    width: normalize(26),
    height: normalize(26),
    resizeMode: 'contain',
    marginRight: wp(2),
  },

  healthTitle: {
    flex: 1,
  },

  healthValue: {
    color: palette.middlegreen,
    marginBottom: hp(1.2),
  },

  progressTrack: {
    height: normalize(10),

    backgroundColor: '#DCEEDD',

    borderRadius: normalize(50),
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: palette.middlegreen,
    borderRadius: normalize(50),
  },

  healthDescription: {
    color: '#6F6F6F',
    marginTop: hp(1),
  },

  ratingCard: {
    backgroundColor: palette.white,
    borderRadius: normalize(16),
    borderWidth: 1,
    borderColor: '#DCEEDD',
    padding: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(3),
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  ratingIcon: {
    width: normalize(42),
    height: normalize(42),
    resizeMode: 'contain',
    marginRight: wp(3),
  },
});