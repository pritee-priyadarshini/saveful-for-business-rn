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

    const handleLogin = async () => {
        try {
            setError('');
            if (!email || !password) {
                setError('Please enter email and password');
                return;
            }
            setLoading(true);

            const res = await authService.login(
                email.trim().toLowerCase(),
                password
            );
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
                    email: email.trim().toLowerCase(),
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
            if (!email) {
                setError('Enter your email');
                return;
            }

            setLoading(true);

            await authService.forgotPassword(email.trim().toLowerCase());

            Alert.alert('Verification Email Sent', 'Check your inbox for OTP');
            setMode('reset');

        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to send code');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        try {
            const enteredOtp = otp.join('');

            if (enteredOtp.length !== 6) {
                setError('Enter valid OTP');
                return;
            }

            if (newPassword.length < 8) {
                setError('Password must be 8+ characters');
                return;
            }

            if (newPassword !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }

            setLoading(true);

            await authService.resetPassword(
                email.trim().toLowerCase(),
                enteredOtp,
                newPassword
            );

            Alert.alert('Success', 'Password reset successful');
            setMode('login');

        } catch (e: any) {
            setError(e?.response?.data?.message || 'Reset failed');
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (text: string, index: number) => {
        const next = [...otp];
        next[index] = text.replace(/[^0-9]/g, '');
        setOtp(next);

        if (text && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    };

    return (
        <ImageBackground
            source={require('../../../assets/intro/splash.png')}
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
                            <View style={styles.top}>
                                <Image
                                    source={require('../../../assets/intro/logo.png')}
                                    style={styles.logo}
                                    resizeMode="contain"
                                />
                            </View>

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

                                        <TouchableOpacity onPress={() => setMode('forgot')}>
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
                                            onPress={() => {
                                                setMode('login');
                                                setError('');
                                            }}
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
                                                />
                                            ))}
                                        </View>

                                        <InputField
                                            label="New Password"
                                            value={newPassword}
                                            secureTextEntry
                                            isPassword
                                            onChangeText={setNewPassword}
                                        />

                                        <InputField
                                            label="Confirm Password"
                                            value={confirmPassword}
                                            secureTextEntry
                                            isPassword
                                            onChangeText={setConfirmPassword}
                                        />

                                        <TouchableOpacity style={styles.button} onPress={handleReset}>
                                            <AppText style={styles.buttonText}>
                                                {loading ? 'Resetting...' : 'Reset Password'}
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
                                    <TouchableOpacity style={styles.button} onPress={handleLogin}>
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
        marginBottom: hp(15),
        marginTop: -hp(8),
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