import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ImageBackground,
  Modal,
  Dimensions,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Skeleton } from '../../components/Skeleton';
import { palette } from '../../theme/colors';
import { foodListingService } from '@/services/foodListing.service';
import { estimateMealsSaved } from '../../utils/foodListing';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH_INDEX = new Date().getMonth();

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STAT_ICONS = {
  redistributed: require('../../../assets/placeholder/veggie_basket_icon.png'),
  meals: require('../../../assets/placeholder/cutlery_icon.png'),
  collections: require('../../../assets/placeholder/truck_icon.png'),
};

const META_ICONS = {
  calendar: require('../../../assets/placeholder/clock_icon.png'),
  basket: require('../../../assets/placeholder/veggie_basket_icon.png'),
  meal: require('../../../assets/placeholder/meal_icon.png'),
  leaf: require('../../../assets/placeholder/co2_orange_icon.png'),
};

const PEOPLE_FILTER_ICON = require('../../../assets/placeholder/people_icon.png');
const ANIMAL_FILTER_ICON = require('../../../assets/placeholder/cow_front.png');

type AudienceFilter = 'all' | 'people' | 'animals';
type StatusFilter = 'all' | 'completed' | 'cancelled';
type CardTheme = 'people' | 'animal' | 'cancelled';

type DropdownAnchor = {
  top: number;
  left: number;
  width: number;
};

type ThemeStyleSet = {
  sectionCard: ViewStyle;
  statMiniCard: ViewStyle;
  statValue: TextStyle;
  collectionCard: ViewStyle;
  statusBadge: ViewStyle;
  accentText: TextStyle;
  categoryBadge: ViewStyle;
  metaBox: ViewStyle;
  metaIconCircle: ViewStyle;
  viewDetailsBtn: ViewStyle;
  viewDetailsText: TextStyle;
  accentColor: string;
};

const getMonthsForYear = (year: string) => {
  if (year === 'All') return ['All'];
  const y = parseInt(year, 10);
  if (y === CURRENT_YEAR) return ['All', ...MONTHS.slice(0, CURRENT_MONTH_INDEX + 1)];
  return ['All', ...MONTHS];
};

function isAnimalListing(listing: any) {
  return listing?.isSafeForDonation === false;
}

function isCancelledListing(listing: any) {
  const status = String(listing?.status || '').toUpperCase();
  return status === 'CANCELLED' || status === 'EXPIRED';
}

function isCompletedListing(listing: any) {
  if (isCancelledListing(listing)) return false;
  const status = String(listing?.status || '').toUpperCase();
  const claimStatus = String(listing?.claimStatus || '').toLowerCase();
  return (
    ['CLAIMED', 'COMPLETED'].includes(status) ||
    ['collected', 'completed', 'verified'].includes(claimStatus)
  );
}

function getCardTheme(listing: any): CardTheme {
  if (isCancelledListing(listing)) return 'cancelled';
  return isAnimalListing(listing) ? 'animal' : 'people';
}

function getTotalKg(listing: any) {
  return (listing?.foodItems || []).reduce(
    (sum: number, item: any) => sum + Number(item.totalQtyKg || 0),
    0,
  );
}

function formatShortDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function formatShortTime(value?: string | null) {
  if (!value) return '';
  return new Date(value)
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(' ', '')
    .toLowerCase();
}

function getCollectedDate(listing: any) {
  return formatShortDate(
    listing?.collectedAt || listing?.updatedAt || listing?.pickupFromTime || listing?.createdAt,
  );
}

function getCollectedTime(listing: any) {
  return formatShortTime(
    listing?.collectedAt || listing?.updatedAt || listing?.pickupFromTime || listing?.createdAt,
  );
}

function getOrgName(listing: any) {
  if (isCancelledListing(listing)) return 'No collector accepted';
  return (
    listing?.foodClaims?.[0]?.charityName ||
    listing?.foodClaims?.[0]?.farmName ||
    listing?.foodClaims?.[0]?.claimerName ||
    'Unknown collector'
  );
}

