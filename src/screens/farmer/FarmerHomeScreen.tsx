import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
  FlatList,
  Image,
  View,
  Linking,
  RefreshControl,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { HeroHeader } from '../../components/HeroHeader';
import { Skeleton } from '../../components/Skeleton';
import { LocationRequiredBanner } from '../../components/LocationRequiredBanner';
import { LocationSetupModal } from '../../components/LocationSetupModal';
import { DiscoverListingDetailModal } from '../../components/DiscoverListingDetailModal';

import { useAppContext } from '../../store/AppContext';
import { useAuthStore } from '../../store/authStore';
import { useOrganizationLocation } from '../../hooks/useOrganizationLocation';
import { useDiscoverStore } from '../../store/discoverStore';
import { showErrorAlert } from '@/utils/apiError';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { useBottomTabPadding } from '@/hooks/useBottomTabPadding';
import {
  isFoodListingNotification,
  subscribeNotificationReceived,
} from '@/services/pushNotifications';
import { mapDiscoverListing } from '../../services/foodListing.service';
import { driversService, type LiveDriver } from '@/services/drivers.service';
import { normalizeAuthProfile } from '@/utils/coordinates';

import { palette } from '../../theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';

type DiscoverListing = ReturnType<typeof mapDiscoverListing>;
type HomeTab = 'list' | 'drivers';

type LiveDriverRow = LiveDriver & { siteId: number };

function resolveFarmerSiteIds(authUser: any): number[] {
  const profile = normalizeAuthProfile(authUser);
  const profileSites: any[] = Array.isArray(profile?.sites) ? profile.sites : [];
  const ids: number[] = [];
  for (const site of profileSites) {
    const id = Number(site?.id);
    if (Number.isFinite(id) && id > 0) ids.push(id);
  }
  return Array.from(new Set(ids));
}

function dedupeLiveDrivers(rows: LiveDriverRow[]): LiveDriverRow[] {
  const seen = new Set<number>();
  return rows.filter((driver) => {
    if (!driver?.id || seen.has(driver.id)) return false;
    if (driver.online === false) return false;
    seen.add(driver.id);
    return true;
  });
}

