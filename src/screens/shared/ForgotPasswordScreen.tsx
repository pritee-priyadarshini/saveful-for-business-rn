import React, { useRef, useState, useEffect } from 'react';
import {
    Alert,
    Pressable,
    StyleSheet,
    TextInput,
    View,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import { Screen } from '../../components/Screen';
import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
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

export default function ForgotPasswordScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { authUser } = useAppContext();

    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [formInfo, setFormInfo] = useState('');
    const [codeSent, setCodeSent] = useState(false);

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const inputs = useRef<(TextInput | null)[]>([]);

    useEffect(() => {
        if (authUser?.profile?.user) {
            setEmail(authUser.profile.user.email || '');
            setFirstName(authUser.profile.user.firstName || '');
        }
    }, [authUser]);

    const handleChange = (text: string, index: number) => {
        const next = [...otp];
        next[index] = text.replace(/[^0-9]/g, '');
        setOtp(next);
        setFormError('');

        if (text && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handleBackspace = (text: string, index: number) => {
        if (!text && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    };

    const handleSendCode = async () => {
        if (loading) return;
        const trimmedEmail = email.trim().toLowerCase();

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
            setFormInfo(getForgotPasswordSuccessMessage(res.data?.message));
        } catch (error: any) {
            setFormError(getForgotPasswordErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (loading) return;
        const trimmedEmail = email.trim().toLowerCase();
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

            Alert.alert('Success', res.data.message || 'Password updated successfully.', [
                {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                },
            ]);
        } catch (error: any) {
            const message = error?.response?.data?.message || 'Something went wrong';
            setFormError(Array.isArray(message) ? message.join('\n') : message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <Screen scrollable backgroundColor={palette.creme}>
                <ImageBackground
                    source={require('../../../assets/placeholder/feed-bg.png')}
                    style={styles.headerBg}
                >
                    <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={26} color={palette.white} />
                    </Pressable>

                    <AppText variant="h5" color={palette.white}>
                        Reset Password
                    </AppText>
                </ImageBackground>

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
                        }}
                        editable={!authUser}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <Button
                        label={loading ? 'Sending...' : codeSent ? 'Resend Reset Code' : 'Send Reset Code'}
                        onPress={handleSendCode}
                        loading={loading}
                        disabled={loading}
                    />

                    {codeSent ? (
                        <AppText variant="bodySmall" style={styles.hintText}>
                            {formInfo || 'A verification code was sent to your email.'}
                        </AppText>
                    ) : null}

                    <View style={styles.otpContainer}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => {
                                    inputs.current[index] = ref;
                                }}
                                style={styles.otpInput}
                                keyboardType="number-pad"
                                maxLength={1}
                                value={digit}
                                onChangeText={(t) => handleChange(t, index)}
                                onKeyPress={({ nativeEvent }) => {
                                    if (nativeEvent.key === 'Backspace') {
                                        handleBackspace(digit, index);
                                    }
                                }}
                            />
                        ))}
                    </View>

                    <InputField
                        label="New Password"
                        value={password}
                        onChangeText={(value) => {
                            setPassword(value);
                            setFormError('');
                        }}
                        secureTextEntry
                        isPassword
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
                    />

                    {formError ? (
                        <AppText variant="bodySmall" style={styles.errorText}>
                            {formError}
                        </AppText>
                    ) : null}

                    <Button
                        label={loading ? 'Resetting...' : 'Save New Password'}
                        onPress={handleReset}
                        loading={loading}
                        disabled={loading}
                    />
                </View>
            </Screen>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    headerBg: {
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
    },

    backButton: {
        position: 'absolute',
        top: 20,
        left: 15,
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

    errorText: {
        color: palette.validation,
        textAlign: 'center',
        textTransform: 'none',
    },
});
