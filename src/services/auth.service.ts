import { isAxiosError } from 'axios';

import api from './api';

const BASE_URL = 'https://s4b.saveful.app/api/v1';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Uses native fetch for multipart/form-data signup requests.
 * React Native's fetch handles FormData with file URIs correctly,
 * while axios's XHR adapter can fail with ERR_NETWORK.
 */
async function postFormData(path: string, body: FormData) {
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    method: 'POST',
    body,
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const error: any = new Error(json?.message || `Request failed with status ${response.status}`);
    error.response = { status: response.status, data: json };
    throw error;
  }

  return { data: json };
}

export const authService = {
  registerBusiness: (data: FormData) =>
    postFormData('/auth/register/business', data),

  registerCharity: (data: FormData) =>
    postFormData('/auth/register/charity', data),

  registerFarmerProducer: (data: FormData) =>
    postFormData('/auth/register/farmer-producer', data),

  registerFarmerConsumer: (data: FormData) =>
    postFormData('/auth/register/farmer-consumer', data),

  verifyEmail: (email: string, otp: string) =>
    api.post('/auth/verify-email', { email: email.trim().toLowerCase(), otp }),

  resendVerification: (email: string) =>
    api.post('/auth/resend-verification', { email: email.trim().toLowerCase() }),

  sendVerificationOtp: (email: string) =>
    api.post('/auth/resend-verification', { email: email.trim().toLowerCase() }),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email: normalizeEmail(email) }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    api.post('/auth/reset-password', {
      email: normalizeEmail(email),
      otp,
      newPassword,
    }),

  profile: () =>
    api.get('/auth/profile'),

  updateProfile: (data: { phoneNumber?: string }) =>
    api.patch('/auth/profile', data),

  /**
   * Probe login to see if an email is already registered.
   * - "User not found" → available
   * - "Invalid Credentials" / verify prompts → taken
   */
  checkEmailRegistered: async (email: string): Promise<boolean> => {
    try {
      await api.post('/auth/login', {
        email: normalizeEmail(email),
        password: '__email_availability_probe__',
      });
      return true;
    } catch (error: unknown) {
      const data =
        isAxiosError(error)
          ? error.response?.data
          : (error as { response?: { data?: unknown } })?.response?.data;
      const raw =
        typeof data === 'object' && data && 'message' in data
          ? String((data as { message?: unknown }).message ?? '')
          : error instanceof Error
            ? error.message
            : '';
      const lower = raw.toLowerCase();

      if (
        lower.includes('user not found') ||
        lower.includes('no account') ||
        lower.includes('no user')
      ) {
        return false;
      }

      if (
        lower.includes('invalid credentials') ||
        lower.includes('wrong password') ||
        lower.includes('verify') ||
        lower.includes('not verified') ||
        lower.includes('already')
      ) {
        return true;
      }

      // Network / unknown — don't block signup; final register will catch duplicates.
      return false;
    }
  },
};