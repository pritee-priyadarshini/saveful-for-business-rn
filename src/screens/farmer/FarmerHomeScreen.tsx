import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import {
  FlatList,
  Image,
  View,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  RefreshControl,
  StyleSheet,
} from 'react-native';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Skeleton } from '../../components/Skeleton';
import { LocationRequiredBanner } from '../../components/LocationRequiredBanner';
import { LocationSetupModal } from '../../components/LocationSetupModal';

import { useAppContext } from '../../store/AppContext';
import { useOrganizationLocation } from '../../hooks/useOrganizationLocation';
import { useDiscoverStore } from '../../store/discoverStore';
import { showErrorAlert } from '@/utils/apiError';
import {
  isFoodListingNotification,
  subscribeNotificationReceived,
} from '@/services/pushNotifications';

import { palette } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { OsmMapView } from '@/components/OsmMapView';

const { width, height } = Dimensions.get("window");
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};


export function FarmerHomeScreen() {
  const navigation = useNavigation<any>();
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
    animal: { listings, isFetching: loading },
    fetchListings: storeFetchListings,
  } = useDiscoverStore();

  const [refreshing, setRefreshing] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'list' | 'map'>('list');

  useEffect(() => {
    if (!authUser?.accessToken) return;
    storeFetchListings('animal').catch((e) =>
      showErrorAlert(e, 'Could not load listings', 'Could not load listings'),
    );
  }, [authUser?.accessToken]);

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
      await storeFetchListings('animal', true);
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

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={hp(22)} borderRadius={0} />
      <Skeleton width={wp(55)} height={normalize(20)} style={styles.skeletonCenter} />
      <View style={styles.skeletonToggleRow}>
        <Skeleton width={wp(42)} height={normalize(40)} borderRadius={normalize(30)} />
        <Skeleton width={wp(42)} height={normalize(40)} borderRadius={normalize(30)} />
      </View>
      <View style={styles.skeletonActiveRow}>
        <Skeleton width={wp(35)} height={normalize(18)} />
        <Skeleton width={wp(16)} height={hp(4.2)} borderRadius={normalize(12)} />
      </View>
      {[1, 2].map((i) => (
        <Skeleton key={i} width={wp(92)} height={normalize(150)} borderRadius={normalize(20)} style={styles.skeletonCard} />
      ))}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <Screen backgroundColor={palette.creme}>
        {renderSkeleton()}
      </Screen>
    );
  }

  const renderListing = ({ item }: any) => (
    <TouchableOpacity activeOpacity={0.9} style={styles.card}>
      <View style={styles.cardTop}>
        <View>
          <AppText variant="bodyBold">
            {item.title}
          </AppText>
          <AppText variant="bodyBold" style={styles.business}>
            {item.businessName}
          </AppText>
        </View>

        <View style={styles.distancePill}>
          <AppText variant='label'>
            📍 {item.distance}
          </AppText>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoBox}>
          <AppText variant="caption">Quantity</AppText>
          <AppText variant="bodySmall">{item.quantityKg}kg</AppText>
        </View>

        <View style={styles.infoBox}>
          <AppText variant="caption">Date</AppText>
          <AppText variant="bodySmall">
            {item.date || new Date().toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
            })}
          </AppText>
        </View>

        <View style={styles.infoBox}>
          <AppText variant="caption">Time</AppText>
          <AppText variant="bodySmall">
            {item.pickupWindow}
          </AppText>
        </View>
      </View>

      <View style={styles.footer}>
        <AppText variant='bodySmall'>
          Instructions: {item.storage}
        </AppText>

        <Button
          label="View Details"
          style={styles.claimBtn}
          onPress={() => navigation.navigate('Available', {
            screen: 'FarmerMap',
          })}
        />
      </View>
    </TouchableOpacity>
  );

  /* HEADER */
  const Header = () => (
    <View style={{ marginTop: -hp(1.8) }}>
      {/* TOP ROW */}
      <ImageBackground
        source={require('../../../assets/placeholder/kale-header.png')}
        style={[styles.headerBg, { width: '100%' }]}
      >
        <AppText variant="h6" style={styles.white}>
          {currentProfile.organization || 'Your Organisation'}
        </AppText>

        <View style={{ height: hp(3.5) }} />

        <AppText variant="heading" style={styles.white}>
          {greeting}, {currentProfile.name.split(' ')[0] || 'User'}
        </AppText>

        <View style={{ height: hp(0.7) }} />

        <AppText variant="bodySmall" style={styles.white}>
          We are helping good food go further, together
        </AppText>
      </ImageBackground>

      {showBanner && (
        <LocationRequiredBanner
          description="Share your farm location for better pickup matching."
          onUseGps={useGpsLocation}
          onSearchAddress={() => setModalVisible(true)}
          onDismiss={() => setBannerClosed(true)}
          gpsLoading={gpsLoading}
        />
      )}

      {!!capturedAddress && !showBanner && (
        <View style={styles.locationCapturedPill}>
          <AppText variant="caption">Location set: {capturedAddress}</AppText>
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

      {/* TOGGLE */}
      <View style={styles.toggleWrapper}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            viewMode === 'list' && styles.toggleActive,
          ]}
          onPress={() => setViewMode('list')}
        >
          <AppText variant='label'
            style={
              viewMode === 'list'
                ? styles.toggleTextActive
                : styles.toggleText
            }
          >
            List
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleBtn,
            viewMode === 'map' && styles.toggleActive,
          ]}
          onPress={() => setViewMode('map')}
        >
          <AppText variant='label'
            style={
              viewMode === 'map'
                ? styles.toggleTextActive
                : styles.toggleText
            }
          >
            Map
          </AppText>
        </TouchableOpacity>
      </View>

      <View style={styles.activeListingRow}>
        <AppText variant='h7'>
          Active Listings
        </AppText>

        <View style={styles.activeBadge}>
          <AppText variant='h7' style={{ color: palette.white }}>
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
        </View>
      );
    }

    return (
      <View style={[styles.mapContainer, { marginTop: hp(1.8) }]}>
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
          />
        </View>
      </View>
    );
  };

  /* RENDER */
  return (
    <Screen scrollable={false} backgroundColor={palette.creme}>
      <LocationSetupModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={async ({ latitude, longitude, address }) => {
          await saveLocation(latitude, longitude, address);
        }}
        confirming={saving}
        searchPlaceholder="Search farm address or place..."
      />

      {viewMode === 'list' ? (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          renderItem={renderListing}
          ListHeaderComponent={Header}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <AppText variant="h7">No surplus available</AppText>
              <AppText variant="bodySmall">
                There are currently no food listings near you
              </AppText>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        />
      ) : (
        <FlatList
          data={[{ key: 'map' }]}
          renderItem={() => (
            <>
              <Header />
              <MapComponent />
            </>
          )}
          keyExtractor={(item) => item.key}
        />
      )}
    </Screen>
  );
}

