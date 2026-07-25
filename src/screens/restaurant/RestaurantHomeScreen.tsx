import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Image,
  ImageBackground,
  Platform,
  RefreshControl,
  type ViewStyle,
  type TextStyle,
  type ImageStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
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
import { useBottomTabPadding } from '@/hooks/useBottomTabPadding';

import { palette } from '@/theme/colors';
import { hp, normalize, useResponsiveLayout, wp, type ResponsiveLayout } from '@/utils/responsive';

const IMPACT_ICONS = {
  food: require('../../../assets/placeholder/storage_box_green.png'),
  collections: require('../../../assets/placeholder/truck_icon.png'),
  co2: require('../../../assets/placeholder/co2_green_icon.png'),
};

type AdaptiveStyles = {
  mainContent: ViewStyle;
  heroContent: ViewStyle;
  heroName: TextStyle;
  heroOrg: TextStyle;
  logoCircle: ViewStyle;
  logoImage: ImageStyle;
  surplusBanner: ViewStyle;
  surplusBannerContent: ViewStyle;
  surplusBannerTitle: TextStyle;
  surplusBannerIcon: ViewStyle;
  surplusBannerIconImage: ImageStyle;
  surplusBody: ViewStyle;
  surplusDescription: TextStyle;
  surplusCta: ViewStyle;
  surplusCtaText: TextStyle;
  sectionHeading: ViewStyle;
  sectionHeadingBg: ImageStyle;
  sectionHeadingText: TextStyle;
  impactGrid: ViewStyle;
  impactStatCard: ViewStyle;
  impactIconWrap: ViewStyle;
  impactIcon: ImageStyle;
  impactValue: TextStyle;
  impactLabel: TextStyle;
  locationCapturedPill: ViewStyle;
  contentColumn: ViewStyle;
  insightsLinkLeft: ViewStyle;
  calculationText: TextStyle;
  skeletonCard: ViewStyle;
  skeletonHeadingWrap: ViewStyle;
  skeletonImpactRow: ViewStyle;
  skeletonImpactCard: { width: number; height: number };
  heroHeight: number;
  skeletonBannerHeight: number;
};

