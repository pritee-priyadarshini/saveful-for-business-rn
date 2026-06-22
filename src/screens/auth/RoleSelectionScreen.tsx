import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View, Dimensions,Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { AuthStackParamList } from '../../navigation/types';
import { useAppContext } from '../../store/AppContext';
import { palette } from '../../theme/colors';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

type Props = NativeStackScreenProps<AuthStackParamList, 'RoleSelection'>;
type IconName = keyof typeof Ionicons.glyphMap;

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

  return (
    <Screen backgroundColor={viewModel.bg} scrollable contentStyle={styles.screenContent}>
      <View style={[styles.topAccent, { backgroundColor: viewModel.accent }]} />

      <View style={styles.headerWrap}>
        <AppText variant="h3" color={palette.black} style={styles.title}>
          Tell us about your organisation
        </AppText>
        <AppText variant="bodyBold" color={palette.black} style={styles.subtitle}>
          This helps us tailor your dashboard and recommendations.
        </AppText>
      </View>

      <View style={styles.listWrap}>
        {viewModel.options.map((item) => (
          <Pressable key={item.id} onPress={() => onSelect(item.id)} style={styles.optionCard}>
            <View style={styles.optionLeft}>
              <View style={styles.iconBox}>
                <Image
                  source={item.iconName}
                  style={styles.roundIcon}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.textWrap}>
                <AppText variant="h8" color={palette.black} style={styles.optionTitle}>
                  {item.title}
                </AppText>
                <AppText variant="body" color={palette.black} style={styles.optionDescription}>
                  {item.description}
                </AppText>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={normalize(22)} color="#6A6A6A" />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
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
    paddingTop: hp(4.2),
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
    width: wp(12), 
    height: wp(12),
  },
  optionCard: {
    minHeight: hp(12),
    borderRadius: normalize(8),
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(1.3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3.2),
    flex: 1,
  },

  iconBox: {
    width: wp(12),
    height: wp(12),
    alignItems: 'center',
    justifyContent: 'center',
  },

  textWrap: {
    flex: 1,
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
