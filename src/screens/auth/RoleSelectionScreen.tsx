import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View, Image, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { AuthStackParamList } from '../../navigation/types';
import { useAppContext } from '../../store/AppContext';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { hp, normalize, useResponsiveLayout, wp } from '@/utils/responsive';
import { palette } from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'RoleSelection'>;

const businessOptions = [
  {
    id: 'restaurant_single' as const,
    title: 'I have a Business with a Single Site',
    description: 'One location, a cafe, restaurant, supermarket or farm',
    iconName: require('../../../assets/placeholder/single_site.png'),
  },
  {
    id: 'restaurant_multi' as const,
    title: 'I have a Business with Multiple Sites',
    description: 'Manage surplus across multiple locations - for groups, franchises & operators',
    iconName: require('../../../assets/placeholder/multi_site.png'),
  },
  {
    id: 'farm_business' as const,
    title: 'Farm/Producer',
    description: 'Farms or producers with surplus',
    iconName: require('../../../assets/placeholder/tractor_farm.png'),
  },
];

const charityOptions = [
  {
    id: 'charity_single' as const,
    title: 'Charity/Non Profit (Single Site)',
    description: 'One location, supporting your local community',
    iconName: require('../../../assets/placeholder/single_charity.png'),
  },
  {
    id: 'charity_multi' as const,
    title: 'Charity/Non Profit Business (Multiple Sites)',
    description: 'Manage collections across multiple locations',
    iconName: require('../../../assets/placeholder/multi_charity.png'),
  },
  {
    id: 'farmer' as const,
    title: 'Farmer',
    description: 'Collect food not suitable for human consumption to feed farm livestock',
    iconName: require('../../../assets/placeholder/cow.png'),
  },
];

export function RoleSelectionScreen({ navigation }: Props) {
  const { selectedRole, setRole, roleFlow } = useAppContext();
  const insets = useSafeAreaInsets();
  const r = useResponsiveLayout();
  useTransparentStatusBar('dark');

  useEffect(() => {
    if (!selectedRole) {
      setRole('restaurant_single');
    }
  }, [selectedRole, setRole]);

  const isConsumerFlow = roleFlow === 'consumer';

  const viewModel = useMemo(() => {
    if (isConsumerFlow) {
      return {
        bg: '#fdf5ff',
        accent: palette.eggplant,
        iconColor: palette.eggplant,
        options: charityOptions,
      };
    }

    return {
      bg: palette.creme,
      accent: palette.kale,
      iconColor: palette.kale,
      options: businessOptions,
    };
  }, [isConsumerFlow]);

  const onSelect = (id: string) => {
    if (
      id === 'restaurant_single' ||
      id === 'restaurant_multi' ||
      id === 'charity_single' ||
      id === 'charity_multi' ||
      id === 'farm_business' ||
      id === 'farmer'
    ) {
      setRole(id as any);
      navigation.navigate('RoleReady');
      return;
    }
    navigation.navigate('RoleReady');
  };

  const tabletColumn = r.isTablet
    ? {
        width: '100%' as const,
        maxWidth: r.contentMaxWidth,
        alignSelf: 'center' as const,
        paddingHorizontal: r.pagePadH,
      }
    : null;

  return (
    <Screen backgroundColor={viewModel.bg} scrollable={false} transparentTop contentStyle={styles.screenContent}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollInner,
          r.isTablet && { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
      <View style={[styles.topAccent, { backgroundColor: viewModel.accent }]} />

      <View style={tabletColumn}>
      <View
        style={[
          styles.headerWrap,
          { paddingTop: insets.top + (r.isTablet ? 24 : hp(2)) },
          r.isTablet && { paddingHorizontal: 0 },
        ]}
      >
        <AppText
          variant="h3"
          color={palette.black}
          style={[styles.title, r.isTablet && { fontSize: r.font(26, 28, 30), lineHeight: r.font(32, 34, 36) }]}
        >
          Tell us about your organisation
        </AppText>
        <AppText variant="bodyBold" color={palette.black} style={styles.subtitle}>
          This helps us tailor your dashboard and recommendations.
        </AppText>
      </View>

      <View style={[styles.listWrap, r.isTablet && { gap: 16, paddingHorizontal: 0, marginTop: 28 }]}>
        {viewModel.options.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={[
              styles.optionCard,
              r.isTablet && { minHeight: 96, paddingVertical: 16, paddingHorizontal: 18 },
            ]}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.iconBox, r.isTablet && { width: 48, height: 48 }]}>
                <Image
                  source={item.iconName}
                  style={[styles.roundIcon, r.isTablet && { width: 48, height: 48 }]}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.textWrap}>
                <AppText variant="h8" color={palette.black} style={styles.optionTitle} numberOfLines={2}>
                  {item.title}
                </AppText>
                <AppText variant="body" color={palette.black} style={styles.optionDescription} numberOfLines={3}>
                  {item.description}
                </AppText>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={normalize(22)} color="#6A6A6A" />
          </Pressable>
        ))}
      </View>
      </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
  },

  scrollInner: {
    flexGrow: 1,
    paddingBottom: hp(3),
  },

  topAccent: {
    width: '100%',
    height: hp(0.35),
  },

  headerWrap: {
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },

  title: {
    textAlign: 'center',
    textTransform: 'none',
  },

  subtitle: {
    marginTop: hp(1.1),
    textAlign: 'center',
    textTransform: 'none',
  },

  listWrap: {
    marginTop: hp(4),
    paddingHorizontal: wp(4),
    gap: hp(2),
  },
  roundIcon: {
    width: 48,
    height: 48,
  },
  optionCard: {
    minHeight: 96,
    borderRadius: normalize(8),
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    paddingHorizontal: wp(3.2),
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3.2),
    flex: 1,
    minWidth: 0,
  },

  iconBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  textWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: wp(2),
  },

  optionTitle: {
    textTransform: 'none',
  },

  optionDescription: {
    marginTop: hp(0.35),
    textTransform: 'none',
  },
});
