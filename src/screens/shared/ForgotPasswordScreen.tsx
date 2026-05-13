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

export default function ForgotPasswordScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const { authUser } = useAppContext();


    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');

    const [loading, setLoading] = useState(false);

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const inputs = useRef<(TextInput | null)[]>([]);

    const [otpSent, setOtpSent] = useState(false);

    useEffect(() => {
        if (email && !otpSent) {
            handleSendCode();
            setOtpSent(true);
        }
    }, [email]);

    useEffect(() => {
        if (authUser?.profile?.user) {
            setEmail(authUser.profile.user.email || '');
            setFirstName(authUser.profile.user.firstName || '');
        }
    }, []);

    const handleChange = (text: string, index: number) => {
        const next = [...otp];
        next[index] = text.replace(/[^0-9]/g, '');
        setOtp(next);

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
        try {
            if (!email.trim()) {
                Alert.alert('Missing Email', 'Enter your email');
                return;
            }

            setLoading(true);

            const res = await authService.forgotPassword(email.trim().toLowerCase());

            Alert.alert('Success', res.data.message);
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        try {
            const enteredOtp = otp.join('');

            if (enteredOtp.length !== 6) {
                Alert.alert('Invalid Code', 'Enter 6-digit OTP');
                return;
            }

            if (!password || password.length < 8) {
                Alert.alert('Invalid Password', 'Min 8 characters required');
                return;
            }

            if (password !== confirmPassword) {
                Alert.alert('Mismatch', 'Passwords do not match');
                return;
            }

            setLoading(true);

            const res = await authService.resetPassword(
                email.trim().toLowerCase(),
                enteredOtp,
                password
            );

            Alert.alert('Success', res.data.message, [
                {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                },
            ]);
        } catch (error: any) {
            Alert.alert('Reset Failed', error?.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

                    {/* FIRST NAME */}
                    <InputField
                        label="First Name"
                        value={firstName}
                        editable={false}
                    />

                    {/* EMAIL */}
                    <InputField
                        label="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        editable={!authUser} // editable only if not logged in
                    />

                    {/* SEND OTP */}
                    <Button
                        label={loading ? 'Sending...' : 'Send Reset Code'}
                        onPress={handleSendCode}
                    />

                    {/* OTP */}
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

                    {/* PASSWORD */}
                    <InputField
                        label="New Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        isPassword
                    />

                    <InputField
                        label="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        isPassword
                    />


                    {/* RESET */}
                    <Button
                        label={loading ? 'Resetting...' : 'Save New Password'}
                        onPress={handleReset}
                    />
                </View>
            </Screen>
        </KeyboardAvoidingView>
    );
}

/* STYLES */

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

    otpContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
    },

    otpInput: {
        flex: 1,
        height: 50,
        borderWidth: 1,
        borderRadius: 10,
        textAlign: 'center',
        fontSize: 18,
    },
});