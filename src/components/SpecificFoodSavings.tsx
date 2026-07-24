import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import {
  TopFoodItem,
  impactService,
} from '@/services/impact.service';
import type { ImpactFilter } from '@/store/impactStore';
import { useAuthStore } from '@/store/authStore';
import { getUserFriendlyErrorMessage } from '@/utils/apiError';

const TOP_FOODS_LIMIT = 5;

const ICONS = {
  redistributed: require('../../assets/placeholder/veggie_basket_icon.png'),
  co2: require('../../assets/placeholder/co2_green_icon.png'),
  people: require('../../assets/placeholder/people_icon.png'),
  animals: require('../../assets/placeholder/cow_front.png'),
  foodPeople: require('../../assets/placeholder/storage_box_green.png'),
  foodAnimals: require('../../assets/placeholder/storage_box_orange.png'),
};

type Props = {
  filter: ImpactFilter;
  /** When set, fetch site-scoped top foods; otherwise organisation-scoped. */
  siteId?: number | null;
  /**
   * @deprecated Prefer per-food peopleKg/animalKg from the API.
   * Kept as a fallback when older backends omit those fields.
   */
  peoplePercent?: number;
  animalPercent?: number;
  /** Bump to force a refetch (e.g. pull-to-refresh). */
  refreshNonce?: number;
};

function formatNumber(value: number) {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  });
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function foodKey(food: TopFoodItem) {
  return `${food.rank}:${food.foodName}:${food.category ?? ''}`;
}

function foodLabel(food: TopFoodItem) {
  return food.foodName?.trim() || food.category?.trim() || 'Food';
}

function unwrapTopFoods(payload: any): TopFoodItem[] {
  const root = payload?.data ?? payload;
  const list = root?.topFoods ?? root?.data?.topFoods ?? root?.foods;
  return Array.isArray(list) ? list : [];
}

function resolveFoodSplit(
  food: TopFoodItem | null,
  fallbackPeoplePercent: number,
  fallbackAnimalPercent: number,
) {
  const total = food?.totalKg ?? 0;
  if (!food || total <= 0) {
    return { peopleKg: 0, animalKg: 0, peoplePercent: 0, animalPercent: 0 };
  }

  const hasPerFoodSplit =
    food.peopleKg != null ||
    food.animalKg != null ||
    food.peoplePercent != null ||
    food.animalPercent != null;

  if (hasPerFoodSplit) {
    let peopleKg =
      food.peopleKg != null
        ? Number(food.peopleKg)
        : round2((total * Number(food.peoplePercent ?? 0)) / 100);
    let animalKg =
      food.animalKg != null
        ? Number(food.animalKg)
        : round2((total * Number(food.animalPercent ?? 0)) / 100);

    if (peopleKg + animalKg <= 0) {
      peopleKg = total;
      animalKg = 0;
    }

    return {
      peopleKg: round2(peopleKg),
      animalKg: round2(animalKg),
      peoplePercent: round1((peopleKg / total) * 100),
      animalPercent: round1((animalKg / total) * 100),
    };
  }

  // Legacy fallback: overall impact split (same % on every food — inaccurate).
  const peoplePct = Math.max(0, Math.min(100, fallbackPeoplePercent));
  const animalPct = Math.max(0, Math.min(100, fallbackAnimalPercent));
  const pctSum = peoplePct + animalPct;
  const safePeople = pctSum > 0 ? peoplePct : 100;
  const safeAnimal = pctSum > 0 ? animalPct : 0;

  return {
    peopleKg: round2((total * safePeople) / 100),
    animalKg: round2((total * safeAnimal) / 100),
    peoplePercent: round1(safePeople),
    animalPercent: round1(safeAnimal),
  };
}

