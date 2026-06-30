import api from './api';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const authService = {
  registerBusiness: (data: FormData) =>
    api.post('/auth/register/business', data),

  registerCharity: (data: FormData) =>
    api.post('/auth/register/charity', data),

  registerFarmerProducer: (data: FormData) =>
    api.post('/auth/register/farmer-producer', data),

  registerFarmerConsumer: (data: FormData) =>
    api.post('/auth/register/farmer-consumer', data),

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
};