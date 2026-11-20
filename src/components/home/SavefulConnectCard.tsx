import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import { HomeFeatureCard } from '@/components/home/HomeFeatureCard';
import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';

const ART = require('../../../assets/newmfc/saveful-connect-home.png');

/** Saveful Connect's own green, next to Make Food Count's purple. */
const CONNECT = {
  green: palette.kale,
  ink: '#16301F',
};

/**
 * Home card for Saveful Connect: list surplus food so local charities and
 * communities can collect it. Same frame as the Make Food Count card.
 */
export function SavefulConnectCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const navigation = useNavigation<any>();

  return (
    <HomeFeatureCard
      style={style}
      icon={<MaterialCommunityIcons name="hand-heart-outline" size={normalize(26)} color={CONNECT.green} />}
      title="Saveful Connect"
      titleColor={CONNECT.ink}
      body="Redirect surplus edible & non-edible food to local charities and communities."
      bodyColor={CONNECT.ink}
      image={ART}
    >
      <Pressable
        onPress={() => navigation.navigate('Listings', { screen: 'Surplus' })}
        accessibilityRole="button"
        accessibilityLabel="List surplus food"
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <AppText variant="bodyBold" color={palette.white} numberOfLines={1} style={styles.ctaText}>
          List Surplus
        </AppText>
        <Ionicons name="arrow-forward" size={normalize(18)} color={palette.white} />
      </Pressable>
    </HomeFeatureCard>
  );
}

const styles = StyleSheet.create({
  // Same size and shape as Make Food Count's "Record Food Waste" button.
  cta: {
    minHeight: 50,
    paddingHorizontal: normalize(14),
    borderRadius: 14,
    backgroundColor: CONNECT.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: { flexShrink: 1 },
  pressed: { opacity: 0.88 },
});