export default function CollectionHistoryScreen({ navigation }: any) {
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [impactModalVisible, setImpactModalVisible] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearDropdownAnchor, setYearDropdownAnchor] = useState<DropdownAnchor | null>(null);
  const [monthDropdownAnchor, setMonthDropdownAnchor] = useState<DropdownAnchor | null>(null);
  const yearDropdownRef = useRef<View>(null);
  const monthDropdownRef = useRef<View>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await foodListingService.getListings({ page: 1, limit: 200 });
      setHistory((res as any).data?.listings || []);
    } catch (error) {
      console.log('history fetch failed', error);
    } finally {
      setLoading(false);
    }
  };

  const months = getMonthsForYear(selectedYear);

  const years = useMemo(() => {
    const uniqueYears = [
      ...new Set(history.map((item) => new Date(item.createdAt).getFullYear().toString())),
    ];
    uniqueYears.sort((a, b) => Number(b) - Number(a));
    return ['All', ...uniqueYears];
  }, [history]);

  const peopleCount = useMemo(
    () => history.filter((item) => !isAnimalListing(item)).length,
    [history],
  );
  const animalCount = useMemo(
    () => history.filter((item) => isAnimalListing(item)).length,
    [history],
  );

  const totals = useMemo(() => {
    const completed = history.filter((item) => isCompletedListing(item));
    const totalKg = completed.reduce((sum, item) => sum + getTotalKg(item), 0);
    const peopleKg = completed
      .filter((item) => !isAnimalListing(item))
      .reduce((sum, item) => sum + getTotalKg(item), 0);
    return {
      redistributedKg: Math.round(totalKg),
      mealsCreated: estimateMealsSaved(peopleKg),
      collectionsCompleted: completed.length,
    };
  }, [history]);

  const filteredData = useMemo(() => {
    return history
      .filter((item) => {
        const date = new Date(item.createdAt);
        const itemMonth = date.toLocaleString('default', { month: 'short' });
        const itemYear = date.getFullYear().toString();
        const yearMatch = selectedYear === 'All' || itemYear === selectedYear;
        const monthMatch = selectedMonth === 'All' || itemMonth === selectedMonth;
        const audienceMatch =
          audienceFilter === 'all' ||
          (audienceFilter === 'people' && !isAnimalListing(item)) ||
          (audienceFilter === 'animals' && isAnimalListing(item));
        const statusMatch =
          statusFilter === 'all' ||
          (statusFilter === 'completed' && isCompletedListing(item)) ||
          (statusFilter === 'cancelled' && isCancelledListing(item));
        return yearMatch && monthMatch && audienceMatch && statusMatch;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [history, selectedMonth, selectedYear, audienceFilter, statusFilter]);

  const openDetailsModal = (item: any) => {
    setSelectedItems(item.foodItems || []);
    setSelectedStatus(item.status);
    setModalVisible(true);
  };

  const closeDropdowns = () => {
    setShowYearDropdown(false);
    setShowMonthDropdown(false);
    setYearDropdownAnchor(null);
    setMonthDropdownAnchor(null);
  };

  const openYearDropdown = () => {
    if (showYearDropdown) {
      closeDropdowns();
      return;
    }

    setShowMonthDropdown(false);
    setMonthDropdownAnchor(null);
    yearDropdownRef.current?.measureInWindow((x, y, width, height) => {
      setYearDropdownAnchor({ top: y + height + hp(0.4), left: x, width });
      setShowYearDropdown(true);
    });
  };

  const openMonthDropdown = () => {
    if (showMonthDropdown) {
      closeDropdowns();
      return;
    }

    setShowYearDropdown(false);
    setYearDropdownAnchor(null);
    monthDropdownRef.current?.measureInWindow((x, y, width, height) => {
      setMonthDropdownAnchor({ top: y + height + hp(0.4), left: x, width });
      setShowMonthDropdown(true);
    });
  };

  const renderDropdownModal = (
    visible: boolean,
    anchor: DropdownAnchor | null,
    items: string[],
    onSelect: (value: string) => void,
  ) => (
    <Modal visible={visible && !!anchor} transparent animationType="fade" onRequestClose={closeDropdowns}>
      <View style={styles.dropdownModalRoot}>
        <Pressable style={styles.dropdownBackdropPressable} onPress={closeDropdowns} />
        {anchor ? (
          <View
            style={[
              styles.dropdownListOverlay,
              styles.dropdownListOverlayPosition,
              {
                top: anchor.top,
                left: anchor.left,
                width: anchor.width,
              },
            ]}
          >
            {items.map((item, index) => (
              <Pressable
                key={item}
                style={[styles.dropdownItem, index === items.length - 1 && styles.dropdownItemLast]}
                onPress={() => onSelect(item)}
              >
                <AppText variant="bodySmall" style={styles.dropdownItemText}>
                  {item}
                </AppText>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </Modal>
  );

  const renderScreenHeader = () => (
    <ImageBackground
      source={require('../../../assets/placeholder/kale-headera.png')}
      resizeMode="cover"
      style={styles.header}
    >
      <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={normalize(22)} color={palette.white} />
      </Pressable>

      <AppText variant="h4" style={styles.headerTitle}>
        COLLECTION HISTORY
      </AppText>
    </ImageBackground>
  );

  const renderMetaBox = (
    cardTheme: CardTheme,
    icon: any,
    label: string,
    primary: string,
    secondary?: string,
  ) => {
    const ts = themeStyles[cardTheme];
    return (
      <View style={[styles.metaBox, ts.metaBox]}>
        <View style={[styles.metaIconWrap, ts.metaIconCircle]}>
          <Image source={icon} style={styles.metaIconImage} resizeMode="contain" />
        </View>
        <View style={styles.metaBoxContent}>
          <AppText variant="bodyBold" style={styles.metaLabelText} numberOfLines={1} ellipsizeMode="tail">
            {label}
          </AppText>
          <AppText variant="bodyBold" style={styles.metaPrimaryText} numberOfLines={1} ellipsizeMode="tail">
            {primary}
          </AppText>
          {secondary ? (
            <AppText variant="bodySmall" style={styles.metaSecondaryText} numberOfLines={1} ellipsizeMode="tail">
              {secondary}
            </AppText>
          ) : null}
        </View>
      </View>
    );
  };

  const renderStatCard = (icon: any, value: string, label: string) => (
    <View style={[styles.statMiniCard, themeStyles.people.statMiniCard]}>
      <Image source={icon} style={styles.statIcon} resizeMode="contain" />
      <AppText variant="h7" style={[styles.statValue, themeStyles.people.statValue]} numberOfLines={1} ellipsizeMode="tail">
        {value}
      </AppText>
      <AppText variant="bodyBold" style={styles.statLabel} numberOfLines={2} ellipsizeMode="tail">
        {label}
      </AppText>
    </View>
  );

  const renderFilterChip = (key: AudienceFilter, label: string, count: number, icon?: any) => {
    const active = audienceFilter === key;

    return (
      <Pressable
        key={key}
        onPress={() => setAudienceFilter(key)}
        style={[styles.filterChip, active ? styles.filterChipActive : styles.filterChipInactive]}
      >
        {icon ? <Image source={icon} style={styles.filterChipIcon} resizeMode="contain" /> : null}
        <AppText
          variant="bodyBold"
          style={[
            styles.filterChipText,
            active ? styles.filterChipTextActive : styles.filterChipTextInactive,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {label} ({count})
        </AppText>
      </Pressable>
    );
  };

  const renderStatusChip = (key: Exclude<StatusFilter, 'all'>, label: string, iconName: keyof typeof Ionicons.glyphMap) => {
    const active = statusFilter === key;

    return (
      <Pressable
        key={key}
        onPress={() => setStatusFilter(active ? 'all' : key)}
        style={[styles.filterChip, active ? styles.filterChipActive : styles.filterChipInactive]}
      >
        <Ionicons
          name={iconName}
          size={normalize(14)}
          color={active ? palette.white : palette.stone}
        />
        <AppText
          variant="bodyBold"
          style={[
            styles.filterChipText,
            active ? styles.filterChipTextActive : styles.filterChipTextInactive,
          ]}
          numberOfLines={1}
        >
          {label}
        </AppText>
      </Pressable>
    );
  };

  const renderCollectionCard = (item: any) => {
    const cardTheme = getCardTheme(item);
    const ts = themeStyles[cardTheme];
    const cancelled = cardTheme === 'cancelled';
    const animal = cardTheme === 'animal';
    const totalKg = getTotalKg(item);
    const meals = estimateMealsSaved(totalKg);
    const co2 = Math.round(totalKg * 4);
    const collectedDate = getCollectedDate(item);
    const collectedTime = getCollectedTime(item);
    const collectedInline = collectedTime ? `${collectedDate} • ${collectedTime}` : collectedDate;
    const statusLabel = cancelled ? 'Cancelled' : 'Completed';
    const categoryLabel = animal ? 'For Animals' : 'For People';
    const categoryIcon = animal
      ? require('../../../assets/placeholder/cow_front.png')
      : require('../../../assets/placeholder/people_icon.png');

    return (
      <View style={[styles.collectionCard, ts.collectionCard]}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardTopLeft}>
            <View style={[styles.statusBadge, ts.statusBadge]}>
              <AppText variant="bodyBold" style={[styles.badgeText, ts.accentText]}>
                {statusLabel}
              </AppText>
            </View>
            {!cancelled ? (
              <View style={[styles.categoryBadge, ts.categoryBadge]}>
                <Image source={categoryIcon} style={styles.categoryIcon} resizeMode="contain" />
                <AppText variant="bodyBold" style={[styles.badgeText, ts.accentText]}>
                  {categoryLabel}
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText variant="bodyBold" style={styles.orgNameText} numberOfLines={1}>
            {getOrgName(item)}
          </AppText>
        </View>

        <View style={[styles.metaRow, cancelled && styles.metaRowCancelled]}>
          {cancelled ? (
            <>
              {renderMetaBox(
                cardTheme,
                META_ICONS.calendar,
                'Date',
                formatShortDate(item.pickupFromTime || item.createdAt),
              )}
              {renderMetaBox(cardTheme, META_ICONS.basket, 'Food Amount', `${Math.round(totalKg)} kg`)}
            </>
          ) : (
            <View style={styles.metaRowsWrap}>
              <View style={styles.metaRowSingle}>
                {renderMetaBox(
                  cardTheme,
                  META_ICONS.calendar,
                  'Collected',
                  collectedInline,
                )}
              </View>
              <View style={styles.metaRowDouble}>
                {renderMetaBox(
                  cardTheme,
                  META_ICONS.basket,
                  animal ? 'Avoid landfill' : 'Food saved',
                  `${Math.round(totalKg)} kg`,
                )}
                {renderMetaBox(
                  cardTheme,
                  animal ? META_ICONS.leaf : META_ICONS.meal,
                  animal ? 'CO2 avoided' : 'Meals Created',
                  animal ? `${co2} kg` : String(meals),
                )}
              </View>
            </View>
          )}
        </View>

        <Pressable
          style={[styles.viewDetailsBtn, ts.viewDetailsBtn]}
          onPress={() => openDetailsModal(item)}
        >
          <Ionicons name="create-outline" size={normalize(16)} color={palette.white} />
          <AppText variant="bodyBold" style={[styles.viewDetailsText, ts.viewDetailsText]}>
            View Details
          </AppText>
          <Ionicons name="chevron-forward" size={normalize(18)} color={palette.white} />
        </Pressable>
      </View>
    );
  };

  const renderListHeader = () => (
    <>
      <AppText variant="h8" style={styles.sectionHeading}>
        TOTAL COLLECTIONS
      </AppText>

      <View style={[styles.sectionCard, themeStyles.people.sectionCard]}>
        <View style={styles.statsRow}>
          {renderStatCard(
            STAT_ICONS.redistributed,
            `${totals.redistributedKg.toLocaleString()} kg`,
            'Redistributed',
          )}
          {renderStatCard(
            STAT_ICONS.meals,
            totals.mealsCreated.toLocaleString(),
            'Meals created',
          )}
          {renderStatCard(
            STAT_ICONS.collections,
            totals.collectionsCompleted.toLocaleString(),
            'Collections completed',
          )}
        </View>

        <Pressable style={[styles.impactBtn, styles.impactBtnPrimary]} onPress={() => setImpactModalVisible(true)}>
          <AppText variant="bodyBold" style={styles.impactLinkTextPrimary}>
            View Impact Details
          </AppText>
          <Ionicons name="chevron-forward" size={normalize(18)} color={palette.white} />
        </Pressable>
      </View>

      <AppText variant="h8" style={styles.sectionHeading}>
        Search Collections
      </AppText>

      <View style={[styles.sectionCard, themeStyles.people.sectionCard]}>
        <View style={styles.filterRow}>
          {renderFilterChip('all', 'All', history.length)}
          {renderFilterChip('people', 'For People', peopleCount, PEOPLE_FILTER_ICON)}
          {renderFilterChip('animals', 'For Animals', animalCount, ANIMAL_FILTER_ICON)}
        </View>

        <View style={styles.filterRow}>
          {renderStatusChip('completed', 'Completed', 'checkmark-circle-outline')}
          {renderStatusChip('cancelled', 'Cancelled', 'close-circle-outline')}
        </View>

        <View style={styles.dropdownRow}>
          <View style={styles.filterBlock}>
            <AppText variant="bodyBold" style={styles.dropdownLabel}>
              Year
            </AppText>
            <View ref={yearDropdownRef} collapsable={false} style={styles.dropdownWrapper}>
              <Pressable style={styles.dropdown} onPress={openYearDropdown}>
                <AppText variant="bodyBold" style={styles.dropdownValue}>
                  {selectedYear}
                </AppText>
                <Ionicons name="chevron-down" size={normalize(16)} color={palette.black} />
              </Pressable>
            </View>
          </View>

          <View style={styles.filterBlock}>
            <AppText variant="bodyBold" style={styles.dropdownLabel}>
              Month
            </AppText>
            <View ref={monthDropdownRef} collapsable={false} style={styles.dropdownWrapper}>
              <Pressable style={styles.dropdown} onPress={openMonthDropdown}>
                <AppText variant="bodyBold" style={styles.dropdownValue}>
                  {selectedMonth}
                </AppText>
                <Ionicons name="chevron-down" size={normalize(16)} color={palette.black} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      <AppText variant="h8" style={styles.sectionHeading}>
        Recent Collections
      </AppText>
    </>
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={hp(14)} borderRadius={0} />
      <View style={styles.skeletonSection}>
        <Skeleton width={wp(40)} height={normalize(18)} style={styles.skeletonHeading} />
        <View style={styles.skeletonSectionCard}>
          <View style={styles.skeletonStatsRow}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width="30%" height={normalize(72)} borderRadius={normalize(8)} />
            ))}
          </View>
          <Skeleton width="100%" height={normalize(44)} borderRadius={normalize(8)} />
        </View>
      </View>
      <View style={styles.skeletonSection}>
        <Skeleton width={wp(45)} height={normalize(18)} style={styles.skeletonHeading} />
        <View style={styles.skeletonSectionCard}>
          <View style={styles.skeletonFilterRow}>
            <Skeleton width={wp(20)} height={normalize(36)} borderRadius={normalize(8)} />
            <Skeleton width={wp(28)} height={normalize(36)} borderRadius={normalize(8)} />
            <Skeleton width={wp(28)} height={normalize(36)} borderRadius={normalize(8)} />
          </View>
          <View style={styles.skeletonFilterRow}>
            <Skeleton width={wp(32)} height={normalize(36)} borderRadius={normalize(8)} />
            <Skeleton width={wp(32)} height={normalize(36)} borderRadius={normalize(8)} />
          </View>
          <View style={styles.skeletonDropdownRow}>
            <Skeleton width="48%" height={normalize(48)} borderRadius={normalize(8)} />
            <Skeleton width="48%" height={normalize(48)} borderRadius={normalize(8)} />
          </View>
        </View>
      </View>
      <Skeleton width={wp(42)} height={normalize(18)} style={styles.skeletonHeading} />
      {[1, 2].map((i) => (
        <View key={i} style={styles.skeletonCollectionCard}>
          <View style={styles.skeletonTopRow}>
            <Skeleton width={wp(22)} height={normalize(26)} borderRadius={normalize(6)} />
            <Skeleton width={wp(28)} height={normalize(26)} borderRadius={normalize(8)} />
            <Skeleton width={wp(24)} height={normalize(14)} />
          </View>
          <View style={styles.skeletonMetaRow}>
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} width="31%" height={normalize(56)} borderRadius={normalize(8)} />
            ))}
          </View>
          <Skeleton width="100%" height={normalize(44)} borderRadius={normalize(8)} />
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <Screen backgroundColor={palette.creme} scrollable={false}>
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <>
              {renderScreenHeader()}
              {renderSkeleton()}
            </>
          }
          contentContainerStyle={styles.listContent}
        />
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={palette.creme} scrollable={false}>
      <FlatList
        data={filteredData}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={closeDropdowns}
        ListHeaderComponent={
          <>
            {renderScreenHeader()}
            {renderListHeader()}
          </>
        }
        renderItem={({ item }) => renderCollectionCard(item)}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <AppText variant="body1" style={styles.emptyText}>
              No collections found
            </AppText>
          </View>
        }
      />

      {renderDropdownModal(showYearDropdown, yearDropdownAnchor, years, (value) => {
        setSelectedYear(value);
        setSelectedMonth('All');
        closeDropdowns();
      })}

      {renderDropdownModal(showMonthDropdown, monthDropdownAnchor, months, (value) => {
        setSelectedMonth(value);
        closeDropdowns();
      })}

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopBar}>
              <AppText variant="h6">Listed Food</AppText>
              <Pressable style={styles.closeIconBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={normalize(20)} color={palette.black} />
              </Pressable>
            </View>
            <View style={styles.modalHeaderRow}>
              <AppText variant="bodyBold" style={styles.modalColWide}>
                Item Name
              </AppText>
              <AppText variant="bodyBold" style={styles.modalCol}>
                Available
              </AppText>
              {selectedStatus !== 'ACTIVE' ? (
                <AppText variant="bodyBold" style={styles.modalCol}>
                  Claimed
                </AppText>
              ) : null}
            </View>
            {selectedItems.map((it, idx) => (
              <View key={idx} style={styles.modalItemRow}>
                <AppText variant="bodySmall" style={styles.modalColWide}>
                  {it.category}
                </AppText>
                <AppText variant="bodySmall" style={styles.modalCol}>
                  {it.totalQtyKg}kg
                </AppText>
                {selectedStatus !== 'ACTIVE' ? (
                  <AppText variant="bodySmall" style={styles.modalCol}>
                    {'claimed' in it ? it.claimed : it.qty}kg
                  </AppText>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={impactModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopBar}>
              <AppText variant="h6">Impact Details</AppText>
              <Pressable style={styles.closeIconBtn} onPress={() => setImpactModalVisible(false)}>
                <Ionicons name="close" size={normalize(20)} color={palette.black} />
              </Pressable>
            </View>
            <AppText variant="body1" style={styles.modalBodyText}>
              {totals.redistributedKg.toLocaleString()} kg redistributed
            </AppText>
            <AppText variant="body1" style={styles.modalBodyText}>
              {totals.mealsCreated.toLocaleString()} meals created
            </AppText>
            <AppText variant="body1" style={styles.modalBodyText}>
              {totals.collectionsCompleted.toLocaleString()} collections completed
            </AppText>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: hp(3),
    gap: hp(1),
  },

  header: {
    height: hp(13.5),
    justifyContent: 'flex-end',
    paddingBottom: hp(1.9),
    paddingHorizontal: wp(4),
  },

  backButton: {
    position: 'absolute',
    left: wp(4),
    top: hp(2.2),
    width: wp(10),
    height: wp(10),
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    textAlign: 'center',
    color: palette.white,
    fontSize: normalize(22),
    letterSpacing: 0.5,
    textTransform: 'none',
  },
  sectionHeading: {
    paddingHorizontal: wp(4),
    textTransform: 'none',
    marginVertical: hp(1),
  },
  sectionCard: {
    marginHorizontal: wp(4),
    borderWidth: normalize(1),
    borderRadius: normalize(14),
    backgroundColor: palette.white,
    padding: wp(4),
    gap: hp(1.2),
  },
  statsRow: {
    flexDirection: 'row',
    gap: wp(2),
  },
  statMiniCard: {
    flex: 1,
    alignItems: 'center',
    borderWidth: normalize(1),
    borderRadius: normalize(8),
    backgroundColor: palette.white,
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(0.5),
    gap: hp(0.4),
  },
  statIcon: {
    width: normalize(28),
    height: normalize(28),
  },
  statValue: {
    textTransform: 'none',
    textAlign: 'center',
    width: '100%',
  },

  statLabel: {
    fontSize: normalize(12),
    lineHeight: normalize(14),
    color: palette.midgray,
    textTransform: 'none',
    textAlign: 'center',
    width: '100%',
    alignSelf: 'center',
  },
  impactBtn: {
    marginTop: hp(0.4),
    paddingVertical: hp(1),
    paddingHorizontal: wp(2.2),
    borderRadius: normalize(8),
    borderWidth: normalize(1),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
  },
  impactBtnPrimary: {
    borderColor: palette.kale,
    backgroundColor: palette.kale,
  },
  impactLinkTextPrimary: {
    color: palette.white,
    textTransform: 'none',
    flex: 1,
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    width: '100%',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingHorizontal: wp(2.15),
    paddingVertical: hp(0.7),
    borderRadius: normalize(8),
    borderWidth: normalize(1),
    maxWidth: '100%',
  },
  filterChipInactive: {
    backgroundColor: '#F2F2F2',
    borderColor: '#D9D9D9',
  },
  filterChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  filterChipIcon: {
    width: normalize(16),
    height: normalize(16),
  },
  filterChipText: {
    fontSize: normalize(14),
    textTransform: 'none',
    flexShrink: 1,
  },
  filterChipTextActive: {
    color: palette.white,
  },
  filterChipTextInactive: {
    color: palette.stone,
  },
  dropdownRow: {
    flexDirection: 'row',
    gap: wp(2.5),
  },
  filterBlock: {
    flex: 1,
    gap: hp(0.5),
  },
  dropdownLabel: {
    textTransform: 'none',
  },
  dropdownWrapper: {
    width: '100%',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: palette.white,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.1),
    borderRadius: normalize(8),
    borderWidth: normalize(1),
    borderColor: '#D9D9D9',
  },
  dropdownValue: {
    fontSize: normalize(13),
    textTransform: 'none',
  },

  dropdownModalRoot: {
    flex: 1,
  },

  dropdownBackdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },

  dropdownListOverlay: {
    backgroundColor: palette.white,
    borderRadius: normalize(8),
    borderWidth: normalize(1),
    borderColor: '#D9D9D9',
    overflow: 'hidden',
    elevation: 2,
    maxHeight: hp(25),
  },

  dropdownListOverlayPosition: {
    position: 'absolute',
  },

  dropdownItem: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    borderBottomWidth: 0.5,
    borderColor: '#eee',
  },

  dropdownItemLast: {
    borderBottomWidth: 0,
  },

  dropdownItemText: {
    textTransform: 'none',
  },

  collectionCard: {
    marginHorizontal: wp(4),
    borderWidth: normalize(1),
    borderRadius: normalize(8),
    padding: wp(3.5),
    gap: hp(1.1),
    backgroundColor: palette.white,
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2),
    minWidth: 0,
  },
  cardTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    flexShrink: 1,
    minWidth: 0,
  },

  statusBadge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: normalize(8),
  },

  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingHorizontal: wp(2.2),
    paddingVertical: hp(0.5),
    borderRadius: normalize(8),
    borderWidth: normalize(1),
    backgroundColor: palette.white,
  },

  categoryIcon: {
    width: normalize(16),
    height: normalize(16),
  },

  badgeText: {
    fontSize: normalize(13),
    textTransform: 'none',
    flexShrink: 1,
  },

  orgNameText: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: normalize(13),
    color: palette.black,
    textTransform: 'none',
    textAlign: 'right',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: wp(1.2),
    minWidth: 0,
  },
  metaRowsWrap: {
    flex: 1,
    gap: hp(0.7),
    minWidth: 0,
  },
  metaRowSingle: {
    flexDirection: 'row',
    minWidth: 0,
  },
  metaRowDouble: {
    flexDirection: 'row',
    gap: wp(1.2),
    minWidth: 0,
  },
  metaRowCancelled: {
    gap: wp(1.2),
  },
  metaBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    borderWidth: normalize(0.5),
    borderRadius: normalize(8),
    borderColor: '#D9D9D9',
    backgroundColor: palette.white,
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.6),
    gap: wp(1),
  },
  metaIconWrap: {
    width: normalize(26),
    height: normalize(26),
    borderRadius: normalize(13),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metaIconImage: {
    width: normalize(16),
    height: normalize(16),
  },
  metaBoxContent: {
    flex: 1,
    minWidth: 0,
    gap: hp(0.1),
  },
  metaLabelText: {
    fontSize: normalize(12),
    lineHeight: normalize(15),
    color: palette.black,
    textTransform: 'none',
  },

  metaPrimaryText: {
    fontSize: normalize(12),
    lineHeight: normalize(15),
    color: palette.midgray,
    textTransform: 'none',
  },

  metaSecondaryText: {
    fontSize: normalize(12),
    lineHeight: normalize(15),
    color: palette.midgray,
    textTransform: 'none',
  },

  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    paddingVertical: hp(0.9),
    paddingHorizontal: wp(2),
    borderRadius: normalize(8),
    backgroundColor: palette.white,
  },

  viewDetailsText: {
    flex: 1,
    textTransform: 'none',
    textAlign: 'center',
  },

  emptyWrap: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(3),
    alignItems: 'center',
  },

  emptyText: {
    textAlign: 'center',
    textTransform: 'none',
    color: palette.stone,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: wp(5),
  },

  modalCard: {
    backgroundColor: palette.white,
    borderRadius: normalize(16),
    padding: wp(5),
    gap: hp(1),
  },

  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  closeIconBtn: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: '#dadbdd',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalHeaderRow: {
    flexDirection: 'row',
    paddingBottom: hp(1),
    borderBottomWidth: 1,
    borderColor: '#eee',
  },

  modalItemRow: {
    flexDirection: 'row',
    paddingVertical: hp(0.6),
  },

  modalColWide: {
    flex: 2,
    textTransform: 'none',
  },

  modalCol: {
    flex: 1,
    textAlign: 'center',
    textTransform: 'none',
  },

  modalBodyText: {
    color: palette.midgray,
    textTransform: 'none',
  },

  skeletonWrap: {
    gap: hp(1.2),
  },

  skeletonSection: {
    gap: hp(0.8),
  },

  skeletonHeading: {
    marginLeft: wp(4),
  },

  skeletonSectionCard: {
    marginHorizontal: wp(4),
    borderRadius: normalize(12),
    padding: wp(3.5),
    gap: hp(1.2),
    backgroundColor: palette.white,
    borderWidth: normalize(1),
    borderColor: '#E0E0E0',
  },

  skeletonStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  skeletonFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },

  skeletonDropdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  skeletonCollectionCard: {
    marginHorizontal: wp(4),
    borderRadius: normalize(12),
    padding: wp(3.5),
    gap: hp(1.1),
    backgroundColor: palette.white,
    borderWidth: normalize(1),
    borderColor: '#E0E0E0',
  },

  skeletonTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2),
  },

  skeletonMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

