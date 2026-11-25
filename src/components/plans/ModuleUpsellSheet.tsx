import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUpsellSheetStore } from '@/store/upsellSheetStore';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import type { SubscriptionRoute } from '@/utils/subscriptionAccess';
import { ModuleUpsellPanel } from './ModuleUpsellPanel';

const OPEN_MS = 260;
const CLOSE_MS = 200;

/**
 * Bottom sheet for a module the organisation's plan doesn't include. Mounted
 * once next to the navigator and opened through useUpsellSheetStore, so it sits
 * over the current screen without navigating: closing it leaves that screen
 * exactly as it was (no refocus, no reload).
 */
export function ModuleUpsellSheet({ onOpenPlans }: { onOpenPlans?: (route: SubscriptionRoute) => void }) {
  const module = useUpsellSheetStore((s) => s.module);
  const hide = useUpsellSheetStore((s) => s.hide);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const progress = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);

  useEffect(() => {
    if (!module) return;
    closing.current = false;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: OPEN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [module, progress]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, {
      toValue: 0,
      duration: CLOSE_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => hide());
  }, [hide, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  return (
    <Modal visible={module != null} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: height * 0.88,
              paddingBottom: Math.max(insets.bottom, hp(1.5)) + hp(1),
              transform: [{ translateY }],
            },
          ]}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />
          <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {module ? (
              <ModuleUpsellPanel
                module={module}
                onClose={close}
                onOpenPlans={
                  onOpenPlans
                    ? (route) => {
                        hide();
                        onOpenPlans(route);
                      }
                    : undefined
                }
              />
            ) : null}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
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
