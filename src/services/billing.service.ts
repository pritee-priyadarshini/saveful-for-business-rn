import api from './api';

export type BillingCycleApi = 'MONTHLY' | 'ANNUAL';

export type CheckoutSessionResponse = {
  checkoutUrl: string;
  sessionId: string;
  currency: string;
};

/**
 * The trial opens a Checkout session without requiring a card up front.
 * Payment details are collected after the free trial ends.
 */
export type StartTrialResponse = CheckoutSessionResponse & {
  trialDays: number;
  message: string;
};

export type PlanChangeDirection = 'UPGRADE' | 'DOWNGRADE';

/**
 * What the change means to the customer. SWITCH (Make Food Count ↔ Saveful
 * Connect) is billed like a downgrade — at the period end — but worded as a switch.
 * Older backends omit it.
 */
export type PlanChangeType = 'UPGRADE' | 'DOWNGRADE' | 'SWITCH';

/** `UPGRADED` applies today and is prorated; `SCHEDULED` waits for the period end. */
export type ChangePlanResponse = {
  type: 'UPGRADED' | 'SCHEDULED';
  planId: number;
  planDisplayName: string;
  billingCycle: BillingCycleApi;
  effectiveAt: string;
  nextBillingDate: string | null;
  message: string;
  changeType?: PlanChangeType;
};

export type ChangePlanPreview = {
  direction: PlanChangeDirection;
  currency: string;
  /** Prorated amount Stripe will charge now; always 0 for a downgrade. */
  amountDueToday: number;
  recurringAmount: number;
  effectiveAt: string;
  nextBillingDate: string | null;
  planDisplayName: string;
  billingCycle: BillingCycleApi;
  changeType?: PlanChangeType;
  /** The org must add a card before this upgrade can go through. */
  requiresPaymentMethod?: boolean;
  /** Upgrading ends the free trial today. false when the trial carries over. */
  endsTrialEarly?: boolean;
};

export type CancelPendingChangeResponse = {
  message: string;
};

export type PortalSessionResponse = {
  portalUrl: string;
};

export type CancelSubscriptionResponse = {
  message: string;
  accessUntil?: string | null;
};

export type ResumeSubscriptionResponse = {
  message: string;
  nextBillingDate?: string | null;
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

/**
 * Billing calls show their own errors (usePlanPurchase, the plans screens), and
 * some refusals are expected steps — e.g. a preview for an org whose plan has no
 * Stripe subscription answers "Please choose a plan." and the flow falls back to
 * checkout. Without this the global 402/plan-required prompt would pop on top.
 */
const OWN_ERRORS = { skipBillingHandler: true } as const;

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export const billingService = {
  async startTrial(
    planId: number,
    billingCycle?: BillingCycleApi,
  ): Promise<StartTrialResponse> {
    const res = await api.post('/billing/trial', { planId, billingCycle }, OWN_ERRORS);
    return unwrapData<StartTrialResponse>(res.data);
  },

  async createCheckout(
    planId: number,
    billingCycle: BillingCycleApi,
  ): Promise<CheckoutSessionResponse> {
    const res = await api.post('/billing/checkout', { planId, billingCycle }, OWN_ERRORS);
    return unwrapData<CheckoutSessionResponse>(res.data);
  },

  async changePlan(
    planId: number,
    billingCycle?: BillingCycleApi,
  ): Promise<ChangePlanResponse> {
    const res = await api.post('/billing/change-plan', { planId, billingCycle }, OWN_ERRORS);
    return unwrapData<ChangePlanResponse>(res.data);
  },

  /**
   * Dry run behind the confirmation dialog. Proration is never computed on the
   * client — it would drift from what Stripe actually charges.
   */
  async previewChangePlan(
    planId: number,
    billingCycle?: BillingCycleApi,
  ): Promise<ChangePlanPreview> {
    const res = await api.post('/billing/change-plan/preview', { planId, billingCycle }, OWN_ERRORS);
    return unwrapData<ChangePlanPreview>(res.data);
  },

  async cancelPendingChange(): Promise<CancelPendingChangeResponse> {
    const res = await api.delete('/billing/change-plan/pending', OWN_ERRORS);
    return unwrapData<CancelPendingChangeResponse>(res.data);
  },

  async createPortal(): Promise<PortalSessionResponse> {
    const res = await api.post('/billing/portal', undefined, OWN_ERRORS);
    return unwrapData<PortalSessionResponse>(res.data);
  },

  async cancelSubscription(): Promise<CancelSubscriptionResponse> {
    const res = await api.post('/billing/cancel', undefined, OWN_ERRORS);
    return unwrapData<CancelSubscriptionResponse>(res.data);
  },

  /** Undoes a scheduled cancellation while the paid period is still running. */
  async resumeSubscription(): Promise<ResumeSubscriptionResponse> {
    const res = await api.post('/billing/resume', undefined, OWN_ERRORS);
    return unwrapData<ResumeSubscriptionResponse>(res.data);
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
