import React, { PropsWithChildren, createContext, useCallback, useEffect, useMemo, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '../theme/colors';

/**
 * Lets something inside a scrolling Screen read and move its scroll position —
 * the walkthrough uses it to bring a highlighted element into view.
 */
export type ScreenScrollHandle = {
  getY: () => number;
  scrollTo: (y: number) => void;
};

export const ScreenScrollContext = createContext<ScreenScrollHandle | null>(null);

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
  /** Pinned under the scrolling content (e.g. Back / Next buttons). Only for scrollable screens. */
  footer?: React.ReactNode;
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
  footer,
}: ScreenProps) {
  const edges: Edge[] | undefined = transparentTop ? [] : undefined;
  const internalScrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);

  const setScrollRef = useCallback(
    (node: ScrollView | null) => {
      internalScrollRef.current = node;
      // Dev-only hook for the visual preview (src/dev/consolidatedPreview.tsx) to scroll headless captures.
      if (__DEV__ && node) (globalThis as { __previewScroll?: ScrollView | null }).__previewScroll = node;
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
    scrollYRef.current = 0;
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = event.nativeEvent.contentOffset.y;
      onScroll?.(event);
    },
    [onScroll],
  );

  const scrollHandle = useMemo<ScreenScrollHandle>(
    () => ({
      getY: () => scrollYRef.current,
      scrollTo: (y: number) => {
        const next = Math.max(0, y);
        internalScrollRef.current?.scrollTo({ y: next, animated: true });
        scrollYRef.current = next;
      },
    }),
    [],
  );

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
          style={footer ? styles.flex : undefined}
          contentContainerStyle={[contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={keyboardAware ? 'interactive' : 'none'}
          automaticallyAdjustKeyboardInsets={keyboardAware && Platform.OS === 'ios'}
          // 'always' adds the iOS status-bar inset, which opens a gap above full-bleed heroes.
          contentInsetAdjustmentBehavior={keyboardAware && !transparentTop ? 'always' : 'never'}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={refreshControl}
        >
          <ScreenScrollContext.Provider value={scrollHandle}>{children}</ScreenScrollContext.Provider>
        </ScrollView>
        {footer}
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
  flex: { flex: 1 },
});
