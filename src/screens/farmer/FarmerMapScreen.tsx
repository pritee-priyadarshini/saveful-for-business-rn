import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
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
import {
  ClaimConfirmModal,
  type ClaimLineItem,
} from '../../components/ClaimConfirmModal';
import type { ClaimMode } from '../../services/claims.service';
import { palette } from '../../theme/colors';
import { useAppContext } from '../../store/AppContext';
import { useDiscoverStore } from '../../store/discoverStore';
import { showErrorAlert, showInfoAlert, showSuccessAlert } from '@/utils/apiError';
import {
  isFoodListingNotification,
  subscribeNotificationReceived,
} from '@/services/pushNotifications';
import {
  fetchListingDetail,
  mapDiscoverListing,
  type FoodItem,
  invalidateListingDetail,
  clearListingDetailCache,
} from '../../services/foodListing.service';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

type DiscoverListing = ReturnType<typeof mapDiscoverListing>;
type ClaimState = Record<string, number>;

type ClaimFoodItem = {
  foodItemId: number;
  name: string;
  quantityKg: number;
};

type PendingClaim = {
  listing: DiscoverListing;
  claimMode: ClaimMode;
  items: ClaimLineItem[];
};

const QTY_STEP = 0.5;

function roundKg(value: number) {
  return Math.round(value * 2) / 2;
}

