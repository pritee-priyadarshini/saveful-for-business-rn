import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { normalize, useResponsiveLayout } from '@/utils/responsive';
import { claimsService } from '@/services/claims.service';
import { getUserFriendlyErrorMessage, showErrorAlert, showSuccessAlert } from '@/utils/apiError';

type Item = {
  id: string;
  name: string;
  quantity: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  initialAnswer?: 'yes' | 'no' | null;
  claimId?: number | null;
  businessName?: string;
  items?: Item[];
  /** Called after a successful backend submit so the feed can refresh. */
  onSubmitted?: () => void;
};

export function PostCollectSurveyModal({
  visible,
  onClose,
  initialAnswer,
  claimId,
  businessName,
  items: initialItems,
  onSubmitted,
}: Props) {
  const navigation = useNavigation<any>();
  const r = useResponsiveLayout();
  const [step, setStep] = useState(1);
  const [isPartial, setIsPartial] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');

  const [items, setItems] = useState<Item[]>(
    initialItems?.length
      ? initialItems
      : [
          { id: '1', name: 'Rice Meals', quantity: 5 },
          { id: '2', name: 'Bread Packs', quantity: 3 },
        ],
  );

  useEffect(() => {
    if (!visible) return;
    if (initialAnswer === 'yes') setStep(2);
    else if (initialAnswer === 'no') setStep(6);
    else setStep(1);

    if (initialItems?.length) {
      setItems(initialItems);
    }
  }, [visible, initialAnswer, initialItems]);

  const totalKg = items.reduce((sum, i) => sum + i.quantity, 0);

  const cardStyle = useMemo(() => {
    if (!r.isTablet) return null;
    return {
      width: '100%' as const,
      maxWidth: Math.min(520, r.contentMaxWidth),
      alignSelf: 'center' as const,
    };
  }, [r.isTablet, r.contentMaxWidth]);

  const iconSize = r.isTablet ? 120 : 150;

  const updateQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(0, Math.round((i.quantity + delta) * 10) / 10) } : i,
      ),
    );
  };

  const reset = () => {
    setStep(1);
    setRating(0);
    setComment('');
    setReason('');
    setOtherReason('');
    setIsPartial(false);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleGoHome = () => {
    handleClose();
    navigation.navigate('Home');
  };

  const submitRating = async () => {
    if (!claimId || rating < 1) {
      setStep(5);
      return;
    }

    setSubmitting(true);
    try {
      const noteParts = [
        comment.trim() || null,
        isPartial ? `Partial collection (~${totalKg} kg)` : null,
      ].filter(Boolean);

      await claimsService.rateClaim(claimId, {
        rating,
        ratingNote: noteParts.length ? noteParts.join(' · ') : undefined,
      });
      showSuccessAlert('Thanks for your feedback', 'Feedback sent');
      onSubmitted?.();
      setStep(5);
    } catch (error) {
      // Claim may still be CONFIRMED — mark collected with the rating instead.
      try {
        await claimsService.markClaimCollected(claimId, {
          rating,
          ratingNote: comment.trim() || undefined,
        });
        showSuccessAlert('Collection confirmed. Thanks for your feedback.', 'Done');
        onSubmitted?.();
        setStep(5);
      } catch (inner) {
        showErrorAlert(
          inner,
          'Could not submit feedback',
          getUserFriendlyErrorMessage(inner, 'Could not submit feedback. Please try again.'),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const submitNotCollected = async () => {
    if (!claimId) {
      setStep(7);
      return;
    }

    setSubmitting(true);
    try {
      const note = reason === 'Other' ? otherReason.trim() || reason : reason;
      await claimsService.cancelClaim(claimId);
      showSuccessAlert(
        note ? `Pickup cancelled: ${note}` : 'Pickup cancelled',
        'Updated',
      );
      onSubmitted?.();
      setStep(7);
    } catch (error) {
      // Already collected claims cannot be cancelled — record the note as feedback.
      try {
        await claimsService.rateClaim(claimId, {
          rating: 1,
          ratingNote: `Not collected: ${reason === 'Other' ? otherReason || 'Other' : reason}`,
        });
        onSubmitted?.();
        setStep(7);
      } catch (inner) {
        showErrorAlert(
          inner,
          'Could not update pickup',
          getUserFriendlyErrorMessage(inner, 'Could not update this pickup. Please try again.'),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reasons = [
    'Pickup expired',
    'Location issue',
    'Food unavailable',
    'Too far',
    'Other',
  ];

  const canSubmitRating = rating > 0;

  const questionIcon = (
    <Image
      source={require('../../../../assets/placeholder/bowl.png')}
      style={[styles.questionIcon, { width: iconSize, height: iconSize }]}
    />
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.overlay, r.isTablet && { paddingHorizontal: r.pagePadH }]}>
        <View style={[styles.card, cardStyle]}>
          <Pressable style={styles.closeIcon} onPress={handleClose}>
            <Ionicons name="close" size={normalize(22)} color={palette.black} />
          </Pressable>
          <ScrollView contentContainerStyle={styles.content}>
            {step === 1 && (
              <>
                {questionIcon}
                <AppText variant="label" style={styles.title}>
                  {businessName
                    ? `Did you collect from ${businessName}?`
                    : 'Did you collect the food?'}
                </AppText>

                <View style={styles.row}>
                  <Pressable style={styles.primaryBtn} onPress={() => setStep(2)}>
                    <AppText variant="label" style={styles.primaryText}>
                      Yes
                    </AppText>
                  </Pressable>

                  <Pressable style={styles.secondaryBtn} onPress={() => setStep(6)}>
                    <AppText variant="label">No</AppText>
                  </Pressable>
                </View>
              </>
            )}

            {step === 2 && (
              <>
                {questionIcon}
                <AppText variant="subheading" style={styles.title}>
                  Was it full or partial?
                </AppText>

                <View style={styles.row}>
                  <Pressable
                    style={styles.primaryBtn}
                    onPress={() => {
                      setIsPartial(false);
                      setStep(4);
                    }}
                  >
                    <AppText variant="label" style={styles.primaryText}>
                      Full
                    </AppText>
                  </Pressable>

                  <Pressable
                    style={styles.secondaryBtn}
                    onPress={() => {
                      setIsPartial(true);
                      setStep(3);
                    }}
                  >
                    <AppText variant="label">Partial</AppText>
                  </Pressable>
                </View>
              </>
            )}

            {step === 3 && (
              <>
                {questionIcon}
                <AppText variant="subheading" style={styles.title}>
                  Adjust collected items
                </AppText>

                {items.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <AppText variant="bodySmall" style={{ flex: 1 }}>
                      {item.name}
                    </AppText>

                    <View style={styles.counter}>
                      <Pressable onPress={() => updateQty(item.id, -0.5)}>
                        <Ionicons name="remove" size={normalize(18)} />
                      </Pressable>

                      <AppText variant="label">{item.quantity} kg</AppText>

                      <Pressable onPress={() => updateQty(item.id, 0.5)}>
                        <Ionicons name="add" size={normalize(18)} />
                      </Pressable>
                    </View>
                  </View>
                ))}

                <AppText variant="label" style={styles.total}>
                  Total: {Math.round(totalKg * 100) / 100} kg
                </AppText>

                <Pressable style={styles.primaryBtn} onPress={() => setStep(4)}>
                  <AppText variant="label" style={styles.primaryText}>
                    Continue
                  </AppText>
                </Pressable>
              </>
            )}

            {step === 4 && (
              <>
                {questionIcon}
                <AppText variant="subheading" style={styles.title}>
                  How would you rate this surplus?
                </AppText>

                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((num) => {
                    const selected = rating >= num;

                    return (
                      <Pressable key={num} onPress={() => setRating(num)}>
                        <View style={styles.appleWrapper}>
                          <AppText
                            style={[styles.apple, selected && styles.appleSelected]}
                          >
                            🍎
                          </AppText>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <TextInput
                  placeholder="Add comments (optional)"
                  value={comment}
                  onChangeText={setComment}
                  style={styles.input}
                />

                <Pressable
                  style={[styles.primaryBtn, (!canSubmitRating || submitting) && { opacity: 0.5 }]}
                  disabled={!canSubmitRating || submitting}
                  onPress={() => void submitRating()}
                >
                  {submitting ? (
                    <ActivityIndicator color={palette.white} />
                  ) : (
                    <AppText variant="label" style={styles.primaryText}>
                      Submit
                    </AppText>
                  )}
                </Pressable>
              </>
            )}

            {step === 5 && (
              <>
                {questionIcon}
                <AppText variant="subheading" style={styles.title}>
                  You made a difference
                </AppText>

                <AppText variant="bodyLarge" style={styles.success}>
                  You helped reduce food waste and supported your community today.
                </AppText>

                <Pressable style={styles.primaryBtn} onPress={handleGoHome}>
                  <AppText variant="label" style={styles.primaryText}>
                    Go To Home Screen
                  </AppText>
                </Pressable>
              </>
            )}

            {step === 6 && (
              <>
                {questionIcon}
                <AppText variant="subheading" style={styles.title}>
                  Reason for Not Collecting
                </AppText>

                {reasons.map((reasonLabel) => {
                  const selected = reason === reasonLabel;

                  return (
                    <Pressable
                      key={reasonLabel}
                      style={styles.radioRow}
                      onPress={() => setReason(reasonLabel)}
                    >
                      <View style={styles.radioOuter}>
                        {selected && <View style={styles.radioInner} />}
                      </View>
                      <AppText variant="bodyLarge">{reasonLabel}</AppText>
                    </Pressable>
                  );
                })}

                {reason === 'Other' && (
                  <TextInput
                    placeholder="Please specify"
                    value={otherReason}
                    onChangeText={setOtherReason}
                    style={styles.input}
                  />
                )}

                <Pressable
                  style={[styles.primaryBtn, (!reason || submitting) && { opacity: 0.5 }]}
                  disabled={!reason || submitting}
                  onPress={() => void submitNotCollected()}
                >
                  {submitting ? (
                    <ActivityIndicator color={palette.white} />
                  ) : (
                    <AppText variant="label" style={styles.primaryText}>
                      Submit
                    </AppText>
                  )}
                </Pressable>
              </>
            )}

            {step === 7 && (
              <>
                {questionIcon}
                <AppText variant="subheading" style={styles.title}>
                  You tried to help
                </AppText>

                <AppText variant="bodyLarge" style={styles.success}>
                  Keep looking for new listings and continue making an impact.
                </AppText>

                <Pressable style={styles.primaryBtn} onPress={handleGoHome}>
                  <AppText variant="label" style={styles.primaryText}>
                    Go To Home Screen
                  </AppText>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
    padding: spacing.lg,
    maxHeight: '88%',
  },
  closeIcon: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  questionIcon: {
    alignSelf: 'center',
    resizeMode: 'contain',
  },
  title: {
    textAlign: 'center',
    textTransform: 'none',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: palette.kale,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryText: {
    color: palette.white,
    textTransform: 'none',
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: palette.kale,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.strokecream,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  total: {
    textAlign: 'center',
    textTransform: 'none',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  appleWrapper: {
    padding: 4,
  },
  apple: {
    fontSize: normalize(28),
    opacity: 0.35,
  },
  appleSelected: {
    opacity: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.strokecream,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(14),
  },
  success: {
    textAlign: 'center',
    textTransform: 'none',
    color: palette.stone,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.kale,
  },
});
