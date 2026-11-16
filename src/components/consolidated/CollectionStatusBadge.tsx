import React from 'react';

import { Pill } from '@/components/consolidated/ui';
import { collectionStatusColors, collectionStatusLabel, contributionStatusLabel } from '@/utils/consolidated';
import type { HandoverMethod } from '@/types/consolidated';

type Props = {
  status?: string | null;
  kind?: 'collection' | 'contribution';
  method?: HandoverMethod | null;
};

export function CollectionStatusBadge({ status, kind = 'collection', method }: Props) {
  const colors = collectionStatusColors(kind === 'collection' ? status : statusColorKey(status));
  const label = kind === 'contribution' ? contributionStatusLabel(status, method) : collectionStatusLabel(status);
  return <Pill label={label} color={colors.color} background={colors.background} dot />;
}

function statusColorKey(status?: string | null): string {
  switch (status) {
    case 'RECEIVED':
    case 'COMPLETED':
      return 'COMPLETED';
    case 'HANDED_OVER':
      return 'PUBLISHED';
    case 'LATE_PENDING_APPROVAL':
      return 'SUBMISSIONS_CLOSED';
    case 'NOT_RECEIVED':
    case 'REJECTED_LATE':
    case 'EXCLUDED':
      return 'EXPIRED';
    case 'WITHDRAWN':
    case 'CANCELLED':
    case 'NO_CONTRIBUTION':
      return 'CANCELLED';
    case 'SUBMITTED':
      return 'AWAITING_ITEM_CHECK';
    default:
      return 'SCHEDULED';
  }
}
