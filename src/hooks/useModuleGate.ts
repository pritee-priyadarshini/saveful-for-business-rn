import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';

import type { ProductModule } from '@/services/subscriptions.service';
import { useAppContext } from '@/store/AppContext';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { canAccessSubscription } from '@/utils/subscriptionAccess';
import { isModuleLocked, isModuleOffered } from '@/utils/moduleAccess';

export type ModuleGate = {
  /** The org's plan lacks this module. Opening it shows an upsell instead. */
  locked: boolean;
  /**
   * Locked and not sold to this kind of organisation (Make Food Count for a
   * farm) — hide its entry points rather than advertise something unavailable.
   */
  hidden: boolean;
  /** Runs `onAllowed` when the module is available, otherwise opens the upsell. */
  requireModule: (onAllowed: () => void) => void;
};

/**
 * Module access for the signed-in organisation (Make Food Count, Saveful
 * Connect). Only billable roles are ever locked, and never while entitlements
 * are loading — a slow fetch must not flash an upsell; the API still refuses a
 * write with 402 MODULE_REQUIRED if it gets that far.
 */
export function useModuleGate(module: ProductModule): ModuleGate {
  const navigation = useNavigation<any>();
  const { selectedRole } = useAppContext();
  const entitlements = useSubscriptionStore((s) => s.entitlements);

  const locked = canAccessSubscription(selectedRole) && isModuleLocked(entitlements, module);
  const hidden = locked && !isModuleOffered(selectedRole, module);

  const requireModule = useCallback(
    (onAllowed: () => void) => {
      if (!locked) {
        onAllowed();
        return;
      }
      navigation.navigate('ModuleUpsell', { module });
    },
    [locked, module, navigation],
  );

  return { locked, hidden, requireModule };
}
