import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { Button } from './Button';
import { palette } from '../theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import {
  fetchListingDetail,
  mapDiscoverListing,
  type FoodItem,
} from '../services/foodListing.service';
import {
  formatListingDate,
  formatListingDateTime,
  formatListingTimeRange,
} from '../utils/dateFormat';

type DiscoverListing = ReturnType<typeof mapDiscoverListing>;

type Props = {
  visible: boolean;
  listing: DiscoverListing | null;
  onClose: () => void;
};

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={normalize(18)} color={palette.middlegreen} />
      </View>
      <View style={styles.detailTextWrap}>
        <AppText variant="caption" style={styles.detailLabel}>
          {label}
        </AppText>
        <AppText variant="bodySmall">{value}</AppText>
      </View>
    </View>
  );
}

export function DiscoverListingDetailModal({ visible, listing, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [extra, setExtra] = useState<ReturnType<typeof mapDiscoverListing> | null>(null);

  useEffect(() => {
    if (!visible || !listing?.listingId) {
      setExtra(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchListingDetail(listing.listingId)
      .then((detail) => {
        if (cancelled) return;
        setExtra(mapDiscoverListing(detail));
      })
      .catch(() => {
        if (!cancelled) setExtra(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, listing?.listingId]);

  if (!listing) return null;

  const data = extra ?? listing;
  const photos = data.photoUrls?.length ? data.photoUrls : listing.photoUrls;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <AppText variant="h6">{data.title}</AppText>
              <AppText variant="bodySmall" style={styles.provider}>
                {data.businessName}
              </AppText>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={normalize(24)} color={palette.black} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={palette.middlegreen} />
                <AppText variant="caption">Loading full details…</AppText>
              </View>
            )}

            <View style={styles.statusPill}>
              <AppText variant="label" style={styles.statusText}>
                {data.status}
              </AppText>
            </View>

            {!!photos?.length && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
                {photos.map((uri: string, index: number) => (
                  <Image key={`${uri}-${index}`} source={{ uri }} style={styles.photo} />
                ))}
              </ScrollView>
            )}

            {!!data.notificationBody && (
              <AppText variant="bodySmall" style={styles.bodyText}>
                {data.notificationBody}
              </AppText>
            )}

            <DetailRow icon="location-outline" label="Pickup location" value={data.pickupAddress} />
            <DetailRow
              icon="scale-outline"
              label="Quantity available"
              value={`${data.remainingQtyKg ?? data.quantityKg}kg${
                data.totalQtyKg && data.totalQtyKg !== data.remainingQtyKg
                  ? ` of ${data.totalQtyKg}kg`
                  : ''
              }`}
            />
            <DetailRow
              icon="calendar-outline"
              label="Best before"
              value={formatListingDateTime(data.bestBefore)}
            />
            <DetailRow
              icon="time-outline"
              label="Pickup window"
              value={formatListingTimeRange(data.listedAt, data.expiresAt)}
            />
            <DetailRow
              icon="today-outline"
              label="Listed on"
              value={formatListingDate(data.listedAt)}
            />
            <DetailRow icon="thermometer-outline" label="Storage" value={data.storage} />

            {!!data.foodItems?.length && (
              <View style={styles.foodItemsSection}>
                <AppText variant="bodyBold" style={styles.sectionTitle}>
                  Food items
                </AppText>
                {data.foodItems.map((item: FoodItem, index: number) => (
                  <View key={`${item.name}-${index}`} style={styles.foodItemRow}>
                    <AppText variant="bodySmall">{item.name || `Item ${index + 1}`}</AppText>
                    <AppText variant="caption">
                      {(item.remainingQtyKg ?? item.totalQtyKg ?? 0)}kg
                    </AppText>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <Button label="Close" size="compact" onPress={onClose} style={styles.closeBtn} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '88%',
    backgroundColor: palette.white,
    borderTopLeftRadius: normalize(24),
    borderTopRightRadius: normalize(24),
    paddingHorizontal: wp(5),
    paddingBottom: hp(3),
  },
  handle: {
    alignSelf: 'center',
    width: wp(12),
    height: normalize(4),
    borderRadius: normalize(2),
    backgroundColor: '#D9D9D9',
    marginTop: hp(1.2),
    marginBottom: hp(1.5),
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(3),
    marginBottom: hp(1.5),
  },
  provider: {
    color: '#666',
    marginTop: hp(0.3),
  },
  content: {
    paddingBottom: hp(2),
    gap: hp(1.2),
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  statusPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F3EC',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.6),
    borderRadius: normalize(20),
  },
  statusText: {
    color: palette.middlegreen,
  },
  photoRow: {
    marginVertical: hp(0.5),
  },
  photo: {
    width: wp(28),
    height: wp(28),
    borderRadius: normalize(12),
    marginRight: wp(2),
  },
  bodyText: {
    color: '#555',
    lineHeight: normalize(20),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(3),
    paddingVertical: hp(0.8),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailIconWrap: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: '#F3FAF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTextWrap: {
    flex: 1,
    gap: hp(0.2),
  },
  detailLabel: {
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  foodItemsSection: {
    marginTop: hp(0.5),
    gap: hp(0.8),
  },
  sectionTitle: {
    marginBottom: hp(0.3),
  },
  foodItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: palette.creme,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    borderRadius: normalize(10),
  },
  closeBtn: {
    marginTop: hp(1),
    backgroundColor: palette.middlegreen,
  },
});
