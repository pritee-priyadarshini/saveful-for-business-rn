import React, { useRef, useState } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ImageBackground,
    Image,
    Alert,
    Dimensions,
    Platform,
    KeyboardAvoidingView,
    ScrollView,
    TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { InputField } from '../../components/InputField';
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

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
    const scale = width / 375;
    return Math.round(size * scale);
};

export function SignInScreen() {
    const { setAuthUser } = useAppContext();

    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const inputs = useRef<(TextInput | null)[]>([]);

    const [loading, setLoading] = useState(false);

    const [secure, setSecure] = useState(true);
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

            const profileRes = await authService.profile();
            const profile = profileRes.data;

            setAuthUser({
                ...profile.user,
                accessToken: data.accessToken,
                orgType: profile.organisation?.type,
                orgRole: profile.role?.orgRole,
                siteRole: profile.role?.siteRole,
                profile: profile,
            });

        } catch (error: any) {
            const message = error?.response?.data?.message || 'Invalid credentials';
            const status = error?.response?.status;
            const isUnverified =
                status === 403 &&
                typeof message === 'string' &&
                message.toLowerCase().includes('verify');

            console.log('LOGIN ERROR', error?.response?.data || error);

            if (isUnverified) {
                navigation.navigate('EmailVerification', {
                    email: trimmedEmail,
                    autoResend: true,
                });
                return;
            }

            setError(message);
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

        } catch (e: any) {
            setError(getForgotPasswordErrorMessage(e));
        } finally {
            setLoading(false);
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

            Alert.alert('Success', 'Password reset successful. You can sign in now.');
            switchMode('login');

        } catch (e: any) {
            const message = e?.response?.data?.message || 'Reset failed';
            setError(Array.isArray(message) ? message.join('\n') : message);
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
        <ImageBackground
            source={require('../../../assets/intro/splash_logo.png')}
            style={styles.background}
            resizeMode="cover"
        >
            <Screen scrollable={false} backgroundColor="transparent">
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

                            {/* LOGO */}
                            {/* <View style={styles.top}>
                                <Image
                                    source={require('../../../assets/intro/logo.png')}
                                    style={styles.logo}
                                    resizeMode="contain"
                                />
                            </View> */}


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
                                        <AppText variant='label' >
                                            Enter your verification code
                                        </AppText>
                                        <View style={{ flexDirection: 'row', gap: 6 }}>

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

                            </View>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Screen>
        </ImageBackground >
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
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
});