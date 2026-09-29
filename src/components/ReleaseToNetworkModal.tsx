import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppDateTimePicker } from '@/components/AppDateTimePicker';
import { AppText } from '@/components/AppText';
import { ModalArt } from '@/components/ModalArt';
import { palette } from '@/theme/colors';
import {
  PAST_COLLECTION_WINDOW_MESSAGE,
  getListingDateErrors,
} from '@/utils/listingDateValidation';
import { hp, normalize, wp } from '@/utils/responsive';

type Step = 'ask' | 'edit';
type PickerTarget = 'from' | 'to' | 'bestBefore' | 'bestBeforeTime';

export type ReleaseToNetworkTarget = {
  dayId: number;
  listingId?: number | null;
  charityName?: string;
  windowStartAt?: string | null;
  windowEndAt?: string | null;
  bestBefore?: string | null;
};

export type ReleaseWindowChoice = {
  pickupFromTime?: string;
  pickupByTime?: string;
  bestBefore?: string;
} | null;

type Props = {
  target: ReleaseToNetworkTarget | null;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (window: ReleaseWindowChoice) => void;
};

function asDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function defaultWindow(start?: string | null, end?: string | null) {
  const from = asDate(start);
  const to = asDate(end);
  if (from && to) return { from, to };
  const next = new Date();
  next.setMinutes(next.getMinutes() + 30, 0, 0);
  const later = new Date(next);
  later.setMinutes(later.getMinutes() + 60);
  return { from: next, to: later };
}

