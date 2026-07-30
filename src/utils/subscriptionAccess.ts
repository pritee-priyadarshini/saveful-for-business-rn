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
 * Resolve which plans screen a role should open.
 * - restaurant multi → multi-site plans
 * - restaurant single + farmer producer → single-site plans
 * - charity / farmer consumer → none
 */
export function getSubscriptionRoute(
  role: UserRole | null | undefined,
): keyof RootStackParamList | null {
  if (role === 'restaurant_multi') return 'MultiSitePlans';
  if (role === 'restaurant_single' || role === 'farm_business') return 'SingleSitePlans';
  return null;
}

export const SUBSCRIPTION_REQUIRED_TITLE = 'Activate your workspace';

export function getSubscriptionRequiredMessage(canManageBilling: boolean): string {
  if (canManageBilling) {
    return (
      'Your organisation does not have an active plan yet. ' +
      'Start a free 30-day trial or choose a plan to create listings, invite your team, and track impact.'
    );
  }
  return (
    'Your organisation does not have an active plan yet. ' +
    'Ask your organisation admin to activate a plan so you can keep working without interruption.'
  );
}

/** Professional prompt used on app open and when write APIs return 402. */
export function showSubscriptionRequiredPrompt(options: {
  canManageBilling: boolean;
  onContinue: () => void;
  messageOverride?: string;
}) {
  showConfirmAlert({
    title: SUBSCRIPTION_REQUIRED_TITLE,
    message: options.messageOverride?.trim() || getSubscriptionRequiredMessage(options.canManageBilling),
    confirmLabel: options.canManageBilling ? 'Continue' : 'View plans',
    cancelLabel: 'Not now',
    onConfirm: options.onContinue,
  });
}
