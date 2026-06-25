export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 6;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidPassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}

export const FORGOT_PASSWORD_ACCOUNT_NOT_FOUND_MESSAGE =
  'No account found for this email. Please enter the correct email or sign up for a new account.';

export function getForgotPasswordErrorMessage(error: unknown): string {
  const err = error as {
    response?: { status?: number; data?: { message?: string | string[] } };
  };
  const status = err?.response?.status;
  const rawMessage = err?.response?.data?.message;
  const message = Array.isArray(rawMessage) ? rawMessage.join('\n') : String(rawMessage || '');

  if (status === 404) {
    return FORGOT_PASSWORD_ACCOUNT_NOT_FOUND_MESSAGE;
  }

  const lower = message.toLowerCase();
  if (
    lower.includes('not found') ||
    lower.includes('no account') ||
    lower.includes('does not exist') ||
    lower.includes('not registered') ||
    lower.includes('no user')
  ) {
    return FORGOT_PASSWORD_ACCOUNT_NOT_FOUND_MESSAGE;
  }

  return message || 'Failed to send reset code. Please try again.';
}

export function getForgotPasswordSuccessMessage(apiMessage?: string): string {
  return (
    apiMessage ||
    'If an account exists for this email, a reset code has been sent. Please check your inbox.'
  );
}
