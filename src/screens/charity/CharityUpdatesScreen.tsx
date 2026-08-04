import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { HeroHeader } from '../../components/HeroHeader';
import { Skeleton } from '../../components/Skeleton';
import { palette } from '../../theme/colors';
import { PostCollectSurveyModal } from './components/postCollectSurveyModal';
import { hp, normalize, useResponsiveLayout, wp } from '@/utils/responsive';
import { buildDashboardShellStyles } from '@/utils/dashboardAdaptive';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { useBottomTabPadding } from '@/hooks/useBottomTabPadding';
import { useAppContext } from '../../store/AppContext';
import { useReceiverFeed } from '@/hooks/useReceiverFeed';
import type {
  ReceiverUpdateItem,
  ReceiverUpdateType,
} from '@/utils/receiverFeed';

type UpdateType = ReceiverUpdateType;
type UpdateFilter = 'all' | UpdateType;
type UpdateItem = ReceiverUpdateItem;

const CRATE_ICON = require('../../../assets/placeholder/storage_box_green.png');
const FEEDBACK_ICON = require('../../../assets/placeholder/chat_orange_icon.png');

const FILTER_ROW_1: { key: UpdateFilter; label: string; type?: UpdateType }[] = [
  { key: 'all', label: 'All' },
  { key: 'new_surplus', label: 'New Surplus', type: 'new_surplus' },
  { key: 'pickup', label: 'Pick ups', type: 'pickup' },
];

const FILTER_ROW_2: { key: UpdateFilter; label: string; type?: UpdateType }[] = [
  { key: 'collected', label: 'Collected', type: 'collected' },
  { key: 'feedback', label: 'Feedback', type: 'feedback' },
];

const CARD_THEMES: Record<
  Exclude<UpdateType, never>,
  {
    badgeBg: string;
    badgeText: string;
    dot: string;
    qtyBorder: string;
    qtyBg: string;
    btn: string;
    badgeLabel: string;
  }
> = {
  new_surplus: {
    badgeBg: '#D8EBDF',
    badgeText: palette.kale,
    dot: palette.middlegreen,
    qtyBorder: '#B8DCC4',
    qtyBg: '#F2F8F4',
    btn: palette.middlegreen,
    badgeLabel: 'NEW SURPLUS',
  },
  pickup: {
    badgeBg: '#EFEAFE',
    badgeText: palette.primary,
    dot: palette.primary,
    qtyBorder: '#D5C4F7',
    qtyBg: '#F8F4FF',
    btn: palette.primary,
    badgeLabel: 'PICK UP CONFIRMED',
  },
  collected: {
    badgeBg: '#E3F0FF',
    badgeText: palette.blueberry,
    dot: palette.blueberry,
    qtyBorder: '#B8D4F5',
    qtyBg: '#F0F7FF',
    btn: palette.blueberry,
    badgeLabel: 'COLLECTED',
  },
  feedback: {
    badgeBg: '#FFE8CC',
    badgeText: palette.orange,
    dot: palette.orange,
    qtyBorder: '#FFD4A8',
    qtyBg: '#FFF8F0',
    btn: palette.orange,
    badgeLabel: 'FEEDBACK REQUESTED',
  },
};

