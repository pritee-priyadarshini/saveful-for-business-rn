import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Modal,
  Alert,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Skeleton } from '../../components/Skeleton';

import { palette } from '@/theme/colors';
import { ListingStatus } from '@/types';
import { estimateMealsSaved, getListingAudience, getListingStatusLabel, isAnimalListing, isListingActive, isListingCollected, isListingExpired, isPeopleListing } from '../../utils/foodListing';
import { showErrorAlert } from '../../utils/apiError';
import { useAppContext } from '../../store/AppContext';
import { useListingsStore } from '../../store/listingsStore';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

type MetaBoxLayout = 'half' | 'centered';

type ListingFilter = 'all' | 'people' | 'animals';

type ListingTheme = {
  accent: string;
  statusBg: string;
  bannerBg: string;
  cardBg: string;
  border: string;
  categoryLabel: string;
  categoryIcon: any;
  notification: string;
};

const PEOPLE_THEME: ListingTheme = {
  accent: palette.kale,
  statusBg: '#D8EBDF',
  bannerBg: '#E8F3EC',
  cardBg: palette.white,
  border: palette.kale,
  categoryLabel: 'For People',
  categoryIcon: require('../../../assets/placeholder/people_icon.png'),
  notification: 'Nearby charities have been notified',
};

const ANIMAL_THEME: ListingTheme = {
  accent: palette.orange,
  statusBg: '#FFE8CC',
  bannerBg: '#FFF3E4',
  cardBg: '#FFFAF4',
  border: palette.orange,
  categoryLabel: 'For Animals',
  categoryIcon: require('../../../assets/placeholder/cow_front.png'),
  notification: 'Nearby farms have been notified',
};

const META_ICONS = {
  items: require('../../../assets/placeholder/veggie_basket_icon.png'),
  calendar: require('../../../assets/placeholder/calender_icon.png'),
  time: require('../../../assets/placeholder/clock_icon.png'),
  impact: require('../../../assets/placeholder/leaf_icon.png'),
};

function getListingTheme(listing: any): ListingTheme {
  return getListingAudience(listing) === 'animal' ? ANIMAL_THEME : PEOPLE_THEME;
}

