import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import {
  selectPendingPlanChange,
  useSubscriptionStore,
} from '@/store/subscriptionStore';
import { billingCycleLabel, formatBillingDate } from '@/utils/billingHelpers';
import { getBillingErrorMessage } from '@/utils/billingErrors';
import { showConfirmAlert } from '@/store/appAlertStore';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';

type Props = {
  /** Hidden for non-admins, who cannot act on it. */
  canManageBilling?: boolean;
};

/**
 * A downgrade does not apply until the paid period closes, so the org needs to
 * see what is coming and be able to back out of it.
 */
export function PendingPlanChangeBanner({ canManageBilling = true }: Props) {
  const pending = useSubscriptionStore(selectPendingPlanChange);
  const cancelPendingPlanChange = useSubscriptionStore((s) => s.cancelPendingPlanChange);
  const [cancelling, setCancelling] = useState(false);

  if (!pending) return null;

  const effective = formatBillingDate(pending.effectiveAt);
  const planName = pending.planDisplayName ?? 'your new plan';
  const cycle = billingCycleLabel(pending.billingCycle);

  const onCancel = () => {
    showConfirmAlert({
      title: 'Keep current plan?',
      message: `This cancels the scheduled move to ${planName}. You stay on your current plan and nothing changes.`,
      confirmLabel: 'Keep current plan',
      cancelLabel: 'Back',
      onConfirm: async () => {
        setCancelling(true);
        try {
          showSuccessAlert(await cancelPendingPlanChange(), 'Change cancelled');
        } catch (error) {
          showErrorAlert(
            error,
            'Could not cancel',
            getBillingErrorMessage(error, 'We could not cancel the scheduled change.'),
          );
        } finally {
          setCancelling(false);
        }
      },
    });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="time-outline" size={normalize(16)} color={palette.eggplant} />
        </View>
        <View style={styles.copy}>
          <AppText variant="bodyBold" style={styles.title}>
            Plan change scheduled
          </AppText>
          <AppText style={styles.body}>
            You move to {planName} ({cycle})
            {effective ? ` on ${effective}` : ' at the end of this billing period'}. Nothing
            is charged before then.
          </AppText>
        </View>
      </View>

      {canManageBilling ? (
        <Pressable
          style={styles.cancelBtn}
          onPress={onCancel}
          disabled={cancelling}
          accessibilityRole="button"
        >
          {cancelling ? (
            <ActivityIndicator size="small" color={palette.eggplant} />
          ) : (
            <AppText style={styles.cancelText}>Keep my current plan</AppText>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#F6EEFC',
    borderWidth: 1,
    borderColor: '#E0CDEF',
    borderRadius: normalize(14),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.4),
    gap: hp(1),
  },
  headerRow: {
    flexDirection: 'row',
    gap: wp(2.5),
  },
  iconWrap: {
    width: normalize(30),
    height: normalize(30),
    borderRadius: normalize(15),
    backgroundColor: '#EADCF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: hp(0.3),
  },
  title: {
    color: palette.eggplant,
    fontSize: normalize(14),
    textTransform: 'none',
  },
  body: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(12),
    color: palette.midgray,
    textTransform: 'none',
    lineHeight: normalize(17),
  },
  cancelBtn: {
    alignSelf: 'flex-start',
    minHeight: normalize(34),
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: palette.eggplant,
    borderRadius: normalize(20),
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.5),
  },
  cancelText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(12),
    color: palette.eggplant,
    textTransform: 'none',
  },
});