export function SpecificFoodSavings({
  filter,
  siteId = null,
  peoplePercent = 100,
  animalPercent = 0,
  refreshNonce = 0,
}: Props) {
  const authUser = useAuthStore((state) => state.authUser);
  const orgId =
    authUser?.profile?.organisation?.id ??
    authUser?.profile?.organization?.id ??
    null;

  const [foods, setFoods] = useState<TopFoodItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const rangeParams = useMemo(() => {
    if (filter.mode === 'custom' && filter.startDate && filter.endDate) {
      return { startDate: filter.startDate, endDate: filter.endDate };
    }
    // all_time → omit dates so the API uses lifetime COLLECTED claims
    return undefined;
  }, [filter.mode, filter.startDate, filter.endDate]);

  const load = useCallback(async () => {
    if (!authUser?.accessToken) return;
    if (siteId == null && orgId == null) return;

    setLoading(true);
    setError(null);
    try {
      const res =
        siteId != null
          ? await impactService.getSiteTopFoods(siteId, rangeParams)
          : await impactService.getOrgTopFoods(Number(orgId), rangeParams);

      const next = unwrapTopFoods(res.data ?? res).slice(0, TOP_FOODS_LIMIT);
      setFoods(next);
      setSelectedKey((prev) => {
        if (prev && next.some((f) => foodKey(f) === prev)) return prev;
        return next[0] ? foodKey(next[0]) : null;
      });
    } catch (err: unknown) {
      setFoods([]);
      setSelectedKey(null);
      setError(getUserFriendlyErrorMessage(err, 'Failed to load top foods'));
    } finally {
      setLoading(false);
    }
  }, [authUser?.accessToken, siteId, orgId, rangeParams, refreshNonce]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = foods.find((f) => foodKey(f) === selectedKey) ?? foods[0] ?? null;

  const split = useMemo(
    () => resolveFoodSplit(selected, peoplePercent, animalPercent),
    [selected, peoplePercent, animalPercent],
  );

  const foodsTotalKg = useMemo(
    () => round2(foods.reduce((sum, food) => sum + (Number(food.totalKg) || 0), 0)),
    [foods],
  );

  const displayTotalKg = selected?.totalKg ?? 0;
  const displayCo2Kg =
    selected?.co2AvoidedKg != null
      ? Number(selected.co2AvoidedKg)
      : round2(displayTotalKg * 2.1);

  const showPeopleSplit = split.peoplePercent > 0 || split.animalPercent === 0;
  const showAnimalSplit = split.animalPercent > 0;
  const showBothSplits = showPeopleSplit && showAnimalSplit;

  const cardShadow = Platform.select({
    ios: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: { elevation: 2 },
  });

  return (
    <View style={styles.wrap}>
      <AppText variant="bodyBold" style={styles.title}>
        Specific Food Savings
      </AppText>
      <AppText style={styles.subtitle}>
        Breakdown of Food Recovered — these amounts add up to the total, they are not extra.
      </AppText>

      {foods.length > 0 ? (
        <AppText style={styles.totalHint}>
          Listed foods total {formatNumber(foodsTotalKg)} kg
        </AppText>
      ) : null}

      <Pressable
        style={styles.selector}
        onPress={() => foods.length > 0 && setPickerOpen(true)}
        disabled={foods.length === 0}
        accessibilityRole="button"
        accessibilityLabel="Select food"
      >
        <View style={styles.selectorIcon}>
          <Ionicons name="leaf" size={normalize(16)} color={palette.white} />
        </View>
        <AppText style={styles.selectorText} numberOfLines={1}>
          {selected ? foodLabel(selected) : loading ? 'Loading…' : 'No foods yet'}
        </AppText>
        <Ionicons name="chevron-down" size={normalize(18)} color={palette.stone} />
      </Pressable>

      <View style={styles.panel}>
        {loading && !selected ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={palette.kale} />
          </View>
        ) : (
          <View style={styles.grid}>
            {error && !selected ? (
              <AppText style={styles.errorHint}>{error}</AppText>
            ) : null}
            <AppText style={styles.panelHint}>
              Stats below are for the selected food only
              {selected ? ` (${foodLabel(selected)})` : ''}.
            </AppText>
            <View style={styles.row}>
              <View style={[styles.statCard, cardShadow]}>
                <View style={styles.statIconWrap}>
                  <Image source={ICONS.redistributed} style={styles.statIcon} resizeMode="contain" />
                </View>
                <View style={styles.statText}>
                  <AppText style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                    {formatNumber(displayTotalKg)} kg
                  </AppText>
                  <AppText style={styles.statLabel}>This food</AppText>
                </View>
              </View>

              <View style={[styles.statCard, cardShadow]}>
                <View style={styles.statIconWrap}>
                  <Image source={ICONS.co2} style={styles.statIcon} resizeMode="contain" />
                </View>
                <View style={styles.statText}>
                  <AppText style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                    {formatNumber(displayCo2Kg)} kg
                  </AppText>
                  <AppText style={styles.statLabel}>CO₂ avoided</AppText>
                </View>
              </View>
            </View>

            {showBothSplits || showPeopleSplit || showAnimalSplit ? (
              <View style={styles.row}>
                {showPeopleSplit ? (
                  <View style={[styles.splitCard, cardShadow, !showBothSplits && styles.splitCardFull]}>
                    <View style={[styles.splitHeader, styles.peopleHeader]}>
                      <Image source={ICONS.people} style={styles.splitBadgeIcon} resizeMode="contain" />
                      <AppText style={styles.peopleHeaderText}>For people</AppText>
                    </View>
                    <View style={styles.splitBody}>
                      <View style={styles.splitValueRow}>
                        <Image
                          source={ICONS.foodPeople}
                          style={styles.splitFoodIcon}
                          resizeMode="contain"
                        />
                        <AppText style={styles.peopleValue} numberOfLines={1} adjustsFontSizeToFit>
                          {formatNumber(split.peopleKg)} kg
                        </AppText>
                      </View>
                      <AppText style={styles.splitSubLabel}>
                        {showBothSplits ? 'Share of this food' : 'All of this food'}
                      </AppText>
                      {showBothSplits ? (
                        <View style={styles.progressRow}>
                          <View style={styles.peopleTrack}>
                            <View
                              style={[
                                styles.peopleFill,
                                { width: `${Math.min(100, split.peoplePercent)}%` },
                              ]}
                            />
                          </View>
                          <AppText style={styles.percentText}>{split.peoplePercent}%</AppText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                {showAnimalSplit ? (
                  <View style={[styles.splitCard, cardShadow, !showBothSplits && styles.splitCardFull]}>
                    <View style={[styles.splitHeader, styles.animalsHeader]}>
                      <Image source={ICONS.animals} style={styles.splitBadgeIcon} resizeMode="contain" />
                      <AppText style={styles.animalsHeaderText}>For animals</AppText>
                    </View>
                    <View style={styles.splitBody}>
                      <View style={styles.splitValueRow}>
                        <Image
                          source={ICONS.foodAnimals}
                          style={styles.splitFoodIcon}
                          resizeMode="contain"
                        />
                        <AppText style={styles.animalsValue} numberOfLines={1} adjustsFontSizeToFit>
                          {formatNumber(split.animalKg)} kg
                        </AppText>
                      </View>
                      <AppText style={styles.splitSubLabel}>
                        {showBothSplits ? 'Share of this food' : 'All of this food'}
                      </AppText>
                      {showBothSplits ? (
                        <View style={styles.progressRow}>
                          <View style={styles.animalsTrack}>
                            <View
                              style={[
                                styles.animalsFill,
                                { width: `${Math.min(100, split.animalPercent)}%` },
                              ]}
                            />
                          </View>
                          <AppText style={styles.percentText}>{split.animalPercent}%</AppText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
      </View>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <AppText variant="bodyBold" style={styles.modalTitle}>
              Top foods
            </AppText>
            <AppText style={styles.modalSubtitle}>
              Parts of your {formatNumber(foodsTotalKg)} kg recovered — not additional kg
            </AppText>
            <FlatList
              data={foods}
              keyExtractor={(item) => foodKey(item)}
              ListFooterComponent={
                <View style={styles.modalFooter}>
                  <AppText style={styles.modalFooterLabel}>Total</AppText>
                  <AppText style={styles.modalFooterValue}>
                    {formatNumber(foodsTotalKg)} kg
                  </AppText>
                </View>
              }
              renderItem={({ item }) => {
                const label = foodLabel(item);
                const key = foodKey(item);
                const active = key === selectedKey;
                return (
                  <Pressable
                    style={[styles.optionRow, active && styles.optionRowActive]}
                    onPress={() => {
                      setSelectedKey(key);
                      setPickerOpen(false);
                    }}
                  >
                    <View style={styles.selectorIcon}>
                      <Ionicons name="leaf" size={normalize(14)} color={palette.white} />
                    </View>
                    <View style={styles.optionTextWrap}>
                      <AppText style={styles.optionTitle} numberOfLines={1}>
                        {label}
                      </AppText>
                      {item.category ? (
                        <AppText style={styles.optionSubtitle} numberOfLines={1}>
                          {item.category} · {formatNumber(item.totalKg)} kg
                        </AppText>
                      ) : (
                        <AppText style={styles.optionSubtitle}>
                          {formatNumber(item.totalKg)} kg
                        </AppText>
                      )}
                    </View>
                    {active ? (
                      <Ionicons name="checkmark" size={normalize(18)} color={palette.kale} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
  panelHint: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(11),
    color: palette.midgray,
    textTransform: 'none',
    marginBottom: hp(0.2),
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.strokecream,
    borderRadius: normalize(12),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.1),
  },
  selectorIcon: {
    width: normalize(28),
    height: normalize(28),
    borderRadius: normalize(8),
    backgroundColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorText: {
    flex: 1,
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    color: palette.black,
    textTransform: 'none',
  },
  panel: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.strokecream,
    borderRadius: normalize(16),
    padding: wp(3),
    minHeight: normalize(160),
  },
  loadingBox: {
    minHeight: normalize(140),
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorHint: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(12),
    color: palette.midgray,
    textAlign: 'center',
    textTransform: 'none',
  },
  grid: {
    gap: hp(1.2),
  },
  row: {
    flexDirection: 'row',
    gap: wp(2.5),
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    backgroundColor: palette.white,
    borderRadius: normalize(12),
    borderWidth: 1,
    borderColor: palette.strokecream,
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(1.2),
  },
  statIconWrap: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: '#E8F3EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    width: normalize(20),
    height: normalize(20),
  },
  statText: {
    flex: 1,
    minWidth: 0,
    gap: hp(0.15),
  },
  statValue: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(15),
    color: palette.kale,
    textTransform: 'none',
  },
  statLabel: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(11),
    color: palette.midgray,
    textTransform: 'none',
  },
  splitCard: {
    flex: 1,
    backgroundColor: palette.white,
    borderRadius: normalize(12),
    borderWidth: 1,
    borderColor: palette.strokecream,
    overflow: 'hidden',
  },
  splitCardFull: {
    flex: 1,
  },
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.7),
  },
  peopleHeader: {
    backgroundColor: '#F0F8F3',
  },
  animalsHeader: {
    backgroundColor: '#FFF6EC',
  },
  splitBadgeIcon: {
    width: normalize(16),
    height: normalize(16),
  },
  peopleHeaderText: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(12),
    color: palette.kale,
    textTransform: 'none',
  },
  animalsHeaderText: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(12),
    color: palette.orange,
    textTransform: 'none',
  },
  splitBody: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(1),
    gap: hp(0.25),
  },
  splitValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  splitFoodIcon: {
    width: normalize(16),
    height: normalize(16),
  },
  peopleValue: {
    flexShrink: 1,
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(15),
    color: palette.kale,
    textTransform: 'none',
  },
  animalsValue: {
    flexShrink: 1,
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(15),
    color: palette.orange,
    textTransform: 'none',
  },
  splitSubLabel: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(11),
    color: palette.midgray,
    textTransform: 'none',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginTop: hp(0.35),
  },
  peopleTrack: {
    flex: 1,
    height: hp(0.75),
    backgroundColor: '#D8E8DC',
    borderRadius: normalize(100),
    overflow: 'hidden',
  },
  peopleFill: {
    height: '100%',
    backgroundColor: palette.kale,
    borderRadius: normalize(100),
  },
  animalsTrack: {
    flex: 1,
    height: hp(0.75),
    backgroundColor: '#F8DEC8',
    borderRadius: normalize(100),
    overflow: 'hidden',
  },
  animalsFill: {
    height: '100%',
    backgroundColor: palette.orange,
    borderRadius: normalize(100),
  },
  percentText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(11),
    color: palette.midgray,
    minWidth: normalize(34),
    textAlign: 'right',
    textTransform: 'none',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: palette.creme,
    borderTopLeftRadius: normalize(18),
    borderTopRightRadius: normalize(18),
    paddingHorizontal: wp(4),
    paddingTop: hp(1.5),
    paddingBottom: hp(3),
    maxHeight: '55%',
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: hp(0.4),
    textTransform: 'none',
  },
  modalSubtitle: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(12),
    color: palette.midgray,
    textAlign: 'center',
    textTransform: 'none',
    marginBottom: hp(1),
  },
  modalFooter: {
    marginTop: hp(0.8),
    paddingTop: hp(1),
    borderTopWidth: 1,
    borderTopColor: palette.strokecream,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(2),
  },
  modalFooterLabel: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    color: palette.black,
    textTransform: 'none',
  },
  modalFooterValue: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    color: palette.kale,
    textTransform: 'none',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    paddingVertical: hp(1.1),
    paddingHorizontal: wp(2),
    borderRadius: normalize(12),
  },
  optionRowActive: {
    backgroundColor: '#E8F3EC',
  },
  optionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    color: palette.black,
    textTransform: 'none',
  },
  optionSubtitle: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(11),
    color: palette.midgray,
    textTransform: 'none',
  },
});
