import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ImageBackground,
  Image,
  Modal,
  Linking,
  Dimensions,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Skeleton } from '../../components/Skeleton';
import { palette } from '../../theme/colors';
import { showErrorAlert, showInfoAlert } from '@/utils/apiError';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

type StatusFilter = 'all' | 'completed' | 'cancelled';

type PickupCardStatus =
  | 'unclaimed'
  | 'claimed'
  | 'awaiting_driver'
  | 'enroute'
  | 'completed'
  | 'cancelled';

type PickupItem = {
  name: string;
  available: number;
  claimed: number;
};

type Pickup = {
  id: string;
  restaurantName: string;
  restaurantAddress: string;
  distance: string;
  restaurantPhone: string;
  driverName: string | null;
  driverPhone: string | null;
  pickupDateLabel: string;
  pickupTimeLabel: string;
  instructions: string;
  weightKg: number;
  cardStatus: PickupCardStatus;
  isNextPickup?: boolean;
  items: PickupItem[];
};

type ThemeStyleSet = {
  card: ViewStyle;
  statusBadge: ViewStyle;
  badgeText: TextStyle;
  weightBox: ViewStyle;
  weightText: TextStyle;
  viewDetailsBtn: ViewStyle;
  viewDetailsText: TextStyle;
  contactBtn: ViewStyle;
  contactBtnText: TextStyle;
  contactIconColor: string;
  weightIcon: ReturnType<typeof require>;
};

const WEIGHT_ICONS = {
  claimed: require('../../../assets/placeholder/storage_box_green.png'),
  awaiting_driver: require('../../../assets/placeholder/storage_box_orange.png'),
  enroute: require('../../../assets/placeholder/storage_box_green.png'),
  completed: require('../../../assets/placeholder/storage_box_green.png'),
  cancelled: require('../../../assets/placeholder/storage_box_green.png'),
  unclaimed: require('../../../assets/placeholder/storage_box_green.png'),
};