/** Phone returns empty overrides so StyleSheet stays pixel-identical. */
function buildAdaptiveStyles(r: ResponsiveLayout): AdaptiveStyles {
  const { isTablet, isLargeTablet, contentMaxWidth, pagePadH, font, space } = r;

  const empty: AdaptiveStyles = {
    mainContent: {},
    heroContent: {},
    heroName: {},
    heroOrg: {},
    logoCircle: {},
    logoImage: {},
    surplusBanner: {},
    surplusBannerContent: {},
    surplusBannerTitle: {},
    surplusBannerIcon: {},
    surplusBannerIconImage: {},
    surplusBody: {},
    surplusDescription: {},
    surplusCta: {},
    surplusCtaText: {},
    sectionHeading: {},
    sectionHeadingBg: {},
    sectionHeadingText: {},
    impactGrid: {},
    impactStatCard: {},
    impactIconWrap: {},
    impactIcon: {},
    impactValue: {},
    impactLabel: {},
    locationCapturedPill: {},
    contentColumn: {},
    insightsLinkLeft: {},
    calculationText: {},
    skeletonCard: {},
    skeletonHeadingWrap: {},
    skeletonImpactRow: {},
    skeletonImpactCard: { width: wp(28), height: hp(14) },
    heroHeight: hp(22),
    skeletonBannerHeight: hp(26),
  };

  if (!isTablet) return empty;

  const column: ViewStyle = {
    width: '100%',
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
  };

  const logoSize = isLargeTablet ? 64 : 56;
  const bannerIcon = isLargeTablet ? 72 : 64;
  const ctaMax = isLargeTablet ? 400 : 360;

  return {
    contentColumn: column,
    mainContent: {
      ...column,
      paddingHorizontal: pagePadH,
      gap: space(18, 20, 22),
      marginTop: space(-12, -10, -8),
    },
    heroContent: {
      ...column,
      paddingHorizontal: pagePadH,
      paddingBottom: space(24, 28, 32),
      gap: space(10, 12, 14),
    },
    heroName: {
      fontSize: font(26, 30, 32),
      lineHeight: font(34, 38, 40),
    },
    heroOrg: {
      fontSize: font(14, 15, 16),
    },
    logoCircle: {
      width: logoSize,
      height: logoSize,
      borderRadius: logoSize / 2,
    },
    logoImage: {
      borderRadius: logoSize / 2,
    },
    // Flex row instead of absolute icon overlay (Profile-style layout).
    surplusBanner: {
      height: Math.min(r.height * 0.16, isLargeTablet ? 180 : 156),
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingHorizontal: space(18, 22, 26),
      paddingBottom: space(14, 16, 18),
      gap: space(12, 14, 16),
    },
    surplusBannerContent: {
      flex: 1,
      minWidth: 0,
      maxWidth: '100%',
      paddingHorizontal: 0,
      paddingBottom: 0,
    },
    surplusBannerTitle: {
      fontSize: font(22, 26, 28),
      lineHeight: font(28, 32, 34),
    },
    surplusBannerIcon: {
      position: 'relative',
      right: 0,
      bottom: 0,
      width: bannerIcon,
      height: bannerIcon,
      borderRadius: 20,
      flexShrink: 0,
    },
    surplusBannerIconImage: {
      width: bannerIcon * 0.62,
      height: bannerIcon * 0.62,
    },
    surplusBody: {
      paddingHorizontal: space(18, 22, 26),
      paddingTop: space(16, 18, 20),
      paddingBottom: space(18, 20, 22),
      gap: space(14, 16, 18),
    },
    surplusDescription: {
      fontSize: font(14, 15, 16),
      lineHeight: font(21, 22, 24),
    },
    // Fixed tap height — avoid hp() blow-up on tall tablets.
    surplusCta: {
      alignSelf: 'stretch',
      width: '100%',
      maxWidth: ctaMax,
      height: 48,
      minHeight: 48,
      paddingVertical: 0,
      paddingHorizontal: 20,
      borderRadius: 14,
      gap: 8,
    },
    surplusCtaText: {
      fontSize: font(16, 17, 18),
      lineHeight: 20,
    },
    sectionHeading: {
      minHeight: space(88, 96, 104),
      paddingVertical: space(16, 18, 20),
    },
    sectionHeadingBg: {
      width: '100%',
      maxWidth: Math.min(720, contentMaxWidth),
      height: space(80, 88, 96),
    },
    sectionHeadingText: {
      fontSize: font(20, 24, 26),
      lineHeight: font(26, 30, 32),
    },
    impactGrid: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: space(10, 12, 14),
    },
    impactStatCard: {
      flex: 1,
      minWidth: 0,
      paddingVertical: space(14, 16, 18),
      paddingHorizontal: space(10, 12, 14),
      borderRadius: 18,
      gap: space(6, 8, 10),
    },
    impactIconWrap: {
      width: space(40, 44, 48),
      height: space(40, 44, 48),
      borderRadius: space(20, 22, 24),
    },
    impactIcon: {
      width: space(28, 30, 32),
      height: space(28, 30, 32),
    },
    impactValue: {
      fontSize: font(20, 22, 24),
      lineHeight: font(26, 28, 30),
    },
    impactLabel: {
      fontSize: font(11, 12, 13),
      lineHeight: font(15, 16, 18),
    },
    locationCapturedPill: {
      ...column,
      marginHorizontal: pagePadH,
    },
    insightsLinkLeft: {
      flex: 1,
      minWidth: 0,
    },
    calculationText: {
      fontSize: font(15, 16, 17),
      lineHeight: font(20, 22, 24),
    },
    skeletonCard: {
      ...column,
      marginHorizontal: pagePadH,
    },
    skeletonHeadingWrap: {
      ...column,
      paddingHorizontal: pagePadH,
    },
    skeletonImpactRow: {
      ...column,
      paddingHorizontal: pagePadH,
      gap: space(10, 12, 14),
    },
    skeletonImpactCard: {
      width: Math.round((contentMaxWidth - pagePadH * 2 - 28) / 3),
      height: isLargeTablet ? 120 : 110,
    },
    heroHeight: Math.min(r.height * 0.18, isLargeTablet ? 200 : 180),
    skeletonBannerHeight: isLargeTablet ? 220 : 200,
  };
}

