import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppDateTimePicker } from '@/components/AppDateTimePicker';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { WhiteSelect } from '@/components/WhiteSelect';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { connectionsService, type Connection, type NearbyCharity } from '@/services/connections.service';
import { useAppContext } from '@/store/AppContext';
import { useSitesStore } from '@/store/sitesStore';
import { palette } from '@/theme/colors';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import {
  COMMON_TIMEZONES,
  CONNECTION_CHARITY_CONFIRM_MINUTES,
  CONNECTION_PROMPT_LEAD_MINUTES,
  ISO_WEEKDAYS,
  deviceTimezone,
  findOverlappingConnections,
  formatHhMm,
  formatScheduleSummary,
  isConnectionOverlapError,
  resolveConnectionWindow,
  statusLabel,
} from '@/utils/connections';
import { getSitePickupCoords } from '@/utils/listingLocation';
import { resolveListingSiteId } from '@/utils/listingSite';
import { hp, normalize, useResponsiveLayout, wp } from '@/utils/responsive';
import { buildDashboardShellStyles } from '@/utils/dashboardAdaptive';

function sameCharityLabel(orgName?: string | null, siteName?: string | null): boolean {
  const org = String(orgName || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const site = String(siteName || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return Boolean(org && site && org === site);
}

export function CreateConnectionScreen({ route }: any) {
  useTransparentStatusBar('light');
  const navigation = useNavigation<any>();
  const r = useResponsiveLayout();
  const adaptive = useMemo(() => buildDashboardShellStyles(r, { stackHero: true }), [r]);
  const { authUser } = useAppContext();
  const organisation = useSitesStore((s) => s.organisation);
  const { submitting, withLock } = useSubmitLock();

  const [siteId, setSiteId] = useState<number | null>(
    Number.isFinite(Number(route?.params?.siteId)) ? Number(route.params.siteId) : null,
  );
  const [charities, setCharities] = useState<NearbyCharity[]>([]);
  const [liveConnections, setLiveConnections] = useState<Connection[]>([]);
  const [loadingCharities, setLoadingCharities] = useState(true);
  const [selected, setSelected] = useState<NearbyCharity | null>(null);
  const [days, setDays] = useState<number[]>([]);
  const [windowStart, setWindowStart] = useState<Date | null>(null);
  const [windowEnd, setWindowEnd] = useState<Date | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerValue, setPickerValue] = useState(new Date());
  const [typicalSurplus, setTypicalSurplus] = useState('');
  const [typicalQuantity, setTypicalQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [timezone, setTimezone] = useState(deviceTimezone());
  const [openSelect, setOpenSelect] = useState<'charity' | 'timezone' | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const timezoneRef = useRef<View>(null);
  const surplusRef = useRef<View>(null);
  const quantityRef = useRef<View>(null);
  const notesRef = useRef<View>(null);
  const scrollY = useRef(0);
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const footerBottomPad =
    (insets.bottom > 8
      ? insets.bottom
      : Platform.OS === 'android'
        ? 48
        : 12) + hp(1.5);

  const region =
    organisation?.region ||
    authUser?.profile?.organisation?.region ||
    authUser?.profile?.sites?.[0]?.region ||
    'AU';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resolved = siteId ?? (await resolveListingSiteId(authUser));
        if (!resolved) {
          showErrorAlert('Choose a site before inviting a charity.');
          return;
        }
        if (!cancelled) setSiteId(resolved);
        const coords = getSitePickupCoords(authUser);
        if (!coords) {
          showErrorAlert('This site needs a map location before we can find nearby charities.');
          return;
        }
        const [rows, existing] = await Promise.all([
          connectionsService.nearbyCharities({
            lat: coords.lat,
            lng: coords.lng,
            radiusKm: 25,
            region: String(region).toUpperCase(),
          }),
          connectionsService.listForSite(resolved).catch(() => []),
        ]);
        if (!cancelled) {
          const live = existing.filter((connection) =>
            ['PENDING', 'ACTIVE', 'PAUSED'].includes(String(connection.status || '').toUpperCase()),
          );
          setLiveConnections(live);
          setCharities(rows.filter((row) => Number(row.siteId) > 0));
        }
      } catch (error) {
        showErrorAlert(error, 'Could not load nearby charities');
      } finally {
        if (!cancelled) setLoadingCharities(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser, region, siteId]);

  const toggleDay = (id: number) => {
    setDays((current) =>
      current.includes(id) ? current.filter((day) => day !== id) : [...current, id].sort((a, b) => a - b),
    );
  };

  const formatClock = (date: Date | null) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const openTimePicker = (target: 'start' | 'end') => {
    const current = target === 'start' ? windowStart : windowEnd;
    setPickerTarget(target);
    setPickerValue(current || new Date());
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

  const submit = () =>
    withLock(async () => {
      if (!siteId) {
        showErrorAlert('Choose a site first.');
        return;
      }
      if (!selected?.siteId) {
        showErrorAlert('Choose a charity site to invite.');
        return;
      }
      if (!days.length) {
        showErrorAlert('Choose at least one collection day.');
        return;
      }
      if (!windowStart || !windowEnd) {
        showErrorAlert('Choose a pickup window.');
        return;
      }
      if (formatHhMm(windowStart) === formatHhMm(windowEnd)) {
        return;
      }
      if (
        findOverlappingConnections(liveConnections, {
          receiverSiteId: Number(selected.siteId),
          daysOfWeek: days,
          windowStart: formatHhMm(windowStart),
          windowEnd: formatHhMm(windowEnd),
        }).length
      ) {
        return;
      }
      try {
        try {
          await connectionsService.setSiteTimezone(siteId, timezone);
        } catch {
          // Already set, or this login cannot change it — invite will say if it is missing.
        }
        const created = await connectionsService.invite({
          donorSiteId: siteId,
          receiverSiteId: Number(selected.siteId),
          daysOfWeek: days,
          windowStart: formatHhMm(windowStart),
          windowEnd: formatHhMm(windowEnd),
          leadTimeMinutes: CONNECTION_PROMPT_LEAD_MINUTES,
          cutoffMinutes: CONNECTION_CHARITY_CONFIRM_MINUTES,
          typicalSurplus: typicalSurplus.trim() || undefined,
          typicalQuantity: typicalQuantity.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        const extra = created.warning ? `\n\n${created.warning}` : '';
        showSuccessAlert(`Invitation sent.${extra}`, 'Connection');
        navigation.goBack();
      } catch (error) {
        if (isConnectionOverlapError(error)) {
          return;
        }
        showErrorAlert(error, 'Could not send invitation');
      }
    });

  const connectedSiteIds = useMemo(
    () =>
      new Set(
        liveConnections
          .map((connection) => Number(connection.receiverSite?.id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    [liveConnections],
  );

  const existingForCharity = useMemo(() => {
    if (!selected?.siteId) return [];
    return liveConnections.filter(
      (connection) => Number(connection.receiverSite?.id) === Number(selected.siteId),
    );
  }, [liveConnections, selected]);

  const overlappingNow = useMemo(() => {
    if (!selected?.siteId || !days.length || !windowStart || !windowEnd) return [];
    return findOverlappingConnections(liveConnections, {
      receiverSiteId: Number(selected.siteId),
      daysOfWeek: days,
      windowStart: formatHhMm(windowStart),
      windowEnd: formatHhMm(windowEnd),
    });
  }, [days, liveConnections, selected, windowEnd, windowStart]);

  const canSendInvitation = Boolean(
    siteId &&
      selected?.siteId &&
      days.length &&
      windowStart &&
      windowEnd &&
      formatHhMm(windowStart) !== formatHhMm(windowEnd) &&
      !overlappingNow.length &&
      !submitting,
  );

  const charityOptions = useMemo(
    () =>
      charities.map((charity) => {
        const alreadyConnected = connectedSiteIds.has(Number(charity.siteId));
        const sameName = sameCharityLabel(charity.orgName, charity.siteName);
        const extraPlace = sameName
          ? charity.address && !sameCharityLabel(charity.orgName, charity.address)
            ? charity.address
            : null
          : charity.siteName || charity.address || null;
        return {
          value: Number(charity.siteId),
          label: charity.orgName,
          badge: alreadyConnected ? 'Connected' : undefined,
          subtitle: [
            extraPlace,
            charity.distanceKm != null ? `${charity.distanceKm.toFixed(1)} km` : null,
          ]
            .filter(Boolean)
            .join(' · '),
        };
      }),
    [charities, connectedSiteIds],
  );

  const zoneOptions = useMemo(() => {
    const unique = new Set<string>([timezone, ...COMMON_TIMEZONES]);
    return [...unique].map((zone) => ({ value: zone, label: zone.replace(/_/g, ' ') }));
  }, [timezone]);

  const revealTimezoneMenu = () => {
    timezoneRef.current?.measureInWindow((_x, y, _w, height) => {
      const visibleBottom = Dimensions.get('window').height - insets.bottom - 16;
      const overflow = y + height - visibleBottom;
      if (overflow <= 8) return;
      scrollRef.current?.scrollTo({
        y: Math.max(0, scrollY.current + overflow),
        animated: true,
      });
    });
  };

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
        const footerReserve = 66 + footerBottomPad;
        const visibleBottom =
          Dimensions.get('window').height -
          Math.max(keyboardHeight, 280) -
          footerReserve -
          24;
        const overflow = y + height - visibleBottom;
        if (overflow <= 8) return;
        scrollRef.current?.scrollTo({
          y: Math.max(0, scrollY.current + overflow),
          animated: true,
        });
      });
    }, 80);
  };

  useEffect(() => {
    if (openSelect !== 'timezone') return;
    const timer = setTimeout(revealTimezoneMenu, 60);
    return () => clearTimeout(timer);
  }, [openSelect, insets.bottom]);

  return (
    <View style={styles.page}>
    <Screen
      scrollable
      keyboardAware
      backgroundColor={palette.creme}
      contentStyle={[
        styles.screen,
        {
          paddingBottom:
            hp(2) +
            66 +
            footerBottomPad +
            (Platform.OS === 'android' ? keyboardHeight : 0),
        },
      ]}
      transparentTop
      scrollRef={scrollRef}
      onScroll={(event) => {
        scrollY.current = event.nativeEvent.contentOffset.y;
      }}
    >
      <StackHeroHeader
        title="Invite a charity"
        subtitle="Who is offered first - nothing is listed yet"
        height={adaptive.heroHeight}
        style={adaptive.heroBleed}
      />

      <View style={styles.body}>
        <AppText variant="body1" color={palette.stone} style={styles.intro}>
          Set up a Connection for regular collections with a specific charity. Choose the usual days
          and pickup window — you’ll confirm the actual food and quantities at least 2.5 hours before
          each pickup.
        </AppText>

        <AppText variant="label">Nearby charity</AppText>
        <WhiteSelect
          placeholder={loadingCharities ? 'Finding nearby charities…' : 'Select a charity'}
          value={selected?.siteId ?? null}
          options={charityOptions}
          loading={loadingCharities}
          emptyText="No charity sites nearby. They need a Saveful location within range of this site."
          open={openSelect === 'charity'}
          onOpenChange={(open) => setOpenSelect(open ? 'charity' : null)}
          onChange={(siteIdValue) => {
            setSelected(charities.find((row) => Number(row.siteId) === siteIdValue) ?? null);
          }}
        />
        <AppText variant="caption" color={palette.stone} style={styles.fieldHint}>
          Charities you already collect with stay on this list. You can add another Connection
          with different days or a different pickup window.
        </AppText>

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
            <AppText variant="bodyBold" color={windowStart ? palette.black : palette.midgray}>
              {formatClock(windowStart)}
            </AppText>
          </Pressable>
          <Pressable style={styles.timeBtn} onPress={() => openTimePicker('end')}>
            <AppText variant="caption" color={palette.stone}>TO</AppText>
            <AppText variant="bodyBold" color={windowEnd ? palette.black : palette.midgray}>
              {formatClock(windowEnd)}
            </AppText>
          </Pressable>
        </View>

        {existingForCharity.length ? (
          <View style={[styles.existingCard, overlappingNow.length ? styles.existingCardWarn : null]}>
            <AppText variant="bodyBold" color={palette.primary} style={styles.existingTitle}>
              {overlappingNow.length
                ? 'This pickup window already exists'
                : 'You already have a Connection with this charity'}
            </AppText>
            {existingForCharity.map((connection) => {
              const window = resolveConnectionWindow(connection);
              const schedule = formatScheduleSummary(
                connection.daysOfWeek,
                window?.start,
                window?.end,
              );
              const clashes = overlappingNow.some((row) => row.id === connection.id);
              return (
                <Pressable
                  key={connection.id}
                  onPress={() =>
                    navigation.navigate('ConnectionDetail', {
                      connectionId: connection.id,
                      siteId: siteId ?? undefined,
                    })
                  }
                  style={[styles.existingRow, clashes && styles.existingRowWarn]}
                >
                  <AppText variant="body1" color={palette.black}>
                    {schedule || connection.schedule || 'Open to view schedule'}
                  </AppText>
                  <AppText variant="caption" color={palette.stone} style={styles.existingStatus}>
                    {statusLabel(connection.status)}
                    {clashes ? ' · overlaps the times you just chose' : ''}
                  </AppText>
                </Pressable>
              );
            })}
            <AppText variant="caption" color={palette.stone} style={styles.existingHint}>
              {overlappingNow.length
                ? 'Choose a new pickup window or different days to add another Connection, or open the existing one above.'
                : 'You can add another Connection if the days or pickup window are different.'}
            </AppText>
          </View>
        ) : null}

        <AppText variant="label">Typical surplus - guide only</AppText>
        <AppText variant="caption" color={palette.stone} style={styles.fieldHint}>
          Give the charity an example of the food usually available. You’ll confirm the actual items
          before each pickup.
        </AppText>
        <View ref={surplusRef}>
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

        <AppText variant="label">Typical quantity - guide only</AppText>
        <AppText variant="caption" color={palette.stone} style={styles.fieldHint}>
          Give the charity an example of the quantity usually available. You’ll confirm the quantities
          before each pickup.
        </AppText>
        <View ref={quantityRef}>
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

        <AppText variant="label">Notes for the charity (optional)</AppText>
        <View ref={notesRef}>
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

        <AppText variant="label">Site timezone</AppText>
        <View ref={timezoneRef} onLayout={openSelect === 'timezone' ? revealTimezoneMenu : undefined}>
          <WhiteSelect
            placeholder="Select timezone"
            value={timezone}
            options={zoneOptions}
            open={openSelect === 'timezone'}
            onOpenChange={(open) => setOpenSelect(open ? 'timezone' : null)}
            onChange={setTimezone}
          />
        </View>
      </View>
    </Screen>

    <View style={[styles.footer, { paddingBottom: footerBottomPad }]}>
      <Pressable
        style={[styles.submit, !canSendInvitation && styles.submitDisabled]}
        onPress={submit}
        disabled={!canSendInvitation}
      >
        <AppText variant="bodyBold" color={canSendInvitation ? palette.white : palette.stone}>
          {submitting ? 'Sending…' : 'Send invitation'}
        </AppText>
      </Pressable>
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
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: palette.creme,
  },
  screen: { flexGrow: 1 },
  footer: {
    backgroundColor: palette.creme,
    paddingHorizontal: wp(5),
    paddingTop: hp(1.2),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D9DED2',
  },
  body: {
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    gap: hp(1.2),
  },
  intro: { lineHeight: normalize(22) },
  fieldHint: { lineHeight: normalize(18), textTransform: 'none', marginTop: -hp(0.4) },
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
  submit: {
    backgroundColor: palette.kale,
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: {
    backgroundColor: '#D9DED2',
  },
  existingCard: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: '#D9DED2',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  existingCardWarn: {
    borderColor: palette.orange,
    backgroundColor: '#FFF8F0',
  },
  existingTitle: {
    textTransform: 'none',
  },
  existingRow: {
    paddingVertical: 4,
    gap: 2,
  },
  existingRowWarn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFF1E4',
  },
  existingStatus: {
    textTransform: 'none',
  },
  existingHint: {
    lineHeight: normalize(18),
    textTransform: 'none',
  },
});
