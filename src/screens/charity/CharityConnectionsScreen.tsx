import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, RefreshControl, StatusBar as RNStatusBar, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CharityInviteCard,
  acceptCharityInvite,
  declineCharityInvite,
  handleInviteError,
} from '@/components/CharityInviteCard';
import { AppText } from '@/components/AppText';
import { HeroHeader } from '@/components/HeroHeader';
import { Screen } from '@/components/Screen';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { connectionsService, type Connection, type ConnectionToday } from '@/services/connections.service';
import { palette } from '@/theme/colors';
import { showErrorAlert } from '@/utils/apiError';
import { connectionCharitySiteLabel, connectionLocationLabel, connectionPartyName, formatWindowLabel, statusLabel } from '@/utils/connections';
import { hp, normalize, useResponsiveLayout, wp } from '@/utils/responsive';
import { buildDashboardShellStyles } from '@/utils/dashboardAdaptive';

export function CharityConnectionsScreen() {
  useTransparentStatusBar('light');
  const navigation = useNavigation<any>();
  const r = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const adaptive = useMemo(() => buildDashboardShellStyles(r, { stackHero: true }), [r]);
  const heroHeight = r.isTablet ? adaptive.heroHeight : 96;
  const { submitting, withLock } = useSubmitLock();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [today, setToday] = useState<ConnectionToday[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [details, setDetails] = useState<Connection | null>(null);

  const load = useCallback(async () => {
    try {
      const [rows, due] = await Promise.all([
        connectionsService.listForCharity(),
        connectionsService.listTodayForCharity().catch(() => []),
      ]);
      setConnections(rows);
      setToday(due);
    } catch (error) {
      showErrorAlert(error, 'Could not load connections');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const pending = connections.filter((c) => c.status === 'PENDING');
  const rest = connections.filter((c) => c.status !== 'PENDING');
  const reserved = today.filter((row) => row.outcome === 'PUBLISHED' && row.listingId);
  const activeCount = connections.filter((c) => c.status === 'ACTIVE').length;

  const statsLabel = loading
    ? 'Loading connections'
    : connections.length === 0
      ? 'No regular collections yet'
      : [
          pending.length ? `${pending.length} invitation${pending.length === 1 ? '' : 's'}` : null,
          `${activeCount} active`,
          `${connections.length} total`,
        ]
          .filter(Boolean)
          .join(' · ');

  const accept = (connection: Connection) =>
    withLock(async () => {
      try {
        await acceptCharityInvite(connection.id);
        await load();
      } catch (error) {
        handleInviteError(error);
      }
    });

  const decline = (connection: Connection) =>
    withLock(async () => {
      try {
        await declineCharityInvite(connection.id);
        await load();
      } catch (error) {
        handleInviteError(error);
      }
    });

  return (
    <Screen
      scrollable
      backgroundColor={palette.creme}
      contentStyle={styles.screen}
      transparentTop
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[palette.primary]}
          tintColor={palette.primary}
        />
      }
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <HeroHeader
        source={require('../../../assets/placeholder/kale-header.png')}
        height={heroHeight}
        style={adaptive.heroBleed}
      >
        <View style={[styles.heroContent, r.isTablet && adaptive.heroContent]}>
          <View style={styles.heroTopRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.75 }]}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={normalize(22)} color={palette.white} />
            </Pressable>
            <View style={styles.heroTextBlock}>
              <AppText variant="h6" style={styles.heroTitle} numberOfLines={1}>
                Connections
              </AppText>
              <AppText variant="caption" style={styles.heroSubtitle} numberOfLines={1}>
                {statsLabel}
              </AppText>
            </View>
          </View>
        </View>
      </HeroHeader>

      <View style={[styles.body, { paddingBottom: insets.bottom + hp(2) }]}>
        {reserved.length ? (
          <View style={styles.todayBox}>
            <AppText variant="label">Reserved for you today</AppText>
            {reserved.map((row) => (
              <Pressable
                key={row.dayId}
                style={styles.todayRow}
                onPress={() => navigation.navigate('Tabs', { screen: 'Available' })}
              >
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyBold">{row.donorName || 'Business'}</AppText>
                  <AppText variant="caption" color={palette.stone}>
                    {formatWindowLabel(row.windowStartAt, row.windowEndAt) || row.schedule}
                  </AppText>
                </View>
                <AppText variant="caption" color={palette.kale}>Confirm</AppText>
              </Pressable>
            ))}
          </View>
        ) : null}

        {!loading && (
          <AppText variant="body1" color={palette.stone} style={styles.pageDescription}>
            {connections.length === 0
              ? 'Review invitations from food businesses that would like to arrange regular collections with you. The food and quantities available for each collection will be confirmed before pickup.'
              : 'View and manage your regular collection Connections. A business invites one of your sites, not the whole organisation. They confirm the food and quantities before that day\u2019s pickup.'}
          </AppText>
        )}

        {loading ? (
          <ActivityIndicator color={palette.kale} />
        ) : connections.length === 0 ? (
          <View style={styles.empty}>
            <AppText variant="label">No regular collections yet</AppText>
            <AppText variant="bodySmall" color={palette.stone} style={{ marginTop: 6, textAlign: 'center' }}>
              When a business invites you, it will appear here and on Home.
            </AppText>
          </View>
        ) : (
          <>
            {pending.length ? (
              <AppText variant="label" color={palette.primary}>Invitations</AppText>
            ) : null}
            {pending.map((connection) => (
              <CharityInviteCard
                key={connection.id}
                connection={connection}
                submitting={submitting}
                onAccept={accept}
                onDecline={decline}
                onMoreDetails={setDetails}
              />
            ))}
            {rest.length ? (
              <AppText variant="label" color={palette.primary} style={pending.length ? { marginTop: 8 } : undefined}>
                Your connections
              </AppText>
            ) : null}
            {rest.map((connection) => {
              const yourSite = connectionCharitySiteLabel(connection);
              return (
              <View key={connection.id} style={styles.card}>
                <Pressable
                  onPress={() => navigation.navigate('CharityConnectionDetail', { connectionId: connection.id })}
                >
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyBold">
                        {connectionPartyName(connection.donorSite, connection.donorOrg?.name || 'Business')}
                      </AppText>
                      <AppText variant="bodySmall" color={palette.stone}>{connection.schedule}</AppText>
                      {yourSite ? (
                        <AppText variant="caption" color={palette.midgray} numberOfLines={2}>
                          Your site · {yourSite}
                        </AppText>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        connection.status === 'ENDED' && styles.statusBadgeEnded,
                      ]}
                    >
                      <AppText
                        variant="caption"
                        style={[
                          styles.statusBadgeText,
                          connection.status === 'ENDED' && styles.statusBadgeEndedText,
                        ]}
                      >
                        {statusLabel(connection.status)}
                      </AppText>
                    </View>
                  </View>
                </Pressable>
                <Pressable onPress={() => setDetails(connection)} hitSlop={8} style={styles.moreLink}>
                  <AppText variant="caption" color={palette.primary}>More details</AppText>
                </Pressable>
              </View>
              );
            })}
          </>
        )}
      </View>

      <ConnectionDetailsModal connection={details} onClose={() => setDetails(null)} />
    </Screen>
  );
}

