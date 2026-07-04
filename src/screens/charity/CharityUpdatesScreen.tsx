import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Skeleton } from '../../components/Skeleton';
import { palette } from '../../theme/colors';
import { PostCollectSurveyModal } from './components/postCollectSurveyModal';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => Math.round(size * (width / 375));

type UpdateType = 'new_surplus' | 'pickup' | 'collected' | 'feedback';
type UpdateFilter = 'all' | UpdateType;

type UpdateItem = {
  id: string;
  type: UpdateType;
  section: 'Today' | 'Previous';
  title: string;
  quantityKg: number;
  distance: string;
  city: string;
  timeLabel: string;
  driverName?: string;
};

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

const MOCK_UPDATES: UpdateItem[] = [
  {
    id: '1',
    type: 'new_surplus',
    section: 'Today',
    title: 'Saveful Bakery',
    quantityKg: 18,
    distance: '1.8 kms away',
    city: 'Bhubaneswar',
    timeLabel: 'Today - 5.30pm - 6.00pm',
  },
  {
    id: '2',
    type: 'pickup',
    section: 'Today',
    title: 'Green Bowl',
    quantityKg: 18,
    distance: '6.2 kms away',
    city: 'Chennai',
    timeLabel: 'Today - 5.30pm - 6.00pm',
    driverName: 'Rakesh Sahu',
  },
  {
    id: '3',
    type: 'feedback',
    section: 'Today',
    title: 'URBAN BITES',
    quantityKg: 0,
    distance: '',
    city: '',
    timeLabel: '',
  },
  {
    id: '4',
    type: 'collected',
    section: 'Previous',
    title: 'Saveful Bakery',
    quantityKg: 18,
    distance: '1.8 kms away',
    city: 'Bhubaneswar',
    timeLabel: 'Today - 5.30pm - 6.00pm',
  },
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
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<UpdateFilter>('all');
  const [updates] = useState(MOCK_UPDATES);
  const [modalVisible, setModalVisible] = useState(false);
  const [initialAnswer, setInitialAnswer] = useState<'yes' | 'no' | null>(null);
  const [selectedUpdateId, setSelectedUpdateId] = useState<string | null>(null);
  const [surveyCompletedIds, setSurveyCompletedIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

  const counts = useMemo(() => ({
    all: updates.length,
    new_surplus: updates.filter((u) => u.type === 'new_surplus').length,
    pickup: updates.filter((u) => u.type === 'pickup').length,
    collected: updates.filter((u) => u.type === 'collected').length,
    feedback: updates.filter((u) => u.type === 'feedback').length,
  }), [updates]);

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
        <AppText variant="bodyBold" style={styles.qtyText}>
          {item.quantityKg} kg
        </AppText>
      </View>
    );
  };

  const handleViewDetails = (item: UpdateItem) => {
    if (item.type === 'new_surplus') {
      navigation.navigate('Available', { screen: 'FarmerMap' });
      return;
    }
    if (item.type === 'pickup') {
      navigation.navigate('Available', { screen: 'FarmerPickup' });
      return;
    }
    if (item.type === 'collected') {
      navigation.navigate('FarmerHistory');
    }
  };

  const renderStandardCard = (item: UpdateItem) => {
    const theme = CARD_THEMES[item.type];

    return (
      <View style={styles.updateCard}>
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
              <AppText variant="bodyBold" style={styles.viewDetailsText}>
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
      <View style={styles.updateCard}>
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

  if (loading) {
    return (
      <Screen backgroundColor={palette.creme} scrollable={false}>
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={renderSkeleton}
          contentContainerStyle={styles.container}
        />
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={palette.creme} scrollable={false} transparentTop={true}>
      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <ImageBackground
              source={require('../../../assets/placeholder/kale-header.png')}
              style={styles.headerBg}
              resizeMode="cover"
            >
              <AppText variant="h4" style={styles.headerTitle}>
                UPDATES
              </AppText>
            </ImageBackground>

            <View style={styles.filterWrap}>
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
          </>
        }
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <AppText variant="h8" style={styles.sectionTitle}>
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
          <View style={styles.emptyWrap}>
            <AppText variant="body1" color={palette.stone}>
              No updates to show
            </AppText>
          </View>
        }
      />

      <PostCollectSurveyModal
        visible={modalVisible}
        initialAnswer={initialAnswer}
        onClose={() => {
          if (selectedUpdateId) {
            setSurveyCompletedIds((prev) => [...prev, selectedUpdateId]);
          }
          setModalVisible(false);
          setInitialAnswer(null);
          setSelectedUpdateId(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: hp(3),
  },

  headerBg: {
    width: '100%',
    height: hp(18),
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    color: palette.white,
    fontSize: normalize(24),
    letterSpacing: 0.5,
    paddingTop: hp(4),
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
    alignItems: 'flex-start',
  },

  cardMainArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    minWidth: 0,
  },

  qtyBox: {
    width: wp(17),
    height: wp(17),
    borderWidth: normalize(1),
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.35),
    paddingHorizontal: wp(0.8),
    gap: hp(0.2),
    flexShrink: 0,
  },

  qtyIcon: {
    width: normalize(24),
    height: normalize(24),
  },

  qtyText: {
    fontSize: normalize(11),
    color: palette.black,
    textTransform: 'none',
  },

  cardContent: {
    flex: 1,
    gap: hp(0.15),
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
    flexShrink: 0,
    paddingHorizontal: wp(2.8),
    paddingVertical: hp(0.75),
    borderRadius: normalize(8),
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },

  viewDetailsText: {
    color: palette.white,
    fontSize: normalize(12),
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
