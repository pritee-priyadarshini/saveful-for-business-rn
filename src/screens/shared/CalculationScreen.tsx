import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ImageBackground,
  Linking,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { spacing } from '../../theme/spacing';
import { palette } from '../../theme/colors';

const { width } = Dimensions.get('window');
const normalize = (size: number) => Math.round(size * (width / 375));

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

          <AppText variant="heading" style={styles.headerTitle}>
            HOW ARE YOUR{`\n`}RESULTS CALCULATED?
          </AppText>
        </ImageBackground>

        {/* INTRO */}
        <View style={styles.section}>
          <AppText variant="h5" style={styles.sectionTitle}>
            SAVING FOOD IS A TEAM SPORT
          </AppText>

          <AppText variant="bodyLarge" style={styles.bodyText}>
            And we're so glad you're in the club to help save more food together.
          </AppText>

          <AppText variant="bodyLarge" style={styles.bodyText}>
            Without doing bin audits, it's always tricky to measure (even the experts agree).
            That's why we've made our tracking tools as fast, simple and easy to use as possible.
          </AppText>
        </View>

        {/* FORMULAS */}
        <View style={[styles.section, styles.borderTop]}>
          <AppText variant="h6" style={styles.subheading}>
            HOW WE CALCULATE
          </AppText>

          <View style={styles.formulaRow}>
            <AppText variant="bodyBold" style={styles.formulaLabel}>Food saved</AppText>
            <AppText variant="body" style={styles.formulaText}>
              {' '}= total amount of food estimated that is collected by charities.
            </AppText>
          </View>

          <View style={styles.formulaRow}>
            <AppText variant="bodyBold" style={styles.formulaLabel}>Money saved</AppText>
            <AppText variant="body" style={styles.formulaText}>
              {' '}= weight of food saved × the average price of food per kg in your country.
            </AppText>
          </View>

          <View style={styles.formulaRow}>
            <AppText variant="bodyBold" style={styles.formulaLabel}>Meals created</AppText>
            <AppText variant="body" style={styles.formulaText}>
              {' '}= weight of food saved ÷ 420g (WRAP recommends 420g as an "average" meal size).
            </AppText>
          </View>

          <View style={styles.formulaRow}>
            <AppText variant="bodyBold" style={styles.formulaLabel}>CO₂ avoided</AppText>
            <AppText variant="body" style={styles.formulaText}>
              {' '}= CO₂ emissions avoided based on a conversion ratio sourced from{
              // TODO: Update name & URL once confirmed — also update the Saveful consumer app
              }
              <AppText
                variant="bodyBold"
                style={styles.link}
                onPress={() => Linking.openURL('https://www.carboncalculator.co.uk')}
              >
                {' '}The Carbon Calculator
              </AppText>
              .
            </AppText>
          </View>
        </View>

        {/* DISCLAIMER */}
        <View style={[styles.section, styles.borderTop]}>
          <AppText variant="caption" style={styles.disclaimer}>
            These figures are estimates based on widely used averages. Actual results may vary.
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
    height: normalize(170),
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.lg,
  },

  headerTitle: {
    color: '#FFF',
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },

  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },

  borderTop: {
    borderTopWidth: 1,
    borderColor: palette.strokecream,
  },

  sectionTitle: {
    color: palette.eggplant,
  },

  subheading: {
    color: palette.kale,
  },

  bodyText: {
    color: palette.text,
    opacity: 0.75,
    lineHeight: normalize(22),
  },

  formulaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  formulaLabel: {
    color: palette.eggplant,
  },

  formulaText: {
    color: palette.midgray,
    flex: 1,
    lineHeight: normalize(20),
  },

  link: {
    color: palette.blueberry,
    textDecorationLine: 'underline',
  },

  disclaimer: {
    color: palette.stone,
    lineHeight: normalize(18),
    opacity: 0.7,
  },
});                                                                          