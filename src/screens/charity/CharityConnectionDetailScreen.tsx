import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { DiscoverListingDetailModal } from '@/components/DiscoverListingDetailModal';
import { connectionsService, type Connection } from '@/services/connections.service';
import {
  fetchListingDetail,
  mapDiscoverListing,
  type FoodItem,
} from '@/services/foodListing.service';
import { showConfirmAlert } from '@/store/appAlertStore';
import { palette } from '@/theme/colors';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import { connectionCharitySiteLabel, connectionPartyName, formatWindowLabel, statusLabel } from '@/utils/connections';
import { resolveFoodIconFromLabel } from '@/utils/foodListing';
import { hp, normalize, useResponsiveLayout, wp } from '@/utils/responsive';
import { buildDashboardShellStyles } from '@/utils/dashboardAdaptive';

function formatCutoffTime(cutoffAt?: string | null): string {
  if (!cutoffAt) return '';
  const d = new Date(cutoffAt);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function CharityConnectionDetailScreen({ route }: any) {
  useTransparentStatusBar('light');
  const navigation = useNavigation<any>();
  const r = useResponsiveLayout();
  const adaptive = useMemo(() => buildDashboardShellStyles(r, { stackHero: true }), [r]);
  const connectionId = Number(route?.params?.connectionId);
  const { submitting, withLock } = useSubmitLock();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [listingItems, setListingItems] = useState<FoodItem[]>([]);
  const [listingPreview, setListingPreview] = useState<ReturnType<typeof mapDiscoverListing> | null>(null);
  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [listingLoading, setListingLoading] = useState(false);

  const load = useCallback(async () => {
    if (!Number.isFinite(connectionId)) return;
    try {
      setConnection(await connectionsService.getOne(connectionId));
    } catch (error) {
      showErrorAlert(error, 'Could not load this connection');
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // Fetch listing items whenever a PUBLISHED listing becomes available
  const listingId = connection?.today?.listingId;
  const todayOutcome = connection?.today?.outcome;

  useEffect(() => {
    if (todayOutcome !== 'PUBLISHED' || !listingId) {
      setListingItems([]);
      setListingPreview(null);
      return;
    }
    let cancelled = false;
    setListingLoading(true);
    fetchListingDetail(listingId)
      .then((detail) => {
        if (cancelled) return;
        setListingItems(detail.foodItems ?? []);
        setListingPreview(mapDiscoverListing(detail));
      })
      .catch(() => {
        if (cancelled) return;
        setListingItems([]);
        setListingPreview(null);
      })
      .finally(() => {
        if (!cancelled) setListingLoading(false);
      });
    return () => { cancelled = true; };
  }, [listingId, todayOutcome]);

  useEffect(() => {
    if (route?.params?.openListing && listingPreview) {
      setListingModalOpen(true);
    }
  }, [listingPreview, route?.params?.openListing]);

  const run = (action: () => Promise<unknown>, success: string) =>
    withLock(async () => {
      try {
        await action();
        showSuccessAlert(success);
        await load();
      } catch (error) {
        showErrorAlert(error, 'Could not update connection');
      }
    });

  const donor = connectionPartyName(connection?.donorSite, connection?.donorOrg?.name || 'Business');
  const today = connection?.today;
  const canDeclineToday = today?.outcome === 'PUBLISHED' && today.id;
  const cutoffLabel = formatCutoffTime(today?.cutoffAt);

  const confirmPause = () =>
    showConfirmAlert({
      title: 'Pause this connection?',
      message: `While paused, you won’t receive regular collection offers from ${donor}. ${donor} will be notified and you can resume the Connection at any time.`,
      confirmLabel: 'Pause Connection',
      cancelLabel: 'Keep active',
      onConfirm: () =>
        run(() => connectionsService.pauseAsCharity(connection!.id), 'Connection paused'),
    });

  return (
    <Screen scrollable backgroundColor={palette.creme} contentStyle={styles.screen} transparentTop>
      <StackHeroHeader title={donor} height={adaptive.heroHeight} style={adaptive.heroBleed} />
      <View style={styles.body}>
        {loading || !connection ? (
          <ActivityIndicator color={palette.kale} />
        ) : (
          <>
            <AppText variant="label">{statusLabel(connection.status)}</AppText>
            <AppText variant="body1">{connection.schedule}</AppText>
            {connectionCharitySiteLabel(connection) ? (
              <AppText variant="bodySmall" color={palette.stone}>
                Your site · {connectionCharitySiteLabel(connection)}
              </AppText>
            ) : null}
            {connection.typicalSurplus ? (
              <AppText variant="bodySmall" color={palette.stone}>
                Typical surplus - guide only: {connection.typicalSurplus}
              </AppText>
            ) : null}
            {connection.typicalQuantity ? (
              <AppText variant="bodySmall" color={palette.stone}>
                Typical quantity - guide only: {connection.typicalQuantity}
              </AppText>
            ) : null}
            {connection.notes ? (
              <AppText variant="bodySmall" color={palette.stone}>{connection.notes}</AppText>
            ) : null}

            {connection.status === 'PENDING' ? (
              <>
                <Pressable
                  style={styles.primary}
                  disabled={submitting}
                  onPress={() =>
                    showConfirmAlert({
                      title: 'Accept this invitation?',
                      message: 'You will be offered their surplus first on these days. You can pause or end it later if you need to.',
                      confirmLabel: 'Accept',
                      onConfirm: () =>
                        run(
                          () => connectionsService.accept(connection.id),
                          'Connection accepted. If today is a scheduled day and the window is still open, the business can list for you now.',
                        ),
                    })
                  }
                >
                  <AppText variant="bodyBold" color={palette.white}>Accept</AppText>
                </Pressable>
                <Pressable
                  style={styles.secondary}
                  disabled={submitting}
                  onPress={() =>
                    showConfirmAlert({
                      title: 'Decline this invitation?',
                      message: 'The business will be told. They can invite again later.',
                      confirmLabel: 'Decline',
                      destructive: true,
                      onConfirm: () =>
                        run(async () => {
                          await connectionsService.decline(connection.id);
                          navigation.goBack();
                        }, 'Invitation declined'),
                    })
                  }
                >
                  <AppText variant="bodyBold" color={palette.primary}>Decline</AppText>
                </Pressable>
              </>
            ) : null}

            {today?.outcome === 'NO_RESPONSE' ? (
              <View style={styles.todayBox}>
                <AppText variant="label">Today’s collection was not confirmed</AppText>
                <AppText variant="bodySmall" color={palette.stone}>
                  {donor} did not confirm any surplus for today. No collection is required. Your regular Connection remains active.
                </AppText>
              </View>
            ) : null}

            {today?.outcome === 'PUBLISHED' ? (
              <View style={styles.todayBox}>
                <AppText variant="label">Today's collection is ready</AppText>

                {/* Item breakdown */}
                {listingLoading ? (
                  <ActivityIndicator size="small" color={palette.kale} style={{ alignSelf: 'flex-start' }} />
                ) : listingItems.length > 0 ? (
                  <View style={styles.itemList}>
                    {listingItems.map((item, idx) => (
                      <View key={item.id ?? idx} style={styles.itemRow}>
                        <Image
                          source={resolveFoodIconFromLabel(item.name, item.category)}
                          style={styles.itemIcon}
                          resizeMode="contain"
                        />
                        <AppText variant="bodySmall" color={palette.ink} style={styles.itemText}>
                          {`${item.totalQtyKg} kg ${item.name ?? item.category ?? ''}`}
                        </AppText>
                      </View>
                    ))}
                  </View>
                ) : null}

                {listingPreview?.allergens?.length ? (
                  <AppText variant="bodySmall" color={palette.stone}>
                    Allergens: {listingPreview.allergens.join(', ')}
                  </AppText>
                ) : null}
                {listingPreview?.storage ? (
                  <AppText variant="bodySmall" color={palette.stone}>
                    Storage: {listingPreview.storage}
                  </AppText>
                ) : null}
                {listingPreview?.collectionNotes ? (
                  <AppText variant="bodySmall" color={palette.stone}>
                    {listingPreview.collectionNotes}
                  </AppText>
                ) : null}

                {/* Pickup window */}
                <AppText variant="bodySmall" color={palette.stone}>
                  {`Pickup between ${formatWindowLabel(today.windowStartAt, today.windowEndAt) || connection.schedule}`}
                </AppText>

                {/* Confirm CTA */}
                <Pressable
                  style={styles.primary}
                  onPress={() => {
                    if (listingPreview) {
                      setListingModalOpen(true);
                      return;
                    }
                    navigation.navigate('Tabs', { screen: 'Available' });
                  }}
                >
                  <AppText variant="bodyBold" color={palette.white}>Confirm Collection</AppText>
                </Pressable>

                {/* Cutoff reminder */}
                {cutoffLabel ? (
                  <AppText variant="bodySmall" color={palette.stone} style={styles.cutoffText}>
                    {`Please confirm by ${cutoffLabel}. If you can't collect or don't confirm by then, the food will be offered to nearby charities.`}
                  </AppText>
                ) : null}

                {/* Can't collect today */}
                {canDeclineToday ? (
                  <Pressable
                    style={styles.secondaryInBox}
                    disabled={submitting}
                    onPress={() =>
                      showConfirmAlert({
                        title: "Can't collect today?",
                        message: 'This listing will be offered to nearby charities immediately.',
                        confirmLabel: 'Release to network',
                        onConfirm: () =>
                          run(
                            () => connectionsService.cannotCollect(today.id!),
                            'Released to nearby charities.',
                          ),
                      })
                    }
                  >
                    <AppText variant="bodyBold" color={palette.primary}>Can't collect today</AppText>
                  </Pressable>
                ) : null}

                {/* Pause — inside today box as per design */}
                {connection.status === 'ACTIVE' ? (
                  <Pressable
                    style={styles.secondaryInBox}
                    disabled={submitting}
                    onPress={confirmPause}
                  >
                    <AppText variant="bodyBold" color={palette.primary}>Pause Connection</AppText>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* Pause button when there is no active today-box (no PUBLISHED collection) */}
            {today?.outcome !== 'PUBLISHED' && connection.status === 'ACTIVE' ? (
              <Pressable
                style={styles.secondary}
                disabled={submitting}
                onPress={confirmPause}
              >
                <AppText variant="bodyBold" color={palette.primary}>Pause Connection</AppText>
              </Pressable>
            ) : null}

            {connection.status === 'PAUSED' ? (
              <Pressable
                style={styles.primary}
                disabled={submitting}
                onPress={() =>
                  run(() => connectionsService.resumeAsCharity(connection.id), 'Connection resumed')
                }
              >
                <AppText variant="bodyBold" color={palette.white}>Resume Connection</AppText>
              </Pressable>
            ) : null}

            {connection.status === 'ACTIVE' || connection.status === 'PAUSED' ? (
              <Pressable
                style={styles.danger}
                disabled={submitting}
                onPress={() =>
                  showConfirmAlert({
                    title: 'End this connection?',
                    message: 'This business will offer surplus to the network again.',
                    confirmLabel: 'End connection',
                    destructive: true,
                    onConfirm: () =>
                      run(async () => {
                        await connectionsService.endAsCharity(connection.id);
                        navigation.goBack();
                      }, 'Connection ended'),
                  })
                }
              >
                <AppText variant="bodyBold" color={palette.danger}>End connection</AppText>
              </Pressable>
            ) : null}
          </>
        )}
      </View>

      <DiscoverListingDetailModal
        visible={listingModalOpen}
        listing={listingPreview}
        reserved
        onClose={() => setListingModalOpen(false)}
        claimLabel="Confirm Collection"
        onClaim={() => {
          setListingModalOpen(false);
          navigation.navigate('Tabs', { screen: 'Available' });
        }}
        onCannotCollect={
          canDeclineToday
            ? () => {
                setListingModalOpen(false);
                showConfirmAlert({
                  title: "Can't collect today?",
                  message: 'This listing will be offered to nearby charities immediately.',
                  confirmLabel: 'Release to network',
                  onConfirm: () =>
                    run(
                      () => connectionsService.cannotCollect(today.id!),
                      'Released to nearby charities.',
                    ),
                });
              }
            : undefined
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, paddingBottom: hp(4) },
  body: { paddingHorizontal: wp(5), paddingTop: hp(2), gap: hp(1.3) },
  todayBox: {
    backgroundColor: '#EEF0E6',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: palette.kale,
  },
  itemList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemIcon: {
    width: normalize(22),
    height: normalize(22),
  },
  itemText: {
    flex: 1,
  },
  cutoffText: {
    lineHeight: 18,
  },
  primary: {
    backgroundColor: palette.kale,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondary: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryInBox: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  danger: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
