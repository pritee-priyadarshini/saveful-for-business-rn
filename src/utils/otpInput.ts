export const OTP_LENGTH = 6;

export function extractOtpDigits(text: string, length = OTP_LENGTH): string {
  const raw = String(text || '');
  const compact = raw.replace(/\s+/g, '');
  const run = compact.match(new RegExp(`\\d{${length}}`));
  if (run) return run[0];
  return raw.replace(/\D/g, '').slice(0, length);
}

export function applyOtpInput(
  current: string[],
  index: number,
  text: string,
): { next: string[]; focusIndex: number } {
  const length = current.length || OTP_LENGTH;
  const digits = extractOtpDigits(text, length);

  if (digits.length > 1) {
    if (digits.length >= length) {
      return {
        next: digits.slice(0, length).split(''),
        focusIndex: length - 1,
      };
    }

    const next = [...current];
    for (let i = 0; i < digits.length && index + i < length; i += 1) {
      next[index + i] = digits[i];
    }
    return {
      next,
      focusIndex: Math.min(index + digits.length, length - 1),
    };
  }

  const next = [...current];
  next[index] = digits;
  return {
    next,
    focusIndex: digits && index < length - 1 ? index + 1 : index,
  };
}

export const otpPasteFieldProps = {
  maxLength: OTP_LENGTH,
  textContentType: 'oneTimeCode' as const,
  autoComplete: 'one-time-code' as const,
};