/* STYLES */

const styles = StyleSheet.create({
  skeletonWrap: {
    paddingBottom: hp(3),
    gap: hp(1.2),
  },
  skeletonCenter: {
    alignSelf: 'center',
  },
  skeletonToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: wp(2),
    paddingHorizontal: wp(4),
  },
  skeletonActiveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
  },
  skeletonCard: {
    alignSelf: 'center',
  },

  headerBg: {
    height: hp(22),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0,
  },

  white: {
    color: palette.white,
    textAlign: 'center',
  },

  headingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(4.5),
    marginBottom: hp(4),
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

  locationCapturedPill: {
    marginHorizontal: wp(4),
    marginTop: hp(1),
    borderRadius: normalize(10),
    backgroundColor: '#ECF8F1',
    padding: wp(2.5),
  },

  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: '#EDEDED',
    borderRadius: normalize(30),
    marginTop: hp(1.8),
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
  },

  activeBadge: {
    backgroundColor: palette.middlegreen,
    color: palette.white,
    height: hp(4.2),
    width: wp(16),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: normalize(12),
  },

  card: {
    marginHorizontal: wp(4),
    marginTop: hp(1.5),
    padding: wp(4),
    borderRadius: normalize(20),
    backgroundColor: palette.creme,
    borderWidth: 1,
    borderColor: palette.border,
  },

  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  business: {
    opacity: 0.6,
    marginTop: hp(0.2),
  },

  distancePill: {
    backgroundColor: '#EFEAFE',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.8),
    borderRadius: normalize(12),
  },

  infoRow: {
    flexDirection: 'row',
    gap: wp(2.5),
    marginTop: hp(1.5),
  },

  infoBox: {
    flex: 1,
    backgroundColor: palette.radish,
    padding: wp(2.5),
    borderRadius: normalize(14),
    alignItems: 'center'
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(1.5),
    alignItems: 'center',
  },

  claimBtn: {
    backgroundColor: palette.middlegreen,
    minWidth: wp(30),
  },

  mapContainer: {
    flex: 1,
  },

  map: {
    height: hp(40),
  },

  cardListWrapper: {
    marginTop: hp(1),
  },

  emptyContainer: {
    marginTop: hp(5),
    alignItems: 'center',
    justifyContent: 'center',
  },
});