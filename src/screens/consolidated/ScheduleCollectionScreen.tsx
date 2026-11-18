import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

import { AppDateTimePicker, type DateTimePickerEvent } from '@/components/AppDateTimePicker';
import { AppText } from '@/components/AppText';
import { ActionButton as Button } from '@/components/consolidated/ui';
import { InputField } from '@/components/InputField';
import { Screen } from '@/components/Screen';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { WhiteSelect } from '@/components/WhiteSelect';
import { MethodSelector } from '@/components/consolidated/MethodSelector';
import { RecurrencePicker } from '@/components/consolidated/RecurrencePicker';
import { SiteMultiSelect } from '@/components/consolidated/SiteMultiSelect';
import { Chip, IconBubble, Notice, SectionTitle, Surface, cc, tabular } from '@/components/consolidated/ui';
import { GuideHeaderRight, GuideTarget, tours, useScreenGuide } from '@/components/guide';
import { normalize } from '@/utils/responsive';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { consolidatedService } from '@/services/consolidated.service';
import { useAppContext } from '@/store/AppContext';
import { showConfirmAlert } from '@/store/appAlertStore';
import { palette } from '@/theme/colors';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import { formatDateKey, formatHHmmInZone, fromHHmm, timeFieldLabel, toHHmm, todayKey, validateTimes } from '@/utils/consolidated';
import type { CollectionPoint, ConsolidatedGroup, HandoverMethod, Recurrence, ScheduleTimes } from '@/types/consolidated';

const DEFAULT_TIMES: ScheduleTimes = {
  submissionsClose: '13:30',
  handoverStart: '13:40',
  handoverEnd: '14:00',
  pickupStart: '14:15',
  pickupEnd: '15:15',
};

