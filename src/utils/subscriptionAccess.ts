import type { UserRole } from '@/types';
import type { RootStackParamList } from '@/navigation/AppNavigator';

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
