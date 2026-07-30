import api from './api';

export type BillingCycleApi = 'MONTHLY' | 'ANNUAL';

export type StartTrialResponse = {
  message: string;
  subscription: {
    planName: string;
    planDisplayName: string;
    status: string;
    trialEndsAt: string;
  };
};

export type CheckoutSessionResponse = {
  checkoutUrl: string;
  sessionId: string;
  currency: string;
};

export type PortalSessionResponse = {
  portalUrl: string;
};

export type CancelSubscriptionResponse = {
  message: string;
  accessUntil?: string | null;
};

export type PaymentRecord = {
  id: number;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  invoiceUrl: string | null;
  invoicePdf: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type EnterpriseLocationBand =
  | 'BAND_10_25'
  | 'BAND_26_50'
  | 'BAND_51_100'
  | 'BAND_100_PLUS';

export type EnterpriseContactWindow = 'ASAP' | 'MORNING' | 'AFTERNOON' | 'ANY_TIME';

export type EnterpriseEnquiryPayload = {
  firstName: string;
  lastName: string;
  businessName: string;
  businessType: string;
  mobile: string;
  locationBand: EnterpriseLocationBand;
  contactWindow: EnterpriseContactWindow;
  message?: string;
};

export type EnterpriseEnquiryResponse = {
  message: string;
  detail: string;
  enquiryId: number;
};

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export const billingService = {
  async startTrial(planId: number): Promise<StartTrialResponse> {
    const res = await api.post('/billing/trial', { planId });
    return unwrapData<StartTrialResponse>(res.data);
  },

  async createCheckout(
    planId: number,
    billingCycle: BillingCycleApi,
  ): Promise<CheckoutSessionResponse> {
    const res = await api.post('/billing/checkout', { planId, billingCycle });
    return unwrapData<CheckoutSessionResponse>(res.data);
  },

  async createPortal(): Promise<PortalSessionResponse> {
    const res = await api.post('/billing/portal');
    return unwrapData<PortalSessionResponse>(res.data);
  },

  async cancelSubscription(): Promise<CancelSubscriptionResponse> {
    const res = await api.post('/billing/cancel');
    return unwrapData<CancelSubscriptionResponse>(res.data);
  },

  async listPayments(): Promise<PaymentRecord[]> {
    const res = await api.get('/billing/payments');
    const data = unwrapData<PaymentRecord[]>(res.data);
    return Array.isArray(data) ? data : [];
  },

  async submitEnterpriseEnquiry(
    payload: EnterpriseEnquiryPayload,
  ): Promise<EnterpriseEnquiryResponse> {
    const res = await api.post('/billing/enterprise-enquiry', payload);
    return unwrapData<EnterpriseEnquiryResponse>(res.data);
  },
};
