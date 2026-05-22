import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  FlatList,
  Image,
  View,
  TouchableOpacity,
  Pressable,
  Alert,
  Dimensions,
  ImageBackground,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';

import { useAppContext } from '../../store/AppContext';

import { palette } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { foodListingService } from '@/services/foodListing.service';
import { charityService } from '@/services/charity.service';
import { authService } from '@/services/auth.service';

const { width, height } = Dimensions.get("window");
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};


export function CharityDiscoverScreen() {
  const navigation = useNavigation<any>();
  const { currentProfile, authUser, setAuthUser } = useAppContext();
  const listRef = useRef<FlatList>(null);

  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [locationBannerClosed, setLocationBannerClosed] = useState(false);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [capturedLocationText, setCapturedLocationText] = useState('');

  const profileLatitude =
    authUser?.profile?.sites?.[0]?.latitude ??
    authUser?.profile?.organisation?.latitude;
  const profileLongitude =
    authUser?.profile?.sites?.[0]?.longitude ??
    authUser?.profile?.organisation?.longitude;

  const hasBackendLocation =
    profileLatitude !== null &&
    profileLatitude !== undefined &&
    profileLongitude !== null &&
    profileLongitude !== undefined;

  const showLocationBanner =
    !hasBackendLocation && !locationBannerClosed;

  useEffect(() => {
    console.log('[Banner] profileLatitude =', profileLatitude);
    console.log('[Banner] profileLongitude =', profileLongitude);
    console.log('[Banner] hasBackendLocation =', hasBackendLocation);
    console.log('[Banner] locationBannerClosed =', locationBannerClosed);
    console.log('[Banner] showLocationBanner =', showLocationBanner);
  }, [profileLatitude, profileLongitude, hasBackendLocation, locationBannerClosed]);

  const fetchListings = async () => {
    try {
      setLoading(true);

      const res = await foodListingService.getListings({
        status: 'ACTIVE',
      });

      const raw = res?.data;

      let data: any[] = [];

      if (Array.isArray(raw)) {
        data = raw;
      } else if (Array.isArray(raw?.data)) {
        data = raw.data;
      } else if (Array.isArray(raw?.data?.listings)) {
        data = raw.data.listings;
      } else if (Array.isArray(raw?.listings)) {
        data = raw.listings;
      } else {
        console.log('Unexpected Data :', raw);
        data = [];
      }

      const mapped = data.map((item: any) => {
        const totalQty =
          item.foodItems?.reduce(
            (sum: number, f: any) =>
              sum + (f.remainingQtyKg || f.totalQtyKg || 0),
            0
          ) || item.totalQtyKg || 0;

        return {
          id: String(item.id),
          title: 'Surplus Food',
          businessName: item.site?.locationName || item.site?.name || item.businessName || 'Food Provider',
          quantityKg: totalQty,
          date: item.bestBefore,
          pickupWindow:
            item.pickupFromTime && item.pickupByTime
              ? `${item.pickupFromTime} - ${item.pickupByTime}`
              : 'Flexible',

          storage: item.needsRefrigeration ? 'Keep Refrigerated' : 'Room Temperature',
          status:
            item.status === 'ACTIVE'
              ? 'Available'
              : item.status === 'PARTIAL'
                ? 'Partial claimed'
                : item.status,

          lat: Number(item.pickupLat) || 20.2961,
          lng: Number(item.pickupLng) || 85.8245,

          distance: '—',
        };
      });

      setListings(mapped);
    } catch (err) {
      console.log('LISTING_FETCH_ERROR:', err);
      setListings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const availableListings = useMemo(
    () =>
      Array.isArray(listings)
        ? listings.filter((i) =>
          ['Available', 'Partial claimed'].includes(i.status)
        )
        : [],
    [listings]
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const handleShareCurrentLocation = async () => {
    try {
      setCapturingLocation(true);

      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow location access to continue.',
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      const places = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      const place = places[0];
      const label = place
        ? [
            place.name,
            place.street,
            place.city,
            place.region,
            place.postalCode,
          ]
            .filter(Boolean)
            .join(', ')
        : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

      const organizationId = authUser?.profile?.organisation?.id;

      console.log('[Location] profile.organisation =', JSON.stringify(authUser?.profile?.organisation));
      console.log('[Location] organizationId =', organizationId);
      console.log('[Location] calling PATCH /organization/ccordinates/' + organizationId);

      if (!organizationId) {
        Alert.alert('Unable to Save', 'Could not find your organisation to update.');
        return;
      }

      await charityService.updateOrganizationCoordinates(organizationId, { latitude, longitude });

      try {
        const profileRes = await authService.profile();
        const profile = profileRes.data;

        console.log('[Location] refreshed organisation.latitude =', profile?.organisation?.latitude);
        console.log('[Location] refreshed organisation.longitude =', profile?.organisation?.longitude);
        console.log('[Location] refreshed sites[0].latitude =', profile?.sites?.[0]?.latitude);

        setAuthUser({
          ...profile.user,
          accessToken: authUser?.accessToken || '',
          orgType: profile.organisation?.type,
          orgRole: profile.role?.orgRole,
          siteRole: profile.role?.siteRole,
          profile,
        });
      } catch {
        // Saving location already succeeded; profile refresh can be retried later.
      }

      setCapturedLocationText(label);
      setLocationBannerClosed(true);
      Alert.alert('Location Shared', 'Your location has been saved successfully.');
    } catch (error: any) {
      console.log('[Location] ERROR full response:', JSON.stringify(error?.response?.data));
      console.log('[Location] ERROR status:', error?.response?.status);
      console.log('[Location] ERROR url:', error?.config?.url);
      Alert.alert(
        'Location Error',
        `Status: ${error?.response?.status}\nURL: ${error?.config?.url}\n${error?.response?.data?.message ?? error?.message ?? 'Unable to save your location.'}`
      );
    } finally {
      setCapturingLocation(false);
    }
  };

  if (loading) {
    return (
      <Screen backgroundColor={palette.creme}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={palette.middlegreen} />
        </View>
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
            screen: 'CharityMap',
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

      {showLocationBanner && (
        <View style={styles.locationBanner}>
          <View style={styles.locationBannerTopRow}>
            <AppText variant="bodyBold">Share your location to get started</AppText>
            <Pressable onPress={() => setLocationBannerClosed(true)}>
              <AppText variant="bodyLarge">×</AppText>
            </Pressable>
          </View>

          <AppText variant="bodySmall" style={styles.locationBannerText}>
            Are you currently at your charity location? Share your location for better pickup matching.
          </AppText>

          <Pressable
            style={styles.locationBannerBtn}
            onPress={handleShareCurrentLocation}
            disabled={capturingLocation}
          >
            <AppText variant="label" style={styles.locationBannerBtnText}>
              {capturingLocation ? 'Getting location...' : 'Share Your Location'}
            </AppText>
          </Pressable>
        </View>
      )}

      {!!capturedLocationText && !showLocationBanner && (
        <View style={styles.locationCapturedPill}>
          <AppText variant="caption">Location captured: {capturedLocationText}</AppText>
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
            {availableListings.length}
          </AppText>
        </View>
      </View>
    </View>
  );

  const MapComponent = () => {
    if (availableListings.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <AppText variant="h7">No surplus available</AppText>
        </View>
      );
    }

    return (
      <View style={[styles.mapContainer, { marginTop: hp(1.8) }]}>
        <MapView
          style={styles.map}
          liteMode
          initialRegion={{
            latitude: availableListings[0].lat,
            longitude: availableListings[0].lng,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
        >
          {availableListings.map((item) => (
            <Marker
              key={item.id}
              coordinate={{
                latitude: item.lat,
                longitude: item.lng,
              }}
            />
          ))}
        </MapView>

        <View style={styles.cardListWrapper}>
          <FlatList
            ref={listRef}
            data={availableListings}
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
      {viewMode === 'list' ? (
        <FlatList
          data={availableListings}
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
              onRefresh={() => {
                setRefreshing(true);
                fetchListings();
              }}
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
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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

  locationBanner: {
    marginHorizontal: wp(4),
    marginTop: hp(1.5),
    borderRadius: normalize(16),
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    padding: wp(3.5),
    gap: hp(1),
  },

  locationBannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  locationBannerText: {
    opacity: 0.8,
  },

  locationBannerBtn: {
    backgroundColor: palette.middlegreen,
    borderRadius: normalize(12),
    paddingVertical: hp(1.2),
    alignItems: 'center',
  },

  locationBannerBtnText: {
    color: palette.white,
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