import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { MFC } from '@/constants/makeFoodCount';
import { normalize } from '@/utils/responsive';

/** Soft lilac: clearly a header against the white page, light enough to stay calm. */
const HEADER_BG = '#EFE6FA';

type Props = {
  title?: string;
  /** Current site, shown on the right. */
  siteName?: string | null;
  /** Opens the site switcher. Without it the site name is plain text. */
  onSitePress?: () => void;
};

/**
 * Compact top bar for Make Food Count: back, title and site on one 56pt row.
 * A soft lilac (the app's purple, tinted) sets it apart from the white page
 * without being heavy; the controls sit on white so they read as buttons.
 */
export function MfcHeader({ title = 'Make Food Count', siteName, onSitePress }: Props) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const site = siteName?.trim();

  // The first Make Food Count screen has nothing under it in its own stack: leave the flow.
  const onBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.getParent()?.goBack();
  };

  const siteContent = site ? (
    <>
      <Ionicons name="location" size={normalize(13)} color={MFC.purple} />
      <AppText variant="meta" color={MFC.purple} numberOfLines={1} style={styles.siteText}>
        {site}
      </AppText>
      {onSitePress ? <Ionicons name="chevron-down" size={normalize(13)} color={MFC.purple} /> : null}
    </>
  ) : null;

  return (
    <>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View style={[styles.bar, { paddingTop: insets.top }]}>
        <View style={styles.row}>
          <Pressable
            onPress={onBack}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={normalize(22)} color={MFC.purple} />
          </Pressable>
          <AppText variant="bodyBold" color={MFC.purple} style={styles.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </AppText>
          {site && onSitePress ? (
            <Pressable
              onPress={onSitePress}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Site: ${site}. Change site`}
              style={({ pressed }) => [styles.site, pressed && styles.pressed]}
            >
              {siteContent}
            </Pressable>
          ) : site ? (
            <View style={styles.site} accessible accessibilityLabel={`Site: ${site}`}>
              {siteContent}
            </View>
          ) : null}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: HEADER_BG,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#DCCDEE',
  },
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: normalize(12),
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MFC.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, minWidth: 0, fontFamily: 'Saveful-Bold', fontSize: normalize(17) },
  site: {
    maxWidth: '46%',
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: MFC.white,
  },
  siteText: { flexShrink: 1, fontFamily: 'Saveful-SemiBold' },
  pressed: { opacity: 0.75 },
});
