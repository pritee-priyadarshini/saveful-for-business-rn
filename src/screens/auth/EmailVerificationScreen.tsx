import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ImageBackground,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { AuthStackParamList } from '../../navigation/types';
import { palette } from '../../theme/colors';
import { useAppContext } from '@/store/AppContext';
import { authService } from '@/services/auth.service';
import { showErrorAlert, showSuccessAlert, getOtpVerificationErrorMessage } from '@/utils/apiError';
import {
  buildAuthUserFromProfile,
  resolveUserRole,
} from '@/utils/authSession';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailVerification'>;

export function EmailVerificationScreen({ navigation, route }: Props) {

  const {
    selectedRole,
    restaurantForm,
    charityForm,
    farmerForm,
    setAuthUser,
    setRole,
  } = useAppContext();

  const isRestaurant = selectedRole === 'restaurant_single' || selectedRole === 'restaurant_multi';
  const isFarmerProducer = selectedRole === 'farm_business';
  const isFarmer = isFarmerProducer || selectedRole === 'farmer';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');

  const inputs = useRef<Array<TextInput | null>>([]);

  const resolveVerificationEmail = () => {
    const fromRoute = route.params?.email?.trim().toLowerCase();
    const fromForm = (
      isRestaurant ? restaurantForm.email : isFarmer ? farmerForm.email : charityForm.email
    )?.trim().toLowerCase();

    return verificationEmail || fromRoute || fromForm || '';
  };

  useEffect(() => {
    const resolved = resolveVerificationEmail();
    if (resolved) {
      setVerificationEmail(resolved);
    }
  }, [
    route.params?.email,
    restaurantForm.email,
    farmerForm.email,
    charityForm.email,
  ]);

  const handleVerify = async () => {
    if (loading) return;
    try {
      setLoading(true);

      const enteredOtp = otp.join('');
      const email = resolveVerificationEmail();

      if (!email) {
        Alert.alert('Missing email', 'Please enter your email to verify.');
        setLoading(false);
        return;
      }

      const res = await authService.verifyEmail(email, enteredOtp);
      const data = res.data as any;

      await SecureStore.setItemAsync('accessToken', data.accessToken);

      const profileRes = await authService.profile();
      const authUser = buildAuthUserFromProfile(
        profileRes.data,
        data.accessToken,
      );

      setRole(resolveUserRole(authUser));
      setAuthUser(authUser);

      setShowSuccess(true);
    } catch (error: unknown) {
      showErrorAlert(
        error,
        'Verification failed',
        getOtpVerificationErrorMessage(
          error,
          'That code is incorrect. Please check and try again.',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleBackspace = (text: string, index: number) => {
    if (!text && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (resending) return;

    const email = resolveVerificationEmail();

    if (!email) {
      Alert.alert('Missing email', 'Please enter your email to resend the code.');
      return;
    }

    setResending(true);
    try {
      await authService.sendVerificationOtp(email);
      setVerificationEmail(email);
      setOtp(['', '', '', '', '', '']);
      showSuccessAlert(
        `A new verification code was sent to ${email}. Please check your inbox / spam folder.`,
        'Verification code sent',
      );
    } catch (error: unknown) {
      showErrorAlert(error, 'Resend failed', 'We could not resend the code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    if (route.params?.autoResend && resolveVerificationEmail()) {
      handleResend();
    }
  }, [route.params?.autoResend]);

  return (
    <>
      <Screen backgroundColor={palette.creme} contentStyle={styles.container}>

        <View style={styles.content}>
          <ImageBackground
            source={require('../../../assets/placeholder/feed-bg.png')}
            style={styles.headerBg}
            resizeMode="cover"
          >
            <AppText variant="h5" color={palette.white} style={styles.heading}>
              Verify your email Id
            </AppText>
          </ImageBackground>

          {/* HEADING */}
          <View style={styles.textBlock}>
            <AppText variant='bodyLarge' style={styles.subText}>
              A 6-digit OTP has been sent to your email. Please enter it to confirm your account and proceed with Saveful for Business.
            </AppText>
            {verificationEmail ? (
              <AppText variant="bodySmall" style={styles.emailHint}>
                Sent to: {verificationEmail}
              </AppText>
            ) : null}
          </View>

          {/* OTP */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputs.current[index] = ref;
                }}
                style={[styles.otpInput, otp[index] ? styles.otpFilled : null]}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace') {
                    handleBackspace(digit, index);
                  }
                }}
              />
            ))}
          </View>

          {/* RESEND */}
          <Pressable style={styles.resendButton} onPress={handleResend} disabled={resending}>
            <AppText variant='label' style={styles.resendText}>
              {resending ? 'Resending...' : 'Resend Email'}
            </AppText>
          </Pressable>

          {/* INFO */}
          <AppText variant='bodyLarge' style={styles.infoText}>
            It may take up to 5 minutes to arrive. Please remember to check your junk/spam folder if you don't see it.
          </AppText>

        </View>

        {/* CTA */}
        <View style={styles.bottom}>
          <Button
            label={loading ? 'Verifying...' : 'Continue'}
            onPress={handleVerify}
            loading={loading}
            disabled={loading}
          />
        </View>

      </Screen>

      <Modal visible={showSuccess} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            {/* TEXT */}
            <View style={styles.textBlock}>
              <AppText variant="heading">YOU'RE ALL SET</AppText>

              {isRestaurant ? (
                <>
                  <AppText variant="bodyLarge" style={styles.text}>
                    Start your free 30-day trial and see how Saveful helps you save more,
                    share more, and run smarter.
                  </AppText>
                  <AppText variant="bodyBold" style={styles.subText}>
                    No payment needed to begin.
                  </AppText>
                </>
              ) : isFarmerProducer ? (
                <>
                  <AppText variant="bodyLarge" style={styles.text}>
                    Start listing your farm produce and connect with local businesses,
                    charities, and collectors near you.
                  </AppText>
                  <AppText variant="bodyBold" style={styles.subText}>
                    Your first 30 days are completely free.
                  </AppText>
                </>
              ) : (
                <>
                  <AppText variant="bodyLarge" style={styles.text}>
                    Start receiving surplus food from nearby businesses and farms and make
                    a bigger impact in your community with Saveful.
                  </AppText>
                  <AppText variant="bodyBold" style={styles.subText}>
                    Saveful is completely free for charities and farmers.
                  </AppText>
                </>
              )}
            </View>

            {/* CTA */}
            <Button
              label={isRestaurant || isFarmerProducer ? 'Start Free Trial' : 'Go Saveful!'}
              onPress={() => {
                setShowSuccess(false);
              }}
            />

          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
  },

  headerBg: {
    width: '100%',
    height: hp(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2),
  },

  content: {
    gap: hp(2),
  },

  logoContainer: {
    alignItems: 'center',
    gap: hp(1),
  },

  logo: {
    width: normalize(140),
    height: normalize(60),
  },

  textBlock: {
    gap: hp(1),
    alignItems: 'center',
  },

  heading: {
    textAlign: 'center',
    fontSize: normalize(20),
  },

  text: {
    opacity: 0.85,
    textAlign: 'center',
    fontSize: normalize(16),
  },

  subText: {
    margin: hp(1),
    paddingHorizontal: wp(4),
    textAlign: 'center',
    opacity: 0.6,
    fontSize: normalize(14),
  },

  emailHint: {
    textAlign: 'center',
    color: palette.primary,
    fontSize: normalize(13),
  },

  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(2),
    marginHorizontal: wp(4),
  },

  otpInput: {
    width: normalize(50),
    height: normalize(60),
    borderRadius: normalize(16),
    borderWidth: 1,
    borderColor: palette.border,
    textAlign: 'center',
    backgroundColor: palette.white,
    fontSize: normalize(20),
  },

  otpFilled: {
    borderColor: palette.primary,
    shadowColor: palette.primary,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  resendButton: {
    marginTop: hp(2),
    alignSelf: 'center',
  },

  resendText: {
    color: palette.primary,
    textDecorationLine: 'underline',
    fontSize: normalize(14),
  },

  infoText: {
    textAlign: 'center',
    margin: hp(1),
    paddingHorizontal: wp(4),
    opacity: 0.6,
    lineHeight: normalize(20),
    fontSize: normalize(14),
  },

  bottom: {
    margin: hp(4),
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: wp(6),
  },

  modalCard: {
    backgroundColor: palette.creme,
    borderRadius: normalize(24),
    padding: wp(6),
    gap: hp(3),
    alignItems: 'center',
  },
});