function formatKg(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function toClaimFoodItems(
  listing: DiscoverListing,
  detail?: { foodItems?: FoodItem[] },
): ClaimFoodItem[] {
  const source: FoodItem[] = detail?.foodItems?.length
    ? detail.foodItems
    : (listing.foodItems as FoodItem[])?.length
      ? (listing.foodItems as FoodItem[])
      : [];

  if (!source.length) return [];

  return source
    .map((foodItem, index) => {
      const foodItemId = Number(foodItem.id);
      return {
        foodItemId,
        name: foodItem.name || foodItem.category || `Item ${index + 1}`,
        quantityKg: foodItem.remainingQtyKg ?? foodItem.totalQtyKg ?? 0,
      };
    })
    .filter(
      (foodItem) =>
        foodItem.quantityKg > 0 && Number.isFinite(foodItem.foodItemId) && foodItem.foodItemId > 0,
    );
}

async function loadListingFoodItems(
  listing: DiscoverListing,
  options?: { refresh?: boolean },
): Promise<ClaimFoodItem[]> {
  const detail = await fetchListingDetail(listing.listingId, options);
  return toClaimFoodItems(listing, detail);
}

export function FarmerMapScreen({ navigation }: any) {
  const { authUser } = useAppContext();
  const {
    animal: { listings, isFetching: loading },
    fetchListings: storeFetchListings,
  } = useDiscoverStore();

  const [claimState, setClaimState] = useState<ClaimState>({});
  const [foodItemsByListing, setFoodItemsByListing] = useState<Record<string, ClaimFoodItem[]>>({});
  const [loadingFoodItems, setLoadingFoodItems] = useState<Record<string, boolean>>({});
  const [activeFilter, setActiveFilter] = useState<'distance' | 'surplus' | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingClaim, setPendingClaim] = useState<PendingClaim | null>(null);
  const pendingClaimRef = useRef<PendingClaim | null>(null);
  const fetchedListingIds = useRef(new Set<string>());
  const listingSnapshotRef = useRef<Record<string, string>>({});

  useEffect(() => {
    pendingClaimRef.current = pendingClaim;
  }, [pendingClaim]);

  const applyFoodItems = useCallback((listingId: string, items: ClaimFoodItem[]) => {
    setFoodItemsByListing((prev) => ({ ...prev, [listingId]: items }));
  }, []);

  const refreshListingFoodItems = useCallback(
    async (listing: DiscoverListing, options?: { refresh?: boolean }) => {
      setLoadingFoodItems((prev) => ({ ...prev, [listing.id]: true }));

      try {
        const items = await loadListingFoodItems(listing, options);
        applyFoodItems(listing.id, items);
      } catch {
        applyFoodItems(listing.id, toClaimFoodItems(listing));
      } finally {
        setLoadingFoodItems((prev) => {
          const next = { ...prev };
          delete next[listing.id];
          return next;
        });
      }
    },
    [applyFoodItems],
  );

  useEffect(() => {
    if (!authUser?.accessToken) return;
    storeFetchListings('animal').catch((e) =>
      showErrorAlert(e, 'Could not load listings', 'Could not load listings'),
    );
  }, [authUser?.accessToken]);

  useEffect(() => {
    listings.forEach((listing) => {
      const snapshot = `${listing.remainingQtyKg ?? listing.quantityKg}:${listing.statusRaw}`;
      const snapshotChanged = listingSnapshotRef.current[listing.id] !== snapshot;
      listingSnapshotRef.current[listing.id] = snapshot;

      const seeded = toClaimFoodItems(listing);
      if (seeded.length) {
        applyFoodItems(listing.id, seeded);
      }

      const needsFetch = !fetchedListingIds.current.has(listing.id) || snapshotChanged;
      if (!needsFetch) return;

      fetchedListingIds.current.add(listing.id);

      if (snapshotChanged) {
        invalidateListingDetail(listing.listingId);
      }

      refreshListingFoodItems(listing, { refresh: snapshotChanged });
    });
  }, [listings, applyFoodItems, refreshListingFoodItems]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      fetchedListingIds.current.clear();
      listingSnapshotRef.current = {};
      clearListingDetailCache();
      setFoodItemsByListing({});
      setClaimState({});
      await storeFetchListings('animal', true);
    } catch (e) {
      showErrorAlert(e, 'Could not load listings', 'Could not load listings');
    } finally {
      setRefreshing(false);
    }
  }, [storeFetchListings]);

  const reloadFromNotification = useCallback(() => {
    void handleRefresh();
  }, [handleRefresh]);

  useEffect(() => {
    return subscribeNotificationReceived((payload) => {
      if (isFoodListingNotification(payload)) {
        reloadFromNotification();
      }
    });
  }, [reloadFromNotification]);

  const getKey = (listingId: string, foodItemId: number) => `${listingId}-${foodItemId}`;

  const updateQty = (
    listingId: string,
    foodItemId: number,
    maxQty: number,
    delta: number,
  ) => {
    const key = getKey(listingId, foodItemId);

    setClaimState((prev) => {
      const current = prev[key] || 0;
      let next = roundKg(current + delta);
      if (next < 0) next = 0;
      if (next > maxQty) next = roundKg(maxQty);
      return { ...prev, [key]: next };
    });
  };

  const getTotalSelected = (listingId: string) =>
    roundKg(
      Object.entries(claimState)
        .filter(([key]) => key.startsWith(`${listingId}-`))
        .reduce((sum, [, qty]) => sum + qty, 0),
    );

  const buildPartialClaimItems = useCallback(
    (listing: DiscoverListing, claimItems: ClaimFoodItem[]): ClaimLineItem[] =>
      claimItems
        .map((item) => {
          const qty = claimState[getKey(listing.id, item.foodItemId)] || 0;
          if (qty <= 0) return null;
          return {
            foodItemId: item.foodItemId,
            name: item.name,
            qtyKg: roundKg(qty),
          };
        })
        .filter((item): item is ClaimLineItem => item !== null),
    [claimState],
  );

  const openPartialClaim = useCallback(
    (listing: DiscoverListing, claimItems: ClaimFoodItem[]) => {
      const items = buildPartialClaimItems(listing, claimItems);
      if (!items.length) {
        showInfoAlert(
          'Use the + / − buttons to choose how much of each food item you want to claim.',
          'Select quantities',
        );
        return;
      }

      setPendingClaim({
        listing,
        claimMode: 'PARTIAL',
        items,
      });
    },
    [buildPartialClaimItems],
  );

  const openFullClaim = useCallback(
    (listing: DiscoverListing, claimItems: ClaimFoodItem[]) => {
      if (!claimItems.length) {
        showInfoAlert(
          'Food items are still loading. Please wait a moment and try again.',
          'Items not ready',
        );
        return;
      }

      setPendingClaim({
        listing,
        claimMode: 'FULL',
        items: claimItems.map((item) => ({
          foodItemId: item.foodItemId,
          name: item.name,
          qtyKg: item.quantityKg,
        })),
      });
    },
    [],
  );

  const handleClaimSuccess = useCallback(
    async (listingId: string) => {
      const claimedListing = pendingClaimRef.current?.listing;

      setClaimState((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((key) => {
          if (key.startsWith(`${listingId}-`)) delete next[key];
        });
        return next;
      });

      fetchedListingIds.current.delete(listingId);
      delete listingSnapshotRef.current[listingId];
      setFoodItemsByListing((prev) => {
        const next = { ...prev };
        delete next[listingId];
        return next;
      });

      if (claimedListing) {
        invalidateListingDetail(claimedListing.listingId);
      }

      try {
        await storeFetchListings('animal', true);

        if (claimedListing) {
          await refreshListingFoodItems(claimedListing, { refresh: true });
          fetchedListingIds.current.add(listingId);
        }
      } catch (e) {
        showErrorAlert(e, 'Claim submitted', 'Could not refresh listings');
      }

      showSuccessAlert(
        'The restaurant will review and confirm your claim soon.',
        'Claim submitted',
      );
    },
    [storeFetchListings, refreshListingFoodItems],
  );

  const sortedListings = useMemo(() => {
    let data = [...listings];

    if (activeFilter === 'distance') {
      data.sort(
        (a, b) =>
          parseFloat(String(a.distance || '0')) - parseFloat(String(b.distance || '0')),
      );
    }

    if (activeFilter === 'surplus') {
      data.sort((a, b) => (b.quantityKg || 0) - (a.quantityKg || 0));
    }

    return data;
  }, [listings, activeFilter]);

  const ListHeader = () => (
    <View style={styles.headerWrapper}>
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
        <AppText variant="bodyBold" style={styles.pickupBtnText}>
          View Your Pickups
        </AppText>
      </Pressable>

      <View style={styles.activeRow}>
        <AppText variant="h7">Active Listings</AppText>

        <View style={styles.activeBadge}>
          <AppText variant="h7" color="white">
            {listings.length}
          </AppText>
        </View>
      </View>

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
          <AppText
            variant="caption"
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
          <AppText
            variant="caption"
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

  const renderItemRow = (
    listing: DiscoverListing,
    item: ClaimFoodItem,
  ) => {
    const key = getKey(listing.id, item.foodItemId);
    const qty = claimState[key] || 0;

    return (
      <View key={item.foodItemId} style={styles.itemCard}>
        <View style={{ flex: 1 }}>
          <AppText variant="label">{item.name}</AppText>
          <AppText variant="bodySmall">
            Available: {formatKg(item.quantityKg)} kg
          </AppText>
        </View>

        <View style={styles.stepper}>
          <TouchableOpacity
            onPress={() =>
              updateQty(listing.id, item.foodItemId, item.quantityKg, -QTY_STEP)
            }
            style={styles.stepBtn}
          >
            <AppText variant="label">−</AppText>
          </TouchableOpacity>

          <View style={styles.qtyPill}>
            <AppText variant="label">{formatKg(qty)}</AppText>
          </View>

          <TouchableOpacity
            onPress={() =>
              updateQty(listing.id, item.foodItemId, item.quantityKg, QTY_STEP)
            }
            style={styles.stepBtn}
          >
            <AppText variant="label">＋</AppText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderListing = ({ item }: { item: DiscoverListing }) => {
    const claimItems = foodItemsByListing[item.id] ?? [];
    const isLoadingItems = loadingFoodItems[item.id];
    const totalSelected = getTotalSelected(item.id);
    const hasSelection = totalSelected > 0;

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="bodyBold">{item.title || item.businessName}</AppText>
            <AppText variant="bodySmall">
              {item.businessName} · {item.pickupAddress}
            </AppText>
          </View>

          <View style={styles.distanceChip}>
            <AppText variant="bodySmall">📍 {item.distance}</AppText>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <AppText variant="label">Quantity</AppText>
            <AppText variant="bodySmall">{formatKg(item.quantityKg)} kg</AppText>
          </View>

          <View style={styles.infoCard}>
            <AppText variant="label">Pickup Date</AppText>
            <AppText variant="bodySmall">{item.bestBeforeLabel}</AppText>
          </View>

          <View style={styles.infoCard}>
            <AppText variant="label">Pickup Time</AppText>
            <AppText variant="bodySmall">{item.pickupWindow}</AppText>
          </View>
        </View>

        <View style={styles.storageRow}>
          <AppText variant="label">Storage:</AppText>
          <AppText variant="bodySmall"> {item.storage}</AppText>
        </View>

        <View style={styles.section}>
          <AppText variant="label" style={styles.sectionTitle}>
            Select quantity
          </AppText>
          {isLoadingItems ? (
            <AppText variant="bodySmall" style={styles.loadingItemsText}>
              Loading food items…
            </AppText>
          ) : claimItems.length === 0 ? (
            <AppText variant="bodySmall" style={styles.loadingItemsText}>
              No items available to claim
            </AppText>
          ) : (
            claimItems.map((foodItem) => renderItemRow(item, foodItem))
          )}
        </View>

        <View style={styles.ctaRow}>
          <Button
            label={`Claim ${formatKg(totalSelected)} kg`}
            disabled={!hasSelection || isLoadingItems}
            style={styles.flexBtn}
            onPress={() => openPartialClaim(item, claimItems)}
          />

          <Button
            label="Claim All"
            variant="primary"
            disabled={isLoadingItems || claimItems.length === 0}
            style={styles.flexBtn}
            onPress={() => openFullClaim(item, claimItems)}
          />
        </View>
      </View>
    );
  };

  if (loading && !refreshing && listings.length === 0) {
    return (
      <Screen backgroundColor={palette.creme} scrollable={false}>
        <View style={styles.skeletonWrap}>
          <Skeleton width="100%" height={hp(20)} borderRadius={0} />
          <Skeleton
            width={wp(70)}
            height={normalize(44)}
            borderRadius={normalize(14)}
            style={styles.skeletonCenter}
          />
          <View style={styles.skeletonActiveRow}>
            <Skeleton width={wp(35)} height={normalize(18)} />
            <Skeleton width={wp(16)} height={hp(4.2)} borderRadius={normalize(12)} />
          </View>
          <View style={styles.skeletonFilterRow}>
            <Skeleton width={wp(42)} height={normalize(36)} borderRadius={normalize(20)} />
            <Skeleton width={wp(42)} height={normalize(36)} borderRadius={normalize(20)} />
          </View>
          {[1, 2].map((i) => (
            <Skeleton
              key={i}
              width={wp(92)}
              height={normalize(280)}
              borderRadius={normalize(20)}
              style={styles.skeletonCard}
            />
          ))}
        </View>

        <ClaimConfirmModal
          visible={!!pendingClaim}
          listing={pendingClaim?.listing ?? null}
          claimMode={pendingClaim?.claimMode ?? 'PARTIAL'}
          items={pendingClaim?.items ?? []}
          onClose={() => setPendingClaim(null)}
          onSuccess={() => {
            const claim = pendingClaimRef.current;
            if (claim) handleClaimSuccess(claim.listing.id);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={palette.creme} scrollable={false}>
      <ClaimConfirmModal
        visible={!!pendingClaim}
        listing={pendingClaim?.listing ?? null}
        claimMode={pendingClaim?.claimMode ?? 'PARTIAL'}
        items={pendingClaim?.items ?? []}
        onClose={() => setPendingClaim(null)}
        onSuccess={() => {
          const claim = pendingClaimRef.current;
          if (claim) handleClaimSuccess(claim.listing.id);
        }}
      />

      <FlatList
        data={sortedListings}
        keyExtractor={(item) => item.id}
        renderItem={renderListing}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[
          styles.container,
          sortedListings.length === 0 && { flex: 1 },
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
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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

  loadingItemsText: {
    color: '#888',
    marginBottom: hp(0.5),
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
