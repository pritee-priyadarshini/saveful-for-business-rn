import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from '@/components/AppText';
import {
  MILESTONE_COMPLETE_CONTENT,
  type MilestoneKind,
} from '@/data/milestoneComplete';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';

type Props = {
  visible: boolean;
  kind: MilestoneKind;
  onPrimary: () => void;
  onSecondary: () => void;
};

export function MilestoneCompleteModal({
  visible,
  kind,
  onPrimary,
  onSecondary,
}: Props) {
  const content = MILESTONE_COMPLETE_CONTENT[kind];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onSecondary}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <AppText style={styles.title}>🎉 {content.title}</AppText>
          <AppText style={styles.subtitle}>{content.subtitle}</AppText>
          <AppText style={styles.body}>{content.body}</AppText>
          <AppText style={styles.tip}>💡 {content.tip}</AppText>

          <Pressable
            style={styles.primaryBtn}
            onPress={onPrimary}
            accessibilityRole="button"
            accessibilityLabel={content.primaryCta}
          >
            <AppText style={styles.primaryText}>{content.primaryCta}</AppText>
          </Pressable>

          <Pressable
            style={styles.secondaryBtn}
            onPress={onSecondary}
            accessibilityRole="button"
            accessibilityLabel={content.secondaryCta}
          >
            <AppText style={styles.secondaryText}>{content.secondaryCta}</AppText>
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
  card: {
    width: '100%',
    maxWidth: normalize(340),
    backgroundColor: palette.white,
    borderRadius: normalize(16),
    paddingHorizontal: wp(6),
    paddingTop: hp(3),
    paddingBottom: hp(2.4),
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    color: palette.black,
    textTransform: 'none',
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(20),
    lineHeight: normalize(26),
    marginBottom: hp(0.8),
  },
  subtitle: {
    textAlign: 'center',
    color: palette.black,
    textTransform: 'none',
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(16),
    lineHeight: normalize(22),
    marginBottom: hp(1.2),
  },
  body: {
    textAlign: 'center',
    color: '#5A5A5A',
    textTransform: 'none',
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(15),
    lineHeight: normalize(22),
    marginBottom: hp(1.4),
  },
  tip: {
    textAlign: 'center',
    color: '#5A5A5A',
    textTransform: 'none',
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(14),
    lineHeight: normalize(21),
    marginBottom: hp(2.2),
  },
  primaryBtn: {
    width: '100%',
    minHeight: normalize(48),
    borderRadius: normalize(12),
    backgroundColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(4),
  },
  primaryText: {
    color: palette.white,
    textTransform: 'none',
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(16),
  },
  secondaryBtn: {
    width: '100%',
    minHeight: normalize(48),
    borderRadius: normalize(12),
    borderWidth: 1.5,
    borderColor: palette.kale,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(4),
    marginTop: hp(1),
  },
  secondaryText: {
    color: palette.kale,
    textTransform: 'none',
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(16),
  },
});
