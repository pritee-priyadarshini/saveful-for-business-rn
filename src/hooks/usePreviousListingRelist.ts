import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import type { ListingDetail } from '../services/foodListing.service';
import type { RelistAudience } from '../utils/listingRelist';
import { useListingsStore } from '../store/listingsStore';
import { useAuthStore } from '../store/authStore';

export function usePreviousListingRelist(audience: RelistAudience) {
  const [previousListing, setPreviousListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchLatestForRelist = useListingsStore((s) => s.fetchLatestForRelist);

  const reload = useCallback(async () => {
    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const listing = await fetchLatestForRelist(audience);
      setPreviousListing(listing);
    } catch {
      setPreviousListing(null);
    } finally {
      setLoading(false);
    }
  }, [audience, fetchLatestForRelist]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return {
    previousListing,
    loading,
    hasPreviousListing: previousListing != null,
    reload,
  };
}
