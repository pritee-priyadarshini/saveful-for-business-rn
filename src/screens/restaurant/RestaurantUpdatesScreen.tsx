import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  Image,
  Alert,
  Linking,
  Dimensions,
  ViewStyle,
  TextStyle,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Skeleton } from '../../components/Skeleton';

import { palette } from '../../theme/colors';
import { PostPickupSurveyModal } from './components/postPickupSurveyModal';
import { estimateMealsSaved } from '../../utils/foodListing';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

type ThemeStyleSet = {
  updateCard: ViewStyle;
  statusBadge: ViewStyle;
  accentText: TextStyle;
  categoryBadge: ViewStyle;
  statusOutlineBadge: ViewStyle;
  detailBox: ViewStyle;
  detailIconCircle: ViewStyle;
  viewDetailsBtn: ViewStyle;
  contactBtn: ViewStyle;
  contactActionText: TextStyle;
  completeBtn: ViewStyle;
  completedText: TextStyle;
  impactBtn: ViewStyle;
  impactLinkText: TextStyle;
  impactHighlight: TextStyle;
  accentColor: string;
};

type DetailBoxLayout = 'wide' | 'normal' | 'full';

const DETAIL_ICONS = {
  calendar: require('../../../assets/placeholder/calender_icon.png'),
  basket: require('../../../assets/placeholder/veggie_basket_icon.png'),
  clock: require('../../../assets/placeholder/clock_icon.png'),
  leaf: require('../../../assets/placeholder/leaf_icon.png'),
  meal: require('../../../assets/placeholder/meal_icon.png'),
};

type UpdateFilter = 'all' | 'people' | 'animals';
type Audience = 'people' | 'animals';

type UpdateTheme = {
  accent: string;
  statusBg: string;
  lightBg: string;
  border: string;
  categoryLabel: string;
  categoryIcon: any;
};

const PEOPLE_THEME: UpdateTheme = {
  accent: palette.kale,
  statusBg: '#D8EBDF',
  lightBg: '#F2F8F4',
  border: palette.kale,
  categoryLabel: 'For People',
  categoryIcon: require('../../../assets/placeholder/people_icon.png'),
};

