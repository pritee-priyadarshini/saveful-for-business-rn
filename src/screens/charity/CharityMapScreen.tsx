import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { HeroHeader } from '../../components/HeroHeader';
import { Skeleton } from '../../components/Skeleton';
import { DiscoverListingDetailModal } from '../../components/DiscoverListingDetailModal';
import {
  ClaimConfirmModal,
  type ClaimLineItem,
} from '../../components/ClaimConfirmModal';
import type { ClaimMode } from '../../services/claims.service';
import { palette } from '../../theme/colors';
import { useAppContext } from '../../store/AppContext';
import { useDiscoverStore } from '../../store/discoverStore';
import { showErrorAlert } from '@/utils/apiError';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import {
  isFoodListingNotification,
  subscribeNotificationReceived,
} from '@/services/pushNotifications';
import { fetchListingDetail, mapDiscoverListing, type FoodItem, invalidateListingDetail, clearListingDetailCache } from '../../services/foodListing.service';
import {
  haversineDistanceKm,
  normalizeAuthProfile,
  parseDistanceKm,
  resolveProfileCoordinates,
} from '@/utils/coordinates';
import { hp, normalize, wp } from '@/utils/responsive';

type DiscoverListing = ReturnType<typeof mapDiscoverListing>;
type ClaimState = Record<string, number>;
type QuantityOrder = 'asc' | 'desc';

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

function getAvailableKg(listing: DiscoverListing, claimItems: ClaimFoodItem[]) {
  if (claimItems.length) {
    return roundKg(claimItems.reduce((sum, item) => sum + item.quantityKg, 0));
  }
  return roundKg(listing.remainingQtyKg ?? listing.quantityKg);
}

async function loadListingFoodItems(
  listing: DiscoverListing,
  options?: { refresh?: boolean },
): Promise<ClaimFoodItem[]> {
  const detail = await fetchListingDetail(listing.listingId, options);
  return toClaimFoodItems(listing, detail);
}

