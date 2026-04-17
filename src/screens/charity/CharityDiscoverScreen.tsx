import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';

import { charityListings } from '../../data/mockData';
import { useAppContext } from '../../store/AppContext';

import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useNavigation } from '@react-navigation/native';

const { height } = Dimensions.get('window');

export function CharityDiscoverScreen() {
  const navigation = useNavigation<any>();
  const { currentProfile } = useAppContext();
  const listRef = useRef<FlatList>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  /*DEMO COORDINATES*/
  const demoCoords = [
    { lat: 13.0827, lng: 80.2707 }, // Central Chennai
    { lat: 13.0674, lng: 80.2376 }, // T Nagar
    { lat: 13.0569, lng: 80.2425 }, // Kodambakkam
    { lat: 13.0358, lng: 80.2446 }, // Saidapet
    { lat: 13.0106, lng: 80.2209 }, // Guindy
    { lat: 12.9716, lng: 80.2214 }, // Velachery
  ];

  /* ENRICH DATA */
  const enrichedListings = useMemo(() => {
    return charityListings.map((item, index) => {
      const coord = demoCoords[index % demoCoords.length];
      return {
        ...item,
        lat: coord.lat,
        lng: coord.lng,
      };
    });
  }, []);

  const allowedStatuses = ['Available', 'Partial claimed'];

  const availableListings = enrichedListings.filter((item) =>
    allowedStatuses.includes(item.status)
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

  /* LIST ITEM */
  const renderListing = ({ item }: any) => (
    <TouchableOpacity activeOpacity={0.9} style={styles.card}>
      <View style={styles.cardTop}>
        <View>
          <AppText variant="bodyBold">
            {item.title}
          </AppText>
          <AppText style={styles.business}>
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
          ❄ {item.storage}
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
        <AppText variant="heading" style={styles.white}>
          {greeting}, {currentProfile.name.split(' ')[0]}
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

  /* MAP */
  const MapComponent = () => (
    <View style={[styles.mapContainer, { marginTop: spacing.md }]}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 13.0827,
          longitude: 80.2707,
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
            onPress={() => {
              const index = listingIndexMap[item.id];
              if (index !== undefined) {
                listRef.current?.scrollToIndex({
                  index,
                  animated: true,
                });
              }
            }}
          />
        ))}
      </MapView>

      {/* CARDS BELOW MAP */}
      <View style={styles.cardListWrapper}>
        <FlatList
          ref={listRef}
          data={availableListings}
          keyExtractor={(item) => item.id}
          renderItem={renderListing}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>
    </View>
  );

  /* RENDER */
  return (
    <Screen scrollable={false} backgroundColor={palette.creme}>
      {viewMode === 'list' ? (
        <FlatList
          data={availableListings}
          keyExtractor={(item) => item.id}
          renderItem={renderListing}
          ListHeaderComponent={Header}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={[{ key: 'map' }]} // dummy single item
          renderItem={() => (
            <>
              <Header />
              <MapComponent />
            </>
          )}
          keyExtractor={(item) => item.key}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

/* STYLES */

const styles = StyleSheet.create({
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
    opacity: 0.6,
  },

  toggleTextActive: {
    color: palette.white,
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
});