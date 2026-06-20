import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
  Image,
  ImageBackground,
  Modal,
  Dimensions,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Skeleton } from '../../components/Skeleton';
import { palette } from '../../theme/colors';
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
  foodRecovered: require('../../../assets/placeholder/storage_box_green.png'),
  meals: require('../../../assets/placeholder/cutlery_icon.png'),
  collections: require('../../../assets/placeholder/truck_icon.png'),
};

const META_ICONS = {
  calendar: require('../../../assets/placeholder/clock_icon.png'),
  basket: require('../../../assets/placeholder/storage_box_green.png'),
  meal: require('../../../assets/placeholder/cutlery_icon.png'),
};

type StatusFilter = 'all' | 'completed' | 'cancelled';
type CardTheme = 'completed' | 'cancelled';

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
  metaBox: ViewStyle;
  metaIconCircle: ViewStyle;
  viewDetailsBtn: ViewStyle;
  viewDetailsText: TextStyle;
};

const historyData = [
  {
    id: '1',
    business: 'Harvest Cafe',
    date: '2026-05-18T11:30:00',
    status: 'Completed',
    items: [
      { name: 'Prepared meals', qty: 10 },
      { name: 'Bread', qty: 8 },
    ],
  },
  {
    id: '2',
    business: 'Market Kitchen',
    date: '2026-03-29T17:00:00',
    status: 'Cancelled',
    items: [
      { name: 'Pasta', qty: 2 },
      { name: 'Salad', qty: 2 },
    ],
  },
  {
    id: '3',
    business: 'Saveful Bakery',
    date: '2026-04-01T16:30:00',
    status: 'Completed',
    items: [
      { name: 'Rice', qty: 3 },
      { name: 'Bread', qty: 3 },
    ],
  },
  {
    id: '4',
    business: 'My Cloud Kitchen',
    date: '2026-02-29T20:00:00',
    status: 'Completed',
    items: [
      { name: 'Fresh Fruits', qty: 6 },
      { name: 'Meat', qty: 5 },
    ],
  },
  {
    id: '5',
    business: 'Billy Billy Kitchen',
    date: '2026-01-20T13:00:00',
    status: 'Cancelled',
    items: [
      { name: 'Cooked Food', qty: 9 },
      { name: 'Cooked Meat', qty: 4 },
    ],
  },
];

const getMonthsForYear = (year: string) => {
  if (year === 'All') return ['All'];
  const y = parseInt(year, 10);
  if (y === CURRENT_YEAR) return ['All', ...MONTHS.slice(0, CURRENT_MONTH_INDEX + 1)];
  return ['All', ...MONTHS];
};

function getTotalQty(items: { qty: number }[]) {
  return items.reduce((acc, item) => acc + item.qty, 0);
}

function isCancelled(item: { status: string }) {
  return item.status === 'Cancelled';
}