export function ScheduleCollectionScreen() {
  useTransparentStatusBar('light');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mode = (route.params?.mode || 'create') as 'create' | 'editSeries' | 'editOccurrence';
  const { authUser } = useAppContext();
  const { submitting, withLock } = useSubmitLock();

  const [loading, setLoading] = useState(mode !== 'create' || Boolean(route.params?.groupId));
  const [groups, setGroups] = useState<ConsolidatedGroup[]>([]);
  const [groupId, setGroupId] = useState<number | null>(route.params?.groupId ?? null);
  const [pointId, setPointId] = useState<number | null>(null);
  const [siteIds, setSiteIds] = useState<number[]>([]);
  const [method, setMethod] = useState<HandoverMethod>('SITE_DROP_OFF');
  const [recurrence, setRecurrence] = useState<Recurrence>('ONE_OFF');
  const [startDate, setStartDate] = useState(todayKey());
  const [endDate, setEndDate] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([5]);
  const [customDates, setCustomDates] = useState<string[]>([]);
  const [opensDaysBefore, setOpensDaysBefore] = useState(0);
  const [times, setTimes] = useState<ScheduleTimes>(DEFAULT_TIMES);
  const [contactName, setContactName] = useState([authUser?.firstName, authUser?.lastName].filter(Boolean).join(' '));
  const [contactPhone, setContactPhone] = useState(String(authUser?.profile?.mobile || authUser?.profile?.phone || ''));
  const [instructions, setInstructions] = useState('');
  const [suitability, setSuitability] = useState('');
  const [timeError, setTimeError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [picker, setPicker] = useState<keyof ScheduleTimes | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const list = await consolidatedService.listGroups(false);
        if (cancelled) return;
        setGroups(list);
        const initial = route.params?.groupId || list[0]?.id || null;
        if (!groupId && initial) setGroupId(initial);
        if (mode === 'editSeries' && route.params?.scheduleId) {
          const schedule = await consolidatedService.getSchedule(route.params.scheduleId);
          if (cancelled) return;
          setGroupId(schedule.groupId);
          setPointId(schedule.collectionPointId);
          setMethod(schedule.method);
          setRecurrence(schedule.recurrence);
          setStartDate(schedule.startDate);
          setEndDate(schedule.endDate || '');
          setDaysOfWeek(schedule.daysOfWeek?.length ? schedule.daysOfWeek : [5]);
          setCustomDates(schedule.customDates || []);
          setOpensDaysBefore(schedule.opensDaysBefore || 0);
          setTimes(schedule.times);
          setContactName(schedule.contactName || contactName);
          setContactPhone(schedule.contactPhone || contactPhone);
          setInstructions(schedule.instructions || '');
          setSuitability(schedule.suitabilityNotes || '');
          setSiteIds(schedule.participatingSiteIds || []);
        }
        if (mode === 'editOccurrence' && route.params?.collectionId) {
          const collection = await consolidatedService.getCollection(route.params.collectionId);
          if (cancelled) return;
          setGroupId(collection.group.id);
          setPointId(collection.point.id);
          setMethod(collection.method);
          setStatus(collection.status);
          setStartDate(collection.scheduledDate || formatDateKey(collection.times.pickupStartAt, collection.timezone));
          setContactName(collection.contact?.name || '');
          setContactPhone(collection.contact?.phone || '');
          setInstructions(collection.instructions || '');
          setSuitability(collection.suitabilityNotes || '');
          setSiteIds(collection.participatingSiteIds || []);
          setTimes({
            submissionsClose: formatHHmmInZone(collection.times.submissionsCloseAt, collection.timezone) || DEFAULT_TIMES.submissionsClose,
            handoverStart: formatHHmmInZone(collection.times.handoverStartAt, collection.timezone) || DEFAULT_TIMES.handoverStart,
            handoverEnd: formatHHmmInZone(collection.times.handoverEndAt, collection.timezone) || DEFAULT_TIMES.handoverEnd,
            pickupStart: formatHHmmInZone(collection.times.pickupStartAt, collection.timezone) || DEFAULT_TIMES.pickupStart,
            pickupEnd: formatHHmmInZone(collection.times.pickupEndAt, collection.timezone) || DEFAULT_TIMES.pickupEnd,
          });
        }
      } catch (error) {
        showErrorAlert(error, 'Could not load schedule');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
    // Prefill once from the route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The group list carries only counts; points and sites come from the group's detail.
  const [groupDetail, setGroupDetail] = useState<ConsolidatedGroup | null>(null);
  useEffect(() => {
    if (!groupId) {
      setGroupDetail(null);
      return undefined;
    }
    let cancelled = false;
    consolidatedService
      .getGroup(groupId)
      .then((detail) => { if (!cancelled) setGroupDetail(detail); })
      .catch((error) => { if (!cancelled) showErrorAlert(error, 'Could not load this group'); });
    return () => { cancelled = true; };
  }, [groupId]);

  const group = groupDetail && groupDetail.id === groupId ? groupDetail : null;
  const points = useMemo(() => (group?.points || []).filter((point) => point.isActive !== false), [group]);
  // Invited sites take part only once they accept (Canva CM1).
  const sites = useMemo(
    () => (group?.sites || []).filter((site) => !site.removedAt && (site.invitationStatus ?? 'ACCEPTED') === 'ACCEPTED'),
    [group],
  );
  const awaitingSites = useMemo(
    () => (group?.sites || []).filter((site) => !site.removedAt && site.invitationStatus === 'PENDING'),
    [group],
  );

  useEffect(() => {
    if (!group) return;
    if (!pointId || !points.some((point) => point.id === pointId)) {
      const first = points[0]?.id ?? null;
      if (first !== pointId) setPointId(first);
    }
    // Default to every accepted site, once — never replace an explicit choice.
    if (sites.length) setSiteIds((current) => (current.length ? current : sites.map((site) => site.id)));
  }, [group, pointId, points, sites]);

  const payloadBase = useMemo(() => ({
    groupId: groupId || 0,
    collectionPointId: pointId || 0,
    method,
    recurrence,
    startDate,
    endDate: endDate || undefined,
    daysOfWeek: recurrence === 'WEEKLY' || recurrence === 'SELECTED_WEEKDAYS' ? daysOfWeek : undefined,
    customDates: recurrence === 'CUSTOM_DATES' ? customDates : undefined,
    opensDaysBefore,
    times,
    contactName: contactName.trim(),
    contactPhone: contactPhone.trim(),
    instructions: instructions.trim() || undefined,
    suitabilityNotes: suitability.trim(),
    participatingSiteIds: siteIds,
  }), [contactName, contactPhone, customDates, daysOfWeek, endDate, groupId, instructions, method, opensDaysBefore, pointId, recurrence, siteIds, startDate, suitability, times]);

  const submit = () => {
    const orderError = validateTimes(times);
    setTimeError(orderError);
    if (orderError) return;
    if (!groupId || !pointId) {
      showErrorAlert('Choose a group and collection point.', 'Missing details');
      return;
    }
    if (!suitability.trim()) {
      showErrorAlert('Add food suitability requirements.', 'Missing details');
      return;
    }
    if (!contactName.trim() || !contactPhone.trim()) {
      showErrorAlert('Add a contact name and phone.', 'Missing details');
      return;
    }
    if ((recurrence === 'WEEKLY' || recurrence === 'SELECTED_WEEKDAYS') && !daysOfWeek.length) {
      showErrorAlert('Choose at least one weekday.', 'Missing details');
      return;
    }
    if (recurrence === 'CUSTOM_DATES' && !customDates.length) {
      showErrorAlert('Add at least one date.', 'Missing details');
      return;
    }

    const send = () => void withLock(async () => {
      try {
        if (mode === 'editSeries' && route.params?.scheduleId) {
          await consolidatedService.updateSchedule(route.params.scheduleId, payloadBase);
          showSuccessAlert('Future collections were updated.', 'Collection scheduled');
          navigation.goBack();
          return;
        }
        if (mode === 'editOccurrence' && route.params?.collectionId) {
          await consolidatedService.updateCollection(route.params.collectionId, {
            collectionPointId: pointId,
            times,
            contactName: contactName.trim(),
            contactPhone: contactPhone.trim(),
            instructions: instructions.trim() || undefined,
            suitabilityNotes: suitability.trim(),
          });
          showSuccessAlert('This collection was updated.', 'Saved');
          navigation.goBack();
          return;
        }
        const created = await consolidatedService.createSchedule(payloadBase);
        showSuccessAlert(
          created.collectionsCreated === 1
            ? 'One collection was created. Participating sites can now list food.'
            : `${created.collectionsCreated} collections were created for the next two weeks.`,
          'Collection scheduled',
        );
        // Open the soonest occurrence's dashboard (open today, else the next scheduled one).
        const soonest = await consolidatedService
          .listCollections({ tab: 'active', groupId: groupId || undefined, limit: 1 })
          .then((page) => page.items[0] ?? null)
          .then(async (row) => row ?? (await consolidatedService
            .listCollections({ tab: 'upcoming', groupId: groupId || undefined, limit: 1 })
            .then((page) => page.items[0] ?? null)))
          .catch(() => null);
        if (soonest) {
          navigation.replace('CollectionDashboard', { collectionId: soonest.id });
        } else {
          navigation.navigate('ConsolidatedCollections', { tab: 'upcoming', groupId });
        }
      } catch (error) {
        showErrorAlert(error, 'Could not save collection');
      }
    });

    if (mode === 'editSeries') {
      showConfirmAlert({
        title: 'Update this series?',
        message: "Changes apply to future collections that haven't closed yet.",
        confirmLabel: 'Update series',
        onConfirm: send,
      });
      return;
    }
    if (mode === 'editOccurrence' && status === 'CLAIMED') {
      showConfirmAlert({
        title: 'Charity will be asked to confirm',
        message: 'The charity will be notified and asked to confirm.',
        confirmLabel: 'Save change',
        onConfirm: send,
      });
      return;
    }
    send();
  };

  const openTime = (field: keyof ScheduleTimes) => {
    setPickerDate(fromHHmm(times[field]));
    setPicker(field);
  };

  const onTime = (event: DateTimePickerEvent, date?: Date) => {
    if (!picker) return;
    if (Platform.OS === 'android') {
      const field = picker;
      setPicker(null);
      if (event.type === 'dismissed' || !date) return;
      setTimes((prev) => ({ ...prev, [field]: toHHmm(date) }));
      setTimeError(null);
      return;
    }
    if (date) setPickerDate(date);
  };

  const internal = method === 'INTERNAL_COLLECTION';
  const selectedGroup = group ?? groups.find((item) => item.id === groupId);
  const guide = useScreenGuide(tours.scheduleTour, { ready: !loading });

  return (
    <Screen scrollable backgroundColor={palette.creme} transparentTop contentStyle={styles.screen}>
      <StackHeroHeader
        title={mode === 'create' ? 'Schedule collection' : mode === 'editSeries' ? 'Edit series' : 'Edit this collection'}
        subtitle={mode === 'editSeries'
          ? 'Changes apply to future collections that have not closed'
          : 'Where, how and when the food comes together'}
        right={<GuideHeaderRight onGuide={guide.start} />}
      />
      {loading ? <ActivityIndicator color={palette.kale} style={styles.loader} /> : (
        <View style={styles.body}>
          {/* 1. Group and point */}
          <Section guideId="schedule.group" title="Collection group" caption="Which sites, and where their food comes together.">
            {mode === 'create' && groups.length > 1 ? (
              <WhiteSelect
                placeholder="Choose a collection group"
                value={groupId}
                options={groups.map((item) => ({ value: item.id, label: item.name }))}
                onChange={(id) => { setGroupId(id); setPointId(null); setSiteIds([]); }}
              />
            ) : selectedGroup ? (
              <View style={styles.groupRow}>
                <IconBubble name="git-merge-outline" size={36} />
                <AppText variant="bodyBold" style={styles.flex}>{selectedGroup.name}</AppText>
              </View>
            ) : null}
            <WhiteSelect
              placeholder="Collection point"
              value={pointId}
              options={points.map((point: CollectionPoint) => ({ value: point.id, label: point.name, subtitle: point.address }))}
              onChange={setPointId}
              emptyText="This group has no collection point"
            />
          </Section>

          {/* 2. Method */}
          {mode !== 'editOccurrence' ? (
            <Section guideId="schedule.method" title="How will food reach the collection point?">
              <MethodSelector value={method} onChange={setMethod} />
            </Section>
          ) : null}

          {/* 3. When */}
          {mode !== 'editOccurrence' ? (
            <Section guideId="schedule.recurrence" title="One-off or recurring" caption="Each date becomes its own collection with its own deadlines, records and declarations.">
              <RecurrencePicker
                recurrence={recurrence}
                onRecurrence={setRecurrence}
                startDate={startDate}
                endDate={endDate}
                onStartDate={setStartDate}
                onEndDate={setEndDate}
                daysOfWeek={daysOfWeek}
                onDays={setDaysOfWeek}
                customDates={customDates}
                onCustomDates={setCustomDates}
              />
              <AppText variant="bodyBold" style={styles.subLabel}>Sites can start listing</AppText>
              <View style={styles.chips}>
                {[0, 1, 2, 3, 7].map((day) => (
                  <Chip
                    key={day}
                    label={day === 0 ? 'On the day' : `${day} day${day === 1 ? '' : 's'} before`}
                    selected={opensDaysBefore === day}
                    onPress={() => setOpensDaysBefore(day)}
                  />
                ))}
              </View>
            </Section>
          ) : null}

          {/* 4. Times */}
          <Section
            guideId="schedule.times"
            title={internal ? 'Food-ready deadline & collection window' : 'Drop-off window & deadline'}
            caption="Times are in the venue's local time. Tap a time to change it."
          >
            <TimeTile
              icon="create-outline"
              label={timeFieldLabel('submissionsClose', method)}
              value={times.submissionsClose}
              active={picker === 'submissionsClose'}
              onPress={() => openTime('submissionsClose')}
            />
            <View style={styles.tileRow}>
              <TimeTile
                icon={internal ? 'restaurant-outline' : 'log-in-outline'}
                label={timeFieldLabel('handoverStart', method)}
                value={times.handoverStart}
                active={picker === 'handoverStart'}
                onPress={() => openTime('handoverStart')}
              />
              <TimeTile
                icon={internal ? 'walk-outline' : 'flag-outline'}
                label={timeFieldLabel('handoverEnd', method)}
                value={times.handoverEnd}
                active={picker === 'handoverEnd'}
                onPress={() => openTime('handoverEnd')}
              />
            </View>
            <AppText variant="bodyBold" style={styles.subLabel}>Charity pickup window</AppText>
            <View style={styles.tileRow}>
              <TimeTile icon="car-outline" label="From" value={times.pickupStart} active={picker === 'pickupStart'} onPress={() => openTime('pickupStart')} />
              <TimeTile icon="car-outline" label="Until" value={times.pickupEnd} active={picker === 'pickupEnd'} onPress={() => openTime('pickupEnd')} />
            </View>
            {picker ? (
              <View style={styles.pickerWrap}>
                <AppDateTimePicker mode="time" value={pickerDate} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onTime} />
                {Platform.OS === 'ios' ? (
                  <Button
                    label="Use this time"
                    size="compact"
                    onPress={() => {
                      setTimes((prev) => ({ ...prev, [picker]: toHHmm(pickerDate) }));
                      setPicker(null);
                      setTimeError(null);
                    }}
                  />
                ) : null}
              </View>
            ) : null}
            {timeError ? (
              <Notice tone="danger" title={timeError} />
            ) : (
              <View style={styles.summary}>
                <Ionicons name="time-outline" size={normalize(14)} color={palette.kale} />
                <AppText variant="meta" color={palette.midgray} style={styles.flex}>
                  {`List by ${to12(times.submissionsClose)} · ${internal ? 'ready' : 'drop off'} ${to12(times.handoverStart)}–${to12(times.handoverEnd)} · charity ${to12(times.pickupStart)}–${to12(times.pickupEnd)}`}
                </AppText>
              </View>
            )}
          </Section>

          {/* 5. Sites */}
          <Section
            guideId="schedule.sites"
            title="Participating sites"
            caption="Only sites that have accepted the group can take part."
          >
            <SiteMultiSelect
              options={sites.map((site) => ({ id: site.id, name: site.name }))}
              selected={siteIds}
              onChange={setSiteIds}
              emptyText="No site has accepted this group yet"
            />
            {awaitingSites.length ? (
              <View style={styles.awaiting}>
                <Ionicons name="mail-unread-outline" size={normalize(16)} color={cc.warnText} />
                <AppText variant="meta" color={palette.midgray} style={styles.flex}>
                  Waiting to accept: {awaitingSites.map((site) => site.name).join(', ')}. They join upcoming collections automatically once they accept.
                </AppText>
              </View>
            ) : null}
          </Section>

          {/* 6. Suitability and contact */}
          <Section
            guideId="schedule.suitability"
            title="Suitability & contact"
            caption="Shown to every site when they list food."
          >
            <InputField
              label="Food suitability requirements"
              value={suitability}
              onChangeText={setSuitability}
              multiline
              placeholder="e.g. Chilled food below 5°C; sealed and labelled"
            />
            <InputField label="Instructions" optional value={instructions} onChangeText={setInstructions} multiline placeholder="e.g. Use the rear gate" />
            <View style={styles.tileRow}>
              <View style={styles.flex}>
                <InputField label="Contact name" value={contactName} onChangeText={setContactName} />
              </View>
              <View style={styles.flex}>
                <InputField label="Contact phone" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
              </View>
            </View>
          </Section>

          <GuideTarget id="schedule.save">
            <Button
              label={mode === 'create' ? 'Save consolidated collection' : 'Save changes'}
              icon="checkmark"
              onPress={submit}
              loading={submitting}
            />
          </GuideTarget>
        </View>
      )}
    </Screen>
  );
}

