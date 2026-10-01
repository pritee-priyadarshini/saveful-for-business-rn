import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import { ListingPhotoGallery } from '@/components/ListingPhotoGallery';
import { Screen } from '@/components/Screen';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { fetchListingDetail, type FoodItem, type ListingDetail } from '@/services/foodListing.service';
import { useListingsStore } from '@/store/listingsStore';
import { palette } from '@/theme/colors';
import { showErrorAlert } from '@/utils/apiError';
import { formatListingDateTime, formatListingPickupWindow } from '@/utils/dateFormat';
import { resolveFoodIconFromLabel } from '@/utils/foodListing';
import { hp, normalize, wp } from '@/utils/responsive';

type StorageChip = { label: string; icon: any };

const STORAGE: Array<StorageChip & { on: (listing: ListingDetail) => boolean }> = [
  {
    label: 'Fridge',
    icon: require('../../../assets/placeholder/fridge_icon.png'),
    on: (listing) => Boolean(listing.needsRefrigeration),
  },
  {
    label: 'Freezer',
    icon: require('../../../assets/placeholder/freezer_icon.png'),
    on: (listing) => Boolean(listing.needsFreezer),
  },
  {
    label: 'Ambient',
    icon: require('../../../assets/placeholder/ambient_temp_icon.png'),
    on: (listing) => Boolean(listing.needsAmbient),
  },
  {
    label: 'Hot',
    icon: require('../../../assets/placeholder/heating_icon.png'),
    on: (listing) => Boolean(listing.needsHot),
  },
];

function formatKg(value: number) {
  if (!Number.isFinite(value)) return '0';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function itemKg(item: FoodItem) {
  return Number(item.totalQtyKg ?? item.remainingQtyKg ?? 0);
}

export function ReservedListingScreen({ route }: any) {
  useTransparentStatusBar('light');
  const listingId = Number(route?.params?.listingId);
  const charityName = String(route?.params?.charityName || '').trim();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!Number.isFinite(listingId) || listingId <= 0) {
      setListing(null);
      setLoading(false);
      return;
    }
    try {
      setListing(await fetchListingDetail(listingId, { refresh: true }));
    } catch {
      const store = useListingsStore.getState();
      await Promise.all([
        store.fetchSiteListings(true).catch(() => undefined),
        store.fetchOrgListings(true).catch(() => undefined),
      ]);
      const next = useListingsStore.getState();
      const found =
        [...next.siteListings, ...next.orgListings].find((row) => Number(row.id) === listingId) ||
        null;
      setListing(found);
      if (!found) {
        showErrorAlert(
          null,
          'Could not load this listing',
          'This listing could not be opened.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const items = (listing?.foodItems || []).filter((item) => itemKg(item) > 0);
  const totalKg = items.reduce((sum, item) => sum + itemKg(item), 0);
  const storage = listing ? STORAGE.filter((option) => option.on(listing)) : [];
  const allergens = listing?.allergens?.filter(Boolean) ?? [];
  const windowLabel = formatListingPickupWindow(listing?.pickupFromTime, listing?.pickupByTime);
  const address = listing?.pickupAddress || listing?.address || '';

  return (
    <Screen scrollable backgroundColor={palette.creme} contentStyle={styles.screen} transparentTop>
      <StackHeroHeader
        title={charityName || 'Today’s listing'}
        subtitle={loading ? 'Loading listing' : listing ? windowLabel : 'Listing unavailable'}
        height={hp(14)}
      />

      <View style={styles.body}>
        {loading && !listing ? (
          <ActivityIndicator color={palette.kale} style={{ marginTop: hp(4) }} />
        ) : !listing ? (
          <View style={styles.card}>
            <AppText variant="bodySmall" color={palette.stone}>
              This listing could not be opened.
            </AppText>
          </View>
        ) : (
          <>
            <AppText variant="bodySmall" color={palette.stone}>
              {charityName
                ? `Reserved for ${charityName}. They can collect during this window.`
                : 'Reserved for your connected charity.'}
            </AppText>

            {listing.photoUrls?.length ? (
              <ListingPhotoGallery photos={listing.photoUrls} />
            ) : null}

            <AppText variant="label" color={palette.primary}>
              Food
            </AppText>
            <View style={styles.card}>
              {items.length ? (
                items.map((item, index) => (
                  <View
                    key={`${item.name || 'item'}-${index}`}
                    style={[styles.foodRow, index > 0 && styles.foodRowBorder]}
                  >
                    <Image
                      source={resolveFoodIconFromLabel(item.name, item.category)}
                      style={styles.foodIcon}
                    />
                    <AppText variant="body1" style={styles.foodName} numberOfLines={2}>
                      {item.name || item.category || 'Food'}
                    </AppText>
                    <AppText variant="bodyBold" color={palette.kale}>
                      {formatKg(itemKg(item))} kg
                    </AppText>
                  </View>
                ))
              ) : (
                <AppText variant="bodySmall" color={palette.stone}>
                  No food items on this listing.
                </AppText>
              )}
              {items.length ? (
                <View style={styles.totalRow}>
                  <AppText variant="bodySmall" color={palette.stone}>
                    Total
                  </AppText>
                  <AppText variant="bodyBold">{formatKg(totalKg)} kg</AppText>
                </View>
              ) : null}
            </View>

            <AppText variant="label" color={palette.primary}>
              Collection
            </AppText>
            <View style={styles.card}>
              <Fact label="Pickup window" value={windowLabel} />
              <Fact label="Best before" value={formatListingDateTime(listing.bestBefore)} />
              {address ? <Fact label="Pickup address" value={address} /> : null}
              {listing.needsReheating ? <Fact label="Reheating" value="Needs reheating" /> : null}
              {allergens.length ? <Fact label="Allergens" value={allergens.join(', ')} /> : null}
              {listing.collectionNotes ? <Fact label="Notes" value={listing.collectionNotes} /> : null}
            </View>

            {storage.length ? (
              <>
                <AppText variant="label" color={palette.primary}>
                  Storage
                </AppText>
                <View style={styles.storageRow}>
                  {storage.map((option) => (
                    <View key={option.label} style={styles.storageChip}>
                      <Image source={option.icon} style={styles.storageIcon} />
                      <AppText variant="bodySmall">{option.label}</AppText>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  if (!value || value === '—') return null;
  return (
    <View style={styles.fact}>
      <AppText variant="caption" color={palette.stone}>
        {label}
      </AppText>
      <AppText variant="bodySmall">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, paddingBottom: hp(4) },
  body: {
    paddingHorizontal: wp(5),
    gap: hp(1.3),
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: normalize(20),
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.4),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    paddingVertical: hp(1.3),
  },
  foodRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E6E6E6',
  },
  foodIcon: {
    width: normalize(28),
    height: normalize(28),
  },
  foodName: {
    flex: 1,
    minWidth: 0,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1.3),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E6E6E6',
  },
  fact: {
    paddingVertical: hp(1.2),
    gap: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E6E6E6',
  },
  storageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },
  storageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    backgroundColor: palette.white,
    borderRadius: normalize(16),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
  },
  storageIcon: {
    width: normalize(22),
    height: normalize(22),
  },
});
