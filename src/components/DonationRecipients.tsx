import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { elevation } from '@/theme/elevation';
import { hp, normalize, wp } from '@/utils/responsive';
import { useAuthStore } from '@/store/authStore';
import type { ImpactFilter } from '@/store/impactStore';
import { getUserFriendlyErrorMessage } from '@/utils/apiError';
import {
  fetchRecipientRows,
  formatCollectionDate,
  isRecipientsUnsupported,
  type RecipientRow,
} from '@/utils/donationRecipients';

const COLLAPSED_LIMIT = 5;
const FOODS_PER_RECIPIENT = 6;

type Props = {
  filter: ImpactFilter;
  filterLabel?: string;
  /** When set, scope to a single location; otherwise organisation-wide. */
  siteId?: number | null;
  /** Receivers see "collected from" instead of "donated to". */
  mode?: 'DONOR' | 'RECEIVER';
  /** Bump to force a refetch (e.g. pull-to-refresh). */
  refreshNonce?: number;
};

function formatNumber(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function collectionsLabel(count: number) {
  return `${formatNumber(count)} ${count === 1 ? 'collection' : 'collections'}`;
}

function RecipientCard({
  row,
  expanded,
  onToggle,
}: {
  row: RecipientRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const lastCollection = formatCollectionDate(row.lastCollectionAt);
  const foods = row.foods.slice(0, FOODS_PER_RECIPIENT);
  const hasFoods = foods.length > 0;

  return (
    <View style={[styles.card, elevation.flat]}>
      <Pressable
        style={styles.cardHeader}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${row.name}, ${collectionsLabel(row.collections)}, ${formatNumber(
          row.totalKg,
        )} kilograms`}
      >
        {row.logoUrl ? (
          <Image source={{ uri: row.logoUrl }} style={styles.logo} resizeMode="cover" />
        ) : (
          <View style={[styles.logo, styles.logoFallback]}>
            <Ionicons
              name={row.kind === 'animals' ? 'paw' : 'heart'}
              size={normalize(16)}
              color={row.kind === 'animals' ? palette.orange : palette.kale}
            />
          </View>
        )}

        <View style={styles.cardCopy}>
          <AppText style={styles.cardTitle} numberOfLines={1}>
            {row.name}
          </AppText>
          <AppText style={styles.cardMeta} numberOfLines={1}>
            {collectionsLabel(row.collections)}
            {lastCollection ? ` · last ${lastCollection}` : ''}
          </AppText>
        </View>

        <View style={styles.cardValueWrap}>
          <AppText style={styles.cardValue} numberOfLines={1}>
            {formatNumber(row.totalKg)} kg
          </AppText>
          {row.sharePercent > 0 ? (
            <AppText style={styles.cardShare}>{row.sharePercent}%</AppText>
          ) : null}
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={normalize(18)}
          color={palette.stone}
        />
      </Pressable>

      {row.sharePercent > 0 ? (
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              row.kind === 'animals' && styles.fillAnimals,
              { width: `${Math.max(2, Math.min(100, row.sharePercent))}%` },
            ]}
          />
        </View>
      ) : null}

      {expanded ? (
        <View style={styles.detail}>
          <View style={styles.detailStats}>
            <View style={styles.detailStat}>
              <AppText style={styles.detailStatValue}>{formatNumber(row.mealsCreated)}</AppText>
              <AppText style={styles.detailStatLabel}>Meals</AppText>
            </View>
            <View style={styles.detailStat}>
              <AppText style={styles.detailStatValue}>
                {formatNumber(row.co2AvoidedKg)} kg
              </AppText>
              <AppText style={styles.detailStatLabel}>CO₂ avoided</AppText>
            </View>
            <View style={styles.detailStat}>
              <AppText style={styles.detailStatValue}>
                {formatNumber(row.collections)}
              </AppText>
              <AppText style={styles.detailStatLabel}>Times</AppText>
            </View>
          </View>

          <AppText style={styles.detailHeading}>Food types</AppText>
          {hasFoods ? (
            <View style={styles.foodList}>
              {foods.map((food) => (
                <View key={`${row.key}:${food.name}`} style={styles.foodRow}>
                  <View style={styles.foodDot} />
                  <AppText style={styles.foodName} numberOfLines={1}>
                    {food.name}
                    {food.category ? ` · ${food.category}` : ''}
                  </AppText>
                  <AppText style={styles.foodValue}>{formatNumber(food.totalKg)} kg</AppText>
                </View>
              ))}
              {row.foods.length > FOODS_PER_RECIPIENT ? (
                <AppText style={styles.foodMore}>
                  +{row.foods.length - FOODS_PER_RECIPIENT} more food types
                </AppText>
              ) : null}
            </View>
          ) : (
            <AppText style={styles.emptyText}>
              No food-type breakdown recorded for these collections.
            </AppText>
          )}
        </View>
      ) : null}
    </View>
  );
}

export function DonationRecipients({
  filter,
  filterLabel,
  siteId = null,
  mode = 'DONOR',
  refreshNonce = 0,
}: Props) {
  const authUser = useAuthStore((state) => state.authUser);
  const orgId =
    authUser?.profile?.organisation?.id ?? authUser?.profile?.organization?.id ?? null;

  const [rows, setRows] = useState<RecipientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const isReceiver = mode === 'RECEIVER';
  const title = isReceiver ? 'Collected from' : 'Donated to';

  const load = useCallback(async () => {
    if (!authUser?.accessToken) return;
    if (siteId == null && orgId == null) return;

    setLoading(true);
    setError(null);
    try {
      setRows(await fetchRecipientRows({ filter, siteId, orgId: orgId != null ? Number(orgId) : null }));
    } catch (err: unknown) {
      setRows([]);
      // A backend without the endpoint should read as "nothing yet", not a failure.
      setError(
        isRecipientsUnsupported(err)
          ? null
          : getUserFriendlyErrorMessage(err, 'Failed to load partner organisations'),
      );
    } finally {
      setLoading(false);
    }
  }, [authUser?.accessToken, siteId, orgId, filter, refreshNonce]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setShowAll(false);
    setExpandedKey(null);
  }, [siteId, filter.mode, filter.startDate, filter.endDate]);

  const totals = useMemo(
    () => ({
      kg: rows.reduce((sum, row) => sum + row.totalKg, 0),
      collections: rows.reduce((sum, row) => sum + row.collections, 0),
    }),
    [rows],
  );

  const visible = showAll ? rows : rows.slice(0, COLLAPSED_LIMIT);

  return (
    <View style={styles.wrap}>
      <AppText variant="bodyBold" style={styles.title}>
        {title}
      </AppText>
      <AppText style={styles.subtitle}>
        {isReceiver
          ? 'Businesses you collected from'
          : 'Charities and farms that collected your food'}
        {filterLabel ? ` · ${filterLabel}` : ''}
      </AppText>

      {rows.length > 0 ? (
        <AppText style={styles.totalHint}>
          {formatNumber(rows.length)} {rows.length === 1 ? 'partner' : 'partners'} ·{' '}
          {formatNumber(Math.round(totals.kg * 100) / 100)} kg across{' '}
          {collectionsLabel(totals.collections)}
        </AppText>
      ) : null}

      {loading && rows.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={palette.kale} />
        </View>
      ) : null}

      {!loading && rows.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="people-outline" size={normalize(26)} color={palette.stone} />
          <AppText style={styles.emptyText}>
            {error ??
              (isReceiver
                ? 'No collections in this period yet.'
                : 'No completed collections in this period yet. Once a partner collects your food, they will appear here.')}
          </AppText>
          {error ? (
            <Pressable style={styles.retryBtn} onPress={() => void load()}>
              <AppText style={styles.retryText}>Try again</AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {visible.map((row) => (
        <RecipientCard
          key={row.key}
          row={row}
          expanded={expandedKey === row.key}
          onToggle={() => setExpandedKey((prev) => (prev === row.key ? null : row.key))}
        />
      ))}

      {rows.length > COLLAPSED_LIMIT ? (
        <Pressable
          style={styles.moreBtn}
          onPress={() => setShowAll((prev) => !prev)}
          accessibilityRole="button"
        >
          <AppText style={styles.moreText}>
            {showAll ? 'Show less' : `Show all ${formatNumber(rows.length)} partners`}
          </AppText>
          <Ionicons
            name={showAll ? 'chevron-up' : 'chevron-down'}
            size={normalize(16)}
            color={palette.kale}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: hp(1),
  },
  title: {
    color: palette.black,
    fontSize: normalize(16),
    textTransform: 'none',
  },
  subtitle: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(12),
    color: palette.midgray,
    textTransform: 'none',
    lineHeight: normalize(17),
    marginTop: -hp(0.3),
  },
  totalHint: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(13),
    color: palette.kale,
    textTransform: 'none',
  },
  loadingBox: {
    minHeight: normalize(120),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    gap: hp(0.8),
    paddingVertical: hp(2.5),
    paddingHorizontal: wp(4),
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.strokecream,
    borderRadius: normalize(16),
  },
  emptyText: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(12),
    color: palette.midgray,
    textAlign: 'center',
    textTransform: 'none',
    lineHeight: normalize(17),
  },
  retryBtn: {
    marginTop: hp(0.5),
    borderWidth: 1.5,
    borderColor: palette.kale,
    borderRadius: normalize(20),
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.6),
  },
  retryText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(12),
    color: palette.kale,
    textTransform: 'none',
  },
  card: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.strokecream,
    borderRadius: normalize(14),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.1),
    gap: hp(0.7),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
  },
  logo: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(10),
    backgroundColor: '#E8F3EC',
  },
  logoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
    gap: hp(0.15),
  },
  cardTitle: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    color: palette.black,
    textTransform: 'none',
  },
  cardMeta: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(11),
    color: palette.midgray,
    textTransform: 'none',
  },
  cardValueWrap: {
    alignItems: 'flex-end',
    gap: hp(0.1),
  },
  cardValue: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    color: palette.kale,
    textTransform: 'none',
  },
  cardShare: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(11),
    color: palette.midgray,
    textTransform: 'none',
  },
  track: {
    height: hp(0.6),
    backgroundColor: '#D8E8DC',
    borderRadius: normalize(100),
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: palette.kale,
    borderRadius: normalize(100),
  },
  fillAnimals: {
    backgroundColor: palette.orange,
  },
  detail: {
    gap: hp(0.9),
    paddingTop: hp(0.9),
    borderTopWidth: 1,
    borderTopColor: palette.strokecream,
  },
  detailStats: {
    flexDirection: 'row',
    gap: wp(2),
  },
  detailStat: {
    flex: 1,
    alignItems: 'center',
    gap: hp(0.15),
    paddingVertical: hp(0.8),
    borderRadius: normalize(10),
    backgroundColor: '#F7FAF7',
  },
  detailStatValue: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(13),
    color: palette.kale,
    textTransform: 'none',
  },
  detailStatLabel: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(10),
    color: palette.midgray,
    textTransform: 'none',
  },
  detailHeading: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(12),
    color: palette.black,
    textTransform: 'none',
  },
  foodList: {
    gap: hp(0.55),
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  foodDot: {
    width: normalize(6),
    height: normalize(6),
    borderRadius: normalize(3),
    backgroundColor: palette.kale,
  },
  foodName: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(12),
    color: palette.black,
    textTransform: 'none',
  },
  foodValue: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(12),
    color: palette.kale,
    textTransform: 'none',
  },
  foodMore: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(11),
    color: palette.midgray,
    textTransform: 'none',
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    paddingVertical: hp(1),
    borderRadius: normalize(12),
    borderWidth: 1,
    borderColor: palette.strokecream,
    backgroundColor: palette.white,
  },
  moreText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(13),
    color: palette.kale,
    textTransform: 'none',
  },
});