export function RestaurantHomeScreen({ navigation }: any) {
  useTransparentStatusBar('light');
  const r = useResponsiveLayout();
  const adaptive = useMemo(() => buildAdaptiveStyles(r), [r]);
  const bottomPadding = useBottomTabPadding(r.isTablet ? 24 : hp(2));
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
    mealsCreated: 0,
    charitiesSupported: 0,
    collectionsCompleted: 0,
    co2SavedKg: 0,
    moneySaved: 0,
    currency: 'USD',
  };

  const formatImpactValue = (value: number) =>
    value.toLocaleString('en-US', { maximumFractionDigits: 1 });

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

  const displayAddress = (currentProfile.address || capturedAddress || '').trim();

  const impactStats = [
    {
      key: 'food',
      icon: IMPACT_ICONS.food,
      value: formatImpactValue(impact.kgSaved),
      unit: 'kg',
      label: 'Food saved',
      tint: '#E8F8EE',
    },
    {
      key: 'collections',
      icon: IMPACT_ICONS.collections,
      value: formatImpactValue(impact.collectionsCompleted),
      unit: '',
      label: 'Collections',
      tint: '#F0EBFF',
    },
    {
      key: 'co2',
      icon: IMPACT_ICONS.co2,
      value: formatImpactValue(impact.co2SavedKg),
      unit: 'kg',
      label: 'CO₂ avoided',
      tint: '#FFF4E8',
    },
  ];

  const loadImpact = useCallback(() => {
    fetchBusinessImpact().catch((e) =>
      showErrorAlert(e, 'Could not load dashboard', 'Could not load dashboard data'),
    );
  }, [fetchBusinessImpact]);

  useEffect(() => {
    loadImpact();
  }, [loadImpact]);

  useFocusEffect(
    useCallback(() => {
      fetchBusinessImpact(true).catch(() => undefined);
    }, [fetchBusinessImpact]),
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchBusinessImpact(true);
    } catch (e) {
      showErrorAlert(e, 'Could not load dashboard', 'Could not load dashboard data');
    } finally {
      setRefreshing(false);
    }
  }, [fetchBusinessImpact]);

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={adaptive.heroHeight} borderRadius={0} />
      <View style={[styles.skeletonCard, adaptive.skeletonCard]}>
        <Skeleton
          width="100%"
          height={adaptive.skeletonBannerHeight}
          borderRadius={normalize(24)}
        />
      </View>
      <View style={[styles.skeletonHeadingWrap, adaptive.skeletonHeadingWrap]}>
        <Skeleton width={r.isTablet ? '50%' : wp(70)} height={normalize(20)} />
      </View>
      <View style={[styles.skeletonImpactRow, adaptive.skeletonImpactRow]}>
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            width={adaptive.skeletonImpactCard.width}
            height={adaptive.skeletonImpactCard.height}
            borderRadius={normalize(18)}
          />
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
        contentContainerStyle={[styles.container, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[palette.primary]}
            tintColor={palette.primary}
          />
        }
      >
        {showBanner && (
          <View style={r.isTablet ? adaptive.contentColumn : undefined}>
            <LocationRequiredBanner
              description="Set your business location so charities can find your surplus listings and pickups work correctly."
              onUseGps={useGpsLocation}
              onSearchAddress={() => setModalVisible(true)}
              onDismiss={() => setBannerClosed(true)}
              gpsLoading={gpsLoading}
            />
          </View>
        )}

        {!!capturedAddress && !showBanner && (
          <View style={[styles.locationCapturedPill, adaptive.locationCapturedPill]}>
            <Ionicons name="checkmark-circle" size={normalize(16)} color={palette.middlegreen} />
            <AppText variant="caption" style={styles.locationCapturedText} numberOfLines={2} ellipsizeMode="tail">
              {capturedAddress}
            </AppText>
          </View>
        )}

        {loadingImpact && !refreshing ? (
          renderSkeleton()
        ) : (
          <>
            <HeroHeader
              source={require('../../../assets/placeholder/kale-header.png')}
              height={adaptive.heroHeight}
            >
              <View style={[styles.heroContent, adaptive.heroContent]}>
                <View style={styles.heroTopRow}>
                  <View style={styles.heroTextBlock}>
                    <AppText variant="caption" style={styles.heroGreeting}>
                      {greeting}
                    </AppText>
                    <AppText
                      variant="h6"
                      style={[styles.heroName, adaptive.heroName]}
                      numberOfLines={1}
                    >
                      {isFirstTimeUser ? `Welcome, ${firstName}` : `${firstName}`}
                    </AppText>
                    <AppText
                      variant="bodySmall"
                      style={[styles.heroOrg, adaptive.heroOrg]}
                      numberOfLines={1}
                    >
                      {currentProfile.organization}
                    </AppText>
                  </View>

                  <Pressable
                    style={[styles.logoCircle, adaptive.logoCircle]}
                    onPress={() => navigation.navigate('Account')}
                    accessibilityRole="button"
                    accessibilityLabel="Open account profile"
                  >
                    {currentProfile.logo ? (
                      <Image
                        source={{ uri: currentProfile.logo }}
                        style={[styles.logoImage, adaptive.logoImage]}
                      />
                    ) : (
                      <AppText style={styles.logoFallback}>
                        {currentProfile.organization?.[0] || 'S'}
                      </AppText>
                    )}
                  </Pressable>
                </View>

                {!!displayAddress && (
                  <View style={styles.locationPill}>
                    <Ionicons name="location-outline" size={normalize(14)} color={palette.white} />
                    <AppText
                      variant="caption"
                      style={styles.locationPillText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {displayAddress}
                    </AppText>
                  </View>
                )}
              </View>
            </HeroHeader>

            <View style={[styles.mainContent, adaptive.mainContent]}>
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
                  style={[styles.surplusBanner, adaptive.surplusBanner]}
                  imageStyle={styles.surplusBannerImage}
                  resizeMode="cover"
                >
                  <LinearGradient
                    colors={['rgba(255, 255, 255, 0.05)', 'rgba(26, 26, 27, 0.5)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={[styles.surplusBannerContent, adaptive.surplusBannerContent]}>
                    <View style={styles.surplusBadge}>
                      <MaterialIcons name="lunch-dining" size={normalize(14)} color={palette.middlegreen} />
                      <AppText variant="caption" color={palette.middlegreen} style={styles.surplusBadgeText}>
                        Today's surplus
                      </AppText>
                    </View>
                    <AppText
                      variant="h6"
                      style={[styles.surplusBannerTitle, adaptive.surplusBannerTitle]}
                      numberOfLines={2}
                    >
                      Got surplus food?
                    </AppText>
                  </View>
                  <View style={[styles.surplusBannerIcon, adaptive.surplusBannerIcon]}>
                    <Image
                      source={IMPACT_ICONS.food}
                      style={[styles.surplusBannerIconImage, adaptive.surplusBannerIconImage]}
                      resizeMode="contain"
                    />
                  </View>
                </ImageBackground>

                <View style={[styles.surplusBody, adaptive.surplusBody]}>
                  <AppText
                    variant="bodySmall"
                    color={palette.textMuted}
                    style={[styles.surplusDescription, adaptive.surplusDescription]}
                  >
                    List what you have - local charities get notified to arrange pickup.
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

                  <View style={[styles.surplusCta, adaptive.surplusCta]}>
                    <AppText
                      variant="bodyBold"
                      style={[styles.surplusCtaText, adaptive.surplusCtaText]}
                    >
                      List Surplus
                    </AppText>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={palette.white}
                      style={styles.surplusCtaArrow}
                    />
                  </View>
                </View>
              </Pressable>

              <View style={styles.impactSection}>
                <View style={[styles.sectionHeading, adaptive.sectionHeading]}>
                  <Image
                    source={require('../../../assets/placeholder/Illustration.png')}
                    style={[styles.sectionHeadingBg, adaptive.sectionHeadingBg]}
                    resizeMode="contain"
                  />
                  <AppText
                    variant="heading"
                    style={[styles.sectionHeadingText, adaptive.sectionHeadingText]}
                    numberOfLines={2}
                  >
                    Your impact so far
                  </AppText>
                </View>

                <View style={[styles.impactGrid, adaptive.impactGrid]}>
                  {impactStats.map((stat) => (
                    <View
                      key={stat.key}
                      style={[
                        styles.impactStatCard,
                        { backgroundColor: stat.tint },
                        adaptive.impactStatCard,
                      ]}
                    >
                      <View style={[styles.impactIconWrap, adaptive.impactIconWrap]}>
                        <Image
                          source={stat.icon}
                          style={[styles.impactIcon, adaptive.impactIcon]}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.impactValueRow}>
                        <AppText
                          variant="h7"
                          style={[styles.impactValue, adaptive.impactValue]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {stat.value}
                        </AppText>
                        {!!stat.unit && (
                          <AppText variant="caption" color={palette.textMuted}>
                            {stat.unit}
                          </AppText>
                        )}
                      </View>
                      <AppText
                        variant="caption"
                        color={palette.textMuted}
                        style={[styles.impactLabel, adaptive.impactLabel]}
                        numberOfLines={2}
                      >
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
                    <View style={[styles.insightsLinkLeft, adaptive.insightsLinkLeft]}>
                      <Ionicons name="bar-chart-outline" size={normalize(20)} color={palette.primary} />
                      <AppText variant="bodyBold" color={palette.primary} numberOfLines={1} style={styles.insightsLinkText}>
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
                <AppText
                  variant="body"
                  color={palette.textMuted}
                  style={[styles.calculationText, adaptive.calculationText]}
                >
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

/** Mobile baseline styles — unchanged look on phones. */
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
    minWidth: 0,
    paddingBottom: hp(0.2),
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
    flex: 1,
    minWidth: 0,
    fontSize: normalize(12),
    lineHeight: normalize(17),
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
    width: '100%',
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
    borderRadius: 14,
    height: 48,
    paddingVertical: 0,
    paddingHorizontal: 20,
    gap: 8,
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
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.2,
    includeFontPadding: false,
  },

  surplusCtaArrow: {
    marginTop: 1,
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
    width: '100%',
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
    flex: 1,
    minWidth: 0,
  },

  insightsLinkText: {
    flex: 1,
    minWidth: 0,
    textTransform: 'none',
  },

  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: wp(1),
    paddingVertical: hp(1),
  },

  calculationText: {
    textTransform: 'none',
    fontSize: normalize(14),
    lineHeight: normalize(20),
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
