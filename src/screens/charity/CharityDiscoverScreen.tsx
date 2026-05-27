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
  Modal,
  Animated,
  PanResponder,
  Keyboard,
  TouchableWithoutFeedback,
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
import { Ionicons } from '@expo/vector-icons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { GOOGLE_PLACES_API_KEY } from '@/config';

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
  const [savingLocation, setSavingLocation] = useState(false);
  const [showPlacesSearch, setShowPlacesSearch] = useState(false);
  const [region, setRegion] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [selectedAddress, setSelectedAddress] = useState('');

  const MODAL_HEIGHT = height * 0.72;
  const slideAnim = useRef(new Animated.Value(height * 0.72)).current;

  const openModal = () => {
    slideAnim.setValue(MODAL_HEIGHT);
    setShowPlacesSearch(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeModal = () => {
    Keyboard.dismiss();
    Animated.timing(slideAnim, { toValue: MODAL_HEIGHT, duration: 250, useNativeDriver: true })
      .start(() => setShowPlacesSearch(false));
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) slideAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          Keyboard.dismiss();
          Animated.timing(slideAnim, { toValue: MODAL_HEIGHT, duration: 250, useNativeDriver: true })
            .start(() => setShowPlacesSearch(false));
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

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

  const handleGpsLocation = async () => {
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow location access to continue.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = position.coords;
      const newRegion = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
      setRegion(newRegion);
      setMarker({ latitude, longitude });

      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      const place = places[0];
      const label = place
        ? [place.name, place.street, place.city, place.region, place.postalCode].filter(Boolean).join(', ')
        : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      setSelectedAddress(label);

      openModal();
    } catch (error: any) {
      Alert.alert('Location Error', 'Unable to get your location. Please try again.');
    }
  };

  const handleConfirmLocation = async () => {
    if (!marker) return;
    try {
      setSavingLocation(true);
      const { latitude, longitude } = marker;
      const organizationId = authUser?.profile?.organisation?.id;

      if (!organizationId) {
        Alert.alert('Unable to Save', 'Could not find your organisation to update.');
        return;
      }

      await charityService.updateOrganizationCoordinates(organizationId, { latitude, longitude });

      try {
        const profileRes = await authService.profile();
        const profile = profileRes.data;
        setAuthUser({
          ...profile.user,
          accessToken: authUser?.accessToken || '',
          orgType: profile.organisation?.type,
          orgRole: profile.role?.orgRole,
          siteRole: profile.role?.siteRole,
          profile,
        });
      } catch {
        // profile refresh can be retried later
      }

      setLocationBannerClosed(true);
      closeModal();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to save location. Please try again.');
    } finally {
      setSavingLocation(false);
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
            Share your charity location for better pickup matching.
          </AppText>

          <View style={styles.locationPickerRow}>
            <Pressable style={styles.locationPickerBtn} onPress={handleGpsLocation}>
              <Ionicons name="locate" size={normalize(16)} color={palette.primary} />
              <AppText style={styles.locationPickerBtnText}>Use My Location</AppText>
            </Pressable>
            <Pressable style={[styles.locationPickerBtn, styles.locationPickerBtnSearch]} onPress={openModal}>
              <Ionicons name="search" size={normalize(16)} color={palette.white} />
              <AppText style={[styles.locationPickerBtnText, styles.locationPickerBtnTextWhite]}>Search Address</AppText>
            </Pressable>
          </View>
        </View>
      )}

      {!!selectedAddress && !showLocationBanner && (
        <View style={styles.locationCapturedPill}>
          <AppText variant="caption">Location captured: {selectedAddress}</AppText>
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
      {/* LOCATION BOTTOM SHEET MODAL */}
      <Modal
        visible={showPlacesSearch}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}
              >
                <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
                  <View style={styles.dragHandle} />
                </View>

                <View style={styles.modalHeader}>
                  <AppText style={styles.modalTitle}>Set Location</AppText>
                  <Pressable onPress={closeModal} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={normalize(22)} color={palette.text} />
                  </Pressable>
                </View>

                <View style={styles.modalSearchContainer}>
                  <GooglePlacesAutocomplete
                    placeholder="Search charity address or place..."
                    fetchDetails
                    textInputProps={{ autoFocus: true }}
                    onPress={(data, details = null) => {
                      const lat = details?.geometry?.location?.lat;
                      const lng = details?.geometry?.location?.lng;
                      if (lat && lng) {
                        const newRegion = { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
                        setRegion(newRegion);
                        setMarker({ latitude: lat, longitude: lng });
                      }
                      const addr = details?.formatted_address || data.description;
                      setSelectedAddress(addr);
                      Keyboard.dismiss();
                    }}
                    query={{ key: GOOGLE_PLACES_API_KEY, language: 'en' }}
                    styles={{
                      container: { flex: 0 },
                      textInputContainer: { borderRadius: normalize(10), borderWidth: 1, borderColor: palette.border },
                      textInput: { height: normalize(46), color: palette.text, fontSize: normalize(14), marginBottom: 0, backgroundColor: palette.white },
                      listView: { backgroundColor: palette.white, borderRadius: normalize(10), borderWidth: 1, borderColor: palette.border, marginTop: normalize(4) },
                      row: { padding: normalize(12), backgroundColor: palette.white },
                      description: { fontSize: normalize(13), color: palette.text },
                    }}
                    enablePoweredByContainer={false}
                    debounce={300}
                    keepResultsAfterBlur
                  />
                </View>

                <View style={styles.modalMapContainer}>
                  {region ? (
                    <MapView
                      style={styles.mapView}
                      region={region}
                      showsUserLocation
                      onPress={async (e) => {
                        const { latitude, longitude } = e.nativeEvent.coordinate;
                        setMarker({ latitude, longitude });
                        const res = await Location.reverseGeocodeAsync({ latitude, longitude });
                        if (res.length > 0) {
                          const place = res[0];
                          const addr = [place.name, place.street, place.city, place.region, place.postalCode].filter(Boolean).join(', ');
                          setSelectedAddress(addr);
                        }
                      }}
                    >
                      {marker && <Marker coordinate={marker} />}
                    </MapView>
                  ) : (
                    <View style={styles.mapPlaceholder}>
                      <Ionicons name="map-outline" size={normalize(36)} color="#ccc" />
                      <AppText style={styles.mapPlaceholderText}>Search or tap to select a location</AppText>
                    </View>
                  )}
                </View>

                <Pressable
                  style={[styles.confirmBtn, (!marker || savingLocation) && styles.confirmBtnDisabled]}
                  onPress={handleConfirmLocation}
                  disabled={!marker || savingLocation}
                >
                  <AppText style={styles.confirmBtnText}>
                    {savingLocation ? 'Saving...' : marker ? 'Confirm Location' : 'Select a location on the map'}
                  </AppText>
                </Pressable>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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

  locationPickerRow: {
    flexDirection: 'row',
    gap: wp(2.5),
  },

  locationPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(6),
    padding: normalize(12),
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: palette.primary,
    backgroundColor: palette.primary + '15',
  },

  locationPickerBtnSearch: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },

  locationPickerBtnText: {
    fontSize: normalize(13),
    color: palette.primary,
    fontWeight: '500',
  },

  locationPickerBtnTextWhite: {
    color: palette.white,
  },

  // ─── Bottom Sheet Modal ────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  modalSheet: {
    height: height * 0.72,
    backgroundColor: palette.white,
    borderTopLeftRadius: normalize(20),
    borderTopRightRadius: normalize(20),
    overflow: 'hidden',
  },

  dragHandleArea: {
    alignItems: 'center',
    paddingVertical: normalize(10),
    backgroundColor: palette.white,
  },

  dragHandle: {
    width: normalize(40),
    height: normalize(4),
    borderRadius: normalize(2),
    backgroundColor: '#ddd',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingBottom: normalize(10),
  },

  modalTitle: {
    flex: 1,
    fontSize: normalize(16),
    fontWeight: '600',
    color: palette.text,
  },

  modalCloseBtn: {
    padding: normalize(4),
  },

  modalSearchContainer: {
    paddingHorizontal: wp(4),
    paddingBottom: normalize(8),
    zIndex: 10,
  },

  modalMapContainer: {
    flex: 1,
    marginHorizontal: wp(4),
    marginBottom: normalize(4),
    borderRadius: normalize(12),
    overflow: 'hidden',
  },

  mapView: {
    flex: 1,
  },

  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    gap: normalize(8),
  },

  mapPlaceholderText: {
    color: '#aaa',
    fontSize: normalize(12),
  },

  confirmBtn: {
    backgroundColor: palette.middlegreen,
    padding: normalize(14),
    marginHorizontal: wp(6),
    marginTop: normalize(8),
    marginBottom: normalize(16),
    borderRadius: normalize(10),
    alignItems: 'center',
  },

  confirmBtnDisabled: {
    backgroundColor: '#bbb',
  },

  confirmBtnText: {
    color: palette.white,
    fontSize: normalize(15),
    fontWeight: '600',
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