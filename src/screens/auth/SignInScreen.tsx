
import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { InputField } from '../../components/InputField';
import { SavefulModal } from '../../components/SavefulModal';
import { useAppContext } from '../../store/AppContext';
import { palette } from '../../theme/colors';
import type { AuthStackParamList } from '../../navigation/types';
import { authService } from '../../services/auth.service';
import {
  isValidEmail,
  isValidPassword,
  MIN_PASSWORD_LENGTH,
  passwordsMatch,
  getForgotPasswordErrorMessage,
  getForgotPasswordSuccessMessage,
} from '@/utils/validation';
import {
  extractApiMessage,
  getUserFriendlyErrorMessage,
  getOtpVerificationErrorMessage,
  showSuccessAlert,
} from '@/utils/apiError';
import { isAxiosError } from 'axios';
import {
  buildAuthUserFromProfile,
  resolveUserRole,
} from '@/utils/authSession';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { hp, normalize, wp } from '@/utils/responsive';

type Mode = 'login' | 'forgot';

const valueProps = [
  {
    image: require('../../../assets/intro/welcome_reduce_waste.png'),
    label: 'Reduce waste',
  },
  {
    image: require('../../../assets/intro/welcome_feed_communities.png'),
    label: 'Feed communities',
  },
  {
    image: require('../../../assets/intro/welcome_connect_locally.png'),
    label: 'Connect locally',
  },
];

const MODE_COPY: Record<Mode, { title: string; subtitle: string }> = {
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to manage your surplus food listings.',
  },
  forgot: {
    title: 'Forgot password?',
    subtitle: 'Enter your registered email and we’ll send a verification code.',
  },
};

function FormErrorBanner({ message }: { message: string }) {
  if (!message) return null;

  return (
    <View style={styles.errorBanner}>
      <Ionicons name="alert-circle-outline" size={normalize(16)} color={palette.validation} />
      <AppText variant="bodySmall" style={styles.errorBannerText}>
        {message}
      </AppText>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled = false,
  showArrow = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  showArrow?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.primaryButtonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <AppText variant="bodyBold" style={styles.primaryButtonText}>
        {label}
      </AppText>
      {showArrow ? (
        <Ionicons name="arrow-forward" size={normalize(18)} color={palette.white} />
      ) : null}
    </Pressable>
  );
}

type ResetPasswordModalFieldsProps = {
  step: 1 | 2;
  onStepChange: (step: 1 | 2) => void;
  otp: string[];
  inputs: React.MutableRefObject<(TextInput | null)[]>;
  newPassword: string;
  confirmPassword: string;
  loading: boolean;
  resending: boolean;
  onOtpChange: (text: string, index: number) => void;
  onOtpBackspace: (digit: string, index: number) => void;
  onResendCode: () => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onReset: () => void;
  onCancel: () => void;
  onSetError: (message: string) => void;
  onClearError: () => void;
};

