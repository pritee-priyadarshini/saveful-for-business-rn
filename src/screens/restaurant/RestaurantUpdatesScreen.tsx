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
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { HeroHeader } from '../../components/HeroHeader';
import { Skeleton } from '../../components/Skeleton';
import { palette } from '../../theme/colors';
import { elevation } from '@/theme/elevation';
import { PostPickupSurveyModal } from './components/postPickupSurveyModal';
import { estimateMealsSaved } from '../../utils/foodListing';
import { showErrorAlert } from '@/utils/apiError';
import { hp, normalize, useResponsiveLayout, wp } from '@/utils/responsive';
import { buildDashboardShellStyles } from '@/utils/dashboardAdaptive';
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

function renderCardHeadline(
  primary: string,
  secondary: string,
  textStyles?: { primary?: TextStyle; secondary?: TextStyle },
) {
  return (
    <View style={styles.cardHeadline}>
      <AppText
        variant="h8"
        style={[styles.cardHeadlinePrimary, textStyles?.primary]}
        numberOfLines={2}
      >
        {primary}
      </AppText>
      <AppText
        variant="bodySmall"
        color={palette.stone}
        style={[styles.cardHeadlineSecondary, textStyles?.secondary]}
      >
        {secondary}
      </AppText>
    </View>
  );
}

