import { useCallback } from 'react';

import type { AvailablePlan } from '@/services/subscriptions.service';
import type { PlanCardAction } from '@/components/plans/ModulePlanCard';
import {
  selectHasLiveSubscription,
  selectIsKnownNonBillingAdmin,
  useSubscriptionStore,
} from '@/store/subscriptionStore';
import {
  fromApiBillingCycle,
  getPlanRelation,
  planCtaLabel,
  resolveCurrentPlanRef,
} from '@/utils/billingHelpers';
import type { BillingCycle } from './singleSitePlans';

/**
 * Works out each plan card's button for the cycle being viewed: start a trial
 * or subscription, add the other module, switch, or "Your current plan". The
 * same plan-relation rules as the confirm screen and the backend, so a card
 * never promises something checkout will not do.
 */
export function usePlanCardActions(params: {
  cycle: BillingCycle;
  onChoose: (plan: AvailablePlan) => void;
  onContactSales?: () => void;
}) {
  const { cycle, onChoose, onContactSales } = params;
  const plans = useSubscriptionStore((s) => s.plans);
  const entitlements = useSubscriptionStore((s) => s.entitlements);
  const hasLiveSubscription = useSubscriptionStore(selectHasLiveSubscription);
  const blockedFromBilling = selectIsKnownNonBillingAdmin();

  // May be a legacy plan that is no longer listed — see resolveCurrentPlanRef.
  const currentPlan = resolveCurrentPlanRef(plans, entitlements);
  const currentCycle = fromApiBillingCycle(entitlements?.billingCycle);

  const isCurrentPlan = useCallback(
    (plan: AvailablePlan) => currentPlan != null && currentPlan.id === plan.id,
    [currentPlan],
  );

  const actionFor = useCallback(
    (plan: AvailablePlan): PlanCardAction => {
      if (plan.contactSalesOnly) {
        return { label: 'Talk to Sales Team', onPress: () => onContactSales?.() };
      }

      const relation = hasLiveSubscription
        ? getPlanRelation({ plan, currentPlan, targetCycle: cycle, currentCycle })
        : 'NEW';

      if (relation === 'CURRENT') {
        return { label: 'Your current plan', onPress: () => undefined, disabled: true };
      }

      const label =
        currentPlan && plan.id === currentPlan.id
          ? `Switch to ${cycle} billing`
          : planCtaLabel(plan, {
              relation,
              currentPlan,
              trialAvailable: plan.trialAvailable && !hasLiveSubscription,
            });

      const hint =
        relation === 'UPGRADE'
          ? 'Applies today'
          : relation === 'DOWNGRADE' || relation === 'SWITCH'
            ? 'Applies at your next renewal'
            : null;

      return {
        label,
        hint,
        // Only the organisation's Super Admin can buy or change a plan.
        disabled: blockedFromBilling,
        onPress: () => onChoose(plan),
      };
    },
    [blockedFromBilling, currentCycle, currentPlan, cycle, hasLiveSubscription, onChoose, onContactSales],
  );

  return { actionFor, isCurrentPlan, currentPlan, currentCycle, blockedFromBilling };
}