function formatExpiredOn(listing: any) {
  const value = listing?.updatedAt || listing?.pickupByTime || listing?.pickupFromTime;
  if (!value) return '—';
  const date = new Date(value);
  return date
    .toLocaleString([], {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .replace(',', '');
}

function getTotalKg(listing: any) {
  return (listing?.foodItems || []).reduce(
    (sum: number, item: any) => sum + Number(item.totalQtyKg || 0),
    0,
  );
}

function formatPickupDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function formatPickupTime(from?: string | null, to?: string | null) {
  if (!from || !to) return '—';
  const fmt = (d: Date) =>
    d
      .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
      .replace(' ', '')
      .toLowerCase();
  return `${fmt(new Date(from))} - ${fmt(new Date(to))}`;
}

function formatCollectedOn(listing: any) {
  const value =
    listing?.collectedAt ||
    listing?.updatedAt ||
    listing?.pickupFromTime ||
    listing?.createdAt;
  if (!value) return '—';
  const date = new Date(value);
  return date
    .toLocaleString([], {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .replace(',', '');
}

function buildInstructions(listing: any) {
  const parts = [
    listing?.needsRefrigeration && 'NEEDS REFRIGERATION',
    listing?.needsReheating && 'NEEDS REHEATING',
    (listing?.containsAllergens || (listing?.allergens?.length ?? 0) > 0) && 'CONTAINS ALLERGENS',
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : 'NO SPECIAL INSTRUCTIONS';
}

function getImpactText(listing: any) {
  const totalKg = getTotalKg(listing);
  if (getListingAudience(listing) === 'animal') {
    return `${Math.round(totalKg)} kg feed diverted from landfill`;
  }
  return `${estimateMealsSaved(totalKg)} meals created`;
}

export function RestaurantListingsScreen({ navigation }: any) {
  const { authUser } = useAppContext();
  const {
    siteListings: listings,
    isFetchingSite: loading,
    fetchSiteListings,
    cancelListing: storeCancelListing,
  } = useListingsStore();

  const [modalVisible, setModalVisible] = React.useState(false);
  const [selectedItems, setSelectedItems] = React.useState<any[]>([]);
  const [selectedListingStatus, setSelectedListingStatus] = React.useState<ListingStatus>('ACTIVE');
  const [cancellingId, setCancellingId] = React.useState<number | null>(null);
  const [listingFilter, setListingFilter] = React.useState<ListingFilter>('all');

  useFocusEffect(
    React.useCallback(() => {
      if (!authUser?.accessToken) return;
      fetchSiteListings().catch((e) =>
        showErrorAlert(e, 'Could not load listings', 'Could not load listings'),
      );
    }, [authUser?.accessToken, fetchSiteListings]),
  );

  const peopleCount = useMemo(
    () => listings.filter((l) => isPeopleListing(l)).length,
    [listings],
  );
  const animalCount = useMemo(
    () => listings.filter((l) => isAnimalListing(l)).length,
    [listings],
  );

  const filteredListings = useMemo(() => {
    if (listingFilter === 'people') return listings.filter((l) => isPeopleListing(l));
    if (listingFilter === 'animals') return listings.filter((l) => isAnimalListing(l));
    return listings;
  }, [listings, listingFilter]);

  const handleCancelListing = (id: number) => {
    if (cancellingId !== null) return;

    Alert.alert(
      'Cancel Listing',
      'Are you sure you want to cancel this listing? This cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            if (cancellingId !== null) return;
            setCancellingId(id);
            try {
              // storeCancelListing cancels then force-refetches the store
              await storeCancelListing(id);
            } catch (error: unknown) {
              showErrorAlert(error, 'Could not cancel listing', 'Failed to cancel listing');
            } finally {
              setCancellingId(null);
            }
          },
        },
      ],
    );
  };

  const openItemsModal = (detail: any) => {
    setSelectedItems(detail.foodItems || []);
    setSelectedListingStatus(detail.status);
    setModalVisible(true);
  };

  const renderFilterChip = (
    key: ListingFilter,
    label: string,
    count: number,
    accent?: string,
    icon?: any,
  ) => {
    const active = listingFilter === key;
    const isPeople = key === 'people';
    const isAnimals = key === 'animals';

    return (
      <Pressable
        key={key}
        onPress={() => setListingFilter(key)}
        style={[
          styles.filterChip,
          active && key === 'all' && styles.filterChipAllActive,
          active && isPeople && { borderColor: palette.kale, backgroundColor: palette.white },
          active && isAnimals && { borderColor: palette.orange, backgroundColor: palette.white },
          !active && styles.filterChipInactive,
        ]}
      >
        {icon ? (
          <Image source={icon} style={styles.filterChipIcon} resizeMode="contain" />
        ) : null}
        <AppText
          variant="bodyBold"
          style={[
            styles.filterChipText,
            active && key === 'all' && { color: palette.midgray },
            active && isPeople && { color: palette.kale },
            active && isAnimals && { color: palette.orange },
            !active && { color: palette.stone },
          ]}
        >
          {label} ({count})
        </AppText>
      </Pressable>
    );
  };

  const renderMetaBox = (
    isAnimal: boolean,
    icon: any,
    label: string,
    content: React.ReactNode,
    layout: MetaBoxLayout = 'half',
  ) => {
    const themeStyles = isAnimal ? metaThemeStyles.animal : metaThemeStyles.people;
    const layoutStyle = layout === 'centered' ? styles.metaBoxCentered : styles.metaBoxHalf;

    return (
      <View style={[styles.metaBox, themeStyles.metaBox, layoutStyle]}>
        <View style={[styles.metaIconWrap, themeStyles.metaIconCircle]}>
          <Image source={icon} style={styles.metaIconImage} resizeMode="contain" />
        </View>
        <View style={styles.metaItemContent}>
          <AppText
            variant="bodyBold"
            color={palette.black}
            style={styles.metaLabelText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {label}
          </AppText>
          {content}
        </View>
      </View>
    );
  };

  const renderListingCard = (item: any) => {
    const theme = getListingTheme(item);
    const isAnimal = getListingAudience(item) === 'animal';
    const metaTheme = isAnimal ? metaThemeStyles.animal : metaThemeStyles.people;
    const collected = isListingCollected(item);
    const expired = isListingExpired(item);
    const active = isListingActive(item);
    const statusLabel = getListingStatusLabel(item);
    const statusBadgeStyle = expired
      ? { backgroundColor: '#FFF1D6', color: palette.warning }
      : { backgroundColor: theme.statusBg, color: theme.accent };

    return (
      <View
        key={item.id}
        style={[
          styles.listingCard,
          { borderColor: theme.border, backgroundColor: theme.cardBg },
        ]}
      >
        {/* Top row: status + category + collected */}
        <View style={styles.cardTopRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusBadgeStyle.backgroundColor }]}>
            <AppText variant="bodyBold" style={{ color: statusBadgeStyle.color }}>
              {statusLabel}
            </AppText>
          </View>

          <View style={styles.cardTopRight}>
            <View style={[styles.categoryBadge, { borderColor: theme.accent }]}>
              <Image source={theme.categoryIcon} style={styles.categoryIcon} resizeMode="contain" />
              <AppText variant="bodyBold" style={{ color: theme.accent }}>
                {theme.categoryLabel}
              </AppText>
            </View>

            {collected ? (
              <View style={styles.collectedWrap}>
                <View style={[styles.collectedIcon, { backgroundColor: theme.accent }]}>
                  <Ionicons name="checkmark" size={normalize(14)} color={palette.white} />
                </View>
                <AppText variant="bodyBold" style={{ color: theme.accent }}>
                  Collected
                </AppText>
              </View>
            ) : null}

            {expired ? (
              <View style={styles.collectedWrap}>
                <View style={[styles.collectedIcon, { backgroundColor: palette.warning }]}>
                  <Ionicons name="time-outline" size={normalize(14)} color={palette.white} />
                </View>
                <AppText variant="bodyBold" style={{ color: palette.warning }}>
                  Expired
                </AppText>
              </View>
            ) : null}
          </View>
        </View>

        {/* Notification */}
        {active ? (
          <AppText variant="bodySmall" color={palette.midgray} style={styles.notificationText}>
            📍 {theme.notification}
          </AppText>
        ) : null}

        <View style={styles.metaSection}>
          <View style={styles.metaTopRow}>
            {renderMetaBox(
              isAnimal,
              META_ICONS.items,
              'Items',
              <Pressable
                style={[styles.viewDetailsBtn, metaTheme.viewDetailsBtn]}
                onPress={() => openItemsModal(item)}
              >
                <AppText variant="bodyBold" style={styles.viewDetailsBtnText} numberOfLines={1} ellipsizeMode="tail">
                  View
                </AppText>
              </Pressable>,
            )}

            {renderMetaBox(
              isAnimal,
              META_ICONS.calendar,
              collected ? 'Collected on' : expired ? 'Expired on' : 'Pickup Date',
              <AppText
                variant="bodySmall"
                color={palette.midgray}
                style={styles.metaValueText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {collected
                  ? formatCollectedOn(item)
                  : expired
                    ? formatExpiredOn(item)
                    : formatPickupDate(item.pickupFromTime || item.createdAt)}
              </AppText>,
            )}
          </View>

          {renderMetaBox(
            isAnimal,
            collected ? META_ICONS.impact : META_ICONS.time,
            collected ? 'Impact' : 'Pickup Time',
            <AppText
              variant="bodySmall"
              color={palette.midgray}
              style={styles.metaValueText}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {collected
                ? getImpactText(item)
                : formatPickupTime(item.pickupFromTime, item.pickupByTime)}
            </AppText>,
            'centered',
          )}
        </View>

        {/* Instructions banner */}
        {active ? (
          <View style={[styles.instructionsBanner, { backgroundColor: theme.bannerBg }]}>
            <AppText variant="caption" color={palette.black} style={styles.instructionsText}>
              INSTRUCTIONS: {buildInstructions(item)}
            </AppText>
          </View>
        ) : null}

        {/* Edit / Cancel */}
        {active ? (
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.outlineBtn, { borderColor: theme.accent }]}
              onPress={() => navigation.navigate('EditListing', { listingId: Number(item.id) })}
            >
              <Ionicons name="create-outline" size={normalize(16)} color={palette.white} />
              <AppText variant="bodyBold" style={{ color: palette.white }}>
                Edit Listing
              </AppText>
            </Pressable>

            <Pressable
              style={[
                styles.outlineBtn,
                styles.cancelOutlineBtn,
                (cancellingId !== null) && { opacity: 0.65 },
              ]}
              disabled={cancellingId !== null}
              onPress={() => handleCancelListing(item.id)}
            >
              <Ionicons name="close-circle-outline" size={normalize(16)} color={palette.white} />
              <AppText variant="bodyBold" style={{ color: palette.white }}>
                {cancellingId === item.id ? 'Cancelling...' : 'Cancel Listing'}
              </AppText>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={hp(14)} borderRadius={0} />
      <View style={styles.skeletonCenter}>
        <Skeleton width={wp(70)} height={normalize(18)} />
      </View>
      <Skeleton width={wp(88)} height={normalize(48)} borderRadius={normalize(12)} style={{ alignSelf: 'center' }} />
      <Skeleton width={wp(88)} height={normalize(48)} borderRadius={normalize(12)} style={{ alignSelf: 'center' }} />
      <Skeleton width={wp(55)} height={normalize(20)} style={{ marginLeft: wp(4), marginTop: hp(1) }} />
      <View style={[styles.filterRow, { paddingHorizontal: wp(4) }]}>
        <Skeleton width={wp(22)} height={normalize(36)} borderRadius={normalize(20)} />
        <Skeleton width={wp(30)} height={normalize(36)} borderRadius={normalize(20)} />
        <Skeleton width={wp(30)} height={normalize(36)} borderRadius={normalize(20)} />
      </View>
      {[1, 2].map((i) => (
        <View key={i} style={[styles.skeletonCard, { marginHorizontal: wp(4) }]}>
          <View style={styles.skeletonRowBetween}>
            <Skeleton width={wp(22)} height={normalize(28)} borderRadius={normalize(6)} />
            <Skeleton width={wp(35)} height={normalize(28)} borderRadius={normalize(8)} />
          </View>
          <Skeleton width="100%" height={normalize(14)} />
          <View style={styles.skeletonMetaSection}>
            <View style={styles.skeletonMetaTopRow}>
              <View style={styles.skeletonMetaHalf}>
                <Skeleton width="100%" height={normalize(56)} borderRadius={normalize(8)} />
              </View>
              <View style={styles.skeletonMetaHalf}>
                <Skeleton width="100%" height={normalize(56)} borderRadius={normalize(8)} />
              </View>
            </View>
            <Skeleton width="100%" height={normalize(56)} borderRadius={normalize(8)} style={styles.skeletonMetaCentered} />
          </View>
          <Skeleton width="100%" height={normalize(32)} borderRadius={normalize(8)} />
          <View style={styles.skeletonRowBetween}>
            <Skeleton width={wp(38)} height={normalize(40)} borderRadius={normalize(10)} />
            <Skeleton width={wp(38)} height={normalize(40)} borderRadius={normalize(10)} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {loading ? (
          renderSkeleton()
        ) : (
          <>
          <ImageBackground
            source={require('../../../assets/placeholder/kale-headera.png')}
            style={styles.headerBg}
            resizeMode="cover"
          >
            <AppText variant="h4" style={styles.headerTitle}> Your Listings </AppText>
          </ImageBackground>


            <View style={styles.subHeaderContainer}>
              <AppText variant="h7" style={styles.heroSubText}>
                TRACK YOUR SURPLUS AND IMPACT
              </AppText>
            </View>

            <Pressable style={styles.createBtn} onPress={() => navigation.navigate('Surplus')}>
              <AppText variant="bodyBold" style={styles.createText}>
                + Create new listing
              </AppText>
              <Ionicons name="arrow-forward" size={normalize(18)} color={palette.white} style={{ marginLeft: wp(35) }} />
            </Pressable>

            <Pressable
              style={styles.historyBtn}
              onPress={() => navigation.navigate('CollectionHistory')}
            >
              <Ionicons name="time-outline" size={normalize(20)} color={palette.kale} />
              <AppText variant="bodyBold" style={styles.historyText}>
                See collection history
              </AppText>
              <Ionicons name="chevron-forward" size={normalize(18)} color={palette.kale} />
            </Pressable>

            <View style={styles.section}>
              <AppText variant="h8" style={styles.sectionTitle}>
                YOUR LISTINGS TODAY
              </AppText>

              <View style={styles.filterRow}>
                {renderFilterChip('all', 'All', listings.length)}
                {renderFilterChip('people', 'For People', peopleCount, palette.kale, PEOPLE_THEME.categoryIcon)}
                {renderFilterChip('animals', 'For Animals', animalCount, palette.orange, ANIMAL_THEME.categoryIcon)}
              </View>

              {filteredListings.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <AppText variant="body1" color={palette.stone} style={{ textAlign: 'center' }}>
                    No listings to show
                  </AppText>
                </View>
              ) : (
                filteredListings.map(renderListingCard)
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopBar}>
              <AppText variant="h6">Listed Food</AppText>
              <Pressable style={styles.closeIconBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={normalize(20)} color={palette.black} />
              </Pressable>
            </View>

            <View style={styles.modalHeaderRow}>
              <AppText variant="bodyBold" style={{ flex: 2 }}>
                Item Name
              </AppText>
              <AppText variant="bodyBold" style={styles.modalCol}>
                Available
              </AppText>
              {selectedListingStatus !== 'ACTIVE' && (
                <AppText variant="bodyBold" style={styles.modalCol}>
                  Claimed
                </AppText>
              )}
            </View>

            {selectedItems?.length ? (
              selectedItems.map((foodItem, idx) => {
                const totalQty = Number(foodItem.totalQtyKg || 0);
                const remainingQty = Number(foodItem.remainingQtyKg || 0);
                const claimedQty = totalQty - remainingQty;

                return (
                  <View key={`${foodItem.name || foodItem.category}-${idx}`} style={styles.modalItemRow}>
                    <AppText variant="bodyBold" style={{ flex: 2 }}>
                      {foodItem.name || foodItem.category}
                    </AppText>
                    <AppText variant="bodySmall" style={styles.modalCol}>
                      {totalQty} kg
                    </AppText>
                    {selectedListingStatus !== 'ACTIVE' && (
                      <AppText variant="bodySmall" style={styles.modalCol}>
                        {claimedQty} kg
                      </AppText>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={{ paddingVertical: hp(1.6) }}>
                <AppText variant="bodySmall">No items available</AppText>
              </View>
            )}

            <View style={{ marginTop: hp(2), gap: hp(1) }}>
              <AppText variant="bodyBold">
                Total Quantity:{' '}
                {selectedItems.reduce((sum, foodItem) => sum + Number(foodItem.totalQtyKg || 0), 0)} kg
              </AppText>
              {selectedListingStatus !== 'ACTIVE' && (
                <AppText variant="bodyBold">
                  Total Claimed:{' '}
                  {selectedItems.reduce(
                    (sum, foodItem) =>
                      sum + (Number(foodItem.totalQtyKg || 0) - Number(foodItem.remainingQtyKg || 0)),
                    0,
                  )}{' '}
                  kg
                </AppText>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: hp(3),
    gap: hp(1.4),
  },

  headerBg: {
    width: '100%',
    height: hp(14),
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    color: palette.white,
    textAlign: 'center',
    fontSize: normalize(24),
    letterSpacing: 0.5,
  },

  subHeaderContainer: {
    alignItems: 'center',
    paddingHorizontal: wp(4),
    marginTop: hp(0.5),
  },

  heroSubText: {
    color: palette.black,
    lineHeight: normalize(22),
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  createBtn: {
    backgroundColor: palette.middlegreen,
    paddingVertical: hp(1.5),
    borderRadius: normalize(12),
    marginHorizontal: wp(6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
  },

  createText: {
    color: palette.white,
    textTransform: 'none',
    alignSelf: 'center',
  },

  historyBtn: {
    backgroundColor: palette.white,
    borderWidth: normalize(1),
    borderColor: palette.kale,
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(4),
    borderRadius: normalize(12),
    marginHorizontal: wp(6),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
  },

  historyText: {
    color: palette.kale,
    flex: 1,
    textTransform: 'none',
  },

  section: {
    gap: hp(1.2),
    marginTop: hp(0.5),
  },

  sectionTitle: {
    marginHorizontal: wp(4),
    fontSize: normalize(18),
    textTransform: 'none',
  },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    paddingHorizontal: wp(4),
    width: '100%',
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingHorizontal: wp(4.5),
    paddingVertical: hp(0.7),
    borderRadius: normalize(8),
    borderWidth: normalize(1),
  },

  filterChipInactive: {
    backgroundColor: '#EFEFEF',
    borderColor: '#D8D8D8',
  },

  filterChipAllActive: {
    backgroundColor: '#EFEFEF',
    borderColor: '#B8B8B8',
  },

  filterChipIcon: {
    width: normalize(16),
    height: normalize(16),
  },

  filterChipText: {
    textTransform: 'none',
    fontSize: normalize(12),
  },

  emptyWrap: {
    paddingVertical: hp(4),
    paddingHorizontal: wp(4),
  },

  listingCard: {
    marginHorizontal: wp(4),
    borderRadius: normalize(12),
    borderWidth: normalize(1),
    padding: wp(3.5),
    gap: hp(1.2),
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: wp(2),
  },

  statusBadge: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: normalize(6),
  },

  cardTopRight: {
    alignItems: 'flex-end',
    gap: hp(0.6),
    flexShrink: 1,
  },

  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: normalize(8),
    borderWidth: normalize(1),
    backgroundColor: palette.white,
  },

  categoryIcon: {
    width: normalize(18),
    height: normalize(18),
  },

  collectedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },

  collectedIcon: {
    width: normalize(22),
    height: normalize(22),
    borderRadius: normalize(11),
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationText: {
    textTransform: 'none',
    lineHeight: normalize(18),
  },

  metaSection: {
    gap: hp(0.8),
  },

  metaTopRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: wp(1.5),
  },

  metaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    borderWidth: normalize(0.5),
    borderRadius: normalize(8),
    backgroundColor: palette.white,
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.7),
    gap: wp(1.5),
  },

  metaBoxPeople: {
    borderColor: '#D9D9D9',
  },

  metaBoxAnimal: {
    borderColor: '#D9D9D9',
  },

  metaBoxHalf: {
    flex: 1,
    minWidth: 0,
  },

  metaBoxCentered: {
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
  },

  metaIconWrap: {
    width: normalize(30),
    height: normalize(30),
    borderRadius: normalize(15),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  metaIconCirclePeople: {
    backgroundColor: '#D8EBDF',
  },

  metaIconCircleAnimal: {
    backgroundColor: '#FFE8CC',
  },

  metaIconImage: {
    width: normalize(20),
    height: normalize(20),
  },

  metaItemContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: hp(0.35),
  },

  metaLabelText: {
    fontSize: normalize(12),
    lineHeight: normalize(15),
    textTransform: 'none',
  },

  metaValueText: {
    fontSize: normalize(12),
    lineHeight: normalize(15),
    textTransform: 'none',
    flexShrink: 1,
  },

  viewDetailsBtn: {
    alignSelf: 'flex-start',
    borderRadius: normalize(999),
    maxWidth: '100%',
    paddingHorizontal: wp(4.5),
    paddingVertical: hp(0.75),
  },

  viewDetailsBtnPeople: {
    backgroundColor: palette.kale,
  },

  viewDetailsBtnAnimal: {
    backgroundColor: palette.orange,
  },

  viewDetailsBtnText: {
    color: palette.white,
    fontSize: normalize(12),
    lineHeight: normalize(13),
    textTransform: 'none',
  },

  instructionsBanner: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: normalize(8),
    borderWidth: normalize(1),
    borderColor: palette.middlegreen,
  },

  instructionsText: {
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  actionRow: {
    flexDirection: 'row',
    gap: wp(2.5),
    marginTop: hp(0.2),
  },

  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.2),
    paddingVertical: hp(1),
    borderRadius: normalize(10),
    borderWidth: normalize(1),
    backgroundColor: palette.middlegreen,
  },

  cancelOutlineBtn: {
    backgroundColor: '#FF0000',
    borderColor: palette.chilli,
  },

  modalHeaderRow: {
    flexDirection: 'row',
    paddingBottom: hp(1),
    borderBottomWidth: 1,
    borderColor: palette.border,
  },

  modalItemRow: {
    flexDirection: 'row',
    paddingVertical: hp(0.6),
  },

  modalCol: {
    flex: 1,
    textAlign: 'center',
  },

  modalWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalCard: {
    backgroundColor: palette.white,
    padding: wp(5),
    borderTopLeftRadius: normalize(26),
    borderTopRightRadius: normalize(24),
    gap: hp(1.6),
    paddingBottom: hp(4),
  },

  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },

  closeIconBtn: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: '#dadbdd',
    justifyContent: 'center',
    alignItems: 'center',
  },

  skeletonWrap: {
    gap: hp(1.4),
  },

  skeletonCenter: {
    alignItems: 'center',
    marginTop: hp(0.5),
  },

  skeletonCard: {
    backgroundColor: palette.white,
    borderRadius: normalize(12),
    padding: hp(1.6),
    gap: hp(1.2),
    borderWidth: normalize(1),
    borderColor: '#E0E0E0',
  },

  skeletonRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  skeletonMetaSection: {
    gap: hp(0.8),
  },

  skeletonMetaTopRow: {
    flexDirection: 'row',
    gap: wp(1.5),
  },

  skeletonMetaHalf: {
    flex: 1,
  },

  skeletonMetaCentered: {
    alignSelf: 'center',
  },
});

const metaThemeStyles = {
  people: {
    metaBox: styles.metaBoxPeople,
    metaIconCircle: styles.metaIconCirclePeople,
    viewDetailsBtn: styles.viewDetailsBtnPeople,
  },
  animal: {
    metaBox: styles.metaBoxAnimal,
    metaIconCircle: styles.metaIconCircleAnimal,
    viewDetailsBtn: styles.viewDetailsBtnAnimal,
  },
};
