import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { AppDateTimePicker } from '@/components/AppDateTimePicker';
import { AppText } from '@/components/AppText';
import { HeroHeader } from '@/components/HeroHeader';
import { OfferToConnectionModal } from '@/components/OfferToConnectionModal';
import { ReleaseDestinationModal } from '@/components/ReleaseDestinationModal';
import { ReleaseToNetworkModal, type ReleaseWindowChoice } from '@/components/ReleaseToNetworkModal';
import { useListingsStore } from '@/store/listingsStore';
import { Screen } from '@/components/Screen';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { connectionsService, type Connection, type ConnectionToday } from '@/services/connections.service';
import { showConfirmAlert } from '@/store/appAlertStore';
import { palette } from '@/theme/colors';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import {
  ISO_WEEKDAYS,
  canListPreferredSurplus,
  connectionPartyName,
  isReservedPublished,
  otherOpenConnections,
  formatHhMm,
  parseHhMm,
  parseWindowFromSchedule,
  statusLabel,
} from '@/utils/connections';
import { hp, normalize, useResponsiveLayout, wp } from '@/utils/responsive';
import { buildDashboardShellStyles } from '@/utils/dashboardAdaptive';

export function ConnectionDetailScreen({ route }: any) {
  useTransparentStatusBar('light');
  const navigation = useNavigation<any>();
  const r = useResponsiveLayout();
  const adaptive = useMemo(() => buildDashboardShellStyles(r, { stackHero: true }), [r]);
  const heroHeight = r.isTablet ? adaptive.heroHeight : 96;
  const connectionId = Number(route?.params?.connectionId);
  const { submitting, withLock } = useSubmitLock();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number[]>([]);
  const [windowStart, setWindowStart] = useState(() => parseHhMm('16:00', 16, 0));
  const [windowEnd, setWindowEnd] = useState(() => parseHhMm('17:00', 17, 0));
  const [typicalSurplus, setTypicalSurplus] = useState('');
  const [notes, setNotes] = useState('');
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerValue, setPickerValue] = useState(() => parseHhMm('16:00', 16, 0));
  const [todayRows, setTodayRows] = useState<ConnectionToday[]>([]);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releaseChooserOpen, setReleaseChooserOpen] = useState(false);
  const [offerTarget, setOfferTarget] = useState<{
    charityName?: string;
    connectionId: number;
    windowStartAt?: string | null;
    windowEndAt?: string | null;
  } | null>(null);
  const [savedSchedule, setSavedSchedule] = useState({
    days: [] as number[],
    windowStart: '',
    windowEnd: '',
    typicalSurplus: '',
    notes: '',
  });

  const resolveWindow = (row: Connection) => {
    if (row.windowStart && row.windowEnd) {
      return {
        start: parseHhMm(row.windowStart, 16, 0),
        end: parseHhMm(row.windowEnd, 17, 0),
      };
    }
    const fromTodayStart = row.today?.windowStartAt ? new Date(row.today.windowStartAt) : null;
    const fromTodayEnd = row.today?.windowEndAt ? new Date(row.today.windowEndAt) : null;
    if (fromTodayStart && !Number.isNaN(fromTodayStart.getTime())) {
      return {
        start: fromTodayStart,
        end: fromTodayEnd && !Number.isNaN(fromTodayEnd.getTime()) ? fromTodayEnd : fromTodayStart,
      };
    }
    return parseWindowFromSchedule(row.schedule);
  };

  const applyConnection = (row: Connection) => {
    const nextDays = Array.isArray(row.daysOfWeek) ? [...row.daysOfWeek].sort((a, b) => a - b) : [];
    const window = resolveWindow(row);
    const nextSurplus = row.typicalSurplus || '';
    const nextNotes = row.notes || '';
    setConnection(row);
    setDays(nextDays);
    setWindowStart(window.start);
    setWindowEnd(window.end);
    setTypicalSurplus(nextSurplus);
    setNotes(nextNotes);
    setSavedSchedule({
      days: nextDays,
      windowStart: formatHhMm(window.start),
      windowEnd: formatHhMm(window.end),
      typicalSurplus: nextSurplus,
      notes: nextNotes,
    });
  };

  const load = useCallback(async () => {
    if (!Number.isFinite(connectionId)) return;
    try {
      const row = await connectionsService.getOne(connectionId);
      applyConnection(row);
      const siteId = Number(row.donorSite?.id);
      if (Number.isFinite(siteId) && siteId > 0) {
        setTodayRows(await connectionsService.listTodayForSite(siteId).catch(() => []));
      } else {
        setTodayRows([]);
      }
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

  useEffect(() => {
    setPickerVisible(false);
    setPickerTarget(null);
  }, [connectionId]);

  const formatClock = (date: Date | null) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const openTimePicker = (target: 'start' | 'end') => {
    setPickerTarget(target);
    setPickerValue(target === 'start' ? windowStart : windowEnd);
    setPickerVisible(true);
  };

  const applyPickedTime = (value: Date) => {
    if (pickerTarget === 'start') setWindowStart(value);
    if (pickerTarget === 'end') setWindowEnd(value);
  };

  const onNativePickerChange = (event: any, selectedDate?: Date) => {
    if (!pickerTarget) return;

    if (Platform.OS === 'ios') {
      if (selectedDate) setPickerValue(selectedDate);
      return;
    }

    setPickerVisible(false);
    if (event.type === 'dismissed' || !selectedDate) {
      setPickerTarget(null);
      return;
    }
    applyPickedTime(selectedDate);
    setPickerTarget(null);
  };

  const confirmIOSPicker = () => {
    applyPickedTime(pickerValue);
    setPickerVisible(false);
    setPickerTarget(null);
  };

  const closeIOSPicker = () => {
    setPickerVisible(false);
    setPickerTarget(null);
  };

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

  const confirmRelease = (window: ReleaseWindowChoice) => {
    const dayId = connection?.today?.id;
    if (!dayId) return;
    void withLock(async () => {
      try {
        await connectionsService.releaseToNetwork(dayId, {
          listingId: connection.today?.listingId,
          pickupFromTime: window?.pickupFromTime,
          pickupByTime: window?.pickupByTime,
          bestBefore: window?.bestBefore,
        });
        setReleaseOpen(false);
        useListingsStore.getState().invalidateSite();
        showSuccessAlert('Released to nearby charities');
        await load();
      } catch (error) {
        showErrorAlert(error, 'Could not release listing');
      }
    });
  };

  const charity = connectionPartyName(
    connection?.receiverSite,
    connection?.receiverOrg?.name || 'Charity',
  );
  const heroSubtitle = connection
    ? [statusLabel(connection.status), connection.schedule].filter(Boolean).join(' · ')
    : 'Preferred collection';

  const canEdit =
    connection?.status === 'ACTIVE' ||
    connection?.status === 'PAUSED' ||
    connection?.status === 'PENDING';

  const hasScheduleChanges =
    days.join(',') !== savedSchedule.days.join(',') ||
    formatHhMm(windowStart) !== savedSchedule.windowStart ||
    formatHhMm(windowEnd) !== savedSchedule.windowEnd ||
    typicalSurplus.trim() !== savedSchedule.typicalSurplus.trim() ||
    notes.trim() !== savedSchedule.notes.trim();

  const toggleDay = (id: number) => {
    setDays((current) =>
      current.includes(id) ? current.filter((day) => day !== id) : [...current, id].sort((a, b) => a - b),
    );
  };

  const saveSchedule = () => {
    if (!connection) return;
    if (!days.length) {
      showErrorAlert('Choose at least one collection day.');
      return;
    }
    void withLock(async () => {
      try {
        const updated = await connectionsService.update(connection.id, {
          daysOfWeek: days,
          windowStart: formatHhMm(windowStart),
          windowEnd: formatHhMm(windowEnd),
          typicalSurplus: typicalSurplus.trim(),
          notes: notes.trim(),
        });
        applyConnection(updated);
        showSuccessAlert('Schedule saved');
      } catch (error) {
        showErrorAlert(error, 'Could not update connection');
      }
    });
  };

  return (
    <Screen scrollable backgroundColor={palette.creme} contentStyle={styles.screen} transparentTop>
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
                {charity}
              </AppText>
              <AppText variant="caption" style={styles.heroSubtitle} numberOfLines={1}>
                {heroSubtitle}
              </AppText>
            </View>
          </View>
        </View>
      </HeroHeader>
      <View style={styles.body}>
        {loading || !connection ? (
          <ActivityIndicator color={palette.kale} />
        ) : (
          <>
            {connection.stats ? (
              <View style={styles.stats}>
                <Stat label="Collections" value={String(connection.stats.collectionsCompleted)} />
                <Stat label="Kg redirected" value={String(connection.stats.kgRedirected)} />
                <Stat
                  label="Reliability"
                  value={`${connection.stats.reliabilityPercent ?? 0}%`}
                />
              </View>
            ) : null}

            {canEdit ? (
              <>
                <AppText variant="label">Collection days</AppText>
                <View style={styles.days}>
                  {ISO_WEEKDAYS.map((day) => {
                    const on = days.includes(day.id);
                    return (
                      <Pressable
                        key={day.id}
                        onPress={() => toggleDay(day.id)}
                        style={[styles.day, on && styles.dayOn]}
                      >
                        <AppText variant="caption" color={on ? palette.white : palette.primary}>
                          {day.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>

                <AppText variant="label">Pickup window</AppText>
                <View style={styles.timeRow}>
                  <Pressable style={styles.timeBtn} onPress={() => openTimePicker('start')}>
                    <AppText variant="caption" color={palette.stone}>FROM</AppText>
                    <AppText variant="bodyBold">{formatClock(windowStart)}</AppText>
                  </Pressable>
                  <Pressable style={styles.timeBtn} onPress={() => openTimePicker('end')}>
                    <AppText variant="caption" color={palette.stone}>TO</AppText>
                    <AppText variant="bodyBold">{formatClock(windowEnd)}</AppText>
                  </Pressable>
                </View>

                <AppText variant="label">Typical surplus</AppText>
                <TextInput
                  value={typicalSurplus}
                  onChangeText={setTypicalSurplus}
                  placeholder="Prepared meals & bakery"
                  placeholderTextColor={palette.stone}
                  style={styles.input}
                  maxLength={200}
                />

                <AppText variant="label">Notes</AppText>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Loading dock at the back"
                  placeholderTextColor={palette.stone}
                  style={[styles.input, styles.notes]}
                  maxLength={500}
                  multiline
                />

                {hasScheduleChanges ? (
                  <Pressable
                    style={[styles.primary, submitting && { opacity: 0.6 }]}
                    disabled={submitting}
                    onPress={saveSchedule}
                  >
                    <AppText variant="bodyBold" color={palette.white}>
                      Save schedule
                    </AppText>
                  </Pressable>
                ) : null}
              </>
            ) : null}

            {canListPreferredSurplus({
              dayId: connection.today?.id,
              outcome: connection.today?.outcome,
              windowEndAt: connection.today?.windowEndAt,
            }) ? (
              <View style={styles.listBox}>
                <AppText variant="bodySmall" color={palette.stone}>
                  Same as List for them on Surplus. Publish today’s food so only {charity} can see it.
                </AppText>
                <Pressable
                  style={styles.primary}
                  onPress={() =>
                    navigation.navigate('AddDailySurplus', {
                      dayId: connection.today?.id,
                      connectionId: connection.id,
                      charityName: charity,
                      schedule: connection.schedule,
                      windowStartAt: connection.today?.windowStartAt,
                      windowEndAt: connection.today?.windowEndAt,
                    })
                  }
                >
                  <AppText variant="bodyBold" color={palette.white}>
                    List for them
                  </AppText>
                </Pressable>
              </View>
            ) : null}

            {isReservedPublished(connection.today) && connection.today?.id ? (
              <Pressable
                style={styles.secondary}
                disabled={submitting}
                onPress={() => {
                  const others = otherOpenConnections(todayRows, connection.id);
                  if (others.length) {
                    setReleaseChooserOpen(true);
                    return;
                  }
                  setReleaseOpen(true);
                }}
              >
                <AppText variant="bodyBold" color={palette.primary}>
                  Release
                </AppText>
              </Pressable>
            ) : null}

            {connection.status === 'ACTIVE' ? (
              <Pressable
                style={styles.secondary}
                disabled={submitting}
                onPress={() =>
                  showConfirmAlert({
                    title: 'Pause this connection?',
                    message: 'Scheduled prompts stop until you resume. History is kept.',
                    confirmLabel: 'Pause',
                    onConfirm: () => run(() => connectionsService.pause(connection.id), 'Connection paused'),
                  })
                }
              >
                <AppText variant="bodyBold" color={palette.primary}>Pause</AppText>
              </Pressable>
            ) : null}

            {connection.status === 'PAUSED' ? (
              <Pressable
                style={styles.primary}
                disabled={submitting}
                onPress={() => run(() => connectionsService.resume(connection.id), 'Connection resumed')}
              >
                <AppText variant="bodyBold" color={palette.white}>Resume</AppText>
              </Pressable>
            ) : null}

            {canEdit ? (
              <Pressable
                style={styles.danger}
                disabled={submitting}
                onPress={() =>
                  showConfirmAlert({
                    title: 'End this connection?',
                    message: 'This site will offer surplus to nearby charities again. Published listings stay as they are.',
                    confirmLabel: 'End connection',
                    destructive: true,
                    onConfirm: () =>
                      run(async () => {
                        await connectionsService.end(connection.id);
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

      {Platform.OS === 'ios' ? (
        <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={closeIOSPicker}>
          <View style={styles.iosPickerOverlay}>
            <View style={styles.iosPickerCard}>
              <View style={styles.iosPickerActions}>
                <Pressable onPress={closeIOSPicker}>
                  <AppText variant="bodyBold" color={palette.stone}>Cancel</AppText>
                </Pressable>
                <Pressable onPress={confirmIOSPicker}>
                  <AppText variant="bodyBold" color={palette.kale}>Done</AppText>
                </Pressable>
              </View>
              <AppDateTimePicker
                value={pickerValue}
                mode="time"
                display="spinner"
                onChange={onNativePickerChange}
              />
            </View>
          </View>
        </Modal>
      ) : null}

      {Platform.OS === 'android' && pickerVisible ? (
        <AppDateTimePicker
          value={pickerValue}
          mode="time"
          display="default"
          onChange={onNativePickerChange}
        />
      ) : null}

      <ReleaseDestinationModal
        visible={releaseChooserOpen}
        currentCharity={charity}
        others={otherOpenConnections(todayRows, connection?.id)}
        onClose={() => setReleaseChooserOpen(false)}
        onOpenNetwork={() => {
          setReleaseChooserOpen(false);
          setReleaseOpen(true);
        }}
        onOfferTo={(other) => {
          setReleaseChooserOpen(false);
          setOfferTarget(other);
        }}
      />

      <OfferToConnectionModal
        visible={Boolean(offerTarget)}
        fromCharity={charity}
        toCharity={offerTarget?.charityName}
        windowStartAt={offerTarget?.windowStartAt}
        windowEndAt={offerTarget?.windowEndAt}
        submitting={submitting}
        onClose={() => setOfferTarget(null)}
        onConfirm={() => {
          if (!offerTarget || !connection?.today?.id) return;
          run(async () => {
            await connectionsService.reassignToConnection(connection.today!.id, offerTarget.connectionId);
            setOfferTarget(null);
            useListingsStore.getState().invalidateSite();
          }, `Reserved for ${offerTarget.charityName || 'that charity'}`);
        }}
      />

      <ReleaseToNetworkModal
        target={
          releaseOpen && connection?.today?.id
            ? {
                dayId: connection.today.id,
                listingId: connection.today.listingId,
                charityName: charity,
                windowStartAt: connection.today.windowStartAt,
                windowEndAt: connection.today.windowEndAt,
              }
            : null
        }
        submitting={submitting}
        onClose={() => setReleaseOpen(false)}
        onConfirm={confirmRelease}
      />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="h6">{value}</AppText>
      <AppText variant="caption" color={palette.stone}>{label}</AppText>
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
  body: { paddingHorizontal: wp(5), paddingTop: hp(0.6), gap: hp(1.3) },
  stats: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: palette.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D9DED2',
  },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  day: {
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dayOn: { backgroundColor: palette.primary },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeBtn: {
    flex: 1,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: '#D9DED2',
    borderRadius: 12,
    padding: 12,
  },
  iosPickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  iosPickerCard: {
    backgroundColor: palette.white,
    borderTopLeftRadius: normalize(14),
    borderTopRightRadius: normalize(14),
    paddingBottom: hp(1),
  },
  iosPickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.2),
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  input: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: '#D9DED2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: palette.black,
  },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  listBox: { gap: 10 },
  primary: {
    backgroundColor: palette.kale,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  danger: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
