import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { MFC_BANNER_TEXT } from '@/utils/mfcListing';
import { normalize } from '@/utils/responsive';

/** Green banner on step 1 of the listing screens when they were opened from Make Food Count. */
export function MfcListingBanner() {
  return (
    <View style={styles.banner} accessibilityRole="summary">
      <AppText variant="bodyBold" color={palette.kale} style={styles.text}>
        {MFC_BANNER_TEXT}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1.5,
    borderColor: palette.kale,
    backgroundColor: '#E3F2E8',
    borderRadius: normalize(12),
    paddingVertical: normalize(10),
    paddingHorizontal: normalize(14),
  },
  text: {
    textTransform: 'none',
    lineHeight: normalize(20),
  },
});
