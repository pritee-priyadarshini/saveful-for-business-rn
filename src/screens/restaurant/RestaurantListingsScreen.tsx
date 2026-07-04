import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { HeroHeader } from '../../components/HeroHeader';
import { Skeleton } from '../../components/Skeleton';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { useBottomTabPadding } from '@/hooks/useBottomTabPadding';
import { HeaderAddressRow } from '@/components/HeaderAddressRow';

import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import { ListingStatus } from '@/types';
import {
  compareListingsByNewest,
  estimateMealsSaved,
  getListingAudience,
  getListingStatusLabel,
  isAnimalListing,
  isListingActive,
  isListingCancelled,
  isListingCollected,
  isListingExpired,
  isPeopleListing,
  resolveListingStatus,
} from '../../utils/foodListing';
import { showErrorAlert } from '../../utils/apiError';
import { useAppContext } from '../../store/AppContext';
import { useListingsStore } from '../../store/listingsStore';
import { fetchListingDetail } from '../../services/foodListing.service';

type MetaBoxLayout = 'half' | 'centered';
type ListingFilter = 'all' | 'people' | 'animals';
type StatusFilter = 'all' | 'active' | 'expired' | 'collected' | 'cancelled';

const STATUS_FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'all', label: 'All' },
  { key: 'expired', label: 'Expired' },
  { key: 'collected', label: 'Collected' },
  { key: 'cancelled', label: 'Cancelled' },
];

const LISTING_STATUS_PRIORITY: Record<ListingStatus, number> = {
  ACTIVE: 0,
  PARTIAL: 1,
  CLAIMED: 2,
  EXPIRED: 3,
  CANCELLED: 4,
};

function matchesStatusFilter(listing: any, statusFilter: StatusFilter): boolean {
  if (statusFilter === 'all') return true;
  if (statusFilter === 'active') return isListingActive(listing);
  if (statusFilter === 'expired') return isListingExpired(listing);
  if (statusFilter === 'collected') return isListingCollected(listing);
  if (statusFilter === 'cancelled') return isListingCancelled(listing);
  return true;
}

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
  bannerBg: '#F0F8F3',
  cardBg: palette.white,
  border: '#C8E0D2',
  categoryLabel: 'For People',
  categoryIcon: require('../../../assets/placeholder/people_icon.png'),
  notification: 'Nearby charities have been notified',
};

