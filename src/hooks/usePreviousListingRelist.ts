import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import type { ListingDetail } from '../services/foodListing.service';
import {
  fetchLatestListingForRelist,
  type RelistAudience,
} from '../utils/listingRelist';

export function usePreviousListingRelist(audience: RelistAudience) {
  const [previousListing, setPreviousListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const listing = await fetchLatestListingForRelist(audience);
      setPreviousListing(listing);
    } catch {
      setPreviousListing(null);
    } finally {
      setLoading(false);
    }
  }, [audience]);

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
