import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { palette } from '@/theme/colors';
import {
  fetchListingDetail,
  mapDiscoverListing,
  type FoodItem,
} from '@/services/foodListing.service';
import {
  formatListingDate,
  formatListingDateTime,
  formatListingTimeRange,
} from '@/utils/dateFormat';
import { hp, normalize, useResponsiveLayout, wp } from '@/utils/responsive';
import { buildDashboardShellStyles } from '@/utils/dashboardAdaptive';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';

type DiscoverListing = ReturnType<typeof mapDiscoverListing>;

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

export function LivestockListingDetailsScreen({ route, navigation }: any) {
  useTransparentStatusBar('light');
  const r = useResponsiveLayout();
  const adaptive = useMemo(() => buildDashboardShellStyles(r, { stackHero: true }), [r]);

  const listingParam = (route?.params?.listing ?? null) as DiscoverListing | null;
  const [loading, setLoading] = useState(false);
  const [extra, setExtra] = useState<DiscoverListing | null>(null);

  useEffect(() => {
    if (!listingParam?.listingId) {
      setExtra(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchListingDetail(listingParam.listingId)
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
  }, [listingParam?.listingId]);

  const contentColumn = useMemo(() => {
    if (!r.isTablet || !adaptive.columnWidth) return null;
    return {
      width: adaptive.columnWidth,
      maxWidth: r.contentMaxWidth,
      alignSelf: 'center' as const,
      paddingHorizontal: r.pagePadH,
    };
  }, [r.isTablet, r.contentMaxWidth, r.pagePadH, adaptive.columnWidth]);

  const data = extra ?? listingParam;
  const photos = data?.photoUrls?.length ? data.photoUrls : listingParam?.photoUrls;

  if (!listingParam) {
    return (
      <Screen backgroundColor={palette.creme} transparentTop>
        <StackHeroHeader
          title="Listing Details"
          height={r.isTablet ? adaptive.heroHeight : hp(18)}
          style={r.isTablet ? adaptive.heroBleed : undefined}
        />
        <View style={[styles.emptyWrap, contentColumn]}>
          <AppText variant="body">No listing selected.</AppText>
          <Button
            label="Go back"
            size="compact"
            onPress={() => navigation.goBack()}
            style={styles.closeBtn}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
      <View style={r.isTablet ? { width: r.width, alignSelf: 'center' as const } : undefined}>
        <StackHeroHeader
          title="Livestock Feed"
          subtitle={data?.businessName}
          height={r.isTablet ? adaptive.heroHeight : hp(18)}
          style={r.isTablet ? adaptive.heroBleed : undefined}
          source={require('../../../assets/placeholder/livestock.png')}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          adaptive.scrollContent,
          contentColumn,
          { paddingBottom: hp(4) },
        ]}
      >
        <AppText variant="h6">{data?.title}</AppText>
        <AppText variant="bodySmall" style={styles.provider}>
          {data?.businessName}
        </AppText>

        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={palette.middlegreen} />
            <AppText variant="caption">Loading full details…</AppText>
          </View>
        )}

        {!!data?.status && (
          <View style={styles.statusPill}>
            <AppText variant="label" style={styles.statusText}>
              {data.status}
            </AppText>
          </View>
        )}

        {!!photos?.length && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
            {photos.map((uri: string, index: number) => (
              <Image key={`${uri}-${index}`} source={{ uri }} style={styles.photo} />
            ))}
          </ScrollView>
        )}

        {!!data?.notificationBody && (
          <AppText variant="bodySmall" style={styles.bodyText}>
            {data.notificationBody}
          </AppText>
        )}

        <DetailRow
          icon="location-outline"
          label="Pickup location"
          value={data?.pickupAddress || '—'}
        />
        <DetailRow
          icon="scale-outline"
          label="Quantity available"
          value={`${data?.remainingQtyKg ?? data?.quantityKg ?? 0}kg${
            data?.totalQtyKg && data.totalQtyKg !== data.remainingQtyKg
              ? ` of ${data.totalQtyKg}kg`
              : ''
          }`}
        />
        <DetailRow
          icon="calendar-outline"
          label="Best before"
          value={formatListingDateTime(data?.bestBefore)}
        />
        <DetailRow
          icon="time-outline"
          label="Pickup window"
          value={formatListingTimeRange(data?.listedAt, data?.expiresAt)}
        />
        <DetailRow
          icon="today-outline"
          label="Listed on"
          value={formatListingDate(data?.listedAt)}
        />
        <DetailRow icon="thermometer-outline" label="Storage" value={data?.storage || '—'} />

        {!!data?.foodItems?.length && (
          <View style={styles.foodItemsSection}>
            <AppText variant="bodyBold" style={styles.sectionTitle}>
              Feed items
            </AppText>
            {data.foodItems.map((item: FoodItem, index: number) => (
              <View key={`${item.name}-${index}`} style={styles.foodItemRow}>
                <AppText variant="bodySmall">{item.name || `Item ${index + 1}`}</AppText>
                <AppText variant="caption">
                  {item.remainingQtyKg ?? item.totalQtyKg ?? 0}kg
                </AppText>
              </View>
            ))}
          </View>
        )}

        <Button
          label="Close"
          size="compact"
          onPress={() => navigation.goBack()}
          style={styles.closeBtn}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: wp(5),
    gap: hp(1.2),
  },
  emptyWrap: {
    paddingHorizontal: wp(5),
    gap: hp(2),
    alignItems: 'center',
    marginTop: hp(4),
  },
  provider: {
    color: '#666',
    marginTop: -hp(0.5),
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
    maxWidth: 140,
    maxHeight: 140,
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
