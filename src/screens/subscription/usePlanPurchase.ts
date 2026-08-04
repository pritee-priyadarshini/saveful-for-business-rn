import { useCallback, useEffect, useState } from 'react';

import type { ChangePlanPreview } from '@/services/billing.service';
import type { AvailablePlan } from '@/services/subscriptions.service';
import type { BillingCycle } from '@/screens/subscription/singleSitePlans';
import {
  selectHasLiveSubscription,
  selectIsKnownNonBillingAdmin,
  useSubscriptionStore,
} from '@/store/subscriptionStore';
import { runCheckoutSession } from '@/utils/billingFlow';
import {
  billingCycleLabel,
  findPlanById,
  formatBillingDate,
  formatPlanPrice,
  fromApiBillingCycle,
  getPlanRelation,
  toApiBillingCycle,
  type PlanRelation,
} from '@/utils/billingHelpers';
import {
  getBillingErrorMessage,
  isAlreadyOnPlanError,
  isNoActiveSubscriptionError,
  isPlanChangeRequiredError,
  isTrialAlreadyUsedError,
} from '@/utils/billingErrors';
import { showConfirmAlert } from '@/store/appAlertStore';
import { showErrorAlert, showInfoAlert, showSuccessAlert } from '@/utils/apiError';

type Selection = {
  plan: AvailablePlan | null;
  billingCycle: BillingCycle;
};

type RunArgs = Selection & {
  plan: AvailablePlan;
  /** Unwind the subscription stack once the org is on a plan. */
  onSettled: () => void;
};

/**
 * The whole purchase decision tree, shared by the single- and multi-site confirm
 * screens so the two cannot drift apart.
 *
 * An org without a Stripe subscription goes through Checkout — as a trial when
 * one is still available, otherwise paid. An org that already has one switches
 * plans instead, because a second Checkout would bill it twice. The client only
 * guesses which case applies; the backend answers with a 409 either way and both
 * paths recover by handing off to the other.
 */
