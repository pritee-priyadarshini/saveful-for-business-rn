import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  Image,
  ImageBackground,
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { AuthStackParamList } from '../../navigation/types';
import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useAppContext } from '@/store/AppContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'EmailVerification'>;

export function EmailVerificationScreen({ navigation }: Props) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

  const validateOtp = () => {
    const enteredOtp = otp.join('');
    return enteredOtp === '123456';
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

  const { selectedRole } = useAppContext();

  const isRestaurant =
    selectedRole === 'restaurant_single' ||
    selectedRole === 'restaurant_multi';

  return (
    <>
      <Screen backgroundColor={palette.creme} contentStyle={styles.container}>

        <View style={styles.content}>
          <ImageBackground
            source={require('../../../assets/placeholder/feed-bg.png')}
            style={styles.headerBg}
            resizeMode="cover"
          >
            <AppText variant="heading" color={palette.white} style={styles.heading}>
              Verify your email Id
            </AppText>
          </ImageBackground>

          {/* HEADING */}
          <View style={styles.textBlock}>
            <AppText style={styles.subText}>
              A 6-digit OTP has been sent to your email. Please enter it to confirm your account and proceed with Saveful for Business.
            </AppText>
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
          <Pressable style={styles.resendButton}>
            <AppText style={styles.resendText}>Resend Email</AppText>
          </Pressable>

          {/* INFO */}
          <AppText style={styles.infoText}>
            It may take up to 5 minutes to arrive. Please remember to check your junk/spam folder if you don’t see it.
          </AppText>

        </View>

        {/* CTA */}
        <View style={styles.bottom}>
          <Button
            label="Continue"
            onPress={() => {
              if (validateOtp()) {
                setShowSuccess(true);
              } else {
                alert('Invalid/Wrong OTP. Please try again.');
              }
            }}
          />
        </View>

      </Screen>

      <Modal visible={showSuccess} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            {/* TEXT */}
            <View style={styles.textBlock}>
              <AppText variant="heading">YOU’RE ALL SET</AppText>

              {isRestaurant ? (
                <>
                  <AppText style={styles.text}>
                    Start your free 30-day trial and see how Saveful helps you save more,
                    share more, and run smarter.
                  </AppText>

                  <AppText style={styles.subText}>
                    No payment needed to begin.
                  </AppText>
                </>
              ) : (
                <>
                  <AppText style={styles.text}>
                    Start receiving surplus food from nearby businesses and make a bigger
                    impact in your community with Saveful for Business.
                  </AppText>

                  <AppText style={styles.subText}>
                    Saveful is completely free for charities.
                  </AppText>
                </>
              )}
            </View>

            {/* CTA */}
            <Button
              label={isRestaurant ? 'Start Free Trial' : "Let’s be Saveful"}
              onPress={() => {
                setShowSuccess(false);
                navigation.replace('SignIn');
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
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  content: {
    gap: spacing.lg,
  },

  logoContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },

  logo: {
    width: 140,
    height: 60,
  },

  textBlock: {
    gap: spacing.sm,
    alignItems: 'center',
  },

  heading: {
    textAlign: 'center',
    fontWeight: 'bold',
  },

  text: {
    opacity: 0.85,
    textAlign: 'center',
  },

  subText: {
    margin: spacing.sm,
    textAlign: 'center',
    opacity: 0.6,
  },

  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
  },

  otpInput: {
    width: 50,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    textAlign: 'center',
    fontSize: 22,
    backgroundColor: palette.white,
  },

  otpFilled: {
    borderColor: palette.primary,
    shadowColor: palette.primary,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  resendButton: {
    marginTop: spacing.md,
    alignSelf: 'center',
  },

  resendText: {
    color: palette.primary,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },

  infoText: {
    textAlign: 'center',
    margin: spacing.sm,
    opacity: 0.6,
    lineHeight: 20,
  },

  bottom: {
    margin: spacing.xxl,
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },

  modalCard: {
    backgroundColor: palette.creme,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.lg,
    alignItems: 'center',
  },
});