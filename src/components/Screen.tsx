import React, { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '../theme/colors';

type ScreenProps = PropsWithChildren<{
  scrollable?: boolean;
  contentStyle?: ViewStyle;
  backgroundColor?: string;
  transparentTop?: boolean;
}>;

export function Screen({
  children,
  scrollable = true,
  contentStyle,
  backgroundColor = palette.background,
  transparentTop = false,
}: ScreenProps) {
  const edges: Edge[] | undefined = transparentTop ? [] : undefined;

  if (scrollable) {
    return (
      <SafeAreaView edges={edges} style={[styles.safeArea, { backgroundColor }]}>
        <ScrollView contentContainerStyle={[contentStyle]} showsVerticalScrollIndicator={false}>
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
