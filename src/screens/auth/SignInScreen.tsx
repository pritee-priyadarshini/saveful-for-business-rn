import React, { useState } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ImageBackground,
    Image,
    Alert,
} from 'react-native';
import Icon from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { InputField } from '../../components/InputField';
import { useAppContext } from '../../store/AppContext';
import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

import type { AuthStackParamList } from '../../navigation/types';
import { authService } from '../../services/auth.service';

export function SignInScreen() {
    const { setAuthUser } = useAppContext();

    const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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
            console.log('LOGIN ERROR', error?.response?.data || error);
            setError(error?.response?.data?.message || 'Invalid credentials');
        }
        finally {
            setLoading(false);
        }
    }

    return (
        <ImageBackground
            source={require('../../../assets/intro/splash.png')}
            style={styles.background}
            resizeMode="cover"
        >
            <Screen scrollable={false} backgroundColor="transparent">

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
                        <AppText variant="heading" style={styles.title}>
                            Welcome Back
                        </AppText>

                        {/* EMAIL */}
                        <InputField
                            label="Email Address"
                            placeholder="your@email.com"
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                setError('');
                            }}
                        />

                        {/* PASSWORD */}
                        <View>
                            <View style={styles.passwordHeader}>
                                <AppText variant="label">Password</AppText>

                                <TouchableOpacity
                                    onPress={() =>
                                        navigation.navigate('ForgotPassword', {
                                            from: 'SignIn',
                                        })
                                    }
                                >
                                    <AppText variant="caption">
                                        Forgot Password?
                                    </AppText>
                                </TouchableOpacity>
                            </View>

                            <View>
                                <InputField
                                    label=""
                                    placeholder="Enter your password"
                                    value={password}
                                    secureTextEntry={secure}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        setError('');
                                    }}
                                />
                                <TouchableOpacity
                                    style={styles.eye}
                                    onPress={() => setSecure((prev) => !prev)}
                                >
                                    <Icon
                                        name={secure ? 'eye-off-outline' : 'eye-outline'}
                                        size={20}
                                        color={palette.textMuted}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* ERROR */}
                        {error ? (
                            <AppText style={styles.error}>{error}</AppText>
                        ) : null}

                        {/* BUTTON */}
                        <TouchableOpacity style={styles.button} onPress={handleLogin}>
                            <AppText variant="label" style={styles.buttonText}>
                                {loading ? 'Signing In...' : 'Sign In'}
                            </AppText>
                        </TouchableOpacity>

                    </View>
                </View>
            </Screen>
        </ImageBackground >

    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: spacing.lg,
    },
    top: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    logo: {
        width: 160,
        height: 60,
    },
    form: {
        backgroundColor: palette.white,
        borderRadius: 20,
        padding: spacing.lg,
        gap: spacing.md,
    },
    title: {
        textAlign: 'center',
    },
    roleContainer: {
        flexDirection: 'row',
        backgroundColor: palette.surface,
        borderRadius: 30,
        padding: 4,
        flexWrap: 'wrap',
    },
    roleOption: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: 25,
        alignItems: 'center',
    },
    activeRole: {
        backgroundColor: palette.primary,
    },
    roleText: {
        color: palette.textMuted,
    },
    activeRoleText: {
        color: palette.white,
    },
    passwordHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    eye: {
        position: 'absolute',
        right: 10,
        top: 35,
    },
    button: {
        backgroundColor: palette.primary,
        padding: spacing.md,
        borderRadius: 14,
        alignItems: 'center',
    },
    buttonText: {
        color: palette.white,
    },
    error: {
        color: palette.danger,
        textAlign: 'center',
    },
});