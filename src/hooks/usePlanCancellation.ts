import { useCallback } from 'react';

import { useSubscriptionStore } from '@/store/subscriptionStore';
import { formatBillingDate } from '@/utils/billingHelpers';
import { getBillingErrorMessage } from '@/utils/billingErrors';
import { showConfirmAlert } from '@/store/appAlertStore';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';

/**
 * Cancelling and un-cancelling a plan, shared by every screen that shows the
 * current subscription.
 *
 * Cancellation is deferred: the organisation keeps everything it paid for until
 * the period closes, which is why the confirmation says so and why resuming
 * before that date is just clearing a flag.
 */
export function usePlanCancellation() {
  const entitlements = useSubscriptionStore((s) => s.entitlements);
  const cancelSubscription = useSubscriptionStore((s) => s.cancelSubscription);
  const resumeSubscription = useSubscriptionStore((s) => s.resumeSubscription);
  const isMutating = useSubscriptionStore((s) => s.isMutating);

  const isTrialing = String(entitlements?.status ?? '').toUpperCase() === 'TRIALING';
  const accessUntilLabel = formatBillingDate(
    isTrialing ? entitlements?.trialEndsAt : entitlements?.currentPeriodEnd,
  );

  const isCancelled = Boolean(entitlements?.cancelAtPeriodEnd);
  const canCancel = Boolean(entitlements?.entitled) && !isCancelled;
  const canResume = Boolean(entitlements?.entitled) && isCancelled;

  const cancelPlan = useCallback(() => {
    showConfirmAlert({
      title: 'Cancel your plan?',
      message: isTrialing
        ? `Your free trial will end${
            accessUntilLabel ? ` on ${accessUntilLabel}` : ''
          } and you will not be charged. You keep full access until then.`
        : `You keep full access until ${
            accessUntilLabel ?? 'the end of your current billing period'
          }, and you will not be charged again. You can undo this any time before that date.`,
      confirmLabel: 'Cancel plan',
      cancelLabel: 'Keep my plan',
      destructive: true,
      onConfirm: async () => {
        try {
          showSuccessAlert(await cancelSubscription(), 'Plan cancelled');
        } catch (error) {
          showErrorAlert(
            error,
            'Could not cancel',
            getBillingErrorMessage(error, 'We could not cancel your plan. Please try again.'),
          );
        }
      },
    });
  }, [accessUntilLabel, cancelSubscription, isTrialing]);

  const resumePlan = useCallback(() => {
    showConfirmAlert({
      title: 'Keep your plan?',
      message: accessUntilLabel
        ? `Your plan will continue as normal and bill again on ${accessUntilLabel}.`
        : 'Your plan will continue as normal and bill again on its usual date.',
      confirmLabel: 'Resume plan',
      cancelLabel: 'Back',
      onConfirm: async () => {
        try {
          showSuccessAlert(await resumeSubscription(), 'Plan resumed');
        } catch (error) {
          showErrorAlert(
            error,
            'Could not resume',
            getBillingErrorMessage(error, 'We could not resume your plan. Please try again.'),
          );
        }
      },
    });
  }, [accessUntilLabel, resumeSubscription]);

  return {
    cancelPlan,
    resumePlan,
    canCancel,
    canResume,
    isCancelled,
    accessUntilLabel,
    busy: isMutating,
  };
}
