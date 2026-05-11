import React, { useState } from 'react';
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
        marginBottom: hp(8),
    },
    logo: {
        width: wp(50),
        height: hp(10),
    },
    form: {
        backgroundColor: palette.white,
        borderRadius: normalize(20),
        padding: wp(6),
        gap: hp(2),
        marginBottom: hp(15),
    },
    title: {
        textAlign: 'center',
        fontSize: normalize(24),
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
});