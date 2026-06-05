import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';

import { spacing } from '@/theme/spacing';
import { palette } from '@/theme/colors';
import { plansData } from '@/data/plansData';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};


export function RestaurantPlansScreen({ navigation }: any) {
  const [selectedPlanId, setSelectedPlanId] = useState('single');
  const currentIndex = plansData.findIndex(p => p.id === selectedPlanId);

  const selectPlan = (id: string) => {
    setSelectedPlanId(id);
  };

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* HEADER */}
        <ImageBackground
          source={require('../../../assets/placeholder/feed-bg.png')}
          style={styles.headerBg}
        >
          <Pressable style={styles.backIcon} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>

          <View style={styles.headerContent}>
            <AppText variant="h4" style={styles.headerTitle}>
              Choose Your Plan
            </AppText>

            <AppText variant="bodyBold" style={styles.headerSubtitle}>
              Start simple. Save from day one.
            </AppText>

            <AppText variant="bodyBold" style={styles.headerSubtitle}>
              Powered by Saveful’s intelligent food platform.
            </AppText>
          </View>
        </ImageBackground>

        {/* PLANS */}
        {plansData.map((plan, index) => {
          const isCurrent = selectedPlanId === plan.id;

          return (
            <Pressable
              key={plan.id}
              disabled={isCurrent}
              onPress={() => selectPlan(plan.id)}
              style={[
                styles.planCard,
                isCurrent && styles.currentPlanCard,
              ]}
            >

              {/* MOST POPULAR */}
              {plan.badge && (
                <View style={styles.popularTag}>
                  <AppText variant="caption" style={styles.popularText}>
                    {plan.badge}
                  </AppText>
                </View>
              )}

              {/* CURRENT PLAN */}
              {isCurrent && (
                <View style={styles.currentTag}>
                  <AppText variant="caption" style={styles.currentText}>
                    CURRENT PLAN
                  </AppText>
                </View>
              )}

              {/* NAME */}
              <AppText variant="subheading" color={palette.primary}>
                {plan.name}
              </AppText>

              {/* TAGLINE */}
              <AppText variant="bodySmall" style={styles.tagline}>
                {plan.tagline}
              </AppText>

              {/* PRICE (2 LINES) */}
              <View>
                <AppText style={styles.priceText}>
                  {plan.monthlyPrice.toUpperCase()}
                </AppText>
                {plan.annualPrice && (
                  <AppText style={styles.priceText}>
                    {plan.id !== 'enterprise' ? 'OR ' : ''}{plan.annualPrice.toUpperCase()}
                    {plan.annualLabel ? ` (${plan.annualLabel.toUpperCase()})` : ''}
                  </AppText>
                )}
              </View>

              {/* DESCRIPTION */}
              <AppText variant="bodySmall" style={styles.description}>
                {plan.description}
              </AppText>

              {/* FEATURES */}
              <View style={styles.featuresBox}>
                <AppText variant="bodyBold">Includes</AppText>

                {plan.features.map((feature) => (
                  <AppText key={feature} variant='label'>
                    • {feature}
                  </AppText>
                ))}
              </View>

              {/* CTA */}
              <Button
                label={plan.cta}
                variant={isCurrent ? 'secondary' : 'primary'}
              />
            </Pressable>
          );
        })}

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: hp(2),
    paddingBottom: hp(4),
  },

  headerBg: {
    height: hp(20),
    justifyContent: 'center',
    paddingHorizontal: wp(5),
  },

  backIcon: {
    position: 'absolute',
    top: hp(2),
    left: wp(4),
  },

  headerContent: {
    alignItems: 'center',
  },

  headerTitle: {
    color: palette.white,
    textAlign: 'center',
    fontSize: normalize(24),
  },

  headerSubtitle: {
    color: palette.white,
    textAlign: 'center',
    opacity: 0.9,
    fontSize: normalize(14),
    marginTop: hp(0.5),
  },

  planCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: normalize(22),
    margin: wp(4),
    padding: wp(5),
    backgroundColor: palette.surface,
    gap: hp(1),
  },

  currentPlanCard: {
    borderColor: palette.primary,
    borderWidth: 2,
    backgroundColor: '#F3EEFF',
  },

  priceText: {
    color: palette.middlegreen, 
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(16),
    lineHeight: normalize(20),
  },

  tagline: {
    opacity: 0.7,
    fontSize: normalize(12),
  },

  description: {
    marginTop: hp(0.5),
    fontSize: normalize(14),
  },

  featuresBox: {
    marginTop: hp(1),
    gap: hp(0.8),
  },

  /* TAGS */
  popularTag: {
    position: 'absolute',
    top: -normalize(10),
    left: wp(3),
    backgroundColor: palette.black,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: normalize(12),
    zIndex: 2,
  },

  popularText: {
    color: palette.white,
    fontSize: normalize(10),
  },

  currentTag: {
    position: 'absolute',
    top: -normalize(10),
    right: wp(3),
    backgroundColor: palette.primary,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: normalize(12),
  },

  currentText: {
    color: palette.white,
    fontSize: normalize(10),
  },
});