import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Skeleton } from '../../components/Skeleton';
import { LocationRequiredBanner } from '../../components/LocationRequiredBanner';
import { LocationSetupModal } from '../../components/LocationSetupModal';
import { useAppContext } from '../../store/AppContext';
import { useOrganizationLocation } from '../../hooks/useOrganizationLocation';
import { dashboardService } from '@/services/dashboard.service';

import { palette } from '@/theme/colors';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

export function RestaurantHomeScreen({ navigation }: any) {

  const { currentProfile } = useAppContext();
  const {
    showBanner,
    setBannerClosed,
    modalVisible,
    setModalVisible,
    saving,
    capturedAddress,
    saveLocation,
  } = useOrganizationLocation();
  const firstName = currentProfile.name?.split(' ')[0] || 'User';
  const [activeIndex, setActiveIndex] = React.useState(0);

  const [impact, setImpact] = React.useState({
    kgSaved: 0,
    charitiesSupported: 0,
    collectionsCompleted: 0,
    co2SavedKg: 0,
    moneySaved: 0,
    currency: '₹',
  });

  const [loadingImpact, setLoadingImpact] = React.useState(true);

  const impactConfig = [
    {
      label: 'Food',
      icon: require('../../../assets/placeholder/storage_box_green.png'),
      titleAbove: 'You have saved',
      titleBelow: 'From going to landfill',
      value: `${impact.kgSaved} kgs`,
    },
    {
      label: 'Collections',
      icon: require('../../../assets/placeholder/truck_icon.png'),
      titleAbove: 'You have generated',
      titleBelow: 'Collections to help save food',
      value: `${impact.collectionsCompleted}`,
    },
    {
      label: 'CO₂',
      icon: require('../../../assets/placeholder/co2_green_icon.png'),
      titleAbove: 'You have avoided',
      titleBelow: 'CO₂ emissions',
      value: `${impact.co2SavedKg} kgs`,
    },
  ];

  const impactData = impactConfig;

  React.useEffect(() => {
    fetchImpact();
  }, []);

  const fetchImpact = async () => {
    try {
      setLoadingImpact(true);

      const res = await dashboardService.getBusinessImpact();

      if (res.data) {
        setImpact({
          ...res.data,
          collectionsCompleted:
            res.data.collectionsCompleted ?? res.data.charitiesSupported ?? 0,
        });
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('Impact data not yet available (404)');
      } else {
        console.log('Impact fetch failed', error);
      }
    } finally {
      setLoadingImpact(false);
    }
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={hp(18)} borderRadius={normalize(12)} />
      <View style={styles.skeletonCenter}>
        <Skeleton width={wp(60)} height={normalize(20)} />
        <Skeleton width={wp(50)} height={normalize(18)} />
      </View>
      <Skeleton width={wp(70)} height={normalize(48)} borderRadius={normalize(16)} />
      <View style={styles.skeletonHeadingWrap}>
        <Skeleton width={wp(70)} height={normalize(20)} />
      </View>
      <View style={styles.skeletonCard}>
        <View style={styles.skeletonPillRow}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width={wp(18)} height={normalize(28)} borderRadius={normalize(20)} />
          ))}
        </View>
        <Skeleton width={wp(30)} height={wp(30)} borderRadius={normalize(12)} />
        <Skeleton width={wp(70)} height={normalize(16)} />
        <Skeleton width={wp(40)} height={normalize(24)} borderRadius={normalize(20)} />
      </View>
      <Skeleton width={wp(80)} height={normalize(18)} />
    </View>
  );

  return (
    <Screen backgroundColor={palette.creme}>
      <LocationSetupModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={async ({ latitude, longitude, address }) => {
          await saveLocation(latitude, longitude, address);
        }}
        confirming={saving}
        searchPlaceholder="Search business address..."
      />

      <ScrollView contentContainerStyle={styles.container}>
        {showBanner && (
          <LocationRequiredBanner
            description="Set your business location so charities can find your surplus listings and pickups work correctly."
            onUseGps={() => setModalVisible(true)}
            onSearchAddress={() => setModalVisible(true)}
            onDismiss={() => setBannerClosed(true)}
          />
        )}

        {!!capturedAddress && !showBanner && (
          <View style={styles.locationCapturedPill}>
            <AppText variant="caption">Location set: {capturedAddress}</AppText>
          </View>
        )}

        {loadingImpact ? (
          renderSkeleton()
        ) : (
          <>

        {/* HERO */}
        <View style={styles.heroContainer}>
          <Image
            source={require('../../../assets/placeholder/kale-header.png')}
            style={styles.heroBg}
          />

          {/* TOP ROW */}
          <View style={styles.topBar}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="h6" style={styles.whiteText} >
                {currentProfile.organization}
              </AppText>

              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={normalize(24)} color="white" />
                <AppText variant="body" style={styles.location}>
                  {currentProfile.address || 'No address available'}
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
        </View>

        {/* WELCOME */}
        <View style={styles.welcomeSection}>
          <AppText variant="h5">
            Welcome back, {firstName}
          </AppText>

          <AppText variant="bodyLarge" style={styles.welcomeSub}>
            Got surplus today?
          </AppText>

          <AppText variant="bodyLarge" style={styles.welcomeSub}>
            Share it with a local charity 💜
          </AppText>
        </View>

        {/* CTA */}
        <Pressable
          style={styles.ctaButton}
          onPress={() =>
            navigation.navigate('Listings', {
              screen: 'RestaurantListings',
            })
          }
        >
          <AppText variant="h8" style={styles.ctaText}>
            List Surplus 
          </AppText>
        </Pressable>

        {/* IMPACT */}
        <View style={styles.section}>
          <View>

            <AppText variant="heading" style={styles.headingText}>
              Your Savings & Impact So Far
            </AppText>
          </View>

          <View style={styles.impactCardContainer}>
            {/* PILLS */}
            <View style={styles.pillRow}>
              {impactData.map((item, index) => (
                <Pressable
                  key={index}
                  onPress={() => setActiveIndex(index)}
                  style={[
                    styles.pill,
                    activeIndex === index && styles.activePill,
                  ]}
                >
                  <AppText
                    variant="bodyBold"
                    style={[
                      styles.pillText,
                      activeIndex === index && styles.activePillText,
                    ]}
                  >
                    {item.label}
                  </AppText>
                </Pressable>
              ))}
            </View>

            {/* ICON */}
            <Image
              source={impactData[activeIndex].icon}
              style={styles.impactIcon}
            />

            <AppText
              variant="h8"
              style={styles.impactTitleLine}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {impactData[activeIndex].titleAbove}
            </AppText>

            <View style={styles.valuePill}>
              <AppText variant="h5" style={styles.valueText} numberOfLines={1}>
                {loadingImpact ? '...' : impactData[activeIndex].value}
              </AppText>
            </View>

            <AppText
              variant="h8"
              style={styles.impactTitleLine}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {impactData[activeIndex].titleBelow}
            </AppText>

            <AppText variant="h7" style={styles.impactFooter} numberOfLines={1}>
              Keep making an impact!
            </AppText>

          </View>
        </View>
        <Pressable
          style={styles.calculationRow}
          onPress={() => navigation.navigate('Calculation')}
        >
          <AppText variant="bodyLarge">
            About our calculations
          </AppText>

          <Ionicons name="chevron-forward" size={normalize(20)} color="black" />
        </Pressable>

          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: hp(3),
    gap: hp(2),
  },

  heroContainer: {
    height: hp(18),
    width: '100%',
    paddingTop: hp(2),
    paddingRight: wp(4),
    overflow: 'hidden',
    position: 'relative',
  },

  heroBg: {
    width: '110%',
    height: '120%',
    position: 'absolute',
  },

  topBar: {
    flexDirection: 'row',
    paddingLeft: wp(4),
    justifyContent: 'space-between',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: hp(0.8),
    gap: wp(1),
  },

  whiteText: {
    color: 'white',
    fontSize: normalize(20),
  },

  welcomeSection: {
    paddingHorizontal: wp(4),
    gap: hp(0.75),
    alignItems: 'center',
  },

  welcomeSub: {
    color: '#666',
    fontSize: normalize(15),
    lineHeight: normalize(20),
    textAlign: 'center',
  },

  location: {
    color: 'white',
    opacity: 0.8,
    flex: 1,
    flexWrap: 'wrap',
    fontSize: normalize(18),
    paddingTop: hp(1),
    justifyContent: 'center',
  },

  logoCircle: {
    width: normalize(50),
    height: normalize(50),
    borderRadius: normalize(25),
    marginLeft: wp(3),
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: normalize(25),
  },

  logoFallback: {
    color: '#7B3FE4',
    fontWeight: 'bold',
    fontSize: normalize(18),
  },

  ctaButton: {
    marginHorizontal: wp(8),
    backgroundColor: palette.middlegreen,
    padding: hp(1.8),
    borderRadius: normalize(14),
    alignItems: 'center',
  },

  ctaText: {
    color: palette.white,
    fontSize: normalize(18),
  },

  headingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(4),
    marginBottom: hp(4),
    paddingHorizontal: wp(5),
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
    fontSize: normalize(18),
  },

  section: {
    paddingHorizontal: wp(5),
    gap: hp(2),
  },

  impactCardContainer: {
    backgroundColor: palette.creme,
    borderColor: palette.black,
    borderWidth: 1,
    borderRadius: normalize(20),
    paddingVertical: hp(2),
    paddingHorizontal: wp(10),
    alignItems: 'center',
    gap: hp(1.5),
  },

  pillRow: {
    flexDirection: 'row',
    backgroundColor: '#dff7ea',
    borderRadius: normalize(12),
    padding: wp(1),
    width: '100%',
  },

  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.2),
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(2),
    borderRadius: normalize(12),
  },

  activePill: {
    backgroundColor: palette.middlegreen,
  },

  pillText: {
    color: palette.black,
    fontSize: normalize(12),
  },

  activePillText: {
    color: 'white',
  },

  impactIcon: {
    width: wp(25),
    height: wp(25),
    maxHeight: normalize(100),
    resizeMode: 'contain',
  },
  valuePill: {
    backgroundColor: palette.middlegreen,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(6),
    borderRadius: normalize(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    color: palette.white,
    fontSize: normalize(24),
  },

  impactTitleLine: {
    textAlign: 'center',
    width: '100%',
  },

  impactFooter: {
    textAlign: 'center',
    width: '100%',
    marginTop: hp(1.5),
  },

  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: wp(5),
    marginTop: hp(2),
    paddingVertical: hp(1.6),
    borderTopWidth: 1,
    borderColor: palette.border,
  },

  skeletonWrap: {
    paddingHorizontal: wp(5),
    gap: hp(1.6),
  },

  skeletonCenter: {
    alignItems: 'center',
    gap: hp(0.8),
  },

  skeletonHeadingWrap: {
    alignItems: 'center',
    marginTop: hp(1),
  },

  skeletonCard: {
    backgroundColor: palette.white,
    borderRadius: normalize(20),
    paddingVertical: hp(2),
    paddingHorizontal: wp(5),
    alignItems: 'center',
    gap: hp(1.5),
  },

  skeletonPillRow: {
    flexDirection: 'row',
    gap: wp(2),
  },

  locationCapturedPill: {
    marginHorizontal: wp(4),
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderRadius: normalize(10),
    backgroundColor: '#F4F8EF',
  },
});