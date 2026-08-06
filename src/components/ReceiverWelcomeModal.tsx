import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/AppText';
import type { ReceiverWelcomeContent } from '@/data/receiverWelcome';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';

type Props = {
  visible: boolean;
  content: ReceiverWelcomeContent;
  onDismiss: () => void;
};

export function ReceiverWelcomeModal({ visible, content, onDismiss }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onDismiss} accessibilityRole="button" />

        <View style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.titleBlock}>
              <AppText style={styles.titleLead}>
                {content.emoji} {content.titleLead}
              </AppText>
              <AppText style={styles.titleBrand}>{content.titleBrand}</AppText>
            </View>

            {content.paragraphs.map((paragraph) => (
              <AppText key={paragraph} style={styles.paragraph}>
                {paragraph}
              </AppText>
            ))}

            <AppText style={styles.tip}>
              💡 {content.tip}
            </AppText>

            <AppText style={styles.closing}>{content.closing}</AppText>
          </ScrollView>

          <Pressable
            style={styles.cta}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={content.cta}
          >
            <AppText style={styles.ctaText}>{content.cta}</AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(7),
    backgroundColor: 'rgba(26, 26, 27, 0.42)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: '100%',
    maxWidth: normalize(340),
    maxHeight: '84%',
    backgroundColor: palette.white,
    borderRadius: normalize(16),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2F2F2F',
    paddingHorizontal: wp(5.5),
    paddingTop: hp(2.6),
    paddingBottom: hp(2.2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  scrollContent: {
    paddingBottom: hp(1.4),
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: hp(1.8),
  },
  titleLead: {
    textAlign: 'center',
    color: palette.black,
    textTransform: 'none',
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(19),
    lineHeight: normalize(25),
  },
  titleBrand: {
    textAlign: 'center',
    color: palette.black,
    textTransform: 'none',
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(20),
    lineHeight: normalize(26),
    marginTop: hp(0.15),
  },
  paragraph: {
    color: '#4A4A4A',
    textTransform: 'none',
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(15),
    lineHeight: normalize(22),
    marginBottom: hp(1.25),
  },
  tip: {
    color: '#5A5A5A',
    textTransform: 'none',
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(15),
    lineHeight: normalize(22),
    marginBottom: hp(1.25),
  },
  closing: {
    color: palette.kale,
    textTransform: 'none',
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(15),
    lineHeight: normalize(22),
    marginBottom: hp(0.4),
  },
  cta: {
    marginTop: hp(1.4),
    alignSelf: 'center',
    minWidth: normalize(188),
    minHeight: normalize(46),
    borderRadius: normalize(999),
    backgroundColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(7),
  },
  ctaText: {
    color: palette.white,
    textTransform: 'none',
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(16),
  },
});