function ConnectionDetailsModal({
  connection,
  onClose,
}: {
  connection: Connection | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const orgName = connection?.donorOrg?.name || connection?.donorSite?.organisationName || '';
  const siteName = connection?.donorSite?.name || '';
  const location = connectionLocationLabel(connection?.donorSite);
  const showOrg = orgName && siteName && orgName !== siteName;
  const yourSite = connectionCharitySiteLabel(connection);

  return (
    <Modal
      visible={!!connection}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
      onShow={() => {
        if (Platform.OS === 'android') {
          RNStatusBar.setTranslucent(true);
          RNStatusBar.setBackgroundColor('transparent', true);
          RNStatusBar.setBarStyle('light-content', true);
        }
      }}
    >
      <View style={styles.modalOverlay}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + hp(2.4) }]}>
          <View style={styles.dragHandle} />
          <AppText variant="h6" color={palette.primary}>
            {siteName || orgName || 'Business'}
          </AppText>
          <AppText variant="caption" color={palette.stone} style={{ marginTop: 4, marginBottom: 14 }}>
            Collection details
          </AppText>
          {showOrg ? <DetailRow label="Organisation" value={orgName} /> : null}
          {siteName ? <DetailRow label="Site" value={siteName} /> : null}
          {location ? <DetailRow label="Location" value={location} /> : null}
          {yourSite ? <DetailRow label="Your site" value={yourSite} /> : null}
          {connection?.schedule ? <DetailRow label="Schedule" value={connection.schedule} /> : null}
          {connection?.typicalSurplus ? (
            <DetailRow label="Typical surplus - guide only" value={connection.typicalSurplus} />
          ) : null}
          {connection?.typicalQuantity ? (
            <DetailRow label="Typical quantity - guide only" value={connection.typicalQuantity} />
          ) : (
            <DetailRow label="Typical quantity - guide only" value="Quantity varies" />
          )}
          {connection?.notes ? <DetailRow label="Notes" value={connection.notes} /> : null}
          <AppText
            variant="bodySmall"
            color={palette.stone}
            style={styles.modalDisclaimer}
          >
            The business will confirm the actual food and quantities before each pickup.
          </AppText>
          <Pressable style={styles.modalClose} onPress={onClose}>
            <AppText variant="bodyBold" color={palette.primary}>Close</AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <AppText variant="caption" color={palette.stone}>{label}</AppText>
      <AppText variant="bodySmall">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, paddingBottom: hp(4) },
  heroContent: {
    flex: 1,
    paddingHorizontal: wp(5),
    paddingTop: 6,
    paddingBottom: hp(1),
    justifyContent: 'center',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  heroTextBlock: { flex: 1, gap: 2 },
  heroTitle: {
    color: palette.white,
    fontSize: normalize(22),
    lineHeight: normalize(26),
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
  },
  body: {
    paddingHorizontal: wp(5),
    paddingTop: hp(0.6),
    gap: hp(1.3),
  },
  pageDescription: {
    marginBottom: hp(2),
    lineHeight: 20,
  },
  todayBox: {
    backgroundColor: palette.white,
    borderRadius: normalize(20),
    padding: wp(4),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
    gap: 8,
  },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  empty: {
    backgroundColor: palette.white,
    borderRadius: normalize(20),
    padding: 20,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: normalize(20),
    padding: wp(4),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  moreLink: { marginTop: 8 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 27, 0.45)',
  },
  modalSheet: {
    backgroundColor: palette.creme,
    borderTopLeftRadius: normalize(28),
    borderTopRightRadius: normalize(28),
    paddingHorizontal: wp(6),
    paddingTop: hp(1.2),
    paddingBottom: hp(3),
  },
  dragHandle: {
    alignSelf: 'center',
    width: normalize(40),
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D0D0',
    marginBottom: hp(1.6),
  },
  detailRow: {
    marginBottom: 12,
    gap: 3,
  },
  modalDisclaimer: {
    marginTop: hp(1.5),
    marginBottom: hp(0.5),
    lineHeight: 18,
    textAlign: 'center',
  },
  modalClose: {
    alignItems: 'center',
    paddingTop: hp(1.2),
  },
  statusBadge: {
    backgroundColor: '#E8F3EC',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: normalize(12),
  },
  statusBadgeText: {
    color: palette.middlegreen,
    fontWeight: '600',
  },
  statusBadgeEnded: {
    backgroundColor: '#FDECEC',
  },
  statusBadgeEndedText: {
    color: palette.danger,
  },
});
