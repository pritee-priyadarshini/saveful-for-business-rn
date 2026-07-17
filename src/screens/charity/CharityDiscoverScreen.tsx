import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import {
  FlatList,
  Image,
  View,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Pressable,
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

import { palette } from '../../theme/colors';
import { OsmMapView } from '@/components/OsmMapView';
import { hp, normalize, wp } from '@/utils/responsive';

type DiscoverListing = ReturnType<typeof mapDiscoverListing>;

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
  const listRef = useRef<FlatList>(null);

  const {
    people: { listings, isFetching: loading },
    fetchListings: storeFetchListings,
  } = useDiscoverStore();

  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedListing, setSelectedListing] = useState<DiscoverListing | null>(null);

  useEffect(() => {
    if (!authUser?.accessToken) return;
    storeFetchListings('people').catch((e) =>
      showErrorAlert(e, 'Could not load listings', 'Could not load listings'),
    );
  }, [authUser?.accessToken]);

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
      await storeFetchListings('people', true);
    } catch (e) {
      showErrorAlert(e, 'Could not load listings', 'Could not load listings');
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

  if (loading && !refreshing && listings.length === 0) {
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
          Surplus Food Near You
        </AppText>
      </View>

      <View style={styles.toggleWrapper}>
        <Pressable
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleActive]}
          onPress={() => setViewMode('list')}
        >
          <AppText variant="label" style={viewMode === 'list' ? styles.toggleTextActive : styles.toggleText}>
            List
          </AppText>
        </Pressable>

        <Pressable
          style={[styles.toggleBtn, viewMode === 'map' && styles.toggleActive]}
          onPress={() => setViewMode('map')}
        >
          <AppText variant="label" style={viewMode === 'map' ? styles.toggleTextActive : styles.toggleText}>
            Map
          </AppText>
        </Pressable>
      </View>

      <View style={styles.activeListingRow}>
        <AppText variant="h7">Active Listings</AppText>
        <View style={styles.activeBadge}>
          <AppText variant="h7" style={{ color: palette.white }}>
            {listings.length}
          </AppText>
        </View>
      </View>
    </View>
  );

  const MapComponent = () => {
    if (listings.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <AppText variant="h7">No surplus available</AppText>
          <AppText variant="bodySmall">There are currently no food listings near you</AppText>
        </View>
      );
    }

    return (
      <View style={styles.mapContainer}>
        <OsmMapView
          style={styles.map}
          markers={listings.map((item) => ({
            latitude: item.lat,
            longitude: item.lng,
          }))}
        />

        <View style={styles.cardListWrapper}>
          <FlatList
            ref={listRef}
            data={listings}
            keyExtractor={(item) => item.id}
            renderItem={renderListing}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mapCardList}
          />
        </View>
      </View>
    );
  };

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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[palette.primary]} tintColor={palette.primary} />}
        />
      ) : (
        <FlatList
          data={[{ key: 'map' }]}
          style={styles.list}
          renderItem={() => (
            <>
              <Header />
              <MapComponent />
            </>
          )}
          keyExtractor={(item) => item.key}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[palette.primary]} tintColor={palette.primary} />}
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

  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(1.5),
    marginTop: hp(1.2),
    paddingTop: hp(1.2),
    borderTopWidth: 1,
    borderTopColor: '#F3F3F3',
  },

  locationText: {
    flex: 1,
    color: '#444',
    lineHeight: normalize(18),
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

  mapContainer: {
    flex: 1,
  },

  map: {
    height: hp(40),
    marginHorizontal: wp(4),
    borderRadius: normalize(16),
    overflow: 'hidden',
  },

  cardListWrapper: {
    marginTop: hp(1),
  },

  mapCardList: {
    paddingHorizontal: wp(4),
  },

  emptyContainer: {
    marginTop: hp(5),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(8),
    gap: hp(0.8),
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