const ANIMAL_THEME: UpdateTheme = {
  accent: palette.orange,
  statusBg: '#FFE8CC',
  lightBg: '#FFF8F0',
  border: palette.orange,
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

function getThemeStyles(audience: Audience): ThemeStyleSet {
  return audience === 'animals' ? themeStyles.animal : themeStyles.people;
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
  return `${fmt(from)} - ${fmt(to)}`;
}

function formatCollectedDate(value: string) {
  const date = new Date(value);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function RestaurantUpdatesScreen() {
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
      Alert.alert('Unavailable', 'Phone number not available');
      return;
    }
    const cleanPhone = phone.replace(/[^+\d]/g, '');
    try {
      await Linking.openURL(`tel:${cleanPhone}`);
    } catch {
      Alert.alert('Error', 'Unable to open dialer');
    }
  };

  const sendMessage = async (phone?: string | null) => {
    if (!phone) {
      Alert.alert('Unavailable', 'Phone number not available');
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
          active ? styles.filterChipActive : styles.filterChipInactive,
        ]}
      >
        {icon ? (
          <Image source={icon} style={styles.filterChipIcon} resizeMode="contain" />
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

  const renderDetailBox = (
    audience: Audience,
    icon: any,
    label: string,
    primary: string,
    secondary?: string,
    layout: DetailBoxLayout = 'normal',
  ) => {
    const ts = getThemeStyles(audience);
    const layoutStyle =
      layout === 'wide'
        ? styles.detailBoxWide
        : layout === 'full'
          ? styles.detailBoxFull
          : styles.detailBoxNormal;

    return (
      <View style={[styles.detailBox, ts.detailBox, layoutStyle]}>
        <View style={[styles.detailIconCircle, ts.detailIconCircle]}>
          <Image source={icon} style={styles.detailIconImage} resizeMode="contain" />
        </View>
        <View style={styles.detailBoxContent}>
          <AppText variant="bodyBold" color={palette.black} style={styles.detailLabelText} numberOfLines={1} ellipsizeMode="tail">
            {label}
          </AppText>
          <AppText variant="bodyBold" color={palette.midgray} style={styles.detailPrimaryText} numberOfLines={1} ellipsizeMode="tail">
            {primary}
          </AppText>
          {secondary ? (
            <AppText variant="bodySmall" color={palette.midgray} style={styles.detailSecondaryText} numberOfLines={1} ellipsizeMode="tail">
              {secondary}
            </AppText>
          ) : null}
        </View>
      </View>
    );
  };

  const renderContactGroup = (
    label: string,
    phone: string | undefined,
    audience: Audience,
  ) => {
    const ts = getThemeStyles(audience);

    return (
      <View style={styles.contactGroup}>
        <AppText variant="bodyBold" color={palette.black} style={styles.contactGroupLabel}>
          {label}
        </AppText>
        <View style={styles.contactBtnRow}>
          <Pressable style={[styles.contactBtn, ts.contactBtn]} onPress={() => makeCall(phone)}>
            <Ionicons name="call-outline" size={normalize(16)} color={ts.accentColor} />
            <AppText variant="bodyBold" style={[styles.contactActionText, ts.contactActionText]}>
              Call
            </AppText>
          </Pressable>
          <Pressable style={[styles.contactBtn, ts.contactBtn]} onPress={() => sendMessage(phone)}>
            <Ionicons name="chatbubble-outline" size={normalize(16)} color={ts.accentColor} />
            <AppText variant="bodyBold" style={[styles.contactActionText, ts.contactActionText]}>
              Message
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderClaimedCard = (item: (typeof MOCK_UPDATES)[number]) => {
    const theme = getTheme(item.audience);
    const ts = getThemeStyles(item.audience);
    const statusLabel =
      item.assigneeLabel === 'Farmer'
        ? `Status: ${prettyStatus(item.assigneeStatus || 'Farmer Assigned')}`
        : `Status: ${prettyStatus(item.assigneeStatus || 'Driver Assigned')}`;
    const contactLabel = item.audience === 'animals' ? 'Contact Farmer' : 'Contact Charity';
    const assigneeContactLabel =
      item.assigneeLabel === 'Farmer' ? 'Contact Farmer' : 'Contact Driver';

    return (
      <View style={[styles.updateCard, ts.updateCard]}>
        <View style={styles.cardTopRow}>
          <View style={[styles.statusBadge, ts.statusBadge]}>
            <AppText variant="bodyBold" style={[styles.badgeText, ts.accentText]}>
              Claimed
            </AppText>
          </View>
          <View style={[styles.categoryBadge, ts.categoryBadge]}>
            <Image source={theme.categoryIcon} style={styles.categoryIcon} resizeMode="contain" />
            <AppText variant="bodyBold" style={[styles.badgeText, ts.accentText]}>
              {theme.categoryLabel}
            </AppText>
          </View>
          <View style={[styles.statusOutlineBadge, ts.statusOutlineBadge]}>
            <AppText variant="bodyBold" style={[styles.statusOutlineText, ts.accentText]} numberOfLines={1} ellipsizeMode="tail">
              {statusLabel}
            </AppText>
          </View>
        </View>

        <AppText variant="bodyBold" color={palette.black} style={styles.claimHeadlineText}>
          {item.claimerName} claimed your listing
        </AppText>

        <AppText variant="bodyBold" color={palette.midgray} style={styles.locationBodyText}>
          📍 {item.location}
        </AppText>

        <View style={styles.assigneeRow}>
          <Ionicons
            name={item.assigneeLabel === 'Farmer' ? 'person-outline' : 'navigate-circle-outline'}
            size={normalize(18)}
            color={ts.accentColor}
          />
          <AppText variant="bodyBold" color={palette.midgray} style={styles.assigneeText}>
            {item.assigneeLabel}: {item.assigneeName}
          </AppText>
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.detailsBoxesRow}>
            {renderDetailBox(
              item.audience,
              DETAIL_ICONS.calendar,
              'Collection Time',
              formatCollectionDate(item.pickupFrom!),
              formatCollectionTimeRange(item.pickupFrom!, item.pickupTo!),
              'wide',
            )}
            {renderDetailBox(
              item.audience,
              DETAIL_ICONS.basket,
              'Qty',
              `${item.quantityKg} kg`,
            )}
          </View>
          <Pressable
            style={[styles.viewDetailsBtn, ts.viewDetailsBtn]}
            onPress={() => {
              setSelectedItems(item.items || []);
              setDetailsModalVisible(true);
            }}
          >
            <AppText variant="bodyBold" style={styles.viewDetailsText} numberOfLines={1}>
              View Details
            </AppText>
          </Pressable>
        </View>

        <View style={styles.contactPairRow}>
          {renderContactGroup(contactLabel, item.claimerPhone, item.audience)}
          {renderContactGroup(assigneeContactLabel, item.assigneePhone, item.audience)}
        </View>

        {pickupStatus[item.id] === 'completed' ? (
          <AppText style={[styles.completedText, ts.completedText]}>
            ✔ Pickup & survey completed
          </AppText>
        ) : pickupStatus[item.id] === 'cancelled' ? (
          <AppText style={styles.cancelledText}>✖ Pickup cancelled & survey completed</AppText>
        ) : (
          <Pressable
            style={[styles.completeBtn, ts.completeBtn]}
            onPress={() => {
              setSelectedId(item.id);
              setModalVisible(true);
            }}
          >
            <AppText variant="bodyBold" style={styles.completeBtnText}>
              Complete Pickup
            </AppText>
            <Ionicons name="arrow-forward" size={normalize(20)} color={palette.white} />
          </Pressable>
        )}
      </View>
    );
  };

  const renderCollectedCard = (item: (typeof MOCK_UPDATES)[number]) => {
    const theme = getTheme(item.audience);
    const ts = getThemeStyles(item.audience);
    const meals = item.mealsCreated ?? estimateMealsSaved(item.quantityKg || 0);
    const co2 = item.co2Avoided ?? Math.round((item.quantityKg || 0) * 4);

    return (
      <View style={[styles.updateCard, ts.updateCard]}>
        <View style={styles.cardTopRow}>
          <View style={[styles.statusBadge, ts.statusBadge]}>
            <AppText variant="bodyBold" style={[styles.badgeText, ts.accentText]}>
              Collected
            </AppText>
          </View>
          <View style={[styles.categoryBadge, ts.categoryBadge]}>
            <Image source={theme.categoryIcon} style={styles.categoryIcon} resizeMode="contain" />
            <AppText variant="bodyBold" style={[styles.badgeText, ts.accentText]}>
              {theme.categoryLabel}
            </AppText>
          </View>
        </View>

        <AppText variant="bodySmall" color={palette.midgray} style={styles.collectedMessageText}>
          Your listing was successfully collected
        </AppText>

        <View style={styles.collectedMetaSection}>
          <View style={styles.collectedMetaTopRow}>
            {renderDetailBox(
              item.audience,
              DETAIL_ICONS.calendar,
              'Date',
              formatCollectedDate(item.collectedDate!),
              undefined,
              'wide',
            )}
            {renderDetailBox(
              item.audience,
              DETAIL_ICONS.basket,
              item.audience === 'animals' ? 'Feed provided' : 'Food saved',
              `${item.quantityKg} kg`,
            )}
          </View>
          {renderDetailBox(
            item.audience,
            item.audience === 'animals' ? DETAIL_ICONS.leaf : DETAIL_ICONS.meal,
            item.audience === 'animals' ? 'CO2 avoided' : 'Meals Created',
            item.audience === 'animals' ? `${co2} kg` : String(meals),
            undefined,
            'full',
          )}
        </View>

        <Pressable
          style={[styles.impactBtn, ts.impactBtn]}
          onPress={() => {
            setSelectedImpact(item);
            setImpactModalVisible(true);
          }}
        >
          <AppText variant="bodyBold" style={[styles.impactLinkText, ts.impactLinkText]}>
            View Impact Details
          </AppText>
          <Ionicons name="chevron-forward" size={normalize(18)} color={palette.white} />
        </Pressable>
      </View>
    );
  };

  const renderCard = (item: (typeof MOCK_UPDATES)[number]) =>
    item.cardType === 'collected' ? renderCollectedCard(item) : renderClaimedCard(item);

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={hp(13)} borderRadius={0} />
      <View style={styles.filterRow}>
        <Skeleton width={wp(20)} height={normalize(36)} borderRadius={normalize(20)} />
        <Skeleton width={wp(28)} height={normalize(36)} borderRadius={normalize(20)} />
        <Skeleton width={wp(28)} height={normalize(36)} borderRadius={normalize(20)} />
      </View>
      {[1, 2].map((i) => (
        <View key={i} style={styles.skeletonSection}>
          <Skeleton width={wp(30)} height={normalize(18)} />
          <View style={styles.skeletonCard}>
            <View style={styles.skeletonTopRow}>
              <Skeleton width={wp(20)} height={normalize(26)} borderRadius={normalize(6)} />
              <Skeleton width={wp(30)} height={normalize(26)} borderRadius={normalize(8)} />
            </View>
            <Skeleton width="90%" height={normalize(16)} />
            <Skeleton width="70%" height={normalize(14)} />
            <View style={styles.skeletonDetailsSection}>
              <View style={styles.skeletonDetailsBoxesRow}>
                <View style={styles.skeletonDetailWideWrap}>
                  <Skeleton width="100%" height={normalize(56)} borderRadius={normalize(10)} />
                </View>
                <View style={styles.skeletonDetailNormalWrap}>
                  <Skeleton width="100%" height={normalize(56)} borderRadius={normalize(10)} />
                </View>
              </View>
              <Skeleton width="60%" height={normalize(40)} borderRadius={normalize(10)} style={styles.skeletonViewDetailsBtn} />
            </View>
            <Skeleton width="100%" height={normalize(44)} borderRadius={normalize(10)} />
          </View>
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
          ListHeaderComponent={renderSkeleton}
          contentContainerStyle={styles.container}
        />
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={palette.creme} scrollable={false}>
      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
          <ImageBackground
            source={require('../../../assets/placeholder/modal-head-backgrounda.png')}
            style={styles.headerBg}
            resizeMode="cover"
          >
            <AppText variant="h4" style={styles.headerTitle}> UPDATES </AppText>
          </ImageBackground>

            <View style={styles.filterRow}>
              {renderFilterChip('all', 'All', updates.length)}
              {renderFilterChip('people', 'For People', peopleCount, PEOPLE_THEME.categoryIcon)}
              {renderFilterChip('animals', 'For Animals', animalCount, ANIMAL_THEME.categoryIcon)}
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
            <AppText variant="body1" color={palette.stone} style={styles.emptyCenterText}>
              No updates to show
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

      <Modal
        visible={detailsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTopBar}>
              <AppText variant="h6">Food Items</AppText>
              <Pressable style={styles.closeIconBtn} onPress={() => setDetailsModalVisible(false)}>
                <Ionicons name="close" size={normalize(20)} color={palette.black} />
              </Pressable>
            </View>
            {selectedItems.map((food, index) => (
              <AppText key={index} variant="body1" color={palette.midgray}>
                • {food.name} ({food.qty})
              </AppText>
            ))}
          </View>
        </View>
      </Modal>

      <Modal
        visible={impactModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setImpactModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalTopBar}>
              <AppText variant="h6">Impact Details</AppText>
              <Pressable style={styles.closeIconBtn} onPress={() => setImpactModalVisible(false)}>
                <Ionicons name="close" size={normalize(20)} color={palette.black} />
              </Pressable>
            </View>
            {selectedImpact ? (
              <>
                <AppText variant="bodyBold" color={palette.midgray}>
                  {getTheme(selectedImpact.audience).categoryLabel}
                </AppText>
                <AppText variant="body1" color={palette.midgray}>
                  Quantity: {selectedImpact.quantityKg} kg
                </AppText>
                <AppText variant="body1" color={palette.midgray}>
                  Collected: {formatCollectedDate(selectedImpact.collectedDate)}
                </AppText>
                {selectedImpact.audience === 'people' ? (
                  <AppText variant="bodyBold" style={styles.impactHighlightPeople}>
                    {selectedImpact.mealsCreated ?? estimateMealsSaved(selectedImpact.quantityKg)} meals
                    created
                  </AppText>
                ) : (
                  <AppText variant="bodyBold" style={styles.impactHighlightAnimal}>
                    {selectedImpact.co2Avoided ?? Math.round(selectedImpact.quantityKg * 4)} kg CO2 avoided
                  </AppText>
                )}
              </>
            ) : null}
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
    fontSize: normalize(24),
    letterSpacing: 0.5,
  },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    paddingHorizontal: wp(4),
    paddingTop: hp(1.2),
    width: '100%',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    paddingHorizontal: wp(3.45),
    paddingVertical: hp(0.7),
    borderRadius: normalize(8),
    borderWidth: normalize(1),
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
    textTransform: 'none',
    fontSize: normalize(14),
  },

  filterChipTextActive: {
    color: palette.white,
  },

  filterChipTextInactive: {
    color: palette.stone,
  },
  section: {
    paddingHorizontal: wp(4),
    gap: hp(1),
    marginTop: hp(0.5),
  },

  sectionTitle: {
    textTransform: 'none',
    paddingLeft: wp(2),
  },

  sectionCards: {
    gap: hp(1.2),
  },

  updateCard: {
    borderRadius: normalize(14),
    borderWidth: normalize(1),
    padding: wp(3.8),
    gap: hp(1.1),
  },

  updateCardPeople: {
    borderColor: palette.kale,
    backgroundColor: palette.white,
  },

  updateCardAnimal: {
    borderColor: palette.orange,
    backgroundColor: '#FFFAF4',
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(1),
  },

  statusBadge: {
    paddingHorizontal: wp(2.8),
    paddingVertical: hp(0.5),
    borderRadius: normalize(8),
  },

  statusBadgePeople: {
    backgroundColor: palette.creme3,
  },

  statusBadgeAnimal: {
    backgroundColor: '#0B1B3D',
  },

  badgeText: {
    fontSize: normalize(13),
    textTransform: 'none',
  },

  accentTextPeople: {
    color: palette.kale,
  },

  accentTextAnimal: {
    color: palette.orange,
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
  categoryBadgePeople: {
    borderColor: palette.kale,
  },
  categoryBadgeAnimal: {
    borderColor: palette.orange,
  },
  categoryIcon: {
    width: normalize(16),
    height: normalize(16),
  },

  statusOutlineBadge: {
    paddingHorizontal: wp(2.2),
    paddingVertical: hp(0.5),
    borderRadius: normalize(8),
    borderWidth: normalize(1),
    backgroundColor: palette.white,
  },

  statusOutlineBadgePeople: {
    borderColor: palette.kale,
  },

  statusOutlineBadgeAnimal: {
    borderColor: palette.orange,
  },

  statusOutlineText: {
    fontSize: normalize(13),
    textTransform: 'none',
  },

  claimHeadlineText: {
    textTransform: 'none',
  },

  locationBodyText: {
    textTransform: 'none',
    fontSize: normalize(15),
    lineHeight: normalize(18),
  },

  assigneeText: {
    fontSize: normalize(13),
    textTransform: 'none',
  },

  collectedMessageText: {
    textTransform: 'none',
  },

  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },

  detailsSection: {
    marginTop: hp(0.2),
    gap: hp(0.8),
  },

  detailsBoxesRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: wp(1.5),
  },

  detailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    borderWidth: normalize(1),
    borderRadius: normalize(8),
    backgroundColor: palette.white,
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.7),
    gap: wp(1.5),
  },

  detailBoxPeople: {
    borderColor: '#D9D9D9',
  },

  detailBoxAnimal: {
    borderColor: '#D9D9D9',
  },

  detailBoxWide: {
    flex: 1.7,
    minWidth: 0,
  },

  detailBoxNormal: {
    flex: 1,
    minWidth: 0,
  },

  detailBoxFull: {
    alignSelf: 'stretch',
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    
  },

  detailIconCircle: {
    width: normalize(30),
    height: normalize(30),
    borderRadius: normalize(15),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  detailIconCirclePeople: {
    backgroundColor: '#D8EBDF',
  },

  detailIconCircleAnimal: {
    backgroundColor: '#FFE8CC',
  },

  detailIconImage: {
    width: normalize(20),
    height: normalize(20),
  },

  detailBoxContent: {
    flex: 1,
    minWidth: 0,
    gap: hp(0.15),
  },

  detailLabelText: {
    fontSize: normalize(12),
    lineHeight: normalize(15),
    textTransform: 'none',
  },

  detailPrimaryText: {
    fontSize: normalize(13),
    lineHeight: normalize(15),
    textTransform: 'none',
  },

  detailSecondaryText: {
    fontSize: normalize(12),
    lineHeight: normalize(15),
    textTransform: 'none',
  },

  collectedMetaSection: {
    marginTop: hp(0.2),
    gap: hp(0.8),
  },

  collectedMetaTopRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: wp(1.5),
  },

  viewDetailsBtn: {
    width: '60%',
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingVertical: hp(1.2),
  },

  viewDetailsBtnPeople: {
    backgroundColor: palette.kale,
  },

  viewDetailsBtnAnimal: {
    backgroundColor: palette.orange,
  },

  viewDetailsText: {
    color: palette.white,
    textTransform: 'none',
    textAlign: 'center',
  },

  contactPairRow: {
    flexDirection: 'row',
    gap: wp(2.5),
    marginTop: hp(0.4),
  },

  contactGroup: {
    flex: 1,
    minWidth: 0,
    gap: hp(0.5),
  },

  contactGroupLabel: {
    textTransform: 'none',
  },

  contactBtnRow: {
    flexDirection: 'row',
    gap: wp(1.5),
  },

  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(0.8),
    paddingVertical: hp(0.75),
    paddingHorizontal: wp(2.2),
    borderRadius: normalize(8),
    borderWidth: normalize(1),
    backgroundColor: palette.white,
  },

  contactBtnPeople: {
    borderColor: palette.kale,
  },

  contactBtnAnimal: {
    borderColor: palette.orange,
  },

  contactActionText: {
    fontSize: normalize(12),
    textTransform: 'none',
  },

  contactActionTextPeople: {
    color: palette.kale,
  },

  contactActionTextAnimal: {
    color: palette.orange,
  },

  completeBtn: {
    marginTop: hp(0.5),
    paddingVertical: hp(1),
    paddingHorizontal: wp(3.8),
    borderRadius: normalize(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  completeBtnPeople: {
    backgroundColor: palette.kale,
  },

  completeBtnAnimal: {
    backgroundColor: palette.orange,
  },

  completeBtnText: {
    color: palette.white,
    textTransform: 'none',
    flex: 1,
    textAlign: 'center',
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

  impactBtnPeople: {
    borderColor: palette.kale,
    backgroundColor: palette.kale,
  },

  impactBtnAnimal: {
    borderColor: palette.orange,
    backgroundColor: palette.orange,
  },

  impactLinkText: {
    textTransform: 'none',
  },

  impactLinkTextPeople: {
    color: palette.white,
  },

  impactLinkTextAnimal: {
    color: palette.white,
  },

  completedText: {
    marginTop: hp(0.8),
    fontSize: normalize(14),
    textAlign: 'center',
  },

  completedTextPeople: {
    color: palette.kale,
  },

  completedTextAnimal: {
    color: palette.orange,
  },

  cancelledText: {
    marginTop: hp(0.8),
    color: palette.chilli,
    fontSize: normalize(14),
    textAlign: 'center',
  },

  emptyWrap: {
    paddingVertical: hp(4),
    paddingHorizontal: wp(4),
  },

  emptyCenterText: {
    textAlign: 'center',
  },

  impactHighlightPeople: {
    color: palette.kale,
  },

  impactHighlightAnimal: {
    color: palette.orange,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: palette.white,
    borderTopLeftRadius: normalize(24),
    borderTopRightRadius: normalize(24),
    padding: wp(5),
    gap: hp(1.2),
    paddingBottom: hp(4),
  },

  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(0.5),
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

  skeletonSection: {
    paddingHorizontal: wp(4),
    gap: hp(1),
  },

  skeletonCard: {
    backgroundColor: palette.white,
    borderRadius: normalize(12),
    padding: wp(3.5),
    gap: hp(1),
    borderWidth: normalize(1),
    borderColor: '#E0E0E0',
  },

  skeletonTopRow: {
    flexDirection: 'row',
    gap: wp(2),
  },

  skeletonMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  skeletonDetailsSection: {
    gap: hp(0.8),
  },

  skeletonDetailsBoxesRow: {
    flexDirection: 'row',
    gap: wp(1.5),
  },

  skeletonDetailWideWrap: {
    flex: 2,
  },

  skeletonDetailNormalWrap: {
    flex: 1,
  },

  skeletonViewDetailsBtn: {
    alignSelf: 'center',
  },
});

const themeStyles: { people: ThemeStyleSet; animal: ThemeStyleSet } = {
  people: {
    updateCard: styles.updateCardPeople,
    statusBadge: styles.statusBadgePeople,
    accentText: styles.accentTextPeople,
    categoryBadge: styles.categoryBadgePeople,
    statusOutlineBadge: styles.statusOutlineBadgePeople,
    detailBox: styles.detailBoxPeople,
    detailIconCircle: styles.detailIconCirclePeople,
    viewDetailsBtn: styles.viewDetailsBtnPeople,
    contactBtn: styles.contactBtnPeople,
    contactActionText: styles.contactActionTextPeople,
    completeBtn: styles.completeBtnPeople,
    completedText: styles.completedTextPeople,
    impactBtn: styles.impactBtnPeople,
    impactLinkText: styles.impactLinkTextPeople,
    impactHighlight: styles.impactHighlightPeople,
    accentColor: palette.kale,
  },
  animal: {
    updateCard: styles.updateCardAnimal,
    statusBadge: styles.statusBadgeAnimal,
    accentText: styles.accentTextAnimal,
    categoryBadge: styles.categoryBadgeAnimal,
    statusOutlineBadge: styles.statusOutlineBadgeAnimal,
    detailBox: styles.detailBoxAnimal,
    detailIconCircle: styles.detailIconCircleAnimal,
    viewDetailsBtn: styles.viewDetailsBtnAnimal,
    contactBtn: styles.contactBtnAnimal,
    contactActionText: styles.contactActionTextAnimal,
    completeBtn: styles.completeBtnAnimal,
    completedText: styles.completedTextAnimal,
    impactBtn: styles.impactBtnAnimal,
    impactLinkText: styles.impactLinkTextAnimal,
    impactHighlight: styles.impactHighlightAnimal,
    accentColor: palette.orange,
  },
};
