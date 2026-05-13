import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  FlatList,
  Image,
  View,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';

import { useAppContext } from '../../store/AppContext';

import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useNavigation } from '@react-navigation/native';
import { foodListingService } from '@/services/foodListing.service';

const { height } = Dimensions.get('window');

export function CharityDiscoverScreen() {
  const navigation = useNavigation<any>();
  const { currentProfile } = useAppContext();
  const listRef = useRef<FlatList>(null);

  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

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
      console.log('availableListings:', availableListings);

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

  const listingIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    availableListings.forEach((item, index) => {
      map[item.id] = index;
    });
    return map;
  }, [availableListings]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

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
    <View style={{ marginTop: -spacing.md }}>
      {/* TOP ROW */}
      <ImageBackground
        source={require('../../../assets/placeholder/kale-header.png')}
        style={[styles.headerBg, { width: '100%' }]}
      >
        <AppText variant="h6" style={styles.white}>
          {currentProfile.organization || 'Your Organisation'}
        </AppText>

        <View style={{ height: 30 }} />

        <AppText variant="heading" style={styles.white}>
          {greeting}, {currentProfile.name.split(' ')[0] || 'User'}
        </AppText>

        <View style={{ height: 6 }} />

        <AppText variant="bodySmall" style={styles.white}>
          We are helping good food go further, together
        </AppText>
      </ImageBackground>

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
      <View style={[styles.mapContainer, { marginTop: spacing.md }]}>
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
    height: 180,
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
    marginTop: 40,
    marginBottom: spacing.xxl,
  },

  headingBg: {
    position: 'absolute',
    width: '100%',
    height: 80,
    resizeMode: 'contain',
  },

  headingText: {
    textAlign: 'center',
  },

  toggleWrapper: {
    flexDirection: 'row',
    backgroundColor: '#EDEDED',
    borderRadius: 30,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    padding: 4,
  },

  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 30,
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
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
  },

  activeBadge: {
    backgroundColor: palette.middlegreen,
    color: palette.white,
    height: 35,
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 20,
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
    marginTop: 2,
  },

  distancePill: {
    backgroundColor: '#EFEAFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },

  infoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  infoBox: {
    flex: 1,
    backgroundColor: palette.radish,
    padding: spacing.sm,
    borderRadius: 14,
    alignItems: 'center'
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    alignItems: 'center',
  },

  claimBtn: {
    backgroundColor: palette.middlegreen,
    minWidth: 120,
  },

  mapContainer: {
    flex: 1,
  },

  map: {
    height: height * 0.4,
  },

  cardListWrapper: {
    marginTop: spacing.sm,
  },

  emptyContainer: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});