export function FarmerHomeScreen() {
  useTransparentStatusBar('light');
  const navigation = useNavigation<any>();
  const bottomPadding = useBottomTabPadding(hp(2));
  const { currentProfile, authUser } = useAppContext();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
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

  const businessLogo =
    currentProfile.logo || authUser?.profile?.organisation?.logoUrl || null;
  const displayAddress = (currentProfile.address || capturedAddress || '').trim();

  const {
    animal: { listings, isFetching: loading },
    fetchListings: storeFetchListings,
  } = useDiscoverStore();

  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<HomeTab>('list');
  const [selectedListing, setSelectedListing] = useState<DiscoverListing | null>(null);
  const [liveDrivers, setLiveDrivers] = useState<LiveDriverRow[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversError, setDriversError] = useState<string | null>(null);

  const siteIds = useMemo(() => resolveFarmerSiteIds(authUser), [authUser]);

  const loadLiveDrivers = useCallback(async () => {
    setDriversLoading(true);
    setDriversError(null);
    try {
      const ids = siteIds;
      if (ids.length === 0) {
        setLiveDrivers([]);
        setDriversError('No farm site found for live drivers.');
        return;
      }

      const batches = await Promise.all(
        ids.map(async (siteId) => {
          const drivers = await driversService.getLiveDriversForSite(siteId);
          return drivers.map((driver) => ({ ...driver, siteId }));
        }),
      );

      setLiveDrivers(dedupeLiveDrivers(batches.flat()));
    } catch (e) {
      setDriversError('Could not load live drivers');
      showErrorAlert(e, 'Could not load drivers', 'Could not load live drivers');
    } finally {
      setDriversLoading(false);
    }
  }, [siteIds]);

  useEffect(() => {
    if (!authUser?.accessToken) return;
    storeFetchListings('animal').catch((e) =>
      showErrorAlert(e, 'Could not load listings', 'Could not load listings'),
    );
  }, [authUser?.accessToken, storeFetchListings]);

  useFocusEffect(
    useCallback(() => {
      refreshProfile().catch(() => undefined);
    }, [refreshProfile]),
  );

  useEffect(() => {
    if (!authUser?.accessToken) return;
    if (viewMode !== 'drivers') return;
    void loadLiveDrivers();
  }, [authUser?.accessToken, loadLiveDrivers, viewMode]);

  const reloadListings = useCallback(() => {
    storeFetchListings('animal', true).catch(() => undefined);
  }, [storeFetchListings]);

  useEffect(() => {
    return subscribeNotificationReceived((payload) => {
      if (isFoodListingNotification(payload)) {
        reloadListings();
      }
    });
  }, [reloadListings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (viewMode === 'drivers') {
        await loadLiveDrivers();
      } else {
        await storeFetchListings('animal', true);
      }
    } catch (e) {
      if (viewMode === 'list') {
        showErrorAlert(e, 'Could not load listings', 'Could not load listings');
      }
    } finally {
      setRefreshing(false);
    }
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = currentProfile.name?.split(' ')[0] || 'User';

  const callDriver = (phone: string) => {
    const cleaned = String(phone || '').trim();
    if (!cleaned) return;
    void Linking.openURL(`tel:${cleaned.replace(/\s+/g, '')}`);
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={hp(18)} borderRadius={0} />
      <Skeleton width={wp(55)} height={normalize(20)} style={styles.skeletonCenter} />
      <View style={styles.skeletonToggleRow}>
        <Skeleton width={wp(42)} height={normalize(40)} borderRadius={normalize(30)} />
        <Skeleton width={wp(42)} height={normalize(40)} borderRadius={normalize(30)} />
      </View>
      {[1, 2].map((i) => (
        <Skeleton
          key={i}
          width={wp(92)}
          height={normalize(180)}
          borderRadius={normalize(20)}
          style={styles.skeletonCard}
        />
      ))}
    </View>
  );

  if (loading && !refreshing && listings.length === 0 && viewMode === 'list') {
    return (
      <Screen backgroundColor={palette.creme} transparentTop>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        {renderSkeleton()}
      </Screen>
    );
  }

  const renderListing = ({ item }: { item: DiscoverListing }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <AppText variant="bodyBold" numberOfLines={2}>
            {item.title}
          </AppText>
          <AppText variant="bodySmall" style={styles.businessName} numberOfLines={1}>
            {item.businessName}
          </AppText>
        </View>
        <View style={styles.statusBadge}>
          <AppText variant="caption" style={styles.statusBadgeText}>
            {item.status}
          </AppText>
        </View>
      </View>

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={normalize(16)} color={palette.middlegreen} />
        <AppText variant="bodySmall" style={styles.locationText} numberOfLines={2}>
          {item.pickupAddress}
        </AppText>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoCell}>
          <AppText variant="caption" style={styles.infoLabel}>
            Quantity
          </AppText>
          <AppText variant="bodyBold">{item.quantityKg}kg</AppText>
        </View>

        <View style={styles.infoCell}>
          <AppText variant="caption" style={styles.infoLabel}>
            Best before
          </AppText>
          <AppText variant="bodySmall" style={styles.infoValue}>
            {item.bestBeforeLabel}
          </AppText>
        </View>

        <View style={styles.infoCell}>
          <AppText variant="caption" style={styles.infoLabel}>
            Pickup window
          </AppText>
          <AppText variant="bodySmall" style={styles.infoValue} numberOfLines={2}>
            {item.pickupWindow}
          </AppText>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.storageRow}>
          <Ionicons name="thermometer-outline" size={normalize(14)} color="#666" />
          <AppText variant="caption" style={styles.storageText}>
            {item.storage}
          </AppText>
        </View>

        <Button
          label="View Details"
          size="compact"
          style={styles.detailsBtn}
          onPress={() => setSelectedListing(item)}
        />
      </View>
    </View>
  );

  const renderDriver = ({ item }: { item: LiveDriverRow }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.driverIdentity}>
          <View style={styles.driverAvatar}>
            <Ionicons name="car-outline" size={normalize(22)} color={palette.middlegreen} />
          </View>
          <View style={styles.cardTitleWrap}>
            <AppText variant="bodyBold" numberOfLines={1}>
              {item.name || 'Driver'}
            </AppText>
            <AppText variant="bodySmall" style={styles.businessName} numberOfLines={1}>
              {item.vehicleType?.trim() || 'Vehicle not set'}
            </AppText>
          </View>
        </View>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <AppText variant="caption" style={styles.liveBadgeText}>
            Live
          </AppText>
        </View>
      </View>

      <View style={styles.driverMetaRow}>
        <Ionicons name="call-outline" size={normalize(16)} color={palette.middlegreen} />
        <AppText variant="bodySmall" style={styles.locationText}>
          {item.phone?.trim() || 'No phone number'}
        </AppText>
      </View>

      {Number.isFinite(item.lat) && Number.isFinite(item.lng) ? (
        <View style={styles.driverMetaRow}>
          <Ionicons name="navigate-outline" size={normalize(16)} color={palette.middlegreen} />
          <AppText variant="caption" style={styles.coordsText}>
            Last location · {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
          </AppText>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <AppText variant="caption" style={styles.storageText}>
          Assigned to your farm
        </AppText>
        <Button
          label="Call"
          size="compact"
          style={styles.detailsBtn}
          disabled={!item.phone?.trim()}
          onPress={() => callDriver(item.phone)}
        />
      </View>
    </View>
  );

  const Header = () => (
    <View>
      <HeroHeader
        source={require('../../../assets/placeholder/kale-header.png')}
        height={hp(15)}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextBlock}>
              <AppText variant="caption" style={styles.heroGreeting}>
                {greeting}
              </AppText>
              <AppText variant="h6" style={styles.heroName} numberOfLines={1}>
                {firstName}
              </AppText>
              <AppText variant="bodySmall" style={styles.heroOrg} numberOfLines={1}>
                {currentProfile.organization || 'Your farm'}
              </AppText>
            </View>

            <Pressable
              style={styles.logoCircle}
              onPress={() => navigation.navigate('Account')}
              accessibilityRole="button"
              accessibilityLabel="Open account profile"
            >
              {businessLogo ? (
                <Image
                  key={businessLogo}
                  source={{ uri: businessLogo }}
                  style={styles.logoImage}
                />
              ) : (
                <AppText style={styles.logoFallback}>
                  {currentProfile.organization?.[0] || 'F'}
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

      {showBanner && (
        <LocationRequiredBanner
          description="Share your farm location for better livestock feed matching."
          onUseGps={useGpsLocation}
          onSearchAddress={() => setModalVisible(true)}
          onDismiss={() => setBannerClosed(true)}
          gpsLoading={gpsLoading}
        />
      )}

      {!!capturedAddress && !showBanner && (
        <View style={styles.locationCapturedPill}>
          <Ionicons name="checkmark-circle" size={normalize(16)} color={palette.middlegreen} />
          <AppText
            variant="caption"
            style={styles.locationCapturedText}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {capturedAddress}
          </AppText>
        </View>
      )}

      <View style={styles.headingContainer}>
        <Image
          source={require('../../../assets/placeholder/Illustration.png')}
          style={styles.headingBg}
        />
        <AppText variant="heading" style={styles.headingText}>
          {viewMode === 'list' ? 'Livestock Feed Near You' : 'Your Live Drivers'}
        </AppText>
      </View>

      <View style={styles.toggleWrapper}>
        <Pressable
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleActive]}
          onPress={() => setViewMode('list')}
        >
          <AppText
            variant="label"
            style={viewMode === 'list' ? styles.toggleTextActive : styles.toggleText}
          >
            List
          </AppText>
        </Pressable>

        <Pressable
          style={[styles.toggleBtn, viewMode === 'drivers' && styles.toggleActive]}
          onPress={() => setViewMode('drivers')}
        >
          <AppText
            variant="label"
            style={viewMode === 'drivers' ? styles.toggleTextActive : styles.toggleText}
          >
            Drivers
          </AppText>
        </Pressable>
      </View>

      <View style={styles.activeListingRow}>
        <AppText variant="h7">
          {viewMode === 'list' ? 'Active Listings' : 'Active Drivers'}
        </AppText>
        <View style={styles.activeBadge}>
          <AppText variant="h7" style={{ color: palette.white }}>
            {viewMode === 'list' ? listings.length : liveDrivers.length}
          </AppText>
        </View>
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
        searchPlaceholder="Search farm address or place..."
      />

      <DiscoverListingDetailModal
        visible={!!selectedListing}
        listing={selectedListing}
        onClose={() => setSelectedListing(null)}
      />

      {viewMode === 'list' ? (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderListing}
          style={styles.list}
          ListHeaderComponent={Header}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <AppText variant="h7">No livestock feed available</AppText>
              <AppText variant="bodySmall">
                There are currently no farm surplus listings near you
              </AppText>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[palette.primary]}
              tintColor={palette.primary}
            />
          }
        />
      ) : (
        <FlatList
          data={liveDrivers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDriver}
          style={styles.list}
          ListHeaderComponent={Header}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPadding }]}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              {driversLoading && !refreshing ? (
                <ActivityIndicator color={palette.primary} />
              ) : (
                <>
                  <AppText variant="h7">No live drivers</AppText>
                  <AppText variant="bodySmall" style={styles.emptyCopy}>
                    {driversError ||
                      'Only drivers belonging to your farm who are currently live will appear here.'}
                  </AppText>
                </>
              )}
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[palette.primary]}
              tintColor={palette.primary}
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: palette.creme,
  },

  listContent: {
    flexGrow: 1,
  },

  heroContent: {
    flex: 1,
    paddingHorizontal: wp(5),
    justifyContent: 'flex-start',
    paddingTop: hp(1),
    paddingBottom: hp(1.5),
    gap: hp(0.8),
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: wp(3),
  },

  heroTextBlock: {
    flex: 1,
    gap: hp(0.2),
    minWidth: 0,
  },

  heroGreeting: {
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'none',
    letterSpacing: 0.3,
  },

  heroName: {
    color: palette.white,
    fontSize: normalize(22),
    lineHeight: normalize(28),
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
    paddingVertical: hp(0.5),
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
    overflow: 'hidden',
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

  locationCapturedPill: {
    marginHorizontal: wp(4),
    marginTop: hp(1),
    borderRadius: normalize(10),
    backgroundColor: '#ECF8F1',
    padding: wp(2.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },

  locationCapturedText: {
    flex: 1,
    color: palette.text,
  },

  headingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(3),
    marginBottom: hp(2.5),
    paddingHorizontal: wp(5),
  },

  headingBg: {
    position: 'absolute',
    width: '100%',
    height: hp(10),
    resizeMode: 'contain',
  },

  headingText: {
    textAlign: 'center',
  },

  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: '#EDEDED',
    borderRadius: normalize(30),
    marginHorizontal: wp(4),
    padding: normalize(4),
  },

  toggleBtn: {
    flex: 1,
    paddingVertical: hp(1.2),
    borderRadius: normalize(30),
    alignItems: 'center',
  },

  toggleActive: {
    backgroundColor: palette.mint,
  },

  toggleText: {
    opacity: 0.8,
  },

  toggleTextActive: {
    color: palette.black,
  },

  activeListingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(1.8),
    marginHorizontal: wp(4),
    marginBottom: hp(0.5),
  },

  activeBadge: {
    backgroundColor: palette.middlegreen,
    minWidth: wp(12),
    height: hp(4),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(3),
    borderRadius: normalize(12),
  },

  card: {
    marginHorizontal: wp(4),
    marginTop: hp(1.5),
    padding: wp(4),
    borderRadius: normalize(20),
    backgroundColor: palette.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: wp(2),
  },

  cardTitleWrap: {
    flex: 1,
    gap: hp(0.3),
  },

  driverIdentity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },

  driverAvatar: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(22),
    backgroundColor: '#E8F3EC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  businessName: {
    color: '#666',
  },

  statusBadge: {
    backgroundColor: '#E8F3EC',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: normalize(12),
  },

  statusBadgeText: {
    color: palette.middlegreen,
    fontWeight: '600',
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.2),
    backgroundColor: '#E8F3EC',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: normalize(12),
  },

  liveDot: {
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(4),
    backgroundColor: palette.middlegreen,
  },

  liveBadgeText: {
    color: palette.middlegreen,
    fontWeight: '700',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(1.5),
    marginTop: hp(1.2),
    paddingTop: hp(1.2),
    borderTopWidth: 1,
    borderTopColor: '#F3F3F3',
  },

  driverMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginTop: hp(1),
  },

  locationText: {
    flex: 1,
    color: '#444',
    lineHeight: normalize(18),
  },

  coordsText: {
    flex: 1,
    color: '#888',
  },

  infoGrid: {
    flexDirection: 'row',
    gap: wp(2),
    marginTop: hp(1.5),
  },

  infoCell: {
    flex: 1,
    backgroundColor: palette.creme,
    borderRadius: normalize(14),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2),
    alignItems: 'center',
    gap: hp(0.4),
  },

  infoLabel: {
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    fontSize: normalize(10),
  },

  infoValue: {
    textAlign: 'center',
    fontSize: normalize(12),
    lineHeight: normalize(16),
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp(1.5),
    paddingTop: hp(1.2),
    borderTopWidth: 1,
    borderTopColor: '#F3F3F3',
  },

  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    flex: 1,
    marginRight: wp(2),
  },

  storageText: {
    color: '#666',
    flex: 1,
  },

  detailsBtn: {
    backgroundColor: palette.middlegreen,
    minWidth: wp(32),
    paddingHorizontal: wp(3),
  },

  emptyContainer: {
    marginTop: hp(5),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(8),
    gap: hp(0.8),
  },

  emptyCopy: {
    textAlign: 'center',
    color: '#666',
  },

  skeletonWrap: {
    gap: hp(1.6),
  },

  skeletonCenter: {
    alignSelf: 'center',
    marginTop: hp(1),
  },

  skeletonToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
  },

  skeletonCard: {
    alignSelf: 'center',
  },
});
