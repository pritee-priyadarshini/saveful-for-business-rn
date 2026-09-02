import type { UserRole } from '@/types';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { showConfirmAlert } from '@/store/appAlertStore';

/** Roles that can open a subscription / plans flow. */
export function canAccessSubscription(role: UserRole | null | undefined): boolean {
  return (
    role === 'restaurant_single' ||
    role === 'restaurant_multi' ||
    role === 'farm_business'
  );
}

/**
 * The plans screens a role can be sent to. Narrower than `keyof
 * RootStackParamList` so `navigate(route)` resolves — the wider type made every
 * call site ambiguous across screens with required params.
 */
export type SubscriptionRoute = Extract<
  keyof RootStackParamList,
  'SingleSitePlans' | 'MultiSitePlans'
>;

/**
 * Resolve which plans screen a role should open.
 * - restaurant multi → multi-site plans
 * - restaurant single + farmer producer → single-site plans
 * - charity / farmer consumer → none
 */
export function getSubscriptionRoute(
  role: UserRole | null | undefined,
): SubscriptionRoute | null {
  if (role === 'restaurant_multi') return 'MultiSitePlans';
  if (role === 'restaurant_single' || role === 'farm_business') return 'SingleSitePlans';
  return null;
}

export const SUBSCRIPTION_REQUIRED_TITLE = 'Organisation plan';

export function getSubscriptionRequiredMessage(canManageBilling: boolean): string {
  if (canManageBilling) {
    return (
      'Plans are managed on the Saveful website. Log in to your organisation account there to activate or update the plan.'
    );
  }
  return (
    'This organisation needs activation. Ask your organisation admin to update the plan on the Saveful website.'
  );
}

/** Dismiss-only prompt when a billable org is not entitled. No checkout navigation. */
export function showSubscriptionRequiredPrompt(options: {
  canManageBilling: boolean;
  /** Ignored — plans are not sold in the app. Kept so existing call sites still type-check. */
  onContinue?: () => void;
  messageOverride?: string;
}) {
  showConfirmAlert({
    title: SUBSCRIPTION_REQUIRED_TITLE,
    message: options.messageOverride?.trim() || getSubscriptionRequiredMessage(options.canManageBilling),
    confirmLabel: 'OK',
    cancelLabel: '',
    onConfirm: () => undefined,
  });
}
