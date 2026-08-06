import React, { PropsWithChildren, useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '../theme/colors';

type ScreenProps = PropsWithChildren<{
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  transparentTop?: boolean;
  /** When this value changes, the scroll view jumps to the top (e.g. form step). */
  scrollKey?: string | number;
}>;

export function Screen({
  children,
  scrollable = true,
  contentStyle,
  backgroundColor = palette.background,
  transparentTop = false,
  scrollKey,
}: ScreenProps) {
  const edges: Edge[] | undefined = transparentTop ? [] : undefined;
  const scrollRef = useRef<ScrollView>(null);

  const scrollToTop = useCallback((animated = false) => {
    scrollRef.current?.scrollTo({ y: 0, animated });
  }, []);

  useFocusEffect(
    useCallback(() => {
      scrollToTop(false);
    }, [scrollToTop]),
  );

  useEffect(() => {
    if (scrollKey === undefined) return;
    scrollToTop(false);
  }, [scrollKey, scrollToTop]);

  if (scrollable) {
    return (
      <SafeAreaView edges={edges} style={[styles.safeArea, { backgroundColor }]}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, { backgroundColor }]}>
      <View style={[styles.staticContent, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  staticContent: {
    flex: 1,
  },
});
