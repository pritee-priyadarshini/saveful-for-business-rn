import api from './api';

export const authService = {
  registerBusiness: (data: FormData) =>
    api.post('/auth/register/business', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  registerCharity: (data: FormData) =>
    api.post('/auth/register/charity', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  verifyEmail: (email: string, otp: string) =>
    api.post('/auth/verify-email', { email, otp }),

  resendVerification: (email: string) =>
    api.post('/auth/resend-verification', { email }),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    api.post('/auth/reset-password', { email, otp, newPassword }),

  profile: () => 
    api.get('/auth/profile'),
};