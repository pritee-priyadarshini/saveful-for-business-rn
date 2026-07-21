import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { HeroHeader } from '../../components/HeroHeader';
import { Skeleton } from '../../components/Skeleton';
import { palette } from '../../theme/colors';
import { PostPickupSurveyModal } from './components/postPickupSurveyModal';
import { estimateMealsSaved } from '../../utils/foodListing';
import { showErrorAlert } from '@/utils/apiError';
import { hp, normalize, wp } from '@/utils/responsive';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { useBottomTabPadding } from '@/hooks/useBottomTabPadding';
import { useAppContext } from '../../store/AppContext';

const DETAIL_ICONS = {
  calendar: require('../../../assets/placeholder/calender_icon.png'),
  basket: require('../../../assets/placeholder/veggie_basket_icon.png'),
  leaf: require('../../../assets/placeholder/leaf_icon.png'),
  meal: require('../../../assets/placeholder/cutlery_icon.png'),
};

type UpdateFilter = 'all' | 'people' | 'animals';
type Audience = 'people' | 'animals';

type UpdateTheme = {
  accent: string;
  statusBg: string;
  lightBg: string;
  categoryLabel: string;
  categoryIcon: any;
};

const PEOPLE_THEME: UpdateTheme = {
  accent: palette.kale,
  statusBg: '#D8EBDF',
  lightBg: '#F2F8F4',
  categoryLabel: 'For People',
  categoryIcon: require('../../../assets/placeholder/people_icon.png'),
};

const ANIMAL_THEME: UpdateTheme = {
  accent: palette.orange,
  statusBg: '#FFE8CC',
  lightBg: '#FFF8F0',
  categoryLabel: 'For Animals',
  categoryIcon: require('../../../assets/placeholder/cow_front.png'),
};

const MOCK_UPDATES = [
  {
    id: '1',
    audience: 'people' as Audience,
    cardType: 'claimed' as const,
    section: 'TODAY',
    claimerName: 'Food Rescue Org',
    location: 'Patia, Bhubaneswar',
    assigneeLabel: 'Driver',
    assigneeName: 'Rakesh Sahu',
    assigneeStatus: 'driver_assigned',
    pickupFrom: '2026-05-18T08:04:00',
    pickupTo: '2026-05-18T18:04:00',
    quantityKg: 18,
    items: [
      { name: 'Rice', qty: '5kg' },
      { name: 'Dal', qty: '3kg' },
    ],
    claimerPhone: '+91 9876543210',
    assigneePhone: '+91 9123456789',
  },
  {
    id: '2',
    audience: 'animals' as Audience,
    cardType: 'claimed' as const,
    section: 'TODAY',
    claimerName: 'Green Valley Farm',
    location: 'Khandagiri, Bhubaneswar',
    assigneeLabel: 'Farmer',
    assigneeName: 'Amit Das',
    assigneeStatus: 'farmer_assigned',
    pickupFrom: '2026-05-18T09:00:00',
    pickupTo: '2026-05-18T17:00:00',
    quantityKg: 24,
    items: [
      { name: 'Food scraps – no meat', qty: '12kg' },
      { name: 'Grain / cereal', qty: '12kg' },
    ],
    claimerPhone: '+91 9988776655',
    assigneePhone: '+91 9001122334',
  },
  {
    id: '3',
    audience: 'people' as Audience,
    cardType: 'collected' as const,
    section: 'YESTERDAY',
    quantityKg: 18,
    collectedDate: '2026-05-17T11:15:00',
    mealsCreated: 40,
  },
  {
    id: '4',
    audience: 'animals' as Audience,
    cardType: 'collected' as const,
    section: 'YESTERDAY',
    quantityKg: 65,
    collectedDate: '2026-05-17T14:30:00',
    co2Avoided: 260,
  },
];

function getTheme(audience: Audience): UpdateTheme {
  return audience === 'animals' ? ANIMAL_THEME : PEOPLE_THEME;
}

function prettyStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCollectionDate(from: string) {
  const date = new Date(from);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function formatCollectionTimeRange(from: string, to: string) {
  const fmt = (value: string) =>
    new Date(value)
      .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
      .replace(' ', '')
      .toLowerCase();
  return `${fmt(from)} – ${fmt(to)}`;
}

function formatCollectedDate(value: string) {
  const date = new Date(value);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

const cardElevation = Platform.select({
  ios: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  android: { elevation: 3 },
});

function renderCardHeadline(primary: string, secondary: string) {
  return (
    <View style={styles.cardHeadline}>
      <AppText variant="h8" style={styles.cardHeadlinePrimary} numberOfLines={2}>
        {primary}
      </AppText>
      <AppText variant="bodySmall" color={palette.stone} style={styles.cardHeadlineSecondary}>
        {secondary}
      </AppText>
    </View>
  );
}

export function RestaurantUpdatesScreen() {
  useTransparentStatusBar('light');
  const bottomPadding = useBottomTabPadding(hp(3));
  const { currentProfile } = useAppContext();

  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState<typeof MOCK_UPDATES>([]);
  const [updateFilter, setUpdateFilter] = useState<UpdateFilter>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [impactModalVisible, setImpactModalVisible] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [selectedImpact, setSelectedImpact] = useState<any>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickupStatus, setPickupStatus] = useState<Record<string, 'completed' | 'cancelled'>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setUpdates(MOCK_UPDATES);
      setLoading(false);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  const peopleCount = useMemo(
    () => updates.filter((u) => u.audience === 'people').length,
    [updates],
  );
  const animalCount = useMemo(
    () => updates.filter((u) => u.audience === 'animals').length,
    [updates],
  );

  const filteredUpdates = useMemo(() => {
    if (updateFilter === 'people') return updates.filter((u) => u.audience === 'people');
    if (updateFilter === 'animals') return updates.filter((u) => u.audience === 'animals');
    return updates;
  }, [updates, updateFilter]);

  const sections = useMemo(() => {
    const titles = ['TODAY', 'YESTERDAY'] as const;
    return titles
      .map((title) => ({
        title,
        data: filteredUpdates.filter((u) => u.section === title),
      }))
      .filter((s) => s.data.length > 0);
  }, [filteredUpdates]);

  const makeCall = async (phone?: string | null) => {
    if (!phone) {
      showErrorAlert('Phone number not available', 'Unavailable');
      return;
    }
    const cleanPhone = phone.replace(/[^+\d]/g, '');
    try {
      await Linking.openURL(`tel:${cleanPhone}`);
    } catch {
      showErrorAlert('Unable to open dialer', 'Error');
    }
  };

  const sendMessage = async (phone?: string | null) => {
    if (!phone) {
      showErrorAlert('Phone number not available', 'Unavailable');
      return;
    }
    const url = `sms:${phone}`;
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  };

  const renderFilterChip = (key: UpdateFilter, label: string, count: number, icon?: any) => {
    const active = updateFilter === key;
    return (
      <Pressable
        key={key}
        onPress={() => setUpdateFilter(key)}
        style={[styles.filterChip, active ? styles.filterChipActive : styles.filterChipInactive]}
      >
        {icon ? <Image source={icon} style={styles.filterChipIcon} resizeMode="contain" /> : null}
        <AppText
          variant="bodyBold"
          style={[styles.filterChipText, active ? styles.filterChipTextActive : styles.filterChipTextInactive]}
        >
          {label}
        </AppText>
        <View style={[styles.countPill, active ? styles.countPillActive : styles.countPillInactive]}>
          <AppText style={[styles.countPillText, active && styles.countPillTextActive]}>
            {count}
          </AppText>
        </View>
      </Pressable>
    );
  };

  const renderClaimedCard = (item: (typeof MOCK_UPDATES)[number]) => {
    const theme = getTheme(item.audience);
    const statusLabel = prettyStatus(item.assigneeStatus || '');
    const claimerLabel = item.audience === 'animals' ? 'Farmer' : 'Charity';
    const assigneeLabel = item.assigneeLabel ?? 'Driver';

    return (
      <View
        style={[
          styles.card,
          cardElevation,
          {
            borderColor: theme.accent,
            backgroundColor: item.audience === 'animals' ? theme.lightBg : palette.white,
          },
        ]}
      >
        <View style={styles.cardBody}>
          <View style={styles.badgeRow}>
            <View style={[styles.tag, { backgroundColor: theme.statusBg }]}>
              <AppText style={[styles.tagText, { color: theme.accent }]}>CLAIMED</AppText>
            </View>
            <View style={[styles.tagRow, { backgroundColor: theme.statusBg }]}>
              <Image source={theme.categoryIcon} style={styles.tagIcon} resizeMode="contain" />
              <AppText style={[styles.tagText, { color: theme.accent }]}>
                {theme.categoryLabel.toUpperCase()}
              </AppText>
            </View>
            <View style={[styles.tagOutline, { borderColor: theme.accent + '80' }]}>
              <View style={[styles.statusDot, { backgroundColor: theme.accent }]} />
              <AppText style={[styles.tagText, { color: theme.accent }]} numberOfLines={1}>
                {statusLabel.toUpperCase()}
              </AppText>
            </View>
          </View>

          {renderCardHeadline(item.claimerName ?? 'Someone', 'claimed your listing')}

          {/* Location & assignee */}
          <View style={styles.metaStack}>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={normalize(13)} color={theme.accent} />
              <AppText variant="bodySmall" color={palette.stone} style={styles.metaText} numberOfLines={1}>
                {item.location}
              </AppText>
            </View>
            <View style={styles.metaRow}>
              <Ionicons
                name={item.assigneeLabel === 'Farmer' ? 'person-outline' : 'navigate-circle-outline'}
                size={normalize(13)}
                color={theme.accent}
              />
              <AppText variant="bodySmall" color={palette.stone} style={styles.metaText} numberOfLines={1}>
                {item.assigneeLabel}: {item.assigneeName}
              </AppText>
            </View>
          </View>

          <View style={styles.hr} />

          {/* Collection details */}
          <View style={styles.detailRow}>
            <View style={[styles.detailBox, { flex: 1.6 }]}>
              <View style={[styles.detailIconWrap, { backgroundColor: theme.statusBg }]}>
                <Image source={DETAIL_ICONS.calendar} style={styles.detailIconImg} resizeMode="contain" />
              </View>
              <View style={styles.detailTextWrap}>
                <AppText style={styles.detailLabel}>COLLECTION</AppText>
                <AppText variant="bodyBold" style={styles.detailValue} numberOfLines={1}>
                  {formatCollectionDate(item.pickupFrom!)}
                </AppText>
                <AppText variant="bodySmall" color={palette.stone} style={styles.detailSub} numberOfLines={1}>
                  {formatCollectionTimeRange(item.pickupFrom!, item.pickupTo!)}
                </AppText>
              </View>
            </View>
            <View style={[styles.detailBox, { flex: 1 }]}>
              <View style={[styles.detailIconWrap, { backgroundColor: theme.statusBg }]}>
                <Image source={DETAIL_ICONS.basket} style={styles.detailIconImg} resizeMode="contain" />
              </View>
              <View style={styles.detailTextWrap}>
                <AppText style={styles.detailLabel}>QUANTITY</AppText>
                <AppText variant="bodyBold" style={styles.detailValue}>
                  {item.quantityKg} kg
                </AppText>
              </View>
            </View>
          </View>

          {/* View items button */}
          <Pressable
            style={[styles.outlineBtn, { borderColor: theme.accent + '80' }]}
            onPress={() => {
              setSelectedItems(item.items || []);
              setDetailsModalVisible(true);
            }}
          >
            <AppText variant="bodyBold" style={[styles.outlineBtnText, { color: theme.accent }]}>
              View Food Items
            </AppText>
            <Ionicons name="chevron-down" size={normalize(15)} color={theme.accent} />
          </Pressable>

          <View style={styles.hr} />

          {/* Contact grid */}
          <View style={styles.contactGrid}>
            <View style={styles.contactColumn}>
              <AppText style={styles.contactLabel}>{claimerLabel.toUpperCase()}</AppText>
              <View style={styles.contactActions}>
                <Pressable
                  style={[styles.contactActionBtn, { borderColor: theme.accent + '70' }]}
                  onPress={() => makeCall(item.claimerPhone)}
                >
                  <Ionicons name="call-outline" size={normalize(13)} color={theme.accent} />
                  <AppText style={[styles.contactActionText, { color: theme.accent }]}>CALL</AppText>
                </Pressable>
                <Pressable
                  style={[styles.contactActionBtn, { borderColor: theme.accent + '70' }]}
                  onPress={() => sendMessage(item.claimerPhone)}
                >
                  <Ionicons name="chatbubble-outline" size={normalize(13)} color={theme.accent} />
                  <AppText style={[styles.contactActionText, { color: theme.accent }]}>MSG</AppText>
                </Pressable>
              </View>
            </View>
            <View style={styles.contactVDivider} />
            <View style={styles.contactColumn}>
              <AppText style={styles.contactLabel}>{assigneeLabel.toUpperCase()}</AppText>
              <View style={styles.contactActions}>
                <Pressable
                  style={[styles.contactActionBtn, { borderColor: theme.accent + '70' }]}
                  onPress={() => makeCall(item.assigneePhone)}
                >
                  <Ionicons name="call-outline" size={normalize(13)} color={theme.accent} />
                  <AppText style={[styles.contactActionText, { color: theme.accent }]}>CALL</AppText>
                </Pressable>
                <Pressable
                  style={[styles.contactActionBtn, { borderColor: theme.accent + '70' }]}
                  onPress={() => sendMessage(item.assigneePhone)}
                >
                  <Ionicons name="chatbubble-outline" size={normalize(13)} color={theme.accent} />
                  <AppText style={[styles.contactActionText, { color: theme.accent }]}>MSG</AppText>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Pickup CTA */}
          {pickupStatus[item.id] === 'completed' ? (
            <View style={[styles.statusBanner, { backgroundColor: theme.statusBg }]}>
              <Ionicons name="checkmark-circle" size={normalize(18)} color={theme.accent} />
              <AppText variant="bodyBold" style={{ color: theme.accent, textTransform: 'none', fontSize: normalize(14) }}>
                Pickup & survey completed
              </AppText>
            </View>
          ) : pickupStatus[item.id] === 'cancelled' ? (
            <View style={[styles.statusBanner, { backgroundColor: '#FFF0EB' }]}>
              <Ionicons name="close-circle" size={normalize(18)} color={palette.chilli} />
              <AppText variant="bodyBold" style={{ color: palette.chilli, textTransform: 'none', fontSize: normalize(14) }}>
                Pickup cancelled
              </AppText>
            </View>
          ) : (
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
              onPress={() => {
                setSelectedId(item.id);
                setModalVisible(true);
              }}
            >
              <AppText variant="bodyBold" style={styles.primaryBtnText}>
                Complete Pickup
              </AppText>
              <View style={styles.primaryBtnArrow}>
                <Ionicons name="arrow-forward" size={normalize(17)} color={theme.accent} />
              </View>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const renderCollectedCard = (item: (typeof MOCK_UPDATES)[number]) => {
    const theme = getTheme(item.audience);
    const meals = item.mealsCreated ?? estimateMealsSaved(item.quantityKg || 0);
    const co2 = item.co2Avoided ?? Math.round((item.quantityKg || 0) * 4);
    const impactValue = item.audience === 'animals' ? `${co2} kg` : String(meals);
    const impactLabel = item.audience === 'animals' ? 'CO₂ AVOIDED' : 'MEALS CREATED';
    const impactIcon = item.audience === 'animals' ? DETAIL_ICONS.leaf : DETAIL_ICONS.meal;

    return (
      <View
        style={[
          styles.card,
          cardElevation,
          {
            borderColor: theme.accent,
            backgroundColor: item.audience === 'animals' ? theme.lightBg : palette.white,
          },
        ]}
      >
        <View style={styles.cardBody}>
          <View style={styles.badgeRow}>
            <View style={[styles.tagRow, { backgroundColor: theme.statusBg }]}>
              <Ionicons name="checkmark-circle" size={normalize(12)} color={theme.accent} />
              <AppText style={[styles.tagText, { color: theme.accent }]}>COLLECTED</AppText>
            </View>
            <View style={[styles.tagRow, { backgroundColor: theme.statusBg }]}>
              <Image source={theme.categoryIcon} style={styles.tagIcon} resizeMode="contain" />
              <AppText style={[styles.tagText, { color: theme.accent }]}>
                {theme.categoryLabel.toUpperCase()}
              </AppText>
            </View>
          </View>

          {renderCardHeadline('Listing collected', 'Your surplus was picked up successfully')}

          <View style={styles.hr} />

          {/* Date & quantity */}
          <View style={styles.detailRow}>
            <View style={[styles.detailBox, { flex: 1.4 }]}>
              <View style={[styles.detailIconWrap, { backgroundColor: theme.statusBg }]}>
                <Image source={DETAIL_ICONS.calendar} style={styles.detailIconImg} resizeMode="contain" />
              </View>
              <View style={styles.detailTextWrap}>
                <AppText style={styles.detailLabel}>COLLECTED ON</AppText>
                <AppText variant="bodyBold" style={styles.detailValue}>
                  {formatCollectedDate(item.collectedDate!)}
                </AppText>
              </View>
            </View>
            <View style={[styles.detailBox, { flex: 1 }]}>
              <View style={[styles.detailIconWrap, { backgroundColor: theme.statusBg }]}>
                <Image source={DETAIL_ICONS.basket} style={styles.detailIconImg} resizeMode="contain" />
              </View>
              <View style={styles.detailTextWrap}>
                <AppText style={styles.detailLabel}>
                  {item.audience === 'animals' ? 'FEED' : 'FOOD'}
                </AppText>
                <AppText variant="bodyBold" style={styles.detailValue}>
                  {item.quantityKg} kg
                </AppText>
              </View>
            </View>
          </View>

          {/* Impact highlight */}
          <View style={[styles.impactCard, { backgroundColor: theme.lightBg, borderColor: theme.accent + '35' }]}>
            <View style={[styles.impactIconWrap, { backgroundColor: theme.statusBg }]}>
              <Image source={impactIcon} style={styles.impactIconImg} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={[styles.impactValue, { color: theme.accent }]}>{impactValue}</AppText>
              <AppText style={[styles.impactLabel, { color: theme.accent }]}>{impactLabel}</AppText>
            </View>
          </View>

          {/* View impact */}
          <Pressable
            style={[styles.outlineBtn, { borderColor: theme.accent + '80' }]}
            onPress={() => {
              setSelectedImpact(item);
              setImpactModalVisible(true);
            }}
          >
            <AppText variant="bodyBold" style={[styles.outlineBtnText, { color: theme.accent }]}>
              View Impact Details
            </AppText>
            <Ionicons name="chevron-forward" size={normalize(15)} color={theme.accent} />
          </Pressable>
        </View>
      </View>
    );
  };

  const renderCard = (item: (typeof MOCK_UPDATES)[number]) =>
    item.cardType === 'collected' ? renderCollectedCard(item) : renderClaimedCard(item);

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={hp(18)} borderRadius={0} />
      <View style={styles.skeletonFilterRow}>
        <Skeleton width={wp(16)} height={normalize(36)} borderRadius={normalize(20)} />
        <Skeleton width={wp(28)} height={normalize(36)} borderRadius={normalize(20)} />
        <Skeleton width={wp(30)} height={normalize(36)} borderRadius={normalize(20)} />
      </View>
      {[1, 2].map((i) => (
        <View key={i} style={styles.skeletonSection}>
          <Skeleton width={wp(24)} height={normalize(14)} borderRadius={normalize(4)} />
          <View style={[styles.card, { borderColor: palette.strokecream }]}>
            <View style={styles.cardBody}>
              <View style={{ flexDirection: 'row', gap: wp(2) }}>
                <Skeleton width={wp(18)} height={normalize(22)} borderRadius={normalize(6)} />
                <Skeleton width={wp(26)} height={normalize(22)} borderRadius={normalize(6)} />
              </View>
              <Skeleton width="72%" height={normalize(18)} borderRadius={normalize(4)} />
              <Skeleton width="50%" height={normalize(14)} borderRadius={normalize(4)} />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: palette.strokecream }} />
              <View style={{ flexDirection: 'row', gap: wp(2) }}>
                <Skeleton width={wp(34)} height={normalize(54)} borderRadius={normalize(10)} />
                <Skeleton width={wp(22)} height={normalize(54)} borderRadius={normalize(10)} />
              </View>
              <Skeleton width="55%" height={normalize(40)} borderRadius={normalize(10)} style={{ alignSelf: 'center' }} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  if (loading) {
    return (
      <Screen backgroundColor={palette.background} scrollable={false} transparentTop>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={renderSkeleton}
          contentContainerStyle={[styles.container, { paddingBottom: hp(3) }]}
        />
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={palette.background} scrollable={false} transparentTop>
      <StatusBar style="light" translucent backgroundColor="transparent" />

      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        contentContainerStyle={[styles.container, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <HeroHeader
               
              source={require('../../../assets/placeholder/modal-head-backgrounda.png')}
              height={hp(20)}
            >
              
              <View style={styles.heroContent}>
                <View style={styles.heroTopRow}>
                  <View style={styles.heroTextBlock}>
                    <AppText variant="caption" style={styles.heroEyebrow} numberOfLines={1}>
                      {currentProfile.organization || 'Your business'}
                    </AppText>
                    <AppText variant="h6" style={styles.heroTitle} numberOfLines={1}>
                      Your updates
                    </AppText>
                    <AppText variant="bodySmall" style={styles.heroSubtitle} numberOfLines={2}>
                      Track claims, pickups, and collections in one place
                    </AppText>
                  </View>
                  <View style={styles.heroIconCircle}>
                    <Ionicons name="notifications" size={normalize(26)} color={palette.eggplant} />
                  </View>
                </View>
                <View style={styles.heroStatsPill}>
                  <Ionicons name="pulse-outline" size={normalize(14)} color={palette.white} />
                  <AppText variant="caption" style={styles.heroStatsText} numberOfLines={1}>
                    {updates.length} active update{updates.length !== 1 ? 's' : ''} · {peopleCount} people · {animalCount} animals
                  </AppText>
                </View>
              </View>
            </HeroHeader>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScrollWrap}
              contentContainerStyle={styles.filterScroll}
            >
              {renderFilterChip('all', 'All', updates.length)}
              {renderFilterChip('people', 'For People', peopleCount, PEOPLE_THEME.categoryIcon)}
              {renderFilterChip('animals', 'For Animals', animalCount, ANIMAL_THEME.categoryIcon)}
            </ScrollView>
          </>
        }
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText variant="h8" style={styles.sectionTitle}>
                {section.title}
              </AppText>
            </View>
            <View style={styles.sectionCards}>
              {section.data.map((update) => (
                <View key={update.id}>{renderCard(update)}</View>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={normalize(52)} color={palette.strokecream} />
            <AppText variant="bodyBold" color={palette.stone} style={styles.emptyTitle}>
              No updates yet
            </AppText>
            <AppText variant="bodySmall" color={palette.stone} style={styles.emptyBody}>
              When your listings are claimed or collected, they'll appear here.
            </AppText>
          </View>
        }
      />

      <PostPickupSurveyModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        selectedId={selectedId}
        onComplete={(id, status) => {
          setPickupStatus((prev) => ({ ...prev, [id]: status }));
          setModalVisible(false);
        }}
      />

      {/* Food items modal */}
      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <AppText variant="h6">Food Items</AppText>
              <Pressable style={styles.modalCloseBtn} onPress={() => setDetailsModalVisible(false)}>
                <Ionicons name="close" size={normalize(20)} color={palette.black} />
              </Pressable>
            </View>
            <View style={styles.modalDivider} />
            {selectedItems.map((food, index) => (
              <View key={index} style={styles.foodItemRow}>
                <View style={styles.foodItemDot} />
                <AppText variant="body1" color={palette.black} style={{ flex: 1 }}>
                  {food.name}
                </AppText>
                <AppText variant="bodyBold" color={palette.stone}>
                  {food.qty}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      </Modal>

      {/* Impact modal */}
      <Modal
        visible={impactModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setImpactModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <AppText variant="h6">Impact Details</AppText>
              <Pressable style={styles.modalCloseBtn} onPress={() => setImpactModalVisible(false)}>
                <Ionicons name="close" size={normalize(20)} color={palette.black} />
              </Pressable>
            </View>
            <View style={styles.modalDivider} />
            {selectedImpact != null && (() => {
              const theme = getTheme(selectedImpact.audience);
              const meals = selectedImpact.mealsCreated ?? estimateMealsSaved(selectedImpact.quantityKg);
              const co2 = selectedImpact.co2Avoided ?? Math.round(selectedImpact.quantityKg * 4);
              return (
                <View style={{ gap: hp(1.4) }}>
                  <View style={[styles.impactModalCategory, { backgroundColor: theme.statusBg }]}>
                    <Image source={theme.categoryIcon} style={styles.impactModalCatIcon} resizeMode="contain" />
                    <AppText variant="bodyBold" style={{ color: theme.accent }}>
                      {theme.categoryLabel}
                    </AppText>
                  </View>
                  <View style={styles.impactModalRow}>
                    <AppText variant="bodySmall" color={palette.stone}>Quantity rescued</AppText>
                    <AppText variant="bodyBold" color={palette.black}>{selectedImpact.quantityKg} kg</AppText>
                  </View>
                  <View style={styles.impactModalRow}>
                    <AppText variant="bodySmall" color={palette.stone}>Date collected</AppText>
                    <AppText variant="bodyBold" color={palette.black}>
                      {formatCollectedDate(selectedImpact.collectedDate)}
                    </AppText>
                  </View>
                  <View style={[styles.impactHighlightBox, { backgroundColor: theme.lightBg, borderColor: theme.accent + '40' }]}>
                    <AppText variant="h4" style={{ color: theme.accent, textTransform: 'none' }}>
                      {selectedImpact.audience === 'people' ? `${meals} meals` : `${co2} kg CO₂`}
                    </AppText>
                    <AppText variant="caption" style={{ color: theme.accent, letterSpacing: 0.5 }}>
                      {selectedImpact.audience === 'people' ? 'CREATED FROM YOUR DONATION' : 'OF EMISSIONS AVOIDED'}
                    </AppText>
                  </View>
                </View>
              );
            })()}
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
      android: { elevation: 3 },
    }),
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
  },

  // ── Filter chips ──────────────────────────────────────────────────
  filterScrollWrap: {
    marginTop: hp(1.6),
    marginBottom: hp(0.2),
  },
  filterScroll: {
    paddingHorizontal: wp(4),
    paddingRight: wp(6),
    gap: wp(2),
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.85),
    borderRadius: normalize(24),
    borderWidth: normalize(1.5),
  },
  filterChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  filterChipInactive: {
    backgroundColor: palette.white,
    borderColor: palette.strokecream,
  },
  filterChipIcon: {
    width: normalize(15),
    height: normalize(15),
  },
  filterChipText: {
    fontSize: normalize(13),
    textTransform: 'none',
    letterSpacing: 0,
  },
  filterChipTextActive: { color: palette.white },
  filterChipTextInactive: { color: palette.stone },
  countPill: {
    minWidth: normalize(20),
    height: normalize(20),
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: normalize(5),
  },
  countPillActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  countPillInactive: { backgroundColor: palette.surfaceMuted },
  countPillText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(10),
    color: palette.stone,
  },
  countPillTextActive: { color: palette.white },

  // ── Sections ──────────────────────────────────────────────────────
  section: {
    paddingHorizontal: wp(4),
    gap: hp(1.2),
    marginTop: hp(1.2),
  },
  sectionHeader: {
    paddingLeft: wp(0.5),
  },
  sectionTitle: {
    textTransform: 'none',
    color: palette.black,
    fontSize: normalize(18),
    lineHeight: normalize(24),
  },
  sectionCards: {
    gap: hp(1.4),
  },

  // ── Base card ─────────────────────────────────────────────────────
  card: {
    borderRadius: normalize(14),
    borderWidth: normalize(1),
    backgroundColor: palette.white,
  },
  cardBody: {
    padding: wp(4),
    gap: hp(1.2),
  },
  cardHeadline: {
    gap: hp(0.35),
  },
  cardHeadlinePrimary: {
    textTransform: 'none',
    fontSize: normalize(18),
    lineHeight: normalize(24),
    color: palette.black,
  },
  cardHeadlineSecondary: {
    textTransform: 'none',
    fontSize: normalize(14),
    lineHeight: normalize(19),
  },

  // ── Tags / badges ─────────────────────────────────────────────────
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.5),
    alignItems: 'center',
  },
  tag: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.45),
    borderRadius: normalize(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.45),
    borderRadius: normalize(6),
  },
  tagText: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(10),
    letterSpacing: 0.4,
  },
  tagIcon: {
    width: normalize(12),
    height: normalize(12),
  },
  tagOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.45),
    borderRadius: normalize(6),
    borderWidth: normalize(1),
  },
  statusDot: {
    width: normalize(5),
    height: normalize(5),
    borderRadius: normalize(2.5),
  },

  metaStack: {
    gap: hp(0.5),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  metaText: {
    textTransform: 'none',
    fontSize: normalize(13),
    flex: 1,
  },
  hr: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.strokecream,
    marginVertical: hp(0.1),
  },

  // ── Detail boxes ──────────────────────────────────────────────────
  detailRow: {
    flexDirection: 'row',
    gap: wp(2),
    alignItems: 'stretch',
  },
  detailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    backgroundColor: '#FAFAF8',
    borderRadius: normalize(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.strokecream,
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(1.1),
    minWidth: 0,
  },
  detailIconWrap: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(9),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailIconImg: {
    width: normalize(20),
    height: normalize(20),
  },
  detailTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: hp(0.12),
  },
  detailLabel: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(9),
    letterSpacing: 0.5,
    color: palette.stone,
  },
  detailValue: {
    textTransform: 'none',
    fontSize: normalize(13),
    lineHeight: normalize(17),
    color: palette.black,
    fontFamily: 'Saveful-Bold',
  },
  detailSub: {
    textTransform: 'none',
    fontSize: normalize(11),
  },

  // ── Outline button ────────────────────────────────────────────────
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    paddingVertical: hp(1.1),
    paddingHorizontal: wp(4),
    borderRadius: normalize(10),
    borderWidth: normalize(1.5),
  },
  outlineBtnText: {
    textTransform: 'none',
    fontSize: normalize(14),
    fontFamily: 'Saveful-SemiBold',
  },

  // ── Contact grid ──────────────────────────────────────────────────
  contactGrid: {
    flexDirection: 'row',
    gap: wp(3),
  },
  contactColumn: {
    flex: 1,
    gap: hp(0.7),
  },
  contactVDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: palette.strokecream,
    alignSelf: 'stretch',
  },
  contactLabel: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(10),
    letterSpacing: 0.8,
    color: palette.stone,
  },
  contactActions: {
    flexDirection: 'row',
    gap: wp(1.5),
  },
  contactActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(0.8),
    paddingVertical: hp(0.9),
    borderRadius: normalize(8),
    borderWidth: normalize(1.5),
    backgroundColor: palette.white,
  },
  contactActionText: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(10),
    letterSpacing: 0.4,
  },

  // ── Primary CTA ───────────────────────────────────────────────────
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.45),
    paddingHorizontal: wp(4),
    borderRadius: normalize(12),
  },
  primaryBtnText: {
    color: palette.white,
    textTransform: 'none',
    fontSize: normalize(15),
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Saveful-Bold',
  },
  primaryBtnArrow: {
    width: normalize(30),
    height: normalize(30),
    borderRadius: normalize(15),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    borderRadius: normalize(10),
  },

  // ── Impact card (collected) ───────────────────────────────────────
  impactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3.5),
    paddingVertical: hp(1.7),
    paddingHorizontal: wp(3.5),
    borderRadius: normalize(12),
    borderWidth: normalize(1),
  },
  impactIconWrap: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  impactIconImg: {
    width: normalize(26),
    height: normalize(26),
  },
  impactValue: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(22),
    lineHeight: normalize(26),
    textTransform: 'none',
  },
  impactLabel: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(10),
    letterSpacing: 0.5,
    marginTop: hp(0.2),
  },

  // ── Empty state ───────────────────────────────────────────────────
  emptyState: {
    paddingTop: hp(6),
    paddingHorizontal: wp(10),
    alignItems: 'center',
    gap: hp(1.2),
  },
  emptyTitle: {
    textTransform: 'none',
    textAlign: 'center',
    fontSize: normalize(16),
    marginTop: hp(0.5),
  },
  emptyBody: {
    textTransform: 'none',
    textAlign: 'center',
    lineHeight: normalize(20),
  },

  // ── Modals ────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: palette.white,
    borderTopLeftRadius: normalize(28),
    borderTopRightRadius: normalize(28),
    paddingHorizontal: wp(5),
    paddingTop: hp(1),
    paddingBottom: hp(5.5),
    gap: hp(1.4),
  },
  modalHandle: {
    width: normalize(40),
    height: normalize(4),
    borderRadius: normalize(2),
    backgroundColor: palette.strokecream,
    alignSelf: 'center',
    marginBottom: hp(0.3),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalCloseBtn: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    backgroundColor: palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.strokecream,
    marginVertical: hp(0.2),
  },
  foodItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    paddingVertical: hp(1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.strokecream,
  },
  foodItemDot: {
    width: normalize(6),
    height: normalize(6),
    borderRadius: normalize(3),
    backgroundColor: palette.strokecream,
  },
  impactModalCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    borderRadius: normalize(10),
  },
  impactModalCatIcon: {
    width: normalize(20),
    height: normalize(20),
  },
  impactModalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: hp(0.8),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.strokecream,
  },
  impactHighlightBox: {
    borderRadius: normalize(14),
    borderWidth: normalize(1),
    paddingVertical: hp(2.2),
    paddingHorizontal: wp(4),
    alignItems: 'center',
    gap: hp(0.5),
    marginTop: hp(0.3),
  },

  skeletonWrap: {
    gap: hp(1.4),
  },
  skeletonFilterRow: {
    flexDirection: 'row',
    gap: wp(2),
    paddingHorizontal: wp(4),
    marginTop: hp(1.6),
  },
  skeletonSection: {
    paddingHorizontal: wp(4),
    gap: hp(1.2),
    marginTop: hp(1.2),
  },
});