export function CharityMapScreen({ navigation }: any) {
  useTransparentStatusBar('light');
  const { authUser } = useAppContext();
  const {
    people: { listings, isFetching: loading },
    fetchListings: storeFetchListings,
  } = useDiscoverStore();

  const [claimState, setClaimState] = useState<ClaimState>({});
  const [foodItemsByListing, setFoodItemsByListing] = useState<Record<string, ClaimFoodItem[]>>({});
  const [loadingFoodItems, setLoadingFoodItems] = useState<Record<string, boolean>>({});
  const [sortByDistance, setSortByDistance] = useState(true);
  const [sortByQuantity, setSortByQuantity] = useState(true);
  const [quantityOrder, setQuantityOrder] = useState<QuantityOrder>('desc');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedListing, setSelectedListing] = useState<DiscoverListing | null>(null);
  const [expandedClaimSections, setExpandedClaimSections] = useState<Record<string, boolean>>({});
  const [activeClaimItemByListing, setActiveClaimItemByListing] = useState<
    Record<string, number | null>
  >({});
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
    storeFetchListings('people').catch((e) =>
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
      await storeFetchListings('people', true);
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
        Alert.alert(
          'Select quantities',
          'Use the + / − buttons to choose how much of each food item you want to claim.',
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
        Alert.alert(
          'Items not ready',
          'Food items are still loading. Please wait a moment and try again.',
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
        await storeFetchListings('people', true);

        if (claimedListing) {
          await refreshListingFoodItems(claimedListing, { refresh: true });
          fetchedListingIds.current.add(listingId);
        }
      } catch (e) {
        showErrorAlert(e, 'Claim submitted', 'Could not refresh listings');
      }

      Alert.alert(
        'Claim submitted',
        'The restaurant will review and confirm your claim soon.',
      );
    },
    [storeFetchListings, refreshListingFoodItems],
  );

  const charityCoords = useMemo(() => {
    const profile = normalizeAuthProfile(authUser);
    return resolveProfileCoordinates(profile);
  }, [authUser]);

  const getListingDistanceKm = useCallback(
    (listing: DiscoverListing) => {
      if (charityCoords) {
        return haversineDistanceKm(
          charityCoords.lat,
          charityCoords.lng,
          listing.lat,
          listing.lng,
        );
      }

      return parseDistanceKm(listing.distance) ?? Number.MAX_SAFE_INTEGER;
    },
    [charityCoords],
  );

  const sortedListings = useMemo(() => {
    const seen = new Set<string>();
    const unique = listings.filter((listing) => {
      if (seen.has(listing.id)) return false;
      seen.add(listing.id);
      return true;
    });

    const data = [...unique];

    data.sort((a, b) => {
      if (sortByDistance) {
        const distanceDiff = getListingDistanceKm(a) - getListingDistanceKm(b);
        if (distanceDiff !== 0) return distanceDiff;
      }

      if (sortByQuantity) {
        const quantityDiff = (a.quantityKg || 0) - (b.quantityKg || 0);
        return quantityOrder === 'asc' ? quantityDiff : -quantityDiff;
      }

      return 0;
    });

    return data;
  }, [listings, sortByDistance, sortByQuantity, quantityOrder, getListingDistanceKm]);

  const handleDistanceSortPress = () => {
    if (sortByDistance && !sortByQuantity) return;
    setSortByDistance((value) => !value);
  };

  const handleQuantitySortPress = () => {
    if (!sortByQuantity) {
      setSortByQuantity(true);
      setQuantityOrder('desc');
      return;
    }

    if (quantityOrder === 'desc') {
      setQuantityOrder('asc');
      return;
    }

    if (sortByDistance) {
      setSortByQuantity(false);
      setQuantityOrder('desc');
    } else {
      setQuantityOrder('desc');
    }
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={hp(14)} borderRadius={0} />
      <Skeleton width={wp(90)} height={normalize(40)} style={styles.skeletonCenter} />
      {[1, 2].map((i) => (
        <Skeleton
          key={i}
          width={wp(92)}
          height={normalize(220)}
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

  const toggleClaimSection = (listingId: string) => {
    setExpandedClaimSections((prev) => ({ ...prev, [listingId]: !prev[listingId] }));
  };

  const toggleActiveClaimItem = (listingId: string, foodItemId: number) => {
    setActiveClaimItemByListing((prev) => ({
      ...prev,
      [listingId]: prev[listingId] === foodItemId ? null : foodItemId,
    }));
  };

  const getSelectedSummary = (listingId: string, claimItems: ClaimFoodItem[]) => {
    const selectedCount = claimItems.filter(
      (item) => (claimState[getKey(listingId, item.foodItemId)] || 0) > 0,
    ).length;
    const totalSelected = getTotalSelected(listingId);
    return { selectedCount, totalSelected };
  };

  const renderQtyStepper = (
    listing: DiscoverListing,
    item: ClaimFoodItem,
    compact = false,
  ) => {
    const key = getKey(listing.id, item.foodItemId);
    const qty = claimState[key] || 0;

    return (
      <View style={[styles.stepper, compact && styles.stepperCompact]}>
        <Pressable
          onPress={() => updateQty(listing.id, item.foodItemId, item.quantityKg, -QTY_STEP)}
          style={styles.stepBtn}
          hitSlop={6}
        >
          <Ionicons name="remove" size={normalize(22)} color={palette.middlegreen} />
        </Pressable>

        <View style={styles.qtyPill}>
          <AppText variant="bodyBold" style={styles.qtyText} numberOfLines={1}>
            {formatKg(qty)}
          </AppText>
          <AppText variant="caption" style={styles.qtyUnit}>
            kg
          </AppText>
        </View>

        <Pressable
          onPress={() => updateQty(listing.id, item.foodItemId, item.quantityKg, QTY_STEP)}
          style={styles.stepBtn}
          hitSlop={6}
        >
          <Ionicons name="add" size={normalize(22)} color={palette.middlegreen} />
        </Pressable>
      </View>
    );
  };

  const renderClaimPanel = (listing: DiscoverListing, claimItems: ClaimFoodItem[]) => {
    const isLoadingItems = loadingFoodItems[listing.id];
    const isExpanded =
      expandedClaimSections[listing.id] ?? claimItems.length <= 2;
    const activeItemId = activeClaimItemByListing[listing.id];
    const { selectedCount, totalSelected } = getSelectedSummary(listing.id, claimItems);

    if (isLoadingItems) {
      return (
        <AppText variant="bodySmall" style={styles.loadingItemsText}>
          Loading food items…
        </AppText>
      );
    }

    if (claimItems.length === 0) {
      return (
        <AppText variant="bodySmall" style={styles.loadingItemsText}>
          No items available to claim
        </AppText>
      );
    }

    if (claimItems.length === 1) {
      const onlyItem = claimItems[0];
      return (
        <View style={styles.singleItemPanel}>
          <View style={styles.itemHeaderRow}>
            <AppText variant="label" style={styles.itemName} numberOfLines={2}>
              {onlyItem.name}
            </AppText>
            <AppText variant="caption" style={styles.itemAvail}>
              {formatKg(onlyItem.quantityKg)} kg avail.
            </AppText>
          </View>
          {renderQtyStepper(listing, onlyItem)}
        </View>
      );
    }

    return (
      <View style={styles.claimPanel}>
        <Pressable style={styles.claimToggle} onPress={() => toggleClaimSection(listing.id)}>
          <View style={styles.claimToggleLeft}>
            <Ionicons
              name="restaurant-outline"
              size={normalize(18)}
              color={palette.middlegreen}
            />
            <View style={styles.claimToggleTextWrap}>
              <AppText variant="label">
                {claimItems.length} food items
              </AppText>
              <AppText variant="caption" style={styles.claimToggleSub}>
                {selectedCount > 0
                  ? `${selectedCount} selected · ${formatKg(totalSelected)} kg`
                  : 'Tap to choose quantities'}
              </AppText>
            </View>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={normalize(20)}
            color="#666"
          />
        </Pressable>

        {isExpanded && (
          <View style={styles.claimItemList}>
            {claimItems.map((claimItem) => {
              const itemQty = claimState[getKey(listing.id, claimItem.foodItemId)] || 0;
              const isActive = activeItemId === claimItem.foodItemId;

              return (
                <View key={claimItem.foodItemId} style={styles.claimItemBlock}>
                  <Pressable
                    style={[styles.claimItemRow, isActive && styles.claimItemRowActive]}
                    onPress={() => toggleActiveClaimItem(listing.id, claimItem.foodItemId)}
                  >
                    <View style={styles.claimItemMeta}>
                      <AppText variant="label" numberOfLines={1} style={styles.itemName}>
                        {claimItem.name}
                      </AppText>
                      <AppText variant="caption" style={styles.itemAvail}>
                        {formatKg(claimItem.quantityKg)} kg avail.
                        {itemQty > 0 ? ` · ${formatKg(itemQty)} kg picked` : ''}
                      </AppText>
                    </View>
                    <Ionicons
                      name={isActive ? 'chevron-up' : 'chevron-down'}
                      size={normalize(18)}
                      color="#888"
                    />
                  </Pressable>

                  {isActive && renderQtyStepper(listing, claimItem, true)}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderListing = ({ item }: { item: DiscoverListing }) => {
    const claimItems = foodItemsByListing[item.id] ?? [];
    const isLoadingItems = loadingFoodItems[item.id];
    const totalSelected = getTotalSelected(item.id);
    const hasSelection = totalSelected > 0;
    const availableKg = getAvailableKg(item, claimItems);

    return (
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
            <AppText variant="bodyBold">{formatKg(availableKg)} kg</AppText>
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

        <View style={styles.storageRow}>
          <Ionicons name="thermometer-outline" size={normalize(14)} color="#666" />
          <AppText variant="caption" style={styles.storageText}>
            {item.storage}
          </AppText>
          <Pressable onPress={() => setSelectedListing(item)} hitSlop={8}>
            <AppText variant="caption" style={styles.detailsLink}>
              View details
            </AppText>
          </Pressable>
        </View>

        <View style={styles.section}>
          <AppText variant="label" style={styles.sectionTitle}>
            Select quantity per item
          </AppText>
          {renderClaimPanel(item, claimItems)}
        </View>

        <View style={styles.ctaRow}>
          <Button
            label={`Claim ${formatKg(totalSelected)} kg`}
            size="compact"
            disabled={!hasSelection || isLoadingItems}
            style={styles.flexBtn}
            onPress={() => openPartialClaim(item, claimItems)}
          />

          <Button
            label="Claim All"
            size="compact"
            disabled={isLoadingItems || claimItems.length === 0}
            style={styles.flexBtn}
            onPress={() => openFullClaim(item, claimItems)}
          />
        </View>
      </View>
    );
  };

  const ListHeader = () => (
    <View>
      <HeroHeader
        source={require('../../../assets/placeholder/kale-header.png')}
        height={hp(14)}
      >
        <View style={styles.heroContent}>
          <AppText variant="h5" style={styles.whiteText}>
            Surplus Available
          </AppText>
          <AppText variant="body" style={styles.heroSubtext}>
            Browse and claim food near your charity
          </AppText>
        </View>
      </HeroHeader>

      <Pressable style={styles.pickupBtn} onPress={() => navigation.navigate('CharityPickup')}>
        <Ionicons name="car-outline" size={normalize(18)} color={palette.white} />
        <AppText variant="label" style={styles.pickupBtnText}>
          View Your Pickups
        </AppText>
      </Pressable>

      <View style={styles.activeRow}>
        <AppText variant="h7">Active Listings</AppText>
        <View style={styles.activeBadge}>
          <AppText variant="h7" style={{ color: palette.white }}>
            {listings.length}
          </AppText>
        </View>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterPill, sortByDistance && styles.filterPillActive]}
          onPress={handleDistanceSortPress}
        >
          <AppText
            variant="caption"
            style={sortByDistance ? styles.filterTextActive : styles.filterText}
          >
            Sort by Distance
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, sortByQuantity && styles.filterPillActive]}
          onPress={handleQuantitySortPress}
        >
          <AppText
            variant="caption"
            style={sortByQuantity ? styles.filterTextActive : styles.filterText}
          >
            {sortByQuantity
              ? `By Quantity ${quantityOrder === 'desc' ? '↓' : '↑'}`
              : 'By Quantity'}
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <DiscoverListingDetailModal
        visible={!!selectedListing}
        listing={selectedListing}
        onClose={() => setSelectedListing(null)}
      />

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
        style={styles.list}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[
          styles.container,
          sortedListings.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <AppText variant="h7">No surplus available</AppText>
            <AppText variant="bodySmall">Check again later for new listings near you</AppText>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[palette.primary]} tintColor={palette.primary} />}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: palette.creme,
  },

  container: {
    paddingBottom: hp(4),
  },

  emptyList: {
    flexGrow: 1,
  },

  heroContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    gap: hp(0.5),
  },

  whiteText: {
    color: palette.white,
    textAlign: 'center',
  },

  heroSubtext: {
    color: palette.white,
    opacity: 0.92,
    textAlign: 'center',
    fontSize: normalize(16),
    lineHeight: normalize(22),
  },

  pickupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    marginHorizontal: wp(4),
    marginTop: hp(2),
    backgroundColor: palette.middlegreen,
    paddingVertical: hp(1.2),
    borderRadius: normalize(12),
  },

  pickupBtnText: {
    color: palette.white,
  },

  activeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp(2),
    marginHorizontal: wp(4),
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

  filterRow: {
    flexDirection: 'row',
    gap: wp(2),
    marginTop: hp(1.5),
    marginHorizontal: wp(4),
    marginBottom: hp(0.5),
  },

  filterPill: {
    flex: 1,
    backgroundColor: palette.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
    paddingVertical: hp(1),
    borderRadius: normalize(20),
    alignItems: 'center',
  },

  filterText: {
    color: palette.black,
  },

  filterPillActive: {
    backgroundColor: palette.middlegreen,
    borderColor: palette.middlegreen,
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

  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    marginTop: hp(1.2),
    paddingTop: hp(1),
    borderTopWidth: 1,
    borderTopColor: '#F3F3F3',
  },

  storageText: {
    color: '#666',
    flex: 1,
  },

  detailsLink: {
    color: palette.middlegreen,
    fontWeight: '600',
  },

  section: {
    marginTop: hp(1.2),
  },

  sectionTitle: {
    marginBottom: hp(0.8),
  },

  loadingItemsText: {
    color: '#888',
    marginBottom: hp(0.5),
  },

  claimPanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
    borderRadius: normalize(14),
    overflow: 'hidden',
    backgroundColor: palette.creme,
  },

  claimToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
    gap: wp(2),
  },

  claimToggleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
  },

  claimToggleTextWrap: {
    flex: 1,
    gap: hp(0.2),
  },

  claimToggleSub: {
    color: '#666',
  },

  claimItemList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D9D9D9',
  },

  claimItemBlock: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D9D9D9',
  },

  claimItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    gap: wp(2),
    backgroundColor: palette.creme,
  },

  claimItemRowActive: {
    backgroundColor: '#F3FAF5',
  },

  claimItemMeta: {
    flex: 1,
    gap: hp(0.2),
  },

  singleItemPanel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
    borderRadius: normalize(14),
    backgroundColor: palette.creme,
    padding: wp(3),
    gap: hp(1),
  },

  itemHeaderRow: {
    gap: hp(0.3),
  },

  itemName: {
    flexShrink: 1,
  },

  itemAvail: {
    color: '#666',
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F1F4',
    borderRadius: normalize(16),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.6),
    gap: wp(2),
  },

  stepperCompact: {
    marginHorizontal: wp(3),
    marginBottom: hp(1),
  },

  stepBtn: {
    width: normalize(44),
    height: normalize(44),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: normalize(22),
    backgroundColor: palette.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
  },

  qtyPill: {
    flex: 1,
    minWidth: wp(24),
    backgroundColor: palette.white,
    borderRadius: normalize(12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    alignItems: 'center',
    justifyContent: 'center',
  },

  qtyText: {
    fontSize: normalize(18),
    lineHeight: normalize(22),
  },

  qtyUnit: {
    color: '#666',
    marginTop: hp(0.1),
  },

  ctaRow: {
    flexDirection: 'row',
    gap: wp(2),
    marginTop: hp(1.2),
  },

  flexBtn: {
    flex: 1,
    backgroundColor: palette.middlegreen,
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(8),
    paddingTop: hp(6),
    gap: hp(0.8),
  },

  skeletonWrap: {
    gap: hp(1.6),
  },

  skeletonCenter: {
    alignSelf: 'center',
    marginTop: hp(1),
  },

  skeletonCard: {
    alignSelf: 'center',
  },
});
