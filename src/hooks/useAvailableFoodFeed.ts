import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  useAvailableFoodMode,
  type AvailableFoodMode,
} from '@/hooks/useAvailableFoodMode';
import {
  isFoodListingNotification,
  subscribeNotificationReceived,
} from '@/services/pushNotifications';
import { clearListingDetailCache } from '@/services/foodListing.service';
import type { DiscoverAudience } from '@/services/foodListing.service';
import { useDiscoverStore } from '@/store/discoverStore';
import { useAppContext } from '@/store/AppContext';
import { showErrorAlert } from '@/utils/apiError';

type Options = {
  audience: DiscoverAudience;
  onBeforeReload?: () => void;
};

/**
 * Hybrid Available Food loader:
 * - push mode → existing /food-listings/notifications flow + push refresh
 * - nearby_fallback → GET /food-listings/nearby when notifications are off
 */
export function useAvailableFoodFeed({ audience, onBeforeReload }: Options) {
  const { authUser } = useAppContext();
  const {
    loading: modeLoading,
    mode,
    notificationsOn,
    refreshPermissionState,
  } = useAvailableFoodMode();

  const cache = useDiscoverStore((s) => s[audience]);
  const locationRequired = useDiscoverStore((s) => s.locationRequired);
  const fetchListings = useDiscoverStore((s) => s.fetchListings);
  const modeRef = useRef<AvailableFoodMode>(mode);
  modeRef.current = mode;

  const load = useCallback(
    async (force = false) => {
      const permissionOn = await refreshPermissionState();
      const nextMode: AvailableFoodMode = permissionOn ? 'push' : 'nearby_fallback';
      await fetchListings(audience, force, { mode: nextMode });
    },
    [audience, fetchListings, refreshPermissionState],
  );

  const reload = useCallback(async () => {
    onBeforeReload?.();
    clearListingDetailCache();
    await load(true);
  }, [load, onBeforeReload]);

  useEffect(() => {
    if (!authUser?.accessToken || modeLoading) return;
    load(false).catch((e) =>
      showErrorAlert(e, 'Could not load listings', 'Could not load listings'),
    );
  }, [authUser?.accessToken, modeLoading, mode, load]);

  useFocusEffect(
    useCallback(() => {
      if (!authUser?.accessToken) return;
      load(true).catch(() => undefined);
    }, [authUser?.accessToken, load]),
  );

  useEffect(() => {
    if (mode !== 'push') return;
    return subscribeNotificationReceived((payload) => {
      if (!isFoodListingNotification(payload)) return;
      if (modeRef.current !== 'push') return;
      onBeforeReload?.();
      clearListingDetailCache();
      fetchListings(audience, true, { mode: 'push' }).catch(() => undefined);
    });
  }, [mode, audience, fetchListings, onBeforeReload]);

  return {
    listings: cache.listings,
    loading: modeLoading || cache.isFetching,
    mode,
    notificationsOn,
    locationRequired,
    load,
    reload,
    refreshPermissionState,
  };
}