const ANIMAL_THEME: ListingTheme = {
  accent: palette.orange,
  statusBg: '#FFE8CC',
  bannerBg: '#FFF6EC',
  cardBg: palette.white,
  border: '#FDDBB0',
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

function getRemainingKg(listing: any) {
  if (listing?.remainingQtyKg != null) return Number(listing.remainingQtyKg);
  return (listing?.foodItems || []).reduce(
    (sum: number, item: any) => sum + Number(item.remainingQtyKg ?? item.totalQtyKg ?? 0),
    0,
  );
}

function getClaimedKg(listing: any) {
  return Math.max(0, getTotalKg(listing) - getRemainingKg(listing));
}

function formatKg(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function isListingPartial(listing: any) {
  return resolveListingStatus(listing) === 'PARTIAL';
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
  return `${fmt(new Date(from))} – ${fmt(new Date(to))}`;
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
    listing?.needsRefrigeration && 'Needs refrigeration',
    listing?.needsReheating && 'Needs reheating',
    (listing?.containsAllergens || (listing?.allergens?.length ?? 0) > 0) && 'Contains allergens',
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'No special instructions';
}

function getImpactText(listing: any) {
  const totalKg = getTotalKg(listing);
  if (getListingAudience(listing) === 'animal') {
    return `${Math.round(totalKg)} kg feed diverted from landfill`;
  }
  return `~${estimateMealsSaved(totalKg)} meals created`;
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: {
    elevation: 3,
  },
});

export function RestaurantListingsScreen({ navigation }: any) {
  useTransparentStatusBar('light');
  const bottomPadding = useBottomTabPadding(hp(2));
  const { authUser, currentProfile } = useAppContext();
  const {
    siteListings: listings,
    isFetchingSite: loading,
    fetchSiteListings,
    cancelListing: storeCancelListing,
  } = useListingsStore();

  const [modalVisible, setModalVisible] = React.useState(false);
  const [modalLoading, setModalLoading] = React.useState(false);
  const [selectedItems, setSelectedItems] = React.useState<any[]>([]);
  const [selectedListingStatus, setSelectedListingStatus] = React.useState<ListingStatus>('ACTIVE');
  const [cancellingId, setCancellingId] = React.useState<number | null>(null);
  const [listingFilter, setListingFilter] = React.useState<ListingFilter>('all');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('active');

  useFocusEffect(
    React.useCallback(() => {
      if (!authUser?.accessToken) return;
      fetchSiteListings(true).catch((e) =>
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
  const activeCount = useMemo(
    () => listings.filter((l) => isListingActive(l)).length,
    [listings],
  );

  const filteredListings = useMemo(() => {
    let result = listings;
    if (listingFilter === 'people') result = result.filter((l) => isPeopleListing(l));
    else if (listingFilter === 'animals') result = result.filter((l) => isAnimalListing(l));
    result = result.filter((listing) => matchesStatusFilter(listing, statusFilter));
    if (statusFilter === 'all') {
      return [...result].sort((a, b) => {
        const orderDiff =
          LISTING_STATUS_PRIORITY[resolveListingStatus(a)] -
          LISTING_STATUS_PRIORITY[resolveListingStatus(b)];
        if (orderDiff !== 0) return orderDiff;
        return compareListingsByNewest(a, b);
      });
    }
    return [...result].sort(compareListingsByNewest);
  }, [listings, listingFilter, statusFilter]);

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

  const openItemsModal = async (listing: any) => {
    const status = resolveListingStatus(listing);
    setSelectedItems(listing.foodItems || []);
    setSelectedListingStatus(status);
    setModalVisible(true);
    if (status !== 'PARTIAL') return;
    setModalLoading(true);
    try {
      const detail = await fetchListingDetail(listing.id, { refresh: true });
      setSelectedItems(detail.foodItems || []);
      setSelectedListingStatus(resolveListingStatus(detail));
    } catch {
      // Keep the listing snapshot already shown.
    } finally {
      setModalLoading(false);
    }
  };

  const renderAudienceChip = (
    key: ListingFilter,
    label: string,
    count: number,
    icon?: any,
    accent?: string,
  ) => {
    const active = listingFilter === key;
    return (
      <Pressable
        key={key}
        onPress={() => setListingFilter(key)}
        style={[
          styles.audienceChip,
          active
            ? [styles.audienceChipActive, accent ? { borderColor: accent } : {}]
            : styles.audienceChipInactive,
        ]}
      >
        {icon && (
          <Image source={icon} style={styles.audienceChipIcon} resizeMode="contain" />
        )}
        <AppText
          variant="bodyBold"
          numberOfLines={1}
          style={[
            styles.audienceChipText,
            active ? { color: accent || palette.midgray } : { color: palette.stone },
          ]}
        >
          {label}{count > 0 ? ` (${count})` : ''}
        </AppText>
      </Pressable>
    );
  };

  const renderStatusChip = (key: StatusFilter, label: string) => {
    const active = statusFilter === key;
    const accentMap: Record<StatusFilter, string> = {
      active: palette.kale,
      all: palette.midgray,
      expired: palette.warning,
      collected: palette.eggplant,
      cancelled: palette.danger,
    };
    const accent = accentMap[key];
    return (
      <Pressable
        key={key}
        onPress={() => setStatusFilter(key)}
        style={[
          styles.statusChip,
          active
            ? { backgroundColor: accent, borderColor: accent }
            : styles.statusChipInactive,
        ]}
      >
        <AppText
          variant="bodyBold"
          style={[
            styles.statusChipText,
            { color: active ? palette.white : palette.stone },
          ]}
        >
          {label}
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
    const iconBg = isAnimal ? '#FFE8CC' : '#D8EBDF';
    return (
      <View style={[styles.metaBox, layout === 'centered' ? styles.metaBoxFull : styles.metaBoxHalf]}>
        <View style={[styles.metaIconWrap, { backgroundColor: iconBg }]}>
          <Image source={icon} style={styles.metaIconImage} resizeMode="contain" />
        </View>
        <View style={styles.metaItemContent}>
          <AppText
            variant="bodyBold"
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
    const collected = isListingCollected(item);
    const expired = isListingExpired(item);
    const active = isListingActive(item);
    const partial = isListingPartial(item);
    const statusLabel = getListingStatusLabel(item);

    const statusConfig = expired
      ? { bg: '#FFF1D6', color: palette.warning }
      : collected
      ? { bg: '#EEF7F2', color: palette.kale }
      : partial
      ? { bg: '#FFF8E1', color: '#B8860B' }
      : { bg: theme.statusBg, color: theme.accent };

    const viewBtnBg = isAnimal ? palette.orange : palette.kale;

    return (
      <View key={item.id} style={[styles.listingCard, { borderColor: theme.border }]}>

        {/* Card header strip */}
        <View style={[styles.cardHeader, { backgroundColor: theme.bannerBg }]}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <AppText variant="caption" style={[styles.statusBadgeText, { color: statusConfig.color }]}>
              {statusLabel}
            </AppText>
          </View>
          <View style={styles.categoryBadge}>
            <Image source={theme.categoryIcon} style={styles.categoryIcon} resizeMode="contain" />
            <AppText variant="caption" style={[styles.categoryLabel, { color: theme.accent }]}>
              {theme.categoryLabel}
            </AppText>
          </View>
        </View>

        <View style={styles.cardBody}>
          {/* Notification / status message */}
          {active && (
            <View style={styles.notificationRow}>
              <Ionicons name="location" size={normalize(13)} color={theme.accent} />
              <AppText variant="caption" style={[styles.notificationText, { color: theme.accent }]}>
                {theme.notification}
              </AppText>
            </View>
          )}

          {/* Partial claim notice */}
          {partial && (
            <Pressable style={styles.partialNotice} onPress={() => openItemsModal(item)}>
              <Ionicons name="information-circle-outline" size={normalize(15)} color="#B8860B" />
              <AppText variant="caption" style={styles.partialNoticeText}>
                Partially claimed — {formatKg(getClaimedKg(item))} kg taken,{' '}
                {formatKg(getRemainingKg(item))} kg remaining
              </AppText>
              <Ionicons name="chevron-forward" size={normalize(14)} color="#B8860B" />
            </Pressable>
          )}

          {/* Meta grid */}
          <View style={styles.metaSection}>
            <View style={styles.metaTopRow}>
              {renderMetaBox(
                isAnimal,
                META_ICONS.items,
                'Items',
                <Pressable
                  style={[styles.viewDetailsBtn, { backgroundColor: viewBtnBg }]}
                  onPress={() => openItemsModal(item)}
                >
                  <AppText variant="caption" style={styles.viewDetailsBtnText}>
                    {partial ? 'Breakdown' : 'View all'}
                  </AppText>
                </Pressable>,
              )}

              {renderMetaBox(
                isAnimal,
                META_ICONS.calendar,
                collected ? 'Collected on' : expired ? 'Expired on' : 'Pickup date',
                <AppText
                  variant="caption"
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
              collected ? 'Impact' : 'Pickup time',
              <AppText
                variant="caption"
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

          {/* Instructions */}
          {active && (
            <View style={[styles.instructionsBanner, { backgroundColor: theme.bannerBg, borderColor: theme.border }]}>
              <Ionicons name="information-circle-outline" size={normalize(13)} color={theme.accent} />
              <AppText variant="caption" style={[styles.instructionsText, { color: theme.accent }]}>
                {buildInstructions(item)}
              </AppText>
            </View>
          )}

          {/* Action buttons */}
          {active && (
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: theme.accent }]}
                onPress={() => navigation.navigate('EditListing', { listingId: Number(item.id) })}
              >
                <Ionicons name="create-outline" size={normalize(15)} color={palette.white} />
                <AppText variant="bodyBold" style={styles.actionBtnText}>
                  Edit
                </AppText>
              </Pressable>

              <Pressable
                style={[
                  styles.actionBtn,
                  styles.cancelBtn,
                  cancellingId !== null && { opacity: 0.6 },
                ]}
                disabled={cancellingId !== null}
                onPress={() => handleCancelListing(item.id)}
              >
                <Ionicons name="close-circle-outline" size={normalize(15)} color={palette.white} />
                <AppText variant="bodyBold" style={styles.actionBtnText}>
                  {cancellingId === item.id ? 'Cancelling…' : 'Cancel'}
                </AppText>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={hp(20)} borderRadius={0} />
      <View style={styles.skeletonContent}>
        <Skeleton width={wp(55)} height={normalize(18)} borderRadius={normalize(6)} />
        <Skeleton width="100%" height={normalize(56)} borderRadius={normalize(16)} />
        <Skeleton width="100%" height={normalize(52)} borderRadius={normalize(16)} />
        <Skeleton width={wp(40)} height={normalize(18)} borderRadius={normalize(6)} />
        <View style={styles.skeletonChipRow}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width={wp(26)} height={normalize(34)} borderRadius={normalize(20)} />
          ))}
        </View>
        <View style={styles.skeletonChipRow}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width={wp(18)} height={normalize(32)} borderRadius={normalize(20)} />
          ))}
        </View>
        {[1, 2].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <Skeleton width="100%" height={normalize(40)} borderRadius={0} />
            <View style={{ padding: wp(4), gap: hp(1.2) }}>
              <Skeleton width="70%" height={normalize(14)} />
              <View style={styles.skeletonMetaRow}>
                <Skeleton width="48%" height={normalize(56)} borderRadius={normalize(10)} />
                <Skeleton width="48%" height={normalize(56)} borderRadius={normalize(10)} />
              </View>
              <Skeleton width="100%" height={normalize(56)} borderRadius={normalize(10)} />
              <Skeleton width="100%" height={normalize(32)} borderRadius={normalize(10)} />
              <View style={styles.skeletonMetaRow}>
                <Skeleton width="48%" height={normalize(40)} borderRadius={normalize(12)} />
                <Skeleton width="48%" height={normalize(40)} borderRadius={normalize(12)} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <Screen scrollable={false} backgroundColor={palette.creme} transparentTop>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          renderSkeleton()
        ) : (
          <>
            <HeroHeader
              source={require('../../../assets/placeholder/kale-header.png')}
              height={hp(20)}
            >
             
              <View style={styles.heroContent}>
                <View style={styles.heroTopRow}>
                  <View style={styles.heroTextBlock}>
                    <AppText variant="caption" style={styles.heroEyebrow} numberOfLines={1}>
                      {currentProfile.organization || 'Your business'}
                    </AppText>
                    <AppText variant="h6" style={styles.heroTitle} numberOfLines={1}>
                      Your listings
                    </AppText>
                    <AppText variant="bodySmall" style={styles.heroSubtitle} numberOfLines={2}>
                      Track surplus food, pickups, and your impact
                    </AppText>
                    {!!currentProfile.address && (
                      <HeaderAddressRow
                        address={currentProfile.address}
                        iconSize={normalize(14)}
                        style={styles.heroAddressRow}
                        textStyle={styles.heroAddressText}
                      />
                    )}
                  </View>

                  <View style={styles.heroIconCircle}>
                    <Image
                      source={META_ICONS.items}
                      style={styles.heroIconImage}
                      resizeMode="contain"
                    />
                  </View>
                </View>

                <View style={styles.heroStatsPill}>
                  <Ionicons name="layers-outline" size={normalize(14)} color={palette.white} />
                  <AppText variant="caption" style={styles.heroStatsText} numberOfLines={1}>
                    {activeCount} active · {listings.length} total
                  </AppText>
                </View>
              </View>
            </HeroHeader>

            <View style={styles.mainContent}>
              {/* CTA cards */}
              <Pressable
                style={({ pressed }) => [styles.createBtn, pressed && styles.pressed]}
                onPress={() => navigation.navigate('Surplus')}
              >
                <View style={styles.createBtnLeft}>
                  <View style={styles.createBtnIconWrap}>
                    <Ionicons name="add" size={normalize(20)} color={palette.white} />
                  </View>
                  <AppText variant="bodyBold" style={styles.createBtnText}>
                    Create new listing
                  </AppText>
                </View>
                <View style={styles.createBtnArrow}>
                  <Ionicons name="arrow-forward" size={normalize(16)} color={palette.white} />
                </View>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.historyBtn, pressed && styles.pressed]}
                onPress={() => navigation.navigate('CollectionHistory')}
              >
                <View style={styles.historyBtnLeft}>
                  <Ionicons name="time-outline" size={normalize(18)} color={palette.eggplant} />
                  <AppText variant="bodyBold" style={styles.historyBtnText}>
                    Collection history
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={normalize(16)} color={palette.eggplant} />
              </Pressable>

              {/* Listings section */}
              <View style={styles.section}>
                {/* Audience filter */}
                <View style={styles.filterRow}>
                  {renderAudienceChip('all', 'All', listings.length)}
                  {renderAudienceChip('people', 'People', peopleCount, PEOPLE_THEME.categoryIcon, palette.kale)}
                  {renderAudienceChip('animals', 'Animals', animalCount, ANIMAL_THEME.categoryIcon, palette.orange)}
                </View>

                {/* Status filter */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.statusFilterRow}
                >
                  {STATUS_FILTER_OPTIONS.map((o) => renderStatusChip(o.key, o.label))}
                </ScrollView>

                {/* Listings */}
                {filteredListings.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Ionicons name="file-tray-outline" size={normalize(36)} color={palette.strokecream} />
                    <AppText variant="bodySmall" color={palette.stone} style={styles.emptyText}>
                      No listings match this filter
                    </AppText>
                    <Pressable onPress={() => { setListingFilter('all'); setStatusFilter('all'); }}>
                      <AppText variant="bodyBold" color={palette.kale} style={styles.emptyReset}>
                        Clear filters
                      </AppText>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.listingsGap}>
                    {filteredListings.map(renderListingCard)}
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Items modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalWrap}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTopBar}>
              <AppText variant="h6" style={styles.modalTitle}>
                {selectedListingStatus === 'PARTIAL' ? 'Claim breakdown' : 'Listed food'}
              </AppText>
              <Pressable style={styles.closeIconBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={normalize(18)} color={palette.black} />
              </Pressable>
            </View>

            {selectedListingStatus === 'PARTIAL' && (
              <AppText variant="caption" style={styles.modalSubtitle}>
                How much has been claimed and what is still available per item.
              </AppText>
            )}

            {modalLoading ? (
              <View style={styles.modalLoadingWrap}>
                <AppText variant="caption" color={palette.stone} style={styles.modalLoadingText}>Loading latest quantities…</AppText>
              </View>
            ) : (
              <>
                <View style={styles.modalHeaderRow}>
                  <AppText variant="bodyBold" style={styles.modalColName}>Item</AppText>
                  {selectedListingStatus === 'PARTIAL' ? (
                    <>
                      <AppText variant="bodyBold" style={styles.modalCol}>Claimed</AppText>
                      <AppText variant="bodyBold" style={styles.modalCol}>Remaining</AppText>
                    </>
                  ) : (
                    <AppText variant="bodyBold" style={styles.modalCol}>Quantity</AppText>
                  )}
                </View>

                {selectedItems?.length ? (
                  selectedItems.map((foodItem, idx) => {
                    const totalQty = Number(foodItem.totalQtyKg || 0);
                    const remainingQty = Number(foodItem.remainingQtyKg ?? totalQty);
                    const claimedQty = Math.max(0, totalQty - remainingQty);
                    return (
                      <View key={`${foodItem.name || foodItem.category}-${idx}`} style={styles.modalItemRow}>
                        <AppText variant="bodyBold" style={styles.modalColName}>
                          {foodItem.name || foodItem.category}
                        </AppText>
                        {selectedListingStatus === 'PARTIAL' ? (
                          <>
                            <AppText variant="bodySmall" style={[styles.modalCol, styles.modalClaimedText]}>
                              {formatKg(claimedQty)} kg
                            </AppText>
                            <AppText variant="bodySmall" style={[styles.modalCol, styles.modalRemainingText]}>
                              {formatKg(remainingQty)} kg
                            </AppText>
                          </>
                        ) : (
                          <AppText variant="bodySmall" style={styles.modalCol}>
                            {formatKg(totalQty)} kg
                          </AppText>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.modalEmptyWrap}>
                    <AppText variant="caption" color={palette.stone} style={styles.modalEmptyText}>No items available</AppText>
                  </View>
                )}

                <View style={styles.modalDivider} />
                <View style={styles.modalTotals}>
                  {selectedListingStatus === 'PARTIAL' ? (
                    <>
                      <View style={styles.modalTotalRow}>
                        <AppText variant="bodyBold" color={palette.stone}>Total claimed</AppText>
                        <AppText variant="bodyBold" style={styles.modalClaimedText}>
                          {formatKg(
                            selectedItems.reduce(
                              (sum, fi) =>
                                sum + Math.max(0, Number(fi.totalQtyKg || 0) - Number(fi.remainingQtyKg ?? fi.totalQtyKg ?? 0)),
                              0,
                            ),
                          )} kg
                        </AppText>
                      </View>
                      <View style={styles.modalTotalRow}>
                        <AppText variant="bodyBold" color={palette.stone}>Total remaining</AppText>
                        <AppText variant="bodyBold" style={styles.modalRemainingText}>
                          {formatKg(
                            selectedItems.reduce(
                              (sum, fi) => sum + Number(fi.remainingQtyKg ?? fi.totalQtyKg ?? 0),
                              0,
                            ),
                          )} kg
                        </AppText>
                      </View>
                    </>
                  ) : (
                    <View style={styles.modalTotalRow}>
                      <AppText variant="bodyBold" color={palette.stone}>Total quantity</AppText>
                      <AppText variant="bodyBold">
                        {formatKg(selectedItems.reduce((sum, fi) => sum + Number(fi.totalQtyKg || 0), 0))} kg
                      </AppText>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    marginTop: -hp(1),
  },

  heroContent: {
    flex: 1,
    paddingHorizontal: wp(5),
    justifyContent: 'flex-end',
    paddingBottom: hp(3),
    gap: hp(1.2),
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: wp(3),
  },

  heroTextBlock: {
    flex: 1,
    gap: hp(0.3),
    minWidth: 0,
    paddingBottom: hp(0.2),
  },

  heroEyebrow: {
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'none',
    letterSpacing: 0.3,
    fontSize: normalize(13),
  },

  heroTitle: {
    color: palette.white,
    textTransform: 'none',
    fontSize: normalize(30),
    lineHeight: normalize(38),
  },

  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'none',
    fontSize: normalize(15),
    lineHeight: normalize(22),
  },

  heroAddressRow: {
    marginTop: hp(0.8),
  },

  heroAddressText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: normalize(13),
    lineHeight: normalize(18),
    opacity: 1,
  },

  heroIconCircle: {
    width: normalize(52),
    height: normalize(52),
    borderRadius: normalize(26),
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  heroIconImage: {
    width: normalize(30),
    height: normalize(30),
  },

  heroStatsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: wp(1.5),
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingVertical: hp(0.6),
    paddingHorizontal: wp(3),
    borderRadius: normalize(20),
    maxWidth: '100%',
  },

  heroStatsText: {
    color: palette.white,
    flexShrink: 1,
    textTransform: 'none',
    fontSize: normalize(13),
  },

  mainContent: {
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    gap: hp(1.8),
    paddingBottom: hp(1),
  },

  createBtn: {
    backgroundColor: palette.eggplant,
    borderRadius: normalize(16),
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: palette.eggplant,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: { elevation: 5 },
    }),
  },

  createBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },

  createBtnIconWrap: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(16),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  createBtnText: {
    color: palette.white,
    textTransform: 'none',
    fontSize: normalize(17),
  },

  createBtnArrow: {
    width: normalize(28),
    height: normalize(28),
    borderRadius: normalize(14),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  historyBtn: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.strokecream,
    borderRadius: normalize(16),
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...cardShadow,
  },

  historyBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },

  historyBtnText: {
    color: palette.eggplant,
    textTransform: 'none',
    fontSize: normalize(17),
  },

  section: {
    gap: hp(1.4),
  },

  filterRow: {
    flexDirection: 'row',
    gap: wp(2),
  },

  audienceChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    paddingVertical: hp(1.15),
    paddingHorizontal: wp(2),
    borderRadius: normalize(10),
    borderWidth: 1,
    minHeight: normalize(40),
  },

  audienceChipActive: {
    backgroundColor: palette.white,
    ...cardShadow,
  },

  audienceChipInactive: {
    backgroundColor: 'transparent',
    borderColor: palette.strokecream,
  },

  audienceChipIcon: {
    width: normalize(17),
    height: normalize(17),
  },

  audienceChipText: {
    fontSize: normalize(13),
    lineHeight: normalize(18),
    textTransform: 'none',
    flexShrink: 1,
  },

  statusFilterRow: {
    flexDirection: 'row',
    gap: wp(2),
    paddingVertical: hp(0.3),
  },

  statusChip: {
    paddingVertical: hp(0.95),
    paddingHorizontal: wp(4),
    borderRadius: normalize(20),
    borderWidth: 1,
    minHeight: normalize(36),
    justifyContent: 'center',
  },

  statusChipInactive: {
    backgroundColor: palette.white,
    borderColor: palette.strokecream,
  },

  statusChipText: {
    fontSize: normalize(14),
    lineHeight: normalize(19),
    textTransform: 'none',
  },

  listingsGap: {
    gap: hp(1.8),
  },

  listingCard: {
    borderRadius: normalize(20),
    borderWidth: 1,
    backgroundColor: palette.white,
    overflow: 'hidden',
    ...cardShadow,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    gap: wp(2),
    minHeight: normalize(40),
  },

  statusBadge: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.55),
    borderRadius: normalize(6),
  },

  statusBadgeText: {
    fontWeight: '700',
    textTransform: 'none',
    fontSize: normalize(13),
    lineHeight: normalize(18),
  },

  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    backgroundColor: palette.white,
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.55),
    borderRadius: normalize(8),
  },

  categoryIcon: {
    width: normalize(18),
    height: normalize(18),
  },

  categoryLabel: {
    fontSize: normalize(13),
    lineHeight: normalize(18),
    fontWeight: '600',
    textTransform: 'none',
  },

  cardBody: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1.2),
    paddingBottom: hp(1.6),
    gap: hp(1.2),
  },

  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },

  notificationText: {
    fontSize: normalize(14),
    textTransform: 'none',
    flexShrink: 1,
  },

  partialNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    backgroundColor: '#FFFBF0',
    borderWidth: 1,
    borderColor: '#EDDBA0',
    borderRadius: normalize(12),
  },

  partialNoticeText: {
    flex: 1,
    color: '#8A6D1D',
    lineHeight: normalize(20),
    textTransform: 'none',
    fontSize: normalize(13),
  },

  metaSection: {
    gap: hp(0.8),
  },

  metaTopRow: {
    flexDirection: 'row',
    gap: wp(2),
  },

  metaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: normalize(10),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(1.1),
    gap: wp(2),
    minHeight: normalize(56),
  },

  metaBoxHalf: {
    flex: 1,
    minWidth: 0,
  },

  metaBoxFull: {
    width: '100%',
  },

  metaIconWrap: {
    width: normalize(28),
    height: normalize(28),
    borderRadius: normalize(14),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  metaIconImage: {
    width: normalize(18),
    height: normalize(18),
  },

  metaItemContent: {
    flex: 1,
    minWidth: 0,
    gap: hp(0.3),
  },

  metaLabelText: {
    fontSize: normalize(13),
    lineHeight: normalize(18),
    textTransform: 'none',
    color: palette.midgray,
  },

  metaValueText: {
    fontSize: normalize(14),
    textTransform: 'none',
    color: palette.black,
    lineHeight: normalize(20),
    flexShrink: 1,
  },

  viewDetailsBtn: {
    alignSelf: 'flex-start',
    borderRadius: normalize(20),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.55),
    minHeight: normalize(28),
    justifyContent: 'center',
  },

  viewDetailsBtnText: {
    color: palette.white,
    fontSize: normalize(13),
    lineHeight: normalize(18),
    fontWeight: '700',
    textTransform: 'none',
  },

  instructionsBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.9),
    borderRadius: normalize(10),
    borderWidth: 1,
  },

  instructionsText: {
    flex: 1,
    fontSize: normalize(14),
    textTransform: 'none',
    lineHeight: normalize(19),
  },

  actionRow: {
    flexDirection: 'row',
    gap: wp(2.5),
    marginTop: hp(0.4),
  },

  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    paddingVertical: hp(1.1),
    borderRadius: normalize(12),
  },

  cancelBtn: {
    backgroundColor: palette.danger,
  },

  actionBtnText: {
    color: palette.white,
    textTransform: 'none',
    fontSize: normalize(15),
  },

  emptyWrap: {
    paddingVertical: hp(5),
    alignItems: 'center',
    gap: hp(1.2),
  },

  emptyText: {
    textAlign: 'center',
    textTransform: 'none',
    fontSize: normalize(15),
    lineHeight: normalize(22),
  },

  emptyReset: {
    textTransform: 'none',
    fontSize: normalize(15),
    marginTop: hp(0.4),
  },

  pressed: {
    opacity: 0.82,
  },

  // Skeleton
  skeletonWrap: {
    flex: 1,
  },

  skeletonContent: {
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    gap: hp(1.6),
  },

  skeletonChipRow: {
    flexDirection: 'row',
    gap: wp(2),
  },

  skeletonCard: {
    backgroundColor: palette.white,
    borderRadius: normalize(20),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.strokecream,
  },

  skeletonMetaRow: {
    flexDirection: 'row',
    gap: wp(2),
  },

  // Modal
  modalWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  modalCard: {
    backgroundColor: palette.white,
    paddingHorizontal: wp(5),
    paddingTop: hp(1),
    paddingBottom: hp(4),
    borderTopLeftRadius: normalize(28),
    borderTopRightRadius: normalize(28),
    gap: hp(1.4),
  },

  modalHandle: {
    width: wp(10),
    height: normalize(4),
    borderRadius: normalize(2),
    backgroundColor: palette.strokecream,
    alignSelf: 'center',
    marginBottom: hp(0.5),
  },

  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalTitle: {
    textTransform: 'none',
    fontSize: normalize(20),
  },

  closeIconBtn: {
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(17),
    backgroundColor: '#EBEBEB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalSubtitle: {
    color: palette.stone,
    fontSize: normalize(14),
    lineHeight: normalize(20),
    textTransform: 'none',
    marginTop: -hp(0.5),
  },

  modalHeaderRow: {
    flexDirection: 'row',
    paddingBottom: hp(0.8),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.strokecream,
  },

  modalItemRow: {
    flexDirection: 'row',
    paddingVertical: hp(0.7),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },

  modalCol: {
    flex: 1,
    textAlign: 'center',
    textTransform: 'none',
    fontSize: normalize(14),
  },

  modalColName: {
    flex: 2,
    textTransform: 'none',
    fontSize: normalize(14),
  },

  modalClaimedText: {
    color: '#B8860B',
  },

  modalRemainingText: {
    color: palette.kale,
  },

  modalEmptyWrap: {
    paddingVertical: hp(2),
    alignItems: 'center',
  },

  modalLoadingWrap: {
    paddingVertical: hp(3),
    alignItems: 'center',
  },

  modalLoadingText: {
    fontSize: normalize(14),
    textTransform: 'none',
  },

  modalEmptyText: {
    fontSize: normalize(14),
    textTransform: 'none',
  },

  modalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.strokecream,
    marginVertical: hp(0.4),
  },

  modalTotals: {
    gap: hp(0.8),
  },

  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: normalize(15),
  },
});
