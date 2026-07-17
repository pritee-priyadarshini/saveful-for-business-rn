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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { HeroHeader } from '../../components/HeroHeader';
import { Skeleton } from '../../components/Skeleton';
import { LocationRequiredBanner } from '../../components/LocationRequiredBanner';
import { LocationSetupModal } from '../../components/LocationSetupModal';
import { DiscoverListingDetailModal } from '../../components/DiscoverListingDetailModal';

import { useAppContext } from '../../store/AppContext';
import { useOrganizationLocation } from '../../hooks/useOrganizationLocation';
import { useDiscoverStore } from '../../store/discoverStore';
import { useCharityStore } from '../../store/charityStore';
import { showErrorAlert } from '@/utils/apiError';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { useBottomTabPadding } from '@/hooks/useBottomTabPadding';
import { HeaderAddressRow } from '@/components/HeaderAddressRow';
import {
  isFoodListingNotification,
  subscribeNotificationReceived,
} from '@/services/pushNotifications';
import { useNavigation } from '@react-navigation/native';
import { mapDiscoverListing } from '../../services/foodListing.service';
import { driversService, type LiveDriver } from '@/services/drivers.service';
import { normalizeAuthProfile } from '@/utils/coordinates';

import { palette } from '../../theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';

type DiscoverListing = ReturnType<typeof mapDiscoverListing>;
type HomeTab = 'list' | 'drivers';

type LiveDriverRow = LiveDriver & { siteId: number };

function resolveCharitySiteIds(authUser: any, locations: any[]): number[] {
  const profile = normalizeAuthProfile(authUser);
  const profileSites: any[] = Array.isArray(profile?.sites) ? profile.sites : [];
  const fromProfile: number[] = [];
  for (const site of profileSites) {
    const id = Number(site?.id);
    if (Number.isFinite(id) && id > 0) fromProfile.push(id);
  }

  if (fromProfile.length > 0) {
    return Array.from(new Set(fromProfile));
  }

  const fromLocations: number[] = [];
  for (const location of locations ?? []) {
    const id = Number(location?.id);
    if (Number.isFinite(id) && id > 0) fromLocations.push(id);
  }

  return Array.from(new Set(fromLocations));
}

function dedupeLiveDrivers(rows: LiveDriverRow[]): LiveDriverRow[] {
  const seen = new Set<number>();
  return rows.filter((driver) => {
    if (!driver?.id || seen.has(driver.id)) return false;
    // API is site-scoped "live"; still require online when the flag is present.
    if (driver.online === false) return false;
    seen.add(driver.id);
    return true;
  });
}

