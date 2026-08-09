import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { useAppContext } from '@/store/AppContext';
import { getUserFriendlyErrorMessage } from '@/utils/apiError';
import {
  fetchAllMyClaims,
  mapSelfPickupClaims,
  type SelfPickupClaim,
} from '@/utils/receiverFeed';

/**
 * Claims that are still undriven (PENDING/CONFIRMED, no active DriverPickup).
 * Used on Available / Map so self-pickup stays available until a driver is assigned.
 */
export function useSelfPickupClaims() {
  const { authUser } = useAppContext();
  const [claims, setClaims] = useState<SelfPickupClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!authUser?.accessToken) {
      setClaims([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const viewerSiteId =
        Number(authUser?.profile?.sites?.[0]?.id) ||
        Number((authUser as { siteId?: number } | null)?.siteId) ||
        null;
      const raw = await fetchAllMyClaims();
      setClaims(mapSelfPickupClaims(raw, viewerSiteId));
    } catch (err) {
      setError(
        getUserFriendlyErrorMessage(err, 'Could not load your unassigned claims'),
      );
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { claims, loading, error, reload };
}
