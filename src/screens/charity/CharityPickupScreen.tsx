import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Modal,
  Linking,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { palette } from '../../theme/colors';
import { showErrorAlert, showInfoAlert } from '@/utils/apiError';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { useBottomTabPadding } from '@/hooks/useBottomTabPadding';
import { hp, normalize, useResponsiveLayout, wp } from '@/utils/responsive';
import { buildDashboardShellStyles } from '@/utils/dashboardAdaptive';
import { useReceiverFeed } from '@/hooks/useReceiverFeed';
import type {
  ReceiverPickup,
  ReceiverPickupCardStatus,
} from '@/utils/receiverFeed';

type StatusFilter = 'all' | 'completed' | 'cancelled';

type PickupCardStatus = ReceiverPickupCardStatus;
type PickupItem = ReceiverPickup['items'][number];
type Pickup = ReceiverPickup;

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
  const label = pickup.assigneeLabel || 'Driver';
  if (pickup.driverName) return `${label}: ${pickup.driverName}`;
  // Completed with no assignee — don't show a misleading empty driver line.
  if (pickup.cardStatus === 'completed' || pickup.cardStatus === 'cancelled') {
    return null;
  }
  return `${label}: Not assigned yet`;
}

export default function CharityPickupScreen({ navigation }: any) {
  useTransparentStatusBar('light');
  const r = useResponsiveLayout();
  const adaptive = useMemo(() => buildDashboardShellStyles(r, { stackHero: true }), [r]);
  const bottomPadding = useBottomTabPadding(r.isTablet ? 24 : hp(3));
  const tabletInsetReset = r.isTablet ? { paddingHorizontal: 0 } : null;
  const {
    nextPickup,
    claimedPickups,
    loading,
    refreshing,
    error,
    reload,
  } = useReceiverFeed('people');

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPickup, setSelectedPickup] = useState<Pickup | null>(null);

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
      showErrorAlert(null, 'Error', 'Unable to open dialer');
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
        source: 'charity',
      });
      return;
    }
    openDetails(pickup);
  };

  const contentColumn = useMemo(() => {
    if (!r.isTablet || !adaptive.columnWidth) return null;
    return {
      width: adaptive.columnWidth,
      maxWidth: r.contentMaxWidth,
      alignSelf: 'center' as const,
      paddingHorizontal: r.pagePadH,
    };
  }, [r.isTablet, r.contentMaxWidth, r.pagePadH, adaptive.columnWidth]);

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
    const hasDriverPhone = Boolean(pickup.driverPhone);
    const showDriverContact = hasDriverPhone && pickup.cardStatus !== 'unclaimed';
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
            <AppText variant="bodyBold" style={[styles.weightValue, theme.weightText]} numberOfLines={1}>
              {pickup.weightKg}
            </AppText>
            <AppText variant="caption" style={styles.weightUnit} numberOfLines={1}>
              kg
            </AppText>
          </View>

          <View style={styles.detailsColumn}>
            <View style={styles.detailLine}>
              <Ionicons name="location-sharp" size={normalize(14)} color={palette.chilli} />
              <AppText variant="bodyBold" style={styles.detailText} numberOfLines={2} ellipsizeMode="tail">
                {pickup.restaurantAddress}
              </AppText>
            </View>

            {pickup.distance ? (
              <AppText variant="bodySmall" style={styles.distanceText}>
                {pickup.distance}
              </AppText>
            ) : null}

            <View style={styles.detailLine}>
              <Image
                source={require('../../../assets/placeholder/clock_icon_2.png')}
                style={styles.inlineIcon}
                resizeMode="contain"
              />
              <AppText variant="bodyBold" style={styles.detailText} numberOfLines={2} ellipsizeMode="tail">
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
                <AppText variant="bodyBold" style={styles.detailText} numberOfLines={2} ellipsizeMode="tail">
                  {driverLabel}
                </AppText>
              </View>
            ) : null}

            <Pressable
              style={[styles.viewDetailsBtn, theme.viewDetailsBtn]}
              onPress={() => handleViewDetails(pickup)}
            >
              <AppText
                variant="bodyBold"
                style={[styles.viewDetailsText, theme.viewDetailsText]}
                numberOfLines={1}
              >
                View Details
              </AppText>
            </Pressable>
          </View>
        </View>

        {showDriverContact ? (
          <View style={styles.contactSection}>
            <View style={styles.contactGroup}>
              <AppText variant="caption" style={styles.contactLabel}>
                Contact {pickup.assigneeLabel || 'Driver'}
              </AppText>
              <View style={styles.contactBtnRow}>
                {renderContactButton('Call', () => makeCall(pickup.driverPhone), theme, 'call-outline')}
                {renderContactButton(
                  'Message',
                  () => sendMessage(pickup.driverPhone),
                  theme,
                  'chatbubble-outline',
                )}
              </View>
            </View>
          </View>
        ) : null}
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

  return (
    <Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          adaptive.scrollContent,
          { paddingBottom: bottomPadding },
          !loading && !nextPickup && filteredPickups.length === 0 ? { flexGrow: 1 } : null,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void reload()}
            tintColor={palette.kale}
            colors={[palette.kale]}
          />
        }
      >
        <View
          style={
            r.isTablet
              ? { width: r.width, alignSelf: 'center' as const }
              : undefined
          }
        >
          <StackHeroHeader
            title="Your Pickups"
            height={r.isTablet ? adaptive.heroHeight : hp(14)}
            style={r.isTablet ? adaptive.heroBleed : undefined}
          />
        </View>

        {loading && !nextPickup && claimedPickups.length === 0 ? (
          <View style={[styles.emptyWrap, contentColumn, tabletInsetReset]}>
            <ActivityIndicator color={palette.kale} />
            <AppText variant="bodySmall" style={[styles.emptyText, adaptive.emptyText]}>
              Loading pickups…
            </AppText>
          </View>
        ) : null}

        {error && !loading ? (
          <View style={[styles.emptyWrap, contentColumn, tabletInsetReset]}>
            <AppText variant="bodySmall" style={[styles.emptyText, adaptive.emptyText]}>
              {error}
            </AppText>
            <Pressable onPress={() => void reload()}>
              <AppText variant="bodyBold" color={palette.kale}>
                Try again
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {nextPickup ? (
          <View style={[styles.sectionBlock, contentColumn, tabletInsetReset]}>
            <AppText variant="h8" style={[styles.sectionHeading, adaptive.sectionTitle]}>
              Next Pickup
            </AppText>
            {renderPickupCard(nextPickup)}
          </View>
        ) : null}

        <View style={[styles.sectionBlock, contentColumn, tabletInsetReset]}>
          <View style={styles.filterRow}>
            {renderStatusChip('all', 'All')}
            {renderStatusChip('completed', 'Completed', 'checkmark-circle-outline')}
            {renderStatusChip('cancelled', 'Cancelled', 'close-circle-outline')}
          </View>

          {filteredPickups.length > 0 ? (
            filteredPickups.map((pickup) => renderPickupCard(pickup))
          ) : (
            <View style={styles.emptyWrap}>
              <AppText variant="bodySmall" style={[styles.emptyText, adaptive.emptyText]}>
                {claimedPickups.length === 0
                  ? 'No claimed pickups yet. Available surplus will appear under Next Pickup.'
                  : 'No pickups match this filter.'}
              </AppText>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
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
              <Pressable style={styles.closeIconBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={normalize(20)} color={palette.black} />
              </Pressable>
            </View>

            {selectedPickup ? (
              <>
                <AppText variant="bodyBold" style={styles.modalSubtitle}>
                  {selectedPickup.restaurantName}
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
    gap: hp(1.5),
  },

  /* Sections */
  sectionBlock: {
    paddingHorizontal: wp(4),
    gap: hp(1.2),
    width: '100%',
  },
  sectionHeading: {
    color: palette.black,
    textTransform: 'none',
  },

  /* Filter chips */
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderRadius: normalize(999),
    borderWidth: 1,
    flexShrink: 0,
  },
  filterChipInactive: {
    backgroundColor: palette.white,
    borderColor: palette.primary,
  },
  filterChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  filterChipText: {
    fontSize: normalize(13),
    textTransform: 'none',
    flexShrink: 0,
  },
  filterChipTextActive: {
    color: palette.white,
  },
  filterChipTextInactive: {
    color: palette.primary,
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
    alignItems: 'stretch',
    gap: wp(2.5),
  },
  weightBox: {
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
  weightIcon: {
    width: normalize(22),
    height: normalize(22),
  },
  weightValue: {
    fontSize: normalize(13),
    lineHeight: normalize(16),
    textTransform: 'none',
    textAlign: 'center',
  },
  weightUnit: {
    fontSize: normalize(11),
    lineHeight: normalize(13),
    color: palette.stone,
    textTransform: 'none',
    textAlign: 'center',
  },
  detailsColumn: {
    flex: 1,
    minWidth: 0,
    gap: hp(0.4),
  },
  detailLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(1),
    minWidth: 0,
  },
  detailText: {
    flex: 1,
    fontSize: normalize(12),
    lineHeight: normalize(16),
    color: palette.black,
    textTransform: 'none',
  },
  distanceText: {
    marginLeft: wp(4.5),
    color: palette.midgray,
    textTransform: 'none',
    fontSize: normalize(11),
  },
  inlineIcon: {
    width: normalize(14),
    height: normalize(14),
    marginTop: normalize(1),
    flexShrink: 0,
  },
  viewDetailsBtn: {
    alignSelf: 'flex-end',
    minWidth: normalize(108),
    paddingVertical: hp(0.85),
    paddingHorizontal: wp(3.5),
    borderRadius: normalize(8),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(0.3),
  },
  viewDetailsText: {
    fontSize: normalize(12),
    lineHeight: normalize(16),
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
