import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { connectionsService, type Connection } from '@/services/connections.service';
import { showConfirmAlert } from '@/store/appAlertStore';
import { palette } from '@/theme/colors';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import { connectionPartyName, formatWindowLabel, statusLabel } from '@/utils/connections';
import { hp, useResponsiveLayout, wp } from '@/utils/responsive';
import { buildDashboardShellStyles } from '@/utils/dashboardAdaptive';

export function CharityConnectionDetailScreen({ route }: any) {
  useTransparentStatusBar('light');
  const navigation = useNavigation<any>();
  const r = useResponsiveLayout();
  const adaptive = useMemo(() => buildDashboardShellStyles(r, { stackHero: true }), [r]);
  const connectionId = Number(route?.params?.connectionId);
  const { submitting, withLock } = useSubmitLock();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);

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
            {connection.typicalSurplus ? (
              <AppText variant="bodySmall" color={palette.stone}>
                Typical surplus: {connection.typicalSurplus}
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

            {today?.outcome === 'PUBLISHED' ? (
              <View style={styles.todayBox}>
                <AppText variant="label">Today’s collection</AppText>
                <AppText variant="bodySmall">
                  {formatWindowLabel(today.windowStartAt, today.windowEndAt) || connection.schedule}
                </AppText>
                <Pressable
                  style={styles.primary}
                  onPress={() => navigation.navigate('Tabs', { screen: 'Available' })}
                >
                  <AppText variant="bodyBold" color={palette.white}>Confirm — claim as usual</AppText>
                </Pressable>
                {canDeclineToday ? (
                  <Pressable
                    style={styles.secondary}
                    disabled={submitting}
                    onPress={() =>
                      showConfirmAlert({
                        title: 'Can’t collect today?',
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
                    <AppText variant="bodyBold" color={palette.primary}>Can’t collect</AppText>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {connection.status === 'ACTIVE' ? (
              <Pressable
                style={styles.secondary}
                disabled={submitting}
                onPress={() =>
                  showConfirmAlert({
                    title: 'Pause this connection?',
                    message: 'You will not be offered first until it is resumed.',
                    confirmLabel: 'Pause',
                    onConfirm: () => run(() => connectionsService.pauseAsCharity(connection.id), 'Connection paused'),
                  })
                }
              >
                <AppText variant="bodyBold" color={palette.primary}>Pause</AppText>
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
  danger: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
