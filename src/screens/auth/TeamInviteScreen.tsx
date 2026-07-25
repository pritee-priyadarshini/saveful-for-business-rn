import React from 'react';
import { StyleSheet, View, Image, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { AuthStackParamList } from '../../navigation/types';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { useResponsiveLayout } from '@/utils/responsive';
import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = NativeStackScreenProps<AuthStackParamList, 'TeamInvite'>;

export function TeamInviteScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const r = useResponsiveLayout();
  useTransparentStatusBar('dark');
  const inviteCode = '123456';

  return (
    <Screen
      backgroundColor={palette.restaurantBackground}
      transparentTop
      contentStyle={{
        ...styles.container,
        paddingTop: insets.top + spacing.lg,
        paddingBottom: Math.max(insets.bottom, spacing.lg),
        ...(r.isTablet
          ? {
              paddingHorizontal: r.pagePadH,
              alignItems: 'center' as const,
            }
          : null),
      }}
    >
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <View
        style={[
          styles.column,
          r.isTablet && { maxWidth: r.contentMaxWidth, width: '100%' },
        ]}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/intro/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.textBlock}>
            <AppText variant="heading">ADD YOUR TEAM (OPTIONAL)</AppText>

            <AppText style={styles.text}>
              Invite your team to help list and manage surplus.
            </AppText>

            <AppText style={styles.text}>Share this code to get them started:</AppText>
          </View>

          <View style={styles.codeBox}>
            <AppText variant="bodyBold">{inviteCode}</AppText>
          </View>

          <AppText style={styles.info}>You can add up to 6 users on your current plan.</AppText>
        </View>

        <View style={styles.bottom}>
          <Button label="Continue" onPress={() => {}} />

          <Pressable onPress={() => {}}>
            <AppText style={styles.skip}>Skip for now</AppText>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
  },

  column: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
  },

  content: {
    gap: spacing.lg,
  },

  logoContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },

  logo: {
    width: 168,
    height: 52,
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