function getCardTheme(item: { status: string }): CardTheme {
  return isCancelled(item) ? 'cancelled' : 'completed';
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

export function FarmerHistoryScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [impactModalVisible, setImpactModalVisible] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<(typeof historyData)[0] | null>(null);
  const [yearDropdownAnchor, setYearDropdownAnchor] = useState<DropdownAnchor | null>(null);
  const [monthDropdownAnchor, setMonthDropdownAnchor] = useState<DropdownAnchor | null>(null);
  const yearDropdownRef = useRef<View>(null);
  const monthDropdownRef = useRef<View>(null);

  const months = getMonthsForYear(selectedYear);

  const years = useMemo(() => {
    const uniqueYears = [
      ...new Set(historyData.map((item) => new Date(item.date).getFullYear().toString())),
    ];
    uniqueYears.sort((a, b) => Number(b) - Number(a));
    return ['All', ...uniqueYears];
  }, []);

  const totals = useMemo(() => {
    const completed = historyData.filter((item) => !isCancelled(item));
    const totalKg = completed.reduce((sum, item) => sum + getTotalQty(item.items), 0);
    return {
      foodRecoveredKg: Math.round(totalKg),
      mealsCreated: estimateMealsSaved(totalKg),
      collectionsCompleted: completed.length,
    };
  }, []);

  const filteredData = useMemo(() => {
    return historyData
      .filter((item) => {
        const date = new Date(item.date);
        const itemMonth = date.toLocaleString('default', { month: 'short' });
        const itemYear = date.getFullYear().toString();
        const yearMatch = selectedYear === 'All' || itemYear === selectedYear;
        const monthMatch = selectedMonth === 'All' || itemMonth === selectedMonth;
        const statusMatch =
          statusFilter === 'all' ||
          (statusFilter === 'completed' && !isCancelled(item)) ||
          (statusFilter === 'cancelled' && isCancelled(item));
        return yearMatch && monthMatch && statusMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedMonth, selectedYear, statusFilter]);

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
    yearDropdownRef.current?.measureInWindow((x, y, w, h) => {
      setYearDropdownAnchor({ top: y + h + hp(0.4), left: x, width: w });
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
    monthDropdownRef.current?.measureInWindow((x, y, w, h) => {
      setMonthDropdownAnchor({ top: y + h + hp(0.4), left: x, width: w });
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
              { top: anchor.top, left: anchor.left, width: anchor.width },
            ]}
          >
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              style={styles.dropdownScroll}
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
            </ScrollView>
          </View>
        ) : null}
      </View>
    </Modal>
  );

  const renderScreenHeader = () => (
    <ImageBackground
      source={require('../../../assets/placeholder/feed-bg.png')}
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
    <View style={[styles.statMiniCard, themeStyles.completed.statMiniCard]}>
      <Image source={icon} style={styles.statIcon} resizeMode="contain" />
      <AppText
        variant="h7"
        style={[styles.statValue, themeStyles.completed.statValue]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value}
      </AppText>
      <AppText variant="bodyBold" style={styles.statLabel} numberOfLines={2} ellipsizeMode="tail">
        {label}
      </AppText>
    </View>
  );

  const renderStatusChip = (
    key: StatusFilter,
    label: string,
    iconName?: keyof typeof Ionicons.glyphMap,
  ) => {
    const active = statusFilter === key;
    return (
      <Pressable
        key={key}
        onPress={() => setStatusFilter(key)}
        style={[styles.filterChip, active ? styles.filterChipActive : styles.filterChipInactive]}
      >
        {iconName ? (
          <Ionicons
            name={iconName}
            size={normalize(14)}
            color={active ? palette.white : palette.stone}
          />
        ) : null}
        <AppText
          variant="bodyBold"
          style={[styles.filterChipText, active ? styles.filterChipTextActive : styles.filterChipTextInactive]}
        >
          {label}
        </AppText>
      </Pressable>
    );
  };

  const renderCollectionCard = (item: (typeof historyData)[0]) => {
    const cardTheme = getCardTheme(item);
    const ts = themeStyles[cardTheme];
    const cancelled = cardTheme === 'cancelled';
    const totalKg = getTotalQty(item.items);
    const meals = estimateMealsSaved(totalKg);
    const collectedDate = formatShortDate(item.date);
    const collectedTime = formatShortTime(item.date);
    const statusLabel = cancelled ? 'Cancelled' : 'Completed';

    return (
      <View style={[styles.collectionCard, ts.collectionCard]}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardTopLeft}>
            <View style={[styles.statusBadge, ts.statusBadge]}>
              <AppText variant="bodyBold" style={[styles.badgeText, ts.accentText]}>
                {statusLabel}
              </AppText>
            </View>
          </View>
          <AppText variant="bodyBold" style={styles.orgNameText} numberOfLines={2} ellipsizeMode="tail">
            {item.business}
          </AppText>
        </View>

        <View style={[styles.metaRow, cancelled && styles.metaRowCancelled]}>
          {cancelled ? (
            <>
              {renderMetaBox(cardTheme, META_ICONS.calendar, 'Date', collectedDate)}
              {renderMetaBox(cardTheme, META_ICONS.basket, 'Food Amount', `${Math.round(totalKg)} kg`)}
            </>
          ) : (
            <View style={styles.metaRowsWrap}>
              <View style={styles.metaRowSingle}>
                {renderMetaBox(
                  cardTheme,
                  META_ICONS.calendar,
                  'Collected',
                  collectedDate,
                  collectedTime,
                )}
              </View>
              <View style={styles.metaRowDouble}>
                {renderMetaBox(cardTheme, META_ICONS.basket, 'Food saved', `${Math.round(totalKg)} kg`)}
                {renderMetaBox(cardTheme, META_ICONS.meal, 'Meals Created', String(meals))}
              </View>
            </View>
          )}
        </View>

        <Pressable
          style={[styles.viewDetailsBtn, ts.viewDetailsBtn]}
          onPress={() => {
            setSelectedCollection(item);
            setModalVisible(true);
          }}
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
        Total Collections
      </AppText>

      <View style={[styles.sectionCard, themeStyles.completed.sectionCard]}>
        <View style={styles.statsRow}>
          {renderStatCard(
            STAT_ICONS.foodRecovered,
            `${totals.foodRecoveredKg.toLocaleString()} kg`,
            'Food Recovered',
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

      <View style={[styles.sectionCard, themeStyles.completed.sectionCard]}>
        <View style={styles.filterRow}>
          {renderStatusChip('all', 'All')}
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

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={hp(14)} borderRadius={0} />
      <View style={styles.skeletonStatsRow}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} width="31%" height={normalize(72)} borderRadius={normalize(8)} />
        ))}
      </View>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} width={wp(92)} height={normalize(140)} borderRadius={normalize(14)} style={styles.skeletonCard} />
      ))}
    </View>
  );

  if (loading) {
    return (
      <Screen backgroundColor={palette.creme} scrollable={false}>
        <FlatList data={[]} renderItem={null} ListHeaderComponent={renderSkeleton} />
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={palette.creme} scrollable={false}>
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
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
              <AppText variant="h6">Collected Food</AppText>
              <Pressable style={styles.closeIconBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={normalize(20)} color={palette.black} />
              </Pressable>
            </View>

            <View style={styles.modalHeaderRow}>
              <AppText variant="bodyBold" style={styles.modalColWide}>
                Item Name
              </AppText>
              <AppText variant="bodyBold" style={styles.modalCol}>
                Qty
              </AppText>
            </View>

            {selectedCollection?.items.map((it, idx) => (
              <View key={idx} style={styles.modalItemRow}>
                <AppText variant="bodySmall" style={styles.modalColWide}>
                  {it.name}
                </AppText>
                <AppText variant="bodySmall" style={styles.modalCol}>
                  {it.qty} kg
                </AppText>
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
              {totals.foodRecoveredKg.toLocaleString()} kg food recovered
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
    backgroundColor: palette.primary,
  },
  backButton: {
    position: 'absolute',
    left: wp(4),
    top: hp(2.2),
    width: wp(10),
    height: wp(10),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.7),
    borderRadius: normalize(8),
    borderWidth: normalize(1),
    minWidth: 0,
  },
  filterChipInactive: {
    backgroundColor: '#F2F2F2',
    borderColor: '#D9D9D9',
  },
  filterChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  filterChipText: {
    fontSize: normalize(13),
    lineHeight: normalize(16),
    textTransform: 'none',
    flexShrink: 0,
    textAlign: 'center',
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
  dropdownScroll: {
    maxHeight: hp(25),
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
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(1.5),
    minWidth: 0,
  },
  cardTopLeft: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: wp(1.5),
    flexShrink: 0,
    maxWidth: '100%',
  },
  statusBadge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: normalize(8),
    flexShrink: 0,
  },
  badgeText: {
    fontSize: normalize(12),
    lineHeight: normalize(15),
    textTransform: 'none',
    flexShrink: 0,
  },
  orgNameText: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: wp(28),
    minWidth: wp(24),
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
    padding: wp(4),
    gap: hp(1.5),
  },
  skeletonPad: {
    marginTop: hp(1),
  },
  skeletonWrap: {
    paddingBottom: hp(3),
    gap: hp(1.2),
  },
  skeletonStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    gap: wp(2),
  },
  skeletonCard: {
    alignSelf: 'center',
    marginTop: hp(0.8),
  },
});

