import api from './api';

export type ClaimMode = 'FULL' | 'PARTIAL';

export type ClaimItemPayload = {
  foodItemId: number;
  qtyKg: number;
};

export type CreateClaimPayload = {
  listingId: number;
  claimMode: ClaimMode;
  claimItems?: ClaimItemPayload[];
};

export type FoodClaim = {
  id: number;
  listingId: number;
  claimMode: ClaimMode;
  status: string;
  claimItems?: Array<{
    id: number;
    foodItemId: number;
    qtyKg: number;
    foodItem?: { name?: string; unit?: string };
  }>;
};

export type RateClaimPayload = {
  rating: number;
  ratingNote?: string;
};

export type ProviderFeedbackPayload = {
  didCollect: boolean;
  rating?: number;
  ratingNote?: string;
};

export async function createClaim(payload: CreateClaimPayload): Promise<FoodClaim> {
  const response = await api.post('/claims', payload);
  const raw = response.data?.data ?? response.data?.claim ?? response.data;
  // Normalize nested shapes so callers always get a usable claim id.
  const claim = (raw?.claim ?? raw) as FoodClaim;
  if (claim && claim.id == null && (raw as any)?.id != null) {
    return { ...claim, id: Number((raw as any).id) };
  }
  return claim;
}

export async function requestDriverPickup(claimId: number) {
  const response = await api.post(`/claims/${claimId}/request-driver`);
  return response.data?.data ?? response.data;
}

export async function getMyClaims(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const response = await api.get('/claims/my', { params });
  return response.data;
}

export async function markClaimCollected(
  claimId: number,
  payload?: RateClaimPayload,
) {
  const response = await api.patch(`/claims/${claimId}/collected`, payload ?? {});
  return response.data;
}

/** Rate a claim that is already collected (Updates feedback card). */
export async function rateClaim(claimId: number, payload: RateClaimPayload) {
  const response = await api.patch(`/claims/${claimId}/rating`, payload);
  return response.data;
}

/** Restaurant confirms collection and rates the charity/farmer. */
export async function submitProviderFeedback(
  claimId: number,
  payload: ProviderFeedbackPayload,
) {
  const response = await api.patch(`/claims/${claimId}/provider-feedback`, payload);
  return response.data;
}

export async function cancelClaim(claimId: number) {
  const response = await api.delete(`/claims/${claimId}`);
  return response.data;
}

export const claimsService = {
  createClaim,
  requestDriverPickup,
  getMyClaims,
  markClaimCollected,
  rateClaim,
  submitProviderFeedback,
  cancelClaim,
};
