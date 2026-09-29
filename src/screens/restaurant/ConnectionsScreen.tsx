import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StatusBar as RNStatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { HeroHeader } from '@/components/HeroHeader';
import { Screen } from '@/components/Screen';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { connectionsService, type Connection } from '@/services/connections.service';
import { useAppContext } from '@/store/AppContext';
import { useSitesStore } from '@/store/sitesStore';
import { palette } from '@/theme/colors';
import { showErrorAlert } from '@/utils/apiError';
import {
  connectionLocationLabel,
  connectionPartyName,
  isCutoffDue,
  outcomeAwaitingCharity,
  outcomeNeedsSurplus,
  statusLabel,
} from '@/utils/connections';
import { isVirtualHqSiteId } from '@/utils/defaultHqSite';
import { resolveListingSiteId } from '@/utils/listingSite';
import { hp, normalize, useResponsiveLayout, wp } from '@/utils/responsive';
import { buildDashboardShellStyles } from '@/utils/dashboardAdaptive';

export function ConnectionsScreen({ route }: any) {
  useTransparentStatusBar('light');
  const navigation = useNavigation<any>();
  const r = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const adaptive = useMemo(() => buildDashboardShellStyles(r, { stackHero: true }), [r]);
  const heroHeight = r.isTablet ? adaptive.heroHeight : 96;
  const { authUser } = useAppContext();
  const rawSites = useSitesStore((s) => s.sites);

  const sites = useMemo(() => {
    return (rawSites ?? [])
      .map((site: any) => ({
        id: Number(site?.id),
        name: site?.siteName || site?.name || site?.organisationName || `Site ${site?.id}`,
      }))
      .filter((site) => Number.isFinite(site.id) && site.id > 0 && !isVirtualHqSiteId(site.id));
  }, [rawSites]);

  const [siteId, setSiteId] = useState<number | null>(
    Number.isFinite(Number(route?.params?.siteId)) ? Number(route.params.siteId) : null,
  );
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<Connection | null>(null);

  const resolveSite = useCallback(async () => {
    if (siteId && sites.some((site) => site.id === siteId)) return siteId;
    if (sites.length >= 1) return sites[0].id;
    return resolveListingSiteId(authUser);
  }, [authUser, siteId, sites]);

  const load = useCallback(async () => {
    try {
      const resolved = await resolveSite();
      if (!resolved) {
        setConnections([]);
        return;
      }
      setSiteId(resolved);
      const rows = await connectionsService.listForSite(resolved);
      setConnections(rows);
    } catch (error) {
      showErrorAlert(error, 'Could not load connections');
    } finally {
      setLoading(false);
    }
  }, [resolveSite]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const selectSite = (id: number) => {
    if (id === siteId) return;
    setSiteId(id);
    setLoading(true);
    connectionsService
      .listForSite(id)
      .then(setConnections)
      .catch((error) => showErrorAlert(error, 'Could not load connections'))
      .finally(() => setLoading(false));
  };

  const live = connections.filter((c) => c.status === 'PENDING' || c.status === 'ACTIVE' || c.status === 'PAUSED');
  const past = connections.filter((c) => !live.includes(c));
  const activeCount = connections.filter((c) => c.status === 'ACTIVE').length;
  const pendingCount = connections.filter((c) => c.status === 'PENDING').length;
  const dueToday = live.filter((c) => {
    const today = c.today;
    return (
      outcomeNeedsSurplus(today?.outcome) ||
      outcomeAwaitingCharity(today?.outcome) ||
      isCutoffDue(today?.cutoffAt, today?.outcome)
    );
  });

  const statsLabel = loading
    ? 'Loading connections'
    : connections.length === 0
      ? 'No preferred charity yet'
      : [
          pendingCount ? `${pendingCount} awaiting` : null,
          `${activeCount} active`,
          `${connections.length} total`,
        ]
          .filter(Boolean)
          .join(' · ');

  return (
    <Screen
      scrollable
      backgroundColor={palette.creme}
      contentStyle={styles.screen}
      transparentTop
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

      <View
        style={[
          styles.body,
          { paddingBottom: insets.bottom + hp(2) },
          r.isTablet && { width: adaptive.columnWidth, alignSelf: 'center' },
        ]}
      >
        {sites.length > 1 ? (
          <View style={styles.siteRow}>
            {sites.map((site) => (
              <Pressable
                key={site.id}
                onPress={() => selectSite(site.id)}
                style={[styles.siteChip, siteId === site.id && styles.siteChipOn]}
              >
                <AppText
                  variant="caption"
                  color={siteId === site.id ? palette.white : palette.primary}
                >
                  {site.name}
                </AppText>
              </Pressable>
            ))}
          </View>
        ) : null}

        {dueToday.length ? (
          <View style={styles.todayBox}>
            <AppText variant="label">Due today</AppText>
            {dueToday.map((connection) => {
              const needsSurplus = outcomeNeedsSurplus(connection.today?.outcome);
              return (
                <Pressable
                  key={connection.id}
                  style={styles.todayRow}
                  onPress={() =>
                    navigation.navigate('ConnectionDetail', { connectionId: connection.id, siteId })
                  }
                >
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyBold">
                      {connectionPartyName(connection.receiverSite, connection.receiverOrg?.name || 'Charity')}
                    </AppText>
                    <AppText variant="caption" color={palette.stone}>
                      {needsSurplus ? 'List reserved surplus' : 'Awaiting collection'}
                    </AppText>
                  </View>
                  <AppText variant="caption" color={palette.kale}>
                    {needsSurplus ? 'List' : 'Open'}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.inviteCard, pressed && { opacity: 0.92 }]}
          onPress={() => navigation.navigate('CreateConnection', { siteId })}
        >
          <View style={styles.inviteIcon}>
            <Ionicons name="person-add-outline" size={normalize(18)} color={palette.kale} />
          </View>
          <View style={styles.inviteCopy}>
            <AppText variant="bodyBold">Invite a charity</AppText>
            <AppText variant="caption" color={palette.stone} numberOfLines={1}>
              Offer surplus to them first on selected days
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={normalize(16)} color={palette.primary} />
        </Pressable>

        {loading ? (
          <ActivityIndicator color={palette.kale} style={{ marginTop: hp(1) }} />
        ) : connections.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={normalize(28)} color={palette.kale} />
            <AppText variant="label" style={{ marginTop: hp(1) }}>
              No preferred charity yet
            </AppText>
            <AppText variant="bodySmall" color={palette.stone} style={styles.emptyCopy}>
              Until a connection is active, surplus listings go to nearby charities as usual.
            </AppText>
          </View>
        ) : (
          <>
            {live.length ? (
              <AppText variant="label" color={palette.primary}>
                Your connections
              </AppText>
            ) : null}
            {live.map((connection) => (
              <RestaurantConnectionCard
                key={connection.id}
                connection={connection}
                onPress={() =>
                  navigation.navigate('ConnectionDetail', { connectionId: connection.id, siteId })
                }
                onMoreDetails={setDetails}
              />
            ))}
            {past.length ? (
              <AppText
                variant="label"
                color={palette.primary}
                style={live.length ? { marginTop: 8 } : undefined}
              >
                Past
              </AppText>
            ) : null}
            {past.map((connection) => (
              <RestaurantConnectionCard
                key={connection.id}
                connection={connection}
                onPress={() =>
                  navigation.navigate('ConnectionDetail', { connectionId: connection.id, siteId })
                }
                onMoreDetails={setDetails}
              />
            ))}
          </>
        )}
      </View>

      <ConnectionDetailsModal connection={details} onClose={() => setDetails(null)} />
    </Screen>
  );
}

function RestaurantConnectionCard({
  connection,
  onPress,
  onMoreDetails,
}: {
  connection: Connection;
  onPress: () => void;
  onMoreDetails: (connection: Connection) => void;
}) {
  const charity = connectionPartyName(connection.receiverSite, connection.receiverOrg?.name || 'Charity');
  const today = connection.today;
  const due =
    outcomeNeedsSurplus(today?.outcome) ||
    outcomeAwaitingCharity(today?.outcome) ||
    isCutoffDue(today?.cutoffAt, today?.outcome);
  const pending = connection.status === 'PENDING';

  return (
    <View style={styles.card}>
      <Pressable onPress={onPress}>
        <View style={styles.cardTop}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText variant="bodyBold" numberOfLines={2}>
              {charity}
            </AppText>
            <AppText variant="bodySmall" color={palette.stone} numberOfLines={2}>
              {connection.schedule || 'Days and pickup window not set yet'}
            </AppText>
          </View>
          <View style={[styles.statusBadge, pending && styles.statusBadgePending]}>
            <AppText
              variant="caption"
              style={[styles.statusBadgeText, pending && styles.statusBadgePendingText]}
            >
              {statusLabel(connection.status)}
            </AppText>
          </View>
        </View>
        {due ? (
          <AppText variant="caption" color={palette.kale} style={{ marginTop: 8 }}>
            Collection due today
          </AppText>
        ) : null}
        {connection.stats ? (
          <AppText variant="caption" color={palette.midgray} style={{ marginTop: 6 }}>
            {connection.stats.collectionsCompleted} collections · {connection.stats.kgRedirected} kg
            {connection.stats.reliabilityPercent != null
              ? ` · ${connection.stats.reliabilityPercent}% reliability`
              : ''}
          </AppText>
        ) : null}
      </Pressable>
      <Pressable onPress={() => onMoreDetails(connection)} hitSlop={8} style={styles.moreLink}>
        <AppText variant="caption" color={palette.primary}>More details</AppText>
      </Pressable>
    </View>
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
  const orgName = connection?.receiverOrg?.name || connection?.receiverSite?.organisationName || '';
  const siteName = connection?.receiverSite?.name || '';
  const location = connectionLocationLabel(connection?.receiverSite);
  const showOrg = orgName && siteName && orgName !== siteName;

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
            {siteName || orgName || 'Charity'}
          </AppText>
          <AppText variant="caption" color={palette.stone} style={{ marginTop: 4, marginBottom: 14 }}>
            Preferred collection details
          </AppText>
          {showOrg ? <DetailRow label="Organisation" value={orgName} /> : null}
          {siteName ? <DetailRow label="Site" value={siteName} /> : null}
          {location ? <DetailRow label="Location" value={location} /> : null}
          {connection?.schedule ? <DetailRow label="Schedule" value={connection.schedule} /> : null}
          {connection?.typicalSurplus ? (
            <DetailRow label="Typical surplus - guide only" value={connection.typicalSurplus} />
          ) : null}
          {connection?.typicalQuantity ? (
            <DetailRow label="Typical quantity - guide only" value={connection.typicalQuantity} />
          ) : null}
          {connection?.notes ? <DetailRow label="Notes" value={connection.notes} /> : null}
          {connection?.stats ? (
            <DetailRow
              label="So far"
              value={`${connection.stats.collectionsCompleted} collections · ${connection.stats.kgRedirected} kg`}
            />
          ) : null}
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
    width: '100%',
    paddingHorizontal: wp(5),
    paddingTop: hp(0.6),
    gap: hp(1.3),
  },
  siteRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  siteChip: {
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  siteChipOn: { backgroundColor: palette.primary },
  todayBox: {
    backgroundColor: palette.white,
    borderRadius: normalize(20),
    padding: wp(4),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
    gap: 8,
  },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inviteCard: {
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3.4),
    borderRadius: normalize(18),
    backgroundColor: palette.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.6),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  inviteIcon: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: '#E8F3EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  empty: {
    backgroundColor: palette.white,
    borderRadius: normalize(20),
    padding: 20,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
  },
  emptyCopy: {
    marginTop: 6,
    textAlign: 'center',
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
  statusBadgePending: {
    backgroundColor: '#FFF3E4',
  },
  statusBadgePendingText: {
    color: palette.orange,
  },
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
  modalClose: {
    alignItems: 'center',
    paddingTop: hp(1.2),
  },
});
