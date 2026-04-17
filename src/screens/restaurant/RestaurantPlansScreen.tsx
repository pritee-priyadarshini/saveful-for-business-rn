import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/Button';

import { spacing } from '@/theme/spacing';
import { palette } from '@/theme/colors';
import { plansData } from '@/data/plansData';


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

              {/* PRICE (SINGLE LINE) */}
              <AppText style={styles.priceText}>
                {plan.monthlyPrice} or {plan.annualPrice}
                {plan.annualLabel ? ` (${plan.annualLabel})` : ''}
              </AppText>

              {/* DESCRIPTION */}
              <AppText variant="bodySmall" style={styles.description}>
                {plan.description}
              </AppText>

              {/* FEATURES */}
              <View style={styles.featuresBox}>
                <AppText variant="label">Includes</AppText>

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
    gap: spacing.lg,
  },

  headerBg: {
    height: 160,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },

  backIcon: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
  },

  headerContent: {
    alignItems: 'center',
  },

  headerTitle: {
    color: palette.white,
    textAlign: 'center',
  },

  headerSubtitle: {
    color: palette.white,
    textAlign: 'center',
    opacity: 0.9,
  },

  planCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 22,
    margin: spacing.md,
    padding: spacing.lg,
    backgroundColor: palette.surface,
    gap: spacing.sm, // 🔥 increased spacing
  },

  currentPlanCard: {
    borderColor: palette.primary,
    borderWidth: 2,
    backgroundColor: '#F3EEFF',
  },

  priceText: {
    color: palette.middlegreen, 
    fontFamily: 'Saveful-Bold',
    fontSize: 16,
    lineHeight: 18,
  },

  tagline: {
    opacity: 0.7,
  },

  description: {
    marginTop: 4,
  },

  featuresBox: {
    marginTop: spacing.sm,
    gap: 6,
  },

  /* TAGS */
  popularTag: {
    position: 'absolute',
    top: -10,
    left: 10,
    backgroundColor: palette.black,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },

  popularText: {
    color: palette.white,
  },

  currentTag: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: palette.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  currentText: {
    color: palette.white,
  },
});