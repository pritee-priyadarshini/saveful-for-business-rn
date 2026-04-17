import React, { useState } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ImageBackground,
    Image,
} from 'react-native';
import Icon from '@expo/vector-icons/Ionicons';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { InputField } from '../../components/InputField';
import { useAppContext } from '../../store/AppContext';
import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export function SignInScreen() {
    const { loginDemo, setRole } = useAppContext();

    const [role, setLocalRole] = useState<'restaurant_single' | 'restaurant_multi' | 'charity'>('restaurant_single');
    const [email, setEmail] = useState('restaurant@demo.com');
    const [password, setPassword] = useState('123456');
    const [secure, setSecure] = useState(true);
    const [error, setError] = useState('');

    const DEMO = {
        restaurant_single: {
            email: 'restaurant@demo.com',
            password: '123456',
        },
        restaurant_multi: {
            email: 'admin@demo.com',
            password: '123456',
        },
        charity: {
            email: 'charity@demo.com',
            password: '123456',
        },
    };

    const handleLogin = () => {
        setError('');

        if (!email || !password) {
            setError('Please enter email and password');
            return;
        }

        const valid =
            email === DEMO[role].email &&
            password === DEMO[role].password;

        if (!valid) {
            setError(
                role === 'restaurant_single'
                    ? 'Use restaurant@demo.com / 123456'
                    : role === 'restaurant_multi'
                        ? 'Use admin@demo.com / 123456'
                        : 'Use charity@demo.com / 123456'
            );
            return;
        }

        setRole(role);
        setTimeout(() => {
            loginDemo();
        }, 0);
    };

    const handleRoleChange = (selected: 'restaurant_single' | 'restaurant_multi' | 'charity') => {
        setLocalRole(selected);
        setError('');
        setEmail(DEMO[selected].email);
        setPassword(DEMO[selected].password);
    };

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
                        <AppText variant="caption">
                            {role === 'charity' ? 'For Charity' : 'For Business'}
                        </AppText>
                    </View>

                    {/* FORM */}
                    <View style={styles.form}>

                        {/* ROLE SWITCH */}
                        <View style={styles.roleContainer}>
                            {/* SINGLE RESTAURANT */}
                            <TouchableOpacity
                                style={[
                                    styles.roleOption,
                                    role === 'restaurant_single' && styles.activeRole,
                                ]}
                                onPress={() => handleRoleChange('restaurant_single')}
                            >
                                <AppText
                                    style={[
                                        styles.roleText,
                                        role === 'restaurant_single' && styles.activeRoleText,
                                    ]}
                                >
                                    Restaurant
                                </AppText>
                            </TouchableOpacity>

                            {/* MULTI RESTAURANT */}
                            <TouchableOpacity
                                style={[
                                    styles.roleOption,
                                    role === 'restaurant_multi' && styles.activeRole,
                                ]}
                                onPress={() => handleRoleChange('restaurant_multi')}
                            >
                                <AppText
                                    style={[
                                        styles.roleText,
                                        role === 'restaurant_multi' && styles.activeRoleText,
                                    ]}
                                >
                                    Multi
                                </AppText>
                            </TouchableOpacity>

                            {/* CHARITY */}
                            <TouchableOpacity
                                style={[
                                    styles.roleOption,
                                    role === 'charity' && styles.activeRole,
                                ]}
                                onPress={() => handleRoleChange('charity')}
                            >
                                <AppText
                                    style={[
                                        styles.roleText,
                                        role === 'charity' && styles.activeRoleText,
                                    ]}
                                >
                                    Charity
                                </AppText>
                            </TouchableOpacity>
                        </View>

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
                                <TouchableOpacity>
                                    <AppText variant="caption">Forgot?</AppText>
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
                                Sign In
                            </AppText>
                        </TouchableOpacity>

                    </View>
                </View>
            </Screen>
        </ImageBackground>

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