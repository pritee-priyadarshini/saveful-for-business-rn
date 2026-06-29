import React, { useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Image,
  ImageBackground,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { HeroHeader } from '../../components/HeroHeader';
import { Skeleton } from '../../components/Skeleton';
import { LocationRequiredBanner } from '../../components/LocationRequiredBanner';
import { LocationSetupModal } from '../../components/LocationSetupModal';
import { useAppContext } from '../../store/AppContext';
import { useOrganizationLocation } from '../../hooks/useOrganizationLocation';
import { useDashboardStore } from '../../store/dashboardStore';
import { showErrorAlert } from '@/utils/apiError';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';

import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';

const IMPACT_ICONS = {
  food: require('../../../assets/placeholder/storage_box_green.png'),
  collections: require('../../../assets/placeholder/truck_icon.png'),
  co2: require('../../../assets/placeholder/co2_green_icon.png'),
};

export function RestaurantHomeScreen({ navigation }: any) {
  useTransparentStatusBar('light');
  const insets = useSafeAreaInsets();
  const { currentProfile } = useAppContext();
  const {
    showBanner,
    setBannerClosed,
    modalVisible,
    setModalVisible,
    saving,
    capturedAddress,
    gpsLoading,
    useGpsLocation,
    saveLocation,
  } = useOrganizationLocation();

  const {
    businessImpact,
    isFetching: loadingImpact,
    fetchBusinessImpact,
  } = useDashboardStore();

  const impact = businessImpact ?? {
    kgSaved: 0,
    charitiesSupported: 0,
    collectionsCompleted: 0,
    co2SavedKg: 0,
    moneySaved: 0,
    currency: '₹',
  };

  const firstName = currentProfile.name?.split(' ')[0] || 'User';
  const isFirstTimeUser =
    impact.kgSaved === 0 &&
    impact.collectionsCompleted === 0 &&
    impact.co2SavedKg === 0;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const impactStats = [
    {
      key: 'food',
      icon: IMPACT_ICONS.food,
      value: `${impact.kgSaved}`,
      unit: 'kg',
      label: 'Food saved',
      tint: '#E8F8EE',
    },
    {
      key: 'collections',
      icon: IMPACT_ICONS.collections,
      value: `${impact.collectionsCompleted}`,
      unit: '',
      label: 'Collections',
      tint: '#F0EBFF',
    },
    {
      key: 'co2',
      icon: IMPACT_ICONS.co2,
      value: `${impact.co2SavedKg}`,
      unit: 'kg',
      label: 'CO₂ avoided',
      tint: '#FFF4E8',
    },
  ];

  useEffect(() => {
    fetchBusinessImpact().catch((e) =>
      showErrorAlert(e, 'Could not load dashboard', 'Could not load dashboard data'),
    );
  }, []);

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={hp(18)} borderRadius={0} />
      <View style={styles.skeletonCard}>
        <Skeleton width="100%" height={hp(26)} borderRadius={normalize(24)} />
      </View>
      <View style={styles.skeletonHeadingWrap}>
        <Skeleton width={wp(70)} height={normalize(20)} />
      </View>
      <View style={styles.skeletonImpactRow}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} width={wp(28)} height={hp(14)} borderRadius={normalize(18)} />
        ))}
      </View>
    </View>
  );

  return (
    <Screen scrollable={false} backgroundColor={palette.creme} transparentTop>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <LocationSetupModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={async ({ latitude, longitude, address }) => {
          await saveLocation(latitude, longitude, address);
        }}
        confirming={saving}
        searchPlaceholder="Search business address..."
      />

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + hp(2) }]}
        showsVerticalScrollIndicator={false}
      >
        {showBanner && (
          <LocationRequiredBanner
            description="Set your business location so charities can find your surplus listings and pickups work correctly."
            onUseGps={useGpsLocation}
            onSearchAddress={() => setModalVisible(true)}
            onDismiss={() => setBannerClosed(true)}
            gpsLoading={gpsLoading}
          />
        )}

        {!!capturedAddress && !showBanner && (
          <View style={styles.locationCapturedPill}>
            <Ionicons name="checkmark-circle" size={normalize(16)} color={palette.middlegreen} />
            <AppText variant="caption" style={styles.locationCapturedText} numberOfLines={1}>
              {capturedAddress}
            </AppText>
          </View>
        )}

        {loadingImpact ? (
          renderSkeleton()
        ) : (
          <>
            <HeroHeader
              source={require('../../../assets/placeholder/kale-header.png')}
              height={hp(20)}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroTopRow}>
                  <View style={styles.heroTextBlock}>
                    <AppText variant="caption" style={styles.heroGreeting}>
                      {greeting}
                    </AppText>
                    <AppText variant="h6" style={styles.heroName} numberOfLines={1}>
                      {isFirstTimeUser ? `Welcome, ${firstName}` : `${firstName}`}
                    </AppText>
                    <AppText variant="bodySmall" style={styles.heroOrg} numberOfLines={1}>
                      {currentProfile.organization}
                    </AppText>
                  </View>

                  <View style={styles.logoCircle}>
                    {currentProfile.logo ? (
                      <Image source={{ uri: currentProfile.logo }} style={styles.logoImage} />
                    ) : (
                      <AppText style={styles.logoFallback}>
                        {currentProfile.organization?.[0] || 'S'}
                      </AppText>
                    )}
                  </View>
                </View>

                {!!currentProfile.address && (
                  <View style={styles.locationPill}>
                    <Ionicons name="location" size={normalize(14)} color={palette.white} />
                    <AppText variant="caption" style={styles.locationPillText} numberOfLines={1}>
                      {currentProfile.address}
                    </AppText>
                  </View>
                )}
              </View>
            </HeroHeader>

            <View style={styles.mainContent}>
              <Pressable
                style={({ pressed }) => [styles.surplusCard, pressed && styles.pressed]}
                onPress={() =>
                  navigation.navigate('Listings', {
                    screen: 'RestaurantListings',
                  })
                }
              >
                <ImageBackground
                  source={require('../../../assets/home/restaurant_home_banner.png')}
                  style={styles.surplusBanner}
                  imageStyle={styles.surplusBannerImage}
                  resizeMode="cover"
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.05)', 'rgba(26, 26, 27, 0.5)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={styles.surplusBannerContent}>
                    <View style={styles.surplusBadge}>
                      <MaterialIcons name="lunch-dining" size={normalize(14)} color={palette.middlegreen} />
                      <AppText variant="caption" color={palette.middlegreen} style={styles.surplusBadgeText}>
                        Today's surplus
                      </AppText>
                    </View>
                    <AppText variant="h6" style={styles.surplusBannerTitle}>
                      Got surplus food?
                    </AppText>
                  </View>
                  <View style={styles.surplusBannerIcon}>
                    <Image source={IMPACT_ICONS.food} style={styles.surplusBannerIconImage} resizeMode="contain" />
                  </View>
                </ImageBackground>

                <View style={styles.surplusBody}>
                  <AppText variant="bodySmall" color={palette.textMuted} style={styles.surplusDescription}>
                    List what you have spare - nearby charities get notified and arrange pickup.
                  </AppText>

                  <View style={styles.surplusSteps}>
                    <View style={styles.surplusStep}>
                      <View style={[styles.surplusStepDot, styles.surplusStepDotActive]} />
                      <AppText variant="caption" color={palette.textMuted} style={styles.surplusStepLabel}>
                        List items
                      </AppText>
                    </View>
                    <View style={styles.surplusStepLine} />
                    <View style={styles.surplusStep}>
                      <View style={styles.surplusStepDot} />
                      <AppText variant="caption" color={palette.textMuted} style={styles.surplusStepLabel}>
                        Charities notified
                      </AppText>
                    </View>
                    <View style={styles.surplusStepLine} />
                    <View style={styles.surplusStep}>
                      <View style={styles.surplusStepDot} />
                      <AppText variant="caption" color={palette.textMuted} style={styles.surplusStepLabel}>
                        Pickup arranged
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.surplusCta}>
                    <AppText variant="bodyBold" style={styles.surplusCtaText}>
                      List Surplus
                    </AppText>
                    <View style={styles.surplusCtaIcon}>
                      <Ionicons name="arrow-forward" size={normalize(18)} color={palette.white} />
                    </View>
                  </View>
                </View>
              </Pressable>

              <View style={styles.impactSection}>
                <View style={styles.sectionHeading}>
                  <Image
                    source={require('../../../assets/placeholder/Illustration.png')}
                    style={styles.sectionHeadingBg}
                    resizeMode="contain"
                  />
                  <AppText variant="heading" style={styles.sectionHeadingText} numberOfLines={2}>
                    Your impact so far
                  </AppText>
                </View>

                <View style={styles.impactGrid}>
                  {impactStats.map((stat) => (
                    <View key={stat.key} style={[styles.impactStatCard, { backgroundColor: stat.tint }]}>
                      <View style={styles.impactIconWrap}>
                        <Image source={stat.icon} style={styles.impactIcon} resizeMode="contain" />
                      </View>
                      <View style={styles.impactValueRow}>
                        <AppText variant="h7" style={styles.impactValue} numberOfLines={1} adjustsFontSizeToFit>
                          {stat.value}
                        </AppText>
                        {!!stat.unit && (
                          <AppText variant="caption" color={palette.textMuted}>
                            {stat.unit}
                          </AppText>
                        )}
                      </View>
                      <AppText variant="caption" color={palette.textMuted} style={styles.impactLabel} numberOfLines={2}>
                        {stat.label}
                      </AppText>
                    </View>
                  ))}
                </View>

                {isFirstTimeUser ? (
                  <View style={styles.encouragementCard}>
                    <AppText variant="bodySmall" color={palette.textMuted} style={styles.encouragementText}>
                      List your first surplus to start tracking your impact here.
                    </AppText>
                  </View>
                ) : (
                  <Pressable
                    style={({ pressed }) => [styles.insightsLink, pressed && styles.pressed]}
                    onPress={() => navigation.navigate('Insights')}
                  >
                    <View style={styles.insightsLinkLeft}>
                      <Ionicons name="bar-chart-outline" size={normalize(20)} color={palette.primary} />
                      <AppText variant="bodyBold" color={palette.primary}>
                        View detailed insights
                      </AppText>
                    </View>
                    <Ionicons name="chevron-forward" size={normalize(18)} color={palette.primary} />
                  </Pressable>
                )}
              </View>

              <Pressable
                style={({ pressed }) => [styles.calculationRow, pressed && styles.pressed]}
                onPress={() => navigation.navigate('Calculation')}
              >
                <AppText variant="bodySmall" color={palette.textMuted}>
                  About our calculations
                </AppText>
                <Ionicons name="chevron-forward" size={normalize(18)} color={palette.textMuted} />
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  android: {
    elevation: 4,
  },
});

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    marginTop: -hp(2),
  },

  mainContent: {
    paddingHorizontal: wp(5),
    gap: hp(2.2),
    marginTop: -hp(1.5),
  },

  heroContent: {
    flex: 1,
    paddingHorizontal: wp(5),
    justifyContent: 'flex-end',
    paddingBottom: hp(3),
    gap: hp(1.2),
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: wp(3),
  },

  heroTextBlock: {
    flex: 1,
    gap: hp(0.3),
  },

  heroGreeting: {
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'none',
    letterSpacing: 0.3,
  },

  heroName: {
    color: palette.white,
    fontSize: normalize(26),
    lineHeight: normalize(34),
    textTransform: 'none',
  },

  heroOrg: {
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'none',
  },

  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: wp(1.5),
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: hp(0.6),
    paddingHorizontal: wp(3),
    borderRadius: normalize(20),
    maxWidth: '100%',
  },

  locationPillText: {
    color: palette.white,
    flexShrink: 1,
    textTransform: 'none',
  },

  logoCircle: {
    width: normalize(52),
    height: normalize(52),
    borderRadius: normalize(26),
    backgroundColor: palette.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: normalize(26),
  },

  logoFallback: {
    color: palette.primary,
    fontWeight: 'bold',
    fontSize: normalize(20),
  },

  surplusCard: {
    borderRadius: normalize(24),
    overflow: 'hidden',
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.strokecream,
    ...cardShadow,
  },

  surplusBanner: {
    width: '100%',
    height: hp(16),
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: palette.creme2,
  },

  surplusBannerImage: {
    width: '100%',
    height: '100%',
  },

  surplusBannerContent: {
    paddingHorizontal: wp(4.5),
    paddingBottom: hp(1.8),
    gap: hp(0.6),
    zIndex: 1,
    maxWidth: '68%',
  },

  surplusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: wp(1.5),
    backgroundColor: palette.white,
    paddingVertical: hp(0.45),
    paddingHorizontal: wp(2.8),
    borderRadius: normalize(20),
  },

  surplusBadgeText: {
    textTransform: 'none',
    fontSize: normalize(10),
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  surplusBannerTitle: {
    color: palette.white,
    textTransform: 'none',
    fontSize: normalize(22),
    lineHeight: normalize(28),
  },

  surplusBannerIcon: {
    position: 'absolute',
    right: wp(4),
    bottom: hp(1.2),
    width: normalize(64),
    height: normalize(64),
    borderRadius: normalize(20),
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...Platform.select({
      ios: {
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  surplusBannerIconImage: {
    width: normalize(40),
    height: normalize(40),
  },

  surplusBody: {
    paddingHorizontal: wp(4.5),
    paddingTop: hp(2),
    paddingBottom: hp(2.2),
    gap: hp(1.6),
    backgroundColor: palette.white,
  },

  surplusDescription: {
    textTransform: 'none',
    lineHeight: normalize(21),
    fontSize: normalize(14),
  },

  surplusSteps: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#F7FBF8',
    borderRadius: normalize(14),
    borderWidth: 1,
    borderColor: '#D9EDE1',
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(2),
  },

  surplusStep: {
    flex: 1,
    alignItems: 'center',
    gap: hp(0.55),
  },

  surplusStepDot: {
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(4),
    backgroundColor: '#C5D9CB',
  },

  surplusStepDotActive: {
    backgroundColor: palette.middlegreen,
    width: normalize(10),
    height: normalize(10),
    borderRadius: normalize(5),
  },

  surplusStepLine: {
    width: wp(5),
    height: 1,
    backgroundColor: '#C5D9CB',
    marginTop: normalize(5),
  },

  surplusStepLabel: {
    textTransform: 'none',
    fontSize: normalize(10),
    lineHeight: normalize(14),
    textAlign: 'center',
  },

  surplusCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.eggplant,
    borderRadius: normalize(16),
    paddingVertical: hp(1.7),
    paddingHorizontal: wp(5),
    gap: wp(2),
    ...Platform.select({
      ios: {
        shadowColor: palette.eggplant,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  surplusCtaText: {
    color: palette.white,
    textTransform: 'none',
    fontSize: normalize(16),
    letterSpacing: 0.2,
  },

  surplusCtaIcon: {
    width: normalize(28),
    height: normalize(28),
    borderRadius: normalize(14),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  impactSection: {
    gap: hp(1.6),
    marginTop: hp(0.5),
  },

  sectionHeading: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: hp(11),
    paddingVertical: hp(2),
    paddingHorizontal: wp(2),
    width: '100%',
  },

  sectionHeadingBg: {
    position: 'absolute',
    width: wp(88),
    height: hp(10),
    alignSelf: 'center',
  },

  sectionHeadingText: {
    textAlign: 'center',
    textTransform: 'none',
    fontSize: normalize(20),
    lineHeight: normalize(26),
    paddingHorizontal: wp(4),
    zIndex: 1,
  },

  impactGrid: {
    flexDirection: 'row',
    gap: wp(2),
  },

  impactStatCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: normalize(18),
    borderWidth: 1,
    borderColor: palette.strokecream,
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(1.5),
    alignItems: 'center',
    gap: hp(0.6),
  },

  impactIconWrap: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  impactIcon: {
    width: normalize(28),
    height: normalize(28),
  },

  impactValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: wp(1),
  },

  impactValue: {
    textTransform: 'none',
    fontSize: normalize(20),
    lineHeight: normalize(26),
  },

  impactLabel: {
    textAlign: 'center',
    textTransform: 'none',
    fontSize: normalize(11),
    lineHeight: normalize(15),
    width: '100%',
  },

  encouragementCard: {
    backgroundColor: palette.surfaceMuted,
    borderRadius: normalize(14),
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(4),
    borderWidth: 1,
    borderColor: palette.strokecream,
  },

  encouragementText: {
    textAlign: 'center',
    textTransform: 'none',
    lineHeight: normalize(20),
  },

  insightsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.white,
    borderRadius: normalize(14),
    borderWidth: 1,
    borderColor: palette.strokecream,
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
  },

  insightsLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
  },

  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: wp(1),
    paddingVertical: hp(1),
  },

  locationCapturedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginHorizontal: wp(5),
    marginTop: hp(1),
    paddingVertical: hp(0.9),
    paddingHorizontal: wp(3.5),
    borderRadius: normalize(12),
    backgroundColor: '#F4F8EF',
    borderWidth: 1,
    borderColor: '#D4ECD9',
  },

  locationCapturedText: {
    flex: 1,
    textTransform: 'none',
  },

  pressed: {
    opacity: 0.85,
  },

  skeletonWrap: {
    gap: hp(1.6),
  },

  skeletonCard: {
    marginHorizontal: wp(5),
    marginTop: -hp(2),
    gap: hp(1.5),
    backgroundColor: palette.white,
    borderRadius: normalize(24),
    padding: wp(5),
  },

  skeletonHeadingWrap: {
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },

  skeletonImpactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
  },
});