export function CharityDiscoverScreen() {
  useTransparentStatusBar('light');
  const navigation = useNavigation<any>();
  const bottomPadding = useBottomTabPadding(hp(2));
  const { currentProfile, authUser } = useAppContext();
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
    people: { listings, isFetching: loading },
    fetchListings: storeFetchListings,
  } = useDiscoverStore();
  const { locations, fetchLocations } = useCharityStore();

  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<HomeTab>('list');
  const [selectedListing, setSelectedListing] = useState<DiscoverListing | null>(null);
  const [liveDrivers, setLiveDrivers] = useState<LiveDriverRow[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversError, setDriversError] = useState<string | null>(null);

  const siteIds = useMemo(
    () => resolveCharitySiteIds(authUser, locations),
    [authUser, locations],
  );

  const loadLiveDrivers = useCallback(async () => {
    setDriversLoading(true);
    setDriversError(null);
    try {
      let ids = siteIds;
      if (ids.length === 0) {
        await fetchLocations(true);
        ids = resolveCharitySiteIds(authUser, useCharityStore.getState().locations);
      }

      if (ids.length === 0) {
        setLiveDrivers([]);
        setDriversError('No charity site found for live drivers.');
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
  }, [authUser, fetchLocations, siteIds]);

  useEffect(() => {
    if (!authUser?.accessToken) return;
    storeFetchListings('people').catch((e) =>
      showErrorAlert(e, 'Could not load listings', 'Could not load listings'),
    );
    fetchLocations().catch(() => undefined);
  }, [authUser?.accessToken, fetchLocations, storeFetchListings]);

  useEffect(() => {
    if (!authUser?.accessToken) return;
    if (viewMode !== 'drivers') return;
    void loadLiveDrivers();
  }, [authUser?.accessToken, loadLiveDrivers, viewMode]);

  const reloadListings = useCallback(() => {
    storeFetchListings('people', true).catch(() => undefined);
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
        await storeFetchListings('people', true);
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
          Assigned to your charity site
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
      <HeroHeader source={require('../../../assets/placeholder/kale-header.png')}>
        <View style={[styles.topBar, { paddingTop: hp(2) }]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="h6" style={styles.whiteText}>
              {currentProfile.organization || 'Your Organisation'}
            </AppText>

            <HeaderAddressRow
              address={currentProfile.address || capturedAddress || 'No address available'}
              style={styles.locationHeaderRow}
              textStyle={styles.headerLocation}
            />
          </View>

          <Pressable
            style={styles.logoCircle}
            onPress={() => navigation.navigate('Account')}
            accessibilityRole="button"
            accessibilityLabel="Open account profile"
          >
            {currentProfile.logo ? (
              <Image source={{ uri: currentProfile.logo }} style={styles.logoImage} />
            ) : (
              <AppText style={styles.logoFallback}>
                {currentProfile.organization?.[0] || 'S'}
              </AppText>
            )}
          </Pressable>
        </View>
      </HeroHeader>

      <View style={styles.welcomeSection}>
        <AppText variant="h5">
          {greeting}, {firstName}
        </AppText>
        <AppText variant="bodyLarge" style={styles.welcomeSub}>
          We are helping good food go further, together
        </AppText>
      </View>

      {showBanner && (
        <LocationRequiredBanner
          description="Share your charity location for better pickup matching."
          onUseGps={useGpsLocation}
          onSearchAddress={() => setModalVisible(true)}
          onDismiss={() => setBannerClosed(true)}
          gpsLoading={gpsLoading}
        />
      )}

      {!!capturedAddress && !showBanner && (
        <View style={styles.locationCapturedPill}>
          <AppText variant="caption" numberOfLines={2} ellipsizeMode="tail">
            Location set: {capturedAddress}
          </AppText>
        </View>
      )}

      <View style={styles.headingContainer}>
        <Image
          source={require('../../../assets/placeholder/Illustration.png')}
          style={styles.headingBg}
        />
        <AppText variant="heading" style={styles.headingText}>
          {viewMode === 'list' ? 'Surplus Food Near You' : 'Your Live Drivers'}
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
        searchPlaceholder="Search charity address or place..."
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
              <AppText variant="h7">No surplus available</AppText>
              <AppText variant="bodySmall">There are currently no food listings near you</AppText>
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
                      'Only drivers belonging to your charity who are currently live will appear here.'}
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

  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: wp(4),
  },

  whiteText: {
    color: palette.white,
    fontSize: normalize(20),
  },

  locationHeaderRow: {
    marginTop: hp(0.8),
  },

  headerLocation: {
    color: palette.white,
    opacity: 0.85,
    fontSize: normalize(15),
    lineHeight: normalize(20),
  },

  logoCircle: {
    width: normalize(50),
    height: normalize(50),
    borderRadius: normalize(25),
    marginLeft: wp(3),
    backgroundColor: palette.white,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  logoImage: {
    width: '100%',
    height: '100%',
  },

  logoFallback: {
    color: '#7B3FE4',
    fontWeight: 'bold',
    fontSize: normalize(18),
  },

  welcomeSection: {
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
    gap: hp(0.6),
    alignItems: 'center',
  },

  welcomeSub: {
    color: '#666',
    fontSize: normalize(15),
    lineHeight: normalize(20),
    textAlign: 'center',
  },

  locationCapturedPill: {
    marginHorizontal: wp(4),
    marginTop: hp(1),
    borderRadius: normalize(10),
    backgroundColor: '#ECF8F1',
    padding: wp(2.5),
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
