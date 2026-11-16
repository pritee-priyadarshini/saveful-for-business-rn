import { useEffect } from 'react';

import { useAppContext } from '@/store/AppContext';
import { useConsolidatedStore } from '@/store/consolidatedStore';
import { isBusinessRole } from '@/utils/consolidated';
import { CONSOLIDATED_PREVIEW } from '@/dev/previewFlag';

export function useConsolidatedAccess() {
  const { selectedRole } = useAppContext();
  const isBusiness = CONSOLIDATED_PREVIEW || isBusinessRole(selectedRole);
  const me = useConsolidatedStore((state) => state.me);
  const meLoaded = useConsolidatedStore((state) => state.meLoaded);
  const featureOff = useConsolidatedStore((state) => state.featureOff);
  const fetchMe = useConsolidatedStore((state) => state.fetchMe);

  useEffect(() => {
    if (!isBusiness) return;
    void fetchMe().catch(() => undefined);
  }, [fetchMe, isBusiness]);

  if (!isBusiness || featureOff) {
    return { canManage: false, isReceiver: false, inGroup: false, hasAccess: false, loading: false, siteIdsWithOpenCollections: [] as number[] };
  }

  const isReceiver = (me?.receiverGroupIds.length ?? 0) > 0;
  const canManage = Boolean(me?.canManage);
  // Actually runs or receives for a group. Org owners hold canManage implicitly,
  // so operations UI (Home card, report) waits until they are in a group —
  // otherwise every business owner would see it on day one.
  const inGroup = isReceiver || (me?.managedGroupIds.length ?? 0) > 0;
  return {
    canManage,
    isReceiver,
    inGroup,
    hasAccess: canManage || isReceiver,
    loading: !meLoaded,
    siteIdsWithOpenCollections: me?.siteIdsWithOpenCollections ?? [],
  };
}