function ResetPasswordModalFields({
  step,
  onStepChange,
  otp,
  inputs,
  newPassword,
  confirmPassword,
  loading,
  resending,
  onOtpChange,
  onOtpBackspace,
  onResendCode,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onReset,
  onCancel,
  onSetError,
  onClearError,
}: ResetPasswordModalFieldsProps) {
  const handleOtpInput = (text: string, index: number) => {
    onOtpChange(text, index);
    const nextDigit = text.replace(/[^0-9]/g, '');
    const nextOtp = [...otp];
    nextOtp[index] = nextDigit;

    if (nextOtp.join('').length === 6) {
      onClearError();
      Keyboard.dismiss();
      setTimeout(() => onStepChange(2), 280);
    }
  };

  const handleContinueFromOtp = () => {
    if (otp.join('').length !== 6) {
      onSetError('Please enter the 6-digit verification code.');
      return;
    }
    onClearError();
    Keyboard.dismiss();
    onStepChange(2);
  };

  return (
    <View style={styles.modalFields}>
      <View style={styles.stepIndicator}>
        <View style={styles.stepItem}>
          <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
            <AppText variant="bodyBold" style={[styles.stepDotText, step >= 1 && styles.stepDotTextActive]}>
              1
            </AppText>
          </View>
          <AppText variant="caption" color={step === 1 ? palette.primary : palette.textMuted} style={styles.stepLabel}>
            Verify code
          </AppText>
        </View>

        <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />

        <View style={styles.stepItem}>
          <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
            <AppText variant="bodyBold" style={[styles.stepDotText, step >= 2 && styles.stepDotTextActive]}>
              2
            </AppText>
          </View>
          <AppText variant="caption" color={step === 2 ? palette.primary : palette.textMuted} style={styles.stepLabel}>
            New password
          </AppText>
        </View>
      </View>

      {step === 1 ? (
        <>
          <View style={styles.otpSection}>
            <AppText variant="label" style={styles.otpLabel}>
              Enter verification code
            </AppText>
            <View style={styles.otpRow}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    inputs.current[index] = ref;
                  }}
                  style={[styles.otpInput, digit ? styles.otpInputFilled : null]}
                  maxLength={1}
                  keyboardType="number-pad"
                  value={digit}
                  onChangeText={(t) => handleOtpInput(t, index)}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Backspace') {
                      onOtpBackspace(digit, index);
                    }
                  }}
                />
              ))}
            </View>

            <Pressable
              onPress={onResendCode}
              disabled={resending || loading}
              style={styles.resendButton}
            >
              <AppText variant="bodySmall" color={palette.primary} style={styles.resendText}>
                {resending ? 'Resending...' : 'Resend code'}
              </AppText>
            </Pressable>
          </View>

          <PrimaryButton label="Continue" onPress={handleContinueFromOtp} showArrow />

          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          >
            <AppText variant="bodyBold" color={palette.primary} style={styles.secondaryButtonText}>
              Cancel
            </AppText>
          </Pressable>
        </>
      ) : (
        <>
          <InputField
            label="New password"
            placeholder="Enter new password"
            compact
            labelVariant="label"
            value={newPassword}
            secureTextEntry
            isPassword
            onChangeText={onNewPasswordChange}
          />

          <InputField
            label="Confirm password"
            placeholder="Re-enter new password"
            compact
            labelVariant="label"
            value={confirmPassword}
            secureTextEntry
            isPassword
            onChangeText={onConfirmPasswordChange}
          />

          <PrimaryButton
            label={loading ? 'Resetting...' : 'Reset password'}
            onPress={onReset}
            disabled={loading}
          />

          <Pressable
            onPress={() => {
              onClearError();
              onStepChange(1);
            }}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          >
            <AppText variant="bodyBold" color={palette.primary} style={styles.secondaryButtonText}>
              Back
            </AppText>
          </Pressable>
        </>
      )}
    </View>
  );
}

