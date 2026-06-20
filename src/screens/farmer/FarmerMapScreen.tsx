import React, { useMemo, useState, useEffect } from 'react';
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  ImageBackground,
  Pressable,
  RefreshControl,
  Dimensions,
} from 'react-native';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { Skeleton } from '../../components/Skeleton';
import { palette } from '../../theme/colors';
import { fetchDiscoverListings } from '@/services/foodListing.service';
import { useAppContext } from '../../store/AppContext';

const { width, height } = Dimensions.get("window");
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

type ClaimState = Record<string, number>;

export function FarmerMapScreen({ navigation }: any) {
  const { authUser } = useAppContext();
  const [claimState, setClaimState] = useState<ClaimState>({});
  const [activeFilter, setActiveFilter] = useState<'distance' | 'surplus' | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!authUser?.accessToken) {
      setLoading(false);
      return;
    }
    fetchListings();
  }, [authUser?.accessToken]);

  const fetchListings = async () => {
    if (!authUser?.accessToken) return;

    try {
      setLoading(true);

      const data = await fetchDiscoverListings('animal', { page: 1, limit: 20 });

      if (!Array.isArray(data)) {
        console.log('[Listings] Invalid discover response');
        setListings([]);
        return;
      }

      const mapped = data.map((item: any) => {
        return {
          id: String(item.id),

          businessName:
            item?.site?.locationName ||
            item?.organisation?.name ||
            'Food Provider',

          suburb: item?.pickupAddress || 'Unknown',
          type: 'Surplus',

          distance: item.distance || '—',

          quantityKg:
            item.foodItems?.reduce(
              (sum: number, f: any) => sum + (f.remainingQtyKg || 0),
              0
            ) || 0,

          pickupDate: item.bestBefore,
          pickupTime:
            item.pickupFromTime && item.pickupByTime
              ? `${item.pickupFromTime} - ${item.pickupByTime}`
              : 'Flexible',

          storage: item.needsRefrigeration
            ? 'Keep Refrigerated'
            : 'Room Temp',

          items:
            item.foodItems?.map((f: any) => ({
              name: f.category,
              quantityKg: f.remainingQtyKg,
            })) || [],
        };
      });

      setListings(mapped);
    } catch (err) {
      console.log('FETCH ERROR', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getKey = (listingId: string, itemName: string) =>
    `${listingId}-${itemName}`;

  const updateQty = (
    listingId: string,
    itemName: string,
    maxQty: number,
    delta: number,
  ) => {
    const key = getKey(listingId, itemName);

    setClaimState((prev) => {
      const current = prev[key] || 0;
      let next = current + delta;

      if (next < 0) next = 0;
      if (next > maxQty) next = maxQty;

      return {
        ...prev,
        [key]: next,
      };
    });
  };

  const getTotalSelected = (listingId: string) => {
    return Object.entries(claimState)
      .filter(([key]) => key.startsWith(listingId))
      .reduce((sum, [, qty]) => sum + qty, 0);
  };

  const buildPayload = (listing: any) => {
    return listing.items
      .map((i: any) => {
        const key = getKey(listing.id, i.name);
        const qty = claimState[key] || 0;

        if (qty > 0) {
          return { name: i.name, claimedQty: qty };
        }
        return null;
      })
      .filter(Boolean);
  };

  const ListHeader = () => (
    <View style={styles.headerWrapper}>
      {/* TITLE */}
      <ImageBackground
        source={require('../../../assets/placeholder/feed-bg.png')}
        style={styles.headerBg}
      >
        <AppText variant="h5" style={styles.white}>
          Surplus Available
        </AppText>
      </ImageBackground>

      <Pressable
        style={styles.pickupBtn}
        onPress={() => navigation.navigate('FarmerPickup')}
      >
        <AppText variant="bodyBold" style={styles.pickupBtnText} >
          View Your Pickups
        </AppText>
      </Pressable>

      {/* ACTIVE LISTINGS */}
      <View style={styles.activeRow}>
        <AppText variant='h7'>
          Active Listings
        </AppText>

        <View style={styles.activeBadge}>
          <AppText variant='h7' color='white'>
            {listings.length}
          </AppText>
        </View>
      </View>

      {/* FILTER PILLS */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterPill,
            activeFilter === 'distance' && styles.filterPillActive,
          ]}
          onPress={() =>
            setActiveFilter(activeFilter === 'distance' ? null : 'distance')
          }
        >
          <AppText variant='caption'
            style={
              activeFilter === 'distance'
                ? styles.filterTextActive
                : styles.filterText
            }
          >
            Sort by Distance
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterPill,
            activeFilter === 'surplus' && styles.filterPillActive,
          ]}
          onPress={() =>
            setActiveFilter(activeFilter === 'surplus' ? null : 'surplus')
          }
        >
          <AppText variant='caption'
            style={
              activeFilter === 'surplus'
                ? styles.filterTextActive
                : styles.filterText
            }
          >
          by Surplus Available
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItemRow = (listing: any, item: any) => {
    const key = getKey(listing.id, item.name);
    const qty = claimState[key] || 0;

    return (
      <View key={item.name} style={styles.itemCard}>
        {/* LEFT */}
        <View style={{ flex: 1 }}>
          <AppText variant='label'>{item.name}</AppText>
          <AppText variant='bodySmall'>
            Available: {item.quantityKg} kg
          </AppText>
        </View>

        {/* RIGHT - STEPPER */}
        <View style={styles.stepper}>
          <TouchableOpacity
            onPress={() =>
              updateQty(listing.id, item.name, item.quantityKg, -1)
            }
            style={styles.stepBtn}
          >
            <AppText variant='label'>−</AppText>
          </TouchableOpacity>

          <View style={styles.qtyPill}>
            <AppText variant='label'>{qty}</AppText>
          </View>

          <TouchableOpacity
            onPress={() =>
              updateQty(listing.id, item.name, item.quantityKg, 1)
            }
            style={styles.stepBtn}
          >
            <AppText variant='label'>＋</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderListing = ({ item }: any) => {
    const totalSelected = getTotalSelected(item.id);
    const hasSelection = totalSelected > 0;

    return (
      <View style={styles.card}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <AppText variant='bodyBold'>{item.businessName}</AppText>
            <AppText variant='bodySmall'>
              {item.suburb} · {item.type}
            </AppText>
          </View>

          <View style={styles.distanceChip}>
            <AppText variant='bodySmall'>📍 {item.distance}</AppText>
          </View>
        </View>

        {/* INFO STRIP */}
        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <AppText variant='label'>Quantity</AppText>
            <AppText variant='bodySmall'>{item.quantityKg} kg</AppText>
          </View>

          <View style={styles.infoCard}>
            <AppText variant='label'>Pickup Date</AppText>
            <AppText variant='bodySmall'>{item.pickupDate}</AppText>
          </View>

          <View style={styles.infoCard}>
            <AppText variant='label'>Pickup Time</AppText>
            <AppText variant='bodySmall'>{item.pickupTime}</AppText>
          </View>
        </View>

        <View style={styles.storageRow}>
          <AppText variant='label'>Storage:</AppText>
          <AppText variant='bodySmall'> {item.storage}</AppText>
        </View>

        {/* ITEMS */}
        <View style={styles.section}>
          <AppText variant='label' style={styles.sectionTitle}>Select quantity</AppText>
          {item.items.map((i: any) => renderItemRow(item, i))}
        </View>

        {/* CTA */}
        <View style={styles.ctaRow}>
          <Button
            label={`Claim ${totalSelected} kg`}
            disabled={!hasSelection}
            style={styles.flexBtn}
            onPress={() => {
              const payload = buildPayload(item);

              navigation.navigate('FarmerClaimConfirm', {
                listing: item,
                payload,
              });
            }}
          />

          <Button
            label="Claim All"
            variant="primary"
            style={styles.flexBtn}
            onPress={() =>
              navigation.navigate('FarmerClaimConfirm', {
                listing: item,
              })
            }
          />
        </View>
      </View>
    );
  };

  const sortedListings = useMemo(() => {
    let data = [...listings];

    if (activeFilter === 'distance') {
      data.sort(
        (a, b) =>
          parseFloat(a.distance || '0') -
          parseFloat(b.distance || '0')
      );
    }

    if (activeFilter === 'surplus') {
      data.sort(
        (a, b) => (b.quantityKg || 0) - (a.quantityKg || 0)
      );
    }

    return data;
  }, [listings, activeFilter]);

  if (loading && !refreshing) {
    return (
      <Screen backgroundColor={palette.creme} scrollable={false}>
        <View style={styles.skeletonWrap}>
          <Skeleton width="100%" height={hp(20)} borderRadius={0} />
          <Skeleton width={wp(70)} height={normalize(44)} borderRadius={normalize(14)} style={styles.skeletonCenter} />
          <View style={styles.skeletonActiveRow}>
            <Skeleton width={wp(35)} height={normalize(18)} />
            <Skeleton width={wp(16)} height={hp(4.2)} borderRadius={normalize(12)} />
          </View>
          <View style={styles.skeletonFilterRow}>
            <Skeleton width={wp(42)} height={normalize(36)} borderRadius={normalize(20)} />
            <Skeleton width={wp(42)} height={normalize(36)} borderRadius={normalize(20)} />
          </View>
          {[1, 2].map((i) => (
            <Skeleton key={i} width={wp(92)} height={normalize(280)} borderRadius={normalize(20)} style={styles.skeletonCard} />
          ))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={palette.creme} scrollable={false}>
      <FlatList
        data={sortedListings}
        keyExtractor={(item) => item.id}
        renderItem={renderListing}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[
          styles.container,
          listings.length === 0 && { flex: 1 },
        ]}

        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <AppText variant="h7">No surplus available</AppText>
            <AppText variant="bodySmall" style={{ marginTop: hp(0.7) }}>
              No surplus available. Check again later.
            </AppText>
          </View>
        }

        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchListings();
            }}
          />
        }

        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: hp(4),
  },

  headerWrapper: {
    paddingHorizontal: wp(4),
  },

  headerBg: {
    height: hp(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: -wp(4),
  },

  pickupBtn: {
    marginHorizontal: wp(4),
    marginTop: hp(1.5),
    marginBottom: hp(1.5),
    backgroundColor: palette.primary,
    paddingVertical: hp(1.4),
    borderRadius: normalize(14),
    alignItems: 'center',
  },

  pickupBtnText: {
    color: palette.white,
  },

  white: {
    color: palette.white,
    textAlign: 'center',
  },

  activeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp(1.5),
  },

  activeBadge: {
    backgroundColor: palette.middlegreen,
    minWidth: wp(18),
    paddingHorizontal: wp(5),
    paddingVertical: hp(0.9),
    borderRadius: normalize(10),
    alignItems: 'center',
  },

  filterRow: {
    flexDirection: 'row',
    gap: wp(2.5),
    marginTop: hp(1.5),
  },

  filterPill: {
    flex: 1,
    backgroundColor: palette.radish,
    paddingVertical: hp(1.2),
    borderRadius: normalize(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    color: palette.primary,
  },

  filterPillActive: {
    backgroundColor: palette.primary,
  },

  filterTextActive: {
    color: palette.white,
  },

  card: {
    backgroundColor: palette.white,
    marginHorizontal: wp(4),
    marginTop: hp(1.5),
    padding: wp(4),
    borderRadius: normalize(20),
    borderWidth: 1,
    borderColor: palette.border,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
  },

  distanceChip: {
    backgroundColor: palette.radish,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.1),
    borderRadius: normalize(8),
  },

  infoRow: {
    flexDirection: 'row',
    gap: wp(2.5),
    marginVertical: hp(1),
  },

  infoCard: {
    flex: 1,
    backgroundColor: palette.radish,
    padding: wp(2.5),
    gap: hp(0.8),
    borderRadius: normalize(14),
  },

  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(0.6),
  },

  section: {
    marginTop: hp(1),
  },

  sectionTitle: {
    marginBottom: hp(1),
  },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFB',
    padding: wp(2.5),
    borderRadius: normalize(14),
    marginBottom: hp(1),
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F1F4',
    borderRadius: normalize(20),
    paddingHorizontal: wp(1.5),
  },

  stepBtn: {
    padding: normalize(6),
  },

  qtyPill: {
    backgroundColor: palette.white,
    borderRadius: normalize(12),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    marginHorizontal: wp(1),
  },

  ctaRow: {
    flexDirection: 'row',
    gap: wp(2.5),
    marginTop: hp(1.5),
  },

  flexBtn: {
    flex: 1,
    backgroundColor: palette.middlegreen,
  },

  skeletonWrap: {
    paddingBottom: hp(4),
    gap: hp(1.2),
  },
  skeletonCenter: {
    alignSelf: 'center',
  },
  skeletonActiveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(4),
  },
  skeletonFilterRow: {
    flexDirection: 'row',
    gap: wp(2.5),
    paddingHorizontal: wp(4),
  },
  skeletonCard: {
    alignSelf: 'center',
  },

});