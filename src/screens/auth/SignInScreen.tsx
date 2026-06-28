import React, { useRef, useState } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
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

import { Screen } from '../../components/Screen';
import { FullBleedBackground } from '../../components/FullBleedBackground';
import { AppText } from '../../components/AppText';
import { InputField } from '../../components/InputField';
import { useAppContext } from '../../store/AppContext';
import { palette } from '../../theme/colors';
import { Ionicons } from '@expo/vector-icons';

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

export function SignInScreen() {
    const { setAuthUser, setRole } = useAppContext();
    const insets = useSafeAreaInsets();
    useTransparentStatusBar('light');

    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const inputs = useRef<(TextInput | null)[]>([]);

    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);

    const [error, setError] = useState('');

    const trimmedEmail = email.trim().toLowerCase();

    const switchMode = (next: 'login' | 'forgot' | 'reset') => {
        setMode(next);
        setError('');
        if (next === 'login') {
            setOtp(['', '', '', '', '', '']);
            setNewPassword('');
            setConfirmPassword('');
        }
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

            // DEMO FARMER LOGIN
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

        } catch (error: unknown) {
            const status = isAxiosError(error) ? error.response?.status : undefined;
            const apiMessage = isAxiosError(error)
                ? extractApiMessage(error.response?.data)
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
                    error,
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

            Alert.alert('Check your email', getForgotPasswordSuccessMessage(res.data?.message));
            setOtp(['', '', '', '', '', '']);
            setNewPassword('');
            setConfirmPassword('');
            setMode('reset');

        } catch (e: unknown) {
            setError(getForgotPasswordErrorMessage(e));
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (resending || loading) return;
        setError('');

        if (!trimmedEmail) {
            setError('Please enter your email address.');
            return;
        }

        if (!isValidEmail(trimmedEmail)) {
            setError('Please enter a valid email address.');
            return;
        }

        setResending(true);
        try {
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
            showSuccessAlert(
                getForgotPasswordSuccessMessage(res.data?.message),
                'Code resent',
            );
        } catch (e: unknown) {
            setError(getForgotPasswordErrorMessage(e));
        } finally {
            setResending(false);
        }
    };

    const handleReset = async () => {
        try {
            if (loading) return;
            setError('');
            const enteredOtp = otp.join('');

            if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
                setError('Please enter a valid email address.');
                return;
            }

            if (enteredOtp.length !== 6) {
                setError('Please enter the 6-digit verification code.');
                return;
            }

            if (!isValidPassword(newPassword)) {
                setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
                return;
            }

            if (!passwordsMatch(newPassword, confirmPassword)) {
                setError('Passwords do not match. Please re-enter.');
                return;
            }

            setLoading(true);

            await authService.resetPassword(trimmedEmail, enteredOtp, newPassword);

            showSuccessAlert(
                'Password reset successful. You can sign in now.',
                'Success',
                () => switchMode('login'),
            );

        } catch (e: unknown) {
            setError(
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
        setError('');

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
        <FullBleedBackground source={require('../../../assets/intro/splash_logo.png')}>
            <Pressable
                style={[styles.topBackButton, { top: insets.top + hp(1), left: wp(4) }]}
                onPress={() => navigation.navigate('Welcome')}
                hitSlop={12}
            >
                <Ionicons name="chevron-back" size={normalize(22)} color={palette.white} />
                <AppText variant="bodyBold" style={styles.topBackButtonText}>
                    Back
                </AppText>
            </Pressable>

            <Screen scrollable={false} backgroundColor="transparent" transparentTop>
                <StatusBar style="light" translucent backgroundColor="transparent" />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        <View style={styles.container}>

                            {/* FORM */}
                            <View style={styles.form}>
                                <AppText variant="subheading" style={styles.title}>
                                    {mode === 'login' && 'Welcome Back'}
                                    {mode === 'forgot' && 'Forgot Password'}
                                    {mode === 'reset' && 'Reset Password'}
                                </AppText>

                                {/* EMAIL */}
                                <InputField
                                    label="Email Address *"
                                    placeholder="your@email.com"
                                    value={email}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        setError('');
                                    }}
                                />

                                {/* LOGIN MODE */}
                                {mode === 'login' && (
                                    <>
                                        <InputField
                                            label="Password *"
                                            value={password}
                                            secureTextEntry
                                            isPassword
                                            onChangeText={(t) => {
                                                setPassword(t);
                                                setError('');
                                            }}
                                        />

                                        <TouchableOpacity onPress={() => switchMode('forgot')}>
                                            <AppText variant="caption">
                                                Forgot Password?
                                            </AppText>
                                        </TouchableOpacity>
                                    </>
                                )}

                                {/* FORGOT MODE */}
                                {mode === 'forgot' && (
                                    <>
                                        {/* SUBTEXT */}
                                        <AppText variant='bodySmall' style={styles.subText}>
                                            Enter your registered email address. We’ll send you a verification code to reset your password.
                                        </AppText>

                                        {/* SEND CODE */}
                                        <TouchableOpacity
                                            style={styles.button}
                                            onPress={handleSendCode}
                                            disabled={loading}
                                        >
                                            <AppText variant='label' style={styles.buttonText}>
                                                {loading ? 'Sending...' : 'Send Verification Code'}
                                            </AppText>
                                        </TouchableOpacity>

                                        {/* BACK TO SIGN IN */}
                                        <TouchableOpacity
                                            style={styles.backToLogin}
                                            onPress={() => switchMode('login')}
                                        >
                                            <AppText variant='label' style={styles.backText}>
                                                Back to Sign In
                                            </AppText>
                                        </TouchableOpacity>
                                    </>
                                )}

                                {/* RESET MODE */}
                                {mode === 'reset' && (
                                    <>
                                        <AppText variant='bodySmall' style={styles.subText}>
                                            Enter the code sent to {trimmedEmail || 'your email'} and choose a new password.
                                        </AppText>

                                        <AppText variant='label'>
                                            Verification code
                                        </AppText>
                                        <View style={styles.otpRow}>
                                            {otp.map((d, i) => (
                                                <TextInput
                                                    key={i}
                                                    ref={(r) => {
                                                        inputs.current[i] = r;
                                                    }}
                                                    style={styles.otp}
                                                    maxLength={1}
                                                    keyboardType="number-pad"
                                                    value={d}
                                                    onChangeText={(t) => handleOtpChange(t, i)}
                                                    onKeyPress={({ nativeEvent }) => {
                                                        if (nativeEvent.key === 'Backspace') {
                                                            handleOtpBackspace(d, i);
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </View>

                                        <Pressable
                                            style={styles.resendButton}
                                            onPress={handleResendCode}
                                            disabled={resending || loading}
                                        >
                                            <AppText variant="label" style={styles.resendText}>
                                                {resending ? 'Resending...' : 'Resend code'}
                                            </AppText>
                                        </Pressable>

                                        <InputField
                                            label="New Password"
                                            value={newPassword}
                                            secureTextEntry
                                            isPassword
                                            onChangeText={(value) => {
                                                setNewPassword(value);
                                                setError('');
                                            }}
                                        />

                                        <InputField
                                            label="Confirm Password"
                                            value={confirmPassword}
                                            secureTextEntry
                                            isPassword
                                            onChangeText={(value) => {
                                                setConfirmPassword(value);
                                                setError('');
                                            }}
                                        />

                                        <TouchableOpacity
                                            style={styles.button}
                                            onPress={handleReset}
                                            disabled={loading}
                                        >
                                            <AppText style={styles.buttonText}>
                                                {loading ? 'Resetting...' : 'Reset Password'}
                                            </AppText>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.backToLogin}
                                            onPress={() => switchMode('login')}
                                        >
                                            <AppText variant="label" style={styles.backText}>
                                                Back to Sign In
                                            </AppText>
                                        </TouchableOpacity>
                                    </>
                                )}

                                {/* ERROR */}
                                {error ? (
                                    <AppText style={styles.error}>{error}</AppText>
                                ) : null}

                                {/* LOGIN BUTTON */}
                                {mode === 'login' && (
                                    <TouchableOpacity
                                        style={[styles.button, loading && { opacity: 0.65 }]}
                                        onPress={handleLogin}
                                        disabled={loading}
                                    >
                                        <AppText style={styles.buttonText}>
                                            {loading ? 'Signing In...' : 'Sign In'}
                                        </AppText>
                                    </TouchableOpacity>
                                )}

                                {mode === 'login' && (
                                    <View style={styles.signUpRow}>
                                        <AppText variant="bodySmall" style={styles.signUpPrompt}>
                                            Don't have an account?
                                        </AppText>
                                        <Pressable onPress={() => navigation.navigate('RoleSelectionMain')}>
                                            <AppText variant="bodySmall" style={styles.signUpLink}>
                                                Sign up here
                                            </AppText>
                                        </Pressable>
                                    </View>
                                )}

                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Screen>
        </FullBleedBackground>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingTop: hp(6),
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: wp(6),
    },
    top: {
        alignItems: 'center',
        marginBottom: hp(23),
    },
    logo: {
        width: wp(50),
        height: hp(10),
    },
    form: {
        borderColor: palette.border,
        borderWidth: 1,
        backgroundColor: palette.white,
        borderRadius: normalize(20),
        padding: wp(6),
        gap: hp(2),
        marginBottom: -hp(20),
        marginTop: -hp(10),
    },
    title: {
        textAlign: 'center',
        fontSize: normalize(20),
    },
    passwordHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: hp(0.5),
    },
    eye: {
        position: 'absolute',
        right: wp(3),
        top: hp(4),
    },
    button: {
        backgroundColor: palette.primary,
        padding: hp(1.8),
        borderRadius: normalize(14),
        alignItems: 'center',
    },
    buttonText: {
        color: palette.white,
        fontSize: normalize(16),
    },
    error: {
        color: palette.danger,
        textAlign: 'center',
        fontSize: normalize(12),
    },

    otp: {
        flex: 1,
        height: 50,
        borderWidth: 1,
        borderRadius: 10,
        textAlign: 'center',
    },

    otpRow: {
        flexDirection: 'row',
        gap: 6,
    },

    resendButton: {
        alignSelf: 'center',
    },

    resendText: {
        color: palette.primary,
        textDecorationLine: 'underline',
        fontSize: normalize(14),
    },

    subText: {
        textAlign: 'center',
        color: palette.textMuted,
        fontSize: normalize(13),
        lineHeight: normalize(15),
        marginBottom: hp(1),
    },

    backToLogin: {
        backgroundColor: palette.radish,
        padding: hp(1.8),
        borderRadius: normalize(14),
        alignItems: 'center',
    },

    backText: {
        color: palette.primary,
        fontSize: normalize(13),
    },

    topBackButton: {
        position: 'absolute',
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1),
        paddingVertical: hp(0.8),
        paddingHorizontal: wp(3),
        borderRadius: normalize(20),
        backgroundColor: 'rgba(75, 33, 118, 0.85)',
    },

    topBackButtonText: {
        color: palette.white,
        fontSize: normalize(14),
    },

    signUpRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: wp(1),
    },

    signUpPrompt: {
        color: palette.textMuted,
        fontSize: normalize(14),
    },

    signUpLink: {
        color: palette.primary,
        fontSize: normalize(14),
        textDecorationLine: 'underline',
    },
});