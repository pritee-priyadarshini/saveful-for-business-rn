import React, { useRef, useState } from 'react';
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
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { AuthStackParamList } from '@/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { authService } from '@/services/auth.service';

export default function ForgotPasswordScreen() {

    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
    const route = useRoute<RouteProp<AuthStackParamList, 'ForgotPassword'>>();

    const [securePassword, setSecurePassword] = useState(true);
    const [secureConfirm, setSecureConfirm] = useState(true);
    const [email, setEmail] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const inputs = useRef<Array<TextInput | null>>([]);

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
                Alert.alert('Missing Email', 'Please enter your registered email.');
                return;
            }
            setLoading(true);

            const res = await authService.forgotPassword(
                email.trim().toLowerCase()
            );
            setCodeSent(true);

            Alert.alert('Reset Code Sent', res.data.message);
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
                Alert.alert('Invalid Code', 'Please enter the 6-digit reset code.');
                return;
            }

            if (!password || password.length < 8) {
                Alert.alert('Invalid Password', 'Password must be at least 8 characters.');
                return;
            }

            if (password !== confirmPassword) {
                Alert.alert('Password Mismatch', 'Passwords do not match.');
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
                    onPress: () => {
                        const from = route.params?.from;
                        if (from === 'Profile') {
                            navigation.goBack();
                        } else {
                            navigation.navigate('SignIn');
                        }
                    },
                },
            ]
            );
        } catch (error: any) {
            Alert.alert('Reset Failed', error?.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleChangeEmail = () => {
        setCodeSent(false);
        setOtp(['', '', '', '', '', '']);
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={20}
        >
            <Screen scrollable backgroundColor={palette.creme} contentStyle={styles.container} >
                <ImageBackground
                    source={require('../../../assets/placeholder/feed-bg.png')}
                    style={styles.headerBg}
                    resizeMode="cover"
                >
                    <Pressable
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons
                            name="arrow-back"
                            size={26}
                            color={palette.white}
                        />
                    </Pressable>

                    <AppText variant="h5" color={palette.white}>
                        Forgot Password
                    </AppText>
                </ImageBackground>

                <View style={styles.content}>
                    <View style={styles.textBlock}>
                        <AppText variant="heading" style={styles.title}>
                            Reset your password
                        </AppText>

                        <AppText variant="bodyLarge" style={styles.subtitle}>
                            Enter your registered email address and we’ll send you a secure
                            reset code.
                        </AppText>
                    </View>

                    {/* EMAIL */}
                    {!codeSent ? (
                        <InputField
                            label="Email Address"
                            placeholder="your@email.com"
                            value={email}
                            onChangeText={setEmail}
                        />
                    ) : (
                        <View style={styles.readonlyWrap}>
                            <AppText variant="label" style={styles.label}>
                                Email Address
                            </AppText>

                            <View style={styles.readonlyBox}>
                                <AppText variant="body">{email}</AppText>
                            </View>
                        </View>
                    )}

                    {/* STEP 1 */}
                    {!codeSent ? (
                        <Button
                            label={loading ? 'Sending...' : 'Send Reset Code'}
                            onPress={handleSendCode}
                        />
                    ) : (
                        <>
                            {/* OTP */}
                            <View style={styles.section}>
                                <AppText variant="label" style={styles.sectionTitle}>
                                    Enter Reset Code
                                </AppText>

                                <View style={styles.otpContainer}>
                                    {otp.map((digit, index) => (
                                        <TextInput
                                            key={index}
                                            ref={(ref) => {
                                                inputs.current[index] = ref;
                                            }}
                                            style={[
                                                styles.otpInput,
                                                digit ? styles.otpFilled : null,
                                            ]}
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

                                <AppText variant="caption" style={styles.helper}>
                                    Check inbox / spam folder for the 6-digit code.
                                </AppText>
                            </View>

                            {/* PASSWORD */}
                            <View>
                                <InputField
                                    label="New Password"
                                    placeholder="Enter new password"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={securePassword}
                                />

                                <TouchableOpacity
                                    style={styles.eye}
                                    onPress={() => setSecurePassword(!securePassword)}
                                >
                                    <Ionicons
                                        name={securePassword ? 'eye-off-outline' : 'eye-outline'}
                                        size={22}
                                        color={palette.textMuted}
                                    />
                                </TouchableOpacity>
                            </View>

                            <View>
                                <InputField
                                    label="Confirm Password"
                                    placeholder="Re-enter password"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={secureConfirm}
                                />

                                <TouchableOpacity
                                    style={styles.eye}
                                    onPress={() => setSecureConfirm(!secureConfirm)}
                                >
                                    <Ionicons
                                        name={secureConfirm ? 'eye-off-outline' : 'eye-outline'}
                                        size={22}
                                        color={palette.textMuted}
                                    />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.buttonGroup}>
                                <Button
                                    label={loading ? 'Resetting...' : 'Reset Password'}
                                    onPress={handleReset}
                                />
                                <Pressable onPress={handleChangeEmail}>
                                    <AppText variant="label" style={styles.changeEmailText}>
                                        Change Email
                                    </AppText>
                                </Pressable>
                            </View>
                        </>
                    )}
                </View>
            </Screen>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: spacing.xxl,
    },

    headerBg: {
        width: '100%',
        height: 170,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },

    backButton: {
        position: 'absolute',
        top: 20,
        left: 15,
        zIndex: 10,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
    },

    content: {
        paddingHorizontal: spacing.lg,
        gap: spacing.lg,
    },

    textBlock: {
        gap: spacing.sm,
        alignItems: 'center',
        marginBottom: spacing.sm,
    },

    title: {
        textAlign: 'center',
    },

    subtitle: {
        textAlign: 'center',
        opacity: 0.7,
        lineHeight: 22,
        paddingHorizontal: spacing.sm,
    },

    readonlyWrap: {
        gap: spacing.xs,
    },

    label: {
        marginLeft: spacing.xs,
    },

    readonlyBox: {
        minHeight: 56,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: '#F3F0E8',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        opacity: 0.9,
    },

    section: {
        gap: spacing.md,
    },

    sectionTitle: {
        textAlign: 'center',
    },

    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },

    otpInput: {
        flex: 1,
        height: 58,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.white,
        textAlign: 'center',
        fontSize: 20,
        fontWeight: '700',
    },

    otpFilled: {
        borderColor: palette.primary,
        backgroundColor: '#FFFDF8',
    },

    helper: {
        textAlign: 'center',
        opacity: 0.6,
        lineHeight: 18,
    },

    buttonGroup: {
        gap: spacing.md,
        marginTop: spacing.sm,
    },

    changeEmailText: {
        textAlign: 'center',
        color: palette.primary,
        textDecorationLine: 'underline',
    },

    eye: {
        position: 'absolute',
        right: 18,
        top: 35,
        zIndex: 10,
    },
});