const STATUS_LABELS: Record<PickupCardStatus, string> = {
  unclaimed: 'AVAILABLE',
  claimed: 'CLAIMED',
  awaiting_driver: 'AWAITING DRIVER',
  enroute: 'EN ROUTE',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

const initialPickups: Pickup[] = [
  {
    id: 'next-1',
    restaurantName: 'Green Bowl Cafe',
    restaurantAddress: 'Nayapalli, Bhubaneswar',
    distance: '0.9 kms away',
    restaurantPhone: '+91 9876543001',
    driverName: null,
    driverPhone: null,
    pickupDateLabel: 'Today',
    pickupTimeLabel: '4.00pm - 4.30pm',
    instructions: 'Collect from back entrance',
    weightKg: 12,
    cardStatus: 'unclaimed',
    isNextPickup: true,
    items: [
      { name: 'Salad', available: 6, claimed: 0 },
      { name: 'Bread', available: 6, claimed: 0 },
    ],
  },
  {
    id: '1',
    restaurantName: 'Spice Route Kitchen',
    restaurantAddress: 'Patia Main Road, Bhubaneswar',
    distance: '1.8 kms away',
    restaurantPhone: '+91 9876543210',
    driverName: 'Rakesh Sahu',
    driverPhone: '+91 9876512345',
    pickupDateLabel: 'Today',
    pickupTimeLabel: '5.30pm - 6.00pm',
    instructions: 'Needs refrigeration',
    weightKg: 18,
    cardStatus: 'claimed',
    items: [
      { name: 'Rice', available: 10, claimed: 10 },
      { name: 'Dal', available: 8, claimed: 8 },
    ],
  },
  {
    id: '2',
    restaurantName: 'Biryani Box',
    restaurantAddress: 'Saheed Nagar, Bhubaneswar',
    distance: '3.2 kms away',
    restaurantPhone: '+91 9876500000',
    driverName: null,
    driverPhone: null,
    pickupDateLabel: 'Today',
    pickupTimeLabel: '7.00pm - 7.30pm',
    instructions: 'Reheat before serving',
    weightKg: 22,
    cardStatus: 'awaiting_driver',
    items: [
      { name: 'Biryani', available: 15, claimed: 15 },
      { name: 'Raita', available: 7, claimed: 7 },
    ],
  },
  {
    id: '3',
    restaurantName: 'ABC Box',
    restaurantAddress: 'Khandagiri, Bhubaneswar',
    distance: '2.5 kms away',
    restaurantPhone: '+91 9876501111',
    driverName: 'Sanjay Rout',
    driverPhone: '+91 9876523456',
    pickupDateLabel: 'Today',
    pickupTimeLabel: '6.00pm - 6.30pm',
    instructions: 'Ring bell on arrival',
    weightKg: 22,
    cardStatus: 'enroute',
    items: [
      { name: 'Curry', available: 12, claimed: 12 },
      { name: 'Rice', available: 10, claimed: 10 },
    ],
  },
  {
    id: '4',
    restaurantName: 'XYZ Box',
    restaurantAddress: 'Chandrasekharpur, Bhubaneswar',
    distance: '4.1 kms away',
    restaurantPhone: '+91 9876502222',
    driverName: 'Amit Sahu',
    driverPhone: '+91 9876534567',
    pickupDateLabel: 'May 14th 2026',
    pickupTimeLabel: '',
    instructions: 'Completed pickup',
    weightKg: 22,
    cardStatus: 'completed',
    items: [
      { name: 'Meals', available: 14, claimed: 14 },
      { name: 'Dessert', available: 8, claimed: 8 },
    ],
  },
  {
    id: '5',
    restaurantName: 'Sunrise Kitchen',
    restaurantAddress: 'Unit 3, Bhubaneswar',
    distance: '5.0 kms away',
    restaurantPhone: '+91 9876503333',
    driverName: null,
    driverPhone: null,
    pickupDateLabel: 'May 10th 2026',
    pickupTimeLabel: '',
    instructions: 'Cancelled by restaurant',
    weightKg: 16,
    cardStatus: 'cancelled',
    items: [
      { name: 'Pasta', available: 10, claimed: 0 },
      { name: 'Soup', available: 6, claimed: 0 },
    ],
  },
];

function isCompletedStatus(status: PickupCardStatus) {
  return status === 'completed';
}

function isCancelledStatus(status: PickupCardStatus) {
  return status === 'cancelled';
}

function formatTimeLine(pickup: Pickup) {
  if (isCompletedStatus(pickup.cardStatus) || isCancelledStatus(pickup.cardStatus)) {
    return pickup.pickupDateLabel;
  }
  if (pickup.pickupTimeLabel) {
    return `${pickup.pickupDateLabel} - ${pickup.pickupTimeLabel}`;
  }
  return pickup.pickupDateLabel;
}

function getDriverLabel(pickup: Pickup) {
  if (pickup.cardStatus === 'unclaimed') return null;
  return pickup.driverName ? `Driver: ${pickup.driverName}` : 'Driver: No Driver assigned';
}

export default function FarmerPickupScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState<Pickup | null>(null);

  const nextPickup = useMemo(
    () => initialPickups.find((p) => p.isNextPickup || p.cardStatus === 'unclaimed') ?? null,
    [],
  );

  const claimedPickups = useMemo(
    () => initialPickups.filter((p) => p.cardStatus !== 'unclaimed' && !p.isNextPickup),
    [],
  );

  const filteredPickups = useMemo(() => {
    return claimedPickups.filter((pickup) => {
      if (statusFilter === 'completed') return isCompletedStatus(pickup.cardStatus);
      if (statusFilter === 'cancelled') return isCancelledStatus(pickup.cardStatus);
      return true;
    });
  }, [claimedPickups, statusFilter]);

  const modalTotals = useMemo(() => {
    if (!selectedPickup) return { totalAvailable: 0, totalClaimed: 0 };
    const totalAvailable = selectedPickup.items.reduce((sum, i) => sum + (i.available || 0), 0);
    const totalClaimed = selectedPickup.items.reduce((sum, i) => sum + (i.claimed || 0), 0);
    return { totalAvailable, totalClaimed };
  }, [selectedPickup]);

  const makeCall = async (phone?: string | null) => {
    if (!phone) {
      showInfoAlert('Phone number not available', 'Unavailable');
      return;
    }
    const url = `tel:${phone.replace(/[^+\d]/g, '')}`;
    try {
      await Linking.openURL(url);
    } catch {
      showErrorAlert('Unable to open dialer', 'Error');
    }
  };

  const sendMessage = async (phone?: string | null) => {
    if (!phone) {
      showInfoAlert('Phone number not available', 'Unavailable');
      return;
    }
    await Linking.openURL(`sms:${phone}`);
  };

  const openDetails = (pickup: Pickup) => {
    setSelectedPickup(pickup);
    setModalVisible(true);
  };

  const handleViewDetails = (pickup: Pickup) => {
    if (pickup.cardStatus === 'enroute') {
      navigation.navigate('DriverTracking', {
        trackingId: pickup.id,
        source: 'farmer',
      });
      return;
    }
    openDetails(pickup);
  };

  const renderContactButton = (
    label: 'Call' | 'Message',
    onPress: () => void,
    theme: ThemeStyleSet,
    icon: keyof typeof Ionicons.glyphMap,
  ) => (
    <Pressable
      style={[styles.contactBtn, theme.contactBtn]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={normalize(14)} color={theme.contactIconColor} />
      <AppText variant="bodyBold" style={[styles.contactBtnText, theme.contactBtnText]}>
        {label}
      </AppText>
    </Pressable>
  );

  const renderPickupCard = (pickup: Pickup) => {
    const theme = themeStyles[pickup.cardStatus];
    const driverLabel = getDriverLabel(pickup);
    const showDriverContact =
      pickup.cardStatus !== 'unclaimed' &&
      pickup.cardStatus !== 'completed' &&
      pickup.cardStatus !== 'cancelled';
    const statusLabel = STATUS_LABELS[pickup.cardStatus];

    return (
      <View key={pickup.id} style={[styles.pickupCard, theme.card]}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.statusBadge, theme.statusBadge]}>
            <AppText variant="bodyBold" style={[styles.badgeText, theme.badgeText]} numberOfLines={1}>
              {statusLabel}
            </AppText>
          </View>
          <AppText variant="bodyBold" style={styles.restaurantName} numberOfLines={2} ellipsizeMode="tail">
            {pickup.restaurantName}
          </AppText>
        </View>

        <View style={styles.cardBodyRow}>
          <View style={[styles.weightBox, theme.weightBox]}>
            <Image source={theme.weightIcon} style={styles.weightIcon} resizeMode="contain" />
            <AppText
              variant="bodyBold"
              style={[styles.weightText, theme.weightText]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {pickup.weightKg} kg
            </AppText>
          </View>

          <View style={styles.cardMainArea}>
            <View style={styles.cardContent}>
              <View style={styles.detailLine}>
                <Ionicons name="location-sharp" size={normalize(13)} color={palette.chilli} />
                <AppText variant="bodySmall" style={styles.detailText} numberOfLines={2} ellipsizeMode="tail">
                  {pickup.restaurantAddress}
                </AppText>
              </View>

              <AppText variant="bodySmall" style={styles.distanceText}>
                {pickup.distance}
              </AppText>

              <View style={styles.detailLine}>
                <Image
                  source={require('../../../assets/placeholder/clock_icon_2.png')}
                  style={styles.inlineIcon}
                  resizeMode="contain"
                />
                <AppText variant="bodySmall" style={styles.detailText} numberOfLines={2} ellipsizeMode="tail">
                  {formatTimeLine(pickup)}
                </AppText>
              </View>

              {driverLabel ? (
                <View style={styles.detailLine}>
                  <Image
                    source={require('../../../assets/placeholder/driver_icon.png')}
                    style={styles.inlineIcon}
                    resizeMode="contain"
                  />
                  <AppText variant="bodySmall" style={styles.detailText} numberOfLines={2} ellipsizeMode="tail">
                    {driverLabel}
                  </AppText>
                </View>
              ) : null}
            </View>

            <Pressable
              style={[styles.viewDetailsBtn, theme.viewDetailsBtn]}
              onPress={() => handleViewDetails(pickup)}
            >
              <AppText variant="bodyBold" style={[styles.viewDetailsText, theme.viewDetailsText]} numberOfLines={2}>
                View Details
              </AppText>
            </Pressable>
          </View>
        </View>

        <View style={styles.contactSection}>
          <View style={styles.contactGroup}>
            <AppText variant="caption" style={styles.contactLabel}>
              Contact Collection Site
            </AppText>
            <View style={styles.contactBtnRow}>
              {renderContactButton('Call', () => makeCall(pickup.restaurantPhone), theme, 'call-outline')}
              {renderContactButton('Message', () => sendMessage(pickup.restaurantPhone), theme, 'chatbubble-outline')}
            </View>
          </View>

          {showDriverContact ? (
            <View style={styles.contactGroup}>
              <AppText variant="caption" style={styles.contactLabel}>
                Contact Driver
              </AppText>
              <View style={styles.contactBtnRow}>
                {renderContactButton('Call', () => makeCall(pickup.driverPhone), theme, 'call-outline')}
                {renderContactButton('Message', () => sendMessage(pickup.driverPhone), theme, 'chatbubble-outline')}
              </View>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

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
            color={active ? palette.white : palette.primary}
          />
        ) : null}
        <AppText
          variant="bodyBold"
          style={[styles.filterChipText, active ? styles.filterChipTextActive : styles.filterChipTextInactive]}
          numberOfLines={1}
        >
          {label}
        </AppText>
      </Pressable>
    );
  };

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

  const renderSkeleton = () => (
    <View style={styles.skeletonWrap}>
      <Skeleton width="100%" height={hp(14)} borderRadius={0} />
      <View style={styles.skeletonFilterRow}>
        <Skeleton width="31%" height={normalize(34)} borderRadius={normalize(8)} />
        <Skeleton width="31%" height={normalize(34)} borderRadius={normalize(8)} />
        <Skeleton width="31%" height={normalize(34)} borderRadius={normalize(8)} />
      </View>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} width={wp(92)} height={normalize(180)} borderRadius={normalize(16)} style={styles.skeletonCard} />
      ))}
    </View>
  );

  if (loading) {
    return (
      <Screen backgroundColor={palette.white}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {renderSkeleton()}
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={palette.white}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={require('../../../assets/placeholder/feed-bg.png')}
          resizeMode="cover"
          style={styles.headerBg}
        >
          <AppText variant="h4" style={styles.headerTitle}>
            YOUR PICKUPS
          </AppText>
        </ImageBackground>

        {nextPickup ? (
          <View style={styles.sectionBlock}>
            <AppText variant="h8" style={styles.sectionHeading}>
              Next Pickup
            </AppText>
            {renderPickupCard(nextPickup)}
          </View>
        ) : null}

        <View style={styles.sectionBlock}>
          <View style={styles.filterWrap}>
            <View style={styles.filterRow}>
              {renderStatusChip('all', 'All')}
              {renderStatusChip('completed', 'Completed', 'checkmark-circle-outline')}
              {renderStatusChip('cancelled', 'Cancelled', 'close-circle-outline')}
            </View>
          </View>

          {filteredPickups.length > 0 ? (
            filteredPickups.map((pickup) => renderPickupCard(pickup))
          ) : (
            <View style={styles.emptyWrap}>
              <AppText variant="bodySmall" style={styles.emptyText}>
                No pickups match this filter.
              </AppText>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <View style={styles.modalTopBar}>
              <AppText variant="h6">Items</AppText>
              <Pressable style={styles.closeIconBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={normalize(20)} color={palette.black} />
              </Pressable>
            </View>

            {selectedPickup ? (
              <>
                <AppText variant="bodyBold" style={styles.modalSubtitle}>
                  {selectedPickup.restaurantName}
                </AppText>

                <View style={styles.modalMetaBlock}>
                  <AppText variant="bodySmall" style={styles.modalMetaText}>
                    {selectedPickup.restaurantAddress}
                  </AppText>
                  <AppText variant="bodySmall" style={styles.modalMetaText}>
                    {selectedPickup.distance}
                  </AppText>
                  <AppText variant="bodySmall" style={styles.modalMetaText}>
                    {formatTimeLine(selectedPickup)}
                  </AppText>
                  {getDriverLabel(selectedPickup) ? (
                    <AppText variant="bodySmall" style={styles.modalMetaText}>
                      {getDriverLabel(selectedPickup)}
                    </AppText>
                  ) : null}
                  <AppText variant="bodySmall" style={styles.modalMetaText}>
                    Status: {STATUS_LABELS[selectedPickup.cardStatus]}
                  </AppText>
                  <AppText variant="bodySmall" style={styles.modalMetaText}>
                    Total weight: {selectedPickup.weightKg} kg
                  </AppText>
                </View>

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

                {selectedPickup.items.map((item, idx) => (
                  <View key={idx} style={styles.modalItemRow}>
                    <AppText variant="bodyBold" style={styles.modalColWide}>
                      {item.name}
                    </AppText>
                    <AppText variant="bodySmall" style={styles.modalCol}>
                      {item.available} kg
                    </AppText>
                    <AppText variant="bodySmall" style={styles.modalCol}>
                      {item.claimed} kg
                    </AppText>
                  </View>
                ))}

                <AppText variant="bodyBold">Total Quantity: {modalTotals.totalAvailable} kg</AppText>
                <AppText variant="bodyBold">Total Claimed: {modalTotals.totalClaimed} kg</AppText>

                {selectedPickup.instructions ? (
                  <AppText variant="bodySmall" style={styles.modalInstructions}>
                    Instructions: {selectedPickup.instructions}
                  </AppText>
                ) : null}
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
    paddingBottom: hp(4),
    gap: hp(1.5),
  },

  /* Header */
  headerBg: {
    width: '100%',
    height: hp(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: palette.white,
    textTransform: 'none',
  },

  /* Sections */
  sectionBlock: {
    paddingHorizontal: wp(4),
    gap: hp(1.2),
  },
  sectionHeading: {
    color: palette.black,
    textTransform: 'none',
  },

  /* Filter chips */
  filterWrap: {
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
    paddingVertical: hp(0.75),
    paddingHorizontal: wp(2),
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
  filterChipText: {
    fontSize: normalize(13),
    textTransform: 'none',
    textAlign: 'center',
  },
  filterChipTextActive: {
    color: palette.white,
  },
  filterChipTextInactive: {
    color: palette.black,
  },

  /* Pickup card */
  pickupCard: {
    borderWidth: normalize(1.5),
    borderRadius: normalize(14),
    backgroundColor: palette.white,
    padding: wp(3),
    gap: hp(1.2),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: normalize(6),
    flexShrink: 0,
  },
  badgeText: {
    fontSize: normalize(11),
    textTransform: 'none',
  },
  restaurantName: {
    flex: 1,
    minWidth: wp(40),
    fontSize: normalize(15),
    color: palette.black,
    textTransform: 'none',
  },
  cardBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2.5),
  },
  weightBox: {
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
  weightIcon: {
    width: normalize(24),
    height: normalize(24),
  },
  weightText: {
    fontSize: normalize(11),
    lineHeight: normalize(13),
    textTransform: 'none',
    textAlign: 'center',
    width: '100%',
  },
  cardMainArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    minWidth: 0,
  },
  cardContent: {
    flex: 1,
    gap: hp(0.15),
    minWidth: 0,
    justifyContent: 'flex-start',
  },
  detailLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(1),
    minWidth: 0,
  },
  detailText: {
    flex: 1,
    flexShrink: 1,
    fontSize: normalize(11),
    lineHeight: normalize(15),
    color: palette.stone,
    textTransform: 'none',
  },
  distanceText: {
    marginLeft: wp(4),
    color: palette.midgray,
    textTransform: 'none',
    fontSize: normalize(11),
    lineHeight: normalize(15),
  },
  inlineIcon: {
    width: normalize(13),
    height: normalize(13),
    marginTop: normalize(1),
    flexShrink: 0,
  },
  viewDetailsBtn: {
    flexShrink: 0,
    minWidth: wp(18),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.75),
    borderRadius: normalize(8),
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  viewDetailsText: {
    fontSize: normalize(11),
    lineHeight: normalize(14),
    textAlign: 'center',
    textTransform: 'none',
  },

  /* Contact actions */
  contactSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
    paddingTop: hp(1),
  },
  contactGroup: {
    flex: 1,
    minWidth: wp(38),
    gap: hp(0.5),
  },
  contactLabel: {
    color: palette.black,
    textTransform: 'none',
    fontSize: normalize(11),
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
    gap: wp(1),
    paddingVertical: hp(0.7),
    paddingHorizontal: wp(1.5),
    borderRadius: normalize(999),
    borderWidth: 1,
    backgroundColor: palette.white,
  },
  contactBtnText: {
    fontSize: normalize(11),
    textTransform: 'none',
  },

  /* Empty state */
  emptyWrap: {
    paddingVertical: hp(3),
    alignItems: 'center',
  },
  emptyText: {
    color: palette.stone,
    textTransform: 'none',
  },

  /* Items modal */
  modalWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalCard: {
    backgroundColor: palette.white,
    padding: wp(4),
    borderTopLeftRadius: normalize(24),
    borderTopRightRadius: normalize(24),
    gap: hp(1.2),
    maxHeight: hp(70),
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
  modalSubtitle: {
    textTransform: 'none',
    color: palette.midgray,
  },
  modalMetaBlock: {
    gap: hp(0.35),
    paddingBottom: hp(0.5),
    borderBottomWidth: 1,
    borderColor: palette.border,
  },
  modalMetaText: {
    color: palette.midgray,
    textTransform: 'none',
    lineHeight: normalize(16),
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
  modalInstructions: {
    color: palette.midgray,
    textTransform: 'none',
  },
  skeletonWrap: {
    gap: hp(1.2),
  },
  skeletonFilterRow: {
    flexDirection: 'row',
    gap: wp(2),
    paddingHorizontal: wp(4),
    width: '100%',
  },
  skeletonCard: {
    alignSelf: 'center',
  },
});

const themeStyles: Record<PickupCardStatus, ThemeStyleSet> = {
  claimed: {
    card: { borderColor: palette.kale, backgroundColor: palette.white },
    statusBadge: { backgroundColor: '#D8EBDF' },
    badgeText: { color: palette.kale },
    weightBox: { borderColor: palette.kale, backgroundColor: palette.white },
    weightText: { color: palette.midgray },
    viewDetailsBtn: { backgroundColor: palette.kale },
    viewDetailsText: { color: palette.white },
    contactBtn: { borderColor: palette.kale },
    contactBtnText: { color: palette.kale },
    contactIconColor: palette.kale,
    weightIcon: WEIGHT_ICONS.claimed,
  },
  awaiting_driver: {
    card: { borderColor: palette.orange, backgroundColor: palette.white },
    statusBadge: { backgroundColor: '#FFE8CC' },
    badgeText: { color: '#C56A00' },
    weightBox: { borderColor: palette.orange, backgroundColor: palette.white },
    weightText: { color: palette.midgray },
    viewDetailsBtn: { backgroundColor: palette.orange },
    viewDetailsText: { color: palette.white },
    contactBtn: { borderColor: palette.orange },
    contactBtnText: { color: palette.orange },
    contactIconColor: palette.orange,
    weightIcon: WEIGHT_ICONS.awaiting_driver,
  },
  enroute: {
    card: { borderColor: palette.primary, backgroundColor: palette.white },
    statusBadge: { backgroundColor: '#E8DAFF' },
    badgeText: { color: palette.primary },
    weightBox: { borderColor: palette.primary, backgroundColor: palette.white },
    weightText: { color: palette.midgray },
    viewDetailsBtn: { backgroundColor: palette.primary },
    viewDetailsText: { color: palette.white },
    contactBtn: { borderColor: palette.primary },
    contactBtnText: { color: palette.primary },
    contactIconColor: palette.primary,
    weightIcon: WEIGHT_ICONS.enroute,
  },
  completed: {
    card: { borderColor: '#BDBDBD', backgroundColor: palette.white },
    statusBadge: { backgroundColor: '#E8E8E8' },
    badgeText: { color: palette.midgray },
    weightBox: { borderColor: '#BDBDBD', backgroundColor: palette.white },
    weightText: { color: palette.midgray },
    viewDetailsBtn: { backgroundColor: '#757575' },
    viewDetailsText: { color: palette.white },
    contactBtn: { borderColor: '#757575' },
    contactBtnText: { color: '#757575' },
    contactIconColor: '#757575',
    weightIcon: WEIGHT_ICONS.completed,
  },
  cancelled: {
    card: { borderColor: palette.primary, backgroundColor: palette.white },
    statusBadge: { backgroundColor: palette.primary },
    badgeText: { color: palette.white },
    weightBox: { borderColor: palette.primary, backgroundColor: palette.white },
    weightText: { color: palette.midgray },
    viewDetailsBtn: { backgroundColor: palette.primary },
    viewDetailsText: { color: palette.white },
    contactBtn: { borderColor: palette.primary },
    contactBtnText: { color: palette.primary },
    contactIconColor: palette.primary,
    weightIcon: WEIGHT_ICONS.cancelled,
  },
  unclaimed: {
    card: { borderColor: palette.blueberry, backgroundColor: palette.white },
    statusBadge: { backgroundColor: '#D6E9FF' },
    badgeText: { color: palette.blueberry },
    weightBox: { borderColor: palette.blueberry, backgroundColor: palette.white },
    weightText: { color: palette.midgray },
    viewDetailsBtn: { backgroundColor: palette.blueberry },
    viewDetailsText: { color: palette.white },
    contactBtn: { borderColor: palette.blueberry },
    contactBtnText: { color: palette.blueberry },
    contactIconColor: palette.blueberry,
    weightIcon: WEIGHT_ICONS.unclaimed,
  },
};
