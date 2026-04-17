import React from 'react';
import { StyleSheet, View, Image, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../components/AppText';
import { useAppContext } from '../../store/AppContext';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { AuthStackParamList } from '../../navigation/types';
import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = NativeStackScreenProps<AuthStackParamList, 'TeamInvite'>;

export function TeamInviteScreen({ navigation }: Props) {
    const { loginDemo } = useAppContext();
    const inviteCode = '123456';

    return (
        <Screen backgroundColor={palette.restaurantBackground} contentStyle={styles.container}>

            <View style={styles.content}>

                {/* LOGO */}
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../../../assets/intro/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                {/* TEXT */}
                <View style={styles.textBlock}>
                    <AppText variant="heading">ADD YOUR TEAM (OPTIONAL)</AppText>

                    <AppText style={styles.text}>
                        Invite your team to help list and manage surplus.
                    </AppText>

                    <AppText style={styles.text}>
                        Share this code to get them started:
                    </AppText>
                </View>

                {/* CODE BOX */}
                <View style={styles.codeBox}>
                    <AppText variant="bodyBold">{inviteCode}</AppText>
                </View>

                {/* INFO */}
                <AppText style={styles.info}>
                    You can add up to 6 users on your current plan.
                </AppText>

            </View>

            {/* ACTIONS */}
            <View style={styles.bottom}>
                <Button label="Continue" onPress={() => { }} />

                <Pressable onPress={() => { loginDemo(); }} >
                    <AppText style={styles.skip}>Skip for now</AppText>
                </Pressable>
            </View>

        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        justifyContent: 'space-between',
        padding: spacing.lg,
    },

    content: {
        gap: spacing.lg,
    },

    logoContainer: {
        alignItems: 'center',
        gap: spacing.xs,
    },

    logo: {
        width: 140,
        height: 60,
    },

    textBlock: {
        gap: spacing.sm,
    },

    text: {
        opacity: 0.85,
    },

    codeBox: {
        padding: spacing.lg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.border,
        alignItems: 'center',
        backgroundColor: '#FFF',
    },

    info: {
        opacity: 0.6,
    },

    bottom: {
        gap: spacing.md,
        marginTop: spacing.lg,
    },

    skip: {
        textAlign: 'center',
        opacity: 0.7,
    },
});