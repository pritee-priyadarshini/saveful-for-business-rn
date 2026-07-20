import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { palette } from '@/theme/colors';
import { useAppContext } from '@/store/AppContext';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'RestaurantPlan'>;

/** Routes restaurant plan entry to single-site or multi-site flow by role. */
export function RestaurantPlanRouter() {
  const navigation = useNavigation<Nav>();
  const { selectedRole } = useAppContext();

  useEffect(() => {
    if (selectedRole === 'restaurant_multi') {
      navigation.replace('MultiSitePlans');
      return;
    }
    navigation.replace('SingleSitePlans');
  }, [navigation, selectedRole]);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={palette.kale} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.creme,
  },
});
