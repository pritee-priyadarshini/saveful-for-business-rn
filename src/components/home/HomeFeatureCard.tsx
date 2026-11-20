import React from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';

/**
 * The shared frame of the Home feature cards (Make Food Count, Saveful Connect):
 * white card, optional pill, icon + title, one line of copy, a picture on the
 * right, and the card's actions underneath. Both cards use it so they always match.
 */
export function HomeFeatureCard({
  pill,
  icon,
  title,
  titleColor,
  body,
  bodyColor,
  image,
  style,
  children,
}: {
  pill?: React.ReactNode;
  icon: React.ReactNode;
  title: string;
  titleColor: string;
  body: string;
  bodyColor: string;
  /** A square picture on a transparent background; its empty margins are cropped. */
  image: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  /** The actions row. */
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  // About a third of a phone's width; never cramped on small phones, never huge on tablets.
  const artWidth = Math.round(Math.min(Math.max(width * 0.3, normalize(100)), normalize(140)));
  const artHeight = Math.round(artWidth * 0.74);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.top}>
        <View style={styles.copy}>
          {pill}
          <View style={styles.titleRow}>
            {icon}
            <AppText variant="subheading" color={titleColor} style={styles.title} numberOfLines={2}>
              {title}
            </AppText>
          </View>
          <AppText variant="bodySmall" color={bodyColor} style={styles.body}>
            {body}
          </AppText>
        </View>
        <View style={[styles.art, { width: artWidth, height: artHeight }]} pointerEvents="none">
          {/* The source pictures are square with wide empty bands top and bottom: cover crops just those. */}
          <Image
            source={image}
            style={{ width: artWidth, height: artHeight }}
            resizeMode="cover"
            accessible={false}
          />
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: normalize(24),
    borderWidth: 1,
    borderColor: palette.strokecream,
    backgroundColor: palette.white,
    padding: normalize(16),
    gap: normalize(12),
    // When two cards sit side by side (tablets) and stretch to one height, actions stay at the bottom.
    justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: palette.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  copy: { flex: 1, minWidth: 0, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: normalize(21), lineHeight: normalize(26) },
  body: { lineHeight: normalize(20) },
  art: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
