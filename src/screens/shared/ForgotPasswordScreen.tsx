import React, { useRef, useState, useEffect } from 'react';
import {
    Pressable,
    StyleSheet,
    TextInput,
    View,
    Keyboard,
    Platform,
    ScrollView,
    Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import { Screen } from '../../components/Screen';
import { StackHeroHeader } from '../../components/StackHeroHeader';
import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authService } from '@/services/auth.service';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { useAppContext } from '@/store/AppContext';
import {
    isValidEmail,
    isValidPassword,
    MIN_PASSWORD_LENGTH,
    passwordsMatch,
    getForgotPasswordErrorMessage,
    getForgotPasswordSuccessMessage,
} from '@/utils/validation';
import {
    getOtpVerificationErrorMessage,
    showSuccessAlert,
} from '@/utils/apiError';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { hp } from '@/utils/responsive';
import {
    KeyboardSubmitAccessory,
    otpInputKeyboardProps,
} from '@/components/KeyboardSubmitAccessory';
import { applyOtpInput, otpPasteFieldProps } from '@/utils/otpInput';

export default function ForgotPasswordScreen() {
    useTransparentStatusBar('light');
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { authUser } = useAppContext();

    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [formError, setFormError] = useState('');
    const [formInfo, setFormInfo] = useState('');
    const [codeSent, setCodeSent] = useState(false);

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const inputs = useRef<(TextInput | null)[]>([]);
    const scrollRef = useRef<ScrollView>(null);
    const otpRef = useRef<View>(null);
    const scrollY = useRef(0);
    const insets = useSafeAreaInsets();
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    const trimmedEmail = email.trim().toLowerCase();

    useEffect(() => {
        const show = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (event) => setKeyboardHeight(event.endCoordinates.height),
        );
        const hide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardHeight(0),
        );
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);

    const scrollNodeIntoView = (node?: View | null) => {
        setTimeout(() => {
            node?.measureInWindow((_x, y, _w, height) => {
                const accessory = codeSent && Platform.OS === 'android' ? 56 : 0;
                const visibleBottom =
                    Dimensions.get('window').height -
                    Math.max(keyboardHeight, 280) -
                    accessory -
                    24;
                const overflow = y + height - visibleBottom;
                if (overflow <= 8) return;
                scrollRef.current?.scrollTo({
                    y: Math.max(0, scrollY.current + overflow),
                    animated: true,
                });
            });
        }, 80);
    };

    useEffect(() => {
        if (!codeSent) return;
        const timer = setTimeout(() => scrollNodeIntoView(otpRef.current), 220);
        return () => clearTimeout(timer);
    }, [codeSent]);

    useEffect(() => {
        if (authUser?.profile?.user) {
            setEmail(authUser.profile.user.email || '');
            setFirstName(authUser.profile.user.firstName || '');
        }
    }, [authUser]);

    const handleChange = (text: string, index: number) => {
        const { next, focusIndex } = applyOtpInput(otp, index, text);
        setOtp(next);
        setFormError('');
        inputs.current[focusIndex]?.focus();
    };

    const handleBackspace = (text: string, index: number) => {
        if (!text && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleSendCode = async () => {
        if (loading || resending) return;

        if (!trimmedEmail) {
            setFormError('Please enter your email address.');
            return;
        }

        if (!isValidEmail(trimmedEmail)) {
            setFormError('Please enter a valid email address.');
            return;
        }

        try {
            setFormError('');
            setFormInfo('');
            setLoading(true);

            const res = await authService.forgotPassword(trimmedEmail);

            if (res.data?.accountExists === false || res.data?.userExists === false) {
                setFormError(getForgotPasswordErrorMessage({
                    response: { status: 404, data: { message: 'not found' } },
                }));
                return;
            }

            setCodeSent(true);
            setOtp(['', '', '', '', '', '']);
            setPassword('');
            setConfirmPassword('');
            setFormInfo(getForgotPasswordSuccessMessage(res.data?.message));
        } catch (error: unknown) {
            setFormError(getForgotPasswordErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (resending || loading) return;

        if (!trimmedEmail) {
            setFormError('Please enter your email address.');
            return;
        }

        if (!isValidEmail(trimmedEmail)) {
            setFormError('Please enter a valid email address.');
            return;
        }

        setResending(true);
        setFormError('');

        try {
            const res = await authService.forgotPassword(trimmedEmail);

            if (res.data?.accountExists === false || res.data?.userExists === false) {
                setFormError(getForgotPasswordErrorMessage({
                    response: { status: 404, data: { message: 'not found' } },
                }));
                return;
            }

            setCodeSent(true);
            setOtp(['', '', '', '', '', '']);
            setPassword('');
            setConfirmPassword('');
            setFormInfo(getForgotPasswordSuccessMessage(res.data?.message));
            showSuccessAlert('A new reset code was sent to your email.', 'Code resent');
        } catch (error: unknown) {
            setFormError(getForgotPasswordErrorMessage(error));
        } finally {
            setResending(false);
        }
    };

    const handleReset = async () => {
        if (loading) return;
        const enteredOtp = otp.join('');

        if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
            setFormError('Please enter a valid email address.');
            return;
        }

        if (!codeSent) {
            setFormError('Please send a reset code to your email first.');
            return;
        }

        if (enteredOtp.length !== 6) {
            setFormError('Please enter the 6-digit verification code.');
            return;
        }

        if (!isValidPassword(password)) {
            setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
            return;
        }

        if (!passwordsMatch(password, confirmPassword)) {
            setFormError('Passwords do not match. Please re-enter.');
            return;
        }

        try {
            setFormError('');
            setLoading(true);

            const res = await authService.resetPassword(trimmedEmail, enteredOtp, password);

            showSuccessAlert(
                res.data.message || 'Password updated successfully.',
                'Success',
                () => navigation.goBack(),
            );
        } catch (error: unknown) {
            setFormError(
                getOtpVerificationErrorMessage(
                    error,
                    'Could not reset password. Please try again.',
                ),
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Screen
                scrollable
                keyboardAware
                backgroundColor={palette.creme}
                transparentTop
                scrollRef={scrollRef}
                onScroll={(event) => {
                    scrollY.current = event.nativeEvent.contentOffset.y;
                }}
                contentStyle={[
                    styles.screen,
                    {
                        paddingBottom:
                            insets.bottom +
                            hp(4) +
                            (Platform.OS === 'android' ? keyboardHeight : 0),
                    },
                ]}
            >
                <StatusBar style="light" translucent backgroundColor="transparent" />
                <StackHeroHeader
                    title="Reset Password"
                    source={require('../../../assets/placeholder/feed-bg.png')}
                    height={hp(16)}
                    showBack
                    onBack={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        }
                    }}
                />

                <View style={styles.content}>
                    <AppText variant="heading" style={styles.title}>
                        Secure Password Reset
                    </AppText>

                    {firstName ? (
                        <InputField
                            label="First Name"
                            value={firstName}
                            editable={false}
                        />
                    ) : null}

                    <InputField
                        label="Email Address"
                        value={email}
                        onChangeText={(value) => {
                            setEmail(value);
                            setFormError('');
                            setFormInfo('');
                            setCodeSent(false);
                        }}
                        editable={!authUser}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        onFieldFocus={scrollNodeIntoView}
                    />

                    <Button
                        label={loading ? 'Sending...' : codeSent ? 'Resend Reset Code' : 'Send Reset Code'}
                        onPress={handleSendCode}
                        loading={loading && !resending}
                        disabled={loading || resending}
                    />

                    {codeSent ? (
                        <AppText variant="bodySmall" style={styles.hintText}>
                            {formInfo || 'A verification code was sent to your email.'}
                        </AppText>
                    ) : null}

                    {codeSent ? (
                        <>
                            <AppText variant="label">
                                Verification code
                            </AppText>

                            <View ref={otpRef} style={styles.otpContainer}>
                                {otp.map((digit, index) => (
                                    <TextInput
                                        key={index}
                                        ref={(ref) => {
                                            inputs.current[index] = ref;
                                        }}
                                        style={styles.otpInput}
                                        {...otpInputKeyboardProps('saveful-forgot-otp-submit')}
                                        {...otpPasteFieldProps}
                                        value={digit}
                                        onChangeText={(t) => handleChange(t, index)}
                                        onFocus={() => scrollNodeIntoView(otpRef.current)}
                                        onSubmitEditing={() => Keyboard.dismiss()}
                                        onKeyPress={({ nativeEvent }) => {
                                            if (nativeEvent.key === 'Backspace') {
                                                handleBackspace(digit, index);
                                            }
                                        }}
                                    />
                                ))}
                            </View>

                            <Pressable
                                style={styles.resendLink}
                                onPress={handleResendCode}
                                disabled={resending || loading}
                            >
                                <AppText variant="label" style={styles.resendLinkText}>
                                    {resending ? 'Resending...' : 'Resend code'}
                                </AppText>
                            </Pressable>

                            <InputField
                                label="New Password"
                                value={password}
                                onChangeText={(value) => {
                                    setPassword(value);
                                    setFormError('');
                                }}
                                secureTextEntry
                                isPassword
                                onFieldFocus={scrollNodeIntoView}
                            />

                            <InputField
                                label="Confirm Password"
                                value={confirmPassword}
                                onChangeText={(value) => {
                                    setConfirmPassword(value);
                                    setFormError('');
                                }}
                                secureTextEntry
                                isPassword
                                onFieldFocus={scrollNodeIntoView}
                            />

                            <Button
                                label={loading ? 'Saving...' : 'Save New Password'}
                                onPress={handleReset}
                                loading={loading}
                                disabled={loading}
                            />
                        </>
                    ) : null}

                    {formError ? (
                        <AppText variant="bodySmall" style={styles.errorText}>
                            {formError}
                        </AppText>
                    ) : null}
                </View>
            </Screen>
            {codeSent ? (
                <KeyboardSubmitAccessory
                    nativeID="saveful-forgot-otp-submit"
                    label="Done"
                    onSubmit={() => Keyboard.dismiss()}
                />
            ) : null}
        </>
    );
}

const styles = StyleSheet.create({
    screen: {
        flexGrow: 1,
    },

    content: {
        padding: spacing.lg,
        gap: spacing.lg,
    },

    title: {
        textAlign: 'center',
    },

    hintText: {
        textAlign: 'center',
        color: palette.stone,
        textTransform: 'none',
    },

    otpContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
    },

    otpInput: {
        flex: 1,
        height: 50,
        borderWidth: 1,
        borderColor: '#D9D9D9',
        borderRadius: 10,
        textAlign: 'center',
        fontSize: 18,
        backgroundColor: palette.white,
    },

    resendLink: {
        alignSelf: 'center',
    },

    resendLinkText: {
        color: palette.primary,
        textDecorationLine: 'underline',
        textTransform: 'none',
    },

    errorText: {
        color: palette.validation,
        textAlign: 'center',
        textTransform: 'none',
    },
});
