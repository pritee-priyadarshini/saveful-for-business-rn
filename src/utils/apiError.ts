import { Alert } from 'react-native';
import { isAxiosError } from 'axios';

export const FORGOT_PASSWORD_ACCOUNT_NOT_FOUND_MESSAGE =
  'No account found for this email. Please check the email or sign up for a new account.';

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Please check your details and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to do that.",
  404: "We couldn't find what you're looking for.",
  409: 'This already exists. Please try something different.',
  422: 'Some information looks incorrect. Please review and try again.',
  429: 'Too many attempts. Please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again later.',
  502: 'We are having trouble connecting. Please try again.',
  503: 'The service is temporarily unavailable. Please try again later.',
};

const TECHNICAL_PATTERNS = [
  /axios/i,
  /network error/i,
  /econnrefused/i,
  /timeout/i,
  /undefined/i,
  /null/i,
  /\[object object\]/i,
  /at \w+\./,
  /Error:/,
  /HTTP \d{3}/i,
];

function humanizeRawMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();

  if (lower.includes('invalid credentials') || lower.includes('wrong password')) {
    return 'Email or password is incorrect. Please try again.';
  }
  if (lower.includes('email already') || lower.includes('already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('verify your email') || lower.includes('not verified')) {
    return 'Please verify your email before signing in.';
  }
  if (lower.includes('invalid otp') || lower.includes('invalid code')) {
    return 'That code is incorrect. Please check and try again.';
  }
  if (lower.includes('expired')) {
    return 'This code has expired. Please request a new one.';
  }
  if (lower.includes('not found') || lower.includes('no account') || lower.includes('no user')) {
    return FORGOT_PASSWORD_ACCOUNT_NOT_FOUND_MESSAGE;
  }

  if (TECHNICAL_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return '';
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function extractApiMessage(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === 'string') return humanizeRawMessage(data) || null;

  if (typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const candidate = record.message ?? record.error ?? record.detail ?? record.title;
    if (typeof candidate === 'string') return humanizeRawMessage(candidate) || null;
    if (Array.isArray(candidate)) {
      const joined = candidate
        .filter((item) => typeof item === 'string' && item.trim())
        .map((item) => humanizeRawMessage(item as string))
        .filter(Boolean)
        .join('\n');
      return joined || null;
    }
  }

  return null;
}

export function getUserFriendlyErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!error) return fallback;

  if (typeof error === 'string') {
    return humanizeRawMessage(error) || fallback;
  }

  if (error instanceof Error && error.message) {
    const friendly = humanizeRawMessage(error.message);
    if (friendly && !isAxiosError(error)) return friendly;
  }

  if (isAxiosError(error)) {
    const apiMessage = extractApiMessage(error.response?.data);
    if (apiMessage) return apiMessage;

    const status = error.response?.status;
    if (status && STATUS_MESSAGES[status]) {
      return STATUS_MESSAGES[status];
    }

    if (!error.response) {
      return 'No internet connection. Please check your network and try again.';
    }
  }

  return fallback;
}

export function getForgotPasswordErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.status === 404) {
    return FORGOT_PASSWORD_ACCOUNT_NOT_FOUND_MESSAGE;
  }

  const message = getUserFriendlyErrorMessage(
    error,
    'We could not send a reset code. Please try again.',
  );

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

  return message;
}

export function getForgotPasswordSuccessMessage(apiMessage?: string): string {
  return (
    apiMessage ||
    'If an account exists for this email, a reset code has been sent. Please check your inbox.'
  );
}

export function showErrorAlert(
  error: unknown,
  title = 'Something went wrong',
  fallback?: string,
) {
  Alert.alert(title, getUserFriendlyErrorMessage(error, fallback));
}

export function showSuccessAlert(
  message: string,
  title = 'Done',
  onOk?: () => void,
) {
  Alert.alert(title, message, [{ text: 'OK', onPress: onOk }]);
}

export function formatApiErrorMessage(message: unknown, fallback: string) {
  if (Array.isArray(message)) {
    return message
      .map((item) => (typeof item === 'string' ? humanizeRawMessage(item) : ''))
      .filter(Boolean)
      .join('\n') || fallback;
  }
  if (typeof message === 'string' && message.trim()) {
    return humanizeRawMessage(message) || fallback;
  }
  if (message && typeof message === 'object') {
    const nested = (message as { message?: unknown }).message;
    return formatApiErrorMessage(nested, fallback);
  }
  return fallback;
}

export function formatApiError(error: unknown, fallback: string) {
  return getUserFriendlyErrorMessage(error, fallback);
}