const themeStyles: { people: ThemeStyleSet; animal: ThemeStyleSet; cancelled: ThemeStyleSet } = {
  people: {
    sectionCard: { borderColor: palette.kale },
    statMiniCard: { borderColor: '#D9D9D9' },
    statValue: { color: palette.kale },
    collectionCard: { borderColor: palette.kale },
    statusBadge: { backgroundColor: '#D8EBDF' },
    accentText: { color: palette.kale },
    categoryBadge: { borderColor: palette.kale },
    metaBox: { borderColor: '#D9D9D9' },
    metaIconCircle: { backgroundColor: 'transparent' },
    viewDetailsBtn: { borderColor: palette.kale, backgroundColor: palette.kale },
    viewDetailsText: { color: palette.white },
    accentColor: palette.kale,
  },
  animal: {
    sectionCard: { borderColor: palette.kale },
    statMiniCard: { borderColor: '#D9D9D9' },
    statValue: { color: palette.kale },
    collectionCard: { borderColor: palette.orange },
    statusBadge: { backgroundColor: '#FFE8CC' },
    accentText: { color: palette.orange },
    categoryBadge: { borderColor: palette.orange },
    metaBox: { borderColor: '#D9D9D9' },
    metaIconCircle: { backgroundColor: '#FFE8CC' },
    viewDetailsBtn: { borderColor: palette.orange, backgroundColor: palette.orange },
    viewDetailsText: { color: palette.white },
    accentColor: palette.orange,
  },
  cancelled: {
    sectionCard: { borderColor: palette.kale },
    statMiniCard: { borderColor: '#D9D9D9' },
    statValue: { color: palette.kale },
    collectionCard: { borderColor: palette.primary },
    statusBadge: { backgroundColor: palette.primary },
    accentText: { color: palette.white },
    categoryBadge: { borderColor: '#BDBDBD' },
    metaBox: { borderColor: '#D9D9D9' },
    metaIconCircle: { backgroundColor: '#F2F2F2' },
    viewDetailsBtn: { borderColor: '#BDBDBD', backgroundColor: palette.eggplant },
    viewDetailsText: { color: palette.white },
    accentColor: palette.stone,
  },
};
