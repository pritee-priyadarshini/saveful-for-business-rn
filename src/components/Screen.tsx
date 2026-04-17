import React, { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '../theme/colors';

type ScreenProps = PropsWithChildren<{
  scrollable?: boolean;
  contentStyle?: ViewStyle;
  backgroundColor?: string;
}>;

export function Screen({ children, scrollable = true, contentStyle, backgroundColor = palette.background }: ScreenProps) {
  if (scrollable) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
        <ScrollView contentContainerStyle={[contentStyle]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
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
