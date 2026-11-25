import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ModuleUpsellPanel } from '@/components/plans/ModuleUpsellPanel';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';

type Route = RouteProp<RootStackParamList, 'ModuleUpsell'>;

const OPEN_MS = 260;
const CLOSE_MS = 200;

/**
 * Bottom sheet shown when someone opens a module their organisation's plan
 * doesn't include — from a locked card, a link, or a 402 MODULE_REQUIRED.
 * Registered as a transparent modal, so the screen underneath stays visible
 * behind the dimmed backdrop; tapping the backdrop or OK closes it.
 */
export function ModuleUpsellScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const progress = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: OPEN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (navigation.canGoBack()) navigation.goBack();
    });
  }, [navigation, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="Close" />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { maxHeight: height * 0.88, paddingBottom: Math.max(insets.bottom, hp(1.5)) + hp(1), transform: [{ translateY }] },
        ]}
        accessibilityViewIsModal
      >
        <View style={styles.handle} />
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <ModuleUpsellPanel module={route.params.module} onClose={close} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 27, 0.45)',
  },
  sheet: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    backgroundColor: palette.white,
    borderTopLeftRadius: normalize(24),
    borderTopRightRadius: normalize(24),
    paddingTop: hp(1),
  },
  handle: {
    alignSelf: 'center',
    width: normalize(40),
    height: normalize(5),
    borderRadius: normalize(3),
    backgroundColor: palette.strokecream,
    marginBottom: hp(1.2),
  },
  content: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(0.5),
  },
});