const themeStyles: { completed: ThemeStyleSet; cancelled: ThemeStyleSet } = {
  completed: {
    sectionCard: { borderColor: palette.kale },
    statMiniCard: { borderColor: '#D9D9D9' },
    statValue: { color: palette.kale },
    collectionCard: { borderColor: palette.kale },
    statusBadge: { backgroundColor: '#D8EBDF' },
    accentText: { color: palette.kale },
    metaBox: { borderColor: '#D9D9D9' },
    metaIconCircle: { backgroundColor: 'transparent' },
    viewDetailsBtn: { borderColor: palette.kale, backgroundColor: palette.kale },
    viewDetailsText: { color: palette.white },
  },
  cancelled: {
    sectionCard: { borderColor: palette.kale },
    statMiniCard: { borderColor: '#D9D9D9' },
    statValue: { color: palette.kale },
    collectionCard: { borderColor: palette.primary },
    statusBadge: { backgroundColor: palette.primary },
    accentText: { color: palette.white },
    metaBox: { borderColor: '#D9D9D9' },
    metaIconCircle: { backgroundColor: '#F2F2F2' },
    viewDetailsBtn: { borderColor: '#BDBDBD', backgroundColor: palette.eggplant },
    viewDetailsText: { color: palette.white },
  },
};