export function SignInScreen() {
  const { setAuthUser, setRole } = useAppContext();
  const insets = useSafeAreaInsets();
  useTransparentStatusBar('dark');

  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<Mode>('login');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const inputs = useRef<(TextInput | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetStep, setResetStep] = useState<1 | 2>(1);

  const trimmedEmail = email.trim().toLowerCase();
  const copy = MODE_COPY[mode];

  const closeResetModal = () => {
    setResetModalVisible(false);
    setResetError('');
    setResetStep(1);
    setOtp(['', '', '', '', '', '']);
    setNewPassword('');
    setConfirmPassword('');
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    closeResetModal();
  };

  const handleLogin = async () => {
    try {
      if (loading) return;
      setError('');
      if (!trimmedEmail || !password) {
        setError('Please enter email and password.');
        return;
      }

      if (!isValidEmail(trimmedEmail)) {
        setError('Please enter a valid email address.');
        return;
      }

      if (
        email.trim().toLowerCase() === 'farmer@saveful.com' &&
        password === '123456'
      ) {
        setAuthUser({
          id: 'demo-farmer',
          firstName: 'Demo',
          lastName: 'Farmer',
          email: 'farmer@saveful.com',
          accessToken: 'demo-token',
          orgType: 'FARMER',
          orgRole: 'OWNER',
          siteRole: null,
          profile: {
            user: {
              firstName: 'Demo',
              lastName: 'Farmer',
              email: 'farmer@saveful.com',
              phoneNumber: '9999999999',
              createdAt: new Date().toISOString(),
            },
            organisation: {
              name: 'Green Valley Farm',
              address: 'Demo Farm Address',
              logoUrl: '',
              type: 'FARMER',
            },
            role: {
              orgRole: 'OWNER',
              siteRole: null,
            },
            sites: [],
          },
        } as any);

        return;
      }

      setLoading(true);

      const res = await authService.login(trimmedEmail, password);
      const data = res.data;

      await SecureStore.setItemAsync('accessToken', data.accessToken);

      try {
        const profileRes = await authService.profile();
        const authUser = buildAuthUserFromProfile(
          profileRes.data,
          data.accessToken,
          data.siteAccess,
        );
        setRole(resolveUserRole(authUser));
        setAuthUser(authUser);
      } catch (profileError) {
        await SecureStore.deleteItemAsync('accessToken');
        throw profileError;
      }
    } catch (loginError: unknown) {
      const status = isAxiosError(loginError) ? loginError.response?.status : undefined;
      const apiMessage = isAxiosError(loginError)
        ? extractApiMessage(loginError.response?.data)
        : null;
      const isUnverified =
        status === 403 &&
        typeof apiMessage === 'string' &&
        apiMessage.toLowerCase().includes('verify');

      if (isUnverified) {
        navigation.navigate('EmailVerification', {
          email: trimmedEmail,
          autoResend: true,
        });
        return;
      }

      setError(
        getUserFriendlyErrorMessage(
          loginError,
          'Email or password is incorrect. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    try {
      if (loading) return;
      setError('');

      if (!trimmedEmail) {
        setError('Please enter your email address.');
        return;
      }

      if (!isValidEmail(trimmedEmail)) {
        setError('Please enter a valid email address.');
        return;
      }

      setLoading(true);

      const res = await authService.forgotPassword(trimmedEmail);

      if (res.data?.accountExists === false || res.data?.userExists === false) {
        setError(getForgotPasswordErrorMessage({
          response: { status: 404, data: { message: 'not found' } },
        }));
        return;
      }

      setOtp(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmPassword('');
      setResetError('');
      setResetStep(1);
      setMode('login');
      setResetModalVisible(true);
    } catch (e: unknown) {
      setError(getForgotPasswordErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resending || loading) return;
    setResetError('');

    if (!trimmedEmail) {
      setResetError('Please enter your email address.');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setResetError('Please enter a valid email address.');
      return;
    }

    setResending(true);
    try {
      const res = await authService.forgotPassword(trimmedEmail);

      if (res.data?.accountExists === false || res.data?.userExists === false) {
        setResetError(getForgotPasswordErrorMessage({
          response: { status: 404, data: { message: 'not found' } },
        }));
        return;
      }

      setOtp(['', '', '', '', '', '']);
      setNewPassword('');
      setConfirmPassword('');
      showSuccessAlert(
        getForgotPasswordSuccessMessage(res.data?.message),
        'Code resent',
      );
    } catch (e: unknown) {
      setResetError(getForgotPasswordErrorMessage(e));
    } finally {
      setResending(false);
    }
  };

  const handleReset = async () => {
    try {
      if (loading) return;
      setResetError('');
      const enteredOtp = otp.join('');

      if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
        setResetError('Please enter a valid email address.');
        return;
      }

      if (enteredOtp.length !== 6) {
        setResetError('Please enter the 6-digit verification code.');
        return;
      }

      if (!isValidPassword(newPassword)) {
        setResetError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }

      if (!passwordsMatch(newPassword, confirmPassword)) {
        setResetError('Passwords do not match. Please re-enter.');
        return;
      }

      setLoading(true);

      await authService.resetPassword(trimmedEmail, enteredOtp, newPassword);

      closeResetModal();
      showSuccessAlert(
        'Password reset successful. You can sign in now.',
        'Success',
      );
    } catch (e: unknown) {
      setResetError(
        getOtpVerificationErrorMessage(
          e,
          'Could not reset password. Please try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const next = [...otp];
    next[index] = text.replace(/[^0-9]/g, '');
    setOtp(next);
    setResetError('');

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleOtpBackspace = (digit: string, index: number) => {
    if (!digit && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View style={styles.topAccent} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            (mode === 'login' || mode === 'forgot') && styles.scrollContentCentered,
            {
              paddingTop: insets.top + hp(3.5),
              paddingBottom: insets.bottom + hp(2.5),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            style={styles.backRow}
            onPress={() => {
              if (resetModalVisible) {
                closeResetModal();
                return;
              }
              if (mode === 'login') {
                navigation.navigate('Welcome');
              } else {
                switchMode('login');
              }
            }}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={normalize(20)} color={palette.kale} />
            <AppText variant="bodyBold" style={styles.backRowText}>
              {mode === 'login' ? 'Back' : 'Back to sign in'}
            </AppText>
          </Pressable>

          <View style={styles.formShell}>
            {mode === 'login' ? (
              <View style={styles.iconRow}>
                {valueProps.map((item) => (
                  <View key={item.label} style={styles.iconItem}>
                    <Image source={item.image} style={styles.valuePropImage} resizeMode="contain" />
                    <AppText variant="caption" color={palette.textMuted} style={styles.iconLabel}>
                      {item.label}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.formCard}>
              <View style={styles.formHeaderBand}>
                <Image
                  source={require('../../../assets/intro/logo.png')}
                  style={styles.formLogo}
                  resizeMode="contain"
                />
                <AppText variant="h6" color={palette.primary} style={styles.formTitle}>
                  {copy.title}
                </AppText>
                <AppText variant="bodySmall" color={palette.textMuted} style={styles.formSubtitle}>
                  {copy.subtitle}
                </AppText>
              </View>

              <View style={styles.fieldsPanel}>
                <InputField
                  label="Email address"
                  placeholder="your@email.com"
                  compact
                  labelVariant="label"
                  value={email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={(text) => {
                    setEmail(text);
                    setError('');
                  }}
                />

                {mode === 'login' ? (
                  <>
                    <InputField
                      label="Password"
                      placeholder="Enter your password"
                      compact
                      labelVariant="label"
                      value={password}
                      secureTextEntry
                      isPassword
                      onChangeText={(t) => {
                        setPassword(t);
                        setError('');
                      }}
                    />

                    <Pressable
                      onPress={() => switchMode('forgot')}
                      style={styles.forgotLinkWrap}
                      hitSlop={4}
                    >
                      <AppText variant="bodySmall" color={palette.primary} style={styles.forgotLink}>
                        Forgot password?
                      </AppText>
                    </Pressable>
                  </>
                ) : null}

                <FormErrorBanner message={error} />

                {mode === 'login' ? (
                  <PrimaryButton
                    label={loading ? 'Signing in...' : 'Sign in'}
                    onPress={handleLogin}
                    disabled={loading}
                    showArrow
                  />
                ) : null}

                {mode === 'forgot' ? (
                  <>
                    <PrimaryButton
                      label={loading ? 'Sending...' : 'Send verification code'}
                      onPress={handleSendCode}
                      disabled={loading}
                    />
                    <Pressable
                      onPress={() => switchMode('login')}
                      style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
                    >
                      <AppText variant="bodyBold" color={palette.primary} style={styles.secondaryButtonText}>
                        Back to sign in
                      </AppText>
                    </Pressable>
                  </>
                ) : null}
              </View>

              {mode === 'login' ? (
                <View style={styles.signUpFooter}>
                  <AppText variant="bodySmall" color={palette.textMuted} style={styles.signUpPrompt}>
                    Don&apos;t have an account?
                  </AppText>
                  <Pressable onPress={() => navigation.navigate('RoleSelectionMain')} hitSlop={8}>
                    <AppText variant="bodyBold" color={palette.primary} style={styles.signUpLink}>
                      Sign up
                    </AppText>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SavefulModal
        visible={resetModalVisible}
        onClose={closeResetModal}
        title={resetStep === 1 ? 'Verify your code' : 'Set new password'}
        subtitle={
          resetStep === 1
            ? trimmedEmail
              ? `Enter the 6-digit code sent to ${trimmedEmail}.`
              : 'Enter the 6-digit code from your email.'
            : 'Choose a secure password for your account.'
        }
        error={resetError}
      >
        <ResetPasswordModalFields
          step={resetStep}
          onStepChange={(step) => {
            setResetError('');
            setResetStep(step);
          }}
          otp={otp}
          inputs={inputs}
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          loading={loading}
          resending={resending}
          onOtpChange={handleOtpChange}
          onOtpBackspace={handleOtpBackspace}
          onResendCode={handleResendCode}
          onNewPasswordChange={(value) => {
            setNewPassword(value);
            setResetError('');
          }}
          onConfirmPasswordChange={(value) => {
            setConfirmPassword(value);
            setResetError('');
          }}
          onReset={handleReset}
          onCancel={closeResetModal}
          onSetError={setResetError}
          onClearError={() => setResetError('')}
        />
      </SavefulModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topAccent: {
    width: '100%',
    height: hp(0.35),
    backgroundColor: palette.middlegreen,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: wp(5),
    gap: hp(1.2),
  },

  scrollContentCentered: {
    justifyContent: 'center',
  },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: wp(0.5),
    paddingVertical: hp(0.3),
    marginBottom: hp(0.5),
  },

  backRowText: {
    color: palette.kale,
    textTransform: 'none',
    fontSize: normalize(15),
  },

  formShell: {
    flex: 1,
    gap: hp(1.8),
    marginTop: hp(1.5),
  },

  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: wp(2),
    gap: wp(2),
  },

  iconItem: {
    flex: 1,
    alignItems: 'center',
    gap: hp(0.5),
  },

  valuePropImage: {
    width: normalize(72),
    height: normalize(72),
  },

  iconLabel: {
    textAlign: 'center',
    fontSize: normalize(10),
    lineHeight: normalize(13),
    letterSpacing: 0.3,
  },

  formCard: {
    backgroundColor: palette.white,
    borderRadius: normalize(24),
    borderWidth: 1,
    borderColor: palette.strokecream,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  formHeaderBand: {
    alignItems: 'center',
    gap: hp(0.6),
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    paddingBottom: hp(2),
    backgroundColor: palette.creme,
    borderBottomWidth: 1,
    borderBottomColor: palette.strokecream,
  },

  formLogo: {
    width: wp(36),
    height: hp(5),
  },

  formTitle: {
    textAlign: 'center',
    fontSize: normalize(24),
    lineHeight: normalize(30),
    textTransform: 'none',
  },

  formSubtitle: {
    textAlign: 'center',
    fontSize: normalize(14),
    lineHeight: normalize(20),
    textTransform: 'none',
    maxWidth: wp(72),
  },

  fieldsPanel: {
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    paddingBottom: hp(2.2),
    gap: hp(1.3),
  },

  forgotLinkWrap: {
    alignSelf: 'flex-end',
    marginTop: -hp(0.4),
  },

  forgotLink: {
    textTransform: 'none',
    textDecorationLine: 'underline',
    fontSize: normalize(13),
  },

  modalFields: {
    gap: hp(1.6),
  },

  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: wp(2),
    paddingBottom: hp(0.5),
  },

  stepItem: {
    alignItems: 'center',
    gap: hp(0.5),
    width: wp(24),
  },

  stepDot: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(16),
    borderWidth: 2,
    borderColor: palette.strokecream,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepDotActive: {
    borderColor: palette.kale,
    backgroundColor: palette.kale,
  },

  stepDotText: {
    fontSize: normalize(14),
    color: palette.textMuted,
    textTransform: 'none',
  },

  stepDotTextActive: {
    color: palette.white,
  },

  stepLabel: {
    textAlign: 'center',
    fontSize: normalize(10),
    letterSpacing: 0.3,
  },

  stepLine: {
    width: wp(12),
    height: 2,
    backgroundColor: palette.strokecream,
    marginTop: normalize(15),
  },

  stepLineActive: {
    backgroundColor: palette.kale,
  },

  otpSection: {
    gap: hp(0.8),
  },

  otpLabel: {
    textTransform: 'none',
    color: palette.black,
    fontSize: normalize(16),
  },

  otpRow: {
    flexDirection: 'row',
    gap: wp(1.5),
  },

  otpInput: {
    flex: 1,
    height: normalize(48),
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: normalize(10),
    backgroundColor: palette.white,
    textAlign: 'center',
    fontSize: normalize(18),
    color: palette.text,
  },

  otpInputFilled: {
    borderColor: palette.kale,
    backgroundColor: '#F4FAF6',
  },

  resendButton: {
    alignSelf: 'center',
    paddingVertical: hp(0.4),
  },

  resendText: {
    textTransform: 'none',
    textDecorationLine: 'underline',
    fontSize: normalize(13),
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2),
    backgroundColor: '#FFF0EE',
    borderWidth: 1,
    borderColor: palette.validation,
    borderRadius: normalize(10),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
  },

  errorBannerText: {
    flex: 1,
    color: palette.validation,
    textTransform: 'none',
    lineHeight: normalize(18),
  },

  primaryButton: {
    backgroundColor: palette.eggplant,
    minHeight: normalize(52),
    paddingVertical: hp(1.6),
    paddingHorizontal: wp(5),
    borderRadius: normalize(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    marginTop: hp(0.4),
    ...Platform.select({
      ios: {
        shadowColor: palette.eggplant,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  primaryButtonDisabled: {
    opacity: 0.65,
  },

  primaryButtonText: {
    color: palette.white,
    fontSize: normalize(16),
    textTransform: 'none',
  },

  secondaryButton: {
    minHeight: normalize(48),
    paddingVertical: hp(1.4),
    borderRadius: normalize(14),
    borderWidth: 1,
    borderColor: palette.strokecream,
    backgroundColor: palette.creme,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    textTransform: 'none',
    fontSize: normalize(15),
  },

  signUpFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: wp(1.5),
    paddingVertical: hp(1.8),
    paddingHorizontal: wp(5),
    borderTopWidth: 1,
    borderTopColor: palette.strokecream,
    backgroundColor: '#FAFAF5',
  },

  signUpPrompt: {
    fontSize: normalize(14),
    textTransform: 'none',
  },

  signUpLink: {
    fontSize: normalize(14),
    textTransform: 'none',
    textDecorationLine: 'underline',
  },

  buttonPressed: {
    opacity: 0.85,
  },
});