export function RestaurantUpdatesScreen() {
  useTransparentStatusBar('light');
  const r = useResponsiveLayout();
  const adaptive = useMemo(() => buildDashboardShellStyles(r, { heroPhoneHp: 20 }), [r]);
  const bottomPadding = useBottomTabPadding(r.isTablet ? 24 : hp(3));
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
        style={[
          styles.filterChip,
          adaptive.filterChip,
          active ? styles.filterChipActive : styles.filterChipInactive,
        ]}
      >
        {icon ? (
          <Image
            source={icon}
            style={[styles.filterChipIcon, adaptive.filterChipIcon]}
            resizeMode="contain"
          />
        ) : null}
        <AppText
          variant="bodyBold"
          style={[
            styles.filterChipText,
            adaptive.filterChipText,
            active ? styles.filterChipTextActive : styles.filterChipTextInactive,
          ]}
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
          adaptive.updateCard,
          elevation.flat,
          {
            borderColor: theme.accent,
            backgroundColor: item.audience === 'animals' ? theme.lightBg : palette.white,
          },
        ]}
      >
        <View style={[styles.cardBody, adaptive.updateCardBody]}>
          <View style={styles.badgeRow}>
            <View style={[styles.tag, { backgroundColor: theme.statusBg }]}>
              <AppText style={[styles.tagText, adaptive.tagText, { color: theme.accent }]}>CLAIMED</AppText>
            </View>
            <View style={[styles.tagRow, { backgroundColor: theme.statusBg }]}>
              <Image source={theme.categoryIcon} style={styles.tagIcon} resizeMode="contain" />
              <AppText style={[styles.tagText, adaptive.tagText, { color: theme.accent }]}>
                {theme.categoryLabel.toUpperCase()}
              </AppText>
            </View>
            <View style={[styles.tagOutline, { borderColor: theme.accent + '80' }]}>
              <View style={[styles.statusDot, { backgroundColor: theme.accent }]} />
              <AppText style={[styles.tagText, adaptive.tagText, { color: theme.accent }]} numberOfLines={1}>
                {statusLabel.toUpperCase()}
              </AppText>
            </View>
          </View>

          {renderCardHeadline(item.claimerName ?? 'Someone', 'claimed your listing', {
            primary: adaptive.cardHeadlinePrimary,
            secondary: adaptive.cardHeadlineSecondary,
          })}

          <View style={[styles.metaStack, adaptive.updateMetaStack]}>
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

          <View style={[styles.detailRow, r.isTablet && styles.detailActionRow]}>
            <View style={[styles.detailBox, adaptive.detailBox, r.isTablet ? styles.detailActionGrow : { flex: 1.6 }]}>
              <View style={[styles.detailIconWrap, { backgroundColor: theme.statusBg }]}>
                <Image source={DETAIL_ICONS.calendar} style={styles.detailIconImg} resizeMode="contain" />
              </View>
              <View style={styles.detailTextWrap}>
                <AppText style={[styles.detailLabel, adaptive.detailLabel]}>COLLECTION</AppText>
                <AppText variant="bodyBold" style={[styles.detailValue, adaptive.detailValue]} numberOfLines={1}>
                  {formatCollectionDate(item.pickupFrom!)}
                </AppText>
                <AppText variant="bodySmall" color={palette.stone} style={styles.detailSub} numberOfLines={1}>
                  {formatCollectionTimeRange(item.pickupFrom!, item.pickupTo!)}
                </AppText>
              </View>
            </View>
            <View style={[styles.detailBox, adaptive.detailBox, r.isTablet ? styles.detailActionGrow : { flex: 1 }]}>
              <View style={[styles.detailIconWrap, { backgroundColor: theme.statusBg }]}>
                <Image source={DETAIL_ICONS.basket} style={styles.detailIconImg} resizeMode="contain" />
              </View>
              <View style={styles.detailTextWrap}>
                <AppText style={[styles.detailLabel, adaptive.detailLabel]}>QUANTITY</AppText>
                <AppText variant="bodyBold" style={[styles.detailValue, adaptive.detailValue]} numberOfLines={1}>
                  {item.quantityKg} kg
                </AppText>
              </View>
            </View>
            <Pressable
              style={[
                styles.outlineBtn,
                styles.outlineBtnInline,
                r.isTablet ? styles.detailActionBtn : styles.outlineBtnFull,
                { borderColor: theme.accent + '80' },
              ]}
              onPress={() => {
                setSelectedItems(item.items || []);
                setDetailsModalVisible(true);
              }}
            >
              <AppText
                variant="bodyBold"
                style={[styles.outlineBtnText, styles.outlineBtnTextInline, { color: theme.accent }]}
                numberOfLines={1}
              >
                View Items
              </AppText>
              <Ionicons name="chevron-down" size={normalize(15)} color={theme.accent} />
            </Pressable>
          </View>

          <View style={styles.hr} />

          <View style={styles.contactGrid}>
            <View style={styles.contactColumn}>
              <AppText style={styles.contactLabel}>{claimerLabel.toUpperCase()}</AppText>
              <View style={styles.contactActions}>
                <Pressable
                  style={[styles.contactActionBtn, adaptive.actionBtn, { borderColor: theme.accent + '70' }]}
                  onPress={() => makeCall(item.claimerPhone)}
                >
                  <Ionicons name="call-outline" size={normalize(13)} color={theme.accent} />
                  <AppText style={[styles.contactActionText, adaptive.actionBtnText, { color: theme.accent }]}>
                    CALL
                  </AppText>
                </Pressable>
                <Pressable
                  style={[styles.contactActionBtn, adaptive.actionBtn, { borderColor: theme.accent + '70' }]}
                  onPress={() => sendMessage(item.claimerPhone)}
                >
                  <Ionicons name="chatbubble-outline" size={normalize(13)} color={theme.accent} />
                  <AppText style={[styles.contactActionText, adaptive.actionBtnText, { color: theme.accent }]}>
                    MSG
                  </AppText>
                </Pressable>
              </View>
            </View>
            <View style={styles.contactVDivider} />
            <View style={styles.contactColumn}>
              <AppText style={styles.contactLabel}>{assigneeLabel.toUpperCase()}</AppText>
              <View style={styles.contactActions}>
                <Pressable
                  style={[styles.contactActionBtn, adaptive.actionBtn, { borderColor: theme.accent + '70' }]}
                  onPress={() => makeCall(item.assigneePhone)}
                >
                  <Ionicons name="call-outline" size={normalize(13)} color={theme.accent} />
                  <AppText style={[styles.contactActionText, adaptive.actionBtnText, { color: theme.accent }]}>
                    CALL
                  </AppText>
                </Pressable>
                <Pressable
                  style={[styles.contactActionBtn, adaptive.actionBtn, { borderColor: theme.accent + '70' }]}
                  onPress={() => sendMessage(item.assigneePhone)}
                >
                  <Ionicons name="chatbubble-outline" size={normalize(13)} color={theme.accent} />
                  <AppText style={[styles.contactActionText, adaptive.actionBtnText, { color: theme.accent }]}>
                    MSG
                  </AppText>
                </Pressable>
              </View>
            </View>
          </View>

          {pickupStatus[item.id] === 'completed' ? (
            <View style={[styles.statusBanner, { backgroundColor: theme.statusBg }]}>
              <Ionicons name="checkmark-circle" size={normalize(18)} color={theme.accent} />
              <AppText
                variant="bodyBold"
                style={{ color: theme.accent, textTransform: 'none', fontSize: normalize(14) }}
              >
                Pickup & survey completed
              </AppText>
            </View>
          ) : pickupStatus[item.id] === 'cancelled' ? (
            <View style={[styles.statusBanner, { backgroundColor: '#FFF0EB' }]}>
              <Ionicons name="close-circle" size={normalize(18)} color={palette.chilli} />
              <AppText
                variant="bodyBold"
                style={{ color: palette.chilli, textTransform: 'none', fontSize: normalize(14) }}
              >
                Pickup cancelled
              </AppText>
            </View>
          ) : (
            <Pressable
              style={[styles.primaryBtn, adaptive.primaryActionBtn, { backgroundColor: theme.accent }]}
              onPress={() => {
                setSelectedId(item.id);
                setModalVisible(true);
              }}
            >
              <AppText variant="bodyBold" style={[styles.primaryBtnText, adaptive.primaryActionBtnText]}>
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
          adaptive.updateCard,
          elevation.flat,
          {
            borderColor: theme.accent,
            backgroundColor: item.audience === 'animals' ? theme.lightBg : palette.white,
          },
        ]}
      >
        <View style={[styles.cardBody, adaptive.updateCardBody]}>
          <View style={styles.badgeRow}>
            <View style={[styles.tagRow, { backgroundColor: theme.statusBg }]}>
              <Ionicons name="checkmark-circle" size={normalize(12)} color={theme.accent} />
              <AppText style={[styles.tagText, adaptive.tagText, { color: theme.accent }]}>COLLECTED</AppText>
            </View>
            <View style={[styles.tagRow, { backgroundColor: theme.statusBg }]}>
              <Image source={theme.categoryIcon} style={styles.tagIcon} resizeMode="contain" />
              <AppText style={[styles.tagText, adaptive.tagText, { color: theme.accent }]}>
                {theme.categoryLabel.toUpperCase()}
              </AppText>
            </View>
          </View>

          {renderCardHeadline('Listing collected', 'Your surplus was picked up successfully', {
            primary: adaptive.cardHeadlinePrimary,
            secondary: adaptive.cardHeadlineSecondary,
          })}

          <View style={styles.hr} />

          <View style={[styles.detailRow, r.isTablet && styles.detailActionRow]}>
            <View style={[styles.detailBox, adaptive.detailBox, r.isTablet ? styles.detailActionGrow : { flex: 1.4 }]}>
              <View style={[styles.detailIconWrap, { backgroundColor: theme.statusBg }]}>
                <Image source={DETAIL_ICONS.calendar} style={styles.detailIconImg} resizeMode="contain" />
              </View>
              <View style={styles.detailTextWrap}>
                <AppText style={[styles.detailLabel, adaptive.detailLabel]}>COLLECTED ON</AppText>
                <AppText variant="bodyBold" style={[styles.detailValue, adaptive.detailValue]} numberOfLines={1}>
                  {formatCollectedDate(item.collectedDate!)}
                </AppText>
              </View>
            </View>
            <View style={[styles.detailBox, adaptive.detailBox, r.isTablet ? styles.detailActionGrow : { flex: 1 }]}>
              <View style={[styles.detailIconWrap, { backgroundColor: theme.statusBg }]}>
                <Image source={DETAIL_ICONS.basket} style={styles.detailIconImg} resizeMode="contain" />
              </View>
              <View style={styles.detailTextWrap}>
                <AppText style={[styles.detailLabel, adaptive.detailLabel]}>
                  {item.audience === 'animals' ? 'FEED' : 'FOOD'}
                </AppText>
                <AppText variant="bodyBold" style={[styles.detailValue, adaptive.detailValue]} numberOfLines={1}>
                  {item.quantityKg} kg
                </AppText>
              </View>
            </View>
            {r.isTablet ? (
              <View
                style={[
                  styles.impactCard,
                  styles.detailActionGrow,
                  styles.impactCardCompact,
                  { backgroundColor: theme.lightBg, borderColor: theme.accent + '35' },
                ]}
              >
                <View style={[styles.impactIconWrap, styles.impactIconWrapCompact, { backgroundColor: theme.statusBg }]}>
                  <Image source={impactIcon} style={styles.impactIconImgCompact} resizeMode="contain" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText
                    style={[styles.impactValue, styles.impactValueCompact, adaptive.impactValue, { color: theme.accent }]}
                    numberOfLines={1}
                  >
                    {impactValue}
                  </AppText>
                  <AppText
                    style={[styles.impactLabel, styles.impactLabelCompact, { color: theme.accent }]}
                    numberOfLines={1}
                  >
                    {impactLabel}
                  </AppText>
                </View>
              </View>
            ) : null}
          </View>

          {!r.isTablet ? (
            <View style={[styles.impactCard, { backgroundColor: theme.lightBg, borderColor: theme.accent + '35' }]}>
              <View style={[styles.impactIconWrap, { backgroundColor: theme.statusBg }]}>
                <Image source={impactIcon} style={styles.impactIconImg} resizeMode="contain" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText style={[styles.impactValue, adaptive.impactValue, { color: theme.accent }]}>
                  {impactValue}
                </AppText>
                <AppText style={[styles.impactLabel, { color: theme.accent }]}>{impactLabel}</AppText>
              </View>
            </View>
          ) : null}

          <Pressable
            style={[styles.outlineBtn, styles.outlineBtnInline, { borderColor: theme.accent + '80' }]}
            onPress={() => {
              setSelectedImpact(item);
              setImpactModalVisible(true);
            }}
          >
            <AppText
              variant="bodyBold"
              style={[styles.outlineBtnText, styles.outlineBtnTextInline, { color: theme.accent }]}
              numberOfLines={1}
            >
              Impact Details
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
      <Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={renderSkeleton}
          contentContainerStyle={[styles.container, styles.containerGrow, { paddingBottom: hp(3) }]}
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
        contentContainerStyle={[
          styles.container,
          adaptive.scrollContent,
          { paddingBottom: bottomPadding },
          // Only fill the viewport when there is nothing to list — otherwise
          // flexGrow stretches ListHeader and hides section cards below.
          sections.length === 0 && styles.containerGrow,
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <HeroHeader
              source={require('../../../assets/placeholder/modal-head-backgrounda.png')}
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
                      {currentProfile.organization || 'Your business'}
                    </AppText>
                    <AppText
                      variant="h6"
                      style={[styles.heroTitle, adaptive.heroTitle]}
                      numberOfLines={1}
                    >
                      Your updates
                    </AppText>
                    <AppText
                      variant="bodySmall"
                      style={[styles.heroSubtitle, adaptive.heroSubtitle]}
                      numberOfLines={2}
                    >
                      Track claims, pickups, and collections in one place
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
                    {updates.length} active update{updates.length !== 1 ? 's' : ''} · {peopleCount} people · {animalCount} animals
                  </AppText>
                </View>
              </View>
            </HeroHeader>

            <View style={[styles.filterScrollWrap, adaptive.filterScroll]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScrollView}
                contentContainerStyle={styles.filterScroll}
              >
                {renderFilterChip('all', 'All', updates.length)}
                {renderFilterChip('people', 'For People', peopleCount, PEOPLE_THEME.categoryIcon)}
                {renderFilterChip('animals', 'For Animals', animalCount, ANIMAL_THEME.categoryIcon)}
              </ScrollView>
            </View>
          </View>
        }
        renderItem={({ item: section }) => (
          <View style={[styles.section, adaptive.section]}>
            <View style={styles.sectionHeader}>
              <AppText variant="h8" style={[styles.sectionTitle, adaptive.sectionTitle]}>
                {section.title}
              </AppText>
            </View>
            <View style={styles.sectionCards}>
              {section.data.map((update) => (
                <View key={update.id} style={styles.sectionCardItem}>
                  {renderCard(update)}
                </View>
              ))}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={[styles.emptyState, adaptive.section]}>
            <Ionicons name="notifications-outline" size={normalize(52)} color={palette.strokecream} />
            <AppText
              variant="bodyBold"
              color={palette.stone}
              style={[styles.emptyTitle, adaptive.emptyText]}
            >
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
    marginTop: -hp(2),
  },

  containerGrow: {
    flexGrow: 1,
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
    ...elevation.soft,
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

  // ── Filter chips ──────────────────────────────────────────────────
  filterScrollWrap: {
    marginTop: hp(1.2),
    marginBottom: hp(0.8),
    width: '100%',
  },
  filterScrollView: {
    flexGrow: 0,
  },
  filterScroll: {
    paddingHorizontal: wp(5),
    paddingRight: wp(6),
    gap: wp(2),
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(0.75),
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
    width: normalize(14),
    height: normalize(14),
  },
  filterChipText: {
    fontSize: normalize(12),
    textTransform: 'none',
    letterSpacing: 0,
  },
  filterChipTextActive: { color: palette.white },
  filterChipTextInactive: { color: palette.stone },
  countPill: {
    minWidth: normalize(18),
    height: normalize(18),
    borderRadius: normalize(9),
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
    paddingHorizontal: wp(5),
    gap: hp(1),
    marginTop: hp(0.8),
  },
  sectionHeader: {
    paddingLeft: wp(0.5),
  },
  sectionTitle: {
    textTransform: 'none',
    color: palette.black,
    fontSize: normalize(16),
    lineHeight: normalize(22),
  },
  sectionCards: {
    gap: hp(1),
    width: '100%',
  },
  sectionCardItem: {
    width: '100%',
  },

  // ── Base card ─────────────────────────────────────────────────────
  card: {
    borderRadius: normalize(14),
    borderWidth: normalize(1),
    backgroundColor: palette.white,
    width: '100%',
  },
  cardBody: {
    padding: wp(3.5),
    gap: hp(0.9),
  },
  cardHeadline: {
    gap: hp(0.3),
  },
  cardHeadlinePrimary: {
    textTransform: 'none',
    fontSize: normalize(16),
    lineHeight: normalize(22),
    color: palette.black,
  },
  cardHeadlineSecondary: {
    textTransform: 'none',
    fontSize: normalize(13),
    lineHeight: normalize(18),
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
    flexWrap: 'wrap',
    gap: wp(2),
    alignItems: 'stretch',
    width: '100%',
  },
  // Tablet: keep collection / quantity / action on one line (no nested rows).
  detailActionRow: {
    flexWrap: 'nowrap',
  },
  detailActionGrow: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  detailActionBtn: {
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'stretch',
    justifyContent: 'center',
    minWidth: 128,
    maxWidth: 160,
    paddingHorizontal: 10,
    paddingVertical: 0,
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
  outlineBtnFull: {
    width: '100%',
    flexBasis: '100%',
  },
  outlineBtnInline: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
  },
  outlineBtnCompact: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  outlineBtnText: {
    textTransform: 'none',
    fontSize: normalize(14),
    fontFamily: 'Saveful-SemiBold',
  },
  outlineBtnTextInline: {
    flexShrink: 0,
  },
  outlineBtnTextCompact: {
    fontSize: normalize(13),
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
    gap: wp(3),
    paddingVertical: hp(1.3),
    paddingHorizontal: wp(3),
    borderRadius: normalize(12),
    borderWidth: normalize(1),
  },
  impactCardCompact: {
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 0,
    alignSelf: 'stretch',
  },
  impactIconWrap: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  impactIconWrapCompact: {
    width: 32,
    height: 32,
    borderRadius: 9,
  },
  impactIconImg: {
    width: normalize(26),
    height: normalize(26),
  },
  impactIconImgCompact: {
    width: 18,
    height: 18,
  },
  impactValue: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(18),
    lineHeight: normalize(22),
    textTransform: 'none',
  },
  impactValueCompact: {
    fontSize: normalize(15),
    lineHeight: normalize(18),
  },
  impactLabel: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(10),
    letterSpacing: 0.5,
    marginTop: hp(0.2),
  },
  impactLabelCompact: {
    marginTop: 0,
    fontSize: normalize(9),
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
    fontSize: normalize(15),
    marginTop: hp(0.5),
  },
  emptyBody: {
    textTransform: 'none',
    textAlign: 'center',
    lineHeight: normalize(18),
    fontSize: normalize(13),
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