function formatDateShort(date: Date | null) {
  if (!date) return 'Date';
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

function formatDate(date: Date | null) {
  if (!date) return 'Select date';
  return date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(date: Date | null) {
  if (!date) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function hasExplicitBestBeforeTime(date: Date | null) {
  if (!date) return false;
  return !(date.getHours() === 23 && date.getMinutes() === 59);
}

export function ReleaseToNetworkModal({ target, submitting, onClose, onConfirm }: Props) {
  const [step, setStep] = useState<Step>('ask');
  const [pickupFromDate, setPickupFromDate] = useState<Date | null>(null);
  const [pickupToDate, setPickupToDate] = useState<Date | null>(null);
  const [bestBeforeDate, setBestBeforeDate] = useState<Date | null>(null);
  const [bestBeforeTimeSet, setBestBeforeTimeSet] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pickerTarget, setPickerTarget] = useState<PickerTarget | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | 'datetime'>('datetime');
  const [pickerValue, setPickerValue] = useState(new Date());

  useEffect(() => {
    if (!target) return;
    const next = defaultWindow(target.windowStartAt, target.windowEndAt);
    const best = asDate(target.bestBefore) || next.to;
    setStep('ask');
    setPickupFromDate(next.from);
    setPickupToDate(next.to);
    setBestBeforeDate(best);
    setBestBeforeTimeSet(hasExplicitBestBeforeTime(best));
    setError(undefined);
    setPickerVisible(false);
    setPickerTarget(null);
  }, [target]);

  const openDatePicker = (nextTarget: PickerTarget) => {
    const initial =
      nextTarget === 'bestBefore' || nextTarget === 'bestBeforeTime'
        ? bestBeforeDate || new Date()
        : nextTarget === 'from'
          ? pickupFromDate || new Date()
          : pickupToDate || new Date();
    setPickerTarget(nextTarget);
    setPickerValue(initial);
    if (Platform.OS === 'ios') {
      setPickerMode(nextTarget === 'bestBefore' ? 'date' : nextTarget === 'bestBeforeTime' ? 'time' : 'datetime');
      setPickerVisible(true);
      return;
    }
    setPickerMode(nextTarget === 'bestBeforeTime' ? 'time' : 'date');
    setPickerVisible(true);
  };

  const applySelectedDate = (nextTarget: PickerTarget, value: Date) => {
    if (nextTarget === 'from') setPickupFromDate(value);
    if (nextTarget === 'to') {
      setPickupToDate(value);
      if (bestBeforeDate && value.getTime() > bestBeforeDate.getTime()) {
        setBestBeforeDate(value);
        setBestBeforeTimeSet(true);
      }
    }
    if (nextTarget === 'bestBefore') {
      const next = new Date(value);
      if (bestBeforeTimeSet && bestBeforeDate) {
        next.setHours(bestBeforeDate.getHours(), bestBeforeDate.getMinutes(), 0, 0);
      } else {
        next.setHours(23, 59, 0, 0);
      }
      setBestBeforeDate(next);
    }
    if (nextTarget === 'bestBeforeTime') {
      const base = bestBeforeDate ? new Date(bestBeforeDate) : new Date();
      base.setHours(value.getHours(), value.getMinutes(), 0, 0);
      setBestBeforeDate(base);
      setBestBeforeTimeSet(true);
    }
    setError(undefined);
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

    if (pickerTarget === 'bestBefore' || pickerTarget === 'bestBeforeTime') {
      applySelectedDate(pickerTarget, selectedDate);
      setPickerTarget(null);
      return;
    }

    if (pickerMode === 'date') {
      const datePart = new Date(selectedDate);
      const timePart = pickerTarget === 'from' ? pickupFromDate || new Date() : pickupToDate || new Date();
      datePart.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
      setPickerValue(datePart);
      setPickerMode('time');
      setTimeout(() => setPickerVisible(true), 120);
      return;
    }

    const finalDate = new Date(pickerValue);
    finalDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
    applySelectedDate(pickerTarget, finalDate);
    setPickerMode('date');
    setPickerTarget(null);
  };

  const confirmIOSPicker = () => {
    if (!pickerTarget) return;
    applySelectedDate(pickerTarget, pickerValue);
    setPickerVisible(false);
    setPickerTarget(null);
    setPickerMode('datetime');
  };

  const closeIOSPicker = () => {
    setPickerVisible(false);
    setPickerTarget(null);
    setPickerMode('datetime');
  };

  const confirmEditedRelease = () => {
    const dateErrors = getListingDateErrors(bestBeforeDate, pickupFromDate, pickupToDate);
    const nextError = dateErrors.bestBefore || dateErrors.pickupFrom || dateErrors.pickupTo;
    if (nextError || !pickupFromDate || !pickupToDate || !bestBeforeDate) {
      setError(nextError || PAST_COLLECTION_WINDOW_MESSAGE);
      return;
    }
    onConfirm({
      pickupFromTime: pickupFromDate.toISOString(),
      pickupByTime: pickupToDate.toISOString(),
      bestBefore: bestBeforeDate.toISOString(),
    });
  };

  return (
    <>
      <Modal
        visible={Boolean(target)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={styles.card} onPress={() => undefined}>
            {step === 'ask' ? (
              <>
                <View style={styles.art}>
                  <ModalArt kind="notice" />
                </View>
                <AppText variant="h6" style={styles.title}>Change the pickup window?</AppText>
                <AppText variant="bodySmall" color={palette.stone} style={styles.copy}>
                  Nearby charities will see this listing. Keep the current window, or set a new one
                  and a best before so it does not expire too soon.
                </AppText>
                <Pressable
                  style={[styles.releaseBtn, submitting && styles.releaseBtnDisabled]}
                  disabled={submitting}
                  onPress={() => onConfirm(null)}
                >
                  <AppText variant="bodyBold" color={palette.white}>
                    {submitting ? 'Releasing…' : 'Keep current times'}
                  </AppText>
                </Pressable>
                <Pressable style={styles.secondaryBtn} disabled={submitting} onPress={() => setStep('edit')}>
                  <AppText variant="bodyBold" color={palette.primary}>
                    Change times
                  </AppText>
                </Pressable>
                <Pressable style={styles.cancelBtn} disabled={submitting} onPress={onClose}>
                  <AppText variant="bodyBold" color={palette.primary}>
                    Cancel
                  </AppText>
                </Pressable>
              </>
            ) : (
              <>
                <AppText variant="h6">New public times</AppText>
                <AppText variant="bodySmall" color={palette.stone} style={styles.copy}>
                  Pickup must finish on or before the best before. If pickup ends later, best before
                  moves with it so the listing stays live.
                </AppText>

                <AppText variant="h8" color={palette.black} style={styles.fieldLabel}>
                  PICKUP WINDOW
                </AppText>
                <View style={styles.windowRow}>
                  <Pressable style={styles.windowBox} onPress={() => openDatePicker('from')}>
                    <AppText variant="caption" color={palette.stone}>FROM</AppText>
                    <AppText variant="bodyBold" color={palette.midgray} style={styles.windowValue}>
                      {formatDateShort(pickupFromDate)}{'\n'}{formatTime(pickupFromDate)}
                    </AppText>
                  </Pressable>
                  <Pressable style={styles.windowBox} onPress={() => openDatePicker('to')}>
                    <AppText variant="caption" color={palette.stone}>TO</AppText>
                    <AppText variant="bodyBold" color={palette.midgray} style={styles.windowValue}>
                      {formatDateShort(pickupToDate)}{'\n'}{formatTime(pickupToDate)}
                    </AppText>
                  </Pressable>
                </View>

                <AppText variant="h8" color={palette.black} style={[styles.fieldLabel, { marginTop: hp(1.2) }]}>
                  BEST BEFORE
                </AppText>
                <View style={styles.windowRow}>
                  <Pressable style={styles.windowBox} onPress={() => openDatePicker('bestBefore')}>
                    <AppText variant="caption" color={palette.stone}>DATE</AppText>
                    <AppText variant="bodyBold" color={palette.midgray} style={styles.windowValue}>
                      {formatDate(bestBeforeDate)}
                    </AppText>
                  </Pressable>
                  <Pressable style={styles.windowBox} onPress={() => openDatePicker('bestBeforeTime')}>
                    <AppText variant="caption" color={palette.stone}>TIME</AppText>
                    <AppText variant="bodyBold" color={palette.midgray} style={styles.windowValue}>
                      {bestBeforeTimeSet ? formatTime(bestBeforeDate) : 'End of day'}
                    </AppText>
                  </Pressable>
                </View>
                {error ? (
                  <AppText variant="caption" color={palette.danger} style={styles.error}>
                    {error}
                  </AppText>
                ) : null}

                <Pressable
                  style={[styles.releaseBtn, submitting && styles.releaseBtnDisabled]}
                  disabled={submitting}
                  onPress={confirmEditedRelease}
                >
                  <AppText variant="bodyBold" color={palette.white}>
                    {submitting ? 'Releasing…' : 'Release'}
                  </AppText>
                </Pressable>
                <Pressable style={styles.cancelBtn} disabled={submitting} onPress={() => setStep('ask')}>
                  <AppText variant="bodyBold" color={palette.primary}>
                    Back
                  </AppText>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

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
                mode={
                  pickerMode === 'datetime' ? 'datetime' : pickerMode === 'time' ? 'time' : 'date'
                }
                display="spinner"
                onChange={onNativePickerChange}
                minimumDate={pickerTarget === 'bestBeforeTime' ? undefined : new Date()}
              />
            </View>
          </View>
        </Modal>
      ) : null}

      {Platform.OS === 'android' && pickerVisible ? (
        <AppDateTimePicker
          value={pickerValue}
          mode={pickerMode === 'datetime' ? 'date' : pickerMode}
          display="default"
          onChange={onNativePickerChange}
          minimumDate={pickerTarget === 'bestBeforeTime' ? undefined : new Date()}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: wp(6),
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: 22,
    padding: 20,
  },
  art: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
  },
  copy: {
    marginTop: 6,
    marginBottom: 14,
    textAlign: 'center',
  },
  fieldLabel: {
    marginBottom: hp(0.6),
  },
  windowRow: {
    flexDirection: 'row',
    gap: wp(3),
  },
  windowBox: {
    flex: 1,
    minHeight: hp(6.8),
    borderRadius: normalize(10),
    borderWidth: normalize(1),
    borderColor: '#DADCD0',
    backgroundColor: '#ECEDEA',
    paddingHorizontal: wp(3),
    justifyContent: 'center',
  },
  windowValue: {
    marginTop: hp(0.3),
    textTransform: 'none',
  },
  error: {
    marginTop: hp(0.6),
  },
  releaseBtn: {
    marginTop: 16,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  releaseBtnDisabled: {
    opacity: 0.6,
  },
  secondaryBtn: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingTop: 12,
  },
  iosPickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  iosPickerCard: {
    backgroundColor: palette.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  iosPickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