export function CharityUpdatesScreen() {
  useTransparentStatusBar('light');
  const r = useResponsiveLayout();
  const adaptive = useMemo(() => buildDashboardShellStyles(r, { heroPhoneHp: 16 }), [r]);
  const bottomPadding = useBottomTabPadding(r.isTablet ? 24 : hp(3));
  const { currentProfile } = useAppContext();
  const {
    updates,
    counts,
    loading,
    refreshing,
    error,
    reload,
  } = useReceiverFeed('people');

  const navigation = useNavigation<any>();
  const [activeFilter, setActiveFilter] = useState<UpdateFilter>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<UpdateItem | null>(null);
  const [initialAnswer, setInitialAnswer] = useState<'yes' | 'no' | null>(null);
  const [selectedUpdateId, setSelectedUpdateId] = useState<string | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const [selectedBusinessName, setSelectedBusinessName] = useState<string>('');
  const [selectedSurveyItems, setSelectedSurveyItems] = useState<
    { id: string; name: string; quantity: number }[]
  >([]);
  const [surveyCompletedIds, setSurveyCompletedIds] = useState<string[]>([]);

  const filteredUpdates = useMemo(() => {
    if (activeFilter === 'all') return updates;
    return updates.filter((u) => u.type === activeFilter);
  }, [updates, activeFilter]);

  const sections = useMemo(() => {
    const titles: Array<'Today' | 'Previous'> = ['Today', 'Previous'];
    return titles
      .map((title) => ({
        title,
        data: filteredUpdates.filter((u) => u.section === title),
      }))
      .filter((section) => section.data.length > 0);
  }, [filteredUpdates]);

  const detailsTotals = useMemo(() => {
    const items = selectedDetails?.items || [];
    return {
      available: items.reduce((sum, i) => sum + Number(i.available || 0), 0),
      claimed: items.reduce((sum, i) => sum + Number(i.claimed || 0), 0),
    };
  }, [selectedDetails]);

  const openItemsModal = (item: UpdateItem) => {
    setSelectedDetails(item);
    setDetailsModalVisible(true);
  };

  const handleViewDetails = (item: UpdateItem) => {
    if (item.type === 'new_surplus') {
      navigation.navigate('Available', { screen: 'CharityMap' });
      return;
    }
    // Pickup + collected: same items popup as the Pickups screen.
    openItemsModal(item);
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={hp(14)} borderRadius={0} />
      <View style={styles.filterWrap}>
        <View style={styles.filterRow}>
          <Skeleton width="31%" height={normalize(34)} borderRadius={normalize(8)} />
          <Skeleton width="31%" height={normalize(34)} borderRadius={normalize(8)} />
          <Skeleton width="31%" height={normalize(34)} borderRadius={normalize(8)} />
        </View>
        <View style={styles.filterRow}>
          <Skeleton width="48%" height={normalize(34)} borderRadius={normalize(8)} />
          <Skeleton width="48%" height={normalize(34)} borderRadius={normalize(8)} />
        </View>
      </View>
      {[1, 2].map((i) => (
        <View key={i} style={styles.skeletonSection}>
          <Skeleton width={wp(22)} height={normalize(18)} style={styles.skeletonSectionTitle} />
          <View style={styles.updateCard}>
            <View style={styles.cardTopRow}>
              <Skeleton width={wp(32)} height={normalize(22)} borderRadius={normalize(6)} />
              <Skeleton width="55%" height={normalize(16)} />
            </View>
            <View style={styles.cardBodyRow}>
              <Skeleton width={wp(18)} height={wp(18)} borderRadius={normalize(10)} />
              <View style={styles.cardMainArea}>
                <View style={styles.cardContent}>
                  <Skeleton width="90%" height={normalize(13)} />
                  <Skeleton width="80%" height={normalize(13)} />
                </View>
                <Skeleton width={wp(28)} height={normalize(36)} borderRadius={normalize(8)} />
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderFilterChip = (key: UpdateFilter, label: string, type?: UpdateType) => {
    const active = activeFilter === key;
    const theme = type ? CARD_THEMES[type] : null;
    const count = counts[key];

    return (
      <Pressable
        key={key}
        onPress={() => setActiveFilter(key)}
        style={[
          styles.filterChip,
          active
            ? styles.filterChipActive
            : [styles.filterChipInactive, theme ? { borderColor: theme.dot } : null],
        ]}
      >
        {!active && theme ? (
          <View style={[styles.filterDot, { backgroundColor: theme.dot }]} />
        ) : null}
        <AppText
          variant="bodyBold"
          style={[
            styles.filterChipText,
            active ? styles.filterChipTextActive : styles.filterChipTextInactive,
          ]}
        >
          {label} ({count})
        </AppText>
      </Pressable>
    );
  };

  const renderQtyBox = (item: UpdateItem) => {
    const theme = CARD_THEMES[item.type];
    return (
      <View style={[styles.qtyBox, { borderColor: theme.qtyBorder, backgroundColor: theme.qtyBg }]}>
        <Image source={CRATE_ICON} style={styles.qtyIcon} resizeMode="contain" />
        <AppText variant="bodyBold" style={styles.qtyValue} numberOfLines={1}>
          {item.quantityKg}
        </AppText>
        <AppText variant="caption" style={styles.qtyUnit} numberOfLines={1}>
          kg
        </AppText>
      </View>
    );
  };

  const renderStandardCard = (item: UpdateItem) => {
    const theme = CARD_THEMES[item.type];

    return (
      <View style={[styles.updateCard, adaptive.updateCard]}>
        <View style={styles.cardTopRow}>
          <View style={[styles.statusBadge, { backgroundColor: theme.badgeBg }]}>
            <AppText variant="bodyBold" style={[styles.statusBadgeText, { color: theme.badgeText }]}>
              {theme.badgeLabel}
            </AppText>
          </View>
          <AppText variant="bodyBold" style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </AppText>
        </View>

        <View style={styles.cardBodyRow}>
          {renderQtyBox(item)}

          <View style={styles.cardMainArea}>
            <View style={styles.cardContent}>
              <View style={styles.detailRow}>
                <AppText variant="bodySmall" style={styles.pinIcon}>📍</AppText>
                <AppText variant="bodySmall" style={styles.detailText} numberOfLines={2}>
                  {`${item.distance} ${item.city}`.trim()}
                </AppText>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={normalize(13)} color={palette.stone} />
                <AppText variant="bodySmall" style={styles.detailText} numberOfLines={1}>
                  {item.timeLabel}
                </AppText>
              </View>

              {item.driverName ? (
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons
                    name="steering"
                    size={normalize(13)}
                    color={theme.badgeText}
                  />
                  <AppText
                    variant="bodySmall"
                    style={[styles.detailText, { color: theme.badgeText }]}
                    numberOfLines={1}
                  >
                    Driver: {item.driverName}
                  </AppText>
                </View>
              ) : null}
            </View>

            <Pressable
              style={[styles.viewDetailsBtn, { backgroundColor: theme.btn }]}
              onPress={() => handleViewDetails(item)}
            >
              <AppText variant="bodyBold" style={styles.viewDetailsText} numberOfLines={1}>
                View Details
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const renderFeedbackCard = (item: UpdateItem) => {
    const theme = CARD_THEMES.feedback;
    const completed = surveyCompletedIds.includes(item.id);

    return (
      <View style={[styles.updateCard, adaptive.updateCard]}>
        <View style={styles.cardTopRow}>
          <View style={[styles.statusBadge, { backgroundColor: theme.badgeBg }]}>
            <AppText variant="bodyBold" style={[styles.statusBadgeText, { color: theme.badgeText }]}>
              {theme.badgeLabel}
            </AppText>
          </View>
        </View>

        <View style={styles.cardBodyRow}>
          <View style={[styles.qtyBox, { borderColor: theme.qtyBorder, backgroundColor: theme.qtyBg }]}>
            <Image source={FEEDBACK_ICON} style={styles.feedbackIcon} resizeMode="contain" />
          </View>

          <View style={styles.feedbackContent}>
            <AppText variant="bodyBold" style={styles.feedbackQuestion}>
              Did you collect from{' '}
              <AppText variant="bodyBold" style={styles.feedbackBrand}>
                {item.title}
              </AppText>
              ?
            </AppText>

            <View style={styles.feedbackActions}>
              <Pressable
                disabled={completed}
                style={[styles.feedbackYesBtn, { backgroundColor: theme.btn }, completed && styles.disabledBtn]}
                onPress={() => {
                  setInitialAnswer('yes');
                  setSelectedUpdateId(item.id);
                  setSelectedClaimId(item.claimId ?? null);
                  setSelectedBusinessName(item.title);
                  setSelectedSurveyItems(
                    (item.items || []).map((food, index) => ({
                      id: String(index),
                      name: food.name,
                      quantity: Number(food.claimed || food.available || 0),
                    })),
                  );
                  setModalVisible(true);
                }}
              >
                <AppText variant="bodyBold" style={styles.feedbackYesText}>YES</AppText>
              </Pressable>

              <Pressable
                disabled={completed}
                style={[styles.feedbackNoBtn, { borderColor: theme.btn }, completed && styles.disabledBtn]}
                onPress={() => {
                  setInitialAnswer('no');
                  setSelectedUpdateId(item.id);
                  setSelectedClaimId(item.claimId ?? null);
                  setSelectedBusinessName(item.title);
                  setSelectedSurveyItems(
                    (item.items || []).map((food, index) => ({
                      id: String(index),
                      name: food.name,
                      quantity: Number(food.claimed || food.available || 0),
                    })),
                  );
                  setModalVisible(true);
                }}
              >
                <AppText variant="bodyBold" style={[styles.feedbackNoText, { color: theme.btn }]}>NO</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderCard = (item: UpdateItem) =>
    item.type === 'feedback' ? renderFeedbackCard(item) : renderStandardCard(item);

  if (loading && updates.length === 0) {
    return (
      <Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={renderSkeleton}
          contentContainerStyle={[styles.container, { paddingBottom: bottomPadding }]}
        />
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void reload()}
            tintColor={palette.kale}
            colors={[palette.kale]}
          />
        }
        contentContainerStyle={[
          styles.container,
          adaptive.scrollContent,
          { paddingBottom: bottomPadding },
          sections.length === 0 && { flexGrow: 1 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <HeroHeader
              source={require('../../../assets/placeholder/kale-header.png')}
              height={adaptive.heroHeight}
              style={adaptive.heroBleed}
            >
              <View style={[styles.heroContent, adaptive.heroContent]}>
                <View style={styles.heroTopRow}>
                  <View style={styles.heroTextBlock}>
                    <AppText
                      variant="caption"
                      style={[styles.heroEyebrow, adaptive.heroEyebrow]}
                      numberOfLines={1}
                    >
                      {currentProfile.organization || 'Your charity'}
                    </AppText>
                    <AppText
                      variant="h6"
                      style={[styles.heroTitle, adaptive.heroTitle]}
                      numberOfLines={1}
                    >
                      Updates
                    </AppText>
                    <AppText
                      variant="bodySmall"
                      style={[styles.heroSubtitle, adaptive.heroSubtitle]}
                      numberOfLines={2}
                    >
                      Track surplus, pickups, and collections in one place
                    </AppText>
                  </View>
                  <View style={[styles.heroIconCircle, adaptive.heroIconCircle]}>
                    <Ionicons name="notifications" size={26} color={palette.eggplant} />
                  </View>
                </View>
                <View style={[styles.heroStatsPill, adaptive.heroStatsPill]}>
                  <Ionicons name="pulse-outline" size={14} color={palette.white} />
                  <AppText
                    variant="caption"
                    style={[styles.heroStatsText, adaptive.heroStatsText]}
                    numberOfLines={1}
                  >
                    {updates.length} update{updates.length !== 1 ? 's' : ''} · {counts.new_surplus} surplus · {counts.pickup} pickups
                  </AppText>
                </View>
              </View>
            </HeroHeader>

            <View style={[styles.filterWrap, adaptive.filterScroll]}>
              <View style={styles.filterRow}>
                {FILTER_ROW_1.map(({ key, label, type }) =>
                  renderFilterChip(key, label, type),
                )}
              </View>
              <View style={styles.filterRow}>
                {FILTER_ROW_2.map(({ key, label, type }) =>
                  renderFilterChip(key, label, type),
                )}
              </View>
            </View>
          </View>
        }
        renderItem={({ item: section }) => (
          <View style={[styles.section, adaptive.section]}>
            <AppText variant="h8" style={[styles.sectionTitle, adaptive.sectionTitle]}>
              {section.title}
            </AppText>
            <View style={styles.sectionCards}>
              {section.data.map((update) => (
                <View key={update.id}>{renderCard(update)}</View>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={[styles.emptyWrap, adaptive.section]}>
            <AppText variant="body1" color={palette.stone} style={{ textAlign: 'center' }}>
              {error ?? 'No updates yet. New surplus and your pickups will show up here.'}
            </AppText>
            {error ? (
              <Pressable onPress={() => void reload()} style={{ marginTop: hp(1.2) }}>
                <AppText variant="bodyBold" color={palette.kale}>
                  Try again
                </AppText>
              </Pressable>
            ) : null}
          </View>
        }
      />

      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={[styles.modalWrap, r.isTablet && { paddingHorizontal: r.pagePadH }]}>
          <View
            style={[
              styles.modalCard,
              r.isTablet && {
                width: '100%',
                maxWidth: Math.min(520, r.contentMaxWidth),
                alignSelf: 'center',
              },
            ]}
          >
            <View style={styles.modalTopBar}>
              <AppText variant="h6">Items</AppText>
              <Pressable
                style={styles.closeIconBtn}
                onPress={() => setDetailsModalVisible(false)}
              >
                <Ionicons name="close" size={normalize(20)} color={palette.black} />
              </Pressable>
            </View>

            {selectedDetails ? (
              <>
                <AppText variant="bodyBold" style={styles.modalSubtitle}>
                  {selectedDetails.title}
                </AppText>

                <View style={styles.modalHeaderRow}>
                  <AppText variant="bodyBold" style={styles.modalColWide}>
                    Item Name
                  </AppText>
                  <AppText variant="bodyBold" style={styles.modalCol}>
                    Available
                  </AppText>
                  <AppText variant="bodyBold" style={styles.modalCol}>
                    Claimed
                  </AppText>
                </View>

                {(selectedDetails.items || []).length > 0 ? (
                  selectedDetails.items!.map((food, idx) => (
                    <View key={idx} style={styles.modalItemRow}>
                      <AppText variant="bodyBold" style={styles.modalColWide}>
                        {food.name}
                      </AppText>
                      <AppText variant="bodySmall" style={styles.modalCol}>
                        {food.available} kg
                      </AppText>
                      <AppText variant="bodySmall" style={styles.modalCol}>
                        {food.claimed} kg
                      </AppText>
                    </View>
                  ))
                ) : (
                  <AppText variant="bodySmall" color={palette.stone} style={styles.modalEmpty}>
                    No item breakdown available for this update.
                  </AppText>
                )}

                <AppText variant="bodyBold">
                  Total claimed: {detailsTotals.claimed || selectedDetails.quantityKg} kg
                </AppText>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <PostCollectSurveyModal
        visible={modalVisible}
        initialAnswer={initialAnswer}
        claimId={selectedClaimId}
        businessName={selectedBusinessName}
        items={selectedSurveyItems}
        onSubmitted={() => {
          if (selectedUpdateId) {
            setSurveyCompletedIds((prev) => [...prev, selectedUpdateId]);
          }
          void reload();
        }}
        onClose={() => {
          setModalVisible(false);
          setInitialAnswer(null);
          setSelectedUpdateId(null);
          setSelectedClaimId(null);
          setSelectedBusinessName('');
          setSelectedSurveyItems([]);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {

  },

  listHeader: {
    width: '100%',
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
    fontSize: normalize(12),
  },
  heroTitle: {
    color: palette.white,
    textTransform: 'none',
    fontSize: normalize(26),
    lineHeight: normalize(34),
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'none',
    fontSize: normalize(14),
    lineHeight: normalize(20),
  },
  heroIconCircle: {
    width: normalize(52),
    height: normalize(52),
    borderRadius: normalize(26),
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: wp(1.5),
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingVertical: hp(0.6),
    paddingHorizontal: wp(3),
    borderRadius: normalize(20),
    maxWidth: '100%',
  },
  heroStatsText: {
    color: palette.white,
    flexShrink: 1,
    textTransform: 'none',
    fontSize: normalize(11),
    lineHeight: normalize(15),
  },

  filterWrap: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1.2),
    paddingBottom: hp(0.6),
    gap: hp(0.8),
  },

  filterRow: {
    flexDirection: 'row',
    gap: wp(2),
    width: '100%',
  },

  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.75),
    borderRadius: normalize(8),
    borderWidth: normalize(1),
  },

  filterChipInactive: {
    backgroundColor: palette.white,
    borderColor: '#D9D9D9',
  },

  filterChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },

  filterDot: {
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(4),
  },

  filterChipText: {
    fontSize: normalize(13),
    textTransform: 'none',
  },

  filterChipTextActive: {
    color: palette.white,
  },

  filterChipTextInactive: {
    color: palette.black,
  },

  section: {
    paddingHorizontal: wp(4),
    marginTop: hp(1),
    gap: hp(0.8),
  },

  sectionTitle: {
    color: palette.black,
    textTransform: 'none',
    paddingLeft: wp(0.5),
  },

  sectionCards: {
    gap: hp(1.2),
  },

  updateCard: {
    backgroundColor: palette.white,
    borderWidth: normalize(1),
    borderColor: '#E4E4E4',
    borderRadius: normalize(12),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    gap: hp(0.45),
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },

  statusBadge: {
    flexShrink: 0,
    paddingHorizontal: wp(2.2),
    paddingVertical: hp(0.3),
    borderRadius: normalize(6),
  },

  statusBadgeText: {
    fontSize: normalize(11),
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  cardBodyRow: {
    flexDirection: 'row',
    gap: wp(2.5),
    alignItems: 'stretch',
  },

  cardMainArea: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: hp(0.7),
    minWidth: 0,
  },

  qtyBox: {
    width: normalize(64),
    minHeight: normalize(72),
    borderWidth: 1,
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.6),
    paddingHorizontal: wp(1),
    gap: hp(0.15),
    flexShrink: 0,
    alignSelf: 'flex-start',
  },

  qtyIcon: {
    width: normalize(22),
    height: normalize(22),
  },

  qtyValue: {
    fontSize: normalize(13),
    lineHeight: normalize(16),
    color: palette.black,
    textTransform: 'none',
    textAlign: 'center',
  },

  qtyUnit: {
    fontSize: normalize(11),
    lineHeight: normalize(13),
    color: palette.stone,
    textTransform: 'none',
    textAlign: 'center',
  },

  cardContent: {
    flexGrow: 1,
    gap: hp(0.2),
    minWidth: 0,
    justifyContent: 'flex-start',
  },

  cardTitle: {
    flex: 1,
    fontSize: normalize(14),
    color: palette.black,
    textTransform: 'none',
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(1),
    minWidth: 0,
  },

  pinIcon: {
    fontSize: normalize(11),
    lineHeight: normalize(15),
    marginTop: normalize(1),
  },

  detailText: {
    flex: 1,
    flexShrink: 1,
    color: palette.stone,
    fontSize: normalize(11),
    lineHeight: normalize(15),
    textTransform: 'none',
  },

  viewDetailsBtn: {
    alignSelf: 'flex-end',
    minWidth: normalize(108),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.85),
    borderRadius: normalize(8),
    alignItems: 'center',
    justifyContent: 'center',
  },

  viewDetailsText: {
    color: palette.white,
    fontSize: normalize(12),
    lineHeight: normalize(16),
    textTransform: 'none',
  },

  feedbackIcon: {
    width: normalize(24),
    height: normalize(24),
  },

  feedbackContent: {
    flex: 1,
    gap: hp(0.6),
    minWidth: 0,
    justifyContent: 'center',
  },

  feedbackQuestion: {
    fontSize: normalize(13),
    lineHeight: normalize(17),
    color: palette.black,
    textTransform: 'none',
  },

  feedbackBrand: {
    textTransform: 'uppercase',
  },

  feedbackActions: {
    flexDirection: 'row',
    gap: wp(2),
  },

  feedbackYesBtn: {
    flex: 1,
    paddingVertical: hp(0.85),
    borderRadius: normalize(8),
    alignItems: 'center',
  },

  feedbackYesText: {
    color: palette.white,
    fontSize: normalize(14),
  },

  feedbackNoBtn: {
    flex: 1,
    paddingVertical: hp(0.85),
    borderRadius: normalize(8),
    alignItems: 'center',
    backgroundColor: palette.white,
    borderWidth: normalize(1.5),
  },

  feedbackNoText: {
    fontSize: normalize(14),
  },

  disabledBtn: {
    opacity: 0.45,
  },

  emptyWrap: {
    paddingVertical: hp(4),
    alignItems: 'center',
  },

  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: palette.white,
    borderTopLeftRadius: normalize(24),
    borderTopRightRadius: normalize(24),
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    paddingBottom: hp(4),
    gap: hp(1.2),
  },
  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeIconBtn: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    textTransform: 'none',
    color: palette.midgray,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    paddingBottom: hp(1),
    borderBottomWidth: 1,
    borderColor: palette.border,
  },
  modalItemRow: {
    flexDirection: 'row',
    paddingVertical: hp(0.5),
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
  modalEmpty: {
    textTransform: 'none',
    textAlign: 'center',
    paddingVertical: hp(1),
  },

  skeletonWrap: {
    paddingBottom: hp(3),
    gap: hp(1),
  },

  skeletonSection: {
    paddingHorizontal: wp(4),
    gap: hp(0.8),
    marginTop: hp(0.5),
  },

  skeletonSectionTitle: {
    marginLeft: wp(0.5),
  },
});
