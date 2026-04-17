import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { useAppContext } from '../../store/AppContext';

import {
  restaurantListings,
  restaurantImpact,
} from '../../data/mockData';

import { spacing } from '../../theme/spacing';
import { palette } from '@/theme/colors';

export function RestaurantHomeScreen({ navigation }: any) {

  const { currentProfile } = useAppContext();
  const firstName = currentProfile.name.split(' ')[0];
  const [activeIndex, setActiveIndex] = React.useState(0);

  const impactConfig = [
    {
      label: 'CO2',
      icon: require('../../../assets/placeholder/leftovers.png'),
    },
    {
      label: 'Money',
      icon: require('../../../assets/placeholder/money.png'),
    },
    {
      label: 'Charity',
      icon: require('../../../assets/placeholder/community-icon.png'),
    },
    {
      label: 'KG',
      icon: require('../../../assets/placeholder/bowl.png'),
    },
  ];

  const impactData = impactConfig.map((item, index) => ({
    ...item,
    value: restaurantImpact.snapshot[index]?.value || '--',
  }));

  return (
    <Screen backgroundColor={palette.creme}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* HERO */}
        <View style={styles.heroContainer}>
          <Image
            source={require('../../../assets/placeholder/kale-header.png')}
            style={styles.heroBg}
          />

          {/* TOP ROW */}
          <View style={styles.topBar}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="h6" style={styles.whiteText}>
                {currentProfile.organization}
              </AppText>

              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={26} color="white" />
                <AppText variant="body" style={styles.location}>
                  {currentProfile.address}
                </AppText>
              </View>
            </View>

            {/* LOGO */}
            <View style={styles.logoCircle}>
              {currentProfile.logo ? (
                <Image
                  source={{ uri: currentProfile.logo }}
                  style={styles.logoImage}
                />
              ) : (
                <AppText style={styles.logoFallback}>
                  {currentProfile.organization?.[0] || 'S'}
                </AppText>
              )}
            </View>
          </View>
        </View>

        {/* WELCOME */}
        <View style={styles.welcomeSection}>
          <AppText variant="h5">
            Welcome back, {firstName}
          </AppText>

          <AppText variant="bodyLarge" style={styles.welcomeSub}>
            Got surplus today?
          </AppText>

          <AppText variant="bodyLarge" style={styles.welcomeSub}>
            Share it with a local charity 💜
          </AppText>
        </View>

        {/* CTA */}
        <Pressable
          style={styles.ctaButton}
          onPress={() =>
            navigation.navigate('Listings', {
              screen: 'RestaurantListings',
            })
          }
        >
          <AppText variant="bodyLarge" style={styles.ctaText}>
            List Surplus
          </AppText>
        </Pressable>

        {/* IMPACT */}
        <View style={styles.section}>
          <View style={styles.headingContainer}>
            <Image
              source={require('../../../assets/placeholder/Illustration.png')}
              style={styles.headingBg}
            />

            <AppText variant="heading" style={styles.headingText}>
              Your Savings & Impact So Far
            </AppText>
          </View>

          <View style={styles.impactCardContainer}>
            {/* PILLS */}
            <View style={styles.pillRow}>
              {impactData.map((item, index) => (
                <Pressable
                  key={index}
                  onPress={() => setActiveIndex(index)}
                  style={[
                    styles.pill,
                    activeIndex === index && styles.activePill,
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={[
                      styles.pillText,
                      activeIndex === index && styles.activePillText,
                    ]}
                  >
                    {item.label}
                  </AppText>
                </Pressable>
              ))}
            </View>

            {/* ICON */}
            <Image
              source={impactData[activeIndex].icon}
              style={styles.impactIcon}
            />

            {/* TEXT */}
            <AppText variant="bodyBold">
              You have potentially saved
            </AppText>

            {/* VALUE */}
            <View style={styles.valuePill}>
              <AppText variant="h5" style={styles.valueText}>
                {impactData[activeIndex].value} {impactData[activeIndex].label}
              </AppText>
            </View>

            {/* SUB TEXT */}
            <AppText variant="bodyBold">
              Keep making an impact!
            </AppText>

          </View>
        </View>
        <Pressable
          style={styles.calculationRow}
          onPress={() => navigation.navigate('Calculation')}
        >
          <AppText variant="bodyLarge">
            About our calculation
          </AppText>

          <Ionicons name="chevron-forward" size={20} color="black" />
        </Pressable>

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },

  heroContainer: {
    height: 150,
    width: '100%',
    paddingTop: spacing.lg,
    paddingRight: spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },

  heroBg: {
    width: '110%',
    height: '120%',
    position: 'absolute',
  },

  topBar: {
    flexDirection: 'row',
    paddingLeft: spacing.md,
    justifyContent: 'space-between',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
    gap: 6,
  },

  whiteText: {
    color: 'white',
  },

  welcomeSection: {
    paddingHorizontal: spacing.sm,
    gap: 10,
    alignItems: 'center',
  },

  welcomeSub: {
    color: '#666',
  },

  location: {
    color: 'white',
    opacity: 0.8,
    flex: 1,
    flexWrap: 'wrap',
  },

  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginLeft: spacing.md,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },

  logoFallback: {
    color: '#7B3FE4',
    fontWeight: 'bold',
  },

  ctaButton: {
    marginHorizontal: spacing.lg,
    backgroundColor: '#7B3FE4',
    padding: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
  },

  ctaText: {
    color: 'white',
  },

  headingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
  },

  headingBg: {
    position: 'absolute',
    width: '100%',
    height: 80,
    resizeMode: 'contain',
    borderRadius: 12,
  },

  headingText: {
    textAlign: 'center',
  },

  section: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },

  impactCardContainer: {
    backgroundColor: palette.creme,
    borderColor: palette.black,
    borderWidth: 1,
    borderRadius: 20,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
    height: 300,
  },

  pillRow: {
    flexDirection: 'row',
    backgroundColor: '#F3E8FF',
    borderRadius: 999,
    padding: 4,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },

  activePill: {
    backgroundColor: palette.middlegreen,
  },

  pillText: {
    color: palette.black,
  },

  activePillText: {
    color: 'white',
  },

  impactIcon: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },

  valuePill: {
    backgroundColor: palette.middlegreen,
    paddingVertical: 20,
    paddingHorizontal: 35,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  valueText: {
    color: palette.white,
  },

  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderColor: palette.border,
  },
});