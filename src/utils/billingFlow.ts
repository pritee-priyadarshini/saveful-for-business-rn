import { AppState, type AppStateStatus } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { useSubscriptionStore } from '@/store/subscriptionStore';

/**
 * Result of a Stripe-hosted session.
 * - `activated`  entitlement confirmed after the webhook landed
 * - `pending`    the user returned but the webhook has not been processed yet
 * - `dismissed`  the sheet was closed without any entitlement change
 */
export type BillingSessionOutcome = 'activated' | 'pending' | 'dismissed';

/** Stripe's webhook usually lands within a couple of seconds of checkout. */
const POLL_ATTEMPTS = 5;
const POLL_DELAY_MS = 2000;

/** Guards against a leaked AppState listener if the browser never opens. */
const MAX_SESSION_MS = 10 * 60 * 1000;

function waitForReturnToForeground(): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sub.remove();
      resolve();
    };

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') finish();
    });

    const timer = setTimeout(finish, MAX_SESSION_MS);
  });
}

/**
 * Opens a Stripe-hosted page and resolves once the user is back in the app.
 *
 * iOS resolves the browser promise on dismiss, but Android Custom Tabs resolve
 * with `opened` the moment the tab launches — so foreground return is what we
 * actually wait on there.
 */
export async function openBillingSession(url: string): Promise<void> {
  if (!url) throw new Error('Missing billing URL');

  const result = await WebBrowser.openBrowserAsync(url, {
    enableBarCollapsing: true,
    showTitle: true,
  });

  if (result.type === 'opened') {
    await waitForReturnToForeground();
  }
}

/**
 * Runs a Stripe Checkout session and reports whether the organisation actually
 * came back on the plan it paid for. Entitlement is written by the Stripe
 * webhook, not by the redirect, so the app polls rather than trusting the
 * browser closing.
 */
export async function runCheckoutSession(
  url: string,
  planId?: number | null,
): Promise<BillingSessionOutcome> {
  const before = useSubscriptionStore.getState().entitlements;

  await openBillingSession(url);

  // A paid subscription lands as ACTIVE; a trial that was just paid for moves
  // off TRIALING onto the purchased plan.
  const isPurchased = (ent: typeof before) => {
    if (!ent?.entitled) return false;
    if (planId != null && ent.planId !== planId) return false;
    if (!before?.entitled) return true;
    return ent.planId !== before.planId || ent.status !== before.status;
  };

  const latest = await useSubscriptionStore.getState().waitForEntitlement({
    attempts: POLL_ATTEMPTS,
    delayMs: POLL_DELAY_MS,
    isSatisfied: isPurchased,
  });

  if (isPurchased(latest)) return 'activated';
  if (latest?.entitled && before?.entitled) return 'dismissed';
  return 'pending';
}

/**
 * Billing portal returns can change plan, card or cancellation state, so the
 * entitlement is refreshed once the user comes back.
 */
export async function runPortalSession(url: string): Promise<void> {
  await openBillingSession(url);
  await useSubscriptionStore.getState().fetchEntitlements(true);
}
