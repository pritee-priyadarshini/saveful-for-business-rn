import React from 'react';
import {
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { HeroHeader } from '@/components/HeroHeader';
import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';

const DEFAULT_SOURCE = require('../../assets/placeholder/kale-header.png');

type Props = {
  title: string;
  subtitle?: string;
  source?: ImageSourcePropType;
  /** Content height excluding status-bar inset (HeroHeader adds inset). */
  height?: number;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
};

/**
 * Consistent stack-screen hero: transparent status bar, safe-area padding,
 * back affordance, title (+ optional subtitle). Use with
 * `Screen transparentTop` + `useTransparentStatusBar('light')`.
 */
export function StackHeroHeader({
  title,
  subtitle,
  source = DEFAULT_SOURCE,
  height = hp(18),
  showBack = true,
  onBack,
  right,
  style,
  contentStyle,
}: Props) {
  const navigation = useNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <HeroHeader
        source={source}
        height={height}
        style={[{ marginBottom: hp(2) }, style]}
        contentStyle={contentStyle}
      >
        <View style={styles.inner}>
          <View style={styles.topRow}>
            {showBack ? (
              <Pressable
                onPress={handleBack}
                style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={normalize(22)} color={palette.white} />
              </Pressable>
            ) : (
              <View style={styles.backBtnSpacer} />
            )}

            {right ? <View style={styles.rightSlot}>{right}</View> : <View style={styles.backBtnSpacer} />}
          </View>

          <View style={styles.titleBlock}>
            <AppText variant="h5" style={styles.title} numberOfLines={2}>
              {title}
            </AppText>
            {subtitle ? (
              <AppText variant="bodySmall" style={styles.subtitle} numberOfLines={3}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
        </View>
      </HeroHeader>
    </>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    paddingHorizontal: wp(4),
    paddingBottom: hp(1.8),
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: normalize(40),
    paddingTop: hp(0.4),
  },
  backBtn: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  backBtnSpacer: {
    width: normalize(40),
    height: normalize(40),
  },
  rightSlot: {
    minWidth: normalize(40),
    alignItems: 'flex-end',
  },
  titleBlock: {
    paddingRight: wp(2),
    gap: hp(0.4),
  },
  title: {
    color: palette.white,
  },
  subtitle: {
    color: palette.white,
    opacity: 0.9,
  },
  pressed: {
    opacity: 0.75,
  },
});
