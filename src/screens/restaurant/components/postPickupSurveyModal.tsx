import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  View,
  StyleSheet,
  Pressable,
  Image,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { normalize } from '@/utils/responsive';
import { claimsService } from '@/services/claims.service';
import { getUserFriendlyErrorMessage, showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import { useMilestoneStore } from '@/store/milestoneStore';

type Item = {
  id: string;
  name: string;
  quantity: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onComplete: (id: string, status: 'completed' | 'cancelled') => void;
  selectedId: string | null;
  claimId: number | null;
  partnerName?: string;
  items?: Item[];
  /** When opening from YES/NO on the feedback card. */
  initialAnswer?: 'yes' | 'no' | null;
};

export function PostPickupSurveyModal({
  visible,
  onClose,
  onComplete,
  selectedId,
  claimId,
  partnerName = 'your partner',
  items = [],
  initialAnswer = null,
}: Props) {
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (initialAnswer === 'yes') setStep(2);
    else if (initialAnswer === 'no') setStep(5);
    else setStep(1);
    setReason('');
    setOtherReason('');
    setRating(0);
    setComment('');
  }, [visible, initialAnswer, claimId]);

  const totalKg = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);
  const reasons = ['No show', 'Delayed pickup', 'Quality issue', 'Cancelled', 'Other'];

  const reset = () => {
    setStep(1);
    setReason('');
    setOtherReason('');
    setRating(0);
    setComment('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submitYes = async () => {
    if (!claimId || rating < 1) {
      showErrorAlert(null, 'Rating required', 'Please rate your collection partner.');
      return;
    }
    setSubmitting(true);
    try {
      await claimsService.submitProviderFeedback(claimId, {
        didCollect: true,
        rating,
        ratingNote: comment.trim() || undefined,
      });
      onComplete?.(selectedId || String(claimId), 'completed');
      reset();
      onClose();
      const isFirst = await useMilestoneStore.getState().offer('listing');
      if (!isFirst) {
        showSuccessAlert('Thanks — collection confirmed', 'Done');
      }
    } catch (error) {
      showErrorAlert(
        error,
        'Could not submit feedback',
        getUserFriendlyErrorMessage(error, 'Could not submit feedback. Please try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitNo = async () => {
    if (!claimId) return;
    if (!reason) {
      showErrorAlert(null, 'Reason required', 'Please select a reason.');
      return;
    }
    if (reason === 'Other' && !otherReason.trim()) {
      showErrorAlert(null, 'Details required', 'Please describe what happened.');
      return;
    }
    setSubmitting(true);
    try {
      const note = reason === 'Other' ? otherReason.trim() : reason;
      await claimsService.submitProviderFeedback(claimId, {
        didCollect: false,
        ratingNote: note,
      });
      showSuccessAlert('Thanks — we recorded your feedback', 'Done');
      onComplete?.(selectedId || String(claimId), 'cancelled');
      handleClose();
    } catch (error) {
      showErrorAlert(
        error,
        'Could not submit feedback',
        getUserFriendlyErrorMessage(error, 'Could not submit feedback. Please try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.closeRow}>
            <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={10}>
              <Ionicons name="close" size={22} color={palette.black} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {step === 1 && (
              <>
                <Image
                  source={require('../../../../assets/placeholder/bowl.png')}
                  style={styles.icon}
                />
                <AppText style={styles.title}>
                  Did {partnerName} collect from you?
                </AppText>
                <View style={styles.row}>
                  <Pressable style={styles.primaryBtn} onPress={() => setStep(2)}>
                    <AppText style={styles.primaryText}>Yes</AppText>
                  </Pressable>
                  <Pressable style={styles.secondaryBtn} onPress={() => setStep(5)}>
                    <AppText>No</AppText>
                  </Pressable>
                </View>
              </>
            )}

            {step === 2 && (
              <>
                <Image
                  source={require('../../../../assets/placeholder/bowl.png')}
                  style={styles.icon}
                />
                <AppText style={styles.title}>How was the collection?</AppText>
                <AppText style={styles.subtitle}>Rate {partnerName}</AppText>
                {totalKg > 0 ? (
                  <AppText style={styles.meta}>{totalKg} kg claimed</AppText>
                ) : null}
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((num) => {
                    const selected = rating >= num;
                    return (
                      <Pressable key={num} onPress={() => setRating(num)} hitSlop={6}>
                        <Ionicons
                          name={selected ? 'star' : 'star-outline'}
                          size={normalize(32)}
                          color={selected ? palette.orange : '#C9C9C9'}
                        />
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Add a note (optional)"
                  placeholderTextColor="#999"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                />
                <Pressable
                  style={[styles.primaryBtn, (submitting || rating < 1) && styles.disabled]}
                  disabled={submitting || rating < 1}
                  onPress={() => void submitYes()}
                >
                  {submitting ? (
                    <ActivityIndicator color={palette.white} />
                  ) : (
                    <AppText style={styles.primaryText}>Submit</AppText>
                  )}
                </Pressable>
              </>
            )}

            {step === 5 && (
              <>
                <Image
                  source={require('../../../../assets/placeholder/bowl.png')}
                  style={styles.icon}
                />
                <AppText style={styles.title}>What went wrong?</AppText>
                {reasons.map((item) => (
                  <Pressable
                    key={item}
                    style={styles.reasonRow}
                    onPress={() => setReason(item)}
                  >
                    <Ionicons
                      name={reason === item ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={palette.middlegreen}
                    />
                    <AppText style={styles.reasonText}>{item}</AppText>
                  </Pressable>
                ))}
                {reason === 'Other' ? (
                  <TextInput
                    style={styles.input}
                    placeholder="Tell us more"
                    placeholderTextColor="#999"
                    value={otherReason}
                    onChangeText={setOtherReason}
                    multiline
                  />
                ) : null}
                <Pressable
                  style={[styles.primaryBtn, submitting && styles.disabled]}
                  disabled={submitting}
                  onPress={() => void submitNo()}
                >
                  {submitting ? (
                    <ActivityIndicator color={palette.white} />
                  ) : (
                    <AppText style={styles.primaryText}>Submit</AppText>
                  )}
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: 20,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  closeRow: {
    alignItems: 'flex-end',
    paddingTop: spacing.sm,
    paddingRight: spacing.sm,
  },
  closeBtn: {
    padding: 6,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 72,
    height: 72,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: normalize(18),
    fontWeight: '700',
    textAlign: 'center',
    color: palette.black,
  },
  subtitle: {
    fontSize: normalize(14),
    color: palette.midgray,
    textAlign: 'center',
  },
  meta: {
    fontSize: normalize(13),
    color: palette.stone,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.sm,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: palette.middlegreen,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    minWidth: '45%',
  },
  primaryText: {
    color: palette.white,
    fontWeight: '700',
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: spacing.sm,
  },
  input: {
    width: '100%',
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    textAlignVertical: 'top',
    color: palette.black,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    paddingVertical: 8,
  },
  reasonText: {
    fontSize: normalize(15),
    color: palette.black,
  },
  disabled: {
    opacity: 0.6,
  },
});
