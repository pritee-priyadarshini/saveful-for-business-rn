import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  ImageBackground,
} from 'react-native';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';

import { charityListings } from '../../data/mockData';

import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type ClaimState = Record<string, number>; // key = listingId-itemName

export function CharityMapScreen({ navigation }: any) {
  const [claimState, setClaimState] = useState<ClaimState>({});
  const [activeFilter, setActiveFilter] = useState<'distance' | 'surplus' | null>(null);

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

      <View style={styles.subTextWrapper}>
        <AppText variant="h7" style={styles.center}>
          Surplus food near you
        </AppText>
      </View>

      {/* ACTIVE LISTINGS */}
      <View style={styles.activeRow}>
        <AppText variant='h7'>
          Active Listings
        </AppText>

        <View style={styles.activeBadge}>
          <AppText variant='h7' color='white'>
            {charityListings.length}
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
          <AppText variant='label'
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
          <AppText variant='label'
            style={
              activeFilter === 'surplus'
                ? styles.filterTextActive
                : styles.filterText
            }
          >
            Sort by Surplus Available
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
            <AppText variant='bodyLarge'>{item.businessName}</AppText>
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
            <AppText variant='label'>Qty</AppText>
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
          <AppText style={styles.sectionTitle}>Select quantity</AppText>
          {item.items.map((i: any) => renderItemRow(item, i))}
        </View>

        {/* CTA */}
        <View style={styles.ctaRow}>
          <Button
            label={`Claim ${totalSelected} kg`}
            disabled={!hasSelection}
            style={styles.flexBtn}
            onPress={() =>
              navigation.navigate('ClaimConfirm', {
                listing: item,
                payload: buildPayload(item),
              })
            }
          />

          <Button
            label="Claim all"
            variant="secondary"
            style={styles.flexBtn}
            onPress={() =>
              navigation.navigate('ClaimConfirm', {
                listing: item,
              })
            }
          />
        </View>
      </View>
    );
  };

  return (
    <Screen backgroundColor={palette.creme} scrollable={false}>
      <FlatList
        data={useMemo(() => {
          let data = [...charityListings];

          if (activeFilter === 'distance') {
            data.sort((a, b) =>
              parseFloat(a.distance) - parseFloat(b.distance)
            );
          }

          if (activeFilter === 'surplus') {
            data.sort((a, b) => b.quantityKg - a.quantityKg);
          }

          return data;
        }, [activeFilter])}
        keyExtractor={(item) => item.id}
        renderItem={renderListing}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
  },

  headerWrapper: {
    paddingHorizontal: spacing.md,
  },

  headerBg: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: -spacing.md,
  },

  white: {
    color: palette.white,
    textAlign: 'center',
  },

  subTextWrapper: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },

  center: {
    textAlign: 'center',
  },

  activeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },

  activeBadge: {
    backgroundColor: palette.middlegreen,
    paddingHorizontal: 30,
    paddingVertical: 8,
    borderRadius: 10,
  },

  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  filterPill: {
    flex: 1,
    backgroundColor: palette.strokecream,
    paddingVertical: 10,
    borderRadius: 20,
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
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  distanceChip: {
    backgroundColor: palette.radish,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },

  infoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },

  infoCard: {
    flex: 1,
    backgroundColor: '#F7F7F9',
    padding: spacing.sm,
    borderRadius: 14,
  },

  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },

  section: {
    marginTop: spacing.sm,
  },

  sectionTitle: {
    marginBottom: spacing.sm,
  },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFB',
    padding: spacing.sm,
    borderRadius: 14,
    marginBottom: spacing.sm,
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F1F4',
    borderRadius: 20,
    paddingHorizontal: 6,
  },

  stepBtn: {
    padding: 6,
  },

  qtyPill: {
    backgroundColor: palette.white,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginHorizontal: 4,
  },

  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  flexBtn: {
    flex: 1,
  },

});