function to12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isFinite(h)) return hhmm;
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}

function Section({ title, caption, guideId, children }: { guideId: string; title: string; caption?: string; children: React.ReactNode }) {
  return (
    <GuideTarget id={guideId} style={styles.sectionWrap}>
      <SectionTitle title={title} caption={caption} />
      <Surface style={styles.section}>{children}</Surface>
    </GuideTarget>
  );
}

function TimeTile({
  icon, label, value, active, onPress,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tile, active && styles.tileOn]} accessibilityRole="button" accessibilityLabel={`${label} ${to12(value)}`}>
      <View style={styles.tileHead}>
        <Ionicons name={icon} size={normalize(14)} color={palette.kale} />
        <AppText variant="meta" color={palette.stone} numberOfLines={1} style={styles.flex}>{label}</AppText>
      </View>
      <AppText variant="subheading" style={tabular}>{to12(value)}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 48 },
  loader: { marginTop: 24 },
  body: { paddingHorizontal: normalize(16), paddingTop: normalize(4), gap: normalize(12) },
  flex: { flex: 1, minWidth: 0 },
  sectionWrap: { gap: 10 },
  section: { gap: 12 },
  subLabel: { marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: cc.tint, borderRadius: cc.radiusSm, padding: 10 },
  tileRow: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: cc.hairline,
    borderRadius: cc.radiusSm,
    backgroundColor: palette.white,
    padding: 12,
    gap: 4,
  },
  tileOn: { borderColor: palette.kale, backgroundColor: cc.tint },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pickerWrap: { backgroundColor: cc.muted, borderRadius: cc.radiusSm, padding: 8, gap: 8 },
  awaiting: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingTop: 4 },
  summary: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: cc.tint, borderRadius: 10, padding: 10 },
});
