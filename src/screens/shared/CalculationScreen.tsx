import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { spacing } from '../../theme/spacing';
import { palette } from '../../theme/colors';

export function CalculationScreen({ navigation }: any) {
  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* HEADER */}
        <ImageBackground
          source={require('../../../assets/placeholder/purple-bg.png')}
          style={styles.headerBg}
          resizeMode="cover"
        >
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </Pressable>

          <AppText variant="heading" color="#FFF" style={styles.headerTitle}>
            How are your results calculated?
          </AppText>
        </ImageBackground>

        {/* CONTENT */}
        <View style={styles.content}>

          <AppText variant="h5" style={styles.sectionTitle}>
            Reducing food waste is a team sport
          </AppText>

          <AppText variant="bodyLarge" style={styles.text}>
            And we’re so glad you’re in the club to save more food together. Without doing bin audits, food waste can be tricky to measure.
          </AppText>

          <AppText variant="bodyLarge" style={styles.text}>
            Every time you cook a Saveful meal, we assume you’re using up food you already have – and saving it from the bin.
          </AppText>

          <AppText variant="bodyLarge" style={styles.text}>
            Here’s how we estimate your potential savings using assumptions and averages.
          </AppText>

        </View>

        {/* SECOND SECTION */}
        <View style={styles.section}>

          <AppText variant="h6" style={styles.sectionTitle}>
            Pre-make survey & overall results
          </AppText>

          <AppText style={styles.text}>
            Your potential food savings in kg is based on average ingredient weights used across meals.
          </AppText>

          <AppText style={styles.text}>
            Savings in dollars are calculated using average food price per kg.
          </AppText>

        </View>

        {/* WEEKLY */}
        <View style={styles.section}>

          <AppText variant="h6" style={styles.sectionTitle}>
            Weekly results
          </AppText>

          <AppText style={styles.text}>
            Weekly results are calculated based on your most recent activity and reported food usage.
          </AppText>

          <AppText style={styles.text}>
            CO2 impact is estimated using standard conversion metrics.
          </AppText>

        </View>

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
  },

  headerBg: {
    width: '100%',
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },

  backButton: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.lg,
  },

  headerTitle: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },

  content: {
    backgroundColor: palette.creme,
    padding: spacing.lg,
    gap: spacing.md,
  },

  section: {
    backgroundColor: palette.creme,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderColor: palette.border,
  },

  sectionTitle: {
    color: palette.primary,
  },

  text: {
    opacity: 0.8,
  },
});