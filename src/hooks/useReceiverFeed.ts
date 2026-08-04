import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { useAvailableFoodMode } from '@/hooks/useAvailableFoodMode';
import type { DiscoverAudience } from '@/services/foodListing.service';
import { useAppContext } from '@/store/AppContext';
import { getUserFriendlyErrorMessage } from '@/utils/apiError';
import {
  fetchAllMyClaims,
  fetchAvailableListingsForAudience,
  mapReceiverPickups,
  mapReceiverUpdates,
  type ReceiverPickup,
  type ReceiverUpdateItem,
} from '@/utils/receiverFeed';

type FeedState = {
  updates: ReceiverUpdateItem[];
  nextPickup: ReceiverPickup | null;
  claimedPickups: ReceiverPickup[];
};

const EMPTY: FeedState = {
  updates: [],
  nextPickup: null,
  claimedPickups: [],
};

/**
 * Shared loader for charity/farmer Updates + Pickup screens.
 * Claims come from /claims/my; available surplus comes from the same
 * discover/nearby feed used elsewhere in the app.
 */
export function useReceiverFeed(audience: DiscoverAudience) {
  const { authUser } = useAppContext();
  const {
    loading: modeLoading,
    mode,
    refreshPermissionState,
  } = useAvailableFoodMode();

  const [feed, setFeed] = useState<FeedState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (forceRefresh = false) => {
      if (!authUser?.accessToken) return;

      if (forceRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const permissionOn = await refreshPermissionState();
        const nextMode = permissionOn ? 'push' : 'nearby_fallback';

        const [claims, availableListings] = await Promise.all([
          fetchAllMyClaims(),
          fetchAvailableListingsForAudience(audience, nextMode).catch(() => []),
        ]);

        const updates = mapReceiverUpdates({ claims, availableListings });
        const pickups = mapReceiverPickups({ claims, availableListings });

        setFeed({
          updates,
          nextPickup: pickups.nextPickup,
          claimedPickups: pickups.claimedPickups,
        });
      } catch (err) {
        setError(
          getUserFriendlyErrorMessage(err, 'Could not load pickups and updates'),
        );
        setFeed(EMPTY);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [audience, authUser?.accessToken, refreshPermissionState],
  );

  useEffect(() => {
    if (!authUser?.accessToken || modeLoading) return;
    void load(false);
  }, [authUser?.accessToken, modeLoading, mode, load]);

  useFocusEffect(
    useCallback(() => {
      if (!authUser?.accessToken) return;
      void load(true);
    }, [authUser?.accessToken, load]),
  );

  const counts = useMemo(
    () => ({
      all: feed.updates.length,
      new_surplus: feed.updates.filter((u) => u.type === 'new_surplus').length,
      pickup: feed.updates.filter((u) => u.type === 'pickup').length,
      collected: feed.updates.filter((u) => u.type === 'collected').length,
      feedback: feed.updates.filter((u) => u.type === 'feedback').length,
    }),
    [feed.updates],
  );

  return {
    updates: feed.updates,
    nextPickup: feed.nextPickup,
    claimedPickups: feed.claimedPickups,
    counts,
    loading: loading || modeLoading,
    refreshing,
    error,
    reload: () => load(true),
  };
}
