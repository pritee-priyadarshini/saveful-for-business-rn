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

export async function createClaim(payload: CreateClaimPayload): Promise<FoodClaim> {
  const response = await api.post('/claims', payload);
  return response.data;
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

export async function cancelClaim(claimId: number) {
  const response = await api.delete(`/claims/${claimId}`);
  return response.data;
}

export const claimsService = {
  createClaim,
  getMyClaims,
  markClaimCollected,
  rateClaim,
  cancelClaim,
};
