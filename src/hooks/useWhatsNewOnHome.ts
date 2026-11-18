import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { useAppContext } from '@/store/AppContext';
import { useMilestoneStore } from '@/store/milestoneStore';
import { useWhatsNewStore } from '@/store/whatsNewStore';
import { isBusinessRole } from '@/utils/consolidated';

/**
 * Opens "What's new" once per release, from a business account's Home tab:
 * restaurant_single (RestaurantHomeScreen) and restaurant_multi (ManageSitesScreen).
 * Waits for Home to settle, and never opens on top of the milestone popup.
 */
export function useWhatsNewOnHome() {
  const { selectedRole } = useAppContext();
  const hydrated = useWhatsNewStore((state) => state.hydrated);
  const eligible = isBusinessRole(selectedRole);

  useFocusEffect(
    useCallback(() => {
      if (!eligible || !hydrated) return undefined;
      const timer = setTimeout(() => {
        if (useMilestoneStore.getState().visibleKind) return;
        useWhatsNewStore.getState().showIfNew();
      }, 1200);
      return () => clearTimeout(timer);
    }, [eligible, hydrated]),
  );
}
