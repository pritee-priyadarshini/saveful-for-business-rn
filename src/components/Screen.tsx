import React, { PropsWithChildren, useCallback, useEffect, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
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
  /** Lets a screen scroll a field into view (e.g. an open dropdown). */
  scrollRef?: React.Ref<ScrollView>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Reserve space for the keyboard so the page can scroll to the focused field. */
  keyboardAware?: boolean;
  refreshControl?: React.ReactElement;
}>;

export function Screen({
  children,
  scrollable = true,
  contentStyle,
  backgroundColor = palette.background,
  transparentTop = false,
  scrollKey,
  scrollRef: scrollRefProp,
  onScroll,
  keyboardAware = false,
  refreshControl,
}: ScreenProps) {
  const edges: Edge[] | undefined = transparentTop ? [] : undefined;
  const internalScrollRef = useRef<ScrollView>(null);

  const setScrollRef = useCallback(
    (node: ScrollView | null) => {
      internalScrollRef.current = node;
      if (!scrollRefProp) return;
      if (typeof scrollRefProp === 'function') {
        scrollRefProp(node);
        return;
      }
      (scrollRefProp as React.MutableRefObject<ScrollView | null>).current = node;
    },
    [scrollRefProp],
  );

  const scrollToTop = useCallback((animated = false) => {
    internalScrollRef.current?.scrollTo({ y: 0, animated });
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
          ref={setScrollRef}
          contentContainerStyle={[contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={keyboardAware ? 'interactive' : 'none'}
          automaticallyAdjustKeyboardInsets={keyboardAware && Platform.OS === 'ios'}
          contentInsetAdjustmentBehavior={keyboardAware ? 'always' : 'never'}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={refreshControl}
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
