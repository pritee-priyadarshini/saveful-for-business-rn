import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  ImageBackground,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { spacing } from '../../theme/spacing';
import { palette } from '../../theme/colors';
import { normalize, useResponsiveLayout } from '@/utils/responsive';
import { dashboardColumnWidth } from '@/utils/dashboardAdaptive';

const CARBON_CALC_URL =
  'https://carbonneutral.com.au/carbon-calculator/?srsltid=AfmBOorrpP0piQUKFgc5kkxPa5gT2uBO5LvF05cdl9Ynh2RJiFGyN0VE';

export function CalculationScreen({ navigation }: any) {
  const r = useResponsiveLayout();
  const columnWidth = r.isTablet ? dashboardColumnWidth(r) : undefined;

  const adaptive = useMemo(() => {
    if (!r.isTablet) {
      return {
        headerBg: {},
        headerInner: {},
        section: {},
        headerTitle: {},
        sectionTitle: {},
        bodyText: {},
        formulaLabel: {},
        formulaBody: {},
        disclaimer: {},
      };
    }

    return {
      headerBg: {
        height: Math.min(r.height * 0.2, 200),
        minHeight: 160,
      },
      headerInner: {
        width: columnWidth,
        maxWidth: r.contentMaxWidth,
        alignSelf: 'center' as const,
        paddingHorizontal: r.pagePadH,
        paddingBottom: r.space(20, 24, 28),
      },
      section: {
        width: columnWidth,
        maxWidth: r.contentMaxWidth,
        alignSelf: 'center' as const,
        paddingHorizontal: r.pagePadH,
        paddingVertical: r.space(18, 20, 22),
        gap: r.space(12, 14, 16),
      },
      headerTitle: {
        fontSize: r.font(24, 28, 30),
        lineHeight: r.font(30, 34, 36),
      },
      sectionTitle: {
        fontSize: r.font(20, 22, 24),
        lineHeight: r.font(26, 28, 30),
      },
      bodyText: {
        fontSize: r.font(15, 16, 17),
        lineHeight: r.font(22, 24, 26),
      },
      formulaLabel: {
        fontSize: r.font(15, 16, 17),
        lineHeight: r.font(22, 24, 26),
      },
      formulaBody: {
        fontSize: r.font(15, 16, 17),
        lineHeight: r.font(22, 24, 26),
      },
      disclaimer: {
        fontSize: r.font(12, 13, 14),
        lineHeight: r.font(18, 20, 20),
      },
    };
  }, [r, columnWidth]);

  return (
    <Screen backgroundColor={palette.creme} transparentTop>
      <ScrollView contentContainerStyle={styles.container}>
        <ImageBackground
          source={require('../../../assets/placeholder/purple-bg.png')}
          style={[styles.headerBg, adaptive.headerBg]}
          resizeMode="cover"
        >
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </Pressable>

          <View style={[styles.headerInner, adaptive.headerInner]}>
            <AppText variant="heading" style={[styles.headerTitle, adaptive.headerTitle]}>
              HOW ARE YOUR{`\n`}RESULTS CALCULATED?
            </AppText>
          </View>
        </ImageBackground>

        <View style={[styles.section, adaptive.section]}>
          <AppText variant="h5" style={[styles.sectionTitle, adaptive.sectionTitle]}>
            SAVING FOOD IS A TEAM SPORT
          </AppText>

          <AppText variant="bodyLarge" style={[styles.bodyText, adaptive.bodyText]}>
            And we're so glad you're in the club to help save more food together.
          </AppText>

          <AppText variant="bodyLarge" style={[styles.bodyText, adaptive.bodyText]}>
            Without doing bin audits, it's always tricky to measure (even the experts agree).
            That's why we've made our tracking tools as fast, simple and easy to use as possible.
          </AppText>
        </View>

        <View style={[styles.section, styles.borderTop, adaptive.section]}>
          <AppText variant="h6" style={[styles.subheading, adaptive.sectionTitle]}>
            HOW WE CALCULATE
          </AppText>

          <View style={styles.formulaRow}>
            <AppText variant="body" style={[styles.formulaBody, adaptive.formulaBody]}>
              <AppText variant="bodyBold" style={[styles.formulaLabel, adaptive.formulaLabel]}>
                Food saved
              </AppText>
              {' '}
              = total amount of food estimated that is collected by charities.
            </AppText>
          </View>

          <View style={styles.formulaRow}>
            <AppText variant="body" style={[styles.formulaBody, adaptive.formulaBody]}>
              <AppText variant="bodyBold" style={[styles.formulaLabel, adaptive.formulaLabel]}>
                Money saved
              </AppText>
              {' '}
              = weight of food saved × the average price of food per kg in your country.
            </AppText>
          </View>

          <View style={styles.formulaRow}>
            <AppText variant="body" style={[styles.formulaBody, adaptive.formulaBody]}>
              <AppText variant="bodyBold" style={[styles.formulaLabel, adaptive.formulaLabel]}>
                Meals created
              </AppText>
              {' '}
              = weight of food saved ÷ 420g (WRAP recommends 420g as an "average" meal size).
            </AppText>
          </View>

          <View style={styles.formulaRow}>
            <AppText variant="body" style={[styles.formulaBody, adaptive.formulaBody]}>
              <AppText variant="bodyBold" style={[styles.formulaLabel, adaptive.formulaLabel]}>
                CO₂ avoided
              </AppText>
              {' '}
              = CO₂ emissions avoided based on a conversion ratio sourced from
              {/* TODO: Update name & URL once confirmed — also update the Saveful consumer app */}
              <AppText
                variant="bodyBold"
                style={[styles.link, adaptive.formulaLabel]}
                onPress={() => Linking.openURL(CARBON_CALC_URL)}
              >
                {' '}
                The Carbon Calculator
              </AppText>
              .
            </AppText>
          </View>
        </View>

        <View style={[styles.section, styles.borderTop, adaptive.section]}>
          <AppText variant="caption" style={[styles.disclaimer, adaptive.disclaimer]}>
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
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  headerInner: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backButton: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.xxl,
    zIndex: 2,
  },

  headerTitle: {
    color: '#FFF',
    textAlign: 'left',
  },

  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
    width: '100%',
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
    lineHeight: normalize(22),
    textTransform: 'uppercase',
  },

  formulaBody: {
    color: palette.midgray,
    lineHeight: normalize(22),
    textTransform: 'none',
  },

  link: {
    color: palette.blueberry,
    textDecorationLine: 'underline',
    textTransform: 'none',
  },

  disclaimer: {
    color: palette.stone,
    lineHeight: normalize(18),
    opacity: 0.7,
    textTransform: 'none',
  },
});