export function usePlanPurchase(selection?: Selection) {
  const startTrial = useSubscriptionStore((s) => s.startTrial);
  const startCheckout = useSubscriptionStore((s) => s.startCheckout);
  const changePlan = useSubscriptionStore((s) => s.changePlan);
  const previewPlanChange = useSubscriptionStore((s) => s.previewPlanChange);
  const entitlements = useSubscriptionStore((s) => s.entitlements);
  const plans = useSubscriptionStore((s) => s.plans);
  const isMutating = useSubscriptionStore((s) => s.isMutating);
  const hasLiveSubscription = useSubscriptionStore(selectHasLiveSubscription);

  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [preview, setPreview] = useState<ChangePlanPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const blockedFromBilling = selectIsKnownNonBillingAdmin();
  const trialAvailable = Boolean(entitlements?.freeTrialAvailable) && !hasLiveSubscription;

  const currentPlan = findPlanById(
    plans,
    entitlements?.entitled ? entitlements.planId : null,
  );
  const currentCycle = fromApiBillingCycle(entitlements?.billingCycle);

  const selectedPlan = selection?.plan ?? null;
  const selectedCycle = selection?.billingCycle ?? currentCycle;

  const relation: PlanRelation = selectedPlan
    ? getPlanRelation({
        plan: selectedPlan,
        currentPlan,
        targetCycle: selectedCycle,
        currentCycle,
      })
    : 'NEW';

  const isPlanChange = hasLiveSubscription && relation !== 'NEW';
  /** Same plan and same cycle — there is nothing for the backend to change. */
  const isCurrentSelection = isPlanChange && relation === 'CURRENT';

  /**
   * Stripe decides what a switch actually costs, so the amount shown before the
   * user commits is fetched rather than derived from the plan's list price.
   */
  useEffect(() => {
    if (!isPlanChange || isCurrentSelection || !selectedPlan) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    void previewPlanChange(selectedPlan.id, toApiBillingCycle(selectedCycle))
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch(() => {
        // Falling back to list pricing is better than blocking the screen.
        if (!cancelled) setPreview(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    isPlanChange,
    isCurrentSelection,
    selectedPlan,
    selectedCycle,
    previewPlanChange,
  ]);

  /** Opens Stripe Checkout and reports what happened once the user returns. */
  const runCheckoutFlow = useCallback(
    async ({ plan, billingCycle, onSettled }: RunArgs) => {
      const apiCycle = toApiBillingCycle(billingCycle);
      let checkoutUrl: string;

      try {
        checkoutUrl = trialAvailable
          ? await startTrial(plan.id, apiCycle)
          : await startCheckout(plan.id, apiCycle);
      } catch (error) {
        // The trial was already consumed — go straight to paid checkout.
        if (trialAvailable && isTrialAlreadyUsedError(error)) {
          checkoutUrl = await startCheckout(plan.id, apiCycle);
        } else {
          throw error;
        }
      }

      setConfirmingPayment(true);
      const outcome = await runCheckoutSession(checkoutUrl, plan.id);
      setConfirmingPayment(false);

      if (outcome === 'activated') {
        showSuccessAlert(
          trialAvailable
            ? `Your 30-day free trial of ${plan.displayName} has started. Your card will not be charged until it ends.`
            : `${plan.displayName} is now active for your organisation.`,
          trialAvailable ? 'Trial started' : 'Payment confirmed',
          onSettled,
        );
        return;
      }

      if (outcome === 'dismissed') {
        onSettled();
        return;
      }

      showInfoAlert(
        'We have not received confirmation from Stripe yet. If you completed checkout, ' +
          'your plan will activate automatically within a few moments.',
        'Awaiting confirmation',
      );
    },
    [startCheckout, startTrial, trialAvailable],
  );

  /** Previews the proration, confirms with the user, then applies the switch. */
  const runPlanChangeFlow = useCallback(
    async ({ plan, billingCycle, onSettled }: RunArgs) => {
      const apiCycle = toApiBillingCycle(billingCycle);
      const quote =
        preview && preview.planDisplayName === plan.displayName
          ? preview
          : await previewPlanChange(plan.id, apiCycle);

      const recurring = `${formatPlanPrice(quote.recurringAmount, quote.currency)} ${billingCycleLabel(
        quote.billingCycle,
      )}`;
      const effective = formatBillingDate(quote.effectiveAt);
      const nextBilling = formatBillingDate(quote.nextBillingDate);

      const message =
        quote.direction === 'UPGRADE'
          ? `You'll be charged ${formatPlanPrice(quote.amountDueToday, quote.currency)} today — ` +
            `the cost of ${quote.planDisplayName} less credit for the unused part of your current plan.\n\n` +
            `${quote.planDisplayName} then renews at ${recurring}` +
            (nextBilling ? ` from ${nextBilling}.` : '.')
          : `Nothing is charged today. You keep your current plan until ` +
            `${effective ?? 'the end of this billing period'}, then move to ` +
            `${quote.planDisplayName} at ${recurring}.`;

      showConfirmAlert({
        title: quote.direction === 'UPGRADE' ? 'Confirm upgrade' : 'Confirm plan change',
        message,
        confirmLabel: quote.direction === 'UPGRADE' ? 'Upgrade now' : 'Schedule change',
        onConfirm: async () => {
          try {
            const result = await changePlan(plan.id, apiCycle);
            showSuccessAlert(
              result.message,
              result.type === 'UPGRADED' ? 'Plan upgraded' : 'Change scheduled',
              onSettled,
            );
          } catch (error) {
            showErrorAlert(
              error,
              'Could not change plan',
              getBillingErrorMessage(error, 'We could not change your plan. Please try again.'),
            );
          }
        },
      });
    },
    [changePlan, preview, previewPlanChange],
  );

  const purchase = useCallback(
    async (args: RunArgs) => {
      if (blockedFromBilling) {
        showErrorAlert(
          null,
          'Admin required',
          'Only an organisation admin can start a trial, checkout or plan change.',
        );
        return;
      }

      setPreparing(true);
      try {
        if (hasLiveSubscription) {
          try {
            await runPlanChangeFlow(args);
          } catch (error) {
            // Local status said live but Stripe disagrees — start fresh instead.
            if (isNoActiveSubscriptionError(error)) {
              await runCheckoutFlow(args);
              return;
            }
            throw error;
          }
          return;
        }

        try {
          await runCheckoutFlow(args);
        } catch (error) {
          // Already subscribed — a second checkout would double-bill, so switch.
          if (isPlanChangeRequiredError(error)) {
            await runPlanChangeFlow(args);
            return;
          }
          throw error;
        }
      } catch (error) {
        if (isAlreadyOnPlanError(error)) {
          showInfoAlert(
            getBillingErrorMessage(error, 'You are already on this plan.'),
            'No change needed',
          );
          return;
        }
        showErrorAlert(
          error,
          'Could not continue',
          getBillingErrorMessage(error, 'We could not complete this request. Please try again.'),
        );
      } finally {
        setConfirmingPayment(false);
        setPreparing(false);
      }
    },
    [blockedFromBilling, hasLiveSubscription, runCheckoutFlow, runPlanChangeFlow],
  );

  const cycleWord = selectedCycle === 'annual' ? 'annual' : 'monthly';
  const isSameTier = Boolean(selectedPlan && currentPlan && selectedPlan.id === currentPlan.id);

  const primaryLabel = confirmingPayment
    ? 'Confirming payment…'
    : isCurrentSelection
      ? "You're on this plan"
      : isPlanChange
        ? isSameTier
          ? `Switch to ${cycleWord} billing`
          : relation === 'UPGRADE'
            ? 'Upgrade to this plan'
            : 'Switch to this plan'
        : trialAvailable
          ? 'Start Free 30 Day Trial'
          : 'Continue to checkout';

  return {
    purchase,
    primaryLabel,
    trialAvailable,
    hasLiveSubscription,
    blockedFromBilling,
    relation,
    isPlanChange,
    /** Nothing would change, so the CTA should not be actionable. */
    isCurrentSelection,
    preview,
    previewLoading,
    busy: isMutating || confirmingPayment || preparing,
    confirmingPayment,
  };
}
