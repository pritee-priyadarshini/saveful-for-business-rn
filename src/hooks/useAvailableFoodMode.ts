import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { areDeviceNotificationsOn } from '@/services/pushNotifications';

export type AvailableFoodMode = 'push' | 'nearby_fallback';

/**
 * Gates Available Food: push-primary when OS notifications are granted,
 * nearby fallback when denied / undetermined / unavailable.
 */
export function useAvailableFoodMode() {
  const [notificationsOn, setNotificationsOn] = useState<boolean | null>(null);

  const refreshPermissionState = useCallback(async () => {
    const on = await areDeviceNotificationsOn();
    setNotificationsOn(on);
    return on;
  }, []);

  useEffect(() => {
    void refreshPermissionState();

    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        void refreshPermissionState();
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [refreshPermissionState]);

  return {
    loading: notificationsOn === null,
    mode: (notificationsOn ? 'push' : 'nearby_fallback') as AvailableFoodMode,
    notificationsOn: notificationsOn === true,
    refreshPermissionState,
  };
}
