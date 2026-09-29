import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  CONNECTION_CHARITY_CONFIRM_MINUTES,
  CONNECTION_PROMPT_LEAD_MINUTES,
  ISO_WEEKDAYS,
  canListPreferredSurplus,
  connectionPartyName,
  isConnectionListByDue,
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
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const surplusRef = useRef<View>(null);
  const quantityRef = useRef<View>(null);
  const notesRef = useRef<View>(null);
  const scrollY = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const connectionId = Number(route?.params?.connectionId);
  const { submitting, withLock } = useSubmitLock();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number[]>([]);
  const [windowStart, setWindowStart] = useState(() => parseHhMm('16:00', 16, 0));
  const [windowEnd, setWindowEnd] = useState(() => parseHhMm('17:00', 17, 0));
  const [typicalSurplus, setTypicalSurplus] = useState('');
  const [typicalQuantity, setTypicalQuantity] = useState('');
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
    typicalQuantity: '',
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
    const nextQuantity = row.typicalQuantity || '';
    const nextNotes = row.notes || '';
    setConnection(row);
    setDays(nextDays);
    setWindowStart(window.start);
    setWindowEnd(window.end);
    setTypicalSurplus(nextSurplus);
    setTypicalQuantity(nextQuantity);
    setNotes(nextNotes);
    setSavedSchedule({
      days: nextDays,
      windowStart: formatHhMm(window.start),
      windowEnd: formatHhMm(window.end),
      typicalSurplus: nextSurplus,
      typicalQuantity: nextQuantity,
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

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => setKeyboardHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const scrollFieldIntoView = (target: React.RefObject<View | null>) => {
    setTimeout(() => {
      target.current?.measureInWindow((_x, y, _w, height) => {
        const visibleBottom =
          Dimensions.get('window').height - Math.max(keyboardHeight, 280) - 24;
        const overflow = y + height - visibleBottom;
        if (overflow <= 8) return;
        scrollRef.current?.scrollTo({
          y: Math.max(0, scrollY.current + overflow),
          animated: true,
        });
      });
    }, 80);
  };

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

  const confirmNoSurplus = () => {
    if (!connection?.today?.id) return;
    showConfirmAlert({
      title: 'No surplus today?',
      message: `Today’s collection will be cancelled and ${charity} will be notified. Your regular Connection will continue as usual.`,
      confirmLabel: 'Confirm no surplus today',
      cancelLabel: 'Go back',
      onConfirm: () =>
        run(
          () => connectionsService.declareNoSurplus(Number(connection.today?.id)),
          `${charity} has been told there is no collection today.`,
        ),
    });
  };

  const confirmPause = () => {
    if (!connection) return;
    showConfirmAlert({
      title: 'Pause this connection?',
      message: `While paused, ${charity} won’t receive regular collection offers from you. ${charity} will be notified and you can resume the Connection at any time.`,
      confirmLabel: 'Pause Connection',
      cancelLabel: 'Keep active',
      onConfirm: () => run(() => connectionsService.pause(connection.id), 'Connection paused'),
    });
  };

  const confirmEnd = () => {
    if (!connection) return;
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
    });
  };

  const hasScheduleChanges =
    days.join(',') !== savedSchedule.days.join(',') ||
    formatHhMm(windowStart) !== savedSchedule.windowStart ||
    formatHhMm(windowEnd) !== savedSchedule.windowEnd ||
    typicalSurplus.trim() !== savedSchedule.typicalSurplus.trim() ||
    typicalQuantity.trim() !== savedSchedule.typicalQuantity.trim() ||
    notes.trim() !== savedSchedule.notes.trim();

  const canListToday = canListPreferredSurplus({
    dayId: connection?.today?.id,
    outcome: connection?.today?.outcome,
    windowStartAt: connection?.today?.windowStartAt,
    windowEndAt: connection?.today?.windowEndAt,
  });
  const canReleaseToday = Boolean(isReservedPublished(connection?.today) && connection?.today?.id);

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
          leadTimeMinutes: CONNECTION_PROMPT_LEAD_MINUTES,
          cutoffMinutes: CONNECTION_CHARITY_CONFIRM_MINUTES,
          typicalSurplus: typicalSurplus.trim(),
          typicalQuantity: typicalQuantity.trim(),
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
    <Screen
      scrollable
      keyboardAware
      backgroundColor={palette.creme}
      contentStyle={[
        styles.screen,
        { paddingBottom: insets.bottom + hp(4) + keyboardHeight },
      ]}
      transparentTop
      scrollRef={scrollRef}
      onScroll={(event) => {
        scrollY.current = event.nativeEvent.contentOffset.y;
      }}
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

                <View ref={surplusRef} collapsable={false}>
                  <AppText variant="label">Typical surplus - guide only</AppText>
                  <TextInput
                    value={typicalSurplus}
                    onChangeText={setTypicalSurplus}
                    placeholder="e.g. Prepared meals, sandwiches and baked goods"
                    placeholderTextColor={palette.stone}
                    style={styles.input}
                    maxLength={200}
                    onFocus={() => scrollFieldIntoView(surplusRef)}
                  />
                </View>

                <View ref={quantityRef} collapsable={false}>
                  <AppText variant="label">Typical quantity - guide only</AppText>
                  <TextInput
                    value={typicalQuantity}
                    onChangeText={setTypicalQuantity}
                    placeholder="e.g. Approximately 8 kg (20 meals)"
                    placeholderTextColor={palette.stone}
                    style={styles.input}
                    maxLength={200}
                    onFocus={() => scrollFieldIntoView(quantityRef)}
                  />
                </View>

                <View ref={notesRef} collapsable={false}>
                  <AppText variant="label">Notes</AppText>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Loading dock at the back"
                    placeholderTextColor={palette.stone}
                    style={[styles.input, styles.notes]}
                    maxLength={500}
                    multiline
                    onFocus={() => scrollFieldIntoView(notesRef)}
                  />
                </View>

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

            {canListToday ? (
              <View style={styles.listBox}>
                <AppText variant="bodySmall" color={palette.stone}>
                  {isConnectionListByDue(connection.today?.windowStartAt) ||
                  connection.today?.outcome === 'NO_RESPONSE'
                    ? `The add-by time has passed, but you can still list or confirm no surplus until pickup ends. Only ${charity} will see listed food.`
                    : `Same as List for them on Surplus. Publish today’s food so only ${charity} can see it.`}
                </AppText>
              </View>
            ) : connection.today?.outcome === 'NO_SURPLUS' ? (
              <View style={styles.listBox}>
                <AppText variant="bodySmall" color={palette.stone}>
                  No surplus today. {charity} has been told. This Connection stays active for the next scheduled day.
                </AppText>
              </View>
            ) : connection.today?.outcome === 'NO_RESPONSE' ? (
              <View style={styles.listBox}>
                <AppText variant="bodySmall" color={palette.stone}>
                  Today’s surplus was not confirmed in time. {charity} has been told no collection is required. This Connection stays active for the next scheduled day.
                </AppText>
              </View>
            ) : null}

            <View style={styles.actions}>
              {canListToday ? (
                <View style={styles.actionGrid}>
                  <Pressable
                    style={[styles.primary, styles.actionCell, submitting && { opacity: 0.6 }]}
                    disabled={submitting}
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
                    <AppText variant="bodyBold" color={palette.white} style={styles.actionLabel}>
                      List for them
                    </AppText>
                  </Pressable>
                  <Pressable
                    style={[styles.secondary, styles.actionCell, submitting && { opacity: 0.6 }]}
                    disabled={submitting}
                    onPress={confirmNoSurplus}
                  >
                    <AppText variant="bodyBold" color={palette.primary} style={styles.actionLabel}>
                      No surplus today
                    </AppText>
                  </Pressable>
                </View>
              ) : null}

              {canReleaseToday ? (
                <Pressable
                  style={[styles.primary, styles.actionFull, submitting && { opacity: 0.6 }]}
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
                  <AppText variant="bodyBold" color={palette.white}>
                    Release
                  </AppText>
                </Pressable>
              ) : null}

              {connection.status === 'PAUSED' ? (
                <Pressable
                  style={[styles.primary, styles.actionFull, submitting && { opacity: 0.6 }]}
                  disabled={submitting}
                  onPress={() => run(() => connectionsService.resume(connection.id), 'Connection resumed')}
                >
                  <AppText variant="bodyBold" color={palette.white}>Resume connection</AppText>
                </Pressable>
              ) : null}

              {connection.status === 'ACTIVE' || canEdit ? (
                <View style={styles.actionGrid}>
                  {connection.status === 'ACTIVE' ? (
                    <Pressable
                      style={[styles.secondary, styles.actionCell, submitting && { opacity: 0.6 }]}
                      disabled={submitting}
                      onPress={confirmPause}
                    >
                      <AppText variant="bodyBold" color={palette.primary} style={styles.actionLabel}>
                        Pause connection
                      </AppText>
                    </Pressable>
                  ) : null}
                  {canEdit ? (
                    <Pressable
                      style={[styles.danger, styles.actionCell, submitting && { opacity: 0.6 }]}
                      disabled={submitting}
                      onPress={confirmEnd}
                    >
                      <AppText variant="bodyBold" color={palette.danger} style={styles.actionLabel}>
                        End connection
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
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
  listBox: { gap: 8 },
  actions: { gap: 10 },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCell: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: '47%',
  },
  actionLabel: {
    textAlign: 'center',
  },
  actionFull: {
    width: '100%',
  },
  primary: {
    backgroundColor: palette.kale,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  secondary: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: palette.primary,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  danger: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: palette.danger,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
});
